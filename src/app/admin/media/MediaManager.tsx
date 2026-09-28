'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { MediaItem } from '@/lib/types';
import {
  Image as ImageIcon,
  Plus,
  Trash2,
  ArrowLeft,
  Upload,
  CheckCircle2,
  Video,
  Copy,
  Check,
} from 'lucide-react';


export default function MediaManager() {
  const [mediaItems, setMediaItems] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [mediaName, setMediaName] = useState('');
  const [mediaUrl, setMediaUrl] = useState('');
  const [mediaType, setMediaType] = useState<'image' | 'video'>('image');

  const fetchMedia = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/media?mode=admin');
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.data)) {
          setMediaItems(data.data);
          setLoading(false);
          return;
        }
      }
    } catch {
      // Fallback
    }

    setMediaItems([]);
    setToastMessage('미디어를 불러오지 못했습니다.');
    setLoading(false);
  };

  useEffect(() => {
    fetchMedia();
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleCopyUrl = (id: string, url: string) => {
    navigator.clipboard.writeText(url);
    setCopiedId(id);
    showToast('URL copied to clipboard!');
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this media asset?')) return;
    try {
      const response = await fetch(`/api/media?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
      if (!response.ok || !(await response.json()).success) throw new Error('Delete failed');
      setMediaItems((prev) => prev.filter((item) => item.id !== id));
      showToast('Media deleted successfully');
    } catch {
      showToast('미디어 삭제에 실패했습니다.');
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
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
        setMediaName(file.name);
        setMediaType(file.type.startsWith('video/') ? 'video' : 'image');
        setMediaItems((prev) => [data.data as MediaItem, ...prev]);
        setIsModalOpen(false);
        showToast('File uploaded!');
      } else {
        alert(data.error || 'Upload failed');
      }
    } catch {
      showToast('미디어 업로드에 실패했습니다.');
    } finally {
      setUploading(false);
    }
  };

  const handleAddMedia = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mediaName.trim() || !mediaUrl.trim()) return alert('Name & URL are required');

    try {
      const response = await fetch('/api/media', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: mediaName, url: mediaUrl, type: mediaType, size: 'External URL' }) });
      if (!response.ok) throw new Error('Save failed');
      const saved = (await response.json()).data as MediaItem;
      setMediaItems((prev) => [saved, ...prev]);
      setIsModalOpen(false);
      showToast('New media asset registered');
    } catch {
      showToast('미디어 저장에 실패했습니다.');
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
            <ImageIcon className="text-[#c5a880]" size={28} />
            <span>Media Library &amp; CDN Assets</span>
          </h1>
          <p className="text-xs text-stone-400 mt-1">
            Upload image and video files directly or manage CDN assets with instant URL copy.
          </p>
        </div>

        <button
          onClick={() => {
            setMediaName('');
            setMediaUrl('');
            setIsModalOpen(true);
          }}
          className="flex items-center space-x-2 px-5 py-2.5 bg-[#c5a880] hover:bg-[#b59870] text-black font-semibold rounded text-xs transition-colors shadow-lg"
        >
          <Plus size={16} />
          <span>UPLOAD / ADD MEDIA</span>
        </button>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="py-20 text-center text-stone-500 text-sm animate-pulse">
          Loading Media Assets...
        </div>
      ) : mediaItems.length === 0 ? (
        <div className="py-20 text-center bg-[#111118] border border-stone-800 rounded-xl space-y-3">
          <ImageIcon className="mx-auto text-stone-600" size={40} />
          <p className="text-stone-400 text-sm">No media items found.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {mediaItems.map((item) => (
            <div
              key={item.id}
              className="bg-[#111118] border border-stone-800 rounded-xl overflow-hidden shadow-xl flex flex-col justify-between group hover:border-[#c5a880]/50 transition-all duration-300"
            >
              <div>
                <div className="h-40 relative bg-black flex items-center justify-center overflow-hidden">
                  {item.type === 'video' ? (
                    <video src={item.url} muted loop autoPlay className="w-full h-full object-cover" />
                  ) : (
                    <img src={item.url} alt={item.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  )}

                  <div className="absolute top-2.5 left-2.5">
                    <span className="bg-[#0a0a0c]/80 backdrop-blur border border-stone-700 text-[#c5a880] text-[10px] uppercase font-mono px-2 py-0.5 rounded flex items-center space-x-1">
                      {item.type === 'video' ? <Video size={11} /> : <ImageIcon size={11} />}
                      <span>{item.type}</span>
                    </span>
                  </div>
                </div>

                <div className="p-4 space-y-1">
                  <h3 className="font-mono text-xs text-white truncate font-medium" title={item.name}>
                    {item.name}
                  </h3>
                  <div className="flex items-center justify-between text-[10px] font-mono text-stone-500">
                    <span>{item.size || '2.1 MB'}</span>
                    <span>{new Date(item.created_at).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>

              <div className="px-4 py-3 bg-[#0a0a0c]/60 border-t border-stone-800/80 flex items-center justify-between">
                <button
                  onClick={() => handleCopyUrl(item.id, item.url)}
                  className="flex items-center space-x-1.5 text-xs text-stone-300 hover:text-[#c5a880] transition-colors"
                >
                  {copiedId === item.id ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
                  <span>{copiedId === item.id ? 'Copied!' : 'Copy URL'}</span>
                </button>

                <button
                  onClick={() => handleDelete(item.id)}
                  className="p-1 text-stone-500 hover:text-red-400 transition-colors"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="bg-[#111118] border border-stone-800 rounded-xl max-w-md w-full p-6 space-y-5 shadow-2xl">
            <h2 className="font-serif-luxury text-xl font-bold text-white flex items-center space-x-2">
              <Upload className="text-[#c5a880]" size={20} />
              <span>Add Media Asset</span>
            </h2>

            <form onSubmit={handleAddMedia} className="space-y-4">
              <div>
                <label className="block text-xs uppercase tracking-wider text-stone-400 mb-1 font-mono">Upload File</label>
                <input
                  type="file"
                  onChange={handleFileUpload}
                  className="w-full text-xs text-stone-400 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-xs file:font-semibold file:bg-stone-900 file:text-stone-300 hover:file:bg-stone-800 cursor-pointer"
                />
                {uploading && <p className="text-xs text-[#c5a880] mt-1 font-mono">Uploading asset to storage...</p>}
              </div>

              <div>
                <label className="block text-xs uppercase tracking-wider text-stone-400 mb-1 font-mono">Asset Name</label>
                <input
                  type="text"
                  required
                  value={mediaName}
                  onChange={(e) => setMediaName(e.target.value)}
                  placeholder="e.g. Tuscan EVOO HD Image"
                  className="w-full px-3.5 py-2 bg-[#0a0a0c] border border-stone-800 focus:border-[#c5a880] rounded text-sm text-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs uppercase tracking-wider text-stone-400 mb-1 font-mono">CDN Asset URL</label>
                <input
                  type="text"
                  required
                  value={mediaUrl}
                  onChange={(e) => setMediaUrl(e.target.value)}
                  placeholder="https://images.unsplash.com/..."
                  className="w-full px-3.5 py-2 bg-[#0a0a0c] border border-stone-800 focus:border-[#c5a880] rounded text-sm text-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs uppercase tracking-wider text-stone-400 mb-1 font-mono">Asset Type</label>
                <select
                  value={mediaType}
                  onChange={(e) => setMediaType(e.target.value as any)}
                  className="w-full px-3.5 py-2 bg-[#0a0a0c] border border-stone-800 focus:border-[#c5a880] rounded text-sm text-white focus:outline-none"
                >
                  <option value="image">Image Asset</option>
                  <option value="video">Video Asset</option>
                </select>
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
                  Register Asset
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
