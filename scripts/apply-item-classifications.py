"""Apply only the additive classification migration to an existing SQLite database.
The legacy live DB has no Prisma history. Never run the initial migration against it.
Usage: python3 scripts/apply-item-classifications.py /absolute/path/to/danke.db
"""
import datetime
import json
import sqlite3
import sys
import os
from pathlib import Path

source = Path(sys.argv[1]).resolve(strict=True)
folder = Path(os.environ.get("DANKE_BACKUP_DIR", str(source.parent / "backups"))).expanduser().resolve()
folder.mkdir(parents=True, exist_ok=True)
backup = folder / ('classification-migration-' + datetime.datetime.now().strftime('%Y%m%d-%H%M%S') + '.db')
with sqlite3.connect(source.as_uri() + '?mode=ro', uri=True) as src, sqlite3.connect(backup) as dst:
    src.backup(dst)
    assert dst.execute('pragma integrity_check').fetchone()[0] == 'ok'
sql = (Path(__file__).resolve().parents[1] / 'prisma/migrations/20261102000000_item_classifications/migration.sql').read_text()
with sqlite3.connect(source) as db:
    columns = [row[1] for row in db.execute('pragma table_info(Item)')]
    if 'resourceTypeId' in columns:
        raise SystemExit('Classification schema already exists; no migration applied')
    tables = ['Item', 'Source', 'MonthlyYield', 'User', 'Role', 'Permission']
    before = {table: db.execute('SELECT * FROM "' + table + '" ORDER BY rowid').fetchall() for table in tables}
    try:
        db.executescript('BEGIN IMMEDIATE;\n' + sql)
        for table in tables:
            query = 'SELECT ' + (', '.join('"' + column + '"' for column in columns) if table == 'Item' else '*') + ' FROM "' + table + '" ORDER BY rowid'
            assert db.execute(query).fetchall() == before[table], table + ' data changed'
        assert db.execute('pragma integrity_check').fetchone()[0] == 'ok'
        assert not db.execute('pragma foreign_key_check').fetchall()
        db.commit()
    except BaseException:
        db.rollback()
        raise
print(json.dumps({'backup': str(backup), 'preservedRows': {table: len(rows) for table, rows in before.items()}, 'migration': 'additive, verified'}, ensure_ascii=False))
