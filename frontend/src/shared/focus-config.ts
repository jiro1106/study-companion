export const BLOCK_START_MARKER = '# === BARDHIE FOCUS BLOCK START ==='
export const BLOCK_END_MARKER = '# === BARDHIE FOCUS BLOCK END ==='
export const FIREWALL_RULE_PREFIX = 'BARDHIE-BLOCK'

export const DISPLAY_BLOCKED_SITES: string[] = [
  'Facebook',
  'YouTube',
  'Instagram',
  'TikTok',
  'Twitter / X',
  'Messenger'
]

export const BLOCKED_DOMAINS: string[] = [
  'facebook.com',
  'www.facebook.com',
  'm.facebook.com',
  'messenger.com',
  'www.messenger.com',
  'tiktok.com',
  'www.tiktok.com',
  'm.tiktok.com',
  'instagram.com',
  'www.instagram.com',
  'twitter.com',
  'www.twitter.com',
  'x.com',
  'www.x.com',
  't.co',
  'youtube.com',
  'www.youtube.com',
  'm.youtube.com',
  'youtu.be',
  'www.youtu.be'
]

/** Returns true if a browser window title belongs to a blocked social media site. */
export function isBlockedBrowserTitle(title: string): boolean {
  if (!title) return false
  const t = title.toLowerCase()
  if (t.includes('facebook')) return true
  if (t.includes('tiktok')) return true
  if (t.includes('instagram')) return true
  if (t.includes('messenger')) return true
  if (t.includes('youtube')) return true
  if (/\btwitter\b/i.test(title)) return true
  // Twitter/X — title is often just "X" with a browser suffix
  if (/\bX\s*[-–—|]\s*(Google Chrome|Microsoft Edge|Firefox|Brave|Opera|Vivaldi|Mozilla Firefox)/i.test(title)) return true
  if (/\/\s*X(\s*[-–—|]|\s*$)/.test(title)) return true
  if (/^(\(\d+\)\s*)?X(\s*[-–—|]|\s*$)/.test(title)) return true
  return false
}
