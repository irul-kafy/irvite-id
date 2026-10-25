import React from 'react';
import { CatalogTemplateItem } from '../catalog';
import { getTemplateOrderUrl } from '../utils/contact';

interface PublicTemplateShowcaseProps {
  templates: CatalogTemplateItem[];
}

export function PublicTemplateShowcase({ templates }: PublicTemplateShowcaseProps) {
  if (templates.length === 0) {
    return (
      <div
        id="catalog-empty-state"
        style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--ink-soft)' }}
      >
        <p>Katalog template saat ini belum tersedia.</p>
      </div>
    );
  }

  return (
    <div className="catalog-grid cat-grid">
      {templates.map((t) => {
        const orderUrl = getTemplateOrderUrl(t.displayName);

        return (
          <article className="cat-card" key={t.slug} role="listitem">
            <div className="cat-card__preview">
              {t.thumbnailPath ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={t.thumbnailPath}
                  alt={`Pratinjau desain ${t.displayName}`}
                  className="cat-card__img"
                  loading="lazy"
                  width={600}
                  height={750}
                />
              ) : (
                <div
                  className="cat-card__img"
                  style={{
                    minHeight: 280,
                    display: 'grid',
                    placeItems: 'center',
                    padding: '2rem',
                    fontFamily: 'var(--serif)',
                    fontSize: '2rem',
                    background: 'linear-gradient(145deg, #352a2d, #57373d)',
                    color: '#fffdf9',
                  }}
                >
                  {t.displayName}
                </div>
              )}
              <span className="cat-card__overlay-badge">Tersedia</span>
            </div>

            <div className="cat-card__body">
              <span className="cat-card__category">{t.category}</span>
              <h3 className="cat-card__title">{t.displayName}</h3>
              <p className="cat-card__desc">{t.shortDescription}</p>

              <div className="cat-card__actions">
                <a
                  id={'catalog-demo-' + t.slug}
                  href={t.demoPath}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="cat-btn cat-btn--demo"
                  aria-label={`Buka demo ${t.displayName} di tab baru`}
                >
                  Lihat Demo
                </a>

                {orderUrl ? (
                  <a
                    id={'catalog-order-' + t.slug}
                    href={orderUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="cat-btn cat-btn--order"
                    aria-label={`Pesan template ${t.displayName} via WhatsApp`}
                  >
                    Pilih Template
                  </a>
                ) : (
                  <button
                    type="button"
                    id={'catalog-order-' + t.slug}
                    disabled
                    className="cat-btn cat-btn--order"
                    style={{ opacity: 0.5, cursor: 'not-allowed' }}
                    title="Kontak pemesanan belum dikonfigurasi"
                  >
                    Pilih Template
                  </button>
                )}
              </div>
            </div>
          </article>
        );
      })}
    </div>
  );
}
