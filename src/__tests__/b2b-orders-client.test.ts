import {orderPost} from '@/lib/orders/client';
import {webcrypto,randomUUID} from 'node:crypto';
const storage=new Map<string,string>();
beforeAll(()=>{
 Object.defineProperty(globalThis,'crypto',{value:{subtle:webcrypto.subtle,randomUUID},configurable:true});
 Object.defineProperty(globalThis,'sessionStorage',{value:{getItem:(k:string)=>storage.get(k)||null,setItem:(k:string,v:string)=>storage.set(k,v),removeItem:(k:string)=>storage.delete(k)},configurable:true});
});
beforeEach(()=>{storage.clear();global.fetch=jest.fn();});
test('ambiguous failure retries with same key and persists no customer address',async()=>{
 jest.mocked(fetch).mockResolvedValueOnce(new Response(JSON.stringify({error:'일시 오류'}),{status:503})).mockResolvedValueOnce(new Response(JSON.stringify({id:'saved'}))).mockResolvedValueOnce(new Response(JSON.stringify({id:'second'})));
 const body={delivery:{address:'PRIVATE-DELIVERY-ADDRESS'}};
 await expect(orderPost('/api/orders',body)).rejects.toThrow('일시 오류');
 expect(JSON.stringify([...storage])).not.toContain('PRIVATE-DELIVERY-ADDRESS');
 await orderPost('/api/orders',body);await orderPost('/api/orders',body);
 const bodies=jest.mocked(fetch).mock.calls.map(c=>JSON.parse(String(c[1]?.body)));
 expect(bodies[0].request_key).toBe(bodies[1].request_key);
 expect(bodies[1].request_key).not.toBe(bodies[2].request_key);
 expect(storage.size).toBe(0);
});
test('changed payload receives a different request identity',async()=>{
 jest.mocked(fetch).mockResolvedValue(new Response(JSON.stringify({error:'Retry'}),{status:503}));
 await expect(orderPost('/api/orders',{quantity:1})).rejects.toThrow();
 // A fresh Response is needed because the previous body stream was consumed.
 jest.mocked(fetch).mockResolvedValue(new Response(JSON.stringify({error:'Retry'}),{status:503}));
 await expect(orderPost('/api/orders',{quantity:2})).rejects.toThrow();
 const calls=jest.mocked(fetch).mock.calls.map(c=>JSON.parse(String(c[1]?.body)));
 expect(calls[0].request_key).not.toBe(calls[1].request_key);
});
