"""Audited one-time localization and non-destructive alias consolidation. No DDL/DELETE.
Archives only explicitly reviewed aliases with no yield records. Default is dry run.
"""
import argparse,json,sqlite3,datetime,copy
from pathlib import Path
parser=argparse.ArgumentParser();parser.add_argument('--database',required=True);parser.add_argument('--names',required=True);parser.add_argument('--merges',required=True);parser.add_argument('--report',required=True);parser.add_argument('--apply',action='store_true');args=parser.parse_args()
path=Path(args.database).resolve(strict=True);names=json.loads(Path(args.names).read_text())['translations'];merges=json.loads(Path(args.merges).read_text())['merges'];stamp=datetime.datetime.now(datetime.timezone.utc).isoformat()
report={'applied':args.apply,'renamed':[],'merged':[],'skipped':[],'changedLabels':[]}
backup=Path('/home/guagua/workspace/backups/danke-core')/('before-item-polish-'+datetime.datetime.now().strftime('%Y%m%d-%H%M%S-%f')+'.db')
if args.apply:
 with sqlite3.connect(path.as_uri()+'?mode=ro',uri=True) as src,sqlite3.connect(backup) as dst:
  src.backup(dst);assert dst.execute('pragma integrity_check').fetchone()[0]=='ok'
 report['backup']=str(backup)
conn=sqlite3.connect(path.as_uri()+('' if args.apply else '?mode=ro'),uri=True);conn.row_factory=sqlite3.Row
before={r['id']:dict(r) for r in conn.execute('SELECT * FROM Item')};original_stats={key:json.loads(item['stats']) if item['stats'] else {} for key,item in before.items()};stats=copy.deepcopy(original_stats);newnames={key:item['name'] for key,item in before.items()}
if args.apply:
 conn.execute('BEGIN IMMEDIATE')
 assert {r['id']:dict(r) for r in conn.execute('SELECT * FROM Item')}==before,'Concurrent edits; rerun'
preserved={table:[tuple(r) for r in conn.execute('SELECT * FROM '+table+' ORDER BY rowid')] for table in ['MonthlyYield','Source','UserViewPreference']}
try:
 for entry in names:
  item=before.get(entry['id'])
  if not item:report['skipped'].append({'id':entry['id'],'reason':'item absent'});continue
  if item['name']==entry['name']:continue
  if item['name']!=entry['before']:report['skipped'].append({'id':item['id'],'reason':'operator renamed since mapping'});continue
  if any(name==entry['name'] and key!=item['id'] for key,name in newnames.items()):raise ValueError('Name conflict: '+entry['name'])
  newnames[item['id']]=entry['name'];meta=stats[item['id']]
  meta['_previousNames']=list(dict.fromkeys(meta.get('_previousNames',[])+[entry['before']]))
  valuation=meta.get('_gemValuation')
  if valuation:
   valuation['translationPending']=False
   if entry.get('eventName'):valuation['eventNames']=list(dict.fromkeys(valuation.get('eventNames',[])+[entry['eventName']]))
  report['renamed'].append(entry)
 for pair in merges:
  source=pair['sourceId'];target=pair['targetId']
  assert source in before and target in before,'Missing reviewed alias'
  if stats[source].get('_mergedInto')==target:continue
  if before[source]['name']!=pair['sourceName'] or before[target]['name']!=pair['targetName']:
   report['skipped'].append({'id':source,'reason':'operator renamed since review'});continue
  assert before[source]['icon']==before[target]['icon'],'Icon changed after identity review'
  if conn.execute('SELECT count(*) FROM MonthlyYield WHERE itemId=?',(source,)).fetchone()[0]:
   report['skipped'].append({'id':source,'reason':'alias has yields; manual reconciliation required'});continue
  sv=stats[source].get('_gemValuation');tv=stats[target].get('_gemValuation')
  assert sv and tv and sv.get('referenceKeys')==tv.get('referenceKeys'),'Different item identities'
  assert [(v['id'],v['value']) for v in sv['prices']]==[(v['id'],v['value']) for v in tv['prices']],'Different prices need review'
  assert not stats[target].get('_mergedInto'),'Target already merged'
  stats[source]['_mergedInto']=target
  aliases=stats[target].get('_itemAliases',[])
  stats[target]['_itemAliases']=aliases+[{'id':source,'name':before[source]['name']}]
  report['merged'].append({**pair,'sourceName':before[source]['name'],'targetName':before[target]['name']})
 for key,meta in stats.items():
  for price in (meta.get('_gemValuation') or {}).get('prices',[]):
   if price['id']=='default' and price['label']=='默认单价':price['label']='单价';report['changedLabels'].append(key)
 if args.apply:
  report['previousItems']=[before[key] for key in before if stats[key]!=original_stats[key] or newnames[key]!=before[key]['name']]
  for key,item in before.items():
   # Compare encoded result: shallow nested dictionaries above intentionally share source data, so use original SQL text.
   encoded=json.dumps(stats[key],ensure_ascii=False,separators=(',',':')) if stats[key] else item['stats']
   if newnames[key]!=item['name'] or encoded!=item['stats']:
    conn.execute('UPDATE Item SET name=?,stats=?,updatedAt=? WHERE id=?',(newnames[key],encoded,stamp,key))
  for pair in report['merged']:
   for row in conn.execute('SELECT categoryId FROM ItemCategoryLink WHERE itemId=?',(pair['sourceId'],)).fetchall():conn.execute('INSERT OR IGNORE INTO ItemCategoryLink(itemId,categoryId) VALUES(?,?)',(pair['targetId'],row[0]))
  for table,rows in preserved.items():assert [tuple(r) for r in conn.execute('SELECT * FROM '+table+' ORDER BY rowid')]==rows,table+' changed'
  assert conn.execute('pragma integrity_check').fetchone()[0]=='ok';assert not conn.execute('pragma foreign_key_check').fetchall()
  conn.commit()
except BaseException:
 if args.apply:conn.rollback()
 raise
finally:conn.close()
report['counts']={k:len(report[k]) for k in ['renamed','merged','skipped','changedLabels']}
Path(args.report).write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n');print(json.dumps(report['counts'],ensure_ascii=False))
