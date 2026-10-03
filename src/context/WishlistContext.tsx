'use client';
import {createContext,useContext,useSyncExternalStore,type ReactNode} from 'react';
import type {ProductItem} from '@/lib/types';
import {publicProduct} from '@/lib/public-product';
const key='anatolia_wishlist',empty:ProductItem[]=[];
let previous:string|null=null,snapshot:ProductItem[]=empty;
function read(){
 try{const raw=localStorage.getItem(key);if(raw===previous)return snapshot;previous=raw;
 const parsed=raw&&raw.length<1_000_000?JSON.parse(raw):[];
 snapshot=Array.isArray(parsed)?parsed.filter(p=>p&&typeof p.id==='string'&&typeof p.name==='string').slice(0,200).map(publicProduct):empty;
 }catch{snapshot=empty;}return snapshot;
}
function subscribe(notify:()=>void){window.addEventListener('storage',notify);window.addEventListener('songfood-wishlist',notify);return()=>{window.removeEventListener('storage',notify);window.removeEventListener('songfood-wishlist',notify);};}
function save(items:ProductItem[]){try{localStorage.setItem(key,JSON.stringify(items.map(publicProduct)));window.dispatchEvent(new Event('songfood-wishlist'));}catch{/* Storage is optional; never log saved customer selections. */}}
type State={wishlist:ProductItem[];addToWishlist:(p:ProductItem)=>void;removeFromWishlist:(id:string)=>void;isInWishlist:(id:string)=>boolean;toggleWishlist:(p:ProductItem)=>void};
const WishlistContext=createContext<State|undefined>(undefined);
export function WishlistProvider({children}:{children:ReactNode}){
 const wishlist=useSyncExternalStore(subscribe,read,()=>empty);
 function addToWishlist(p:ProductItem){const current=read();if(current.length<200&&!current.some(i=>i.id===p.id))save([...current,p]);}
 function removeFromWishlist(id:string){save(read().filter(p=>p.id!==id));}
 function isInWishlist(id:string){return wishlist.some(p=>p.id===id);}
 return <WishlistContext.Provider value={{wishlist,addToWishlist,removeFromWishlist,isInWishlist,toggleWishlist:p=>isInWishlist(p.id)?removeFromWishlist(p.id):addToWishlist(p)}}>{children}</WishlistContext.Provider>;
}
export function useWishlist(){const value=useContext(WishlistContext);if(!value)throw new Error('WishlistProvider is required');return value;}
