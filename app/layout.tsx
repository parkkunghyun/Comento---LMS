import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: '강사 ADMIN',
  description: '강사 섭외 및 교육 운영을 위한 LMS',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}



