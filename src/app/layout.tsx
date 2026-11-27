import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = { title: 'Xưởng STEM & STEAM THPT', description: 'Công cụ hướng dẫn và theo dõi dự án STEM/STEAM môn Vật lí THPT.' };
export const viewport: Viewport = { width: 'device-width', initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi">
      <body>
        <a href="#main" className="no-print sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-50 focus:rounded focus:bg-white focus:p-3">Bỏ qua tới nội dung chính</a>
        {children}
      </body>
    </html>
  );
}
