import test from 'node:test';
import assert from 'node:assert/strict';
import { resolvePreselectedTemplateId, TemplateOption } from './page';
import { getCanonicalTemplateDemoUrl } from '../../../utils/url';
import { getCatalogTemplateByThemeCode } from '../../templates/utils/catalog-registry';

test('Create Event Query Preselection Contract', async (t) => {
  const allowedTemplates: TemplateOption[] = [
    {
      id: '33519739-67cf-4ebd-b516-310e57f28d64',
      name: 'Ivory Garden',
      themeCode: 'IVORY_GARDEN',
      previewImageUrl: '/templates/ivory-garden/thumbnail.webp',
    },
    {
      id: '7de74f3b-5497-430a-8b63-082edd00bdcb',
      name: 'Serene Garden',
      themeCode: 'SERENE_GARDEN',
      previewImageUrl: '/templates/serene-garden/thumbnail.webp',
    },
    {
      id: '56ff47c4-919c-47bf-b959-3a2090f5283a',
      name: 'Sunda Puspa',
      themeCode: 'SUNDA_PUSPA',
      previewImageUrl: '/templates/sunda-puspa/thumbnail.webp',
    },
  ];

  await t.test('valid query templateId by UUID: exists in options and becomes selected', () => {
    const selected = resolvePreselectedTemplateId(
      '33519739-67cf-4ebd-b516-310e57f28d64',
      allowedTemplates
    );
    assert.equal(selected, '33519739-67cf-4ebd-b516-310e57f28d64');
  });

  await t.test('valid query templateId by themeCode: resolves to matching option ID', () => {
    const selected = resolvePreselectedTemplateId('SUNDA_PUSPA', allowedTemplates);
    assert.equal(selected, '56ff47c4-919c-47bf-b959-3a2090f5283a');
  });

  await t.test('valid query template by displayName: resolves to matching option ID', () => {
    const selected = resolvePreselectedTemplateId('Serene Garden', allowedTemplates);
    assert.equal(selected, '7de74f3b-5497-430a-8b63-082edd00bdcb');
  });

  await t.test('invalid query templateId: safely ignored with empty selection and no fabricated option', () => {
    const nonExistentUuid = '00000000-0000-0000-0000-000000000000';
    const selected = resolvePreselectedTemplateId(nonExistentUuid, allowedTemplates);
    assert.equal(selected, '', 'Must return empty string when ID does not exist in options');

    const unknownTheme = 'UNKNOWN_THEME';
    const selectedUnknown = resolvePreselectedTemplateId(unknownTheme, allowedTemplates);
    assert.equal(selectedUnknown, '', 'Must return empty string for unknown theme code');
  });

  await t.test('missing query parameter: preserves default empty selection', () => {
    assert.equal(resolvePreselectedTemplateId('', allowedTemplates), '');
    assert.equal(resolvePreselectedTemplateId(null, allowedTemplates), '');
    assert.equal(resolvePreselectedTemplateId(undefined, allowedTemplates), '');
    assert.equal(resolvePreselectedTemplateId('   ', allowedTemplates), '');
  });

  await t.test('empty allowed options: safely returns empty selection without throwing', () => {
    assert.equal(resolvePreselectedTemplateId('33519739-67cf-4ebd-b516-310e57f28d64', []), '');
  });
});

test('Create Event Selected Template Preview Contract', async (t) => {
  const origOrigin = process.env.NEXT_PUBLIC_INVITATION_ORIGIN;
  const origUrl = process.env.PUBLIC_INVITATION_URL;

  t.afterEach(() => {
    process.env.NEXT_PUBLIC_INVITATION_ORIGIN = origOrigin;
    process.env.PUBLIC_INVITATION_URL = origUrl;
  });

  await t.test('origin configured: selected template demo URL is canonical public URL', () => {
    process.env.NEXT_PUBLIC_INVITATION_ORIGIN = 'https://invitation.example.test';

    const matched = getCatalogTemplateByThemeCode('IVORY_GARDEN');
    assert.ok(matched);

    const demoUrl = getCanonicalTemplateDemoUrl(matched?.demoPath);
    assert.equal(demoUrl, 'https://invitation.example.test/templates/ivory-garden/demo');
  });

  await t.test('origin missing: selected template demo URL fails closed with null (no admin-relative fallback)', () => {
    delete process.env.NEXT_PUBLIC_INVITATION_ORIGIN;
    delete process.env.PUBLIC_INVITATION_URL;

    const matched = getCatalogTemplateByThemeCode('SUNDA_PUSPA');
    assert.ok(matched);

    const demoUrl = getCanonicalTemplateDemoUrl(matched?.demoPath);
    assert.equal(demoUrl, null, 'Must be null when origin is unconfigured');
  });
});
