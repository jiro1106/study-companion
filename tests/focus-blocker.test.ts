import assert from 'node:assert/strict'
import test from 'node:test'

// @ts-expect-error Node runs this TypeScript test directly and requires its extension.
import { BLOCKED_DOMAINS, DISPLAY_BLOCKED_SITES, BLOCK_START_MARKER, BLOCK_END_MARKER } from '../src/shared/focus-config.ts'

test('blocked domains include required social media sites', () => {
  const domains = BLOCKED_DOMAINS as string[]

  // Facebook
  assert.ok(domains.includes('facebook.com'))
  assert.ok(domains.includes('www.facebook.com'))

  // Messenger
  assert.ok(domains.includes('messenger.com'))
  assert.ok(domains.includes('www.messenger.com'))

  // Instagram
  assert.ok(domains.includes('instagram.com'))
  assert.ok(domains.includes('www.instagram.com'))

  // TikTok
  assert.ok(domains.includes('tiktok.com'))
  assert.ok(domains.includes('www.tiktok.com'))

  // Twitter / X
  assert.ok(domains.includes('twitter.com'))
  assert.ok(domains.includes('x.com'))
  assert.ok(domains.includes('www.x.com'))
})

test('display blocked sites lists the primary social media platforms', () => {
  const sites = DISPLAY_BLOCKED_SITES as string[]
  assert.ok(sites.includes('Facebook'))
  assert.ok(sites.includes('TikTok'))
  assert.ok(sites.includes('Instagram'))
  assert.ok(sites.includes('Messenger'))
  assert.ok(sites.includes('Twitter / X'))
})

test('block markers are well-formed', () => {
  assert.equal(BLOCK_START_MARKER, '# === BARDHIE FOCUS BLOCK START ===')
  assert.equal(BLOCK_END_MARKER, '# === BARDHIE FOCUS BLOCK END ===')
})
