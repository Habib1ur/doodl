import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import '@/styles/globals.css';
import { SocketProvider } from '@/components/SocketProvider';
import { ToastContainer } from '@/components/ToastContainer';

const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-inter',
});

export const metadata: Metadata = {
  title: 'Doodlio — Draw it. Guess it. Own it.',
  description:
    'A fast, modern multiplayer drawing and word-guessing game. Create a room, invite friends, and race to guess every doodle!',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable} suppressHydrationWarning>
      <body className="min-h-screen bg-surface-bg text-ink-main antialiased selection:bg-brand-green-light selection:text-brand-green-deep">
        <SocketProvider>
          {children}
          <ToastContainer />
        </SocketProvider>
      </body>
    </html>
  );
}
