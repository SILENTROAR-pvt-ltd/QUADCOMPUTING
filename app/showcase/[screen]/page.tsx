import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { ShowcaseScreen } from '@/components/showcase/ShowcaseScreen';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Showcase', robots: { index: false, follow: false } };

/**
 * The product screens behind the landing-page screenshots, filled with a fictional café's data. Off unless the server
 * runs with QC_SHOWCASE=1 (only while capturing), so it never appears on the live site.
 */
export default async function ShowcasePage({ params }: { params: Promise<{ screen: string }> }) {
  if (process.env.QC_SHOWCASE !== '1') notFound();
  const { screen } = await params;
  return <ShowcaseScreen id={screen} />;
}
