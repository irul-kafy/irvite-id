import { BadRequestException } from '@nestjs/common';
import {
  parseTemplateAssetMetadata,
  parseTemplatePackageManifest,
} from './template-package';

const validManifest = {
  schemaVersion: 1,
  name: 'Blue Symphony',
  themeCode: 'BLUE_SYMPHONY',
  renderer: 'GENERIC',
  config: {
    version: 1,
    theme: {
      primaryColor: '#173F5F',
      secondaryColor: '#C9A86A',
      backgroundColor: '#F5F0E8',
      textColor: '#20242A',
    },
    typography: { headingFont: 'PLAYFAIR_DISPLAY', bodyFont: 'INTER' },
    sections: [
      { id: 'hero', enabled: true, order: 1, variant: 'default' },
      { id: 'eventDetails', enabled: true, order: 2, variant: 'default' },
    ],
  },
};

describe('template package validation', () => {
  it('accepts a safe schema v1 manifest', () => {
    expect(
      parseTemplatePackageManifest(JSON.stringify(validManifest)),
    ).toMatchObject({
      name: 'Blue Symphony',
      themeCode: 'BLUE_SYMPHONY',
      renderer: 'GENERIC',
    });
  });

  it.each([
    { ...validManifest, schemaVersion: 2 },
    { ...validManifest, renderer: 'javascript:alert(1)' },
    { ...validManifest, themeCode: '../BAD' },
  ])('rejects an unsafe manifest', (manifest) => {
    expect(() =>
      parseTemplatePackageManifest(JSON.stringify(manifest)),
    ).toThrow(BadRequestException);
  });

  it('rejects duplicate asset positions', () => {
    expect(() =>
      parseTemplateAssetMetadata(
        JSON.stringify([
          { fieldName: 'asset_0', slot: 'ornament', order: 0 },
          { fieldName: 'asset_1', slot: 'ornament', order: 0 },
        ]),
      ),
    ).toThrow(BadRequestException);
  });
});
