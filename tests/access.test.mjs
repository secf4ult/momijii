import test from 'node:test';
import assert from 'node:assert/strict';
import { ACCESS_SESSION_KEY, acceptsPassword } from '../lib/access.mjs';
test('lightweight access prompt accepts only the configured password', () => {
  assert.equal(acceptsPassword('momiji'), true);
  for (const value of ['', 'wrong', 'Momiji', ' momiji', 'momiji ']) assert.equal(acceptsPassword(value), false);
  assert.equal(ACCESS_SESSION_KEY, 'momijii-access-v1');
});
