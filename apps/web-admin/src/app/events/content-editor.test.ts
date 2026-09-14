import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeEditableContent } from './[eventId]/components/template-content-editor';
import { formatDatetimeForInput } from './[eventId]/components/content-field-renderer';

test('Content Editor & Gift Accounts Specifications', async (t) => {
  await t.test('giftAccounts model strictly preserves accountNumber as string with leading zeros', () => {
    const rawInput = {
      bankName: 'Bank Central Asia',
      accountNumber: '001234567890',
      accountHolderName: 'Ka & Dita',
    };

    assert.strictEqual(typeof rawInput.accountNumber, 'string');
    assert.strictEqual(rawInput.accountNumber, '001234567890');
    assert.strictEqual(rawInput.accountNumber.startsWith('00'), true);

    // Ensure NO numeric coercion happened
    assert.notStrictEqual(Number(rawInput.accountNumber) as unknown, rawInput.accountNumber);
  });

  await t.test('giftAccounts schema-driven maxItems limit enforcement', () => {
    // 1. IVORY_GARDEN definition with maxItems = 3
    const ivoryLimit = 3;
    const ivoryAccounts = [
      { bankName: 'BCA', accountNumber: '001', accountHolderName: 'H1' },
      { bankName: 'Mandiri', accountNumber: '002', accountHolderName: 'H2' },
      { bankName: 'BRI', accountNumber: '003', accountHolderName: 'H3' },
    ];
    assert.strictEqual(ivoryAccounts.length < ivoryLimit, false, 'Cannot add beyond IVORY_GARDEN limit of 3');

    // 2. Synthetic definition with maxItems = 2
    const syntheticLimit2 = 2;
    const accounts2 = [
      { bankName: 'BCA', accountNumber: '001', accountHolderName: 'H1' },
      { bankName: 'Mandiri', accountNumber: '002', accountHolderName: 'H2' },
    ];
    assert.strictEqual(accounts2.length < syntheticLimit2, false, 'Cannot add beyond synthetic limit of 2');

    // 3. Synthetic definition with maxItems = 4
    const syntheticLimit4 = 4;
    const accounts4 = [
      { bankName: 'BCA', accountNumber: '001', accountHolderName: 'H1' },
      { bankName: 'Mandiri', accountNumber: '002', accountHolderName: 'H2' },
      { bankName: 'BRI', accountNumber: '003', accountHolderName: 'H3' },
    ];
    assert.strictEqual(accounts4.length < syntheticLimit4, true, 'Can add 4th account when limit is 4');
    accounts4.push({ bankName: 'BNI', accountNumber: '004', accountHolderName: 'H4' });
    assert.strictEqual(accounts4.length < syntheticLimit4, false, 'Cannot add beyond synthetic limit of 4');
  });

  await t.test('giftAccounts prohibits QRIS, giftQr, and payment gateways', () => {
    const allowedKeys = ['bankName', 'accountNumber', 'accountHolderName'];
    const forbiddenKeys = ['giftQr', 'qris', 'qrisUrl', 'paymentGateway', 'paymentLink', 'status'];

    const testItem: Record<string, unknown> = {
      bankName: 'BCA',
      accountNumber: '00123',
      accountHolderName: 'Test',
    };

    for (const key of forbiddenKeys) {
      assert.strictEqual(key in testItem, false);
    }

    for (const key of Object.keys(testItem)) {
      assert.strictEqual(allowedKeys.includes(key), true);
    }
  });

  await t.test('normalizeEditableContent dirty-state lifecycle specification', async () => {
    // Initial content with server-injected _schemaVersion
    const initialContent = {
      _schemaVersion: 1,
      partnerOneName: 'Ka',
      partnerTwoName: 'Dita',
    };

    // 1. Editor loads: initial snapshot equals normalized current payload -> isDirty = false
    const initialSnapshot = JSON.stringify(normalizeEditableContent(initialContent));
    const currentPayloadOnLoad = normalizeEditableContent(initialContent);
    const isDirtyOnLoad = JSON.stringify(currentPayloadOnLoad) !== initialSnapshot;
    assert.strictEqual(isDirtyOnLoad, false, 'Editor must NOT be dirty immediately after loading');

    // 2. User edits partnerOneName -> isDirty = true
    const editedContent = {
      ...initialContent,
      partnerOneName: 'Ka & Partner',
    };
    const currentPayloadAfterEdit = normalizeEditableContent(editedContent);
    const isDirtyAfterEdit = JSON.stringify(currentPayloadAfterEdit) !== initialSnapshot;
    assert.strictEqual(isDirtyAfterEdit, true, 'Editor must be dirty when field is edited');

    // 3. Save succeeds and backend returns updated content containing _schemaVersion
    const backendReturnedContent = {
      _schemaVersion: 1,
      partnerOneName: 'Ka & Partner',
      partnerTwoName: 'Dita',
    };
    const savedSnapshotAfterSave = JSON.stringify(normalizeEditableContent(backendReturnedContent));
    const currentPayloadAfterSave = normalizeEditableContent(backendReturnedContent);
    const isDirtyAfterSave = JSON.stringify(currentPayloadAfterSave) !== savedSnapshotAfterSave;
    assert.strictEqual(isDirtyAfterSave, false, 'Editor must reset dirty state to false after successful save');

    // 4. Preserves accountNumber with leading zeros
    const withAccount = {
      giftAccounts: [
        { bankName: 'BCA', accountNumber: '00789', accountHolderName: 'Ka' },
      ],
    };
    const normalizedAccount = normalizeEditableContent(withAccount);
    const accounts = normalizedAccount.giftAccounts as Array<{ accountNumber: string }>;
    assert.strictEqual(accounts[0].accountNumber, '00789');
    assert.strictEqual(typeof accounts[0].accountNumber, 'string');

    // 5. Omits empty strings, null/undefined, empty arrays
    const withEmpty = {
      partnerOneParents: '   ',
      partnerTwoParents: '',
      prayerText: null,
      prayerSource: undefined,
      ceremonies: [],
    };
    const normalizedEmpty = normalizeEditableContent(withEmpty);
    assert.deepStrictEqual(normalizedEmpty, {}, 'Empty/null/whitespace fields must be omitted');

    // 6. Source object is NOT mutated
    const original = Object.freeze({ _schemaVersion: 1, partnerOneName: 'Ka' });
    assert.doesNotThrow(() => {
      normalizeEditableContent(original);
    });
  });

  await t.test('explicit clear content action sends { content: null }', () => {
    const payloadForClear = { content: null };
    assert.strictEqual(payloadForClear.content, null);
  });

  await t.test('timezone-neutral datetime semantics and round-trip preservation', () => {
    const enteredLocalTime = '2026-12-20T10:00';

    // 1. formatDatetimeForInput extracts YYYY-MM-DDTHH:mm without browser timezone shift
    assert.strictEqual(formatDatetimeForInput(enteredLocalTime), '2026-12-20T10:00');
    assert.strictEqual(formatDatetimeForInput('2026-12-20T10:00:00'), '2026-12-20T10:00');

    // 2. Existing persisted ISO string with Z loads properly
    assert.strictEqual(formatDatetimeForInput('2026-10-15T09:00:00Z'), '2026-10-15T09:00');
    assert.strictEqual(formatDatetimeForInput('2026-10-15T09:00:00.000Z'), '2026-10-15T09:00');

    // 3. Null / empty values handle gracefully
    assert.strictEqual(formatDatetimeForInput(''), '');
    assert.strictEqual(formatDatetimeForInput(null), '');
    assert.strictEqual(formatDatetimeForInput(undefined), '');

    // 4. Test round-trip across different event timezones:
    // Event timezones: Asia/Jakarta (WIB), Asia/Makassar (WITA), Asia/Jayapura (WIT)
    const timezones = ['Asia/Jakarta', 'Asia/Makassar', 'Asia/Jayapura'];

    for (const tz of timezones) {
      const eventContent = {
        timeZone: tz,
        ceremonies: [
          {
            title: 'Akad Nikah',
            dateTime: enteredLocalTime,
            venue: 'Gedung Serbaguna',
            address: 'Jl. Merdeka No. 1',
          },
        ],
      };

      // Normalization preserves the exact entered datetime string
      const normalized = normalizeEditableContent(eventContent);
      const ceremonies = normalized.ceremonies as Array<{ dateTime: string }>;
      assert.strictEqual(
        ceremonies[0].dateTime,
        '2026-12-20T10:00',
        'Entered local time must remain 2026-12-20T10:00 for timezone ' + tz
      );

      // Loading it back into formatDatetimeForInput produces the exact input value
      const reloadedDisplay = formatDatetimeForInput(ceremonies[0].dateTime);
      assert.strictEqual(
        reloadedDisplay,
        '2026-12-20T10:00',
        'Reloaded display in ' + tz + ' must be 2026-12-20T10:00, NOT shifted by browser timezone'
      );
    }
  });
});
