// Normalize a hostname/URL to a canonical form for storing and matching
// custom domains: lowercase, no protocol, no path/query/port, no leading
// "www.", no trailing dot. Returns '' for anything unusable.
export function normalizeHost(input) {
  if (!input || typeof input !== 'string') return '';
  let h = input.trim().toLowerCase();
  h = h.replace(/^https?:\/\//, ''); // strip protocol
  h = h.split('/')[0];               // strip path
  h = h.split('?')[0];               // strip query
  h = h.split('#')[0];               // strip hash
  h = h.split(':')[0];               // strip port
  h = h.replace(/^www\./, '');       // treat www.x and x as the same host
  h = h.replace(/\.+$/, '');         // strip trailing dot(s)
  return h;
}
