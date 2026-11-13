import React from 'react';

export interface TableSkeletonProps {
  rows?: number;
  columns?: number;
  label?: string;
  className?: string;
}

export function TableSkeleton({
  rows = 5,
  columns = 5,
  label = 'Memuat data...',
  className = '',
}: TableSkeletonProps) {
  const rowList = Array.from({ length: rows }, (_, i) => i);
  const colList = Array.from({ length: columns }, (_, i) => i);

  return (
    <div
      role="status"
      aria-busy="true"
      aria-label={label}
      className={`table-skeleton-container ${className}`.trim()}
      style={{
        padding: '1.25rem',
        background: 'var(--admin-surface, #ffffff)',
        borderRadius: 'var(--radius-lg, 12px)',
        border: '1px solid var(--admin-border, rgba(17, 24, 20, 0.1))',
        overflow: 'hidden',
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {/* Header row skeleton */}
        <div
          style={{
            display: 'flex',
            gap: '1rem',
            paddingBottom: '0.75rem',
            borderBottom: '1px solid var(--admin-border, #e2e8f0)',
          }}
        >
          {colList.map((c) => (
            <div
              key={`th-${c}`}
              style={{
                flex: c === 0 ? 1.5 : 1,
                height: '14px',
                borderRadius: '4px',
                background: 'var(--skeleton-bg, rgba(100, 116, 139, 0.15))',
                animation: 'irvitePulse 1.5s ease-in-out infinite',
              }}
            />
          ))}
        </div>

        {/* Data rows skeleton */}
        {rowList.map((r) => (
          <div
            key={`row-${r}`}
            style={{
              display: 'flex',
              gap: '1rem',
              alignItems: 'center',
              padding: '0.5rem 0',
              borderBottom: r === rows - 1 ? 'none' : '1px solid var(--admin-border, #f1f5f9)',
            }}
          >
            {colList.map((c) => (
              <div
                key={`td-${r}-${c}`}
                style={{
                  flex: c === 0 ? 1.5 : 1,
                  height: '18px',
                  borderRadius: '4px',
                  background: 'var(--skeleton-bg, rgba(100, 116, 139, 0.12))',
                  animation: 'irvitePulse 1.5s ease-in-out infinite',
                  animationDelay: `${(r * 0.1 + c * 0.05).toFixed(2)}s`,
                }}
              />
            ))}
          </div>
        ))}
      </div>

      <style>{`
        @keyframes irvitePulse {
          0%, 100% { opacity: 0.45; }
          50% { opacity: 0.95; }
        }
      `}</style>
      <span className="sr-only" style={{ position: 'absolute', width: 1, height: 1, padding: 0, margin: -1, overflow: 'hidden', clip: 'rect(0, 0, 0, 0)', border: 0 }}>
        {label}
      </span>
    </div>
  );
}

