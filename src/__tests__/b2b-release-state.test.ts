import {restrictCatalogue} from '@/lib/launch/release-state';
import type {CatalogueEntry} from '@/lib/pricing/types';
const entries=[{product_id:'p1',units:{EA:{quantity:1,line:{total_minor:1100}}},message:''},{product_id:'p2',units:{EA:{quantity:1,line:{total_minor:1100}}},message:''}] as CatalogueEntry[];
test('disabled limit preserves approved catalogue price behavior',()=>expect(restrictCatalogue(entries,{enabled:false,products:{}})).toBe(entries));
test('only current domestic release retains purchase quantities and units',()=>{
 const r=restrictCatalogue(entries,{enabled:true,products:{p1:{domestic:true,export:false},p2:{domestic:false,export:true}}});
 expect(r[0]).toBe(entries[0]);expect(r[1].units).toEqual({});expect(r[1].message).toContain('출시 검수');expect(entries[1].units.EA).toBeDefined();
});
test('unknown product is inquiry only and unavailable policy fails closed',()=>{
 expect(restrictCatalogue(entries,{enabled:true,products:{}}).every(p=>Object.keys(p.units).length===0)).toBe(true);
 for(const state of [null,{enabled:'true',products:{}},{enabled:true,products:null},{enabled:true,products:[]}])expect(()=>restrictCatalogue(entries,state as never)).toThrow();
});
