import { isBotUserAgent } from './crawler-detector';

describe('isBotUserAgent', () => {
  it('returns false for undefined, null, or empty string', () => {
    expect(isBotUserAgent(undefined)).toBe(false);
    expect(isBotUserAgent(null)).toBe(false);
    expect(isBotUserAgent('')).toBe(false);
    expect(isBotUserAgent('   ')).toBe(false);
  });

  it('detects common search engine and social media crawler bots', () => {
    const bots = [
      'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
      'Mozilla/5.0 (compatible; bingbot/2.0; +http://www.bing.com/bingbot.htm)',
      'facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)',
      'Twitterbot/1.0',
      'LinkedInBot/1.0 (compatible; Mozilla/5.0; Apache-HttpClient +http://www.linkedin.com)',
      'WhatsApp/2.21.12.21 A',
      'TelegramBot (like TwitterBot)',
      'Mozilla/5.0 (compatible; Discordbot/2.0; +https://discordapp.com)',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_10_1) AppleWebKit/600.2.5 (KHTML, like Gecko) Version/8.0.2 Safari/600.2.5 (Applebot/0.1)',
      'Slackbot-LinkExpanding 1.0 (+https://api.slack.com/robots)',
    ];

    for (const ua of bots) {
      expect(isBotUserAgent(ua)).toBe(true);
    }
  });

  it('allows genuine human browser user agents', () => {
    const humanUas = [
      'Mozilla/5.0 (iPhone; CPU iPhone OS 16_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.5 Mobile/15E148 Safari/604.1',
      'Mozilla/5.0 (Linux; Android 13; SM-S918B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Mobile Safari/537.36',
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/119.0',
    ];

    for (const ua of humanUas) {
      expect(isBotUserAgent(ua)).toBe(false);
    }
  });
});

