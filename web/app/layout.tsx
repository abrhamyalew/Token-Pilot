import type { Metadata } from 'next';
import './globals.css';
import { Nav } from '@/components/shared/Nav';

export const metadata: Metadata = {
  title: {
    default: 'Token Pilot — Intelligent LLM Router',
    template: '%s | Token Pilot',
  },
  description:
    'Token Pilot classifies prompt complexity and routes requests to the cheapest capable model — saving up to 80% on LLM API costs.',
  keywords: ['LLM router', 'AI cost optimization', 'prompt classification', 'GPT-4 alternative'],
  openGraph: {
    title: 'Token Pilot — Intelligent LLM Router',
    description: 'Save up to 80% on LLM API costs with intelligent prompt routing.',
    type: 'website',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <Nav />
        <main>{children}</main>
      </body>
    </html>
  );
}
