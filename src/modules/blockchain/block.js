import { sha256, stableStringify, enc, dec } from '../crypto/hash.js';
import { encryptString, decryptString } from '../crypto/aes.js';
import { signHash, verifySignature } from '../crypto/identity.js';

export const GENESIS_PREV = '0'.repeat(64);

export function blockPayloadForHash(b) {
  return stableStringify({
    index: b.index,
    timestamp: b.timestamp,
    authorPubKey: b.authorPubKey,
    prevHash: b.prevHash,
    ciphertext: b.ciphertext,
    iv: b.iv
  });
}

export async function computeHash(b) {
  return sha256(blockPayloadForHash(b));
}

export async function buildGenesisBlock({ authorPubKey, roomId, roomName, createdAt }) {
  const meta = { type: 'genesis', roomId, roomName, createdAt };
  const enc = await encryptString(JSON.stringify(meta), await sha256(roomId));
  const block = {
    index: 0,
    timestamp: createdAt,
    authorPubKey,
    prevHash: GENESIS_PREV,
    ciphertext: enc.ciphertext,
    iv: enc.iv,
    signature: ''
  };
  block.hash = await computeHash(block);
  block.signature = await signHash(block.hash, authorPubKey).catch(() => '');
  return block;
}

export async function buildMessageBlock({ index, prevHash, authorPubKey, priv, message, roomKeyHex, timestamp }) {
  const enc = await encryptString(message, roomKeyHex);
  const block = {
    index,
    timestamp: timestamp || Date.now(),
    authorPubKey,
    prevHash,
    ciphertext: enc.ciphertext,
    iv: enc.iv,
    signature: ''
  };
  block.hash = await computeHash(block);
  block.signature = priv ? await signHash(block.hash, priv) : '';
  return block;
}

export async function verifyBlock(b) {
  if (typeof b.index !== 'number') return false;
  if (typeof b.timestamp !== 'number') return false;
  if (!b.authorPubKey || !b.prevHash || !b.ciphertext || !b.iv) return false;
  const recomputed = await computeHash(b);
  if (recomputed !== b.hash) return false;
  if (b.index === 0) {
    if (b.prevHash !== GENESIS_PREV) return false;
  }
  if (b.signature) {
    const ok = await verifySignature(b.hash, b.signature, b.authorPubKey);
    if (!ok) return false;
  }
  return true;
}

export async function decryptBlockContent(b, roomKeyHex) {
  try {
    if (b.index === 0) {
      const metaKey = await sha256(stableStringify({ type: 'genesis' }));
      return JSON.parse(await decryptString({ iv: b.iv, ciphertext: b.ciphertext }, metaKey));
    }
    return await decryptString({ iv: b.iv, ciphertext: b.ciphertext }, roomKeyHex);
  } catch (e) {
    return null;
  }
}
