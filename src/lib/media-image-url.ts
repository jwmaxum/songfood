/** Image addresses stored by CMS. File contents are validated by the upload endpoint. */
export function safeImageAddress(value: unknown): string | null {
 if(typeof value!=='string'||value.length>4096||/[\\\u0000-\u0020\u007f]/.test(value))return null;
 if(!value)return '';
 if(value.startsWith('/'))return value.startsWith('//')?null:value;
 try{const url=new URL(value);return url.protocol==='https:'&&!url.username&&!url.password?url.toString():null;}catch{return null;}
}
/** A logo redirect may target only this project's public media bucket. */
export function storedMediaImageAddress(value: unknown, supabaseUrl=process.env.NEXT_PUBLIC_SUPABASE_URL): string | null {
 const safe=safeImageAddress(value);if(!safe||!supabaseUrl)return null;
 try{const url=new URL(safe),storage=new URL(supabaseUrl);const path=decodeURIComponent(url.pathname);
 return storage.protocol==='https:'&&url.origin===storage.origin&&!url.hash&&!url.search&&path.startsWith('/storage/v1/object/public/media/')&&!path.includes('..')&&!path.includes('\\')&&/\.(?:jpe?g|png|webp|gif)$/i.test(path)?url.toString():null;
 }catch{return null;}
}
