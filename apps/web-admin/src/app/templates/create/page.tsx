'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { TemplateStudio } from '../components/template-studio';
import '../template-studio.css';

export default function CreateTemplatePage() {
  const router = useRouter();
  const [authorized, setAuthorized] = useState(false);
  const [loading, setLoading] = useState(true);

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

  return <TemplateStudio mode="create" />;
}
