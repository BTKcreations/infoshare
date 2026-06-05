import { encryptString, decryptString } from './aes.js';
import { deriveKey } from './kdf.js';
import { db } from '../storage/db.js';
import { profile as profileStore } from '../storage/profile.js';
import { hexToBytes, bytesToHex } from './hash.js';

const SIG_ALG = { name: 'ECDSA', namedCurve: 'P-256' };

let memPassphraseKeyHex = null;
let memPrivJwk = null;
let memPubKey = null;
let memUsername = null;
let memUser = null;

export async function generateKeypair() {
  const kp = await crypto.subtle.generateKey(SIG_ALG, true, ['sign', 'verify']);
  const pubBuf = await crypto.subtle.exportKey('raw', kp.publicKey);
  const privJwk = await crypto.subtle.exportKey('jwk', kp.privateKey);
  return {
    pub: bytesToHex(new Uint8Array(pubBuf)),
    privJwk: JSON.stringify(privJwk)
  };
}

export async function signHash(hashHex, privJwkStr) {
  if (!privJwkStr) return '';
  try {
    const jwk = typeof privJwkStr === 'string' ? JSON.parse(privJwkStr) : privJwkStr;
    const privKey = await crypto.subtle.importKey('jwk', jwk, SIG_ALG, false, ['sign']);
    const sig = await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, privKey, hexToBytes(hashHex));
    return bytesToHex(new Uint8Array(sig));
  } catch (e) {
    console.warn('[signHash] failed:', e?.message);
    return '';
  }
}

export async function verifySignature(hashHex, signatureHex, pubHex) {
  if (!signatureHex || !pubHex) return false;
  try {
    const pubKey = await crypto.subtle.importKey('raw', hexToBytes(pubHex), SIG_ALG, false, ['verify']);
    return await crypto.subtle.verify(
      { name: 'ECDSA', hash: 'SHA-256' },
      pubKey,
      hexToBytes(signatureHex),
      hexToBytes(hashHex)
    );
  } catch {
    return false;
  }
}

export async function publishUsernameClaim(username, pub) {
  try {
    const { getGun } = await import('../p2p/gun.js');
    const gun = getGun();
    return new Promise((resolve) => {
      let done = false;
      const finish = (v) => { if (!done) { done = true; resolve(v); } };
      const node = gun.get('usernames').get(username.toLowerCase()).get('pub');
      node.once((existing) => {
        if (existing && existing !== pub) {
          finish({ ok: false, takenBy: existing });
        } else {
          node.put(pub);
          finish({ ok: true });
        }
        setTimeout(() => finish({ ok: true }), 1500);
      });
    });
  } catch (e) {
    return { ok: true, offline: true };
  }
}

export async function checkUsernameAvailable(username) {
  try {
    const { getGun } = await import('../p2p/gun.js');
    const gun = getGun();
    return new Promise((resolve) => {
      let resolved = false;
      const finish = (v) => { if (!resolved) { resolved = true; resolve(v); } };
      const timer = setTimeout(() => finish({ available: true, offline: true }), 1500);
      gun.get('usernames').get(username.toLowerCase()).get('pub').once((existing) => {
        clearTimeout(timer);
        finish({ available: !existing, takenBy: existing || null });
      });
    });
  } catch {
    return { available: true, offline: true };
  }
}

export function rememberActiveUser({ user, privJwk, pub, passphraseKeyHex }) {
  memPassphraseKeyHex = passphraseKeyHex;
  memPrivJwk = privJwk;
  memPubKey = pub;
  memUsername = user.username;
  memUser = user;
}

export function clearActiveUser() {
  memPassphraseKeyHex = null;
  memPrivJwk = null;
  memPubKey = null;
  memUsername = null;
  memUser = null;
}

export function activeUser() {
  if (!memUser) return null;
  return {
    ...memUser,
    privJwk: memPrivJwk,
    pub: memPubKey,
    passphraseKeyHex: memPassphraseKeyHex
  };
}

export async function persistProfile({ user, privJwk, passphrase }) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const k = await deriveKey(passphrase, salt);
  const raw = await crypto.subtle.exportKey('raw', k);
  const passphraseKeyHex = Array.from(new Uint8Array(raw))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');

  const encryptedPriv = await encryptString(privJwk, passphraseKeyHex);
  const phoneEnc = user.phone ? await encryptString(user.phone, passphraseKeyHex) : null;
  const emailEnc = user.email ? await encryptString(user.email, passphraseKeyHex) : null;
  const bioEnc = user.bio ? await encryptString(user.bio, passphraseKeyHex) : null;

  const record = {
    id: 'me',
    fullName: user.fullName,
    username: user.username.toLowerCase(),
    phoneEnc,
    emailEnc,
    bioEnc,
    pubKey: user.pub,
    encPrivJwk: encryptedPriv,
    encSalt: Array.from(salt),
    kdfParams: { iterations: 210_000, hash: 'SHA-256' },
    createdAt: Date.now()
  };
  await profileStore.put(record);
  return { passphraseKeyHex, record };
}

export async function loadProfile() {
  return profileStore.get('me');
}

export async function unlockProfile(passphrase) {
  const rec = await profileStore.get('me');
  if (!rec) return null;
  const salt = new Uint8Array(rec.encSalt);
  const k = await deriveKey(passphrase, salt, rec.kdfParams?.iterations || 210_000);
  const raw = await crypto.subtle.exportKey('raw', k);
  const passphraseKeyHex = Array.from(new Uint8Array(raw))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');

  let privJwk;
  try {
    privJwk = await decryptString(rec.encPrivJwk, passphraseKeyHex);
  } catch {
    return null;
  }

  let phone = null, email = null, bio = null;
  if (rec.phoneEnc) phone = await decryptString(rec.phoneEnc, passphraseKeyHex);
  if (rec.emailEnc) email = await decryptString(rec.emailEnc, passphraseKeyHex);
  if (rec.bioEnc) bio = await decryptString(rec.bioEnc, passphraseKeyHex);

  const user = {
    id: rec.id,
    fullName: rec.fullName,
    username: rec.username,
    phone,
    email,
    bio,
    pub: rec.pubKey,
    createdAt: rec.createdAt
  };
  rememberActiveUser({ user, privJwk, pub: rec.pubKey, passphraseKeyHex });
  return user;
}
