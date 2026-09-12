import { BadRequestException } from '@nestjs/common';
import { TemplateConfigDto, SectionIdEnum } from '../dto/template-config.dto';

export function validateTemplateConfig(config: TemplateConfigDto): void {
  // 1. Serialize and check size (<= 16384 bytes)
  const serialized = JSON.stringify(config);
  if (Buffer.byteLength(serialized, 'utf8') > 16384) {
    throw new BadRequestException('Template configuration exceeds 16KB limit');
  }

  // 2. Validate sections array
  const { sections } = config;

  if (!sections || !Array.isArray(sections)) {
    throw new BadRequestException('Sections must be an array');
  }

  if (sections.length > 9) {
    throw new BadRequestException('Maximum 9 sections allowed');
  }

  const sectionIds = new Set<string>();
  const sectionOrders = new Set<number>();
  let hasEventDetails = false;
  let isEventDetailsEnabled = false;

  for (const section of sections) {
    // Check duplicates
    if (sectionIds.has(section.id)) {
      throw new BadRequestException(
        `Duplicate section ID found: ${section.id}`,
      );
    }
    sectionIds.add(section.id);

    if (sectionOrders.has(section.order)) {
      throw new BadRequestException(
        `Duplicate section order found: ${section.order}`,
      );
    }
    sectionOrders.add(section.order);

    // Check eventDetails invariant
    if (section.id === SectionIdEnum.eventDetails) {
      hasEventDetails = true;
      isEventDetailsEnabled = section.enabled;
    }
  }

  if (!hasEventDetails) {
    throw new BadRequestException('The eventDetails section must be present');
  }

  if (!isEventDetailsEnabled) {
    throw new BadRequestException('The eventDetails section must be enabled');
  }
}
