import fs from 'fs';
import path from 'path';
import { JournalArticle } from './types';
import { supabaseAdmin, isSupabaseConfigured } from './supabase';

const JOURNAL_DATA_PATH = path.join(process.cwd(), 'data', 'journal.json');

const INITIAL_JOURNAL_ARTICLES: JournalArticle[] = [
  {
    id: 'art-1',
    title: '송영민푸드 K-푸드 신선 공방 오픈 소식',
    slug: 'songyoungminfood-k-food-lab-open',
    category: '뉴스',
    excerpt: '대한민국 프리미엄 K-냉동식품과 원소주, 생막걸리 전통주 직송 라인업이 강화되었습니다.',
    content: '# 송영민푸드 K-푸드 신선 공방 오픈\n\n송영민푸드(Song Youngmin Food)에서 엄선된 국산 100% 원재료 기반 K-냉동식품과 명품 전통주 라인업을 신규 출시합니다.\n\n세계 50개국에 진출하는 프리미엄 K-Food 표준을 제시합니다.',
    cover_image: 'https://images.unsplash.com/photo-1541696432-82c6da8ce7bf?auto=format&fit=crop&w=1200&q=80',
    is_published: true,
    published_date: '2026-06-15',
  },
  {
    id: 'art-2',
    title: '원소주 24% & 느린마을 생막걸리 미식 페어링 가이드',
    slug: 'wonsoju-makgeolli-pairing-guide',
    category: 'K-레시피',
    excerpt: '비비고 왕교자 만두 및 수제 떡볶이 밀키트와 완벽하게 어우러지는 전통주 페어링 팁.',
    content: '# K-주류 미식 페어링 가이드\n\n옹기 숙성 원소주의 청량하고 깊은 풍미와 떡볶이의 매콤함이 이루는 환상의 조합을 경험하세요.',
    cover_image: 'https://images.unsplash.com/photo-1527281400683-1aae777175f8?auto=format&fit=crop&w=1200&q=80',
    is_published: true,
    published_date: '2026-05-20',
  },
  {
    id: 'art-3',
    title: '에어프라이어 15분! 바삭한 크리스피 반반 치킨 비법',
    slug: 'airfryer-crispy-chicken-recipe',
    category: 'K-레시피',
    excerpt: '집에서도 갓 튀겨낸 듯 바삭하고 튀김 옷이 살아있는 양념 & 간장 치킨 조리법.',
    content: '# 에어프라이어 치킨 조리 비법\n\n180도 예열된 에어프라이어에서 15분간 조리하면 극강의 바삭함이 완성됩니다.',
    cover_image: 'https://images.unsplash.com/photo-1563245372-f21724e3856d?auto=format&fit=crop&w=1200&q=80',
    is_published: true,
    published_date: '2026-04-10',
  },
];

function ensureJournalFile(): JournalArticle[] {
  if (!fs.existsSync(path.dirname(JOURNAL_DATA_PATH))) {
    fs.mkdirSync(path.dirname(JOURNAL_DATA_PATH), { recursive: true });
  }

  if (!fs.existsSync(JOURNAL_DATA_PATH)) {
    saveJournalData(INITIAL_JOURNAL_ARTICLES);
    return INITIAL_JOURNAL_ARTICLES;
  }

  try {
    const fileData = fs.readFileSync(JOURNAL_DATA_PATH, 'utf-8');
    const parsed = JSON.parse(fileData) as JournalArticle[];
    if (!parsed || parsed.length === 0 || parsed[0].title.includes('Anatolia')) {
      saveJournalData(INITIAL_JOURNAL_ARTICLES);
      return INITIAL_JOURNAL_ARTICLES;
    }
    return parsed;
  } catch (error) {
    console.error('Error reading journal.json:', error);
    saveJournalData(INITIAL_JOURNAL_ARTICLES);
    return INITIAL_JOURNAL_ARTICLES;
  }
}

function saveJournalData(items: JournalArticle[]) {
  if (!fs.existsSync(path.dirname(JOURNAL_DATA_PATH))) {
    fs.mkdirSync(path.dirname(JOURNAL_DATA_PATH), { recursive: true });
  }
  fs.writeFileSync(JOURNAL_DATA_PATH, JSON.stringify(items, null, 2), 'utf-8');
}

/**
 * Get all journal articles (Admin mode or Published mode)
 */
export async function getJournalArticles(isPublishedOnly = false): Promise<JournalArticle[]> {
  if (isSupabaseConfigured() && supabaseAdmin) {
    try {
      let query = supabaseAdmin.from('journal_articles').select('*').order('published_date', { ascending: false });
      if (isPublishedOnly) {
        query = query.eq('is_published', true);
      }
      const { data, error } = await query;
      if (!error && data && data.length > 0) {
        return data as JournalArticle[];
      }
    } catch (e) {
      console.warn('Supabase journal fetch warning, fallback to JSON:', e);
    }
  }

  const articles = ensureJournalFile();
  if (isPublishedOnly) {
    return articles.filter((a) => a.is_published);
  }
  return articles;
}

/**
 * Get journal article by slug or id
 */
export async function getJournalBySlug(slug: string): Promise<JournalArticle | null> {
  if (isSupabaseConfigured() && supabaseAdmin) {
    try {
      const { data, error } = await supabaseAdmin
        .from('journal_articles')
        .select('*')
        .or(`slug.eq.${slug},id.eq.${slug}`)
        .single();
      if (!error && data) {
        return data as JournalArticle;
      }
    } catch (e) {
      console.warn('Supabase getJournalBySlug warning:', e);
    }
  }

  const articles = ensureJournalFile();
  return articles.find((a) => a.slug === slug || a.id === slug) || null;
}

/**
 * Save or update journal article
 */
export async function saveJournalArticle(article: Partial<JournalArticle> & { id?: string }): Promise<JournalArticle> {
  const articles = ensureJournalFile();

  let targetArticle: JournalArticle;

  if (article.id) {
    const idx = articles.findIndex((a) => a.id === article.id);
    if (idx !== -1) {
      articles[idx] = { ...articles[idx], ...article };
      targetArticle = articles[idx];
    } else {
      targetArticle = {
        id: article.id,
        title: article.title || 'Untitled Post',
        slug: article.slug || `post-${Date.now()}`,
        category: article.category || '뉴스',
        excerpt: article.excerpt || '',
        content: article.content || '',
        cover_image: article.cover_image || '',
        is_published: article.is_published ?? true,
        published_date: article.published_date || new Date().toISOString().split('T')[0],
      };
      articles.unshift(targetArticle);
    }
  } else {
    const newId = `art-${Date.now()}`;
    const newSlug = article.slug || article.title?.toLowerCase().replace(/[^a-z0-9가-힣]+/g, '-') || `post-${Date.now()}`;
    
    targetArticle = {
      id: newId,
      title: article.title || 'Untitled Post',
      slug: newSlug,
      category: article.category || '뉴스',
      excerpt: article.excerpt || '',
      content: article.content || '',
      cover_image: article.cover_image || '',
      is_published: article.is_published ?? true,
      published_date: article.published_date || new Date().toISOString().split('T')[0],
    };
    articles.unshift(targetArticle);
  }

  saveJournalData(articles);

  if (isSupabaseConfigured() && supabaseAdmin) {
    try {
      await supabaseAdmin.from('journal_articles').upsert(targetArticle);
    } catch (e) {
      console.warn('Supabase saveJournalArticle warning:', e);
    }
  }

  return targetArticle;
}

/**
 * Toggle journal article published status
 */
export async function toggleJournalPublishStatus(id: string, is_published: boolean): Promise<boolean> {
  const articles = ensureJournalFile();
  const idx = articles.findIndex((a) => a.id === id);
  if (idx === -1) return false;

  articles[idx].is_published = is_published;
  saveJournalData(articles);

  if (isSupabaseConfigured() && supabaseAdmin) {
    try {
      await supabaseAdmin.from('journal_articles').update({ is_published }).eq('id', id);
    } catch (e) {
      console.warn('Supabase toggleJournalPublishStatus warning:', e);
    }
  }

  return true;
}

/**
 * Delete journal article
 */
export async function deleteJournalArticle(id: string): Promise<boolean> {
  let articles = ensureJournalFile();
  const initLen = articles.length;
  articles = articles.filter((a) => a.id !== id);
  saveJournalData(articles);

  if (isSupabaseConfigured() && supabaseAdmin) {
    try {
      await supabaseAdmin.from('journal_articles').delete().eq('id', id);
    } catch (e) {
      console.warn('Supabase deleteJournalArticle warning:', e);
    }
  }

  return articles.length < initLen;
}
