const BOT_USER_AGENT_PATTERNS: readonly RegExp[] = [
  /googlebot/i,
  /bingbot/i,
  /yandex/i,
  /duckduckbot/i,
  /baiduspider/i,
  /facebookexternalhit/i,
  /twitterbot/i,
  /rogerbot/i,
  /linkedinbot/i,
  /embedly/i,
  /quora link preview/i,
  /showyoubot/i,
  /outbrain/i,
  /pinterest\/0\./i,
  /developers\.google\.com\/\+\/web\/snippet/i,
  /slackbot/i,
  /vkshare/i,
  /w3c_validator/i,
  /redditbot/i,
  /applebot/i,
  /whatsapp/i,
  /telegrambot/i,
  /discordbot/i,
];

/**
 * Detects whether a request originates from an automated crawler, search engine bot,
 * or social media link preview generator.
 */
export function isBotUserAgent(userAgent?: string | null): boolean {
  if (!userAgent || typeof userAgent !== 'string' || userAgent.trim() === '') {
    return false;
  }
  return BOT_USER_AGENT_PATTERNS.some((pattern) => pattern.test(userAgent));
}

