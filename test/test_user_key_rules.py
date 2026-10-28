import importlib.util
from contextlib import closing
import json
from pathlib import Path
import sqlite3
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('key_import', ROOT / 'scripts/import_user_key_rules.py')
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


def snapshot(path):
    with closing(sqlite3.connect(path)) as db:
        return {table: db.execute(f'SELECT * FROM "{table}" ORDER BY id').fetchall() for (table,) in db.execute("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name != '_prisma_migrations'") if table not in ('_RolePermissions',)}


class KeyRuleImportTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.directory = Path(self.temp.name)
        self.database = self.directory / 'copy.db'
        with closing(sqlite3.connect(ROOT / 'data/danke.db')) as source, closing(sqlite3.connect(self.database)) as target:
            source.backup(target)

    def tearDown(self):
        self.temp.cleanup()

    def run_import(self, **kwargs):
        return module.import_rules(self.database, backup_directory=self.directory / 'backups', **kwargs)

    def test_preview_does_not_mutate(self):
        before = snapshot(self.database)
        result = self.run_import()
        self.assertEqual(result['mode'], 'PREVIEW')
        self.assertEqual(snapshot(self.database), before)
        self.assertEqual(sum(result['referenceByKey'].values()), 1469)
        self.assertEqual(result['referenceByKey']['其他钥匙（综合）'], 186)
        self.assertEqual(result['referenceByKey']['载具零件钥匙'], 104)

    def test_apply_preserves_august_and_non_key_rows_and_is_idempotent(self):
        result = self.run_import(apply=True)
        self.assertEqual(result['protectedRowsSha256Before'], result['protectedRowsSha256After'])
        self.assertEqual(result['augustRecords'], 104)
        self.assertEqual(result['referenceRecordCount'], 31)
        self.assertTrue(Path(result['backupPath']).is_file())
        first = snapshot(self.database)
        again = self.run_import(apply=True)
        self.assertEqual(again['changes'], [])
        self.assertEqual(again['newSources'], [])
        self.assertEqual(snapshot(self.database), first)
        with closing(sqlite3.connect(self.database)) as db:
            self.assertEqual(db.execute('SELECT COUNT(*) FROM (SELECT itemId,sourceId,year,month,COUNT(*) n FROM MonthlyYield GROUP BY itemId,sourceId,year,month HAVING n>1)').fetchone()[0], 0)
            for name in ['工会探索', '试炼之路+永久卡', '通行证免费']:
                self.assertEqual(db.execute('SELECT COUNT(*) FROM MonthlyYield y JOIN Source s ON s.id=y.sourceId JOIN Item i ON i.id=y.itemId WHERE y.year=2026 AND y.month=10 AND s.name=? AND i.type="KEY"', (name,)).fetchone()[0], 0)
            legacy = db.execute('SELECT SUM(y.amount) FROM MonthlyYield y JOIN Item i ON i.id=y.itemId WHERE y.year=2026 AND y.month=10 AND i.type="KEY" AND y.notes NOT LIKE \'%KEY_RULE_V2%\'').fetchone()[0]
            self.assertEqual(legacy, 647)

    def test_failure_rolls_back_source_creation_and_yield_changes(self):
        before = snapshot(self.database)
        # Ensure a partial write happens even if this suite is run after production import.
        with closing(sqlite3.connect(self.database)) as db:
            db.execute('UPDATE MonthlyYield SET amount=amount+1 WHERE year=2026 AND month=10 AND notes LIKE \'%KEY_RULE_V2%\'')
            db.commit()
        before = snapshot(self.database)
        with self.assertRaisesRegex(RuntimeError, 'TEST_FORCED_ROLLBACK'):
            self.run_import(apply=True, fail_after=2)
        self.assertEqual(snapshot(self.database), before)

    def test_invalid_monthly_calculation_is_rejected(self):
        data = json.loads(module.DEFAULT_RULES.read_text())
        data['rules'][0]['rewards'][0]['monthlyAmount'] += 1
        invalid = self.directory / 'invalid.json'
        invalid.write_text(json.dumps(data))
        before = snapshot(self.database)
        with self.assertRaises(AssertionError):
            self.run_import(rules_path=invalid, apply=True)
        self.assertEqual(snapshot(self.database), before)


if __name__ == '__main__':
    unittest.main()
