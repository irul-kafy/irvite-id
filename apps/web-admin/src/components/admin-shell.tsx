'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { applyTheme, getCurrentTheme } from '../utils/apply-theme';
import { NotificationBell } from './notification-bell';

// ── SVG Icons ──────────────────────────────────────────────────────────────────

function IconDashboard({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="2" y="2" width="7" height="7" rx="1.5" fill="currentColor" opacity="0.3"/>
      <rect x="11" y="2" width="7" height="7" rx="1.5" fill="currentColor"/>
      <rect x="2" y="11" width="7" height="7" rx="1.5" fill="currentColor"/>
      <rect x="11" y="11" width="7" height="7" rx="1.5" fill="currentColor" opacity="0.3"/>
    </svg>
  );
}

function IconEvents({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="2" y="4" width="16" height="14" rx="2" stroke="currentColor" strokeWidth="1.6" fill="none"/>
      <path d="M6 2v4M14 2v4M2 8h16" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
      <rect x="5" y="11" width="3" height="3" rx="0.75" fill="currentColor"/>
      <rect x="8.5" y="11" width="3" height="3" rx="0.75" fill="currentColor" opacity="0.4"/>
      <rect x="12" y="11" width="3" height="3" rx="0.75" fill="currentColor" opacity="0.4"/>
    </svg>
  );
}

function IconTemplates({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="2" y="2" width="16" height="16" rx="2" stroke="currentColor" strokeWidth="1.6" fill="none"/>
      <path d="M2 7h16" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
      <path d="M7 7v11" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
      <rect x="9.5" y="9.5" width="5" height="2" rx="1" fill="currentColor" opacity="0.5"/>
      <rect x="9.5" y="13" width="3.5" height="2" rx="1" fill="currentColor" opacity="0.3"/>
    </svg>
  );
}

function IconStaff({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M10 9a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zM3 17.5a7 7 0 0 1 14 0" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  );
}

function IconOrders({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M4 4h12l1 13H3L4 4z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round"/>
      <path d="M7 6V4a3 3 0 0 1 6 0v2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
    </svg>
  );
}

function IconActivityLog({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M3 4.5A1.5 1.5 0 0 1 4.5 3h11A1.5 1.5 0 0 1 17 4.5v11a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 3 15.5v-11z" stroke="currentColor" strokeWidth="1.6"/>
      <path d="M6 7h8M6 10h8M6 13h5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
    </svg>
  );
}

function IconLogout({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M7 3H4a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1h3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
      <path d="M13 14l3-4-3-4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M7 10h9" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
    </svg>
  );
}

function IconMenu({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg className={className} style={style} viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M3 5h14M3 10h14M3 15h14" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
    </svg>
  );
}

function IconX({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg className={className} style={style} viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M5 5l10 10M15 5L5 15" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
    </svg>
  );
}

function IconSun() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="5" />
      <line x1="12" y1="1" x2="12" y2="3" />
      <line x1="12" y1="21" x2="12" y2="23" />
      <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
      <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
      <line x1="1" y1="12" x2="3" y2="12" />
      <line x1="21" y1="12" x2="23" y2="12" />
      <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
      <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
    </svg>
  );
}

function IconMoon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  );
}

function ThemeToggle() {
  const [theme, setTheme] = useState<'light' | 'dark' | null>(null);

  useEffect(() => {
    const isDark = document.documentElement.classList.contains('dark');
    queueMicrotask(() => {
      setTheme(isDark ? 'dark' : 'light');
    });
  }, []);

  const toggle = () => {
    const next = getCurrentTheme() === 'dark' ? 'light' : 'dark';
    applyTheme(next);
    setTheme(next);
  };

  return (
    <button
      id="admin-theme-toggle"
      type="button"
      onClick={toggle}
      className="admin-header__theme-btn"
      aria-label={theme === 'dark' ? 'Ganti ke mode terang' : 'Ganti ke mode gelap'}
      title={theme === 'dark' ? 'Mode Terang' : 'Mode Gelap'}
    >
      {theme === 'dark' ? <IconSun /> : <IconMoon />}
    </button>
  );
}

function IconBranding({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M4 21V10C4 5.58172 7.58172 2 12 2C16.4183 2 20 5.58172 20 10V21" stroke="#C4A06A" strokeWidth="2" strokeLinecap="round"/>
      <path d="M8 21V12C8 9.79086 9.79086 8 12 8C14.2091 8 16 9.79086 16 12V21" stroke="#C4A06A" strokeWidth="1.5" strokeLinecap="round" opacity="0.8"/>
      <circle cx="12" cy="14" r="1.5" fill="#C4A06A"/>
    </svg>
  );
}

// ── Nav items config ───────────────────────────────────────────────────────────

interface NavItem {
  id: string;
  label: string;
  href: string;
  icon: (props: { className?: string }) => React.JSX.Element;
  badge?: string;
}

const NAV_ITEMS: readonly NavItem[] = [
  {
    id: 'system-check',
    label: 'Pengecekan Sistem',
    href: '/dashboard/system-check',
    icon: IconDashboard,
  },
  {
    id: 'dashboard',
    label: 'Dashboard',
    href: '/dashboard',
    icon: IconDashboard,
  },
  {
    id: 'events',
    label: 'Events',
    href: '/events',
    icon: IconEvents,
  },
  {
    id: 'orders',
    label: 'Pesanan',
    href: '/orders',
    icon: IconOrders,
  },
  {
    id: 'activity-logs',
    label: 'Log Aktivitas',
    href: '/activity-logs',
    icon: IconActivityLog,
  },
  {
    id: 'templates',
    label: 'Templates',
    href: '/templates',
    icon: IconTemplates,
  },
  {
    id: 'staff',
    label: 'Staff',
    href: '/staff',
    icon: IconStaff,
  },
];

// ── Breadcrumb helper ──────────────────────────────────────────────────────────

function useBreadcrumb(pathname: string) {
  const segments = pathname.split('/').filter(Boolean);
  const crumbs = segments.map((seg, i) => {
    const href = '/' + segments.slice(0, i + 1).join('/');
    const isUuid = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(seg);
    let label =
      seg.charAt(0).toUpperCase() + seg.slice(1).replace(/-/g, ' ');
    if (isUuid) {
      label = `ID: ${seg.slice(0, 8)}…`;
    }
    return { label, href };
  });
  return crumbs;
}

// ── Persistent Auth Session Cache ─────────────────────────────────────────────
// Keeps the navigation items stable across route transitions so they don't flicker or re-render.

interface AuthSessionData {
  role: string | null;
  email: string | null;
}

let memoryAuthCache: AuthSessionData | null = null;

function readCachedAuth(): AuthSessionData {
  if (memoryAuthCache) return memoryAuthCache;
  if (typeof window !== 'undefined') {
    try {
      const stored = sessionStorage.getItem('irvite_admin_auth');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed && typeof parsed === 'object') {
          memoryAuthCache = {
            role: parsed.role || null,
            email: parsed.email || null,
          };
          return memoryAuthCache;
        }
      }
    } catch {
      // ignore
    }
  }
  return { role: null, email: null };
}

function writeCachedAuth(role: string | null, email: string | null) {
  memoryAuthCache = { role, email };
  if (typeof window !== 'undefined') {
    try {
      if (role || email) {
        sessionStorage.setItem('irvite_admin_auth', JSON.stringify({ role, email }));
      } else {
        sessionStorage.removeItem('irvite_admin_auth');
      }
    } catch {
      // ignore
    }
  }
}

// ── Main Shell Component ───────────────────────────────────────────────────────

export default function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Initial state is null on both SSR and client initial render to ensure 100% hydration match
  const [userRole, setUserRole] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);

  // Optimistic pending path for instant 0ms visual feedback on navigation clicks
  const [pendingPath, setPendingPath] = useState<string | null>(null);

  // Reset optimistic state whenever real pathname catches up
  useEffect(() => {
    const timer = setTimeout(() => setPendingPath(null), 0);
    return () => clearTimeout(timer);
  }, [pathname]);

  const breadcrumbs = useBreadcrumb(pathname);

  // Restore cached auth immediately on mount, then revalidate in background
  useEffect(() => {
    const cached = readCachedAuth();
    const cacheTimer = setTimeout(() => {
      if (cached.role) setUserRole(cached.role);
      if (cached.email) setUserEmail(cached.email);
    }, 0);
    let isMounted = true;
    fetch('/api/auth/me')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (isMounted && data?.user) {
          const role = data.user.role || null;
          const email = data.user.email || null;
          writeCachedAuth(role, email);
          setUserRole(role);
          setUserEmail(email);
        }
      })
      .catch(() => {
        // ignore
      });
    return () => {
      clearTimeout(cacheTimer);
      isMounted = false;
    };
  }, []);

  const navItems = NAV_ITEMS.filter((item) => {
    if (userRole === 'STAFF') {
      return item.id === 'events';
    }
    if (item.id === 'orders' || item.id === 'activity-logs') {
      return userRole === 'SUPER_ADMIN' || userRole === 'ADMIN';
    }
    if (item.id === 'system-check') {
      return userRole === 'SUPER_ADMIN' || userRole === 'ADMIN';
    }
    if (item.id === 'staff') {
      return userRole === 'SUPER_ADMIN';
    }
    return true;
  });

  // Pre-warm client route cache for all accessible navigation destinations
  useEffect(() => {
    navItems.forEach((item) => {
      try {
        router.prefetch(item.href);
      } catch {
        // ignore
      }
    });
  }, [router, navItems]);

  // Close sidebar on route change
  const [prevPathname, setPrevPathname] = useState(pathname);
  if (prevPathname !== pathname) {
    setPrevPathname(pathname);
    setSidebarOpen(false);
  }

  // Close sidebar on ESC
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSidebarOpen(false);
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, []);

  const handleLogout = async () => {
    writeCachedAuth(null, null);
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
  };

  const handleNavClick = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    // Normal primary click without modifier keys
    if (!e.metaKey && !e.ctrlKey && !e.shiftKey && !e.altKey && e.button === 0) {
      if (href !== pathname) {
        setPendingPath(href);
        setSidebarOpen(false);
        router.push(href);
        e.preventDefault();
      } else {
        setSidebarOpen(false);
        e.preventDefault();
      }
    }
  };

  const handleWarmRoute = (href: string) => {
    try {
      router.prefetch(href);
    } catch {
      // ignore
    }
  };

  const activePath = pendingPath || pathname;

  const isActive = (href: string) => {
    if (href === '/dashboard') return activePath === '/dashboard';
    return activePath.startsWith(href);
  };

  const userInitial = userEmail
    ? userEmail.trim().charAt(0).toUpperCase()
    : (userRole ? userRole.charAt(0).toUpperCase() : 'A');

  const userTitle = userEmail
    ? `${userEmail} (${userRole === 'STAFF' ? 'Staf Lapangan' : userRole || 'User'})`
    : 'Admin User';

  return (
    <div className="admin-shell">
      {/* Sleek top navigation progress bar when transitioning */}
      {pendingPath && (
        <div className="admin-nav-progress" aria-hidden="true" />
      )}

      {/* Sidebar overlay (mobile) */}
      {sidebarOpen && (
        <div
          className="admin-sidebar-overlay"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* ── Sidebar ── */}
      <aside
        className={`admin-sidebar${sidebarOpen ? ' admin-sidebar--open' : ''}`}
        aria-label="Main navigation"
      >
        {/* Brand */}
        <div className="admin-sidebar__header">
          <div className="admin-sidebar__brand">
            <div className="admin-sidebar__logo" aria-hidden="true">
              <IconBranding size={18} />
            </div>
            <div>
              <div className="admin-sidebar__brand-name">irvite</div>
              <div className="admin-sidebar__brand-sub">Admin Console</div>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="admin-sidebar__nav" aria-label="Sidebar navigation" suppressHydrationWarning>
          <div className="admin-sidebar__section-label">Navigation</div>

          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);
            return (
              <Link
                key={item.id}
                href={item.href}
                prefetch={true}
                id={`nav-${item.id}`}
                className={`admin-sidebar__link${active ? ' admin-sidebar__link--active' : ''}`}
                aria-current={active ? 'page' : undefined}
                onClick={(e) => handleNavClick(e, item.href)}
                onMouseEnter={() => handleWarmRoute(item.href)}
              >
                <Icon className="admin-sidebar__link-icon" />
                {item.label}
                {item.badge && (
                  <span className="admin-sidebar__badge">{item.badge}</span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Footer / Logout */}
        <div className="admin-sidebar__footer">
          <button
            id="nav-logout"
            className="admin-sidebar__link"
            style={{ width: '100%', background: 'none', border: 'none', textAlign: 'left' }}
            onClick={handleLogout}
            type="button"
          >
            <IconLogout className="admin-sidebar__link-icon" />
            Logout
          </button>
        </div>
      </aside>

      {/* ── Main content ── */}
      <div className="admin-main">
        {/* Topbar / Header */}
        <header className="admin-header">
          <button
            className="admin-header__mobile-toggle"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            aria-label={sidebarOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={sidebarOpen}
            type="button"
          >
            {sidebarOpen ? (
              <IconX style={{ width: 18, height: 18 }} />
            ) : (
              <IconMenu style={{ width: 18, height: 18 }} />
            )}
          </button>

          {/* Breadcrumb */}
          <nav className="admin-header__breadcrumb" aria-label="Breadcrumb">
            {pathname === '/dashboard' ? (
              <span className="admin-header__breadcrumb-item admin-header__breadcrumb-item--active">
                Dashboard
              </span>
            ) : (
              <>
                <Link
                  href="/dashboard"
                  prefetch={true}
                  className="admin-header__breadcrumb-item"
                  onClick={(e) => handleNavClick(e, '/dashboard')}
                  onMouseEnter={() => handleWarmRoute('/dashboard')}
                >
                  Dashboard
                </Link>
                {breadcrumbs
                  .filter((crumb) => crumb.href !== '/dashboard')
                  .map((crumb, i, arr) => (
                    <span key={crumb.href} className="flex-center" style={{ gap: '0.375rem' }}>
                      <span className="admin-header__breadcrumb-sep" aria-hidden="true">/</span>
                      {i === arr.length - 1 ? (
                        <span className="admin-header__breadcrumb-item admin-header__breadcrumb-item--active">
                          {crumb.label}
                        </span>
                      ) : (
                        <Link
                          href={crumb.href}
                          prefetch={true}
                          className="admin-header__breadcrumb-item"
                          onClick={(e) => handleNavClick(e, crumb.href)}
                          onMouseEnter={() => handleWarmRoute(crumb.href)}
                        >
                          {crumb.label}
                        </Link>
                      )}
                    </span>
                  ))}
              </>
            )}
          </nav>

          {/* Right actions */}
          <div className="admin-header__actions">
            <NotificationBell />
            <ThemeToggle />
            <div
              className="admin-header__avatar"
              suppressHydrationWarning
              title={userTitle}
              aria-label={`Akun: ${userTitle}`}
            >
              {userInitial}
            </div>
          </div>
        </header>

        {/* Page content */}
        <main id="main-content" className={`admin-page${pendingPath ? ' admin-page--transitioning' : ''}`}>
          {children}
        </main>
      </div>
    </div>
  );
}
