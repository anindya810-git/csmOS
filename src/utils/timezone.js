export const COMMON_TIMEZONES = [
  { value: 'Asia/Kolkata',         label: 'IST — India (UTC+5:30)' },
  { value: 'UTC',                  label: 'UTC' },
  { value: 'America/New_York',     label: 'EST/EDT — New York (UTC−5/−4)' },
  { value: 'America/Chicago',      label: 'CST/CDT — Chicago (UTC−6/−5)' },
  { value: 'America/Los_Angeles',  label: 'PST/PDT — Los Angeles (UTC−8/−7)' },
  { value: 'Europe/London',        label: 'GMT/BST — London (UTC+0/+1)' },
  { value: 'Europe/Berlin',        label: 'CET/CEST — Berlin (UTC+1/+2)' },
  { value: 'Asia/Singapore',       label: 'SGT — Singapore (UTC+8)' },
  { value: 'Asia/Tokyo',           label: 'JST — Tokyo (UTC+9)' },
  { value: 'Asia/Dubai',           label: 'GST — Dubai (UTC+4)' },
  { value: 'Asia/Shanghai',        label: 'CST — Shanghai (UTC+8)' },
  { value: 'Australia/Sydney',     label: 'AEST — Sydney (UTC+10/+11)' },
  { value: 'Pacific/Auckland',     label: 'NZST — Auckland (UTC+12/+13)' },
];

const TZ_KEY = (userId) => `csmos_tz_${userId}`;

export function getUserTZ(userId) {
  if (!userId) return Intl.DateTimeFormat().resolvedOptions().timeZone;
  try {
    return localStorage.getItem(TZ_KEY(userId)) || Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  }
}

export function setUserTZ(userId, tz) {
  if (!userId || !tz) return;
  try { localStorage.setItem(TZ_KEY(userId), tz); } catch {}
}

export function fmtDTwithTZ(iso, tz) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString('en-IN', {
      timeZone: tz || Intl.DateTimeFormat().resolvedOptions().timeZone,
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit', hour12: true,
    });
  } catch {
    try { return new Date(iso).toLocaleString(); } catch { return String(iso); }
  }
}

export function fmtDatewithTZ(iso, tz) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString('en-IN', {
      timeZone: tz || Intl.DateTimeFormat().resolvedOptions().timeZone,
      day: '2-digit', month: 'short', year: 'numeric',
    });
  } catch {
    return String(iso);
  }
}
