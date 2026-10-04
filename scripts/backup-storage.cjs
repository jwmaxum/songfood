// Use a separate directory; preserves actual private PDFs and images, never public URLs.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {createClient}=require('@supabase/supabase-js');
const {writeEncrypted}=require('./backup-archive.cjs');
async function main(){
 const env=process.env;if(!env.NEXT_PUBLIC_SUPABASE_URL||!env.SUPABASE_SERVICE_ROLE_KEY||!env.BACKUP_ENCRYPTION_KEY)throw Error('Storage URL, server secret and backup encryption key required.');
 const client=createClient(env.NEXT_PUBLIC_SUPABASE_URL,env.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false}}),dir=path.resolve(env.SONGFOOD_BACKUP_DIR||'.npm-cache/backups','storage-'+new Date().toISOString().replace(/[:.]/g,'-'));fs.mkdirSync(dir,{recursive:true});
 const buckets=await client.storage.listBuckets();if(buckets.error)throw Error('Cannot enumerate Storage buckets');
 const manifest={at:new Date().toISOString(),format:'AES-256-GCM',buckets:buckets.data.map(b=>({id:b.id,public:b.public,file_size_limit:b.file_size_limit,allowed_mime_types:b.allowed_mime_types})),objects:[]};
 for(const bucket of buckets.data){
  async function walk(prefix){for(let offset=0;;offset+=100){const result=await client.storage.from(bucket.id).list(prefix,{limit:100,offset,sortBy:{column:'name',order:'asc'}});if(result.error)throw Error('Cannot list Storage objects');
   for(const item of result.data){const object=prefix?prefix+'/'+item.name:item.name;if(!item.id){await walk(object);continue;}
    const result=await client.storage.from(bucket.id).download(object);if(result.error)throw Error('Cannot download Storage object');
    const bytes=Buffer.from(await result.data.arrayBuffer());if(bytes.length>32*1024*1024)throw Error('Storage object exceeds backup limit');
    const file=crypto.randomUUID()+'.sfba',record=writeEncrypted(path.join(dir,file),bytes,env.BACKUP_ENCRYPTION_KEY);
    manifest.objects.push({bucket:bucket.id,path:object,file,contentType:result.data.type,source_sha256:crypto.createHash('sha256').update(bytes).digest('hex'),...record});
   }if(result.data.length<100)break;}}
  await walk('');
 }
 // Object paths can contain personal identifiers; encrypt the manifest as well.
 writeEncrypted(path.join(dir,'manifest.sfba'),Buffer.from(JSON.stringify(manifest)),env.BACKUP_ENCRYPTION_KEY);
 console.log('Encrypted Storage backup verified: '+manifest.buckets.length+' buckets, '+manifest.objects.length+' objects. Copy the entire directory and key to separate protected locations.');
}
if(require.main===module)main().catch(e=>{console.error(e.message);process.exitCode=1;});
