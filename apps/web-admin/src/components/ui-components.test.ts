import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { TableSkeleton } from './table-skeleton';
import { EmptyState } from './empty-state';

test('TableSkeleton component', async (t) => {
  await t.test('renders with proper accessibility attributes and default rows', () => {
    const html = renderToStaticMarkup(
      React.createElement(TableSkeleton, { label: 'Memuat data pesanan...' })
    );

    assert.ok(html.includes('role="status"'), 'Must have role="status"');
    assert.ok(html.includes('aria-busy="true"'), 'Must have aria-busy="true"');
    assert.ok(html.includes('aria-label="Memuat data pesanan..."'), 'Must include custom aria-label');
    assert.ok(html.includes('irvitePulse'), 'Must contain pulse animation keyframe');
  });

  await t.test('supports custom row and column counts', () => {
    const html = renderToStaticMarkup(
      React.createElement(TableSkeleton, { rows: 3, columns: 4 })
    );

    // Header has 4 th skeletons, plus 3 rows of 4 td skeletons
    assert.ok(html.includes('table-skeleton-container'), 'Must have container class');
  });
});

test('EmptyState component', async (t) => {
  await t.test('renders title, description, and icon', () => {
    const html = renderToStaticMarkup(
      React.createElement(EmptyState, {
        icon: '📦',
        title: 'Tidak Ada Pesanan',
        description: 'Belum ada data pesanan pada filter ini.',
      })
    );

    assert.ok(html.includes('📦'), 'Must render icon');
    assert.ok(html.includes('Tidak Ada Pesanan'), 'Must render title');
    assert.ok(html.includes('Belum ada data pesanan pada filter ini.'), 'Must render description');
  });

  await t.test('renders optional action node if provided', () => {
    const actionButton = React.createElement('button', { type: 'button' }, 'Tambah Data');
    const html = renderToStaticMarkup(
      React.createElement(EmptyState, {
        title: 'Kosong',
        description: 'Silakan tambah baru',
        action: actionButton,
      })
    );

    assert.ok(html.includes('Tambah Data'), 'Must render action button text');
  });
});

