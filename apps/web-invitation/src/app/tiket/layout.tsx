import type { Metadata } from 'next';
import React from 'react';

export const metadata: Metadata = {
  referrer: 'no-referrer',
};

export default function TiketLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
