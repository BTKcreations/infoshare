import { getGun } from './gun.js';
import { verifyBlock, buildMessageBlock } from '../blockchain/block.js';
import { appendBlock, loadChain, tip as getTip } from '../blockchain/chain.js';
import { updateRoomTip } from '../blockchain/store.js';
import { rooms as roomsStore } from '../storage/profile.js';

const subRegistry = new Map();

function blocksNode(roomId) {
  return getGun().get('rooms').get(roomId).get('blocks');
}

function pubToShort(pub) {
  if (!pub) return 'anon';
  if (pub.length < 12) return pub;
  return pub.slice(0, 4) + '…' + pub.slice(-4);
}

export async function publishBlock(roomId, block) {
  const node = blocksNode(roomId).get(block.hash);
  await new Promise((resolve) => {
    let done = false;
    const finish = () => { if (!done) { done = true; resolve(); } };
    node.put(block, (ack) => finish());
    setTimeout(finish, 800);
  });
  return true;
}

export function subscribeRoom(roomId, onBlock) {
  unsubscribeRoom(roomId);
  const node = blocksNode(roomId);
  const seen = new Set();
  const handler = async (data, key) => {
    if (!data || typeof data !== 'object' || !data.hash) return;
    if (seen.has(data.hash)) return;
    seen.add(data.hash);

    const ok = await verifyBlock(data);
    if (!ok) {
      console.warn('Invalid block rejected from peer', data.hash);
      return;
    }
    try {
      const added = await appendBlock(roomId, data);
      if (added) {
        await updateRoomTip(roomId, data);
        const meta = {
          shortAuthor: pubToShort(data.authorPubKey),
          isGenesis: data.index === 0
        };
        onBlock?.(data, meta);
      } else {
        onBlock?.(data, { duplicate: true });
      }
    } catch (e) {
      console.warn('Append failed', e?.message);
    }
  };
  node.map().on(handler);
  subRegistry.set(roomId, { node, handler, seen });
}

export function unsubscribeRoom(roomId) {
  const sub = subRegistry.get(roomId);
  if (!sub) return;
  try {
    sub.node.map().off();
  } catch {}
  subRegistry.delete(roomId);
}

export function activeSubscriptions() {
  return Array.from(subRegistry.keys());
}

export async function loadRemoteChain(roomId) {
  return new Promise((resolve) => {
    const out = [];
    const node = blocksNode(roomId);
    const seen = new Set();
    const timer = setTimeout(() => {
      resolve(out.sort((a, b) => a.index - b.index));
    }, 2500);
    node.map().once(async (data, key) => {
      if (!data || !data.hash || seen.has(data.hash)) return;
      seen.add(data.hash);
      const ok = await verifyBlock(data);
      if (ok) out.push(data);
    });
    setTimeout(() => clearTimeout(timer), 100);
  });
}

export async function sendMessage({ roomId, message, privJwk, pub, roomKeyHex }) {
  const current = await getTip(roomId);
  const prevHash = current ? current.hash : '0'.repeat(64);
  const index = current ? current.index + 1 : 1;
  const block = await buildMessageBlock({
    index,
    prevHash,
    authorPubKey: pub,
    privJwk,
    message,
    roomKeyHex
  });
  const added = await appendBlock(roomId, block);
  if (!added) throw new Error('Block already exists');
  await updateRoomTip(roomId, block);
  await publishBlock(roomId, block);
  return block;
}

export { pubToShort };
