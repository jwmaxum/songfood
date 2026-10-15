/** @jest-environment jsdom */
import {render,screen,fireEvent} from '@testing-library/react';
import '@testing-library/jest-dom';
import LabelDashboardTable from '@/components/admin/labels/LabelDashboardTable';
import BestSellers from '@/components/home/BestSellers';
import type {ProductItem} from '@/lib/types';
jest.mock('@/context/CartContext',()=>({useCart:()=>({addToCart:jest.fn()})}));
jest.mock('@/components/pricing/ProductPrice',()=>({ProductPrice:()=>null}));
const product={id:'qa-en-only',name:null,name_en:'English-only food',collection:null,category:null,sku:'AUTO-QA',image_url:'/logo.png'} as unknown as ProductItem;
test('label dashboard name search finds an English-only unclassified record without a null crash',()=>{
 render(<LabelDashboardTable products={[product]}/>);
 fireEvent.change(screen.getByPlaceholderText('품목명, 영문명, SKU 또는 HS Code 실시간 검색...'),{target:{value:'English-only'}});
 expect(screen.getByText('(1개 품목 표시 중)')).toBeInTheDocument();
 expect(screen.getByText('미분류')).toBeInTheDocument();
 expect(screen.getByAltText('English-only food')).toBeInTheDocument();
 fireEvent.change(screen.getByPlaceholderText('품목명, 영문명, SKU 또는 HS Code 실시간 검색...'),{target:{value:'no such item'}});
 expect(screen.getByText('(0개 품목 표시 중)')).toBeInTheDocument();
});
test('best sellers renders the available name and excludes unclassified records when a category is selected',()=>{
 render(<BestSellers products={[product]}/>);
 expect(screen.getByRole('heading',{name:'English-only food'})).toBeInTheDocument();
 fireEvent.click(screen.getByRole('button',{name:'K-소스/장류'}));
 expect(screen.queryByRole('heading',{name:'English-only food'})).not.toBeInTheDocument();
 fireEvent.click(screen.getByRole('button',{name:'전체'}));
 expect(screen.getByRole('heading',{name:'English-only food'})).toBeInTheDocument();
});
