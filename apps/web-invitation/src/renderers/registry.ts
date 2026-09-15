import React from 'react';
import GenericTheme from './themes/generic';
import IvoryGardenRenderer from './ivory-garden/ivory-garden';
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
  IVORY_GARDEN: IvoryGardenRenderer as unknown as RendererComponent,
};

// Internal foundation renderers (available for testing, but NOT served in production before visual completion)
export const foundationRenderers: Record<string, RendererComponent> = {
  GENERIC: GenericTheme as unknown as RendererComponent,
  IVORY_GARDEN: IvoryGardenRenderer as unknown as RendererComponent,
};

/**
 * Production renderer resolver used by /e/[slug] and /i/[uniqueCode].
 * Guards unactivated templates (like IVORY_GARDEN in Phase #8A) from exposing scaffolding to public users.
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
