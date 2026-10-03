import {cache} from 'react';
import snapshot from '../../data/menus.json';
import { MenuItem, ReorderItemPayload } from './types';
import { deleteCms, insertCms, listCms, updateCms } from './cms-repository';

export const getRawMenus = cache(async (): Promise<MenuItem[]> => {
  return listCms<MenuItem>('menus', snapshot as MenuItem[]);
});

function tree(items: MenuItem[]): MenuItem[] {
  const top = items.filter((item) => !item.parent_id).sort((a, b) => a.sort_order - b.sort_order);
  return top.map((item) => ({ ...item, children: items.filter((child) => child.parent_id === item.id).sort((a, b) => a.sort_order - b.sort_order) }));
}

export async function getActiveMenusTree(position?: 'header' | 'footer'): Promise<MenuItem[]> {
  const items = (await getRawMenus()).filter((item) => item.is_active && (!position || item.position === position || item.position === 'both'));
  return tree(items);
}

export async function getAllMenusTree(): Promise<MenuItem[]> {
  return tree(await getRawMenus());
}

export async function toggleMenuStatus(id: string, is_active: boolean): Promise<boolean> {
  return Boolean(await updateCms<MenuItem>('menus', id, { is_active }));
}

export async function reorderMenus(payload: ReorderItemPayload[]): Promise<boolean> {
  for (const item of payload) {
    const update: Record<string, unknown> = { sort_order: item.sort_order };
    if (item.parent_id !== undefined) update.parent_id = item.parent_id;
    if (!await updateCms<MenuItem>('menus', item.id, update)) return false;
  }
  return true;
}

export async function createMenuItem(item: Omit<MenuItem, 'id'>): Promise<MenuItem> {
  return insertCms<MenuItem>('menus', {
    title: item.title, url: item.url, parent_id: item.parent_id, sort_order: item.sort_order,
    is_active: item.is_active, position: item.position, image_url: item.image_url || null, badge: item.badge || null,
  });
}

export async function deleteMenuItem(id: string): Promise<boolean> {
  return deleteCms('menus', id);
}
