import snapshot from '../../data/journal.json';
import { JournalArticle } from './types';
import { deleteCms, insertCms, listCms, updateCms } from './cms-repository';

export async function getJournalArticles(isPublishedOnly = false): Promise<JournalArticle[]> {
  const articles = await listCms<JournalArticle>('journal_articles', snapshot as JournalArticle[]);
  return articles.filter((item) => !isPublishedOnly || item.is_published)
    .sort((a, b) => b.published_date.localeCompare(a.published_date));
}
export async function getJournalBySlug(slug: string): Promise<JournalArticle | null> {
  return (await getJournalArticles()).find((item) => item.slug === slug || item.id === slug) || null;
}
export async function saveJournalArticle(article: Partial<JournalArticle> & { id?: string }): Promise<JournalArticle> {
  const value = {
    title: article.title || 'Untitled Post',
    slug: article.slug || article.title?.toLowerCase().replace(/[^a-z0-9가-힣]+/g, '-') || `post-${Date.now()}`,
    category: article.category || '뉴스', excerpt: article.excerpt || '', content: article.content || '',
    cover_image: article.cover_image || '', is_published: article.is_published ?? true,
    published_date: article.published_date || new Date().toISOString().slice(0, 10),
  };
  if (article.id) {
    const updated = await updateCms<JournalArticle>('journal_articles', article.id, value);
    if (!updated) throw new Error('Journal article not found');
    return updated;
  }
  return insertCms<JournalArticle>('journal_articles', value);
}
export async function toggleJournalPublishStatus(id: string, is_published: boolean): Promise<boolean> {
  return Boolean(await updateCms<JournalArticle>('journal_articles', id, { is_published }));
}
export async function deleteJournalArticle(id: string): Promise<boolean> {
  return deleteCms('journal_articles', id);
}
