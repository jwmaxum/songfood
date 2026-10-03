'use client';
import {inquiryFingerprint,parseCommercialInquiry} from './commercial-inquiry';
const memory=new Map<string,string>();
const storageKey='songfood_submission_keys_v1';
async function fingerprint(payload:unknown,identity:string) {
  const bytes=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(identity+'|'+inquiryFingerprint(parseCommercialInquiry(payload))));
  return Array.from(new Uint8Array(bytes),n=>n.toString(16).padStart(2,'0')).join('');
}
function readKeys():Record<string,string> {
  try {
    const value=JSON.parse(sessionStorage.getItem(storageKey)||'{}');
    if(value&&typeof value==='object'&&!Array.isArray(value))return Object.fromEntries(Object.entries(value).filter(([k,v])=>/^[0-9a-f]{64}$/.test(k)&&typeof v==='string'&&/^[0-9a-f-]{36}$/i.test(v)).slice(-30)) as Record<string,string>;
  }catch{}
  return {};
}
function persist(keys:Record<string,string>){try{sessionStorage.setItem(storageKey,JSON.stringify(keys));}catch{}}
export async function submissionKey(payload:unknown,identity:string) {
  const hash=await fingerprint(payload,identity),saved=readKeys();
  const old=memory.get(hash)||saved[hash];
  if(old){memory.set(hash,old);return old;}
  const key=crypto.randomUUID();memory.set(hash,key);
  if(memory.size>30)memory.delete(memory.keys().next().value!);
  persist(Object.fromEntries([...Object.entries(saved).slice(-29),[hash,key]]));
  return key;
}
// Only explicit new-request intent retires a successful request; retries keep its key.
export async function forgetSubmissionKey(payload:unknown,identity:string) {
  const hash=await fingerprint(payload,identity),saved=readKeys();
  memory.delete(hash);delete saved[hash];persist(saved);
}
