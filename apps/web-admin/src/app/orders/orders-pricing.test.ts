import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { getPackageDisplayLabel } from 'pricing';

test('Admin Orders page displays package breakdown, UNSELECTED badge, and editable Harga Final (Rp) field', () => {
  const ordersPagePath = path.resolve(__dirname, './page.tsx');
  const content = fs.readFileSync(ordersPagePath, 'utf8');

  assert.equal(getPackageDisplayLabel('UNSELECTED'), 'Paket belum dipilih');
  assert.equal(getPackageDisplayLabel('SACRED'), 'Sacred');
  assert.equal(getPackageDisplayLabel('CUSTOM'), 'Rakit Sendiri (Custom)');

  assert.ok(
    content.includes('Paket belum dipilih'),
    'Must highlight UNSELECTED orders with Paket belum dipilih badge',
  );
  assert.ok(
    content.includes('Harga Final (Rp)'),
    'Must render editable Harga Final (Rp) input in admin order modal',
  );
  assert.ok(
    content.includes('computedTotal'),
    'Must display options.computedTotal alongside final priceAmount',
  );
  assert.ok(
    content.includes('lineItems'),
    'Must display itemized lineItems breakdown in admin order list and modal',
  );
});
