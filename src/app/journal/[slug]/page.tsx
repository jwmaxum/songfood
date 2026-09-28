import { redirect } from 'next/navigation';

export default async function JournalSlugRedirect({ params }: { params: Promise<{ slug: string }> }) {
  const resolvedParams = await params;
  redirect(`/news-events/${resolvedParams.slug}`);
}
