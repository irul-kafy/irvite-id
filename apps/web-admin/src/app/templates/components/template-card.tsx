'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { TemplateConfigV1 } from '../utils/template-studio-model';
import { ADMIN_FONT_MAP } from '../utils/admin-fonts';
import { CatalogCategory } from '../utils/catalog-registry';

export interface TemplateCardItem {
  id: string;
  name: string;
  themeCode: string;
  previewImageUrl?: string;
  category?: CatalogCategory | string;
  tags?: string[];
  description?: string;
  badge?: string;
  isPhotoOptional?: boolean;
  config?: TemplateConfigV1 | null;
  updatedAt?: string;
  createdAt?: string;
  isCatalog?: boolean;
}

export type TemplateListItem = TemplateCardItem;

interface TemplateCardProps {
  template: TemplateCardItem;
  canEdit?: boolean;
  onPreview?: (config: TemplateConfigV1, name: string, themeCode?: string) => void;
  onUseTemplate?: (template: TemplateCardItem) => void;
}

export function TemplateCard({
  template,
  canEdit = false,
  onPreview,
  onUseTemplate,
}: TemplateCardProps) {
  const router = useRouter();
  const config = template.config;

  const primaryColor = config?.theme?.primaryColor || '#111827';
  const secondaryColor = config?.theme?.secondaryColor || '#6b7280';
  const backgroundColor = config?.theme?.backgroundColor || '#ffffff';
  const textColor = config?.theme?.textColor || '#111827';

  const headingFontKey = config?.typography?.headingFont;
  const bodyFontKey = config?.typography?.bodyFont;
  const headingFontLabel = headingFontKey
    ? ADMIN_FONT_MAP[headingFontKey]?.label || headingFontKey
    : 'Default';
  const bodyFontLabel = bodyFontKey
    ? ADMIN_FONT_MAP[bodyFontKey]?.label || bodyFontKey
    : 'Default';

  const enabledSectionCount =
    config?.sections?.filter((s) => s.enabled)?.length ?? 0;
  // Only curated catalog entries may provide artwork. Database template metadata
  // is not used as a CSS URL here, so the catalog remains a same-origin surface.
  const catalogArtworkUrl = template.isCatalog ? template.previewImageUrl : undefined;

  const handlePreviewClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (config && onPreview) {
      onPreview(config, template.name, template.themeCode);
    }
  };

  const handleUseClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onUseTemplate) {
      onUseTemplate(template);
    } else {
      router.push(`/events/create?template=${encodeURIComponent(template.id)}`);
    }
  };

  return (
    <div className="template-card" tabIndex={0} role="article" aria-label={template.name}>
      {/* Visual Header / Color Signature */}
      <div
        className={`template-card__header-preview${catalogArtworkUrl ? ' template-card__header-preview--artwork' : ''}`}
        style={{
          ...(catalogArtworkUrl
            ? {
                backgroundImage: `linear-gradient(135deg, ${backgroundColor}e8 0%, ${backgroundColor}a8 58%, ${primaryColor}b8 100%), url("${catalogArtworkUrl}")`,
                backgroundPosition: 'center',
                backgroundSize: 'cover',
              }
            : {
                background: `linear-gradient(135deg, ${backgroundColor} 0%, ${backgroundColor} 60%, ${primaryColor}15 100%)`,
              }),
          borderBottom: `2px solid ${primaryColor}25`,
        }}
      >
        <div className="template-card__header-top">
          <div className="template-card__tags">
            {template.badge && (
              <span className="template-card__badge template-card__badge--highlight">
                {template.badge}
              </span>
            )}
            {template.tags?.slice(0, 2).map((tag) => (
              <span key={tag} className="template-card__badge">
                {tag}
              </span>
            ))}
            {template.isPhotoOptional && (
              <span className="template-card__badge template-card__badge--outline">
                Non-Foto
              </span>
            )}
          </div>
        </div>

        {/* Live Font & Color Preview Snippet */}
        <div className="template-card__sample-text" style={{ color: textColor }}>
          <div
            className="template-card__sample-title"
            style={{
              color: primaryColor,
              fontFamily:
                headingFontKey === 'PLAYFAIR_DISPLAY'
                  ? 'serif'
                  : headingFontKey === 'MONTSERRAT'
                  ? 'sans-serif'
                  : 'inherit',
            }}
          >
            {template.name}
          </div>
          <div className="template-card__sample-subtitle" style={{ color: secondaryColor }}>
            The Wedding Celebration
          </div>
        </div>
      </div>

      {/* Card Content Body */}
      <div className="template-card__body">
        <div className="template-card__title-row">
          <h3 className="template-card__name" title={template.name}>
            {template.name}
          </h3>
          <span className="template-card__theme-code">{template.themeCode}</span>
        </div>

        {template.description && (
          <p className="template-card__desc">{template.description}</p>
        )}

        {/* Color Palette Swatches */}
        <div className="template-card__meta-row">
          <div className="template-card__palette" aria-label="Theme Color Palette">
            <span
              className="template-card__swatch"
              style={{ backgroundColor: primaryColor }}
              title={`Primary: ${primaryColor}`}
            />
            <span
              className="template-card__swatch"
              style={{ backgroundColor: secondaryColor }}
              title={`Secondary: ${secondaryColor}`}
            />
            <span
              className="template-card__swatch"
              style={{ backgroundColor: backgroundColor }}
              title={`Background: ${backgroundColor}`}
            />
            <span
              className="template-card__swatch"
              style={{ backgroundColor: textColor }}
              title={`Text: ${textColor}`}
            />
          </div>

          <div className="template-card__fonts">
            {headingFontLabel} + {bodyFontLabel}
          </div>
        </div>

        <div className="template-card__specs">
          <span className="template-card__spec-item">
            {enabledSectionCount} {enabledSectionCount === 1 ? 'section' : 'sections'}
          </span>
          <span className="template-card__spec-item">• Fixed Design</span>
        </div>
      </div>

      {/* Action Footer */}
      <div className="template-card__actions">
        <button
          type="button"
          className="template-card__btn template-card__btn--preview"
          onClick={handlePreviewClick}
          aria-label={`Live preview ${template.name}`}
        >
          <svg
            viewBox="0 0 24 24"
            width="16"
            height="16"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            aria-hidden="true"
          >
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
            <circle cx="12" cy="12" r="3" />
          </svg>
          Live Preview
        </button>

        <button
          type="button"
          className="template-card__btn template-card__btn--select"
          onClick={handleUseClick}
          aria-label={`Select ${template.name}`}
        >
          Use Template
        </button>

        {canEdit && !template.isCatalog && (
          <button
            type="button"
            className="template-card__btn template-card__btn--edit"
            onClick={(e) => {
              e.stopPropagation();
              router.push(`/templates/${template.id}/edit`);
            }}
            title="Edit database template"
          >
            Edit
          </button>
        )}
      </div>
    </div>
  );
}
