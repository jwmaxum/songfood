import 'server-only';
import {getCloudflareContext} from '@opennextjs/cloudflare';
export async function loadPiFont(){
 try{
  const context=await getCloudflareContext({async:true});
  const assets=(context.env as unknown as {ASSETS?:{fetch:(r:Request)=>Promise<Response>}}).ASSETS;
  if(assets){const r=await assets.fetch(new Request('https://assets.internal/fonts/NanumGothic-Regular.ttf'));if(r.ok)return new Uint8Array(await r.arrayBuffer());}
 }catch{ /* Next local development can read the fixed, bundled asset. */ }
 if(process.env.NODE_ENV==='development'||process.env.NODE_ENV==='test'){
  const {readFile}=await import('node:fs/promises');return new Uint8Array(await readFile(process.cwd()+'/public/fonts/NanumGothic-Regular.ttf'));
 }
 throw new Error('PI font asset unavailable');
}
