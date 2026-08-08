'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { ProductItem } from '@/lib/types';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import {
  Shield,
  Plus,
  Trash2,
  Edit2,
  ArrowLeft,
  Search,
  Upload,
  CheckCircle2,
  Star,
  Package,
} from 'lucide-react';

const FALLBACK_PRODUCTS: ProductItem[] = [
  {
    id: 'prod-1',
    name: 'CJ 비비고 수제 프리미엄 왕교자 만두 1.4kg (급속냉동)',
    collection: 'K-냉동식품',
    category: '만두 & 교자',
    price: 18,
    original_price: 22,
    stock: 150,
    rating: 4.9,
    reviews_count: 88,
    sku: 'KFD-[#14532D]-MANDU',
    format: '1.4kg 파우치 (대용량)',
    finish: '-40℃ IQF 급속 동결',
    color: '육즙 꽉 찬 돼지고기 & 야채',
    look: 'HACCP 위생 인증',
    image_url: 'https://images.unsplash.com/photo-1541696432-82c6da8ce7bf?auto=format&fit=crop&w=800&q=80',
    description: '국산 100% 돼지고기와 신선한 야채로 빚어낸 프리미엄 왕교자 만두. 얇고 쫀득한 피와 쫄깃한 식감.',
    thickness: '1.4kg',
    origin: '대한민국',
    is_featured: true,
  },
  {
    id: 'prod-2',
    name: '원소주 프리미엄 증류식 소주 24% (WON SOJU 375ml)',
    collection: 'K-주류 & 전통주',
    category: '증류소주',
    price: 28,
    original_price: 35,
    stock: 90,
    rating: 5.0,
    reviews_count: 142,
    sku: 'KLQ-WONSOJU-24',
    format: '375ml 유리병',
    finish: '100% 쌀 발효 옹기 숙성',
    color: '투명하고 감미로운 쌀 향',
    look: '원스피리츠 전통 도가 인증',
    image_url: 'https://images.unsplash.com/photo-1527281400683-1aae777175f8?auto=format&fit=crop&w=800&q=80',
    description: '100% 국내산 쌀로 빚어 옹기에서 숙성시킨 고급 증류식 소주. 깔끔하고 부드러운 목넘김.',
    thickness: '375ml',
    origin: '대한민국 강원도 원주',
    is_featured: true,
  },
  {
    id: 'prod-3',
    name: 'K-수제 눈꽃 떡볶이 & 모둠튀김 3인분 밀키트',
    collection: 'K-간식 & 밀키트',
    category: '떡볶이 & 밀키트',
    price: 15,
    original_price: 19,
    stock: 200,
    rating: 4.8,
    reviews_count: 65,
    sku: 'KFD-TTEOK-850',
    format: '3인분 (850g 급속냉동)',
    finish: '특제 매콤달콤 비법 소스',
    color: '진한 고추장 레드 & 모짜렐라 치즈',
    look: '송영민푸드 전용 밀키트',
    image_url: 'https://images.unsplash.com/photo-1563245372-f21724e3856d?auto=format&fit=crop&w=800&q=80',
    description: '말랑말랑한 쫄깃한 쌀떡과 특제 떡볶이 소스, 김말이 & 군만두 튀김이 포함된 15분 완성 수제 떡볶이.',
    thickness: '850g',
    origin: '대한민국',
    is_featured: true,
  },
  {
    id: 'prod-5',
    name: 'Jamón Ibérico de Bellota 100% Pata Negra (Hand-Sliced)',
    collection: 'Dairy & Charcuterie',
    category: 'Charcuterie',
    price: 95,
    original_price: 110,
    stock: 50,
    rating: 4.9,
    reviews_count: 41,
    sku: 'ANA-PAT-100G',
    format: '100g Vacuum Pack',
    finish: '48-Month Acorn Cured',
    color: 'Ruby Red & Marbled Fat',
    look: 'Jabugo DOP Black Label',
    image_url: 'https://images.unsplash.com/photo-1541544741938-0af808871cc0?auto=format&fit=crop&w=800&q=80',
    description: '100% free-range acorn-fed pure Iberian pigs aged for 4 years in natural mountain bodegas.',
    thickness: '100g',
    origin: 'Jabugo, Spain',
    is_featured: true,
  },
  {
    id: 'prod-6',
    name: 'Sicilian Organic Wildflower Blossom Honey & Sea Salt Flakes',
    collection: 'Fresh & Gourmet',
    category: 'Gourmet Condiment',
    price: 32,
    original_price: null,
    stock: 80,
    rating: 4.7,
    reviews_count: 15,
    sku: 'ANA-HON-350',
    format: '350g Jar',
    finish: 'Unfiltered Cold-Extracted',
    color: 'Golden Topaz',
    look: 'Sicilian Artisan Estate',
    image_url: 'https://images.unsplash.com/photo-1452195100486-9cc805987862?auto=format&fit=crop&w=800&q=80',
    description: 'Raw unheated nectar gathered from Mount Etna slopes paired with sun-evaporated Trapani salt crystals.',
    thickness: '350g',
    origin: 'Sicily, Italy',
    is_featured: false,
  },
];

export default function ProductManager() {
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<ProductItem | null>(null);

  const [name, setName] = useState('');
  const [collection, setCollection] = useState('K-냉동식품');
  const [category, setCategory] = useState('만두 & 교자');
  const [price, setPrice] = useState('18000');
  const [originalPrice, setOriginalPrice] = useState('22000');
  const [format, setFormat] = useState('1.05kg 패밀리팩');
  const [finish, setFinish] = useState('-40°C IQF 급속냉동');
  const [color, setColor] = useState('노릇노릇 바삭함');
  const [look, setLook] = useState('수제 손주름 교자');
  const [imageUrl, setImageUrl] = useState('');
  const [description, setDescription] = useState('');
  const [origin, setOrigin] = useState('대한민국');
  const [isFeatured, setIsFeatured] = useState(true);
  const [isTodaysDeal, setIsTodaysDeal] = useState(false);
  const [isBestSeller, setIsBestSeller] = useState(true);
  const [cartonQty, setCartonQty] = useState('10');
  const [wholesaleDiscountRate, setWholesaleDiscountRate] = useState('15');

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/products?mode=admin');
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.data) && data.data.length > 0) {
          setProducts(data.data);
          setLoading(false);
          return;
        }
      }
    } catch {
      // Fallback
    }

    if (isSupabaseConfigured()) {
      try {
        const { data, error } = await supabase.from('products').select('*');
        if (!error && data && data.length > 0) {
          setProducts(data as ProductItem[]);
          setLoading(false);
          return;
        }
      } catch (err) {
        console.error(err);
      }
    }

    setProducts(FALLBACK_PRODUCTS);
    setLoading(false);
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const filteredProducts = products.filter(
    (p) =>
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.collection.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleDelete = async (id: string) => {
    if (!confirm('정말로 이 상품을 삭제하시겠습니까?')) return;
    setProducts((prev) => prev.filter((p) => p.id !== id));

    try {
      await fetch(`/api/products?id=${id}`, { method: 'DELETE' });
    } catch {
      // Ignore
    }

    if (isSupabaseConfigured()) {
      await supabase.from('products').delete().eq('id', id);
    }

    showToast('상품이 성공적으로 삭제되었습니다.');
  };

  const openCreateModal = () => {
    setEditingProduct(null);
    setName('');
    setCollection('K-냉동식품');
    setCategory('만두 & 교자');
    setPrice('18000');
    setOriginalPrice('22000');
    setCartonQty('10');
    setWholesaleDiscountRate('15');
    setFormat('1.05kg 패밀리팩');
    setFinish('-40°C IQF 급속냉동');
    setColor('노릇노릇 바삭함');
    setLook('수제 손주름 교자');
    setImageUrl('');
    setDescription('');
    setOrigin('대한민국');
    setIsFeatured(true);
    setIsTodaysDeal(false);
    setIsBestSeller(true);
    setIsModalOpen(true);
  };

  const openEditModal = (p: ProductItem) => {
    setEditingProduct(p);
    setName(p.name);
    setCollection(p.collection);
    setCategory(p.category || '기타');
    setPrice(String(p.price || 18000));
    setOriginalPrice(p.original_price ? String(p.original_price) : '');
    setCartonQty(String(p.carton_qty || 10));
    setWholesaleDiscountRate(String(Math.round((p.wholesale_discount_rate ?? 0.15) * 100)));
    setFormat(p.format);
    setFinish(p.finish);
    setColor(p.color);
    setLook(p.look);
    setImageUrl(p.image_url || '');
    setDescription(p.description || '');
    setOrigin(p.origin || '대한민국');
    setIsFeatured(p.is_featured ?? true);
    setIsTodaysDeal(p.is_todays_deal ?? false);
    setIsBestSeller(p.is_best_seller ?? false);
    setIsModalOpen(true);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('/api/upload', { method: 'POST', body: formData });
      const data = await res.json();
      if (data.success) {
        setImageUrl(data.url);
        showToast('이미지가 성공적으로 업로드되었습니다!');
      } else {
        alert(data.error || '업로드에 실패했습니다.');
      }
    } catch {
      const localUrl = URL.createObjectURL(file);
      setImageUrl(localUrl);
      showToast('이미지가 로컬 첨부되었습니다!');
    } finally {
      setUploading(false);
    }
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return alert('상품명을 입력해주세요.');

    const numericPrice = Number(price) || 0;
    const numericOriginalPrice = originalPrice ? Number(originalPrice) : null;
    const numericCartonQty = Number(cartonQty) || 10;
    const numericDiscountPercent = Number(wholesaleDiscountRate) || 15;
    const discountRateDecimal = numericDiscountPercent / 100;
    
    // Wholesale Box Price = Price * CartonQty * (1 - DiscountRate)
    const calculatedWholesaleBoxPrice = Math.round(numericPrice * numericCartonQty * (1 - discountRateDecimal));

    const newOrUpdated: ProductItem = {
      id: editingProduct ? editingProduct.id : `prod-${Date.now()}`,
      name,
      collection,
      category,
      price: numericPrice,
      original_price: numericOriginalPrice,
      carton_qty: numericCartonQty,
      wholesale_discount_rate: discountRateDecimal,
      wholesale_price_krw: calculatedWholesaleBoxPrice,
      format,
      finish,
      color,
      look,
      image_url: imageUrl || 'https://images.unsplash.com/photo-1541696432-82c6da8ce7bf?auto=format&fit=crop&w=800&q=80',
      description,
      origin,
      is_featured: isFeatured,
      is_todays_deal: isTodaysDeal,
      is_best_seller: isBestSeller,
      rating: editingProduct?.rating || 4.9,
      reviews_count: editingProduct?.reviews_count || 12,
      sku: editingProduct?.sku || `KFD-${Date.now().toString().slice(-4)}`,
    };

    if (editingProduct) {
      setProducts((prev) => prev.map((p) => (p.id === editingProduct.id ? newOrUpdated : p)));
    } else {
      setProducts((prev) => [newOrUpdated, ...prev]);
    }

    try {
      await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newOrUpdated),
      });
    } catch {
      // Ignore
    }

    if (isSupabaseConfigured()) {
      await supabase.from('products').upsert(newOrUpdated);
    }

    setIsModalOpen(false);
    showToast(editingProduct ? '상품 정보가 수정되었습니다.' : '신규 상품이 등록되었습니다.');
  };

  return (
    <div className="p-6 md:p-10 space-y-8 bg-[#0a0a0c] text-stone-200 min-h-screen">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#c5a880] text-black px-5 py-3 rounded-lg shadow-xl font-medium flex items-center space-x-2 text-xs animate-bounce">
          <CheckCircle2 size={16} />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-6 border-b border-stone-800">
        <div>
          <Link
            href="/admin"
            className="inline-flex items-center space-x-2 text-xs text-stone-400 hover:text-[#c5a880] mb-2 transition-colors"
          >
            <ArrowLeft size={14} />
            <span>대시보드로 돌아가기</span>
          </Link>
          <h1 className="text-2xl sm:text-3xl font-serif-luxury font-bold text-white flex items-center space-x-3">
            <Shield className="text-[#c5a880]" size={28} />
            <span>상품 관리 & 메인 노출 지정 (CRUD)</span>
          </h1>
          <p className="text-xs text-stone-400 mt-1">
            송영민푸드 상품 등록, 가격 설정(원화 ₩), 이미지 업로드, 카테고리 관리 및 [오늘의 특가 / 베스트셀러] 노출을 관리합니다.
          </p>
        </div>

        <button
          onClick={openCreateModal}
          className="flex items-center space-x-2 px-5 py-2.5 bg-[#c5a880] hover:bg-[#b59870] text-black font-semibold rounded text-xs transition-colors shadow-lg"
        >
          <Plus size={16} />
          <span>신규 상품 등록</span>
        </button>
      </div>

      {/* Search Input Filter */}
      <div className="relative max-w-md">
        <Search size={16} className="absolute left-3.5 top-3 text-stone-500" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="상품명, 카테고리, 컬렉션 검색..."
          className="w-full pl-10 pr-4 py-2.5 bg-[#111118] border border-stone-800 focus:border-[#c5a880] rounded text-xs text-white focus:outline-none"
        />
      </div>

      {/* Product List Grid */}
      {loading ? (
        <div className="py-20 text-center text-stone-500 text-sm animate-pulse">
          상품 카탈로그를 불러오는 중입니다...
        </div>
      ) : filteredProducts.length === 0 ? (
        <div className="py-20 text-center bg-[#111118] border border-stone-800 rounded-xl space-y-3">
          <Package className="mx-auto text-stone-600" size={40} />
          <p className="text-stone-400 text-sm">검색 조건에 일치하는 상품이 없습니다.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProducts.map((p) => (
            <div
              key={p.id}
              className="bg-[#111118] border border-stone-800 rounded-xl overflow-hidden shadow-xl flex flex-col justify-between group hover:border-[#c5a880]/50 transition-all duration-300"
            >
              <div>
                {/* Product Image Header */}
                <div className="h-44 relative bg-stone-900 overflow-hidden">
                  <img
                    src={p.image_url || 'https://images.unsplash.com/photo-1541696432-82c6da8ce7bf?auto=format&fit=crop&w=800&q=80'}
                    alt={p.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute top-3 left-3 flex flex-col gap-1">
                    <span className="bg-[#0a0a0c]/80 backdrop-blur border border-stone-700 text-[#c5a880] text-[10px] uppercase font-mono px-2.5 py-0.5 rounded">
                      {p.collection}
                    </span>
                    {p.is_todays_deal && (
                      <span className="bg-red-900/90 text-red-200 border border-red-700 text-[10px] font-bold px-2 py-0.5 rounded">
                        🔥 오늘의 특가
                      </span>
                    )}
                    {p.is_best_seller && (
                      <span className="bg-amber-900/90 text-amber-200 border border-amber-700 text-[10px] font-bold px-2 py-0.5 rounded">
                        ⭐ 베스트셀러
                      </span>
                    )}
                  </div>

                  <div className="absolute top-3 right-3 bg-black/80 backdrop-blur px-2.5 py-1 rounded text-xs font-bold text-[#c5a880]">
                    ₩{(p.price || 0).toLocaleString()}원
                  </div>
                </div>

                {/* Info Content */}
                <div className="p-5 space-y-2.5">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center space-x-1 text-[#c5a880]">
                      <Star size={13} className="fill-[#c5a880]" />
                      <span className="font-semibold">{p.rating || 4.9}</span>
                      <span className="text-stone-500 font-mono text-[10px]">({p.reviews_count || 12})</span>
                    </div>
                    <span className="text-emerald-400 text-[10px] font-mono font-bold">
                      📦 도매 Box: ₩{(p.wholesale_price_krw || Math.round((p.price || 18000) * (p.carton_qty || 10) * (1 - (p.wholesale_discount_rate || 0.15)))).toLocaleString()}원 ({p.carton_qty || 10}개입)
                    </span>
                  </div>

                  <h3 className="font-serif-luxury text-base font-semibold text-white line-clamp-1 group-hover:text-[#c5a880] transition-colors">
                    {p.name}
                  </h3>

                  {/* Attributes Badges */}
                  <div className="grid grid-cols-2 gap-1.5 pt-1 text-[10px] font-mono text-stone-400">
                    <div className="truncate">용량: <span className="text-stone-200">{p.format}</span></div>
                    <div className="truncate">공법: <span className="text-stone-200">{p.finish}</span></div>
                    <div className="truncate">특성: <span className="text-stone-200">{p.color}</span></div>
                    <div className="truncate">원산지: <span className="text-stone-200">{p.origin || '대한민국'}</span></div>
                  </div>
                </div>
              </div>

              {/* Actions Footer */}
              <div className="px-5 py-3 bg-[#0a0a0c]/60 border-t border-stone-800/80 flex items-center justify-between">
                <span className="text-[10px] text-stone-500 font-mono">
                  SKU: {p.sku}
                </span>

                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => openEditModal(p)}
                    className="p-1.5 text-stone-400 hover:text-white bg-stone-900 hover:bg-stone-800 rounded border border-stone-800 transition-colors flex items-center space-x-1 text-xs"
                  >
                    <Edit2 size={13} />
                    <span>수정</span>
                  </button>
                  <button
                    onClick={() => handleDelete(p.id)}
                    className="p-1.5 text-red-400 hover:text-red-300 bg-red-950/30 hover:bg-red-900/50 rounded border border-red-900/50 transition-colors flex items-center space-x-1 text-xs"
                  >
                    <Trash2 size={13} />
                    <span>삭제</span>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal Form */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-[#111118] border border-stone-800 rounded-xl max-w-2xl w-full p-6 space-y-5 shadow-2xl relative my-8">
            <h2 className="font-serif-luxury text-xl font-bold text-white flex items-center space-x-2">
              <Shield className="text-[#c5a880]" size={20} />
              <span>{editingProduct ? '상품 정보 수정' : '신규 상품 등록'}</span>
            </h2>

            <form onSubmit={handleSaveProduct} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs uppercase tracking-wider text-stone-400 mb-1 font-mono">상품명</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="예: CJ 비비고 수제 프리미엄 왕교자 만두 1.05kg"
                    className="w-full px-3.5 py-2 bg-[#0a0a0c] border border-stone-800 focus:border-[#c5a880] rounded text-sm text-white focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs uppercase tracking-wider text-stone-400 mb-1 font-mono">컬렉션 분류</label>
                  <select
                    value={collection}
                    onChange={(e) => setCollection(e.target.value)}
                    className="w-full px-3.5 py-2 bg-[#0a0a0c] border border-stone-800 focus:border-[#c5a880] rounded text-sm text-white focus:outline-none"
                  >
                    <option value="K-냉동식품">K-냉동식품</option>
                    <option value="K-간편식/HMR">K-간편식/HMR</option>
                    <option value="K-전통식품">K-전통식품</option>
                    <option value="K-주류 & 전통주">K-주류 & 전통주</option>
                    <option value="K-소스/조미료">K-소스/조미료</option>
                    <option value="K-스낵/음료">K-스낵/음료</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs uppercase tracking-wider text-stone-400 mb-1 font-mono">소매 낱개 판매가 (₩)</label>
                  <input
                    type="number"
                    required
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    placeholder="18000"
                    className="w-full px-3.5 py-2 bg-[#0a0a0c] border border-stone-800 focus:border-[#c5a880] rounded text-sm text-white focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs uppercase tracking-wider text-stone-400 mb-1 font-mono">박스당 개수 (입수량)</label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={cartonQty}
                    onChange={(e) => setCartonQty(e.target.value)}
                    placeholder="10"
                    className="w-full px-3.5 py-2 bg-[#0a0a0c] border border-stone-800 focus:border-[#c5a880] rounded text-sm text-white focus:outline-none font-bold text-amber-400"
                  />
                </div>

                <div>
                  <label className="block text-xs uppercase tracking-wider text-stone-400 mb-1 font-mono">도매 할인율 (%)</label>
                  <input
                    type="number"
                    required
                    min="0"
                    max="90"
                    value={wholesaleDiscountRate}
                    onChange={(e) => setWholesaleDiscountRate(e.target.value)}
                    placeholder="15"
                    className="w-full px-3.5 py-2 bg-[#0a0a0c] border border-stone-800 focus:border-[#c5a880] rounded text-sm text-white focus:outline-none font-bold text-emerald-400"
                  />
                </div>
              </div>

              {/* Wholesale Live Calculation Box */}
              <div className="p-3 bg-[#131720] border border-emerald-500/40 rounded-lg flex flex-col sm:flex-row justify-between items-start sm:items-center text-xs gap-2 font-mono">
                <div className="text-stone-300">
                  <span className="text-emerald-400 font-bold">📦 도매 박스 결제액 자동 산출:</span>{' '}
                  (소매가 ₩{Number(price || 0).toLocaleString()}원 × {cartonQty || 10}개입) × {100 - (Number(wholesaleDiscountRate) || 15)}%
                </div>
                <div className="text-[#EAB308] font-bold text-sm">
                  = ₩{Math.round((Number(price || 0) * (Number(cartonQty) || 10) * (100 - (Number(wholesaleDiscountRate) || 15))) / 100).toLocaleString()}원 / Box
                </div>
              </div>

              {/* Main Homepage Display Toggles */}
              <div className="p-3 bg-[#0d0d14] border border-[#c5a880]/30 rounded-lg space-y-2">
                <label className="block text-xs uppercase font-semibold text-[#c5a880] font-mono">
                  메인 페이지 노출 섹션 지정 (Best Sellers & Todays Deals)
                </label>
                <div className="flex flex-wrap gap-6 text-xs text-stone-200 pt-1">
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isTodaysDeal}
                      onChange={(e) => setIsTodaysDeal(e.target.checked)}
                      className="w-4 h-4 rounded text-red-600 focus:ring-red-500 bg-stone-900 border-stone-700"
                    />
                    <span className="font-semibold text-red-400">🔥 오늘의 특가 노출</span>
                  </label>

                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isBestSeller}
                      onChange={(e) => setIsBestSeller(e.target.checked)}
                      className="w-4 h-4 rounded text-amber-500 focus:ring-amber-400 bg-stone-900 border-stone-700"
                    />
                    <span className="font-semibold text-amber-400">⭐ 베스트셀러 노출</span>
                  </label>

                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isFeatured}
                      onChange={(e) => setIsFeatured(e.target.checked)}
                      className="w-4 h-4 rounded text-emerald-500 focus:ring-emerald-400 bg-stone-900 border-stone-700"
                    />
                    <span className="font-semibold text-emerald-400">✨ 메인 추천상품 노출</span>
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-xs uppercase tracking-wider text-stone-400 mb-1 font-mono">상품 이미지 Upload / URL</label>
                <div className="flex space-x-2">
                  <input
                    type="text"
                    value={imageUrl}
                    onChange={(e) => setImageUrl(e.target.value)}
                    placeholder="https://images.unsplash.com/..."
                    className="flex-grow px-3.5 py-2 bg-[#0a0a0c] border border-stone-800 focus:border-[#c5a880] rounded text-sm text-white focus:outline-none"
                  />
                  <label className="px-4 py-2 bg-stone-900 border border-stone-800 text-stone-300 text-xs rounded cursor-pointer flex items-center space-x-1 shrink-0 hover:text-white">
                    <Upload size={14} />
                    <span>{uploading ? '업로드중...' : '이미지 업로드'}</span>
                    <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                  </label>
                </div>
              </div>

              {/* 4 Attributes */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-[#0d0d12] p-3 rounded border border-stone-800">
                <div>
                  <label className="block text-[10px] uppercase font-mono text-stone-400 mb-1">포장 용량</label>
                  <input
                    type="text"
                    value={format}
                    onChange={(e) => setFormat(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-[#0a0a0c] border border-stone-800 rounded text-xs text-white focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] uppercase font-mono text-stone-400 mb-1">제조 공법</label>
                  <input
                    type="text"
                    value={finish}
                    onChange={(e) => setFinish(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-[#0a0a0c] border border-stone-800 rounded text-xs text-white focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] uppercase font-mono text-stone-400 mb-1">맛/원재료 특성</label>
                  <input
                    type="text"
                    value={color}
                    onChange={(e) => setColor(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-[#0a0a0c] border border-stone-800 rounded text-xs text-white focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] uppercase font-mono text-stone-400 mb-1">인증 / 사양</label>
                  <input
                    type="text"
                    value={look}
                    onChange={(e) => setLook(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-[#0a0a0c] border border-stone-800 rounded text-xs text-white focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs uppercase tracking-wider text-stone-400 mb-1 font-mono">상품 설명</label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="상품의 특징, 원재료 및 조리법 안내..."
                  className="w-full px-3.5 py-2 bg-[#0a0a0c] border border-stone-800 focus:border-[#c5a880] rounded text-sm text-white focus:outline-none resize-none"
                />
              </div>

              <div className="flex space-x-3 pt-4 border-t border-stone-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="w-1/2 py-2.5 bg-stone-800 text-stone-300 rounded text-xs hover:bg-stone-700"
                >
                  취소
                </button>
                <button
                  type="submit"
                  className="w-1/2 py-2.5 bg-[#c5a880] text-black font-semibold rounded text-xs shadow-lg hover:bg-[#d6b991]"
                >
                  저장하기
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

