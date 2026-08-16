import type { Metadata, Viewport } from 'next';
import './globals.css';
import { Nav } from '@/components/shared/Nav';

export const viewport: Viewport = {
  themeColor: '#FBFBFA',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  colorScheme: 'light',
};

export const metadata: Metadata = {
  title: {
    default: 'Token Pilot Intelligent Prompt Router',
    template: '%s - Token Pilot',
  },
  description:
    'Token Pilot classifies prompt complexity and routes requests to the lowest-cost capable model.',
  keywords: ['LLM router', 'prompt classification', 'cost optimization', 'model routing'],
  openGraph: {
    title: 'Token Pilot Intelligent Prompt Router',
    description: 'Classify prompt complexity and route to cost-effective models.',
    type: 'website',
    siteName: 'Token Pilot',
  },
};

import { ConfigProvider } from '@/lib/config-store';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" data-scroll-behavior="smooth">
      <body>
        <ConfigProvider>
          <Nav />
          <main>{children}</main>
        </ConfigProvider>
      </body>
    </html>
  );
}
