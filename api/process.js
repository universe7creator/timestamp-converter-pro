module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-License-Key');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { timestamp, input, format } = req.body;
    const inputValue = timestamp || input;

    if (!inputValue) {
      return res.status(400).json({ error: 'No timestamp or input provided' });
    }

    // Parse the timestamp
    const result = parseTimestamp(inputValue);

    if (!result) {
      return res.status(400).json({ error: 'Unable to parse timestamp', input: inputValue });
    }

    const date = result.date;
    const unixSeconds = Math.floor(date.getTime() / 1000);
    const unixMs = date.getTime();

    return res.status(200).json({
      success: true,
      input: inputValue,
      detectedFormat: result.format,
      conversions: {
        unixSeconds: unixSeconds,
        unixMilliseconds: unixMs,
        iso8601: date.toISOString(),
        utcString: date.toUTCString(),
        localString: date.toLocaleString(),
        dateString: date.toDateString(),
        timeString: date.toTimeString(),
        year: date.getFullYear(),
        month: date.getMonth() + 1,
        day: date.getDate(),
        hours: date.getHours(),
        minutes: date.getMinutes(),
        seconds: date.getSeconds(),
        milliseconds: date.getMilliseconds(),
        timezoneOffset: date.getTimezoneOffset()
      },
      relativeTime: formatRelativeTime(date),
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    return res.status(500).json({ error: 'Internal server error', message: error.message });
  }
};

function formatRelativeTime(date) {
  const now = new Date();
  const diff = date.getTime() - now.getTime();
  const absDiff = Math.abs(diff);
  const isPast = diff < 0;

  const seconds = Math.floor(absDiff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  const months = Math.floor(days / 30);
  const years = Math.floor(days / 365);

  let text = '';
  if (years > 0) text = `${years} year${years > 1 ? 's' : ''}`;
  else if (months > 0) text = `${months} month${months > 1 ? 's' : ''}`;
  else if (days > 0) text = `${days} day${days > 1 ? 's' : ''}`;
  else if (hours > 0) text = `${hours} hour${hours > 1 ? 's' : ''}`;
  else if (minutes > 0) text = `${minutes} minute${minutes > 1 ? 's' : ''}`;
  else text = `${seconds} second${seconds !== 1 ? 's' : ''}`;

  return {
    text: isPast ? `${text} ago` : `in ${text}`,
    isPast: isPast,
    differenceMs: diff
  };
}

function parseTimestamp(input) {
  input = String(input).trim();
  if (!input) return null;

  const now = new Date();

  // Handle special keywords
  if (input.toLowerCase() === 'now') return { date: now, format: 'Current Time' };
  if (input.toLowerCase() === 'today') return { date: now, format: 'Today' };
  if (input.toLowerCase() === 'yesterday') {
    return { date: new Date(now.getTime() - 24 * 60 * 60 * 1000), format: 'Yesterday' };
  }
  if (input.toLowerCase() === 'tomorrow') {
    return { date: new Date(now.getTime() + 24 * 60 * 60 * 1000), format: 'Tomorrow' };
  }

  // Unix timestamp (seconds) - 10 digits
  if (/^\d{10}$/.test(input)) {
    return { date: new Date(parseInt(input) * 1000), format: 'Unix Timestamp (Seconds)' };
  }

  // Unix timestamp (milliseconds) - 13 digits
  if (/^\d{13}$/.test(input)) {
    return { date: new Date(parseInt(input)), format: 'Unix Timestamp (Milliseconds)' };
  }

  // Unix timestamp (any numeric)
  if (/^\d+$/.test(input)) {
    const num = parseInt(input);
    if (num < 10000000000) {
      return { date: new Date(num * 1000), format: 'Unix Timestamp (Seconds)' };
    } else {
      return { date: new Date(num), format: 'Unix Timestamp (Milliseconds)' };
    }
  }

  // ISO 8601 or other standard format
  const date = new Date(input);
  if (!isNaN(date.getTime())) {
    return { date, format: 'ISO 8601 / Standard Date' };
  }

  return null;
}
