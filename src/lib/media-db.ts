import snapshot from '../../data/media-library.json';
import { MediaItem } from './types';
import { deleteCms, insertCms, listCms } from './cms-repository';

export async function getMediaItems(type?: 'image' | 'video'): Promise<MediaItem[]> {
  const fallback = snapshot.map((item) => ({ ...item, type: item.file_type as 'image' | 'video' }));
  const items = await listCms<MediaItem>('media_library', fallback);
  return type ? items.filter((item) => item.type === type) : items;
}
export async function addMediaItem(item: Omit<MediaItem, 'id' | 'created_at'>): Promise<MediaItem> {
  return insertCms<MediaItem>('media_library', { name: item.name, url: item.url, type: item.type, size: item.size || null });
}
export async function deleteMediaItem(id: string): Promise<boolean> {
  return deleteCms('media_library', id);
}
