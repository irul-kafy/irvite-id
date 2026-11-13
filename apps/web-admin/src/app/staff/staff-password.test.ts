import test from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';

test('Staff Password Validation Policy Contract Tests', async (t) => {
  const staffClientPath = path.resolve(__dirname, 'StaffClient.tsx');
  assert.ok(fs.existsSync(staffClientPath), 'StaffClient.tsx must exist');

  const content = fs.readFileSync(staffClientPath, 'utf8');

  await t.test('1. StaffClient enforces minimal 8 characters for new staff password', () => {
    assert.ok(
      content.includes('createPassword.length < 8'),
      'Must check createPassword.length < 8'
    );
    assert.ok(
      content.includes('"Password minimal 8 karakter."'),
      'Must show "Password minimal 8 karakter." error'
    );
    assert.ok(
      !content.includes('createPassword.length < 12'),
      'Must not check createPassword.length < 12'
    );
  });

  await t.test('2. StaffClient enforces minimal 8 characters for password reset', () => {
    assert.ok(
      content.includes('newPassword.length < 8'),
      'Must check newPassword.length < 8'
    );
    assert.ok(
      content.includes('"Password baru minimal 8 karakter."'),
      'Must show "Password baru minimal 8 karakter." error'
    );
    assert.ok(
      !content.includes('newPassword.length < 12'),
      'Must not check newPassword.length < 12'
    );
  });

  await t.test('3. UI labels and helper hints reflect 8 characters policy', () => {
    assert.ok(
      content.includes('Password Akun (Minimal 8 Karakter)'),
      'Label for create password must state Minimal 8 Karakter'
    );
    assert.ok(
      content.includes('Gunakan kombinasi huruf dan angka minimal 8 karakter.'),
      'Helper hint must state minimal 8 karakter'
    );
    assert.ok(
      content.includes('Password Baru (Minimal 8 Karakter)'),
      'Label for reset password must state Minimal 8 Karakter'
    );
    assert.ok(
      !content.includes('minimal 12 karakter'),
      'No helper text should reference 12 karakter'
    );
  });
});

