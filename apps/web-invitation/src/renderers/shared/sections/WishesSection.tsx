'use client';

import React from 'react';

export interface WishItem {
  id: string;
  name: string;
  message: string;
  dateLabel?: string;
  createdAt?: string | Date;
}

export interface WishesSectionProps {
  title?: string;
  description?: string;
  wishesSlot?: React.ReactNode;
  fallbackItems?: WishItem[];
  className?: string;
  slotClassName?: string;
  listClassName?: string;
  itemClassName?: string;
  customHeading?: React.ReactNode;
}

export function WishesSection({
  title = 'Doa & Ucapan',
  description,
  wishesSlot,
  fallbackItems = [],
  className,
  slotClassName,
  listClassName,
  itemClassName,
  customHeading,
}: WishesSectionProps) {
  return (
    <section className={className} id="wishes">
      {customHeading ? (
        customHeading
      ) : (
        <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
          <h2 style={{ margin: '0 0 0.5rem 0' }}>{title}</h2>
          {description && <p style={{ margin: 0, opacity: 0.85 }}>{description}</p>}
        </div>
      )}

      {wishesSlot ? (
        <div className={slotClassName}>{wishesSlot}</div>
      ) : fallbackItems.length > 0 ? (
        <div className={listClassName}>
          {fallbackItems.map((wish) => (
            <blockquote key={wish.id} className={itemClassName}>
              <p style={{ margin: '0 0 0.5rem 0' }}>{wish.message}</p>
              <footer style={{ fontSize: '0.8125rem', opacity: 0.8 }}>
                <strong>{wish.name}</strong>
                {wish.dateLabel && (
                  <small style={{ marginLeft: '0.5rem' }}>{wish.dateLabel}</small>
                )}
              </footer>
            </blockquote>
          ))}
        </div>
      ) : null}
    </section>
  );
}

