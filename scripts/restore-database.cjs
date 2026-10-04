// Restores ONLY into an independently identified operator-prepared target.
const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {connection,run}=require('./backup-database.cjs'),{open}=require('./backup-archive.cjs');
async function main(){
 const source=process.env.SONGFOOD_DATABASE_URL,target=process.env.SONGFOOD_RESTORE_DATABASE_URL,key=process.env.BACKUP_ENCRYPTION_KEY,file=process.argv[2];
 if(!source||!target||!key||!file||process.argv[3]!=='--confirm-empty-target')throw Error('Source, independent restore URL, key, archive and --confirm-empty-target required');
 const s=connection(source),t=connection(target);
 if((s.PGHOST===t.PGHOST&&s.PGUSER===t.PGUSER&&s.PGDATABASE===t.PGDATABASE)||[t.PGHOST,t.PGUSER].some(v=>v.includes('ejtozvlsnagtpsddhhoj')))throw Error('Production/identical target restore is forbidden');
 const psql=process.env.PSQL_BIN||'psql',restore=process.env.PG_RESTORE_BIN||'pg_restore';
 const n=run(psql,['-X','-A','-t','-c',"SELECT count(*) FROM pg_tables WHERE schemaname='public';"],t).trim();
 if(n!=='0')throw Error('Target public schema must be empty. Existing tables are never overwritten.');
 const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'songfood-restore-')),dump=path.join(tmp,'database.dump');
 try{fs.writeFileSync(dump,open(fs.readFileSync(path.resolve(file)),key),{mode:0o600});run(restore,['--single-transaction','--exit-on-error','--no-owner','--dbname='+t.PGDATABASE,dump],t);
  console.log('Archive restored in one transaction. Run RLS/RPC tests and Auth/Storage/UAT before declaring recovery complete.');
 }finally{fs.rmSync(tmp,{recursive:true,force:true});}
}
if(require.main===module)main().catch(e=>{console.error(e.message);process.exitCode=1;});
