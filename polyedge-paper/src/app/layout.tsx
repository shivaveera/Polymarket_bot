import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'PolyEdge Paper Trader',
  description: 'BTC prediction market paper trading simulator',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen">
        <nav className="border-b border-[#2a2a2a] px-4 py-3">
          <div className="max-w-4xl mx-auto flex items-center justify-between">
            <a href="/" className="text-lg font-bold">PolyEdge Paper Trader</a>
            <div className="flex gap-4 text-sm">
              <a href="/" className="hover:text-blue-400">Dashboard</a>
              <a href="/settings" className="hover:text-blue-400">Settings</a>
              <a href="/trades" className="hover:text-blue-400">History</a>
              <a href="/research" className="hover:text-blue-400">Research</a>
            </div>
          </div>
        </nav>
        <main className="max-w-4xl mx-auto px-4 py-6">{children}</main>
      </body>
    </html>
  );
}
