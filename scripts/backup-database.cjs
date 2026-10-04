// Requires PostgreSQL native tools. Connection passwords travel only in child env.
const fs=require('node:fs'),os=require('node:os'),path=require('node:path'),cp=require('node:child_process');
const {writeEncrypted}=require('./backup-archive.cjs');
function connection(value){const u=new URL(value);if(!['postgres:','postgresql:'].includes(u.protocol)||!u.password)throw Error('Database connection required');return {PGHOST:u.hostname,PGPORT:u.port||'5432',PGUSER:decodeURIComponent(u.username),PGPASSWORD:decodeURIComponent(u.password),PGDATABASE:u.pathname.slice(1)||'postgres',PGSSLMODE:'require'};}
function run(file,args,env){const r=cp.spawnSync(file,args,{env:{...process.env,...env},encoding:'utf8',windowsHide:true,maxBuffer:1024*1024});if(r.status!==0)throw Error('PostgreSQL native command failed; check credentials/tool version/schema with native tools. Provider output is excluded from logs.');return r.stdout;}
async function main(){
 const value=process.env.SONGFOOD_DATABASE_URL,key=process.env.BACKUP_ENCRYPTION_KEY;if(!value||!key)throw Error('SONGFOOD_DATABASE_URL and BACKUP_ENCRYPTION_KEY are required.');
 const dir=path.resolve(process.env.SONGFOOD_BACKUP_DIR||'.npm-cache/backups');fs.mkdirSync(dir,{recursive:true});const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'songfood-backup-')),dump=path.join(tmp,'database.dump');
 try{
  const env=connection(value),pgDump=process.env.PG_DUMP_BIN||'pg_dump',pgRestore=process.env.PG_RESTORE_BIN||'pg_restore';
  run(pgDump,['--format=custom','--no-owner','--schema=public','--schema=auth','--schema=storage','--schema=supabase_migrations','--file='+dump],env);
  const list=run(pgRestore,['--list',dump],env);for(const s of ['public','auth','storage'])if(!list.includes(s))throw Error('Expected schema missing from backup.');
  if(fs.statSync(dump).size>128*1024*1024)throw Error('Backup exceeds memory-safe archive limit; use streaming operator tooling.');
  const id=new Date().toISOString().replace(/[:.]/g,'-'),out=path.join(dir,'database-'+id+'.sfba');
  const record=writeEncrypted(out,fs.readFileSync(dump),key);
  fs.writeFileSync(out+'.manifest.json',JSON.stringify({format:'pg_dump-custom/AES-256-GCM',at:new Date().toISOString(),schemas:['public','auth','storage','supabase_migrations'],...record,includesStorageFiles:false,includesAuthConfiguration:false,includesClusterRoles:false},null,2));
  console.log('Encrypted database archive created and decrypted hash verified. Storage files/Auth settings/cluster roles require separate backup.');
 }finally{fs.rmSync(tmp,{recursive:true,force:true});}
}
if(require.main===module)main().catch(e=>{console.error(e.message);process.exitCode=1;});
module.exports={connection,run};
