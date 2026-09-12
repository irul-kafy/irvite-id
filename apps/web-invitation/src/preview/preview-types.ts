/**
 * Shared types for preview protocol.
 *
 * These mirror TemplateConfigV1 from web-admin/template-studio-model.ts
 * but are kept as a local copy to avoid a package dependency.
 * The shapes MUST remain structurally identical.
 */

export interface ThemeColors {
  primaryColor: string;
  secondaryColor: string;
  backgroundColor: string;
  textColor: string;
}

export interface Typography {
  headingFont: string;
  bodyFont: string;
}

export interface SectionConfig {
  id: string;
  enabled: boolean;
  order: number;
  variant: string;
}

export interface TemplateConfigV1 {
  version: 1;
  theme: ThemeColors;
  typography: Typography;
  sections: SectionConfig[];
}
