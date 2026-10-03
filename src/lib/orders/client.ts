'use client';
const pendingKeys=new Map<string,string>();
// Store only a request UUID and hash, never addresses or payment details.
export async function orderPost(url:string,body:Record<string,unknown>){
 const text=JSON.stringify(body),bytes=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(url+text));
 const key='sf-order-request:'+Array.from(new Uint8Array(bytes),b=>b.toString(16).padStart(2,'0')).join('');
 let request_key:string;
 try{request_key=sessionStorage.getItem(key)||pendingKeys.get(key)||crypto.randomUUID();sessionStorage.setItem(key,request_key);}catch{request_key=pendingKeys.get(key)||crypto.randomUUID();}
 pendingKeys.set(key,request_key);
 const response=await fetch(url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...body,request_key})});
 const data=await response.json();
 if(!response.ok)throw new Error(data.error||'저장하지 못했습니다. 같은 내용으로 다시 시도해 주세요.');
 pendingKeys.delete(key);try{sessionStorage.removeItem(key);}catch{}
 return data;
}
export async function orderGet(url:string){
 const r=await fetch(url,{cache:'no-store'}),d=await r.json();if(!r.ok)throw new Error(d.error||'주문을 불러오지 못했습니다.');return d;
}
