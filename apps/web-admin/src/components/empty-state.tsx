import React from 'react';

export interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description: string;
  action?: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

export function EmptyState({
  icon = '📋',
  title,
  description,
  action,
  className = '',
  style,
}: EmptyStateProps) {
  return (
    <div
      className={`admin-empty-state ${className}`.trim()}
      style={{
        padding: '3rem 1.5rem',
        textAlign: 'center',
        background: 'var(--admin-surface, #ffffff)',
        border: '1px solid var(--admin-border, rgba(17, 24, 20, 0.1))',
        borderRadius: 'var(--radius-lg, 12px)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        boxSizing: 'border-box',
        ...style,
      }}
    >
      <div
        style={{
          fontSize: '2.5rem',
          lineHeight: 1,
          marginBottom: '0.875rem',
          userSelect: 'none',
        }}
        aria-hidden="true"
      >
        {icon}
      </div>
      <h3
        style={{
          margin: '0 0 0.35rem 0',
          fontSize: '1.05rem',
          fontWeight: 700,
          color: 'var(--text-primary, #111814)',
        }}
      >
        {title}
      </h3>
      <p
        style={{
          margin: 0,
          fontSize: '0.875rem',
          color: 'var(--text-secondary, #64748b)',
          maxWidth: '460px',
          lineHeight: 1.5,
        }}
      >
        {description}
      </p>
      {action && (
        <div style={{ marginTop: '1.25rem' }}>
          {action}
        </div>
      )}
    </div>
  );
}

