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
        style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--lp-text-muted, #78716c)' }}
      >
        <p>Katalog template saat ini belum tersedia.</p>
      </div>
    );
  }

  return (
    <div className="lp-catalog__grid">
      {templates.map((t, i) => (
        <div
          key={t.slug}
          className={'lp-template-card lp-reveal lp-reveal--delay-' + ((i % 3) + 1)}
        >
          <div
            className="lp-template-card__preview"
            style={{ position: 'relative', overflow: 'hidden', aspectRatio: '2/3' }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={t.thumbnailPath}
              alt={'Pratinjau desain ' + t.displayName}
              style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
              loading="lazy"
              width={600}
              height={900}
            />
            <div className="lp-template-card__badge">{t.category}</div>
          </div>
          <div className="lp-template-card__info">
            <h3 className="lp-template-card__name">{t.displayName}</h3>
            <p className="lp-template-card__desc">{t.shortDescription}</p>
            <div className="lp-template-card__actions">
              <a
                id={'catalog-demo-' + t.slug}
                href={t.demoPath}
                target="_blank"
                rel="noopener noreferrer"
                className="lp-btn lp-btn--outline-silver lp-btn--sm"
              >
                Lihat Demo
              </a>
              {(() => {
                const orderUrl = getTemplateOrderUrl(t.displayName);
                return orderUrl ? (
                  <a
                    id={'catalog-order-' + t.slug}
                    href={orderUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="lp-btn lp-btn--silver lp-btn--sm"
                  >
                    Pesan Desain Ini
                  </a>
                ) : (
                  <button
                    type="button"
                    id={'catalog-order-' + t.slug}
                    disabled
                    className="lp-btn lp-btn--silver lp-btn--sm"
                    style={{ opacity: 0.5, cursor: 'not-allowed' }}
                    title="Kontak pemesanan belum dikonfigurasi"
                  >
                    Pesan Desain Ini
                  </button>
                );
              })()}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
