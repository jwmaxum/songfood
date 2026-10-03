'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { ContentBlock } from '@/lib/types';
import {
  FileText,
  Plus,
  Edit2,
  ArrowLeft,
  Upload,
  CheckCircle2,
  Layout,
  Sparkles,
} from 'lucide-react';

export default function ContentBlockManager() {
  const [blocks, setBlocks] = useState<ContentBlock[]>([]);
  const [loading, setLoading] = useState(true);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBlock, setEditingBlock] = useState<ContentBlock | null>(null);

  const [sectionKey, setSectionKey] = useState('featured_categories');
  const [page, setPage] = useState('home');
  const [title, setTitle] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [description, setDescription] = useState('');
  const [badge, setBadge] = useState('');
  const [mediaUrl, setMediaUrl] = useState('');

  const fetchBlocks = async () => {
    try {
      const res = await fetch('/api/content-blocks?mode=admin');
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.data)) {
          setBlocks(data.data);
          setLoading(false);
          return;
        }
      }
    } catch {
      // Fallback
    }

    setBlocks([]);
    setToastMessage('콘텐츠를 불러오지 못했습니다.');
    setLoading(false);
  };

  useEffect(() => {
    let active=true;
    fetch("/api/content-blocks?mode=admin").then(async r=>{if(!r.ok)throw new Error();const d=await r.json();if(!d.success||!Array.isArray(d.data))throw new Error();if(active)setBlocks(d.data);}).catch(()=>{if(active)setToastMessage("자료를 불러오지 못했습니다.");}).finally(()=>{if(active)setLoading(false);});
    return()=>{active=false;};
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const openEditModal = (b: ContentBlock) => {
    setEditingBlock(b);
    setSectionKey(b.section_key);
    setPage(b.page || 'home');
    setTitle(b.title || '');
    setSubtitle(b.subtitle || '');
    setDescription(b.description || '');
    setBadge(b.badge || '');
    setMediaUrl(b.media_url || '');
    setIsModalOpen(true);
  };

  const openCreateModal = () => {
    setEditingBlock(null);
    setSectionKey('new_section');
    setPage('home');
    setTitle('');
    setSubtitle('');
    setDescription('');
    setBadge('');
    setMediaUrl('');
    setIsModalOpen(true);
  };

  const handleMediaUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('/api/upload', { method: 'POST', body: formData });
      const data = await res.json();
      if (data.success) {
        setMediaUrl(data.data.url);
        showToast('Media uploaded!');
      } else {
        alert(data.error || 'Upload failed');
      }
    } catch {
      showToast('업로드에 실패했습니다.');
    } finally {
      setUploading(false);
    }
  };

  const handleSaveBlock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sectionKey.trim() || !title.trim()) return alert('Section Key & Title are required');

    const newOrUpdated: Partial<ContentBlock> = {
      ...(editingBlock ? { id: editingBlock.id } : {}),
      section_key: sectionKey,
      page,
      title,
      subtitle,
      description,
      badge,
      media_url: mediaUrl,
      media_type: 'image',
      updated_at: new Date().toISOString(),
    };

    try {
      const response = await fetch('/api/content-blocks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newOrUpdated),
      });
      if (!response.ok) throw new Error('Save failed');
      const saved = (await response.json()).data as ContentBlock;
      setBlocks((prev) => editingBlock ? prev.map((item) => item.id === saved.id ? saved : item) : [...prev, saved]);
      setIsModalOpen(false);
      showToast(editingBlock ? 'Content block updated' : 'New block created');
    } catch {
      showToast('콘텐츠 저장에 실패했습니다.');
    }
  };

  return (
    <div className="p-6 md:p-10 space-y-8 bg-[#0a0a0c] text-stone-200 min-h-screen">
      {/* Toast */}
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
            <span>Back to Dashboard</span>
          </Link>
          <h1 className="text-2xl sm:text-3xl font-serif-luxury font-bold text-white flex items-center space-x-3">
            <FileText className="text-[#c5a880]" size={28} />
            <span>Page Content Block Editor</span>
          </h1>
          <p className="text-xs text-stone-400 mt-1">
            Manage section headlines, subtitles, descriptions, and media assets across all pages.
          </p>
        </div>

        <button
          onClick={openCreateModal}
          className="flex items-center space-x-2 px-5 py-2.5 bg-[#c5a880] hover:bg-[#b59870] text-black font-semibold rounded text-xs transition-colors shadow-lg"
        >
          <Plus size={16} />
          <span>ADD CONTENT BLOCK</span>
        </button>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="py-20 text-center text-stone-500 text-sm animate-pulse">
          Loading Content Blocks...
        </div>
      ) : blocks.length === 0 ? (
        <div className="py-20 text-center bg-[#111118] border border-stone-800 rounded-xl space-y-3">
          <Layout className="mx-auto text-stone-600" size={40} />
          <p className="text-stone-400 text-sm">No content blocks found.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {blocks.map((block) => (
            <div
              key={block.id}
              className="bg-[#111118] border border-stone-800 rounded-xl overflow-hidden shadow-xl flex flex-col justify-between group hover:border-[#c5a880]/50 transition-all duration-300"
            >
              <div className="p-6 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase font-mono px-2.5 py-1 rounded bg-[#c5a880]/10 text-[#c5a880] border border-[#c5a880]/20">
                    Section: {block.section_key}
                  </span>
                  <span className="text-[10px] font-mono text-stone-500">
                    Page: {block.page || 'home'}
                  </span>
                </div>

                <h3 className="font-serif-luxury text-lg font-semibold text-white group-hover:text-[#c5a880] transition-colors">
                  {block.title}
                </h3>

                {block.subtitle && (
                  <div className="text-xs text-[#c5a880] font-mono">{block.subtitle}</div>
                )}

                <p className="text-xs text-stone-400 font-light leading-relaxed line-clamp-3">
                  {block.description}
                </p>

                {block.media_url && (
                  <div className="h-32 rounded overflow-hidden mt-3 relative border border-stone-800">
                    <img src={block.media_url} alt={block.title} className="w-full h-full object-cover" />
                  </div>
                )}
              </div>

              <div className="px-6 py-3.5 bg-[#0a0a0c]/60 border-t border-stone-800/80 flex items-center justify-between">
                <span className="text-[10px] text-stone-500 font-mono">
                  Updated: {block.updated_at ? new Date(block.updated_at).toLocaleDateString('ko-KR',{timeZone:'Asia/Seoul'}) : '기록 없음'}
                </span>

                <button
                  onClick={() => openEditModal(block)}
                  className="flex items-center space-x-1.5 px-3 py-1 bg-stone-900 border border-stone-800 hover:border-stone-700 text-stone-300 text-xs rounded transition-colors"
                >
                  <Edit2 size={13} />
                  <span>Edit Content</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-[#111118] border border-stone-800 rounded-xl max-w-xl w-full p-6 space-y-5 shadow-2xl relative my-8">
            <h2 className="font-serif-luxury text-xl font-bold text-white flex items-center space-x-2">
              <Sparkles className="text-[#c5a880]" size={20} />
              <span>{editingBlock ? 'Edit Content Block' : 'Create Content Block'}</span>
            </h2>

            <form onSubmit={handleSaveBlock} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs uppercase tracking-wider text-stone-400 mb-1 font-mono">Section Key</label>
                  <input
                    type="text"
                    required
                    value={sectionKey}
                    onChange={(e) => setSectionKey(e.target.value)}
                    placeholder="e.g. brand_story"
                    className="w-full px-3.5 py-2 bg-[#0a0a0c] border border-stone-800 focus:border-[#c5a880] rounded text-sm text-white focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs uppercase tracking-wider text-stone-400 mb-1 font-mono">Page</label>
                  <input
                    type="text"
                    value={page}
                    onChange={(e) => setPage(e.target.value)}
                    placeholder="home / about / contact"
                    className="w-full px-3.5 py-2 bg-[#0a0a0c] border border-stone-800 focus:border-[#c5a880] rounded text-sm text-white focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs uppercase tracking-wider text-stone-400 mb-1 font-mono">Headline Title</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Section main title..."
                  className="w-full px-3.5 py-2 bg-[#0a0a0c] border border-stone-800 focus:border-[#c5a880] rounded text-sm text-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs uppercase tracking-wider text-stone-400 mb-1 font-mono">Subtitle</label>
                <input
                  type="text"
                  value={subtitle}
                  onChange={(e) => setSubtitle(e.target.value)}
                  placeholder="Supporting subtitle..."
                  className="w-full px-3.5 py-2 bg-[#0a0a0c] border border-stone-800 focus:border-[#c5a880] rounded text-sm text-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs uppercase tracking-wider text-stone-400 mb-1 font-mono">Description Paragraph</label>
                <textarea
                  rows={4}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Full section body copy..."
                  className="w-full px-3.5 py-2 bg-[#0a0a0c] border border-stone-800 focus:border-[#c5a880] rounded text-sm text-white focus:outline-none resize-none"
                />
              </div>

              <div>
                <label className="block text-xs uppercase tracking-wider text-stone-400 mb-1 font-mono">Media Image URL</label>
                <div className="flex space-x-2">
                  <input
                    type="text"
                    value={mediaUrl}
                    onChange={(e) => setMediaUrl(e.target.value)}
                    placeholder="https://images.unsplash.com/..."
                    className="flex-grow px-3.5 py-2 bg-[#0a0a0c] border border-stone-800 focus:border-[#c5a880] rounded text-sm text-white focus:outline-none"
                  />
                  <label className="px-4 py-2 bg-stone-900 border border-stone-800 text-stone-300 text-xs rounded cursor-pointer flex items-center space-x-1 shrink-0">
                    <Upload size={14} />
                    <span>{uploading ? 'Uploading...' : 'Upload'}</span>
                    <input type="file" accept="image/*" onChange={handleMediaUpload} className="hidden" />
                  </label>
                </div>
              </div>

              <div className="flex space-x-3 pt-4 border-t border-stone-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="w-1/2 py-2.5 bg-stone-800 text-stone-300 rounded text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="w-1/2 py-2.5 bg-[#c5a880] text-black font-semibold rounded text-xs shadow-lg"
                >
                  Save Content Block
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
