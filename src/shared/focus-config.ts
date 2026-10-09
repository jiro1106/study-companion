export const BLOCK_START_MARKER = '# === BARDHIE FOCUS BLOCK START ==='
export const BLOCK_END_MARKER = '# === BARDHIE FOCUS BLOCK END ==='

export const DISPLAY_BLOCKED_SITES = [
  'Facebook',
  'TikTok',
  'Instagram',
  'Messenger',
  'Twitter / X'
]

export const FIREWALL_RULE_PREFIX = 'BARDHIE Focus Block'

/**
 * True when a browser window/tab title is one of the blocked social sites.
 * Used to close already-open tabs when Focus Mode turns on.
 */
export function isBlockedBrowserTitle(title: string): boolean {
  const t = title.trim()
  if (!t) return false

  if (/facebook/i.test(t)) return true
  if (/tiktok/i.test(t)) return true
  if (/instagram/i.test(t)) return true
  if (/messenger/i.test(t)) return true
  if (/\btwitter\b/i.test(t)) return true

  // X.com titles: "X", "Home / X", "(3) Home / X - Google Chrome"
  if (/\bX\s*[-–—|]\s*(Google Chrome|Microsoft Edge|Firefox|Brave|Opera|Vivaldi|Mozilla Firefox)/i.test(t)) {
    return true
  }
  if (/\/\s*X(\s*[-–—|]|\s*$)/.test(t)) return true
  if (/^(\(\d+\)\s*)?X(\s*[-–—|]|\s*$)/.test(t)) return true

  return false
}

export const BLOCKED_DOMAINS = [
  // ─── Facebook ──────────────────────────────────────────────────────────────
  'facebook.com',
  'www.facebook.com',
  'm.facebook.com',
  'web.facebook.com',
  'touch.facebook.com',
  'l.facebook.com',
  'lm.facebook.com',
  'upload.facebook.com',
  'gateway.facebook.com',
  'api.facebook.com',
  'graph.facebook.com',
  'b-graph.facebook.com',
  'fb.com',
  'www.fb.com',
  'fb.me',
  'connect.facebook.net',
  'static.xx.fbcdn.net',
  'fbsbx.com',
  'www.fbsbx.com',
  'fbcdn.net',
  'www.fbcdn.net',
  'scontent.xx.fbcdn.net',

  // ─── Messenger ─────────────────────────────────────────────────────────────
  'messenger.com',
  'www.messenger.com',
  'm.messenger.com',
  'web.messenger.com',

  // ─── Instagram ─────────────────────────────────────────────────────────────
  'instagram.com',
  'www.instagram.com',
  'm.instagram.com',
  'instagr.am',
  'www.instagr.am',
  'api.instagram.com',
  'graph.instagram.com',
  'cdninstagram.com',
  'www.cdninstagram.com',
  'scontent.cdninstagram.com',
  'ig.me',

  // ─── TikTok ────────────────────────────────────────────────────────────────
  'tiktok.com',
  'www.tiktok.com',
  'm.tiktok.com',
  'v.tiktok.com',
  'vm.tiktok.com',
  'vt.tiktok.com',
  't.tiktok.com',
  'byteoversea.com',
  'www.byteoversea.com',
  'ibytedtos.com',
  'tiktokcdn.com',
  'www.tiktokcdn.com',
  'tiktokcdn-us.com',
  'tiktokv.com',
  'www.tiktokv.com',

  // ─── Twitter / X ───────────────────────────────────────────────────────────
  'twitter.com',
  'www.twitter.com',
  'mobile.twitter.com',
  'api.twitter.com',
  'upload.twitter.com',
  'x.com',
  'www.x.com',
  'api.x.com',
  't.co',
  'twimg.com',
  'www.twimg.com',
  'pbs.twimg.com',
  'abs.twimg.com',
  'video.twimg.com',

  // ─── Secure DNS (DoH) providers ────────────────────────────────────────────
  // Prevents browsers (Chrome/Edge/Firefox) from using DoH to bypass the Windows hosts file
  'cloudflare-dns.com',
  'chrome.cloudflare-dns.com',
  'mozilla.cloudflare-dns.com',
  'dns.google',
  'dns.quad9.net',
  'doh.opendns.com',
  'dns.nextdns.io'
]
