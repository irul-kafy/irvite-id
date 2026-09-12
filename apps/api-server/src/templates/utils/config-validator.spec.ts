/* eslint-disable @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment */
import { validateTemplateConfig } from './config-validator';
import {
  TemplateConfigDto,
  SectionIdEnum,
  SectionVariantEnum,
  FontEnum,
} from '../dto/template-config.dto';
import { BadRequestException } from '@nestjs/common';

describe('validateTemplateConfig', () => {
  const getValidConfig = (): TemplateConfigDto => ({
    version: 1,
    theme: {
      primaryColor: '#111827',
      secondaryColor: '#4b5563',
      backgroundColor: '#f9fafb',
      textColor: '#111827',
    },
    typography: {
      headingFont: FontEnum.INTER,
      bodyFont: FontEnum.INTER,
    },
    sections: [
      {
        id: SectionIdEnum.eventDetails,
        enabled: true,
        order: 1,
        variant: SectionVariantEnum.default,
      },
    ],
  });

  it('should pass for valid config', () => {
    expect(() => validateTemplateConfig(getValidConfig())).not.toThrow();
  });

  it('should throw if sections is missing or not array', () => {
    const config = getValidConfig();
    (config as any).sections = null;
    expect(() => validateTemplateConfig(config)).toThrow(BadRequestException);
  });

  it('should throw if > 9 sections', () => {
    const config = getValidConfig();
    config.sections = Array(10).fill({
      id: SectionIdEnum.hero,
      enabled: true,
      order: 1,
      variant: SectionVariantEnum.default,
    });
    expect(() => validateTemplateConfig(config)).toThrow(BadRequestException);
  });

  it('should throw on duplicate section IDs', () => {
    const config = getValidConfig();
    config.sections.push({
      id: SectionIdEnum.eventDetails,
      enabled: true,
      order: 2,
      variant: SectionVariantEnum.default,
    });
    expect(() => validateTemplateConfig(config)).toThrow(BadRequestException);
  });

  it('should throw on duplicate section orders', () => {
    const config = getValidConfig();
    config.sections.push({
      id: SectionIdEnum.hero,
      enabled: true,
      order: 1,
      variant: SectionVariantEnum.default,
    });
    expect(() => validateTemplateConfig(config)).toThrow(BadRequestException);
  });

  it('should throw if eventDetails is missing', () => {
    const config = getValidConfig();
    config.sections = [
      {
        id: SectionIdEnum.hero,
        enabled: true,
        order: 1,
        variant: SectionVariantEnum.default,
      },
    ];
    expect(() => validateTemplateConfig(config)).toThrow(BadRequestException);
  });

  it('should throw if eventDetails is disabled', () => {
    const config = getValidConfig();
    config.sections[0].enabled = false;
    expect(() => validateTemplateConfig(config)).toThrow(BadRequestException);
  });

  it('should throw if config size exceeds 16KB', () => {
    const config = getValidConfig();
    (config as any).largePayload = 'a'.repeat(16385); // inject large payload to test size limit
    expect(() => validateTemplateConfig(config)).toThrow(BadRequestException);
  });
});
