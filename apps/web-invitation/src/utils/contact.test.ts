import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getPublicWhatsAppNumber,
  getTemplateOrderUrl,
  getGeneralContactUrl,
  FORBIDDEN_PLACEHOLDER_NUMBER,
} from './contact';

test('Public WhatsApp Contact & Order Helper Contract', async (t) => {
  const origWa = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER;
  const origContact = process.env.NEXT_PUBLIC_CONTACT_PHONE;

  t.afterEach(() => {
    process.env.NEXT_PUBLIC_WHATSAPP_NUMBER = origWa;
    process.env.NEXT_PUBLIC_CONTACT_PHONE = origContact;
  });

  await t.test('configured contact: returns encoded order URL containing selected template name', () => {
    process.env.NEXT_PUBLIC_WHATSAPP_NUMBER = '6281198765432';

    const url = getTemplateOrderUrl('Ivory Garden');
    assert.ok(url, 'Order URL must not be null');
    assert.ok(url?.startsWith('https://wa.me/6281198765432?text='));
    assert.ok(url?.includes('Ivory%20Garden'));
    assert.ok(!url?.includes('undefined'));
    assert.ok(!url?.includes('null'));
  });

  await t.test('different template names produce correctly encoded distinct messages', () => {
    process.env.NEXT_PUBLIC_WHATSAPP_NUMBER = '6281198765432';

    const urlIvory = getTemplateOrderUrl('Ivory Garden');
    const urlSerene = getTemplateOrderUrl('Serene Garden');
    const urlSunda = getTemplateOrderUrl('Sunda Puspa');

    assert.ok(urlIvory?.includes('Ivory%20Garden'));
    assert.ok(urlSerene?.includes('Serene%20Garden'));
    assert.ok(urlSunda?.includes('Sunda%20Puspa'));

    assert.notEqual(urlIvory, urlSerene);
    assert.notEqual(urlSerene, urlSunda);
  });

  await t.test('sanitizes input with formatting characters (+, spaces, dashes)', () => {
    process.env.NEXT_PUBLIC_WHATSAPP_NUMBER = '+62 811-9876-5432';

    const phone = getPublicWhatsAppNumber();
    assert.equal(phone, '6281198765432');

    const url = getTemplateOrderUrl('Serene Garden');
    assert.ok(url?.startsWith('https://wa.me/6281198765432?text='));
  });

  await t.test('strictly rejects placeholder number 6281234567890 (fails closed)', () => {
    process.env.NEXT_PUBLIC_WHATSAPP_NUMBER = FORBIDDEN_PLACEHOLDER_NUMBER;

    assert.equal(getPublicWhatsAppNumber(), null, 'Must return null for prohibited placeholder');
    assert.equal(getTemplateOrderUrl('Ivory Garden'), null, 'Order URL must fail closed when placeholder is configured');
    assert.equal(getGeneralContactUrl(), null, 'General contact must fail closed when placeholder is configured');
  });

  await t.test('missing contact configuration: does not use placeholder phone number and fails safely', () => {
    delete process.env.NEXT_PUBLIC_WHATSAPP_NUMBER;
    delete process.env.NEXT_PUBLIC_CONTACT_PHONE;

    assert.equal(getPublicWhatsAppNumber(), null);
    assert.equal(getTemplateOrderUrl('Ivory Garden'), null);
    assert.equal(getGeneralContactUrl(), null);
  });

  await t.test('no generated order URL contains 6281234567890 unless explicitly configured externally', () => {
    // 1. Missing env
    delete process.env.NEXT_PUBLIC_WHATSAPP_NUMBER;
    delete process.env.NEXT_PUBLIC_CONTACT_PHONE;
    assert.equal(getTemplateOrderUrl('Ivory Garden'), null);

    // 2. Real phone configured
    process.env.NEXT_PUBLIC_WHATSAPP_NUMBER = '6289876543210';
    const url = getTemplateOrderUrl('Ivory Garden');
    assert.ok(url);
    assert.ok(!url.includes(FORBIDDEN_PLACEHOLDER_NUMBER), 'URL must not contain forbidden placeholder');

    // 3. Prohibited placeholder configured -> must fail closed to null
    process.env.NEXT_PUBLIC_WHATSAPP_NUMBER = FORBIDDEN_PLACEHOLDER_NUMBER;
    assert.equal(getTemplateOrderUrl('Ivory Garden'), null);
  });

  await t.test('rejects too short or malformed phone numbers', () => {
    process.env.NEXT_PUBLIC_WHATSAPP_NUMBER = '12345'; // Too short
    assert.equal(getPublicWhatsAppNumber(), null);

    process.env.NEXT_PUBLIC_WHATSAPP_NUMBER = 'invalid-phone'; // No digits
    assert.equal(getPublicWhatsAppNumber(), null);
  });

  await t.test('rejects empty or whitespace-only template display names', () => {
    process.env.NEXT_PUBLIC_WHATSAPP_NUMBER = '6281198765432';

    assert.equal(getTemplateOrderUrl(''), null);
    assert.equal(getTemplateOrderUrl('   '), null);
    // @ts-expect-error Invalid argument
    assert.equal(getTemplateOrderUrl(null), null);
  });

  await t.test('general contact URL helper supports default and custom messages', () => {
    process.env.NEXT_PUBLIC_WHATSAPP_NUMBER = '6281198765432';

    const defaultUrl = getGeneralContactUrl();
    assert.ok(defaultUrl?.startsWith('https://wa.me/6281198765432?text='));
    assert.ok(defaultUrl?.includes('tertarik'));

    const customUrl = getGeneralContactUrl('Halo tim IRVITE, saya butuh bantuan.');
    assert.ok(customUrl?.includes('bantuan'));
  });
});
