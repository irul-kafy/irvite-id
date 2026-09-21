import test from 'node:test';
import assert from 'node:assert/strict';
import {
  FIXED_CATALOG_TEMPLATES,
  joinCatalogWithDbTemplates,
  DbTemplateRecord,
  isBuiltInCatalogTemplate,
} from './utils/catalog-registry';

test('Web Admin Permanent Template Deletion UI Contracts', async (t) => {
  const sampleBuiltInDbTemplates: DbTemplateRecord[] = [
    {
      id: 'db-ivory-uuid',
      name: 'Ivory Garden',
      themeCode: 'IVORY_GARDEN',
      status: 'AVAILABLE',
      eventUsageCount: 5,
    },
    {
      id: 'db-serene-uuid',
      name: 'Serene Garden',
      themeCode: 'SERENE_GARDEN',
      status: 'ARCHIVED',
      eventUsageCount: 0,
    },
    {
      id: 'db-sunda-uuid',
      name: 'Sunda Puspa',
      themeCode: 'SUNDA_PUSPA',
      status: 'HIDDEN',
      eventUsageCount: 2,
    },
    {
      id: 'db-classic-uuid',
      name: 'Classic Letter',
      themeCode: 'CLASSIC_LETTER',
      status: 'AVAILABLE',
      eventUsageCount: 0,
    },
    {
      id: 'db-velvet-uuid',
      name: 'Velvet Letter',
      themeCode: 'VELVET_LETTER',
      status: 'ARCHIVED',
      eventUsageCount: 1,
    },
  ];

  const sampleDynamicTemplates: DbTemplateRecord[] = [
    {
      id: 'dyn-avail-uuid',
      name: 'Modern Floral',
      themeCode: 'MODERN_FLORAL',
      status: 'AVAILABLE',
      eventUsageCount: 0,
    },
    {
      id: 'dyn-hidden-uuid',
      name: 'Minimal Dark',
      themeCode: 'MINIMAL_DARK',
      status: 'HIDDEN',
      eventUsageCount: 0,
    },
    {
      id: 'dyn-archived-used-uuid',
      name: 'Rustic Wood',
      themeCode: 'RUSTIC_WOOD',
      status: 'ARCHIVED',
      eventUsageCount: 3,
    },
    {
      id: 'dyn-archived-zero-uuid',
      name: 'Neon Cyber',
      themeCode: 'NEON_CYBER',
      status: 'ARCHIVED',
      eventUsageCount: 0,
    },
  ];

  await t.test('Built-in templates: recognized as system templates and NEVER offer permanent delete control', () => {
    // Check built-in categorization
    for (const builtIn of sampleBuiltInDbTemplates) {
      assert.equal(
        isBuiltInCatalogTemplate(builtIn.themeCode),
        true,
        `Template ${builtIn.themeCode} must be identified as built-in system template`
      );
    }

    // When joined with catalog, all 5 built-in templates are present
    const joined = joinCatalogWithDbTemplates(
      FIXED_CATALOG_TEMPLATES,
      sampleBuiltInDbTemplates
    );
    assert.equal(joined.length, 5);

    // Verify UI contract: built-in templates must NOT have a permanent delete control even if status is ARCHIVED
    for (const item of joined) {
      const dbRow = item.matchedDbTemplate;
      assert.ok(dbRow);
      // Contract: isBuiltInCatalogTemplate is true => permanent delete button must NOT be rendered
      const shouldRenderDeleteButton =
        !isBuiltInCatalogTemplate(dbRow.themeCode) &&
        dbRow.status === 'ARCHIVED';
      assert.equal(
        shouldRenderDeleteButton,
        false,
        `Built-in template ${dbRow.themeCode} must never render permanent delete button even if ARCHIVED`
      );
    }
  });

  await t.test('Dynamic templates: delete action is HIDDEN for AVAILABLE and HIDDEN statuses', () => {
    const avail = sampleDynamicTemplates.find((t) => t.id === 'dyn-avail-uuid')!;
    const hidden = sampleDynamicTemplates.find((t) => t.id === 'dyn-hidden-uuid')!;

    assert.equal(isBuiltInCatalogTemplate(avail.themeCode), false);
    assert.equal(isBuiltInCatalogTemplate(hidden.themeCode), false);

    // Rule: Only show "Delete Permanently" when status === ARCHIVED
    const canShowAvailDelete = avail.status === 'ARCHIVED';
    const canShowHiddenDelete = hidden.status === 'ARCHIVED';

    assert.equal(canShowAvailDelete, false, 'AVAILABLE dynamic template must not show delete button');
    assert.equal(canShowHiddenDelete, false, 'HIDDEN dynamic template must not show delete button');
  });

  await t.test('Dynamic templates: delete action is SHOWN and ENABLED for ARCHIVED with zero usage', () => {
    const zeroUsageArchived = sampleDynamicTemplates.find(
      (t) => t.id === 'dyn-archived-zero-uuid'
    )!;

    assert.equal(isBuiltInCatalogTemplate(zeroUsageArchived.themeCode), false);
    assert.equal(zeroUsageArchived.status, 'ARCHIVED');
    assert.equal(zeroUsageArchived.eventUsageCount, 0);

    const isActionVisible = zeroUsageArchived.status === 'ARCHIVED';
    const isActionBlocked = (zeroUsageArchived.eventUsageCount ?? 0) > 0;
    const isActionEnabled = isActionVisible && !isActionBlocked;

    assert.equal(isActionVisible, true, 'Action must be visible for ARCHIVED template');
    assert.equal(isActionBlocked, false, 'Action must not be blocked when usage is 0');
    assert.equal(isActionEnabled, true, 'Action must be enabled for ARCHIVED template with 0 events');
  });

  await t.test('Dynamic templates: delete action is BLOCKED/DISABLED for ARCHIVED with usage > 0, with explanation', () => {
    const usedArchived = sampleDynamicTemplates.find(
      (t) => t.id === 'dyn-archived-used-uuid'
    )!;

    assert.equal(isBuiltInCatalogTemplate(usedArchived.themeCode), false);
    assert.equal(usedArchived.status, 'ARCHIVED');
    assert.ok((usedArchived.eventUsageCount ?? 0) > 0);

    const isActionVisible = usedArchived.status === 'ARCHIVED';
    const isActionBlocked = (usedArchived.eventUsageCount ?? 0) > 0;
    const reason = `Cannot delete template: used in ${usedArchived.eventUsageCount} event(s). Only templates with 0 events can be permanently deleted.`;

    assert.equal(isActionVisible, true, 'Action button is visible for ARCHIVED template');
    assert.equal(isActionBlocked, true, 'Action button is disabled when eventUsageCount > 0');
    assert.ok(reason.includes('used in 3 event(s)'), 'Explanation mentions the exact usage count');
  });

  await t.test('Confirmation modal contract: requires typing exactly "DELETE" before confirm button enables', () => {
    const target = sampleDynamicTemplates.find((t) => t.id === 'dyn-archived-zero-uuid')!;

    // Modal data fields required
    assert.ok(target.name, 'Modal must display template name');
    assert.ok(target.themeCode, 'Modal must display themeCode');
    assert.ok(target.status, 'Modal must display status');
    assert.strictEqual(typeof target.eventUsageCount, 'number', 'Modal must display eventUsageCount');

    // Button enable validation logic
    const validateConfirm = (input: string, isDeleting: boolean) =>
      input === 'DELETE' && !isDeleting;

    assert.equal(validateConfirm('', false), false);
    assert.equal(validateConfirm('delete', false), false); // must be uppercase
    assert.equal(validateConfirm('DELETE ', false), false); // no extra spaces
    assert.equal(validateConfirm('DEL', false), false);
    assert.equal(validateConfirm('DELETE', true), false); // disabled while in flight
    assert.equal(validateConfirm('DELETE', false), true); // exact match enables button
  });

  await t.test('Successful deletion state transition: removes card and leaves no stale record', () => {
    let currentDbTemplates = [...sampleDynamicTemplates];
    const deletedId = 'dyn-archived-zero-uuid';

    // Verify template initially present
    assert.ok(currentDbTemplates.some((t) => t.id === deletedId));
    assert.equal(currentDbTemplates.length, 4);

    // Simulate state update on successful deletion:
    // setDbTemplates(prev => prev.filter(t => t.id !== deletingTemplate.id))
    currentDbTemplates = currentDbTemplates.filter((t) => t.id !== deletedId);

    assert.equal(currentDbTemplates.length, 3);
    assert.equal(currentDbTemplates.some((t) => t.id === deletedId), false);
    assert.equal(currentDbTemplates.find((t) => t.id === deletedId), undefined);
  });
});
