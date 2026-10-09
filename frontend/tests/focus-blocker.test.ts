import assert from 'node:assert/strict'
import test from 'node:test'

// @ts-expect-error Node runs this TypeScript test directly and requires its extension.
import { BLOCKED_DOMAINS, DISPLAY_BLOCKED_SITES, BLOCK_START_MARKER, BLOCK_END_MARKER, FIREWALL_RULE_PREFIX, isBlockedBrowserTitle } from '../src/shared/focus-config.ts'

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

  // YouTube
  assert.ok(domains.includes('youtube.com'))
  assert.ok(domains.includes('www.youtube.com'))
  assert.ok(domains.includes('youtu.be'))
})

test('display blocked sites lists the primary platforms', () => {
  const sites = DISPLAY_BLOCKED_SITES as string[]
  assert.ok(sites.includes('Facebook'))
  assert.ok(sites.includes('YouTube'))
  assert.ok(sites.includes('TikTok'))
  assert.ok(sites.includes('Instagram'))
  assert.ok(sites.includes('Messenger'))
  assert.ok(sites.includes('Twitter / X'))
})

test('block markers are well-formed', () => {
  assert.equal(BLOCK_START_MARKER, '# === BARDY FOCUS BLOCK START ===')
  assert.equal(BLOCK_END_MARKER, '# === BARDY FOCUS BLOCK END ===')
})

test('firewall rule prefix is stable so enable/disable can find the same rules', () => {
  assert.equal(FIREWALL_RULE_PREFIX, 'BARDY-BLOCK')
})

test('isBlockedBrowserTitle matches open tabs for every blocked platform', () => {
  assert.equal(isBlockedBrowserTitle('Facebook'), true)
  assert.equal(isBlockedBrowserTitle('(8) Facebook - Google Chrome'), true)
  assert.equal(isBlockedBrowserTitle('Instagram'), true)
  assert.equal(isBlockedBrowserTitle('TikTok - Make Your Day - Google Chrome'), true)
  assert.equal(isBlockedBrowserTitle('Messenger'), true)
  assert.equal(isBlockedBrowserTitle('(3) YouTube - Google Chrome'), true)
  assert.equal(isBlockedBrowserTitle('Twitter / X - Mozilla Firefox'), true)
  assert.equal(isBlockedBrowserTitle('Home / X - Google Chrome'), true)
  assert.equal(isBlockedBrowserTitle('X - Microsoft Edge'), true)
})

test('isBlockedBrowserTitle ignores unrelated browser tabs', () => {
  assert.equal(isBlockedBrowserTitle(''), false)
  assert.equal(isBlockedBrowserTitle('Google'), false)
  assert.equal(isBlockedBrowserTitle('Bardy'), false)
  assert.equal(isBlockedBrowserTitle('Microsoft Excel'), false)
  assert.equal(isBlockedBrowserTitle('GitHub - Google Chrome'), false)
})
