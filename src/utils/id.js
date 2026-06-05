export function normalizeUsername(name) {
  return String(name || '').trim().toLowerCase().replace(/[^a-z0-9_\-]/g, '');
}

export function suggestUsername(base) {
  const n = normalizeUsername(base) || 'user';
  const suffix = Math.random().toString(16).slice(2, 6);
  return `${n}#${suffix}`;
}

export function isValidRoomName(name) {
  const n = String(name || '').trim();
  return n.length >= 2 && n.length <= 64;
}

export function isValidPassphrase(p) {
  return typeof p === 'string' && p.length >= 4;
}
