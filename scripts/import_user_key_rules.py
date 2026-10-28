#!/usr/bin/env python3
"""Import user-authored monthly key rules; no schema or API changes."""
import argparse
import calendar
from contextlib import closing
import datetime as dt
import hashlib
import json
from pathlib import Path
import sqlite3
import uuid

ROOT = Path(__file__).resolve().parents[1]
DEFAULT_RULES = ROOT / 'docs/imports/2026-10-v5.3/key-review/user-rules.json'
DEFAULT_DB = ROOT / 'data/danke.db'


def digest(rows):
    return hashlib.sha256(json.dumps(rows, sort_keys=True, ensure_ascii=False).encode()).hexdigest()


def rows(connection, query, args=()):
    return [dict(row) for row in connection.execute(query, args)]


def load_rules(path):
    data = json.loads(Path(path).read_text())
    assert data['schemaVersion'] == 2
    assert (data['year'], data['month']) == (2026, 10), '只允许本次十月数据'
    assert data['monthBasis'] == {**data['monthBasis'], 'weeks': 4, 'days': calendar.monthrange(2026, 10)[1]}
    identifiers = [rule['id'] for rule in data['rules']]
    assert len(set(identifiers)) == len(identifiers)
    pairs = set()
    for rule in data['rules']:
        assert rule['kind'] in ('REFERENCE', 'ESTIMATE', 'RANDOM', 'ENTITLEMENT')
        assert rule['source']['name'] in rule['replaceKeySources']
        assert rule['monthlyTotal'] == sum(reward['monthlyAmount'] for reward in rule['rewards'])
        for reward in rule['rewards']:
            assert reward['monthlyAmount'] > 0
            assert reward['monthlyAmount'] == reward['perOccurrence'] * reward['occurrencesInMonth']
            if rule['period'] == 'DAILY':
                assert reward['occurrencesInMonth'] == data['monthBasis']['days']
            if rule['period'] == 'WEEKLY':
                assert reward['occurrencesInMonth'] == data['monthBasis']['weeks']
            if rule['period'] == 'WEEKLY_BATTLES':
                assert reward['occurrencesInMonth'] == 3 * data['monthBasis']['weeks']
            if rule['period'] == 'FOUR_TYPE_ROTATION':
                assert len(rule['rewards']) == 4 and reward['occurrencesInMonth'] == 1
            pair = (rule['source']['name'], reward['key'])
            assert pair not in pairs
            pairs.add(pair)
    return data


def notes_for(data, rule, reward):
    metadata = {
        'kind': 'KEY_RULE_V2', 'ruleId': rule['id'], 'rewardKind': rule['kind'],
        'description': rule['description'], 'conditions': rule['conditions'],
        'formula': f"{reward['perOccurrence']} × {reward['occurrencesInMonth']} = {reward['monthlyAmount']}",
        'period': rule['period'], 'weeks': data['monthBasis']['weeks'],
        'days': data['monthBasis']['days'], 'candidates': rule['candidates'],
    }
    return json.dumps(metadata, ensure_ascii=False, separators=(',', ':'))


def import_rules(database, rules_path=DEFAULT_RULES, apply=False, fail_after=None, backup_directory=None):
    database = Path(database).resolve()
    assert database.is_file(), '数据库必须已存在，不能自动创建'
    assert fail_after is None or database != DEFAULT_DB.resolve(), '故障测试只能使用数据库副本'
    data = load_rules(rules_path)
    db = sqlite3.connect(database)
    db.row_factory = sqlite3.Row
    db.execute('PRAGMA foreign_keys=ON')
    all_before = rows(db, 'SELECT * FROM MonthlyYield ORDER BY id')
    item_rows = rows(db, 'SELECT * FROM Item')
    items = {item['name']: item for item in item_rows}
    key_ids = {item['id'] for item in item_rows if item['type'] == 'KEY'}
    protected = lambda values: [row for row in values if (row['year'], row['month']) != (data['year'], data['month']) or row['itemId'] not in key_ids]
    august_before = [row for row in all_before if (row['year'], row['month']) == (2026, 8)]
    assert len(august_before) == 104, '八月基线必须为104条'
    sources = {source['name']: source for source in rows(db, 'SELECT * FROM Source')}
    before_tables = {name: rows(db, f'SELECT * FROM "{name}" ORDER BY id') for name in ('Item', 'GameEvent', 'User', 'Role', 'Permission', 'Menu', 'ReminderRule', 'Agent', 'StrategyArticle')}
    desired = {}
    new_sources = []
    for rule in data['rules']:
        source = sources.get(rule['source']['name'])
        if source is None:
            source = {**rule['source'], 'id': str(uuid.uuid5(uuid.NAMESPACE_URL, 'danke/source/' + rule['source']['name']))}
            sources[source['name']] = source
            new_sources.append({**source, 'description': rule['description'] + ' ' + rule['conditions']})
        if rule['source']['existingId']:
            assert source['id'] == rule['source']['existingId'], '来源ID与JSON不一致'
        for reward in rule['rewards']:
            item = items[reward['key']]
            assert item['type'] == 'KEY' and item['id'] == reward['itemId']
            desired[(source['id'], item['id'])] = {'sourceId': source['id'], 'itemId': item['id'], 'amount': reward['monthlyAmount'], 'notes': notes_for(data, rule, reward), 'year': data['year'], 'month': data['month']}
    replace_names = {name for rule in data['rules'] for name in rule['replaceKeySources']}
    replace_ids = {source['id'] for name, source in sources.items() if name in replace_names}
    targeted = [row for row in all_before if (row['year'], row['month']) == (data['year'], data['month']) and row['sourceId'] in replace_ids and row['itemId'] in key_ids]
    existing = {(row['sourceId'], row['itemId']): row for row in targeted}
    changes = []
    for pair, row in existing.items():
        if pair not in desired:
            changes.append({'action': 'delete_superseded_key', 'before': row, 'after': None})
    for pair, wanted in desired.items():
        previous = existing.get(pair)
        if previous is None or any(previous[field] != wanted[field] for field in ('amount', 'notes')):
            changes.append({'action': 'update' if previous else 'insert', 'before': previous, 'after': wanted})
    backup_path = None
    try:
        if apply:
            backups = Path(backup_directory) if backup_directory else Path.home() / '.local/state/danke-core/import-backups'
            backups.mkdir(parents=True, exist_ok=True)
            stamp = dt.datetime.now(dt.timezone.utc).strftime('%Y%m%dT%H%M%S%fZ')
            backup_path = backups / f'before-user-key-rules-{stamp}.db'
            with closing(sqlite3.connect(backup_path)) as destination:
                db.backup(destination)
            db.execute('BEGIN IMMEDIATE')
            now = dt.datetime.now(dt.timezone.utc).isoformat(timespec='milliseconds')
            for source in new_sources:
                db.execute('INSERT INTO Source (id,name,type,category,subcategory,description,createdAt,updatedAt) VALUES (?,?,?,?,NULL,?,?,?)', (source['id'], source['name'], source['type'], source['category'], source['description'], now, now))
            for index, change in enumerate(changes, 1):
                before, after = change['before'], change['after']
                if after is None:
                    db.execute('DELETE FROM MonthlyYield WHERE id=?', (before['id'],))
                elif before is not None:
                    db.execute('UPDATE MonthlyYield SET amount=?,notes=?,updatedAt=? WHERE id=?', (after['amount'], after['notes'], now, before['id']))
                else:
                    db.execute('INSERT INTO MonthlyYield (id,itemId,sourceId,amount,month,year,notes,createdAt,updatedAt) VALUES (?,?,?,?,?,?,?,?,?)', (str(uuid.uuid4()), after['itemId'], after['sourceId'], after['amount'], after['month'], after['year'], after['notes'], now, now))
                if fail_after == index:
                    raise RuntimeError('TEST_FORCED_ROLLBACK')
            all_after = rows(db, 'SELECT * FROM MonthlyYield ORDER BY id')
            assert protected(all_before) == protected(all_after), '其他月份或非钥匙记录变化'
            assert all(before_tables[name] == rows(db, f'SELECT * FROM "{name}" ORDER BY id') for name in before_tables), '无关表变化'
            assert db.execute('PRAGMA foreign_key_check').fetchall() == []
            for pair, wanted in desired.items():
                actual = db.execute('SELECT amount,notes FROM MonthlyYield WHERE sourceId=? AND itemId=? AND year=? AND month=?', (*pair, data['year'], data['month'])).fetchall()
                assert len(actual) == 1 and dict(actual[0]) == {'amount': wanted['amount'], 'notes': wanted['notes']}
            db.commit()
        else:
            all_after = all_before
        by_key = {}
        by_kind = {}
        for rule in data['rules']:
            by_kind[rule['kind']] = by_kind.get(rule['kind'], 0) + rule['monthlyTotal']
            for reward in rule['rewards']:
                by_key[reward['key']] = by_key.get(reward['key'], 0) + reward['monthlyAmount']
        report = {'mode': 'APPLIED' if apply else 'PREVIEW', 'rulesFile': str(rules_path), 'rulesSha256': hashlib.sha256(Path(rules_path).read_bytes()).hexdigest(), 'backupPath': str(backup_path) if backup_path else None, 'newSources': [s['name'] for s in new_sources], 'changes': changes, 'referenceByKey': by_key, 'referenceByKind': by_kind, 'protectedRowsSha256Before': digest(protected(all_before)), 'protectedRowsSha256After': digest(protected(all_after)), 'augustRecords': len(august_before), 'referenceRecordCount': len(desired), 'note': '仅用户口述参考，包含权益和随机估计；不是零氪稳定月产出。未覆盖原图记录保持不变。'}
        return report
    except BaseException:
        db.rollback()
        raise
    finally:
        db.close()


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--database', type=Path, default=DEFAULT_DB)
    parser.add_argument('--rules', type=Path, default=DEFAULT_RULES)
    parser.add_argument('--apply', action='store_true')
    parser.add_argument('--output', type=Path)
    args = parser.parse_args()
    report = import_rules(args.database, args.rules, args.apply)
    if args.output:
        args.output.parent.mkdir(parents=True, exist_ok=True)
        args.output.write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n')
    print(json.dumps({key: report[key] for key in ('mode', 'backupPath', 'newSources', 'referenceByKey', 'referenceByKind', 'referenceRecordCount', 'augustRecords')}, ensure_ascii=False, indent=2))
    print('变更记录数：', len(report['changes']))


if __name__ == '__main__':
    main()
