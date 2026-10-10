'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { TemplateStudio } from '../components/template-studio';
import { TemplatePackageImporter } from '../components/template-package-importer';
import '../template-studio.css';

export default function CreateTemplatePage() {
  const router = useRouter();
  const [authorized, setAuthorized] = useState(false);
  const [loading, setLoading] = useState(true);
  const [creationMode, setCreationMode] = useState<'import' | 'manual'>('import');

  useEffect(() => {
    const checkRole = async () => {
      try {
        const res = await fetch('/api/auth/me');
        if (res.status === 401) {
          router.push('/login');
          return;
        }
        if (!res.ok) {
          router.push('/templates');
          return;
        }

        const data = await res.json();
        const role = data.user?.role;

        if (role !== 'SUPER_ADMIN') {
          router.push('/templates');
          return;
        }

        setAuthorized(true);
      } catch {
        router.push('/templates');
      } finally {
        setLoading(false);
      }
    };

    checkRole();
  }, [router]);

  if (loading) {
    return (
      <div className="studio-page studio-loading">
        Checking permissions...
      </div>
    );
  }

  if (!authorized) {
    return null;
  }

  if (creationMode === 'manual') {
    return (
      <div>
        <div className="creation-mode-switch" role="tablist" aria-label="Cara menambah template">
          <button type="button" role="tab" aria-selected="false" onClick={() => setCreationMode('import')}>Impor JSON / ZIP</button>
          <button type="button" role="tab" aria-selected="true">Buat dari desain dasar</button>
        </div>
        <TemplateStudio mode="create" />
      </div>
    );
  }

  return (
    <div className="studio-page package-page">
      <header className="studio-topbar">
        <div className="studio-topbar__left">
          <button type="button" className="studio-btn studio-btn--ghost" onClick={() => router.push('/templates')}>← Katalog</button>
          <div className="studio-topbar__title-group">
            <h1 className="studio-topbar__title">Tambah Template</h1>
            <span className="studio-badge studio-badge--fixed">Import Package</span>
          </div>
        </div>
      </header>
      <div className="creation-mode-switch" role="tablist" aria-label="Cara menambah template">
        <button type="button" role="tab" aria-selected="true">Impor JSON / ZIP</button>
        <button type="button" role="tab" aria-selected="false" onClick={() => setCreationMode('manual')}>Buat dari desain dasar</button>
      </div>
      <TemplatePackageImporter />
    </div>
  );
}
