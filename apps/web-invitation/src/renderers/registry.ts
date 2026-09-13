import React from 'react';
import GenericTheme from './themes/generic';
import IvoryGarden from './themes/ivory-garden';
import { PublicInvitationResponse } from '../types/public-invitation';

export type RendererData = Partial<PublicInvitationResponse> & {
  event: PublicInvitationResponse['event'];
  template?: PublicInvitationResponse['template'];
  media?: PublicInvitationResponse['media'];
  guest?: PublicInvitationResponse['guest'] | null;
  invitation?: PublicInvitationResponse['invitation'] | null;
  rsvp?: PublicInvitationResponse['rsvp'] | null;
};

export type RendererProps = {
  data: RendererData;
  uniqueCode?: string;
  isPreview?: boolean;
  mode?: 'PUBLIC' | 'PERSONAL';
};

export type RendererComponent = React.ComponentType<RendererProps>;

// The trusted renderer registry
const renderers: Record<string, RendererComponent> = {
  IVORY_GARDEN: IvoryGarden,
  GENERIC: GenericTheme,
  VERDANT: GenericTheme,
  MIDNIGHT: GenericTheme,
  BOTANICAL: GenericTheme,
  CLASSIC: GenericTheme,
  MINIMAL: GenericTheme,
  ROMANTIC: GenericTheme,
};

export function getRenderer(themeCode: string | null | undefined): RendererComponent {
  if (themeCode && renderers[themeCode]) {
    return renderers[themeCode];
  }
  // Unknown or null themeCode falls back to Generic Theme
  return GenericTheme;
}

export function RenderTheme({
  themeCode,
  ...props
}: RendererProps & { themeCode?: string | null }) {
  const Renderer = getRenderer(themeCode);
  return React.createElement(Renderer, props);
}
