import test from 'node:test';
import assert from 'node:assert/strict';
import { EXPIRED_TEXT, expiryLabel, serverSettlesExpired } from './confirmExpiry.js';

test('a past laptop clock shows the expiry label and does not settle the card', () => {
  const label = expiryLabel('2020-01-01T00:00:00.000Z', Date.parse('2026-01-01T00:00:00.000Z'));
  assert.equal(label, EXPIRED_TEXT);
  assert.equal(expiryLabel('2026-01-01T00:05:00.000Z', Date.parse('2026-01-01T00:00:00.000Z')), 'expires in 5 min');
});

test('only a 410 or a server status of expired settles the card', () => {
  assert.equal(serverSettlesExpired(410, 'gone'), true);
  assert.equal(serverSettlesExpired(200, 'expired'), true);
  assert.equal(serverSettlesExpired(409, 'executing'), false);
  assert.equal(serverSettlesExpired(200, 'done'), false);
});
