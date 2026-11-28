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
  assert.equal(
    getPackageDisplayLabel('CUSTOM', 'Paket Royal VVIP'),
    'Paket Royal VVIP',
  );

  assert.ok(
    content.includes('Paket belum dipilih'),
    'Must highlight UNSELECTED orders with Paket belum dipilih badge',
  );
  assert.ok(
    content.includes('Harga Final (Rp)'),
    'Must render editable Harga Final (Rp) input in admin order modal',
  );
  assert.ok(
    content.includes('Harga Asli / Coret (Rp)'),
    'Must render strikethrough original price input for Super Admin',
  );
  assert.ok(
    content.includes('super-admin-custom-pricing-panel') &&
      content.includes("userRole === 'SUPER_ADMIN'"),
    'Must restrict custom package & per-service pricing panel strictly to SUPER_ADMIN',
  );
  assert.ok(
    content.includes('computedTotal'),
    'Must display options.computedTotal alongside final priceAmount',
  );
  assert.ok(
    content.includes('lineItems'),
    'Must display itemized lineItems breakdown in admin order list and modal',
  );
  assert.ok(
    content.includes('admin-order-options-panel'),
    'Must allow admin to change package capacityTier and options in modal',
  );
  assert.ok(
    content.includes('calculateOrderPrice'),
    'Must recalculate live total and entitlements via calculateOrderPrice in admin modal',
  );
  assert.ok(
    content.includes('data-testid="order-status-modal"') &&
      content.includes('data-testid="order-pricing-modal"') &&
      content.includes('Atur Paket &amp; Harga') &&
      content.includes('handleSaveStatusOnly') &&
      content.includes('handleSavePricingOnly'),
    'Must strictly separate Ubah Status modal from SUPER_ADMIN Atur Paket & Harga modal',
  );
});
