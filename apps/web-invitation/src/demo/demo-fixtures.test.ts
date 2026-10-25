import test from 'node:test';
import assert from 'node:assert/strict';
import {
  SEKAR_KEDATON_DEMO_FIXTURE,
  OPALINE_NOCTURNE_DEMO_FIXTURE,
  AETHERIA_DEMO_FIXTURE,
  RANAH_CINTA_DEMO_FIXTURE,
  getDemoFixture,
} from './index';
import { adaptSekarKedatonContent } from '../renderers/sekar-kedaton/sekar-kedaton.adapter';
import { adaptOpalineNocturneData } from '../renderers/opaline-nocturne/opaline-nocturne.adapter';
import { adaptAetheriaData } from '../renderers/aetheria/aetheria.adapter';
import { adaptRanahCintaData } from '../renderers/ranah-cinta/ranah-cinta.adapter';

test('Live Demo Fixtures & Gating Safety', async (t) => {
  await t.test('getDemoFixture resolves only approved 4 codex themeCodes', () => {
    assert.ok(getDemoFixture('SEKAR_KEDATON'));
    assert.ok(getDemoFixture('OPALINE_NOCTURNE'));
    assert.ok(getDemoFixture('AETHERIA'));
    assert.ok(getDemoFixture('RANAH_CINTA'));

    // Case-insensitive
    assert.ok(getDemoFixture('sekar_kedaton'));
    assert.ok(getDemoFixture('opaline_nocturne'));
    assert.ok(getDemoFixture('aetheria'));
    assert.ok(getDemoFixture('ranah_cinta'));

    // Removed or unapproved themes return undefined
    assert.equal(getDemoFixture('SERENE_GARDEN'), undefined);
    assert.equal(getDemoFixture('VELVET_LETTER'), undefined);
    assert.equal(getDemoFixture('CHINESE_TRADITIONAL_LUXURY'), undefined);
    assert.equal(getDemoFixture('JARDIN_DE_VELOURS'), undefined);
    assert.equal(getDemoFixture('SYMPHONY_OF_US'), undefined);
    assert.equal(getDemoFixture('IVORY_GARDEN'), undefined);
    assert.equal(getDemoFixture('SUNDA_PUSPA'), undefined);
    assert.equal(getDemoFixture('CLASSIC_LETTER'), undefined);
    assert.equal(getDemoFixture('GENERIC'), undefined);
    assert.equal(getDemoFixture('UNKNOWN'), undefined);
    assert.equal(getDemoFixture(''), undefined);
    assert.equal(getDemoFixture(null), undefined);
  });

  await t.test('all demo fixtures strictly omit guest, invitation, and rsvp data (READ-ONLY)', () => {
    const fixtures = [
      SEKAR_KEDATON_DEMO_FIXTURE,
      AETHERIA_DEMO_FIXTURE,
      OPALINE_NOCTURNE_DEMO_FIXTURE,
      RANAH_CINTA_DEMO_FIXTURE,
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

  await t.test('Sekar Kedaton fixture adapts cleanly to Sekar Kedaton schema', () => {
    const rawContent = SEKAR_KEDATON_DEMO_FIXTURE.event.content as Record<string, unknown>;
    const adapted = adaptSekarKedatonContent(rawContent);
    assert.ok(adapted, 'Sekar Kedaton content must adapt successfully');
    assert.equal(adapted?.partnerOneName, 'Laras');
    assert.equal(adapted?.partnerTwoName, 'Bagas');
    assert.equal(adapted?.ceremonies?.length, 2);
    assert.equal(adapted?.timeZone, 'Asia/Jakarta');
  });

  await t.test('Opaline Nocturne fixture adapts cleanly to Opaline schema', () => {
    const adapted = adaptOpalineNocturneData(OPALINE_NOCTURNE_DEMO_FIXTURE);
    assert.ok(adapted, 'Opaline content must adapt successfully');
    assert.equal(adapted.couple.bride.shortName, 'Anindya');
    assert.equal(adapted.couple.groom.shortName, 'Rafi');
    assert.equal(adapted.events.length, 2);
    assert.equal(adapted.story.length, 2);
    assert.equal(adapted.gifts.accounts.length, 2);
  });

  await t.test('Aetheria fixture adapts cleanly to Aetheria schema', () => {
    const adapted = adaptAetheriaData(AETHERIA_DEMO_FIXTURE);
    assert.ok(adapted, 'Aetheria content must adapt successfully');
    assert.equal(adapted.couple.bride.shortName, 'Lyra');
    assert.equal(adapted.couple.groom.shortName, 'Elian');
    assert.equal(adapted.events.length, 2);
    assert.equal(adapted.story.length, 3);
    assert.equal(adapted.gifts.accounts.length, 2);
  });

  await t.test('Ranah Cinta fixture adapts cleanly to Ranah Cinta schema', () => {
    const adapted = adaptRanahCintaData(RANAH_CINTA_DEMO_FIXTURE);
    assert.ok(adapted, 'Ranah Cinta content must adapt successfully');
    assert.equal(adapted.couple.bride.shortName, 'Salma');
    assert.equal(adapted.couple.groom.shortName, 'Fadli');
    assert.equal(adapted.events.length, 2);
    assert.equal(adapted.story.length, 2);
    assert.equal(adapted.gifts.accounts.length, 2);
  });
});
