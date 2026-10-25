import React from 'react';
import GenericTheme from './themes/generic';
import SekarKedatonRenderer from './sekar-kedaton/sekar-kedaton';
import OpalineNocturneRenderer from './opaline-nocturne/opaline-nocturne';
import AetheriaRenderer from './aetheria/aetheria';
import RanahCintaRenderer from './ranah-cinta/ranah-cinta';
import { resolveProductionThemeKey } from './registry-resolver';
import { PublicInvitationResponse } from '../types/public-invitation';

export {
  resolveProductionThemeKey,
  resolveFoundationThemeKey,
  isTemplateProductionActivated,
} from './registry-resolver';

export type RendererData = Partial<PublicInvitationResponse> & {
  event: PublicInvitationResponse['event'];
  template?: PublicInvitationResponse['template'];
  media?: PublicInvitationResponse['media'];
  mediaBySlot?: Record<string, import('../types/public-invitation').PublicMediaDescriptor[]>;
  guest?: PublicInvitationResponse['guest'] | null;
  invitation?: PublicInvitationResponse['invitation'] | null;
  rsvp?: PublicInvitationResponse['rsvp'] | null;
};

export type RendererProps = {
  data: RendererData;
  uniqueCode?: string;
  isPreview?: boolean;
  mode?: 'PUBLIC' | 'PERSONAL' | 'PERSONALIZED';
};

export type RendererComponent = React.ComponentType<RendererProps>;

// Active production renderers (guarded by production activation state)
const productionRenderers: Record<string, RendererComponent> = {
  GENERIC: GenericTheme as unknown as RendererComponent,
  SEKAR_KEDATON: SekarKedatonRenderer as unknown as RendererComponent,
  OPALINE_NOCTURNE: OpalineNocturneRenderer as unknown as RendererComponent,
  AETHERIA: AetheriaRenderer as unknown as RendererComponent,
  RANAH_CINTA: RanahCintaRenderer as unknown as RendererComponent,
};

// Internal foundation renderers (available for testing)
export const foundationRenderers: Record<string, RendererComponent> = {
  GENERIC: GenericTheme as unknown as RendererComponent,
  SEKAR_KEDATON: SekarKedatonRenderer as unknown as RendererComponent,
  OPALINE_NOCTURNE: OpalineNocturneRenderer as unknown as RendererComponent,
  AETHERIA: AetheriaRenderer as unknown as RendererComponent,
  RANAH_CINTA: RanahCintaRenderer as unknown as RendererComponent,
};

/**
 * Production renderer resolver used by /e/[slug] and /i/[uniqueCode].
 */
export function getRenderer(themeCode: string | null | undefined): RendererComponent {
  const key = resolveProductionThemeKey(themeCode);
  return productionRenderers[key] || GenericTheme;
}

export function RenderTheme({
  themeCode,
  ...props
}: RendererProps & { themeCode?: string | null }) {
  const Renderer = getRenderer(themeCode);
  return React.createElement(Renderer, props);
}
