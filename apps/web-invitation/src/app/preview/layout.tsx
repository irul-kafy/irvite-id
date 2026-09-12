import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Template Preview',
  robots: { index: false, follow: false },
};

export default function PreviewLayout({ children }: { children: React.ReactNode }) {
  return <div className="preview-layout-root">{children}</div>;
}
