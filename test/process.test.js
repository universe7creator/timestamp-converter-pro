const test = require('node:test');
const assert = require('node:assert/strict');

const handler = require('../api/process');

function createResponse() {
  return {
    statusCode: 200,
    headers: {},
    body: undefined,
    ended: false,
    setHeader(name, value) {
      this.headers[name.toLowerCase()] = value;
      return this;
    },
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      this.ended = true;
      return this;
    },
    end() {
      this.ended = true;
      return this;
    }
  };
}

async function callProcess(method, body = {}) {
  const req = { method, body };
  const res = createResponse();

  await handler(req, res);

  return res;
}

test('converts Unix seconds input', async () => {
  const res = await callProcess('POST', { input: '1704067200' });

  assert.equal(res.statusCode, 200);
  assert.equal(res.body.success, true);
  assert.equal(res.body.detectedFormat, 'Unix Timestamp (Seconds)');
  assert.equal(res.body.conversions.unixSeconds, 1704067200);
  assert.equal(res.body.conversions.unixMilliseconds, 1704067200000);
  assert.equal(res.body.conversions.iso8601, '2024-01-01T00:00:00.000Z');
});

test('converts Unix milliseconds input', async () => {
  const res = await callProcess('POST', { timestamp: '1704067200000' });

  assert.equal(res.statusCode, 200);
  assert.equal(res.body.success, true);
  assert.equal(res.body.detectedFormat, 'Unix Timestamp (Milliseconds)');
  assert.equal(res.body.conversions.unixSeconds, 1704067200);
  assert.equal(res.body.conversions.unixMilliseconds, 1704067200000);
  assert.equal(res.body.conversions.iso8601, '2024-01-01T00:00:00.000Z');
});

test('converts ISO date input', async () => {
  const res = await callProcess('POST', { input: '2024-05-01T00:00:00Z' });

  assert.equal(res.statusCode, 200);
  assert.equal(res.body.success, true);
  assert.equal(res.body.detectedFormat, 'ISO 8601 / Standard Date');
  assert.equal(res.body.conversions.unixSeconds, 1714521600);
  assert.equal(res.body.conversions.unixMilliseconds, 1714521600000);
  assert.equal(res.body.conversions.iso8601, '2024-05-01T00:00:00.000Z');
});

test('converts keyword input without brittle current-time assertions', async () => {
  const before = Date.now();
  const res = await callProcess('POST', { input: 'now' });
  const after = Date.now();
  const convertedMs = res.body.conversions.unixMilliseconds;

  assert.equal(res.statusCode, 200);
  assert.equal(res.body.success, true);
  assert.equal(res.body.detectedFormat, 'Current Time');
  assert.ok(convertedMs >= before && convertedMs <= after);
  assert.equal(Date.parse(res.body.conversions.iso8601), convertedMs);
});

test('returns 400 for invalid input', async () => {
  const res = await callProcess('POST', { input: 'not-a-valid-date' });

  assert.equal(res.statusCode, 400);
  assert.deepEqual(res.body, {
    error: 'Unable to parse timestamp',
    input: 'not-a-valid-date'
  });
});

test('returns 405 for non-POST methods', async () => {
  const res = await callProcess('GET');

  assert.equal(res.statusCode, 405);
  assert.deepEqual(res.body, { error: 'Method not allowed' });
});
