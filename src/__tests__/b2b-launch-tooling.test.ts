import crypto from 'node:crypto';
const {seal,open}=jest.requireActual('../../scripts/backup-archive.cjs');
const {checkStaging}=jest.requireActual('../../scripts/staging-worker.cjs');
const {connection}=jest.requireActual('../../scripts/backup-database.cjs');
test('encrypted backup recovers exact bytes and refuses corruption or incorrect keys',()=>{
 const key=crypto.randomBytes(32).toString('base64'),other=crypto.randomBytes(32).toString('base64'),bytes=Buffer.from('private test record 한글');
 const out=seal(bytes,key);expect(out.includes(bytes)).toBe(false);expect(open(out,key)).toEqual(bytes);expect(()=>open(out,other)).toThrow();
 const damaged=Buffer.from(out);damaged[20]^=1;expect(()=>open(damaged,key)).toThrow();expect(()=>open(Buffer.from('bad'),key)).toThrow();expect(()=>seal(bytes,'bad')).toThrow();
});
const staging=()=>({NEXT_PUBLIC_APP_URL:'https://song-food-staging.jwmaxum.workers.dev',NEXT_PUBLIC_SUPABASE_URL:'https://independent-stage.supabase.co',NEXT_PUBLIC_SUPABASE_ANON_KEY:'sb_publishable_'+'x'.repeat(30),SUPABASE_SERVICE_ROLE_KEY:'sb_secret_'+'y'.repeat(30)});
test('staging refuses production DB/origin/keys and inherited missing config',()=>{
 expect(checkStaging(staging()).origin).toContain('song-food-staging');
 for(const patch of [{NEXT_PUBLIC_SUPABASE_URL:'https://ejtozvlsnagtpsddhhoj.supabase.co'},{NEXT_PUBLIC_APP_URL:'https://song-food.jwmaxum.workers.dev'},{SUPABASE_SERVICE_ROLE_KEY:''},{NEXT_PUBLIC_SUPABASE_ANON_KEY:''},{SUPABASE_SERVICE_ROLE_KEY:staging().NEXT_PUBLIC_SUPABASE_ANON_KEY}])expect(()=>checkStaging({...staging(),...patch})).toThrow();
 const jwt='a.'+Buffer.from(JSON.stringify({ref:'ejtozvlsnagtpsddhhoj',role:'service_role'})).toString('base64url')+'.b';expect(()=>checkStaging({...staging(),SUPABASE_SERVICE_ROLE_KEY:jwt})).toThrow('Production key');
});
test('database secret is passed as child environment rather than a command argument',()=>{
 const c=connection('postgresql://postgres.user:private%40password@db.example.invalid:5432/postgres');expect(c).toMatchObject({PGHOST:'db.example.invalid',PGUSER:'postgres.user',PGPASSWORD:'private@password',PGSSLMODE:'require'});expect(()=>connection('https://bad')).toThrow();expect(()=>connection('postgresql://user@db.example.invalid/db')).toThrow();
});

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
const {treeHash,productionTarget}=jest.requireActual('../../scripts/worker-target.cjs');
test('staging build provenance detects a changed client asset and production refuses staging artifacts',()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'songfood-target-test-'));
 try{
  fs.mkdirSync(path.join(dir,'assets'));fs.writeFileSync(path.join(dir,'worker.js'),'worker wrapper');fs.writeFileSync(path.join(dir,'assets','client.js'),'staging client');
  const before=treeHash(dir);fs.writeFileSync(path.join(dir,'assets','client.js'),'different environment');expect(treeHash(dir)).not.toBe(before);
  expect(()=>productionTarget(dir)).not.toThrow();fs.writeFileSync(path.join(dir,'staging-build.json'),'{}');expect(()=>productionTarget(dir)).toThrow('Staging artifacts');
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});
