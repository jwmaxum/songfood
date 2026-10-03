/** @jest-environment jsdom */
import React from 'react';
import '@testing-library/jest-dom';
import {cleanup,fireEvent,render,screen} from '@testing-library/react';
import {PurchasePanel} from '@/components/pricing/ProductPrice';
import type {ProductItem} from '@/lib/types';
const mockAdd=jest.fn();
jest.mock('@/context/AuthContext',()=>({useAuth:()=>({user:null})}));
jest.mock('@/context/PricingContext',()=>({usePricing:()=>({products:{},loading:false,error:''}),usePricePreview:()=>({preview:null,loading:false,error:'로그인 후 가격 확인'})}));
jest.mock('@/context/CartContext',()=>({useCart:()=>({addToCart:mockAdd})}));
jest.mock('next/link',()=>({__esModule:true,default:({href,children,onClick,...props}:React.AnchorHTMLAttributes<HTMLAnchorElement>)=><a href={href} {...props} onClick={e=>{e.preventDefault();onClick?.(e);}}>{children}</a>}));
const product={id:'p1',name:'상품',purchase_minimum:{unit:'BOX',quantity:2}} as ProductItem;
afterEach(()=>{cleanup();jest.clearAllMocks();});
test('unpriced guest inquiry carries the public minimum quantity and selected unit without opening the drawer',()=>{
 render(<PurchasePanel product={product}/>);
 expect(screen.getByLabelText('구매 수량')).toHaveValue(2);
 expect(screen.getByRole('button',{name:'국내 구매함 담기'})).toBeDisabled();
 fireEvent.click(screen.getByRole('link',{name:'구매 문의'}));
 expect(mockAdd).toHaveBeenCalledWith(product,2,undefined,undefined,'box',undefined,undefined,false);
});
test('invalid detail inquiry quantities are not stored',()=>{
 render(<PurchasePanel product={product}/>);
 fireEvent.change(screen.getByLabelText('구매 수량'),{target:{value:'0'}});
 fireEvent.click(screen.getByRole('link',{name:'구매 문의'}));
 expect(mockAdd).not.toHaveBeenCalled();
});
