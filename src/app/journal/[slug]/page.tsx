import { redirect } from 'next/navigation';
import { getJournalArticles } from '@/lib/journal-db';

export async function generateStaticParams() {
  const articles = await getJournalArticles(true);
  return articles.map((a) => ({
    slug: a.slug,
  }));
}

export default async function JournalSlugRedirect({ params }: { params: Promise<{ slug: string }> }) {
  const resolvedParams = await params;
  redirect(`/news-events/${resolvedParams.slug}`);
}
