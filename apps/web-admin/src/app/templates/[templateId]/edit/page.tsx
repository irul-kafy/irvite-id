'use client';

import React, { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import { TemplateStudio } from '../../components/template-studio';
import { TemplateConfigV1 } from '../../utils/template-studio-model';
import '../../template-studio.css';

interface EditTemplatePageProps {
  params: Promise<{ templateId: string }>;
}

interface TemplateDetail {
  id: string;
  name: string;
  themeCode: string;
  config?: TemplateConfigV1 | null;
}

export default function EditTemplatePage({ params }: EditTemplatePageProps) {
  const { templateId } = use(params);
  const router = useRouter();

  const [template, setTemplate] = useState<TemplateDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);

      try {
        // 1. Role verification
        const meRes = await fetch('/api/auth/me');
        if (meRes.status === 401) {
          router.push('/login');
          return;
        }
        if (!meRes.ok) {
          router.push('/templates');
          return;
        }

        const meData = await meRes.json();
        const role = meData.user?.role;

        if (role !== 'SUPER_ADMIN') {
          router.push('/templates');
          return;
        }

        // 2. Fetch template detail
        const tplRes = await fetch(`/api/templates/${templateId}`);
        if (tplRes.status === 401) {
          router.push('/login');
          return;
        }
        if (tplRes.status === 404) {
          setError('Template not found');
          return;
        }
        if (tplRes.status === 403) {
          router.push('/templates');
          return;
        }
        if (!tplRes.ok) {
          const errData = await tplRes.json().catch(() => ({}));
          throw new Error(errData.message || 'Failed to fetch template');
        }

        const data = await tplRes.json();
        setTemplate(data);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'An error occurred while loading the template');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [templateId, router]);

  if (loading) {
    return (
      <div className="studio-page studio-loading">
        Loading template editor...
      </div>
    );
  }

  if (error || !template) {
    return (
      <div className="studio-page studio-error-page">
        <h1 className="studio-error-page__title">Unable to load template</h1>
        <p className="studio-error-page__text">{error || 'Template not found'}</p>
        <button
          type="button"
          className="studio-btn studio-btn--secondary"
          onClick={() => router.push('/templates')}
        >
          ← Back to Template Library
        </button>
      </div>
    );
  }

  return (
    <TemplateStudio
      mode="edit"
      templateId={template.id}
      initialData={{
        name: template.name,
        themeCode: template.themeCode,
        config: template.config,
      }}
    />
  );
}
