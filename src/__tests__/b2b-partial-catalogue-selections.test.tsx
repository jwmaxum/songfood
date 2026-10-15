/** @jest-environment jsdom */
import {render,screen,waitFor,fireEvent} from '@testing-library/react';
import '@testing-library/jest-dom';
import {CartProvider,useCart} from '@/context/CartContext';
import {WishlistProvider,useWishlist} from '@/context/WishlistContext';
import CartContents from '@/components/cart/CartContents';
import {productName} from '@/lib/catalogue-taxonomy';
import type {ProductItem} from '@/lib/types';
jest.mock('@/context/PricingContext',()=>({usePricing:()=>({products:{}}),usePricePreview:()=>({preview:null,error:'',loading:false})}));
jest.mock('@/components/pricing/ProductPrice',()=>({ProductPrice:()=>null}));
jest.mock('@/lib/i18n/LanguageContext',()=>({useLanguage:()=>({language:'ko',t:(value:string)=>value})}));
jest.mock('@/components/layout/LocalizedLink',()=>({__esModule:true,default:({children,...props}:React.AnchorHTMLAttributes<HTMLAnchorElement>)=><a {...props}>{children}</a>}));
const product={id:'qa-en-only-persisted',name:null,name_en:'English-only persisted food',collection:null,sku:'AUTO-QA'} as unknown as ProductItem;
function CartProbe(){const {cartItems}=useCart();return <><output data-testid="cart-json">{JSON.stringify(cartItems)}</output><CartContents/></>;}
function WishProbe(){const {wishlist,toggleWishlist}=useWishlist();return <><output data-testid="wishlist-json">{JSON.stringify(wishlist)}</output><button onClick={()=>toggleWishlist(product)}>toggle</button>{wishlist.map(p=><p key={p.id}>{productName(p,'ko')}</p>)}</>;}
beforeEach(()=>localStorage.clear());
test('cart reload keeps the English name and original missing Korean name, never restored prices',async()=>{
 localStorage.setItem('anatolia_cart',JSON.stringify([{product:{...product,price:1,wholesale_price_krw:1,source_notes:{specification:'PRIVATE'}},quantity:2,purchaseType:'ea',unitPrice:1}]));
 const view=render(<CartProvider><CartProbe/></CartProvider>);
 await waitFor(()=>expect(screen.getByRole('link',{name:'English-only persisted food'})).toBeInTheDocument());
 expect(screen.getByRole('spinbutton',{name:'English-only persisted food EA 수량'})).toHaveValue(2);
 const restored=JSON.parse(screen.getByTestId('cart-json').textContent!)[0];
 expect(restored.product).toMatchObject({name:null,name_en:'English-only persisted food'});
 expect(restored.product).not.toHaveProperty('price');expect(restored.product).not.toHaveProperty('source_notes');expect(restored).not.toHaveProperty('unitPrice');
 view.unmount();render(<CartProvider><CartProbe/></CartProvider>);
 await waitFor(()=>expect(screen.getByRole('link',{name:'English-only persisted food'})).toBeInTheDocument());
 expect(JSON.parse(localStorage.getItem('anatolia_cart')!)[0].product.name_en).toBe('English-only persisted food');
});
test('wishlist remount preserves an English-only record and strips private fields',()=>{
 localStorage.setItem('anatolia_wishlist',JSON.stringify([{...product,source_notes:{specification:'PRIVATE'}}]));
 const view=render(<WishlistProvider><WishProbe/></WishlistProvider>);
 expect(screen.getByText('English-only persisted food')).toBeInTheDocument();
 const restored=JSON.parse(screen.getByTestId('wishlist-json').textContent!)[0];
 expect(restored).toMatchObject({name:null,name_en:'English-only persisted food'});expect(restored).not.toHaveProperty('source_notes');
 view.unmount();render(<WishlistProvider><WishProbe/></WishlistProvider>);
 expect(screen.getByText('English-only persisted food')).toBeInTheDocument();
 fireEvent.click(screen.getByRole('button',{name:'toggle'}));expect(screen.queryByText('English-only persisted food')).not.toBeInTheDocument();
 fireEvent.click(screen.getByRole('button',{name:'toggle'}));expect(screen.getByText('English-only persisted food')).toBeInTheDocument();
});
test('wishlist ignores nameless and malformed stored name fields instead of exposing a crashing display value',()=>{
 localStorage.setItem('anatolia_wishlist',JSON.stringify([{id:'qa-blank',name:null,name_en:'  '},{id:'qa-malformed',name:{bad:true},name_en:'Untrusted other name'},product]));
 render(<WishlistProvider><WishProbe/></WishlistProvider>);
 expect(JSON.parse(screen.getByTestId('wishlist-json').textContent!)).toHaveLength(1);
 expect(screen.getByText('English-only persisted food')).toBeInTheDocument();
});
