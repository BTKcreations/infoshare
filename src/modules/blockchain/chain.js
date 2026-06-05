import { blocks as blocksStore } from '../storage/profile.js';
import { verifyBlock, GENESIS_PREV, computeHash } from './block.js';

export async function loadChain(roomId) {
  return blocksStore.forRoom(roomId);
}

export async function appendBlock(roomId, block) {
  const ok = await verifyBlock(block);
  if (!ok) throw new Error('Block failed verification');
  const existing = await blocksStore.get(roomId, block.index);
  if (existing && existing.hash === block.hash) return false;
  if (existing) {
    throw new Error(`Conflict at index ${block.index}`);
  }
  await blocksStore.put({ roomId, ...block });
  return true;
}

export async function validateChain(chain) {
  if (!chain || chain.length === 0) {
    return { ok: true, reason: 'empty' };
  }
  const sorted = [...chain].sort((a, b) => a.index - b.index);
  if (sorted[0].index !== 0) return { ok: false, reason: 'missing-genesis' };
  if (sorted[0].prevHash !== GENESIS_PREV) return { ok: false, reason: 'bad-genesis-prev', at: 0 };

  for (let i = 0; i < sorted.length; i++) {
    const b = sorted[i];
    const ok = await verifyBlock(b);
    if (!ok) return { ok: false, reason: 'verify-failed', at: i, block: b };
    if (i > 0) {
      const prev = sorted[i - 1];
      if (b.prevHash !== prev.hash) {
        return { ok: false, reason: 'broken-link', at: i, block: b, prev };
      }
      if (b.index !== prev.index + 1) {
        return { ok: false, reason: 'non-sequential', at: i, block: b };
      }
    }
  }
  return { ok: true, length: sorted.length, tip: sorted[sorted.length - 1] };
}

export async function tip(roomId) {
  const chain = await loadChain(roomId);
  if (chain.length === 0) return null;
  return chain[chain.length - 1];
}

export function summarizeBlock(b) {
  return {
    index: b.index,
    hash: b.hash,
    prevHash: b.prevHash,
    authorPubKey: b.authorPubKey,
    timestamp: b.timestamp
  };
}

export { computeHash };
