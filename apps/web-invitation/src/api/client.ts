import { PublicInvitationResponse } from '../types/public-invitation';
import { PublicEventResponse } from '../types/public-event';

export interface PublicTemplatePackage {
  id: string;
  name: string;
  themeCode: string;
  previewImageUrl: string | null;
}

export async function fetchPublicTemplatePackages(): Promise<PublicTemplatePackage[]> {
  try {
    const baseUrl = process.env.INTERNAL_API_URL || 'http://127.0.0.1:3000';
    const response = await fetch(`${baseUrl}/templates/public/packages`, { cache: 'no-store', signal: AbortSignal.timeout(15000) });
    if (!response.ok) return [];
    return await response.json() as PublicTemplatePackage[];
  } catch { return []; }
}

export async function fetchPublishedTemplate(id: string): Promise<(NonNullable<PublicInvitationResponse['template']> & { name: string }) | null> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const baseUrl = process.env.INTERNAL_API_URL || 'http://127.0.0.1:3000';
  const response = await fetch(`${baseUrl}/templates/public/packages/${id}`, { cache: 'no-store', signal: AbortSignal.timeout(15000) });
  if (response.status === 404) return null;
  if (!response.ok) throw new Error('Template preview could not be loaded');
  return response.json();
}

export async function fetchPublicInvitation(
  uniqueCode: string,
): Promise<PublicInvitationResponse | null> {
  // Use INTERNAL_API_URL or fallback to localhost port 3000
  const baseUrl = process.env.INTERNAL_API_URL || 'http://127.0.0.1:3000';
  const res = await fetch(`${baseUrl}/invitations/public/${uniqueCode}`, {
    // Next.js config to bypass cache for dynamic data
    cache: 'no-store',
  });

  if (!res.ok) {
    if (res.status === 404) {
      return null;
    }
    throw new Error('Failed to fetch invitation');
  }

  const data = await res.json();
  return data as PublicInvitationResponse;
}

export async function fetchPublicEvent(
  slug: string,
): Promise<PublicEventResponse | null> {
  const baseUrl = process.env.INTERNAL_API_URL || 'http://127.0.0.1:3000';
  const res = await fetch(`${baseUrl}/events/public/${slug}`, {
    cache: 'no-store',
  });

  if (!res.ok) {
    if (res.status === 404) {
      return null;
    }
    throw new Error('Failed to fetch public event');
  }

  const data = await res.json();
  return data as PublicEventResponse;
}

export interface PublicTemplateAvailabilityItem {
  themeCode: string;
  status: string;
}

export async function fetchPublicTemplateAvailability(): Promise<
  PublicTemplateAvailabilityItem[] | null
> {
  const isServer = typeof window === 'undefined';
  const url = isServer
    ? (process.env.INTERNAL_API_URL || 'http://127.0.0.1:3000') + '/templates/public/availability'
    : '/api-proxy/templates/public/availability';

  try {
    const res = await fetch(url, {
      cache: 'no-store',
    });
    if (!res.ok) {
      return null;
    }
    const data = await res.json();
    if (!Array.isArray(data)) {
      return null;
    }
    return data.filter(
      (item): item is PublicTemplateAvailabilityItem =>
        Boolean(
          item &&
            typeof item === 'object' &&
            typeof item.themeCode === 'string' &&
            typeof item.status === 'string',
        ),
    );
  } catch {
    return null;
  }
}
