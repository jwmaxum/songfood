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
  const [boxPrice, setBoxPrice] = useState('324000');
  const [boxQty, setBoxQty] = useState('20');
  const [cartonPrice, setCartonPrice] = useState('1440000');
  const [cartonBoxQty, setCartonBoxQty] = useState('5');
  const [originalPrice, setOriginalPrice] = useState('22000');
  const [format, setFormat] = useState('1.05kg 패밀리팩');
  const [finish, setFinish] = useState('-40°C IQF 급속냉동');
  const [color, setColor] = useState('노릇노릇 바삭함');
  const [look, setLook] = useState('수제 손주름 교자');
  const [imageUrl, setImageUrl] = useState('');
  const [images, setImages] = useState<string[]>(['', '', '', '', '', '']);
  const [description, setDescription] = useState('');
  const [origin, setOrigin] = useState('대한민국');
  const [shelfLife, setShelfLife] = useState('제조일로부터 12개월 (냉동 보관)');
  const [storage, setStorage] = useState('영하 18℃ 이하 냉동 보관');
  const [netWeight, setNetWeight] = useState('1,050g');
  const [certifications, setCertifications] = useState<string[]>(['HACCP', 'ISO']);
  const [isFeatured, setIsFeatured] = useState(true);
  const [isTodaysDeal, setIsTodaysDeal] = useState(false);
  const [isBestSeller, setIsBestSeller] = useState(true);
  const [cartonQty, setCartonQty] = useState('10');
  const [wholesaleDiscountRate, setWholesaleDiscountRate] = useState('15');

  const ALL_CERTIFICATIONS = ['HACCP', 'Halal', 'FSSC 22000', 'ISO', 'Vegan', 'Gluten Free'];
  const CATEGORY_OPTIONS = [
    '만두 & 교자',
    '김치 & 발효식품',
    '떡볶이 & 밀키트',
    '치킨 & 안주',
    '소스 & 양념',
    '증류식 소주',
    '막걸리 & 탁주',
    '과자 & 스낵',
    '기타',
  ];

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
    setBoxPrice('324000');
    setBoxQty('20');
    setCartonPrice('1440000');
    setCartonBoxQty('5');
    setOriginalPrice('22000');
    setCartonQty('10');
    setWholesaleDiscountRate('15');
    setFormat('1.05kg 패밀리팩');
    setFinish('-40°C IQF 급속냉동');
    setColor('노릇노릇 바삭함');
    setLook('수제 손주름 교자');
    setImageUrl('');
    setImages(['', '', '', '', '', '']);
    setDescription('');
    setOrigin('대한민국');
    setShelfLife('제조일로부터 12개월 (냉동 보관)');
    setStorage('영하 18℃ 이하 냉동 보관');
    setNetWeight('1,050g');
    setCertifications(['HACCP', 'FSSC 22000', 'ISO']);
    setIsFeatured(true);
    setIsTodaysDeal(false);
    setIsBestSeller(true);
    setIsModalOpen(true);
  };

  const openEditModal = (p: ProductItem) => {
    setEditingProduct(p);
    setName(p.name);
    setCollection(p.collection);
    setCategory(p.category || '만두 & 교자');
    setPrice(String(p.price || 18000));
    setBoxPrice(String(p.box_price || Math.round((p.price || 18000) * (p.box_qty || 20) * 0.9)));
    setBoxQty(String(p.box_qty || 20));
    setCartonPrice(String(p.carton_price || Math.round((p.price || 18000) * (p.carton_box_qty || 5) * (p.box_qty || 20) * 0.8)));
    setCartonBoxQty(String(p.carton_box_qty || 5));
    setOriginalPrice(p.original_price ? String(p.original_price) : '');
    setCartonQty(String(p.carton_qty || 10));
    setWholesaleDiscountRate(String(Math.round((p.wholesale_discount_rate ?? 0.15) * 100)));
    setFormat(p.format);
    setFinish(p.finish);
    setColor(p.color);
    setLook(p.look);
    setImageUrl(p.image_url || '');
    
    // Fill up to 6 images
    const currentImgs = p.images && p.images.length > 0 ? [...p.images] : [p.image_url || ''];
    while (currentImgs.length < 6) {
      currentImgs.push('');
    }
    setImages(currentImgs.slice(0, 6));

    setDescription(p.description || '');
    setOrigin(p.origin || '대한민국');
    setShelfLife(p.shelf_life || '제조일로부터 12개월 (냉동 보관)');
    setStorage(p.storage || '영하 18℃ 이하 냉동 보관');
    setNetWeight(p.net_weight || '1,050g');
    setCertifications(p.certifications || ['HACCP', 'ISO']);
    setIsFeatured(p.is_featured ?? true);
    setIsTodaysDeal(p.is_todays_deal ?? false);
    setIsBestSeller(p.is_best_seller ?? false);
    setIsModalOpen(true);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, index?: number) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('/api/upload', { method: 'POST', body: formData });
      const data = await res.json();
      if (data.success) {
        const uploadedUrl = data.url;
        if (typeof index === 'number') {
          const newImgs = [...images];
          newImgs[index] = uploadedUrl;
          setImages(newImgs);
          if (index === 0) setImageUrl(uploadedUrl);
        } else {
          setImageUrl(uploadedUrl);
        }
        showToast('이미지가 성공적으로 업로드되었습니다!');
      } else {
        alert(data.error || '업로드에 실패했습니다.');
      }
    } catch {
      const localUrl = URL.createObjectURL(file);
      if (typeof index === 'number') {
        const newImgs = [...images];
        newImgs[index] = localUrl;
        setImages(newImgs);
        if (index === 0) setImageUrl(localUrl);
      } else {
        setImageUrl(localUrl);
      }
      showToast('이미지가 로컬 첨부되었습니다!');
    } finally {
      setUploading(false);
    }
  };

  const toggleCert = (cert: string) => {
    if (certifications.includes(cert)) {
      setCertifications(certifications.filter((c) => c !== cert));
    } else {
      setCertifications([...certifications, cert]);
    }
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return alert('상품명을 입력해주세요.');

    const numericPrice = Number(price) || 0;
    const numericBoxPrice = Number(boxPrice) || Math.round(numericPrice * Number(boxQty || 20) * 0.9);
    const numericBoxQty = Number(boxQty) || 20;
    const numericCartonPrice = Number(cartonPrice) || Math.round(numericPrice * Number(cartonBoxQty || 5) * numericBoxQty * 0.8);
    const numericCartonBoxQty = Number(cartonBoxQty) || 5;

    const numericOriginalPrice = originalPrice ? Number(originalPrice) : null;
    const numericCartonQty = Number(cartonQty) || 10;
    const numericDiscountPercent = Number(wholesaleDiscountRate) || 15;
    const discountRateDecimal = numericDiscountPercent / 100;
    
    // Filter non-empty gallery images
    const validImages = images.filter((img) => img && img.trim().length > 0);
    const mainImg = validImages[0] || imageUrl || 'https://images.unsplash.com/photo-1541696432-82c6da8ce7bf?auto=format&fit=crop&w=800&q=80';

    const newOrUpdated: ProductItem = {
      id: editingProduct ? editingProduct.id : `prod-${Date.now()}`,
      name,
      collection,
      category,
      price: numericPrice,
      box_price: numericBoxPrice,
      box_qty: numericBoxQty,
      carton_price: numericCartonPrice,
      carton_box_qty: numericCartonBoxQty,
      original_price: numericOriginalPrice,
      carton_qty: numericCartonQty,
      wholesale_discount_rate: discountRateDecimal,
      wholesale_price_krw: numericBoxPrice,
      format,
      finish,
      color,
      look,
      image_url: mainImg,
      images: validImages.length > 0 ? validImages : [mainImg],
      description,
      origin,
      shelf_life: shelfLife,
      storage: storage,
      net_weight: netWeight,
      certifications: certifications,
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
          {filteredProducts.map((p, idx) => {
            const eaPrice = p.price || 10000;
            const boxQty = p.carton_qty || 10;
            const boxOriginalPrice = p.original_price ? p.original_price * boxQty : eaPrice * boxQty;
            const boxDiscountedPrice = p.wholesale_price_krw || Math.round(eaPrice * boxQty * 0.85);

            return (
              <div
                key={p.id}
                className="bg-[#111118] border border-stone-800 rounded-xl overflow-hidden shadow-xl flex flex-col justify-between group hover:border-[#c5a880]/60 transition-all duration-300"
              >
                <div>
                  {/* Product Image Header */}
                  <div className="h-48 relative bg-stone-900 overflow-hidden">
                    <img
                      src={p.image_url || 'https://images.unsplash.com/photo-1541696432-82c6da8ce7bf?auto=format&fit=crop&w=800&q=80'}
                      alt={p.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    
                    {/* Top Badges matching user screenshot */}
                    <div className="absolute top-3 left-3 flex flex-wrap gap-1.5 max-w-[80%]">
                      {p.is_best_seller && (
                        <span className="bg-[#14532D] text-[#e6f4ea] border border-emerald-500/50 text-[11px] font-extrabold px-2.5 py-0.5 rounded shadow">
                          #{idx + 1} Best
                        </span>
                      )}
                      <span className="bg-[#0a0a0c]/90 backdrop-blur border border-stone-700 text-[#c5a880] text-[10px] font-mono uppercase font-bold px-2 py-0.5 rounded">
                        {p.collection}
                      </span>
                      {p.is_todays_deal && (
                        <span className="bg-red-900/90 text-white text-[10px] font-bold px-2 py-0.5 rounded shadow">
                          🔥 핫딜
                        </span>
                      )}
                    </div>

                    <div className="absolute top-3 right-3 bg-black/80 backdrop-blur px-2.5 py-1 rounded text-xs font-bold text-[#c5a880] font-mono border border-stone-800">
                      ₩{eaPrice.toLocaleString()}원
                    </div>
                  </div>

                  {/* Info Content */}
                  <div className="p-5 space-y-3">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-stone-400 font-mono text-[11px]">
                        📍 {p.origin || '대한민국 (Korea)'}
                      </span>
                      <div className="flex items-center space-x-1 text-amber-400">
                        <Star size={13} className="fill-amber-400" />
                        <span className="font-bold text-xs">{p.rating || 4.9}</span>
                        <span className="text-stone-500 font-mono text-[10px]">({p.reviews_count || 12}개 후기)</span>
                      </div>
                    </div>

                    <h3 className="font-bold text-sm text-white line-clamp-2 leading-snug group-hover:text-[#c5a880] transition-colors">
                      {p.name}
                    </h3>

                    {/* Dual Pricing Box matching user screenshot */}
                    <div className="bg-[#080b09] border border-emerald-900/40 p-3 rounded-lg space-y-1.5 font-mono text-xs">
                      <div className="flex justify-between items-center text-stone-300">
                        <span>소량 개별가:</span>
                        <span className="text-[#c5a880] font-bold">₩{eaPrice.toLocaleString()}원</span>
                      </div>
                      <div className="flex justify-between items-center text-emerald-400">
                        <span className="flex items-center space-x-1 text-[11px]">
                          <span>📦 대용량 ({boxQty}개):</span>
                          {boxOriginalPrice > boxDiscountedPrice && (
                            <span className="text-stone-500 line-through text-[10px]">
                              ₩{boxOriginalPrice.toLocaleString()}원
                            </span>
                          )}
                        </span>
                        <span className="font-extrabold text-[#EAB308]">
                          ₩{boxDiscountedPrice.toLocaleString()}원
                        </span>
                      </div>
                    </div>

                    <div className="flex justify-between items-center text-[10px] text-stone-400 font-mono pt-1">
                      <span>HS: {p.hs_code || '1902.20'}</span>
                      <span className="text-emerald-400">수출 FOB: ${p.export_price_usd || 7.5} USD</span>
                    </div>
                  </div>
                </div>

                {/* Footer Controls & Quick Toggles */}
                <div className="p-4 bg-[#0a0a0c] border-t border-stone-800 space-y-3">
                  <div className="flex items-center justify-between text-[11px] font-mono">
                    <button
                      type="button"
                      onClick={async () => {
                        const updated = { ...p, is_best_seller: !p.is_best_seller };
                        setProducts((prev) => prev.map((item) => (item.id === p.id ? updated : item)));
                        if (isSupabaseConfigured()) await supabase.from('products').upsert(updated);
                      }}
                      className={`px-2.5 py-1 rounded text-[10px] font-bold border transition-colors ${
                        p.is_best_seller
                          ? 'bg-amber-950 text-amber-300 border-amber-500/50'
                          : 'bg-stone-900 text-stone-500 border-stone-800'
                      }`}
                    >
                      {p.is_best_seller ? '★ 베스트셀러 노출중' : '☆ 베스트셀러 지정'}
                    </button>

                    <button
                      type="button"
                      onClick={async () => {
                        const updated = { ...p, is_todays_deal: !p.is_todays_deal };
                        setProducts((prev) => prev.map((item) => (item.id === p.id ? updated : item)));
                        if (isSupabaseConfigured()) await supabase.from('products').upsert(updated);
                      }}
                      className={`px-2.5 py-1 rounded text-[10px] font-bold border transition-colors ${
                        p.is_todays_deal
                          ? 'bg-red-950 text-red-300 border-red-500/50'
                          : 'bg-stone-900 text-stone-500 border-stone-800'
                      }`}
                    >
                      {p.is_todays_deal ? '🔥 핫딜 노출중' : '❄️ 일반 상품'}
                    </button>
                  </div>

                  <div className="flex items-center justify-end space-x-2 pt-1">
                    <button
                      onClick={() => openEditModal(p)}
                      className="flex-1 py-1.5 bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-semibold rounded transition-colors flex items-center justify-center space-x-1"
                    >
                      <Edit2 size={13} />
                      <span>수정</span>
                    </button>
                    <button
                      onClick={() => handleDelete(p.id)}
                      className="px-3 py-1.5 bg-red-950/60 hover:bg-red-900 text-red-400 hover:text-white border border-red-800/40 text-xs font-semibold rounded transition-colors flex items-center space-x-1"
                    >
                      <Trash2 size={13} />
                      <span>삭제</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal Form */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-[#111118] border border-stone-800 rounded-xl max-w-3xl w-full p-6 space-y-5 shadow-2xl relative my-8 max-h-[90vh] overflow-y-auto">
            <h2 className="font-serif-luxury text-xl font-bold text-white flex items-center space-x-2 border-b border-stone-800 pb-3">
              <Shield className="text-[#c5a880]" size={20} />
              <span>{editingProduct ? '상품 정보 수정' : '신규 상품 등록'}</span>
            </h2>

            <form onSubmit={handleSaveProduct} className="space-y-4 text-xs">
              {/* Category & Collection */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-1">
                  <label className="block uppercase tracking-wider text-stone-400 mb-1 font-mono font-semibold">
                    카테고리 선정 (Category)
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-3.5 py-2 bg-[#0a0a0c] border border-stone-800 focus:border-[#c5a880] rounded text-white focus:outline-none"
                  >
                    {CATEGORY_OPTIONS.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="md:col-span-1">
                  <label className="block uppercase tracking-wider text-stone-400 mb-1 font-mono font-semibold">
                    컬렉션 분류 (Collection)
                  </label>
                  <select
                    value={collection}
                    onChange={(e) => setCollection(e.target.value)}
                    className="w-full px-3.5 py-2 bg-[#0a0a0c] border border-stone-800 focus:border-[#c5a880] rounded text-white focus:outline-none"
                  >
                    <option value="K-냉동식품">K-냉동식품</option>
                    <option value="K-간편식/HMR">K-간편식/HMR</option>
                    <option value="K-전통식품">K-전통식품</option>
                    <option value="K-주류 & 전통주">K-주류 & 전통주</option>
                    <option value="K-소스/조미료">K-소스/조미료</option>
                    <option value="K-스낵/음료">K-스낵/음료</option>
                  </select>
                </div>

                <div className="md:col-span-1">
                  <label className="block uppercase tracking-wider text-stone-400 mb-1 font-mono font-semibold">
                    상품명
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="예: CJ 비비고 수제 왕교자 만두 1.05kg"
                    className="w-full px-3.5 py-2 bg-[#0a0a0c] border border-stone-800 focus:border-[#c5a880] rounded text-white focus:outline-none"
                  />
                </div>
              </div>

              {/* 3-Tier Prices Input Box */}
              <div className="p-4 bg-[#141816] border border-emerald-800/40 rounded-xl space-y-3">
                <div className="text-emerald-400 font-bold font-mono text-xs flex items-center space-x-1.5">
                  <Package size={14} />
                  <span>3-Tier 구매포장 단위별 판매가격 설정 (개당 / 박스 / 카톤)</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {/* Tier 1: EA */}
                  <div className="p-3 bg-[#0a0a0c] border border-stone-800 rounded-lg space-y-1.5">
                    <span className="text-[#c5a880] font-bold block">1. 낱개(EA) 구매가격</span>
                    <div className="flex items-center space-x-1">
                      <span className="text-stone-400 text-xs">₩</span>
                      <input
                        type="number"
                        required
                        value={price}
                        onChange={(e) => setPrice(e.target.value)}
                        placeholder="18000"
                        className="w-full bg-stone-900 border border-stone-700 rounded px-2 py-1 text-white text-xs font-mono font-bold"
                      />
                      <span className="text-stone-400 text-xs">원</span>
                    </div>
                    <span className="text-[10px] text-stone-500 block font-mono">단위: 1개 (EA)</span>
                  </div>

                  {/* Tier 2: Box */}
                  <div className="p-3 bg-[#0a0a0c] border border-amber-900/40 rounded-lg space-y-1.5">
                    <span className="text-amber-400 font-bold block">2. 박스(Box) 구매가격</span>
                    <div className="flex items-center space-x-1">
                      <span className="text-stone-400 text-xs">₩</span>
                      <input
                        type="number"
                        value={boxPrice}
                        onChange={(e) => setBoxPrice(e.target.value)}
                        placeholder="324000"
                        className="w-full bg-stone-900 border border-stone-700 rounded px-2 py-1 text-amber-300 text-xs font-mono font-bold"
                      />
                      <span className="text-stone-400 text-xs">원</span>
                    </div>
                    <div className="flex items-center space-x-1 text-[10px] text-stone-400 font-mono">
                      <span>박스당 입수:</span>
                      <input
                        type="number"
                        value={boxQty}
                        onChange={(e) => setBoxQty(e.target.value)}
                        className="w-12 bg-stone-900 border border-stone-800 rounded px-1 text-white text-center"
                      />
                      <span>개입</span>
                    </div>
                  </div>

                  {/* Tier 3: Carton */}
                  <div className="p-3 bg-[#0a0a0c] border border-emerald-900/40 rounded-lg space-y-1.5">
                    <span className="text-emerald-400 font-bold block">3. 카톤(Carton) 구매가격</span>
                    <div className="flex items-center space-x-1">
                      <span className="text-stone-400 text-xs">₩</span>
                      <input
                        type="number"
                        value={cartonPrice}
                        onChange={(e) => setCartonPrice(e.target.value)}
                        placeholder="1440000"
                        className="w-full bg-stone-900 border border-stone-700 rounded px-2 py-1 text-emerald-300 text-xs font-mono font-bold"
                      />
                      <span className="text-stone-400 text-xs">원</span>
                    </div>
                    <div className="flex items-center space-x-1 text-[10px] text-stone-400 font-mono">
                      <span>카톤당 박스:</span>
                      <input
                        type="number"
                        value={cartonBoxQty}
                        onChange={(e) => setCartonBoxQty(e.target.value)}
                        className="w-12 bg-stone-900 border border-stone-800 rounded px-1 text-white text-center"
                      />
                      <span>박스 ({Number(cartonBoxQty || 5) * Number(boxQty || 20)}개입)</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* 6 Gallery Images Upload UI */}
              <div className="p-4 bg-[#0d0d12] border border-stone-800 rounded-xl space-y-3">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-[#c5a880] font-bold font-mono">
                    📷 상품 갤러리 이미지 등록 (최대 6개 / 첫번째가 대표 썸네일)
                  </span>
                  <span className="text-stone-500 text-[10px]">클릭 시 큰 썸네일 미리보기 지원</span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
                  {images.map((imgUrl, idx) => (
                    <div key={idx} className="space-y-1 bg-[#121218] p-2 rounded border border-stone-800 text-center">
                      <div className="h-16 w-full bg-stone-950 rounded overflow-hidden relative border border-stone-800">
                        {imgUrl ? (
                          <img src={imgUrl} alt={`Thumb ${idx + 1}`} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-[10px] text-stone-600 font-mono">
                            {idx === 0 ? '대표 썸네일' : `이미지 ${idx + 1}`}
                          </div>
                        )}
                      </div>
                      <input
                        type="text"
                        placeholder={`URL ${idx + 1}`}
                        value={imgUrl}
                        onChange={(e) => {
                          const newImgs = [...images];
                          newImgs[idx] = e.target.value;
                          setImages(newImgs);
                          if (idx === 0) setImageUrl(e.target.value);
                        }}
                        className="w-full bg-black border border-stone-800 rounded text-[10px] px-1 py-0.5 text-stone-300 font-mono truncate"
                      />
                      <label className="block text-[9px] text-[#c5a880] bg-stone-900 hover:bg-stone-800 rounded py-0.5 cursor-pointer">
                        <span>파일 업로드</span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => handleImageUpload(e, idx)}
                          className="hidden"
                        />
                      </label>
                    </div>
                  ))}
                </div>
              </div>

              {/* Specs & Certifications */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="block uppercase tracking-wider text-stone-400 mb-1 font-mono">용량 / 무게</label>
                  <input
                    type="text"
                    value={netWeight}
                    onChange={(e) => setNetWeight(e.target.value)}
                    placeholder="1,050g"
                    className="w-full px-3 py-1.5 bg-[#0a0a0c] border border-stone-800 rounded text-white"
                  />
                </div>

                <div>
                  <label className="block uppercase tracking-wider text-stone-400 mb-1 font-mono">보관 방법</label>
                  <input
                    type="text"
                    value={storage}
                    onChange={(e) => setStorage(e.target.value)}
                    placeholder="영하 18℃ 이하 냉동 보관"
                    className="w-full px-3 py-1.5 bg-[#0a0a0c] border border-stone-800 rounded text-white"
                  />
                </div>

                <div>
                  <label className="block uppercase tracking-wider text-stone-400 mb-1 font-mono">유통 기한</label>
                  <input
                    type="text"
                    value={shelfLife}
                    onChange={(e) => setShelfLife(e.target.value)}
                    placeholder="제조일로부터 12개월"
                    className="w-full px-3 py-1.5 bg-[#0a0a0c] border border-stone-800 rounded text-white"
                  />
                </div>
              </div>

              {/* Certifications Checkboxes */}
              <div className="p-3 bg-[#0a0a0c] border border-stone-800 rounded-lg space-y-2">
                <span className="text-[#c5a880] font-bold font-mono block">
                  🏅 Certifications 인증 선택 (HACCP, Halal, FSSC 22000, ISO, Vegan, Gluten Free)
                </span>
                <div className="flex flex-wrap gap-3 pt-1">
                  {ALL_CERTIFICATIONS.map((cert) => (
                    <label key={cert} className="inline-flex items-center space-x-1.5 text-xs text-stone-300 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={certifications.includes(cert)}
                        onChange={() => toggleCert(cert)}
                        className="accent-[#c5a880]"
                      />
                      <span>{cert}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Product Description */}
              <div>
                <label className="block uppercase tracking-wider text-stone-400 mb-1 font-mono font-semibold">
                  상세 상품 설명
                </label>
                <textarea
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="상품 특징, 조리방법 및 맛 설명..."
                  className="w-full px-3.5 py-2 bg-[#0a0a0c] border border-stone-800 focus:border-[#c5a880] rounded text-white focus:outline-none"
                />
              </div>

              {/* Feature Badges Toggles */}
              <div className="flex flex-wrap gap-4 pt-2 border-t border-stone-800">
                <label className="inline-flex items-center space-x-2 text-xs text-white cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isTodaysDeal}
                    onChange={(e) => setIsTodaysDeal(e.target.checked)}
                    className="accent-red-500"
                  />
                  <span className="text-red-400 font-bold">🔥 오늘의 특가 지정</span>
                </label>

                <label className="inline-flex items-center space-x-2 text-xs text-white cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isBestSeller}
                    onChange={(e) => setIsBestSeller(e.target.checked)}
                    className="accent-amber-500"
                  />
                  <span className="text-amber-400 font-bold">⭐ 베스트셀러 지정</span>
                </label>
              </div>

              {/* Actions */}
              <div className="flex justify-end space-x-3 pt-4 border-t border-stone-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-stone-900 text-stone-400 hover:text-white rounded"
                >
                  취소
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-[#c5a880] hover:bg-[#b59870] text-black font-bold rounded shadow-lg"
                >
                  {editingProduct ? '수정사항 저장' : '신규 상품 등록'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

