import snapshot from '../../data/hero-slides.json';
import { HeroSlide } from './types';
import { deleteCms, insertCms, listCms, updateCms } from './cms-repository';

export async function getAllHeroSlides(): Promise<HeroSlide[]> {
  return (await listCms<HeroSlide>('hero_slides', snapshot as HeroSlide[])).sort((a, b) => a.sort_order - b.sort_order);
}
export async function getActiveHeroSlides(): Promise<HeroSlide[]> {
  return (await getAllHeroSlides()).filter((slide) => slide.is_active);
}
export async function toggleHeroSlideActive(id: string, is_active: boolean): Promise<boolean> {
  return Boolean(await updateCms<HeroSlide>('hero_slides', id, { is_active }));
}
export async function saveHeroSlide(slide: Partial<HeroSlide> & { id?: string }): Promise<HeroSlide> {
  const { id, media_type = 'image', media_url = '', poster_url = '', title = 'Untitled Slide', subtitle = '', cta_label = 'Discover More', cta_url = '/collections', sort_order = 0, is_active = true } = slide;
  const value = { media_type, media_url, poster_url, title, subtitle, cta_label, cta_url, sort_order, is_active };
  if (id) {
    const updated = await updateCms<HeroSlide>('hero_slides', id, value);
    if (!updated) throw new Error('Hero slide not found');
    return updated;
  }
  return insertCms<HeroSlide>('hero_slides', value);
}
export async function deleteHeroSlide(id: string): Promise<boolean> {
  return deleteCms('hero_slides', id);
}
