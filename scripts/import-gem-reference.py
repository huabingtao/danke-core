"""One-time audited reference import. Dry run unless --apply. No schema operations.
Example: python3 scripts/import-gem-reference.py --database /tmp/test.db --manifest /path/manifest.json --report /tmp/report.json --apply
"""
import argparse,datetime,json,sqlite3,uuid,hashlib
import os
from pathlib import Path
parser=argparse.ArgumentParser();parser.add_argument('--database',required=True);parser.add_argument('--manifest',required=True);parser.add_argument('--report',required=True);parser.add_argument('--apply',action='store_true');args=parser.parse_args()
path=Path(args.database).resolve(strict=True);manifest=json.loads(Path(args.manifest).read_text());now=datetime.datetime.now(datetime.timezone.utc).isoformat()
conn=sqlite3.connect(path.as_uri()+'?mode=ro',uri=True);conn.row_factory=sqlite3.Row
original={r['id']:dict(r) for r in conn.execute('SELECT * FROM Item')}
links={i:[] for i in original}
for row in conn.execute('SELECT * FROM ItemCategoryLink'):links[row['itemId']].append(row['categoryId'])
preserved={table:[tuple(row) for row in conn.execute('SELECT * FROM '+table+' ORDER BY rowid')] for table in ['MonthlyYield','Source','UserViewPreference']}
schema=[tuple(row) for row in conn.execute('SELECT type,name,sql FROM sqlite_master ORDER BY name')]
bootstrap_classifications=not any(row[0]=='core' for row in conn.execute('SELECT id FROM ItemCategory'))
plans={}
for item in original.values():
 categories=set(links[item['id']]);
 if bootstrap_classifications and item.get('resourceTypeId')=='core':categories.add('core')
 if bootstrap_classifications and item.get('resourceTypeId')=='key':categories.add('key')
 if bootstrap_classifications and item['name']=='神器核心自选宝箱':categories.update(['core','equipment'])
 if bootstrap_classifications and item['name'] in ['矿洞挑战券','特别行动券']:
  categories.discard('event');categories.add('general')
 plans[item['id']]={'id':item['id'],'name':item['name'],'categories':categories,'prices':[],'references':[],'item':item,'translationPending':False}
pending=[]
for row in manifest['entries']:
 if row.get('pendingReason'):pending.append({'referenceKey':row['referenceKey'],'name':row['referenceName'],'reason':row['pendingReason']});continue
 ids=row['existingItemIds'] or [str(uuid.uuid5(uuid.NAMESPACE_URL,'https://sio-tools.exp0.dev/gems#'+row['referenceKey']))]
 for itemId in ids:
  if row['existingItemIds'] and itemId not in original:raise SystemExit('Referenced item removed since mapping; regenerate manifest: '+itemId)
  if itemId not in plans:
   conflict=next((item for item in original.values() if item['name']==row['name'] and item['id']!=itemId),None)
   if conflict:raise SystemExit('Name conflict; review mapping: '+row['name'])
   plans[itemId]={'id':itemId,'name':row['name'],'categories':set(),'prices':[],'references':[],'item':None,'translationPending':row['translationPending'],'icon':row['asset']['path']}
  plan=plans[itemId]
  previous_stats=json.loads(plan['item']['stats']) if plan['item'] and plan['item'].get('stats') else {}
  if not previous_stats.get('_gemValuation'):plan['categories'].update(row['categoryIds'])
  plan['references'].append(row)
  # Existing explicitly named aliases are retained as separate stable entities.
  plan['prices'].append({'id':row['schemeId'],'label':row['schemeLabel'],'value':row['referenceValue'],'referenceValue':row['referenceValue']})
conn.close()
report={'applied':args.apply,'sourceUrl':manifest['sourceUrl'],'capturedAt':manifest['capturedAt'],'created':[],'updated':[],'skippedValuations':[],'pending':pending,'referenceCount':len(manifest['entries'])}
for p in plans.values():
 current=p['item'];stats=json.loads(current['stats']) if current and current.get('stats') else {}
 if not isinstance(stats,dict):raise SystemExit('Non-object stats must be reviewed: '+p['name'])
 old=stats.get('_gemValuation')
 if p['prices']:
  assert len({price['id'] for price in p['prices']})==len(p['prices']),p['name']+' duplicate scheme'
  if old:
   report['skippedValuations'].append({'id':p['id'],'name':p['name'],'reason':'existing valuation preserved'})
  else:
   stats['_gemValuation']={'prices':p['prices'],'sourceUrl':manifest['sourceUrl'],'capturedAt':manifest['capturedAt'],'referenceKeys':[e['referenceKey'] for e in p['references']],'referenceNames':[e['referenceName'] for e in p['references']],'eventNames':list(dict.fromkeys(e['eventName'] for e in p['references'] if e['eventName'])),'translationPending':p['translationPending'],'manuallyModified':False,'updatedAt':now}
 p['stats']=json.dumps(stats,ensure_ascii=False,separators=(',',':')) if stats else (current.get('stats') if current else None)
 if not current:report['created'].append({'id':p['id'],'name':p['name'],'categoryIds':sorted(p['categories']),'referenceKeys':[e['referenceKey'] for e in p['references']]})
 elif set(links[p['id']])!=p['categories'] or p['stats']!=current['stats']:
  report['updated'].append({'id':p['id'],'name':p['name'],'previous':current,'previousCategoryIds':links[p['id']],'categoryIds':sorted(p['categories'])})
if args.apply:
 backup=Path(os.environ.get("DANKE_BACKUP_DIR", str(path.parent / "backups"))).expanduser().resolve()/('before-flat-gems-'+datetime.datetime.now().strftime('%Y%m%d-%H%M%S-%f')+'.db');backup.parent.mkdir(parents=True,exist_ok=True)
 with sqlite3.connect(path) as src,sqlite3.connect(backup) as target:
  src.backup(target);assert target.execute('pragma integrity_check').fetchone()[0]=='ok'
 report['backup']=str(backup)
 db=sqlite3.connect(path);db.execute('PRAGMA foreign_keys=ON')
 try:
  db.execute('BEGIN IMMEDIATE')
  # Refuse to overwrite edits made after the dry-run/read baseline in this invocation.
  live={r[0]:r for r in db.execute('SELECT * FROM Item')}
  assert len(live)==len(original),'Concurrent item additions; retry'
  for key,item in original.items():
   cols=[r[1] for r in db.execute('PRAGMA table_info(Item)')]
   assert dict(zip(cols,live[key]))==item,'Concurrent item edit; retry'
  cats=[('core','核心'),('equipment','装备'),('agent','特工'),('pet','宠物'),('tech','配件'),('collection','收藏品'),('vehicle','载具'),('key','钥匙'),('general','其他'),('event','活动货币')]
  report['categoriesBefore']=[list(row) for row in db.execute('SELECT * FROM ItemCategory')]
  for order,(id,name) in enumerate(cats):db.execute('INSERT INTO ItemCategory(id,name,sortOrder) VALUES(?,?,?) ON CONFLICT(id) DO UPDATE SET name=excluded.name,sortOrder=excluded.sortOrder',(id,name,order))
  for p in plans.values():
   if p['item'] is None:
    db.execute('INSERT INTO Item(id,name,icon,type,stats,createdAt,updatedAt) VALUES(?,?,?,?,?,?,?)',(p['id'],p['name'],p['icon'],'RESOURCE',p['stats'],now,now))
   elif p['stats']!=p['item']['stats']:
    db.execute('UPDATE Item SET stats=?,updatedAt=? WHERE id=?',(p['stats'],now,p['id']))
   if p['item']:
    for category in set(links[p['id']])-p['categories']:db.execute('DELETE FROM ItemCategoryLink WHERE itemId=? AND categoryId=?',(p['id'],category))
   for category in p['categories']:db.execute('INSERT OR IGNORE INTO ItemCategoryLink(itemId,categoryId) VALUES(?,?)',(p['id'],category))
  report['menusBefore']=[list(row) for row in db.execute('SELECT * FROM Menu ORDER BY sort')]
  if not db.execute('SELECT 1 FROM Menu WHERE path=?',('/gem-values',)).fetchone():
   anchor=db.execute('SELECT sort FROM Menu WHERE path=?',('/items',)).fetchone();order=(anchor[0]+1) if anchor else 4
   db.execute('UPDATE Menu SET sort=sort+1,updatedAt=? WHERE sort>=?',(now,order))
   db.execute('INSERT INTO Menu(id,name,path,sort,permissionCode,createdAt,updatedAt) VALUES(?,?,?,?,?,?,?)',(str(uuid.uuid5(uuid.NAMESPACE_URL,'danke-admin/gem-values')),'钻石价值配置','/gem-values',order,'items:view',now,now))
  for table,before in preserved.items():assert db.execute('SELECT * FROM '+table+' ORDER BY rowid').fetchall()==before,table+' unexpectedly changed'
  assert db.execute('SELECT type,name,sql FROM sqlite_master ORDER BY name').fetchall()==schema,'Schema changed'
  assert db.execute('pragma integrity_check').fetchone()[0]=='ok';assert not db.execute('pragma foreign_key_check').fetchall()
  db.commit()
 except BaseException:db.rollback();raise
 finally:db.close()
report['counts']={key:len(report[key]) for key in ['created','updated','skippedValuations','pending']}
Path(args.report).write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n');print(json.dumps(report['counts'],ensure_ascii=False))
