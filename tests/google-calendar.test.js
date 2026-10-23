import test from 'node:test';
import assert from 'node:assert/strict';
import { googleCalendarUrl } from '../googleCalendar.js';
const event = { id: 1, title: '面談 & 相談 #1', date: '2026-10-23', start: '09:05', end: '10:30' };
test('calendar draft preserves Japanese titles, same-day times and explicit Japan timezone', () => {
  const url = new URL(googleCalendarUrl(event));
  assert.equal(url.origin, 'https://calendar.google.com');
  assert.equal(url.searchParams.get('text'), event.title);
  assert.equal(url.searchParams.get('dates'), '20261023T090500/20261023T103000');
  assert.equal(url.searchParams.get('ctz'), 'Asia/Tokyo');
  assert.equal(url.searchParams.get('action'), 'TEMPLATE');
  assert.equal(url.searchParams.has('taskId'), false);
});
test('invalid calendar drafts are not exported', () => {
  for (const patch of [{date:'2026-02-30'}, {end:'08:00'}, {title:''}])
    assert.equal(googleCalendarUrl({...event, ...patch}), null);
});
