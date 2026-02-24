import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Toaster } from '@/components/ui/toaster';
import { LocalStorageInit } from '@/components/local-storage-init';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Finaco - Controle Financeiro Inteligente',
  description: 'Sistema inteligente de controle financeiro pessoal e empresarial',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR" className="dark">
      <body className={inter.className}>
        <LocalStorageInit />
        {children}
        <Toaster />
      </body>
    </html>
  );
}
