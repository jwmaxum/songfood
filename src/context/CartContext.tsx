'use client';
import { createContext, useContext, useEffect, useState } from 'react';
import type { ProductItem, CartItem } from '@/lib/types';
import type { TradeUnit } from '@/lib/pricing/types';
import { usePricing, usePricePreview } from './PricingContext';
import { UNIT_LABELS } from '@/lib/pricing/types';
export const cartUnit=(item:CartItem):TradeUnit=>item.purchaseType==='box'?'BOX':['carton','wholesale'].includes(item.purchaseType||'')?'CTN':'EA';
export const cartKey=(item:CartItem)=>JSON.stringify([item.product.id,cartUnit(item)]);
function useCartState() {
  const [cartItems,setCartItems]=useState<CartItem[]>([]),[isCartOpen,setIsCartOpen]=useState(false),[initialized,setInitialized]=useState(false);
  const {products}=usePricing();
  useEffect(()=>{
    let live=true;
    Promise.resolve().then(()=>{
      try {
        const saved=JSON.parse(localStorage.getItem('anatolia_cart')||'[]');
        if(live && Array.isArray(saved))setCartItems(saved.filter(i=>i?.product?.id && Number.isInteger(i.quantity) && i.quantity>0 && i.quantity<=100000).slice(0,100).map(i=>({
          product:{id:String(i.product.id),name:String(i.product.name||''),sku:i.product.sku,image_url:i.product.image_url,format:i.product.format,purchase_minimum:i.product.purchase_minimum} as ProductItem,
          quantity:i.quantity,purchaseType:i.purchaseType==='box'?'box':cartUnit(i)==='CTN'?'carton':'ea',
        })));
        localStorage.removeItem('anatolia_coupon');
      } catch { /* Ignore corrupt legacy cart; never restore its prices. */ }
      if(live)setInitialized(true);
    });
    return()=>{live=false;};
  },[]);
  useEffect(()=>{if(initialized)try{localStorage.setItem('anatolia_cart',JSON.stringify(cartItems));}catch{}},[cartItems,initialized]);
  function addToCart(product:ProductItem,quantity=1,_format?:string,_finish?:string,purchaseType?:CartItem['purchaseType'],_customPrice?:number,_label?:string,openDrawer=true) {
    if(!Number.isInteger(quantity)||quantity<1||quantity>100000)return;
    void _customPrice; void _label; // Legacy caller arguments never determine payable amounts.
    const unit=purchaseType?cartUnit({purchaseType} as CartItem):products[product.id]?.minimum_order?.unit||product.purchase_minimum?.unit||'EA';
    const actualQuantity=purchaseType?quantity:Math.max(quantity,products[product.id]?.units[unit]?.quantity||product.purchase_minimum?.quantity||1);
    const item:CartItem={product,quantity:actualQuantity,purchaseType:unit==='BOX'?'box':unit==='CTN'?'carton':'ea',packageLabel:UNIT_LABELS[unit]};
    setCartItems(old=>{
      const existing=old.find(i=>cartKey(i)===cartKey(item));
      if(existing)return old.map(i=>cartKey(i)===cartKey(item)?{...i,quantity:Math.min(100000,i.quantity+actualQuantity)}:i);
      return old.length<100?[...old,item]:old;
    });if(openDrawer)setIsCartOpen(true);
  }
  function removeFromCart(key:string){setCartItems(old=>old.filter(i=>cartKey(i)!==key));}
  function updateQuantity(key:string,quantity:number) {
    if(!Number.isInteger(quantity)||quantity<1||quantity>100000)return;
    setCartItems(old=>old.map(i=>cartKey(i)===key?{...i,quantity}:i));
  }
  const price=usePricePreview(cartItems.map(i=>({product_id:i.product.id,unit:cartUnit(i),quantity:i.quantity})));
  return {cartItems,isCartOpen,setIsCartOpen,addToCart,removeFromCart,updateQuantity,clearCart:()=>setCartItems([]),...price};
}
const CartContext=createContext<ReturnType<typeof useCartState>|null>(null);
export function CartProvider({children}:{children:React.ReactNode}) {return <CartContext.Provider value={useCartState()}>{children}</CartContext.Provider>;}
export function useCart(){const value=useContext(CartContext);if(!value)throw new Error('CartProvider is required');return value;}
