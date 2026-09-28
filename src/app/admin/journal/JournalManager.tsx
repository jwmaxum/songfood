'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { JournalArticle } from '@/lib/types';
import {
  FileCode,
  Plus,
  Trash2,
  Edit2,
  ArrowLeft,
  CheckCircle2,
  Upload,
  Eye,
  EyeOff,
  Newspaper,
  Sparkles,
} from 'lucide-react';


export default function JournalManager() {
  const [articles, setArticles] = useState<JournalArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingArticle, setEditingArticle] = useState<JournalArticle | null>(null);

  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<'News' | 'Event' | 'Architecture' | 'Design'>('News');
  const [excerpt, setExcerpt] = useState('');
  const [content, setContent] = useState('');
  const [coverImage, setCoverImage] = useState('');
  const [isPublished, setIsPublished] = useState(true);

  const fetchArticles = async () => {
    setLoading(true);
    try {
      // 1. API Route 호출 시도
      const res = await fetch('/api/journal?mode=admin');
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.data)) {
          setArticles(data.data);
          setLoading(false);
          return;
        }
      }
    } catch {
      // API call failed, fallback below
    }

    setArticles([]);
    setToastMessage('저널을 불러오지 못했습니다.');
    setLoading(false);
  };

  useEffect(() => {
    fetchArticles();
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleTogglePublish = async (id: string, currentPublished: boolean) => {
    const nextStatus = !currentPublished;

    try {
      const response = await fetch('/api/journal', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, is_published: nextStatus }),
      });
      if (!response.ok || !(await response.json()).success) throw new Error('Update failed');
      setArticles((prev) => prev.map((article) => article.id === id ? { ...article, is_published: nextStatus } : article));
      showToast(`Article status updated to ${nextStatus ? 'Published' : 'Draft'}`);
    } catch {
      showToast('발행 상태 변경에 실패했습니다.');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this article?')) return;

    try {
      const response = await fetch(`/api/journal?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
      if (!response.ok || !(await response.json()).success) throw new Error('Delete failed');
      setArticles((prev) => prev.filter((article) => article.id !== id));
      showToast('Article deleted successfully');
    } catch {
      showToast('저널 삭제에 실패했습니다.');
    }
  };

  const openCreateModal = () => {
    setEditingArticle(null);
    setTitle('');
    setCategory('News');
    setExcerpt('');
    setContent('');
    setCoverImage('');
    setIsPublished(true);
    setIsModalOpen(true);
  };

  const openEditModal = (art: JournalArticle) => {
    setEditingArticle(art);
    setTitle(art.title);
    setCategory((art.category as 'News' | 'Event' | 'Architecture' | 'Design') || 'News');
    setExcerpt(art.excerpt || '');
    setContent(art.content || '');
    setCoverImage(art.cover_image || '');
    setIsPublished(art.is_published ?? true);
    setIsModalOpen(true);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (data.success) {
        setCoverImage(data.data.url);
        showToast('Image uploaded successfully!');
      } else {
        alert(data.error || 'Upload failed');
      }
    } catch {
      showToast('이미지 업로드에 실패했습니다.');
    } finally {
      setUploading(false);
    }
  };

  const handleSaveArticle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return alert('Title is required');

    const slug = editingArticle?.slug || title.toLowerCase().replace(/[^a-z0-9가-힣]+/g, '-') || `post-${crypto.randomUUID()}`;
    const newOrUpdated: Partial<JournalArticle> = {
      ...(editingArticle ? { id: editingArticle.id } : {}),
      title,
      slug,
      category,
      excerpt,
      content,
      cover_image: coverImage || '/images/products/coming-soon.png',
      is_published: isPublished,
      published_date: editingArticle?.published_date || new Date().toISOString().split('T')[0],
    };

    try {
      const response = await fetch('/api/journal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newOrUpdated),
      });
      if (!response.ok) throw new Error('Save failed');
      const saved = (await response.json()).data as JournalArticle;
      setArticles((prev) => editingArticle ? prev.map((item) => item.id === saved.id ? saved : item) : [saved, ...prev]);
      setIsModalOpen(false);
      showToast(editingArticle ? 'Article updated' : 'New article created');
    } catch {
      showToast('저널 저장에 실패했습니다.');
    }
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
            <span>Back to Dashboard</span>
          </Link>
          <h1 className="text-2xl sm:text-3xl font-serif-luxury font-bold text-white flex items-center space-x-3">
            <Newspaper className="text-[#c5a880]" size={28} />
            <span>News / Event / Journal Editor</span>
          </h1>
          <p className="text-xs text-stone-400 mt-1">
            WYSIWYG &amp; Markdown article editor for Anatolia brand news, events, and architectural case studies.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <Link
            href="/journal"
            target="_blank"
            className="px-4 py-2.5 bg-stone-900 border border-stone-800 hover:border-stone-700 rounded text-xs text-stone-300 transition-colors"
          >
            View Public Journal Page
          </Link>

          <button
            onClick={openCreateModal}
            className="flex items-center space-x-2 px-5 py-2.5 bg-[#c5a880] hover:bg-[#b59870] text-black font-semibold rounded text-xs transition-colors shadow-lg"
          >
            <Plus size={16} />
            <span>CREATE ARTICLE</span>
          </button>
        </div>
      </div>

      {/* Articles Grid / List Table */}
      {loading ? (
        <div className="py-20 text-center text-stone-500 text-sm animate-pulse">
          Loading Journal Data...
        </div>
      ) : articles.length === 0 ? (
        <div className="py-20 text-center bg-[#111118] border border-stone-800/80 rounded-xl space-y-3">
          <Newspaper className="mx-auto text-stone-600" size={40} />
          <p className="text-stone-400 text-sm">No journal articles found.</p>
          <button
            onClick={openCreateModal}
            className="px-4 py-2 bg-[#c5a880] text-black text-xs font-semibold rounded"
          >
            Add First Article
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {articles.map((art) => (
            <div
              key={art.id}
              className="bg-[#111118] border border-stone-800 rounded-xl overflow-hidden shadow-xl flex flex-col justify-between group hover:border-[#c5a880]/50 transition-all duration-300"
            >
              <div>
                {/* Cover Image Header */}
                <div className="h-44 relative bg-stone-900 overflow-hidden">
                  <img
                    src={art.cover_image || 'https://images.unsplash.com/photo-1541544741938-0af808871cc0?auto=format&fit=crop&w=800&q=80'}
                    alt={art.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute top-3 left-3 flex items-center space-x-2">
                    <span className="bg-[#0a0a0c]/80 backdrop-blur border border-stone-700 text-[#c5a880] text-[10px] uppercase font-mono px-2.5 py-1 rounded">
                      {art.category}
                    </span>
                  </div>

                  <button
                    onClick={() => handleTogglePublish(art.id, art.is_published)}
                    className={`absolute top-3 right-3 p-1.5 rounded-full backdrop-blur transition-all ${
                      art.is_published
                        ? 'bg-emerald-950/80 border border-emerald-500/50 text-emerald-400'
                        : 'bg-stone-900/80 border border-stone-700 text-stone-400'
                    }`}
                    title={art.is_published ? 'Published (Click to Unpublish)' : 'Draft (Click to Publish)'}
                  >
                    {art.is_published ? <Eye size={14} /> : <EyeOff size={14} />}
                  </button>
                </div>

                {/* Content Body */}
                <div className="p-5 space-y-2">
                  <div className="text-[11px] text-stone-500 font-mono">
                    {art.published_date}
                  </div>
                  <h3 className="font-serif-luxury text-base font-semibold text-white line-clamp-1 group-hover:text-[#c5a880] transition-colors">
                    {art.title}
                  </h3>
                  <p className="text-xs text-stone-400 font-light line-clamp-2 leading-relaxed">
                    {art.excerpt}
                  </p>
                </div>
              </div>

              {/* Action Buttons Footer */}
              <div className="px-5 py-3.5 bg-[#0a0a0c]/60 border-t border-stone-800/80 flex items-center justify-between">
                <span className="text-[11px] text-stone-500 font-mono">
                  Slug: /{art.slug}
                </span>

                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => openEditModal(art)}
                    className="p-1.5 text-stone-400 hover:text-white bg-stone-900 hover:bg-stone-800 rounded border border-stone-800 transition-colors"
                    title="Edit Article"
                  >
                    <Edit2 size={13} />
                  </button>
                  <button
                    onClick={() => handleDelete(art.id)}
                    className="p-1.5 text-red-400 hover:text-red-300 bg-red-950/30 hover:bg-red-900/50 rounded border border-red-900/50 transition-colors"
                    title="Delete Article"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Article Create / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-[#111118] border border-stone-800 rounded-xl max-w-2xl w-full p-6 space-y-6 shadow-2xl relative my-8">
            <h2 className="font-serif-luxury text-xl font-bold text-white flex items-center space-x-2">
              <FileCode className="text-[#c5a880]" size={20} />
              <span>{editingArticle ? 'Edit Article' : 'Create New Article'}</span>
            </h2>

            <form onSubmit={handleSaveArticle} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs uppercase tracking-wider text-stone-400 mb-1 font-mono">
                    Title
                  </label>
                  <input
                    type="text"
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Article Headline..."
                    className="w-full px-3.5 py-2.5 bg-[#0a0a0c] border border-stone-800 focus:border-[#c5a880] rounded text-sm text-white focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs uppercase tracking-wider text-stone-400 mb-1 font-mono">
                    Category
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as any)}
                    className="w-full px-3.5 py-2.5 bg-[#0a0a0c] border border-stone-800 focus:border-[#c5a880] rounded text-sm text-white focus:outline-none"
                  >
                    <option value="News">News</option>
                    <option value="Event">Event</option>
                    <option value="Architecture">Architecture</option>
                    <option value="Design">Design</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs uppercase tracking-wider text-stone-400 mb-1 font-mono">
                  Cover Image URL
                </label>
                <div className="flex space-x-2">
                  <input
                    type="text"
                    value={coverImage}
                    onChange={(e) => setCoverImage(e.target.value)}
                    placeholder="https://images.unsplash.com/..."
                    className="flex-grow px-3.5 py-2.5 bg-[#0a0a0c] border border-stone-800 focus:border-[#c5a880] rounded text-sm text-white focus:outline-none"
                  />
                  <label className="px-4 py-2.5 bg-stone-900 border border-stone-800 hover:border-stone-700 text-stone-300 text-xs font-medium rounded cursor-pointer flex items-center space-x-1.5 shrink-0">
                    <Upload size={14} />
                    <span>{uploading ? 'Uploading...' : 'Upload'}</span>
                    <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-xs uppercase tracking-wider text-stone-400 mb-1 font-mono">
                  Excerpt / Summary
                </label>
                <textarea
                  rows={2}
                  value={excerpt}
                  onChange={(e) => setExcerpt(e.target.value)}
                  placeholder="Short summary for list cards..."
                  className="w-full px-3.5 py-2.5 bg-[#0a0a0c] border border-stone-800 focus:border-[#c5a880] rounded text-sm text-white focus:outline-none resize-none"
                />
              </div>

              <div>
                <label className="block text-xs uppercase tracking-wider text-stone-400 mb-1 font-mono">
                  Article Content (Markdown / HTML)
                </label>
                <textarea
                  rows={8}
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="# Article Headline&#10;&#10;Write markdown article content here..."
                  className="w-full px-3.5 py-2.5 bg-[#0a0a0c] border border-stone-800 focus:border-[#c5a880] rounded text-sm text-white focus:outline-none font-mono text-xs"
                />
              </div>

              <div className="flex items-center space-x-2 pt-2">
                <input
                  type="checkbox"
                  id="isPublished"
                  checked={isPublished}
                  onChange={(e) => setIsPublished(e.target.checked)}
                  className="w-4 h-4 rounded border-stone-800 text-[#c5a880] focus:ring-0 bg-[#0a0a0c]"
                />
                <label htmlFor="isPublished" className="text-xs text-stone-300 cursor-pointer">
                  Publish immediately to public website
                </label>
              </div>

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
                  Save Article
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
