import snapshot from '../../data/content-blocks.json';
import { ContentBlock } from './types';
import { insertCms, listCms, updateCms } from './cms-repository';

export async function getAllContentBlocks(): Promise<ContentBlock[]> {
  return listCms<ContentBlock>('content_blocks', snapshot as ContentBlock[]);
}
export async function getContentBlockByKey(sectionKey: string): Promise<ContentBlock | null> {
  return (await getAllContentBlocks()).find((block) => block.section_key === sectionKey) || null;
}
export async function saveContentBlock(block: Partial<ContentBlock> & { id?: string; section_key: string }): Promise<ContentBlock> {
  const value = {
    section_key: block.section_key, page: block.page || 'home', title: block.title || '',
    subtitle: block.subtitle || '', description: block.description || '', media_url: block.media_url || '',
    media_type: block.media_type || 'image', badge: block.badge || '', updated_at: new Date().toISOString(),
  };
  const existing = block.id ? (await getAllContentBlocks()).find((item) => item.id === block.id) : await getContentBlockByKey(block.section_key);
  if (existing) {
    const updated = await updateCms<ContentBlock>('content_blocks', existing.id, value);
    if (!updated) throw new Error('Content block not found');
    return updated;
  }
  return insertCms<ContentBlock>('content_blocks', value);
}
