import { detectDuplicates } from './duplicate-detector';

describe('duplicate-detector', () => {
  it('detects no duplicates when all items and database are distinct', () => {
    const items = [
      {
        sourceRow: 2,
        name: 'Budi Santoso',
        phoneNumber: '6281234567890',
        email: 'budi@test.com',
      },
      {
        sourceRow: 3,
        name: 'Siti Rahma',
        phoneNumber: '6281987654321',
        email: 'siti@test.com',
      },
    ];
    const existing = [
      {
        id: 'g1',
        name: 'Andi Pratama',
        phoneNumber: '62811111111',
        email: 'andi@test.com',
      },
    ];

    const results = detectDuplicates(items, existing);
    expect(results.get(2)?.isDuplicate).toBe(false);
    expect(results.get(3)?.isDuplicate).toBe(false);
  });

  it('detects match against existing database guest by name, phone, or email', () => {
    const items = [
      {
        sourceRow: 2,
        name: 'Budi Santoso',
        phoneNumber: '6281234567890',
        email: 'budi@test.com',
      },
      {
        sourceRow: 3,
        name: 'Bambang',
        phoneNumber: '62811111111',
        email: 'bambang@test.com',
      },
      {
        sourceRow: 4,
        name: 'Citra',
        phoneNumber: '62855555555',
        email: 'andi@test.com',
      },
    ];
    const existing = [
      {
        id: 'g1',
        name: 'budi santoso',
        phoneNumber: '62899999999',
        email: 'other@test.com',
      },
      {
        id: 'g2',
        name: 'Rina',
        phoneNumber: '62811111111',
        email: 'rina@test.com',
      },
      {
        id: 'g3',
        name: 'Andi',
        phoneNumber: '62877777777',
        email: 'andi@test.com',
      },
    ];

    const results = detectDuplicates(items, existing);
    expect(results.get(2)?.isDuplicate).toBe(true);
    expect(results.get(2)?.duplicateReasons[0]).toContain(
      'Nama sama dengan tamu terdaftar',
    );

    expect(results.get(3)?.isDuplicate).toBe(true);
    expect(results.get(3)?.duplicateReasons[0]).toContain(
      'No. WhatsApp sama dengan tamu terdaftar',
    );

    expect(results.get(4)?.isDuplicate).toBe(true);
    expect(results.get(4)?.duplicateReasons[0]).toContain(
      'Email sama dengan tamu terdaftar',
    );
  });

  it('detects internal file duplicates across rows', () => {
    const items = [
      {
        sourceRow: 2,
        name: 'Budi Santoso',
        phoneNumber: '6281234567890',
        email: 'budi@test.com',
      },
      {
        sourceRow: 3,
        name: 'budi santoso',
        phoneNumber: '62899999999',
        email: 'budi2@test.com',
      },
      {
        sourceRow: 4,
        name: 'Dewi',
        phoneNumber: '6281234567890',
        email: 'dewi@test.com',
      },
    ];

    const results = detectDuplicates(items, []);
    expect(results.get(2)?.isDuplicate).toBe(false); // first occurrence is fine

    expect(results.get(3)?.isDuplicate).toBe(true);
    expect(results.get(3)?.duplicateReasons[0]).toContain(
      'Nama duplikat dengan Baris 2',
    );

    expect(results.get(4)?.isDuplicate).toBe(true);
    expect(results.get(4)?.duplicateReasons[0]).toContain(
      'No. WhatsApp duplikat dengan Baris 2',
    );
  });
  it('detects duplicate across phone number format variants (08..., 628..., +628..., 8...)', () => {
    const existing = [
      {
        id: 'g-existing-1',
        name: 'Existing Guest',
        phoneNumber: '081234567890', // stored in standard format
        email: 'exist@test.com',
      },
    ];

    const variants = [
      { sourceRow: 2, name: 'Variant 1', phoneNumber: '6281234567890' },
      { sourceRow: 3, name: 'Variant 2', phoneNumber: '+6281234567890' },
      { sourceRow: 4, name: 'Variant 3', phoneNumber: '81234567890' },
      { sourceRow: 5, name: 'Variant 4', phoneNumber: '081234567890' },
    ];

    const results = detectDuplicates(variants, existing);
    for (let r = 2; r <= 5; r++) {
      const res = results.get(r);
      expect(res?.isDuplicate).toBe(true);
      expect(res?.duplicateReasons[0]).toContain(
        'No. WhatsApp sama dengan tamu terdaftar',
      );
    }
  });

  it('detects duplicate across phone number format variants within uploaded file', () => {
    const items = [
      { sourceRow: 2, name: 'Guest A', phoneNumber: '081234567890' },
      { sourceRow: 3, name: 'Guest B', phoneNumber: '+6281234567890' },
      { sourceRow: 4, name: 'Guest C', phoneNumber: '81234567890' },
      { sourceRow: 5, name: 'Guest D', phoneNumber: '6281234567890' },
    ];

    const results = detectDuplicates(items, []);
    expect(results.get(2)?.isDuplicate).toBe(false); // First is original
    expect(results.get(3)?.isDuplicate).toBe(true);
    expect(results.get(3)?.duplicateReasons[0]).toContain(
      'No. WhatsApp duplikat dengan Baris 2',
    );
    expect(results.get(4)?.isDuplicate).toBe(true);
    expect(results.get(4)?.duplicateReasons[0]).toContain(
      'No. WhatsApp duplikat dengan Baris 2',
    );
    expect(results.get(5)?.isDuplicate).toBe(true);
    expect(results.get(5)?.duplicateReasons[0]).toContain(
      'No. WhatsApp duplikat dengan Baris 2',
    );
  });
});
