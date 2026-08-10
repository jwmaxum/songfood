import fs from 'fs';
import path from 'path';
import { MenuItem, ReorderItemPayload } from './types';

const DATA_PATH = path.join(process.cwd(), 'data', 'menus.json');

// Anatolia 실제 사이트 Header & Footer 메뉴 데이터 (404 방지 & 스크린샷 1:1 반영)
const INITIAL_MENUS: MenuItem[] = [
  // Header Menus (Depth 1)
  {
    id: 'menu-hdr-all',
    title: 'ALL',
    url: '/collections',
    parent_id: null,
    sort_order: 0,
    is_active: true,
    position: 'header',
  },
  {
    id: 'menu-hdr-1',
    title: 'K-냉동식품',
    url: '/collections?cat=fresh',
    parent_id: null,
    sort_order: 1,
    is_active: true,
    position: 'header',
    badge: 'HOT',
  },
  {
    id: 'menu-hdr-2',
    title: 'K-전통식품',
    url: '/collections?cat=traditional',
    parent_id: null,
    sort_order: 2,
    is_active: true,
    position: 'header',
  },
  {
    id: 'menu-hdr-3',
    title: 'K-간편식/HMR',
    url: '/collections?cat=pantry',
    parent_id: null,
    sort_order: 3,
    is_active: true,
    position: 'header',
  },
  {
    id: 'menu-hdr-4',
    title: 'K-소스/조미료',
    url: '/collections?cat=sauce',
    parent_id: null,
    sort_order: 4,
    is_active: true,
    position: 'header',
  },
  {
    id: 'menu-hdr-5',
    title: 'K-주류 & 전통주',
    url: '/collections?cat=dairy',
    parent_id: null,
    sort_order: 5,
    is_active: true,
    position: 'header',
    badge: 'PREMIUM',
  },
  {
    id: 'menu-hdr-6',
    title: 'K-스낵/음료',
    url: '/collections?cat=snack',
    parent_id: null,
    sort_order: 6,
    is_active: true,
    position: 'header',
  },
  {
    id: 'menu-hdr-7',
    title: '오늘의 특가',
    url: '/collections?cat=deals',
    parent_id: null,
    sort_order: 7,
    is_active: true,
    position: 'header',
    badge: 'SALE',
  },
  {
    id: 'menu-hdr-8',
    title: '베스트셀러',
    url: '/shop',
    parent_id: null,
    sort_order: 8,
    is_active: true,
    position: 'header',
  },
  {
    id: 'menu-hdr-9',
    title: '미디어랩 (Media Lab)',
    url: '/journal',
    parent_id: null,
    sort_order: 9,
    is_active: true,
    position: 'header',
  },
  {
    id: 'menu-sub-media-1',
    title: '뉴스&이벤트 (News&Events)',
    url: '/journal',
    parent_id: 'menu-hdr-9',
    sort_order: 1,
    is_active: true,
    position: 'header',
  },
  {
    id: 'menu-sub-media-2',
    title: '자료실 (Catalogues)',
    url: '/catalogues',
    parent_id: 'menu-hdr-9',
    sort_order: 2,
    is_active: true,
    position: 'header',
  },

  // K-냉동식품 Sub-Menus (Depth 2)
  {
    id: 'menu-sub-1',
    title: 'CJ 비비고 왕교자 만두',
    url: '/collections?cat=fresh#mandu',
    parent_id: 'menu-hdr-1',
    sort_order: 1,
    is_active: true,
    position: 'header',
  },
  {
    id: 'menu-sub-2',
    title: 'K-수제 떡볶이 & 밀키트',
    url: '/collections?cat=fresh#tteok',
    parent_id: 'menu-hdr-1',
    sort_order: 2,
    is_active: true,
    position: 'header',
  },
  {
    id: 'menu-sub-3',
    title: '크리스피 양념 & 간장치킨',
    url: '/collections?cat=fresh#chicken',
    parent_id: 'menu-hdr-1',
    sort_order: 3,
    is_active: true,
    position: 'header',
  },

  // K-주류 Sub-Menus (Depth 2)
  {
    id: 'menu-sub-4',
    title: '원소주 & 증류식 소주',
    url: '/collections?cat=dairy#soju',
    parent_id: 'menu-hdr-2',
    sort_order: 1,
    is_active: true,
    position: 'header',
  },
  {
    id: 'menu-sub-5',
    title: '느린마을 생막걸리 & 탁주',
    url: '/collections?cat=dairy#makgeolli',
    parent_id: 'menu-hdr-2',
    sort_order: 2,
    is_active: true,
    position: 'header',
  },
  {
    id: 'menu-sub-6',
    title: '참이슬 후레쉬 & 하이트 맥주',
    url: '/collections?cat=dairy#beer',
    parent_id: 'menu-hdr-2',
    sort_order: 3,
    is_active: true,
    position: 'header',
  },

  // Footer Menus (Depth 1)
  {
    id: 'menu-ftr-1',
    title: 'K-FOOD & LIQUOR 소개',
    url: '/about',
    parent_id: null,
    sort_order: 1,
    is_active: true,
    position: 'footer',
  },
  {
    id: 'menu-ftr-2',
    title: 'K-냉동식품 컬렉션',
    url: '/collections',
    parent_id: null,
    sort_order: 2,
    is_active: true,
    position: 'footer',
  },
  {
    id: 'menu-ftr-3',
    title: '해외 수출 & B2B 문의',
    url: '/global',
    parent_id: null,
    sort_order: 3,
    is_active: true,
    position: 'footer',
  },
  {
    id: 'menu-ftr-4',
    title: '고객 센터 & 문의',
    url: '/contact',
    parent_id: null,
    sort_order: 4,
    is_active: true,
    position: 'footer',
  },
  {
    id: 'menu-ftr-5',
    title: '24시간 에어 냉장배송 안내',
    url: '/checkout',
    parent_id: null,
    sort_order: 5,
    is_active: true,
    position: 'footer',
  },
  {
    id: 'menu-ftr-6',
    title: '개인정보 처리방침',
    url: '/privacy',
    parent_id: null,
    sort_order: 6,
    is_active: true,
    position: 'footer',
  },
  {
    id: 'menu-ftr-7',
    title: '이용약관',
    url: '/terms',
    parent_id: null,
    sort_order: 7,
    is_active: true,
    position: 'footer',
  },
];

// Helper to ensure data folder & file exist with initial data fallback
function ensureDataFile(): MenuItem[] {
  if (!fs.existsSync(path.dirname(DATA_PATH))) {
    fs.mkdirSync(path.dirname(DATA_PATH), { recursive: true });
  }

  if (!fs.existsSync(DATA_PATH)) {
    saveMenusData(INITIAL_MENUS);
    return INITIAL_MENUS;
  }

  try {
    const fileData = fs.readFileSync(DATA_PATH, 'utf-8');
    const parsed = JSON.parse(fileData) as MenuItem[];
    if (!parsed || parsed.length === 0) {
      saveMenusData(INITIAL_MENUS);
      return INITIAL_MENUS;
    }
    return parsed;
  } catch (error) {
    console.error('Error reading menus.json:', error);
    saveMenusData(INITIAL_MENUS);
    return INITIAL_MENUS;
  }
}

function saveMenusData(items: MenuItem[]) {
  if (!fs.existsSync(path.dirname(DATA_PATH))) {
    fs.mkdirSync(path.dirname(DATA_PATH), { recursive: true });
  }
  fs.writeFileSync(DATA_PATH, JSON.stringify(items, null, 2), 'utf-8');
}

/**
 * Get raw menus array from database
 */
export async function getRawMenus(): Promise<MenuItem[]> {
  return ensureDataFile();
}

/**
 * Build 2-Depth menu tree for RSC (Header / Footer) filtering only `is_active === true`
 */
export async function getActiveMenusTree(position?: 'header' | 'footer'): Promise<MenuItem[]> {
  const allMenus = await getRawMenus();

  // Filter only active items
  let activeMenus = allMenus.filter((m) => m.is_active);

  if (position) {
    activeMenus = activeMenus.filter((m) => m.position === position || m.position === 'both');
  }

  // Separate Depth 1 (parent_id null) and Depth 2 (has parent_id)
  const depth1 = activeMenus
    .filter((m) => !m.parent_id)
    .sort((a, b) => a.sort_order - b.sort_order);

  const depth2 = activeMenus.filter((m) => m.parent_id);

  // Nest depth 2 into depth 1
  return depth1.map((parent) => {
    const children = depth2
      .filter((child) => child.parent_id === parent.id)
      .sort((a, b) => a.sort_order - b.sort_order);

    return {
      ...parent,
      children: children.length > 0 ? children : undefined,
    };
  });
}

/**
 * Build 2-Depth menu tree for Admin Manager (Includes inactive items)
 */
export async function getAllMenusTree(): Promise<MenuItem[]> {
  const allMenus = await getRawMenus();

  const depth1 = allMenus
    .filter((m) => !m.parent_id)
    .sort((a, b) => a.sort_order - b.sort_order);

  const depth2 = allMenus.filter((m) => m.parent_id);

  return depth1.map((parent) => {
    const children = depth2
      .filter((child) => child.parent_id === parent.id)
      .sort((a, b) => a.sort_order - b.sort_order);

    return {
      ...parent,
      children: children.length > 0 ? children : [],
    };
  });
}

/**
 * Toggle menu is_active status
 */
export async function toggleMenuStatus(id: string, is_active: boolean): Promise<boolean> {
  const allMenus = await getRawMenus();
  const index = allMenus.findIndex((m) => m.id === id);
  if (index === -1) return false;

  allMenus[index].is_active = is_active;
  saveMenusData(allMenus);
  return true;
}

/**
 * Reorder menus (update sort_order for list of items)
 */
export async function reorderMenus(payload: ReorderItemPayload[]): Promise<boolean> {
  const allMenus = await getRawMenus();

  const updateMap = new Map<string, ReorderItemPayload>();
  payload.forEach((item) => updateMap.set(item.id, item));

  const updatedMenus = allMenus.map((menu) => {
    if (updateMap.has(menu.id)) {
      const p = updateMap.get(menu.id)!;
      return {
        ...menu,
        sort_order: p.sort_order,
        ...(p.parent_id !== undefined ? { parent_id: p.parent_id } : {}),
      };
    }
    return menu;
  });

  saveMenusData(updatedMenus);
  return true;
}

/**
 * Add a new menu item
 */
export async function createMenuItem(item: Omit<MenuItem, 'id'>): Promise<MenuItem> {
  const allMenus = await getRawMenus();
  const newId = `menu-${Date.now()}`;
  const newItem: MenuItem = {
    ...item,
    id: newId,
  };

  allMenus.push(newItem);
  saveMenusData(allMenus);
  return newItem;
}

/**
 * Delete a menu item and its children
 */
export async function deleteMenuItem(id: string): Promise<boolean> {
  let allMenus = await getRawMenus();
  // Delete target item and any children with parent_id === id
  allMenus = allMenus.filter((m) => m.id !== id && m.parent_id !== id);
  saveMenusData(allMenus);
  return true;
}
