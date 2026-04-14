import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { Providers } from './providers';
import { AdminShell } from './admin-shell';
import './globals.css';

export const metadata: Metadata = {
  title: 'Matrimonial Admin',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="zh-CN">
      <body className="bg-gray-50 text-gray-900" suppressHydrationWarning>
        <Providers>
          <AdminShell>{children as never}</AdminShell>
        </Providers>
      </body>
    </html>
  );
}
