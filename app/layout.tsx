import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  metadataBase: new URL(
    'https://roam-delhi-places.dhairya-kukreja.chatgpt.site',
  ),
  title: 'Roam — Places picked for you',
  description:
    'Discover places you will love with live maps, weather, travel times, ride apps and recommendations that learn from you.',
  openGraph: {
    title: 'Roam — Places picked for you',
    description:
      'Live maps, weather, ride options and personal recommendations for your next day out.',
    type: 'website',
    images: ['/og.png'],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Roam — Places picked for you',
    description:
      'Live maps, weather, ride options and personal recommendations for your next day out.',
    images: ['/og.png'],
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
