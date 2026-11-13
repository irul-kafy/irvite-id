'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import './notification-bell.css';

export interface AdminNotificationItem {
  id: string;
  category: 'UPCOMING_EVENT' | 'CLIENT_DRAFT' | 'SHEET_SYNC' | 'READINESS';
  level: 'INFO' | 'SUCCESS' | 'WARNING' | 'URGENT';
  title: string;
  message: string;
  actionUrl: string;
  tag: string;
  tagColor: 'gold' | 'emerald' | 'amber' | 'rose' | 'blue';
  createdAt: string;
}

function IconBell() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  );
}

function IconBellCheck() {
  return (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
      <path d="m9 11 2 2 4-4" />
    </svg>
  );
}

const STORAGE_KEY = 'irvite_read_notifications';

export function NotificationBell() {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<AdminNotificationItem[]>([]);
  const [readIds, setReadIds] = useState<string[]>(() => {
    if (typeof window === 'undefined') return [];
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });
  const containerRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  // Polling notifications
  useEffect(() => {
    let isMounted = true;

    async function loadNotifications() {
      try {
        const res = await fetch('/api/notifications', { cache: 'no-store' });
        if (res.ok && isMounted) {
          const data = await res.json();
          if (Array.isArray(data.notifications)) {
            setNotifications(data.notifications);
          }
        }
      } catch {
        // Silent fail
      }
    }

    // Defer initial fetch to avoid synchronous cascading renders
    const timer = setTimeout(() => {
      void loadNotifications();
    }, 0);

    const interval = setInterval(() => {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
        void loadNotifications();
      }
    }, 45000);

    return () => {
      isMounted = false;
      clearTimeout(timer);
      clearInterval(interval);
    };
  }, []);

  // Click outside to close dropdown & Esc key handler
  useEffect(() => {
    if (!isOpen) return;

    const handlePointerOutside = (e: Event) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };

    document.addEventListener('pointerdown', handlePointerOutside);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('pointerdown', handlePointerOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const markAllAsRead = () => {
    const allIds = notifications.map((n) => n.id);
    const updated = Array.from(new Set([...readIds, ...allIds]));
    setReadIds(updated);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch {
      // Ignore
    }
  };

  const handleItemClick = (item: AdminNotificationItem) => {
    if (!readIds.includes(item.id)) {
      const updated = [...readIds, item.id];
      setReadIds(updated);
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      } catch {
        // Ignore
      }
    }
    setIsOpen(false);
    if (item.actionUrl) {
      router.push(item.actionUrl);
    }
  };

  const unreadCount = notifications.filter((n) => !readIds.includes(n.id)).length;

  const handleToggle = () => {
    setIsOpen((prev) => {
      const next = !prev;
      if (next) {
        void fetch('/api/notifications', { cache: 'no-store' })
          .then((res) => (res.ok ? res.json() : null))
          .then((data) => {
            if (data && Array.isArray(data.notifications)) {
              setNotifications(data.notifications);
            }
          })
          .catch(() => {});
      }
      return next;
    });
  };

  return (
    <div className="admin-bell-wrapper" ref={containerRef}>
      <button
        id="admin-notification-bell"
        type="button"
        className={`admin-header__bell-btn ${isOpen ? 'is-active' : ''}`}
        onClick={handleToggle}
        aria-label={unreadCount > 0 ? `Buka notifikasi (${unreadCount} belum dibaca)` : 'Buka notifikasi'}
        aria-expanded={isOpen}
        title="Notifikasi & Pengingat Event"
      >
        <IconBell />
        {unreadCount > 0 && (
          <span className="admin-bell__badge" aria-hidden="true">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <>
          <div
            className="admin-bell__backdrop"
            onClick={() => setIsOpen(false)}
            aria-hidden="true"
          />
          <div className="admin-bell__dropdown" role="dialog" aria-label="Pusat Notifikasi">
          <div className="admin-bell__header">
            <div className="admin-bell__title-row">
              <h3 className="admin-bell__title">Notifikasi</h3>
              {unreadCount > 0 && (
                <span className="admin-bell__counter-pill">
                  {unreadCount} baru
                </span>
              )}
            </div>
            {unreadCount > 0 && (
              <button
                type="button"
                className="admin-bell__mark-read"
                onClick={markAllAsRead}
              >
                Tandai semua dibaca
              </button>
            )}
          </div>

          <div className="admin-bell__list">
            {notifications.length === 0 ? (
              <div className="admin-bell__empty">
                <div className="admin-bell__empty-icon">
                  <IconBellCheck />
                </div>
                <h4 className="admin-bell__empty-title">Semua Beres!</h4>
                <p className="admin-bell__empty-desc">
                  Belum ada pengingat jadwal atau draf baru saat ini.
                </p>
              </div>
            ) : (
              notifications.map((item) => {
                const isUnread = !readIds.includes(item.id);
                return (
                  <div
                    key={item.id}
                    className={`admin-bell__item ${isUnread ? 'is-unread' : ''}`}
                    onClick={() => handleItemClick(item)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        handleItemClick(item);
                      }
                    }}
                  >
                    {isUnread && <span className="admin-bell__dot" aria-hidden="true" />}
                    <div className="admin-bell__content">
                      <span className={`admin-bell__tag admin-bell__tag--${item.tagColor || 'gold'}`}>
                        {item.tag}
                      </span>
                      <h4 className="admin-bell__item-title">{item.title}</h4>
                      <p className="admin-bell__item-desc">{item.message}</p>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {notifications.length > 0 && (
            <div className="admin-bell__footer">
              <button
                type="button"
                className="admin-bell__footer-link"
                style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}
                onClick={() => {
                  setIsOpen(false);
                  router.push('/events');
                }}
              >
                Lihat Semua Acara →
              </button>
            </div>
          )}
        </div>
        </>
      )}
    </div>
  );
}
