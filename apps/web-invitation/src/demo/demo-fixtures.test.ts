import test from 'node:test';
import assert from 'node:assert/strict';
import {
  IVORY_GARDEN_DEMO_FIXTURE,
  SERENE_GARDEN_DEMO_FIXTURE,
  SUNDA_PUSPA_DEMO_FIXTURE,
  getDemoFixture,
} from './index';
import { adaptIvoryGardenContent } from '../renderers/ivory-garden/ivory-garden.adapter';
import { adaptSereneGardenContent } from '../renderers/serene-garden/serene-garden.adapter';
import { adaptSundaPuspaContent } from '../renderers/sunda-puspa/sunda-puspa.adapter';

test('Live Demo Fixtures & Gating Safety', async (t) => {
  await t.test('getDemoFixture resolves only approved production themeCodes', () => {
    assert.ok(getDemoFixture('IVORY_GARDEN'));
    assert.ok(getDemoFixture('SERENE_GARDEN'));
    assert.ok(getDemoFixture('SUNDA_PUSPA'));

    // Case-insensitive
    assert.ok(getDemoFixture('ivory_garden'));
    assert.ok(getDemoFixture('serene_garden'));
    assert.ok(getDemoFixture('sunda_puspa'));

    // Unknown or unapproved themes return undefined
    assert.equal(getDemoFixture('GENERIC'), undefined);
    assert.equal(getDemoFixture('UNKNOWN'), undefined);
    assert.equal(getDemoFixture(''), undefined);
    assert.equal(getDemoFixture(null), undefined);
  });

  await t.test('all demo fixtures strictly omit guest, invitation, and rsvp data (READ-ONLY)', () => {
    const fixtures = [
      IVORY_GARDEN_DEMO_FIXTURE,
      SERENE_GARDEN_DEMO_FIXTURE,
      SUNDA_PUSPA_DEMO_FIXTURE,
    ];

    for (const fixture of fixtures) {
      assert.equal(fixture.guest, undefined, 'Demo fixture must have guest === undefined');
      assert.equal(fixture.invitation, undefined, 'Demo fixture must have invitation === undefined');
      assert.equal(fixture.rsvp, undefined, 'Demo fixture must have rsvp === undefined');
      assert.ok(fixture.event, 'Demo fixture must contain event details');
      assert.ok(fixture.event.title, 'Demo event must have title');
      assert.ok(fixture.event.eventDate, 'Demo event must have eventDate');
      assert.ok(fixture.event.locationDetails, 'Demo event must have locationDetails');
    }
  });

  await t.test('Ivory Garden fixture adapts cleanly to Ivory schema', () => {
    const adapted = adaptIvoryGardenContent(IVORY_GARDEN_DEMO_FIXTURE.event.content);
    assert.ok(adapted, 'Ivory content must adapt successfully');
    assert.equal(adapted.partnerOneName, 'Rian');
    assert.equal(adapted.partnerTwoName, 'Maya');
    assert.equal(adapted.ceremonies?.length, 2);
    assert.equal(adapted.giftAccounts?.length, 2);
  });

  await t.test('Serene Garden fixture adapts cleanly to Serene schema', () => {
    const adapted = adaptSereneGardenContent(SERENE_GARDEN_DEMO_FIXTURE.event.content);
    assert.ok(adapted, 'Serene content must adapt successfully');
    assert.equal(adapted.partnerOneName, 'Dimas');
    assert.equal(adapted.partnerTwoName, 'Alya');
    assert.equal(adapted.ceremonies?.length, 2);
    assert.equal(adapted.giftAccounts?.length, 1);
  });

  await t.test('Sunda Puspa fixture adapts cleanly to Sunda schema and HAS NO GIFT FIELDS', () => {
    const rawContent = SUNDA_PUSPA_DEMO_FIXTURE.event.content as Record<string, unknown>;

    // Strict invariant: SUNDA_PUSPA must NOT receive gift fields
    assert.equal(rawContent.giftTitle, undefined, 'Sunda must not have giftTitle');
    assert.equal(rawContent.giftMessage, undefined, 'Sunda must not have giftMessage');
    assert.equal(rawContent.giftAccounts, undefined, 'Sunda must not have giftAccounts');

    const adapted = adaptSundaPuspaContent(rawContent);
    assert.ok(adapted, 'Sunda content must adapt successfully');
    assert.equal(adapted.partnerOneName, 'Galih');
    assert.equal(adapted.partnerTwoName, 'Ratna');
    assert.equal(adapted.ceremonies?.length, 2);
    assert.equal(adapted.story?.length, 3);
  });
});
