import test from 'node:test';
import assert from 'node:assert/strict';
import {
  SEKAR_KEDATON_DEMO_FIXTURE,
  OPALINE_NOCTURNE_DEMO_FIXTURE,
  AETHERIA_DEMO_FIXTURE,
  RANAH_CINTA_DEMO_FIXTURE,
  SWARGA_DEWATA_DEMO_FIXTURE,
  getDemoFixture,
} from './index';
import { adaptSekarKedatonContent } from '../renderers/sekar-kedaton/sekar-kedaton.adapter';
import { adaptOpalineNocturneData } from '../renderers/opaline-nocturne/opaline-nocturne.adapter';
import { adaptAetheriaData } from '../renderers/aetheria/aetheria.adapter';
import { adaptRanahCintaData } from '../renderers/ranah-cinta/ranah-cinta.adapter';
import { adaptSwargaDewataContent } from '../renderers/swarga-dewata/swarga-dewata.adapter';
import { adaptRoyalVelvetContent } from '../renderers/royal-velvet/royal-velvet.adapter';
import {
  cleanInvitationEventTitle,
  extractCoupleNamesFromTitle,
} from '../renderers/adapter-utils';
import fs from 'node:fs';
import path from 'node:path';

test('Live Demo Fixtures & Gating Safety', async (t) => {
  await t.test('getDemoFixture resolves approved codex themeCodes', () => {
    assert.ok(getDemoFixture('SEKAR_KEDATON'));
    assert.ok(getDemoFixture('OPALINE_NOCTURNE'));
    assert.ok(getDemoFixture('AETHERIA'));
    assert.ok(getDemoFixture('RANAH_CINTA'));
    assert.ok(getDemoFixture('SWARGA_DEWATA'));

    // Case-insensitive
    assert.ok(getDemoFixture('sekar_kedaton'));
    assert.ok(getDemoFixture('opaline_nocturne'));
    assert.ok(getDemoFixture('aetheria'));
    assert.ok(getDemoFixture('ranah_cinta'));
    assert.ok(getDemoFixture('swarga_dewata'));

    // Removed or unapproved themes return undefined
    assert.equal(getDemoFixture('KUSUMA_PARAHYANGAN'), undefined);
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
      SWARGA_DEWATA_DEMO_FIXTURE,
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

  await t.test('Swarga Dewata fixture adapts cleanly to Swarga Dewata schema', () => {
    const rawContent = SWARGA_DEWATA_DEMO_FIXTURE.event.content as Record<string, unknown>;
    const adapted = adaptSwargaDewataContent(rawContent);
    assert.ok(adapted, 'Swarga Dewata content must adapt successfully');
    assert.equal(adapted.partnerOneName, 'Ayu');
    assert.equal(adapted.partnerTwoName, 'Bagus');
    assert.equal(adapted.partnerOneFullName, 'dr. Anak Agung Ayu Saraswati, S.Ked.');
    assert.equal(adapted.partnerTwoFullName, 'Tjokorda Gde Bagus Mahendra, M.Ars.');
    assert.equal(adapted.ceremonies?.length, 2);
    assert.equal(adapted.stories?.length, 3);
    assert.equal(adapted.giftAccounts?.length, 2);
    assert.equal(adapted.timeZone, 'Asia/Makassar');
  });

  await t.test('All template adapters strip (Draf Klien #...) tags and extract couple names from title when content is null', () => {
    const draftTitle = 'Pernikahan Amila & Raiswa (Draf Klien #IRV-59DA78)';
    assert.equal(cleanInvitationEventTitle(draftTitle), 'Pernikahan Amila & Raiswa');
    assert.deepEqual(extractCoupleNamesFromTitle(draftTitle), ['Amila', 'Raiswa']);

    const nullContentPayload = {
      event: {
        title: draftTitle,
        description: null,
        eventDate: '2027-05-15T09:00:00+07:00',
        locationDetails: 'Grand Ballroom Jakarta',
        slug: 'amila-raiswa-59da78',
        content: null,
      },
      template: { themeCode: 'OPALINE_NOCTURNE', config: {} },
      media: [],
      mediaBySlot: {},
    };

    const opaline = adaptOpalineNocturneData(nullContentPayload);
    assert.equal(opaline.event.title, 'Pernikahan Amila & Raiswa');
    assert.equal(opaline.couple.bride.shortName, 'Amila');
    assert.equal(opaline.couple.groom.shortName, 'Raiswa');
    assert.equal(opaline.couple.bride.name, 'Amila');
    assert.equal(opaline.couple.groom.name, 'Raiswa');
    assert.ok(opaline.event.dateLabel.includes('2027'));

    const aetheria = adaptAetheriaData(nullContentPayload);
    assert.equal(aetheria.event.title, 'Pernikahan Amila & Raiswa');
    assert.equal(aetheria.couple.bride.shortName, 'Amila');
    assert.equal(aetheria.couple.groom.shortName, 'Raiswa');

    const ranah = adaptRanahCintaData(nullContentPayload);
    assert.equal(ranah.event.title, 'Pernikahan Amila & Raiswa');
    assert.equal(ranah.couple.bride.shortName, 'Amila');
    assert.equal(ranah.couple.groom.shortName, 'Raiswa');

    const sekar = adaptSekarKedatonContent(null, draftTitle);
    assert.equal(sekar.partnerOneName, 'Amila');
    assert.equal(sekar.partnerTwoName, 'Raiswa');

    const royal = adaptRoyalVelvetContent(null, draftTitle, '2027-05-15T09:00:00+07:00', 'Grand Ballroom Jakarta');
    assert.equal(royal.partnerOneName, 'Amila');
    assert.equal(royal.partnerTwoName, 'Raiswa');
    assert.equal(royal.partnerOneFullName, 'Amila');
    assert.equal(royal.partnerTwoFullName, 'Raiswa');
    assert.equal(royal.ceremonies[0].venue, 'Grand Ballroom Jakarta');

    const swarga = adaptSwargaDewataContent(null, draftTitle, '2027-05-15T09:00:00+08:00', 'Puri Agung');
    assert.equal(swarga.partnerOneName, 'Amila');
    assert.equal(swarga.partnerTwoName, 'Raiswa');
    assert.equal(swarga.partnerOneFullName, 'Amila');
    assert.equal(swarga.partnerTwoFullName, 'Raiswa');
    assert.equal(swarga.ceremonies[0].venue, 'Puri Agung');
  });

  await t.test('Opaline Nocturne CSS places coverContent, heroIntro, and inner above decorative flowers and frame', () => {
    const cssPath = path.resolve(
      process.cwd(),
      'src/renderers/opaline-nocturne/InvitationTemplate.module.css',
    );
    const css = fs.readFileSync(cssPath, 'utf8');
    assert.match(css, /\.coverContent\{[^}]*z-index:6/);
    assert.match(css, /\.heroIntro\{[^}]*z-index:6/);
    assert.match(css, /\.inner\{[^}]*z-index:6/);
    assert.match(css, /\.flowers\{[^}]*z-index:3/);
    assert.match(css, /\.coverFrame\{[^}]*z-index:2/);
  });
});
