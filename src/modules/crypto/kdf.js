import { bytesToHex, hexToBytes, enc } from './hash.js';

const DEFAULT_ITERATIONS = 210_000;
const HASH = 'SHA-256';
const KEY_LEN = 256;

export async function deriveKey(passphrase, saltBytes, iterations = DEFAULT_ITERATIONS) {
  const baseKey = await crypto.subtle.importKey(
    'raw',
    enc.encode(passphrase),
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );
  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: saltBytes,
      iterations,
      hash: HASH
    },
    baseKey,
    { name: 'AES-GCM', length: KEY_LEN },
    true,
    ['encrypt', 'decrypt']
  );
}

export async function deriveKeyHex(passphrase, saltHex, iterations = DEFAULT_ITERATIONS) {
  const saltBytes = typeof saltHex === 'string' ? hexToBytes(saltHex) : saltHex;
  const key = await deriveKey(passphrase, saltBytes, iterations);
  const raw = await crypto.subtle.exportKey('raw', key);
  return bytesToHex(new Uint8Array(raw));
}

export function randomSalt(bytesLen = 16) {
  const salt = crypto.getRandomValues(new Uint8Array(bytesLen));
  return bytesToHex(salt);
}

export async function deriveRoomKeyHex(roomName, roomPassword, iterations = DEFAULT_ITERATIONS) {
  const normalized = String(roomName || '').trim().toLowerCase();
  const salt = enc.encode(normalized);
  const baseKey = await crypto.subtle.importKey(
    'raw',
    enc.encode(roomPassword),
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );
  const key = await crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations, hash: HASH },
    baseKey,
    { name: 'AES-GCM', length: KEY_LEN },
    true,
    ['encrypt', 'decrypt']
  );
  const raw = await crypto.subtle.exportKey('raw', key);
  return bytesToHex(new Uint8Array(raw));
}

export const KDF_PARAMS = { iterations: DEFAULT_ITERATIONS, hash: HASH, keyLen: KEY_LEN };
