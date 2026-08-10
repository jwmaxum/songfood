'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { MenuItem } from '@/lib/types';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Plus, Trash2, ArrowLeft, Eye, EyeOff, RefreshCw, Layers, CheckCircle2 } from 'lucide-react';

const FALLBACK_RAW_MENUS: MenuItem[] = [
  // Header Menus
  { id: 'menu-hdr-all', title: 'ALL', url: '/collections', parent_id: null, sort_order: 0, is_active: true, position: 'header' },
  { id: 'menu-hdr-1', title: 'K-냉동식품', url: '/collections?cat=fresh', parent_id: null, sort_order: 1, is_active: true, position: 'header', badge: 'HOT' },
  { id: 'menu-hdr-2', title: 'K-전통식품', url: '/collections?cat=traditional', parent_id: null, sort_order: 2, is_active: true, position: 'header' },
  { id: 'menu-hdr-3', title: 'K-간편식/HMR', url: '/collections?cat=pantry', parent_id: null, sort_order: 3, is_active: true, position: 'header' },
  { id: 'menu-hdr-4', title: 'K-소스/조미료', url: '/collections?cat=sauce', parent_id: null, sort_order: 4, is_active: true, position: 'header' },
  { id: 'menu-hdr-5', title: 'K-주류 & 전통주', url: '/collections?cat=dairy', parent_id: null, sort_order: 5, is_active: true, position: 'header', badge: 'PREMIUM' },
  { id: 'menu-hdr-6', title: 'K-스낵/음료', url: '/collections?cat=snack', parent_id: null, sort_order: 6, is_active: true, position: 'header' },
  { id: 'menu-hdr-7', title: '오늘의 특가', url: '/collections?cat=deals', parent_id: null, sort_order: 7, is_active: true, position: 'header', badge: 'SALE' },
  { id: 'menu-hdr-8', title: '베스트셀러', url: '/shop', parent_id: null, sort_order: 8, is_active: true, position: 'header' },
  { id: 'menu-hdr-9', title: 'K-레시피 & 저널', url: '/journal', parent_id: null, sort_order: 9, is_active: true, position: 'header' },

  // Sub-Menus
  { id: 'menu-sub-1', title: 'CJ 비비고 왕교자 만두', url: '/collections?cat=fresh#mandu', parent_id: 'menu-hdr-1', sort_order: 1, is_active: true, position: 'header' },
  { id: 'menu-sub-2', title: 'K-수제 떡볶이 & 밀키트', url: '/collections?cat=fresh#tteok', parent_id: 'menu-hdr-1', sort_order: 2, is_active: true, position: 'header' },
  { id: 'menu-sub-3', title: '크리스피 양념 & 간장치킨', url: '/collections?cat=fresh#chicken', parent_id: 'menu-hdr-1', sort_order: 3, is_active: true, position: 'header' },
  { id: 'menu-sub-4', title: '원소주 & 증류식 소주', url: '/collections?cat=dairy#soju', parent_id: 'menu-hdr-5', sort_order: 1, is_active: true, position: 'header' },
  { id: 'menu-sub-5', title: '느린마을 생막걸리 & 탁주', url: '/collections?cat=dairy#makgeolli', parent_id: 'menu-hdr-5', sort_order: 2, is_active: true, position: 'header' },

  // Footer Menus
  { id: 'menu-ftr-1', title: '송영민푸드 K-Food 브랜드 소개', url: '/why-kfood', parent_id: null, sort_order: 1, is_active: true, position: 'footer' },
  { id: 'menu-ftr-2', title: 'Overseas Buyer RFQ (해외 바이어 RFQ)', url: '/rfq', parent_id: null, sort_order: 2, is_active: true, position: 'footer' },
  { id: 'menu-ftr-3', title: 'B2B 도매 & 식자재 공급 문의', url: '/wholesale', parent_id: null, sort_order: 3, is_active: true, position: 'footer' },
  { id: 'menu-ftr-4', title: '고객 센터 & 문의', url: '/contact', parent_id: null, sort_order: 4, is_active: true, position: 'footer' },
  { id: 'menu-ftr-5', title: '해외 바이어 RFQ 견적 위저드', url: '/rfq', parent_id: null, sort_order: 5, is_active: true, position: 'footer' },
  { id: 'menu-ftr-6', title: '개인정보 처리방침', url: '/privacy', parent_id: null, sort_order: 6, is_active: true, position: 'footer' },
  { id: 'menu-ftr-7', title: '이용약관', url: '/terms', parent_id: null, sort_order: 7, is_active: true, position: 'footer' },
];

function buildMenuTree(allMenus: MenuItem[]): MenuItem[] {
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

// Sortable Item Component for Depth 1
function SortableItem({
  item,
  onToggleActive,
  onDelete,
  onAddSubmenu,
  children,
}: {
  item: MenuItem;
  onToggleActive: (id: string, active: boolean) => void;
  onDelete: (id: string) => void;
  onAddSubmenu: (parentId: string) => void;
  children?: React.ReactNode;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`mb-4 bg-[#14141a] border rounded-lg overflow-hidden transition-all duration-200 ${
        isDragging ? 'border-[#c5a880] shadow-2xl z-20' : 'border-stone-800 hover:border-stone-700'
      }`}
    >
      {/* Item Header Row */}
      <div className="p-4 flex items-center justify-between bg-[#181820] border-b border-stone-800/60">
        <div className="flex items-center space-x-3">
          <button
            {...attributes}
            {...listeners}
            className="p-1.5 text-stone-500 hover:text-[#c5a880] cursor-grab active:cursor-grabbing rounded transition-colors"
            title="Drag to reorder Depth 1"
          >
            <GripVertical size={18} />
          </button>

          <div>
            <div className="flex items-center space-x-2">
              <span className="text-xs font-semibold text-white tracking-wide">{item.title}</span>
              <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-stone-800 text-stone-400 border border-stone-700">
                Depth 1
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded bg-[#c5a880]/10 text-[#c5a880] border border-[#c5a880]/20">
                {item.position}
              </span>
            </div>
            <span className="text-[11px] text-stone-500 font-mono">{item.url}</span>
          </div>
        </div>

        <div className="flex items-center space-x-4">
          <button
            onClick={() => onAddSubmenu(item.id)}
            className="flex items-center space-x-1 text-xs text-stone-400 hover:text-white bg-stone-800 hover:bg-stone-700 px-2.5 py-1 rounded transition-colors"
          >
            <Plus size={14} />
            <span>Add Submenu</span>
          </button>

          <div className="flex items-center space-x-2 border-l border-stone-800 pl-4">
            <span className="text-xs font-medium text-stone-400 flex items-center">
              {item.is_active ? (
                <span className="text-emerald-400 flex items-center">
                  <Eye size={13} className="mr-1" /> Active
                </span>
              ) : (
                <span className="text-stone-500 flex items-center">
                  <EyeOff size={13} className="mr-1" /> Hidden
                </span>
              )}
            </span>
            <button
              onClick={() => onToggleActive(item.id, !item.is_active)}
              className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors duration-300 focus:outline-none ${
                item.is_active ? 'bg-emerald-600' : 'bg-stone-800 border border-stone-700'
              }`}
              title={item.is_active ? 'Turn Off' : 'Turn On'}
            >
              <div
                className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-300 ${
                  item.is_active ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          <button
            onClick={() => onDelete(item.id)}
            className="p-1.5 text-stone-500 hover:text-red-400 transition-colors"
            title="Delete Menu"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>

      {children}
    </div>
  );
}

// Sortable Submenu Item Component for Depth 2
function SortableSubItem({
  subItem,
  onToggleActive,
  onDelete,
}: {
  subItem: MenuItem;
  onToggleActive: (id: string, active: boolean) => void;
  onDelete: (id: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: subItem.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`p-3 bg-[#111116] border-l-2 ${
        subItem.is_active ? 'border-l-[#c5a880]' : 'border-l-stone-700'
      } rounded my-1.5 flex items-center justify-between transition-all`}
    >
      <div className="flex items-center space-x-3">
        <button
          {...attributes}
          {...listeners}
          className="p-1 text-stone-600 hover:text-[#c5a880] cursor-grab active:cursor-grabbing"
          title="Drag to reorder Depth 2"
        >
          <GripVertical size={15} />
        </button>
        <div>
          <div className="flex items-center space-x-2">
            <span className="text-xs font-medium text-stone-200">{subItem.title}</span>
            <span className="text-[9px] uppercase font-mono px-1.5 py-0.2 rounded bg-stone-800 text-stone-400">
              Depth 2
            </span>
          </div>
          <span className="text-[10px] text-stone-500 font-mono">{subItem.url}</span>
        </div>
      </div>

      <div className="flex items-center space-x-3">
        <button
          onClick={() => onToggleActive(subItem.id, !subItem.is_active)}
          className={`w-9 h-5 flex items-center rounded-full p-0.5 transition-colors duration-300 ${
            subItem.is_active ? 'bg-emerald-600' : 'bg-stone-800 border border-stone-700'
          }`}
        >
          <div
            className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-300 ${
              subItem.is_active ? 'translate-x-4' : 'translate-x-0'
            }`}
          />
        </button>
        <button
          onClick={() => onDelete(subItem.id)}
          className="p-1 text-stone-600 hover:text-red-400 transition-colors"
        >
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  );
}

export default function NavigationManager() {
  const [items, setItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<'all' | 'header' | 'footer'>('all');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newUrl, setNewUrl] = useState('');
  const [newParentId, setNewParentId] = useState<string | null>(null);
  const [newPosition, setNewPosition] = useState<'header' | 'footer' | 'both'>('header');

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const fetchMenus = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/menus?mode=admin');
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.data) && data.data.length > 0) {
          setItems(data.data);
          setLoading(false);
          return;
        }
      }
    } catch {
      // Fallback
    }

    if (isSupabaseConfigured()) {
      try {
        const { data, error } = await supabase.from('menus').select('*').order('sort_order');
        if (!error && data && data.length > 0) {
          setItems(buildMenuTree(data as MenuItem[]));
          setLoading(false);
          return;
        }
      } catch (err) {
        console.error('Supabase query error:', err);
      }
    }

    // Default Fallback Initial Menu Tree
    setItems(buildMenuTree(FALLBACK_RAW_MENUS));
    setLoading(false);
  };

  useEffect(() => {
    fetchMenus();
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const filteredItems = items.filter((item) => {
    if (activeTab === 'all') return true;
    return item.position === activeTab || item.position === 'both';
  });

  const handleToggleActive = async (id: string, is_active: boolean) => {
    setItems((prevItems) => {
      const updateTree = (list: MenuItem[]): MenuItem[] => {
        return list.map((item) => {
          if (item.id === id) {
            return { ...item, is_active };
          }
          if (item.children && item.children.length > 0) {
            return { ...item, children: updateTree(item.children) };
          }
          return item;
        });
      };
      return updateTree(prevItems);
    });

    try {
      await fetch('/api/menus', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, is_active }),
      });
    } catch {
      // Static fallback
    }

    if (isSupabaseConfigured()) {
      await supabase.from('menus').update({ is_active }).eq('id', id);
    }

    showToast(`Menu status updated`);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this menu item?')) return;

    setItems((prevItems) => {
      const filterTree = (list: MenuItem[]): MenuItem[] => {
        return list
          .filter((item) => item.id !== id)
          .map((item) => ({
            ...item,
            children: item.children ? filterTree(item.children) : [],
          }));
      };
      return filterTree(prevItems);
    });

    try {
      await fetch(`/api/menus?id=${id}`, { method: 'DELETE' });
    } catch {
      // Ignore
    }

    if (isSupabaseConfigured()) {
      await supabase.from('menus').delete().eq('id', id);
    }

    showToast('Menu deleted successfully');
  };

  const handleDragEndDepth1 = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = items.findIndex((i) => i.id === active.id);
    const newIndex = items.findIndex((i) => i.id === over.id);

    const reordered = arrayMove(items, oldIndex, newIndex).map((item, idx) => ({
      ...item,
      sort_order: idx + 1,
    }));

    setItems(reordered);
    showToast('Menu reordered');
  };

  const handleAddMenuSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newUrl.trim()) return alert('Title and URL are required');

    const newItem: MenuItem = {
      id: `menu-${Date.now()}`,
      title: newTitle,
      url: newUrl,
      parent_id: newParentId,
      sort_order: items.length + 1,
      is_active: true,
      position: newPosition,
    };

    if (newParentId) {
      setItems((prev) =>
        prev.map((parent) =>
          parent.id === newParentId
            ? { ...parent, children: [...(parent.children || []), newItem] }
            : parent
        )
      );
    } else {
      setItems((prev) => [...prev, newItem]);
    }

    setIsModalOpen(false);
    setNewTitle('');
    setNewUrl('');
    setNewParentId(null);
    showToast('New menu created');
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

      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-6 border-b border-stone-800">
        <div>
          <Link
            href="/admin"
            className="inline-flex items-center space-x-2 text-xs text-stone-400 hover:text-[#c5a880] mb-2 transition-colors"
          >
            <ArrowLeft size={14} />
            <span>Back to Dashboard</span>
          </Link>
          <h1 className="text-2xl sm:text-3xl font-serif-luxury font-bold text-white flex items-center space-x-3">
            <Layers className="text-[#c5a880]" size={28} />
            <span>Menu Control Panel</span>
          </h1>
          <p className="text-xs text-stone-400 mt-1">
            Tabbed menu manager. Filter by Header or Footer, drag &amp; drop items, and toggle live `is_active` status.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={fetchMenus}
            className="p-2.5 bg-stone-900 border border-stone-800 hover:border-stone-700 rounded text-stone-400 hover:text-white transition-colors"
            title="Refresh Menus"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          </button>

          <button
            onClick={() => {
              setNewParentId(null);
              setIsModalOpen(true);
            }}
            className="flex items-center space-x-2 px-5 py-2.5 bg-[#c5a880] hover:bg-[#b59870] text-black font-semibold rounded text-xs transition-colors shadow-lg"
          >
            <Plus size={16} />
            <span>ADD DEPTH 1 MENU</span>
          </button>
        </div>
      </div>

      {/* Position Filter Tabs */}
      <div className="flex space-x-2 border-b border-stone-800 pb-4">
        {(['all', 'header', 'footer'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-5 py-2 rounded text-xs font-semibold uppercase tracking-wider transition-all ${
              activeTab === tab
                ? 'bg-[#c5a880] text-black shadow-lg'
                : 'bg-stone-900 border border-stone-800 text-stone-400 hover:text-white'
            }`}
          >
            {tab === 'all' ? 'All Menus' : `${tab} Menus`}
          </button>
        ))}
      </div>

      {/* Main Drag and Drop Tree Container */}
      {loading ? (
        <div className="py-20 text-center text-stone-500 text-sm animate-pulse">
          Loading Navigation Engine Data...
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="py-20 text-center bg-[#111118] border border-stone-800 rounded-xl space-y-3">
          <Layers className="mx-auto text-stone-600" size={40} />
          <p className="text-stone-400 text-sm">No menus found in this view.</p>
        </div>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEndDepth1}>
          <SortableContext items={filteredItems.map((i) => i.id)} strategy={verticalListSortingStrategy}>
            <div className="space-y-4">
              {filteredItems.map((parent) => (
                <SortableItem
                  key={parent.id}
                  item={parent}
                  onToggleActive={handleToggleActive}
                  onDelete={handleDelete}
                  onAddSubmenu={(pId) => {
                    setNewParentId(pId);
                    setIsModalOpen(true);
                  }}
                >
                  {/* Depth 2 Submenu List */}
                  {parent.children && parent.children.length > 0 && (
                    <div className="p-3 bg-[#0d0d12] border-t border-stone-800/60 pl-8 space-y-1">
                      {parent.children.map((sub) => (
                        <SortableSubItem
                          key={sub.id}
                          subItem={sub}
                          onToggleActive={handleToggleActive}
                          onDelete={handleDelete}
                        />
                      ))}
                    </div>
                  )}
                </SortableItem>
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}

      {/* Create Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="bg-[#111118] border border-stone-800 rounded-xl max-w-md w-full p-6 space-y-5 shadow-2xl">
            <h2 className="font-serif-luxury text-xl font-bold text-white flex items-center space-x-2">
              <Plus className="text-[#c5a880]" size={20} />
              <span>{newParentId ? 'Add Submenu Item (Depth 2)' : 'Add Parent Menu Item (Depth 1)'}</span>
            </h2>

            <form onSubmit={handleAddMenuSubmit} className="space-y-4">
              <div>
                <label className="block text-xs uppercase tracking-wider text-stone-400 mb-1 font-mono">
                  Title / Label
                </label>
                <input
                  type="text"
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g. Organic EVOO Oils"
                  className="w-full px-3.5 py-2.5 bg-[#0a0a0c] border border-stone-800 focus:border-[#c5a880] rounded text-sm text-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs uppercase tracking-wider text-stone-400 mb-1 font-mono">
                  URL / Route Path
                </label>
                <input
                  type="text"
                  required
                  value={newUrl}
                  onChange={(e) => setNewUrl(e.target.value)}
                  placeholder="e.g. /collections?cat=fresh"
                  className="w-full px-3.5 py-2.5 bg-[#0a0a0c] border border-stone-800 focus:border-[#c5a880] rounded text-sm text-white focus:outline-none"
                />
              </div>

              {!newParentId && (
                <div>
                  <label className="block text-xs uppercase tracking-wider text-stone-400 mb-1 font-mono">
                    Placement Position
                  </label>
                  <select
                    value={newPosition}
                    onChange={(e) => setNewPosition(e.target.value as any)}
                    className="w-full px-3.5 py-2.5 bg-[#0a0a0c] border border-stone-800 focus:border-[#c5a880] rounded text-sm text-white focus:outline-none"
                  >
                    <option value="header">Header Navigation</option>
                    <option value="footer">Footer Link Group</option>
                    <option value="both">Both Header &amp; Footer</option>
                  </select>
                </div>
              )}

              <div className="flex space-x-3 pt-4 border-t border-stone-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="w-1/2 py-2.5 bg-stone-800 hover:bg-stone-700 text-stone-300 rounded text-xs transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="w-1/2 py-2.5 bg-[#c5a880] hover:bg-[#b59870] text-black font-semibold rounded text-xs transition-colors shadow-lg"
                >
                  Create Menu
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
