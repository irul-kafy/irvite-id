export const ALLOWED_FONTS = ['INTER', 'PLAYFAIR_DISPLAY', 'LORA', 'MONTSERRAT'] as const;

const DEFAULT_CONFIG = {
  version: 1,
  theme: {
    primaryColor: '#111827',
    secondaryColor: '#4b5563',
    backgroundColor: '#f9fafb',
    textColor: '#111827',
  },
  typography: {
    headingFont: 'INTER',
    bodyFont: 'INTER',
  },
  sections: [
    { id: 'hero', enabled: true, order: 1, variant: 'default' },
    { id: 'eventDetails', enabled: true, order: 2, variant: 'default' },
    { id: 'location', enabled: true, order: 3, variant: 'default' },
    { id: 'greeting', enabled: true, order: 4, variant: 'default' },
    { id: 'rsvp', enabled: true, order: 5, variant: 'default' },
    { id: 'gallery', enabled: true, order: 6, variant: 'default' },
    { id: 'guestQr', enabled: false, order: 7, variant: 'default' },
    { id: 'countdown', enabled: false, order: 8, variant: 'default' },
    { id: 'closing', enabled: false, order: 9, variant: 'default' },
  ]
};

const VALID_SECTION_IDS = ['hero', 'greeting', 'eventDetails', 'countdown', 'gallery', 'location', 'rsvp', 'guestQr', 'closing'];

export function normalizeConfig(rawConfig: any) {
  const config = JSON.parse(JSON.stringify(DEFAULT_CONFIG));

  if (!rawConfig || typeof rawConfig !== 'object') {
    return config;
  }

  if (rawConfig.version !== 1 && typeof rawConfig.color === 'string') {
    if (/^#[0-9A-Fa-f]{6}$/.test(rawConfig.color)) {
      config.theme.backgroundColor = rawConfig.color;
    }
    return config;
  }

  if (rawConfig.theme && typeof rawConfig.theme === 'object') {
    const safeHex = (val: any, fallback: string) => 
      (typeof val === 'string' && /^#[0-9A-Fa-f]{6}$/.test(val)) ? val : fallback;
    
    config.theme.primaryColor = safeHex(rawConfig.theme.primaryColor, config.theme.primaryColor);
    config.theme.secondaryColor = safeHex(rawConfig.theme.secondaryColor, config.theme.secondaryColor);
    config.theme.backgroundColor = safeHex(rawConfig.theme.backgroundColor, config.theme.backgroundColor);
    config.theme.textColor = safeHex(rawConfig.theme.textColor, config.theme.textColor);
  }

  if (rawConfig.typography && typeof rawConfig.typography === 'object') {
    const safeFont = (val: any, fallback: string) => 
      (typeof val === 'string' && (ALLOWED_FONTS as readonly string[]).includes(val)) ? val : fallback;
    
    config.typography.headingFont = safeFont(rawConfig.typography.headingFont, config.typography.headingFont);
    config.typography.bodyFont = safeFont(rawConfig.typography.bodyFont, config.typography.bodyFont);
  }

  if (Array.isArray(rawConfig.sections)) {
    const sectionIds = new Set<string>();
    const sectionOrders = new Set<number>();
    const safeSections = [];
    
    for (const s of rawConfig.sections) {
      if (s && typeof s === 'object' && typeof s.id === 'string' && VALID_SECTION_IDS.includes(s.id)) {
        if (!sectionIds.has(s.id)) {
          sectionIds.add(s.id);
          
          let order = typeof s.order === 'number' ? s.order : 99;
          while (sectionOrders.has(order)) order++; 
          sectionOrders.add(order);
          
          let enabled = typeof s.enabled === 'boolean' ? s.enabled : false;
          if (s.id === 'eventDetails') enabled = true; 
          
          safeSections.push({
            id: s.id,
            enabled,
            order,
            variant: 'default',
          });
        }
      }
    }

    let nextOrder = sectionOrders.size > 0 ? Math.max(...Array.from(sectionOrders)) + 1 : 1;
    for (const id of VALID_SECTION_IDS) {
      if (!sectionIds.has(id)) {
        safeSections.push({
          id,
          enabled: id === 'eventDetails', 
          order: nextOrder++,
          variant: 'default',
        });
      }
    }

    safeSections.sort((a, b) => a.order - b.order);
    config.sections = safeSections;
  }

  return config;
}
