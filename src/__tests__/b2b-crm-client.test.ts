/** @jest-environment jsdom */
import {webcrypto} from 'node:crypto';
import {TextEncoder} from 'node:util';
import {submissionKey,forgetSubmissionKey} from '@/lib/inquiry-client';
beforeAll(()=>{Object.defineProperty(globalThis,'crypto',{value:webcrypto});Object.defineProperty(globalThis,'TextEncoder',{value:TextEncoder});});
const payload={kind:'export_rfq',contact_name:'Buyer',email:'b@example.invalid',country:'Japan',incoterms:'FOB',items:[{product_id:'p1',quantity_cartons:2}]};
test('retries and normalized payloads share a key; changed quantity and identity do not',async()=>{
 const key=await submissionKey(payload,'buyer-a');
 expect(await submissionKey({...payload,email:' B@EXAMPLE.INVALID ',incoterms:'FOB Busan'},'buyer-a')).toBe(key);
 expect(await submissionKey({...payload,items:[{product_id:'p1',quantity_cartons:3}]},'buyer-a')).not.toBe(key);
 expect(await submissionKey(payload,'buyer-b')).not.toBe(key);
 expect(sessionStorage.getItem('songfood_submission_keys_v1')).not.toContain('example.invalid');
});
test('explicit new request retires completed intent while corrupt storage remains usable',async()=>{
 sessionStorage.setItem('songfood_submission_keys_v1','{broken');
 const key=await submissionKey(payload,'new-buyer');
 await forgetSubmissionKey(payload,'new-buyer');
 expect(await submissionKey(payload,'new-buyer')).not.toBe(key);
});
