'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { UserProfile, Order, ShippingAddress } from '@/lib/types';

interface AuthContextType {
  user: UserProfile | null;
  orders: Order[];
  isLoggedIn: boolean;
  login: (email: string, pass: string) => { success: boolean; message: string };
  signup: (name: string, email: string, pass: string) => { success: boolean; message: string };
  logout: () => void;
  updateProfile: (updatedData: Partial<UserProfile>) => void;
  addOrder: (order: Order) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const DEMO_USER: UserProfile = {
  id: 'usr-demo-001',
  email: 'buyer@songyoungminfood.com',
  name: '김도매 사장님',
  phone: '010-3819-2049',
  company: '(주)송영민푸드 식자재 도매 파트너',
  addresses: [
    {
      id: 'addr-1',
      title: '도매 물류 창고',
      fullName: '김도매',
      phone: '010-3819-2049',
      addressLine1: '서울특별시 강남구 테헤란로 427',
      addressLine2: '송영민푸드 빌딩 12층',
      city: '서울특별시',
      postalCode: '06159',
      country: '대한민국 (South Korea)',
      isDefault: true,
    },
  ],
};

const INITIAL_ORDERS: Order[] = [
  {
    id: 'ORD-2026-991201',
    createdAt: '2026-08-08',
    status: 'PAID',
    items: [
      {
        productId: 'prod-kimchi',
        name: '송영민 명인 100% 한옥 전통 포기김치 5kg',
        price: 32000,
        quantity: 2,
        image_url: 'https://images.unsplash.com/photo-1583032015879-e5022cb87c3b?auto=format&fit=crop&w=400&q=80',
        format: '5kg 캔/팩 개별포장',
      },
      {
        productId: 'prod-1',
        name: '프리미엄 곤드레 한우 사골 만두 (1kg)',
        price: 18000,
        quantity: 3,
        image_url: 'https://images.unsplash.com/photo-1541696432-82c6da8ce7bf?auto=format&fit=crop&w=400&q=80',
        format: '1kg 냉동 멀티팩',
      },
    ],
    subtotal: 118000,
    discount: 0,
    shipping: 0,
    total: 118000,
    shippingAddress: DEMO_USER.addresses![0],
    paymentMethod: 'toss_payments',
    tossPaymentKey: 'toss_pk_20260808_991201',
    tossMethod: '토스페이 (TossPay 1초 결제)',
    carrier: 'CJ대한통운',
    trackingNumber: '68301928301',
  },
  {
    id: 'ORD-2026-784019',
    createdAt: '2026-08-01',
    status: 'Shipped',
    items: [
      {
        productId: 'prod-3',
        name: '궁중 명품 떡갈비 HMR 세트 (600g)',
        price: 24000,
        quantity: 4,
        image_url: 'https://images.unsplash.com/photo-1529042410759-befb1204b468?auto=format&fit=crop&w=400&q=80',
        format: '600g 냉동 선물세트',
      },
    ],
    subtotal: 96000,
    discount: 10000,
    shipping: 0,
    total: 86000,
    shippingAddress: DEMO_USER.addresses![0],
    paymentMethod: 'toss_payments',
    tossPaymentKey: 'toss_pk_20260801_784019',
    tossMethod: '신용카드 (현대/삼성)',
    carrier: '로젠택배',
    trackingNumber: '98201948201',
  },
];

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [orders, setOrders] = useState<Order[]>(INITIAL_ORDERS);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    try {
      const savedUser = localStorage.getItem('anatolia_user');
      const savedOrders = localStorage.getItem('anatolia_orders');
      if (savedUser) {
        setUser(JSON.parse(savedUser));
      } else {
        // Default to demo user for easy testing if desired
        setUser(DEMO_USER);
      }

      if (savedOrders) {
        setOrders(JSON.parse(savedOrders));
      }
    } catch (e) {
      console.error('Failed to parse auth state', e);
    } finally {
      setIsInitialized(true);
    }
  }, []);

  useEffect(() => {
    if (!isInitialized) return;
    try {
      if (user) {
        localStorage.setItem('anatolia_user', JSON.stringify(user));
      } else {
        localStorage.removeItem('anatolia_user');
      }
      localStorage.setItem('anatolia_orders', JSON.stringify(orders));
    } catch (e) {
      console.error('Failed to persist auth state', e);
    }
  }, [user, orders, isInitialized]);

  const login = (email: string, pass: string) => {
    if (!email || !pass) {
      return { success: false, message: 'Please enter both email and password.' };
    }
    // Demo login check
    const newUser: UserProfile = {
      id: 'usr-' + Math.random().toString(36).substr(2, 9),
      email: email.trim().toLowerCase(),
      name: email.split('@')[0].replace('.', ' ').toUpperCase(),
      addresses: DEMO_USER.addresses,
    };
    setUser(newUser);
    return { success: true, message: 'Welcome back!' };
  };

  const signup = (name: string, email: string, pass: string) => {
    if (!name || !email || !pass) {
      return { success: false, message: 'Please fill out all required fields.' };
    }
    const newUser: UserProfile = {
      id: 'usr-' + Math.random().toString(36).substr(2, 9),
      email: email.trim().toLowerCase(),
      name: name.trim(),
      addresses: [],
    };
    setUser(newUser);
    return { success: true, message: 'Account created successfully!' };
  };

  const logout = () => {
    setUser(null);
  };

  const updateProfile = (updatedData: Partial<UserProfile>) => {
    setUser((prev) => (prev ? { ...prev, ...updatedData } : null));
  };

  const addOrder = (newOrder: Order) => {
    setOrders((prev) => [newOrder, ...prev]);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        orders,
        isLoggedIn: !!user,
        login,
        signup,
        logout,
        updateProfile,
        addOrder,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
