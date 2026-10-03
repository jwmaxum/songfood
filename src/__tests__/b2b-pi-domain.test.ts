import {parseIssue,parseIssuer,buildPiSnapshot} from '@/lib/pi/validation';
import {piState} from '@/lib/pi/types';
import {price,rate,quote,input,now,sample} from './fixtures/pi';
test('PI pins validated USD totals and excludes internal costs, staff and source prices',()=>{
 const s=sample().snapshot;expect(s.total_minor).toBe(24000);expect(s.lines[0]).toMatchObject({unit_minor:8000,total_minor:24000,ea_per_ctn:10,loading_port:'Busan'});
 const text=JSON.stringify(s);for(const privateField of ['review_note','cost_review','price_source','approved_by','Private margin'])expect(text).not.toContain(privateField);
 expect(s.notice).toContain('Not a final Commercial Invoice');
});
test('JSONB key ordering cannot invalidate the same approved price',()=>{
 const reordered=Object.fromEntries(Object.entries(price).reverse()) as typeof price;
 expect(buildPiSnapshot(quote(),parseIssue(input),[reordered],rate,now).total_minor).toBe(24000);
});
test.each(['name','address','email','phone','payment_terms','bank_details'])('seller field %s required',k=>{expect(()=>parseIssuer({...input.seller,[k]:''})).toThrow();});
test.each([
 {...input,fob_confirmed:false},{...input,buyer_address:''},{...input,change_reason:'x'},{...input,valid_until:'2026-10-05T00:00:00'},
])('PI document required input rejects unsafe missing values %#',b=>expect(()=>parseIssue(b)).toThrow());
test.each(['2026-10-02T00:00:00Z','2026-10-09T00:00:00Z'])('PI validity cannot be expired or exceed source %s',valid_until=>expect(()=>buildPiSnapshot(quote(),parseIssue({...input,valid_until}),[price],rate,now)).toThrow());
test.each(['review','total','quantity','approval','fob','rate','price_changed','source_expired'])('issuance gate rejects %s',kind=>{
 const q=quote(),p={...price},r={...rate};
 if(kind==='review')q.snapshot.issues=['Review missing'];
 if(kind==='total')q.snapshot.proposed_total_minor=1;
 if(kind==='quantity')q.snapshot.lines[0].quantity=1;
 if(kind==='approval')p.status='draft';
 if(kind==='fob')p.fob_status='unreviewed';
 if(kind==='rate')r.valid_until='2026-10-02T00:00:00Z';
 if(kind==='price_changed')p.unit_price_krw='220000';
 if(kind==='source_expired')q.snapshot.valid_until='2026-10-02T00:00:00Z';
 expect(()=>buildPiSnapshot(q,parseIssue(input),[p],r,now)).toThrow();
});
test('accepted history persists after expiry while unaccepted documents expire',()=>{
 const d={status:'issued' as const,accepted_at:null,change_requested_at:null,snapshot:sample().snapshot};
 expect(piState(d,now.getTime())).toBe('issued');expect(piState(d,Date.parse('2026-10-06'))).toBe('expired');
 expect(piState({...d,accepted_at:'2026-10-04'},Date.parse('2026-10-06'))).toBe('accepted');
 expect(piState({...d,change_requested_at:'2026-10-03'},now.getTime())).toBe('changes_requested');
 expect(piState({...d,status:'superseded'},now.getTime())).toBe('superseded');
});
