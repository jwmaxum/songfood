'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { MenuItem } from '@/lib/types';
import ImageUploadField from '@/components/admin/ImageUploadField';
import { PRODUCT_TAXONOMY, categoriesForCollection } from '@/lib/product-taxonomy';
import { collectionLabel, categoryLabel } from '@/lib/catalogue-taxonomy';
import { catalogueHref } from '@/lib/catalogue-navigation';
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



// Sortable Item Component for Depth 1
function SortableItem({
  item,
  onToggleActive,
  onDelete,
  onAddSubmenu,
  onEditImage,
  children,
}: {
  item: MenuItem;
  onToggleActive: (id: string, active: boolean) => void;
  onDelete: (id: string) => void;
  onAddSubmenu: (parentId: string) => void;
  onEditImage:(item:MenuItem)=>void;
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
          <button type="button" onClick={()=>onEditImage(item)} aria-label={item.title+' 이미지 수정'} className="min-h-11 rounded border border-stone-600 px-3 text-xs">이미지 수정</button>
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
  onEditImage,
}: {
  subItem: MenuItem;
  onEditImage:(item:MenuItem)=>void;
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
        <button type="button" onClick={()=>onEditImage(subItem)} aria-label={subItem.title+' 이미지 수정'} className="min-h-11 rounded border border-stone-600 px-3 text-xs">이미지 수정</button>
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
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<'all' | 'header' | 'footer'>('all');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newImageUrl,setNewImageUrl]=useState(''),[imageBusy,setImageBusy]=useState(false),[imageSaving,setImageSaving]=useState(false);
  const [imageEditor,setImageEditor]=useState<MenuItem|null>(null),[editImageUrl,setEditImageUrl]=useState('');
  const imageDialog=useRef<HTMLElement>(null),imageOpener=useRef<HTMLElement|null>(null);
  function openImage(item:MenuItem){imageOpener.current=document.activeElement instanceof HTMLElement?document.activeElement:null;setImageEditor(item);setEditImageUrl(item.image_url||'');}
  function closeImage(){if(imageBusy||imageSaving)return;setImageEditor(null);requestAnimationFrame(()=>imageOpener.current?.focus());}
  useEffect(()=>{if(!imageEditor)return;const frame=requestAnimationFrame(()=>imageDialog.current?.querySelector<HTMLElement>('input,button')?.focus());return()=>cancelAnimationFrame(frame);},[imageEditor]);
  async function saveImage(){
   if(!imageEditor||imageBusy||imageSaving)return;setImageSaving(true);
   try{const r=await fetch('/api/menus',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({id:imageEditor.id,image_url:editImageUrl})});const b=await r.json();if(!r.ok||!b.success||!b.data)throw Error();
    setItems(old=>old.map(item=>({...item,...(item.id===imageEditor.id?{image_url:b.data.image_url}:{}),children:item.children?.map(child=>child.id===imageEditor.id?{...child,image_url:b.data.image_url}:child)})));setImageEditor(null);requestAnimationFrame(()=>imageOpener.current?.focus());showToast('메뉴 이미지를 저장했습니다.');
   }catch{showToast('메뉴 이미지 저장에 실패했습니다. 선택한 이미지는 유지됩니다.');}finally{setImageSaving(false);}
  }
  const [newUrl, setNewUrl] = useState('');
  const [newParentId, setNewParentId] = useState<string | null>(null);
  const [destinationType, setDestinationType] = useState<'category' | 'custom'>('category');
  const [destinationCollection, setDestinationCollection] = useState('');
  const [destinationCategory, setDestinationCategory] = useState('');
  const [destinationMode, setDestinationMode] = useState<'domestic' | 'export'>('domestic');
  const modalRef = useRef<HTMLDivElement>(null);
  const openerRef = useRef<HTMLElement | null>(null);
  const destinationHref = (lang: 'ko' | 'en') => catalogueHref(new URLSearchParams(), {
    collection: destinationCollection, category: destinationCategory,
    mode: destinationMode === 'export' ? 'export' : '', lang,
  });
  const resolvedUrl = destinationType === 'category' ? destinationHref('ko') : newUrl;
  function openCreate(parentId: string | null) {
    openerRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    setNewParentId(parentId); setNewTitle(''); setNewUrl(''); setNewImageUrl('');
    setDestinationType('category'); setDestinationCollection(''); setDestinationCategory(''); setDestinationMode('domestic');
    setIsModalOpen(true);
  }
  function closeCreate() { if(imageBusy)return; setIsModalOpen(false); openerRef.current?.focus(); }
  useEffect(() => {
    if (isModalOpen) modalRef.current?.querySelector<HTMLInputElement>('input')?.focus();
  }, [isModalOpen]);

  const [newPosition, setNewPosition] = useState<'header' | 'footer' | 'both'>('header');

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const fetchMenus = async () => {
    try {
      const res = await fetch('/api/menus?mode=admin');
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.data)) {
          setItems(data.data);
          setLoading(false);
          return;
        }
      }
    } catch {
      // Fallback
    }

    setItems([]);
    setToastMessage('메뉴를 불러오지 못했습니다.');
    setLoading(false);
  };

  useEffect(() => {
    let active=true;
    fetch("/api/menus?mode=admin").then(async r=>{if(!r.ok)throw new Error();const d=await r.json();if(!d.success||!Array.isArray(d.data))throw new Error();if(active)setItems(d.data);}).catch(()=>{if(active)setToastMessage("자료를 불러오지 못했습니다.");}).finally(()=>{if(active)setLoading(false);});
    return()=>{active=false;};
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
    try {
      const response = await fetch('/api/menus', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, is_active }) });
      if (!response.ok || !(await response.json()).success) throw new Error('Update failed');
    } catch {
      showToast('메뉴 상태 변경에 실패했습니다.');
      return;
    }
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

    showToast(`Menu status updated`);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this menu item?')) return;

    try {
      const response = await fetch(`/api/menus?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
      if (!response.ok || !(await response.json()).deleted) throw new Error('Delete failed');
    } catch {
      showToast('메뉴 삭제에 실패했습니다.');
      return;
    }
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

    showToast('Menu deleted successfully');
  };

  const handleDragEndDepth1 = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = items.findIndex((i) => i.id === active.id);
    const newIndex = items.findIndex((i) => i.id === over.id);

    const reordered = arrayMove(items, oldIndex, newIndex).map((item, idx) => ({
      ...item,
      sort_order: idx + 1,
    }));

    try {
      const response = await fetch('/api/menus/reorder', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ items: reordered.map((item) => ({ id: item.id, sort_order: item.sort_order })) }) });
      if (!response.ok || !(await response.json()).success) throw new Error('Reorder failed');
      setItems(reordered);
      showToast('Menu reordered');
    } catch {
      showToast('메뉴 순서 변경에 실패했습니다.');
    }
  };

  const handleAddMenuSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if(imageBusy)return;
    if (!newTitle.trim() || !resolvedUrl.trim()) return alert('Title and URL are required');
    if (destinationType === 'custom' && (!resolvedUrl.startsWith('/') || resolvedUrl.startsWith('//') || /[\\\u0000-\u001f\u007f]/.test(resolvedUrl))) { showToast('메뉴에는 안전한 내부 페이지 경로를 입력해 주세요.'); return; }

    let newItem: MenuItem;
    try {
      const response = await fetch('/api/menus', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title: newTitle, url: resolvedUrl, parent_id: newParentId, sort_order: items.length + 1, is_active: true, position: newPosition, image_url:newImageUrl }) });
      if (!response.ok) throw new Error('Create failed');
      newItem = (await response.json()).data as MenuItem;
    } catch {
      showToast('메뉴 생성에 실패했습니다.');
      return;
    }

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

    closeCreate();
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
            onClick={() => openCreate(null)}
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
        <div role="status" className="py-20 text-center text-stone-400 text-sm">
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
                  onAddSubmenu={(pId) => openCreate(pId)}
                  onEditImage={openImage}
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
                          onEditImage={openImage}
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

      {imageEditor && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4" onKeyDown={e=>{if(e.key==='Escape'){e.preventDefault();closeImage();}if(e.key==='Tab'){const controls=imageDialog.current?.querySelectorAll<HTMLElement>('button:not([disabled]),input:not([disabled]),select:not([disabled])');if(!controls?.length)return;const first=controls[0],last=controls[controls.length-1];if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}}}}><section ref={imageDialog} role="dialog" aria-modal="true" aria-labelledby="navigation-image-title" className="max-h-[90dvh] w-full max-w-lg space-y-4 overflow-y-auto rounded-xl border border-stone-600 bg-stone-900 p-5"><h2 id="navigation-image-title" className="text-lg font-bold">{imageEditor.title} 이미지 수정</h2><ImageUploadField label="메뉴 이미지" value={editImageUrl} onChange={setEditImageUrl} disabled={imageBusy||imageSaving} onBusyChange={setImageBusy}/><div className="flex gap-3"><button type="button" disabled={imageBusy||imageSaving} onClick={closeImage} className="min-h-11 rounded border px-4">닫기</button><button type="button" disabled={imageBusy||imageSaving} onClick={()=>void saveImage()} className="min-h-11 rounded bg-amber-300 px-4 font-bold text-stone-950">메뉴 이미지 저장</button></div></section></div>}
      {/* Create Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4" onKeyDown={e => { if (e.key === 'Escape') { e.preventDefault(); closeCreate(); } if (e.key === 'Tab') { const controls = modalRef.current?.querySelectorAll<HTMLElement>('button, input, select, a[href]'); if (!controls?.length) return; const first = controls[0], last = controls[controls.length - 1]; if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); } else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); } } }}>
          <div ref={modalRef} role="dialog" aria-modal="true" aria-labelledby="navigation-create-title" className="max-h-[90dvh] overflow-y-auto bg-[#111118] border border-stone-800 rounded-xl max-w-lg w-full p-6 space-y-5 shadow-2xl">
            <h2 id="navigation-create-title" className="font-serif-luxury text-xl font-bold text-white flex items-center space-x-2">
              <Plus className="text-[#c5a880]" size={20} />
              <span>{newParentId ? 'Add Submenu Item (Depth 2)' : 'Add Parent Menu Item (Depth 1)'}</span>
            </h2>

            <form onSubmit={handleAddMenuSubmit} className="space-y-4">
              <div>
                <label htmlFor="navigation-title" className="block text-xs uppercase tracking-wider text-stone-400 mb-1 font-mono">
                  Title / Label
                </label>
                <input
                  type="text"
                  required
                  id="navigation-title" value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="예: 만두·냉동식품"
                  className="w-full px-3.5 py-2.5 bg-[#0a0a0c] border border-stone-800 focus:border-[#c5a880] rounded text-sm text-white focus:outline-none"
                />
              </div>

              <div className="space-y-4 rounded-lg border border-stone-700 p-4">
                <label className="block text-sm" htmlFor="navigation-destination">메뉴 목적지</label>
                <select id="navigation-destination" value={destinationType} onChange={e => setDestinationType(e.target.value as 'category' | 'custom')} className="min-h-11 w-full rounded border border-stone-700 bg-[#0a0a0c] p-2 text-sm">
                  <option value="category">상품 분류 선택</option><option value="custom">다른 내부 페이지 URL</option>
                </select>
                {destinationType === 'category' ? <>
                  <label className="block text-sm" htmlFor="navigation-collection">상품 대분류</label>
                  <select id="navigation-collection" value={destinationCollection} onChange={e => { setDestinationCollection(e.target.value); setDestinationCategory(''); }} className="min-h-11 w-full rounded border border-stone-700 bg-[#0a0a0c] p-2 text-sm">
                    <option value="">전체 상품 / All products</option>
                    {PRODUCT_TAXONOMY.map(group => <option key={group.collection} value={group.collection}>{collectionLabel(group.collection, 'ko')}</option>)}
                  </select>
                  <label className="block text-sm" htmlFor="navigation-category">제품종류</label>
                  <select id="navigation-category" value={destinationCategory} disabled={!destinationCollection} onChange={e => setDestinationCategory(e.target.value)} className="min-h-11 w-full rounded border border-stone-700 bg-[#0a0a0c] p-2 text-sm disabled:opacity-50">
                    <option value="">대분류 전체</option>
                    {categoriesForCollection(destinationCollection).map(category => <option key={category} value={category}>{categoryLabel(category, 'ko')}</option>)}
                  </select>
                  <label className="block text-sm" htmlFor="navigation-mode">구매 유형</label>
                  <select id="navigation-mode" value={destinationMode} onChange={e => setDestinationMode(e.target.value as 'domestic' | 'export')} className="min-h-11 w-full rounded border border-stone-700 bg-[#0a0a0c] p-2 text-sm"><option value="domestic">국내 구매</option><option value="export">Export RFQ</option></select>
                  <div className="space-y-2 break-all text-xs" aria-label="목적지 미리보기">
                    <p>선택 분류: {destinationCategory ? categoryLabel(destinationCategory, 'ko') : destinationCollection ? collectionLabel(destinationCollection, 'ko') : '전체 상품'}</p>
                    <p>English: {destinationCategory ? categoryLabel(destinationCategory, 'en') : destinationCollection ? collectionLabel(destinationCollection, 'en') : 'All products'}</p>
                    <p><Link href={destinationHref('ko')} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center underline">한국어 결과 미리보기 (새 탭)</Link></p>
                    <p><Link href={destinationHref('en')} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center underline">English results preview (new tab)</Link></p>
                    <p className="text-stone-400">{resolvedUrl}</p>
                  </div>
                </> : <div>
                  <label htmlFor="navigation-url" className="mb-1 block text-xs">URL / Route Path</label>
                  <input id="navigation-url" type="text" required value={newUrl} onChange={e => setNewUrl(e.target.value)} placeholder="예: /about" className="min-h-11 w-full rounded border border-stone-700 bg-[#0a0a0c] p-2 text-sm" />
                  <p className="mt-2 text-xs text-stone-400">상품 메뉴는 분류 선택을 이용하세요. 기존 분류 코드 대신 /shop의 collection·category 조건을 저장합니다.</p>
                </div>}
              </div>

              <ImageUploadField label="메뉴 이미지" value={newImageUrl} onChange={setNewImageUrl} disabled={imageBusy} onBusyChange={setImageBusy} />

              {!newParentId && (
                <div>
                  <label htmlFor="navigation-position" className="block text-xs uppercase tracking-wider text-stone-400 mb-1 font-mono">
                    Placement Position
                  </label>
                  <select
                    id="navigation-position" value={newPosition}
                    onChange={(e) => setNewPosition(e.target.value as 'header' | 'footer' | 'both')}
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
                  disabled={imageBusy} onClick={closeCreate}
                  className="w-1/2 py-2.5 bg-stone-800 hover:bg-stone-700 text-stone-300 rounded text-xs transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit" disabled={imageBusy}
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
