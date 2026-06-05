import { bytesToHex, enc, dec, hexToBytes } from './hash.js';

const ALG = { name: 'AES-GCM', length: 256 };

export async function importAesKey(hexKey) {
  const raw = hexToBytes(hexKey);
  return crypto.subtle.importKey('raw', raw, ALG, false, ['encrypt', 'decrypt']);
}

export async function encryptString(plaintext, hexKey) {
  const key = await importAesKey(hexKey);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    enc.encode(plaintext)
  );
  return {
    iv: bytesToHex(iv),
    ciphertext: bytesToHex(new Uint8Array(ct))
  };
}

export async function decryptString({ iv, ciphertext }, hexKey) {
  const key = await importAesKey(hexKey);
  const pt = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: hexToBytes(iv) },
    key,
    hexToBytes(ciphertext)
  );
  return dec.decode(pt);
}

export async function encryptJSON(obj, hexKey) {
  return encryptString(JSON.stringify(obj), hexKey);
}

export async function decryptJSON(payload, hexKey) {
  const s = await decryptString(payload, hexKey);
  return JSON.parse(s);
}
