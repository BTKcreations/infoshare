import { sha256, stableStringify } from '../crypto/hash.js';
import { buildGenesisBlock, buildMessageBlock, verifyBlock, decryptBlockContent } from './block.js';
import { appendBlock, loadChain, tip, validateChain } from './chain.js';
import { rooms as roomsStore, blocks as blocksStore } from '../storage/profile.js';
import { deriveRoomKeyHex } from '../crypto/kdf.js';

export async function getOrCreateRoomId(roomName) {
  const normalized = String(roomName || '').trim().toLowerCase();
  return sha256(normalized);
}

export async function computeRoomKey(roomName, roomPassword) {
  return deriveRoomKeyHex(roomName, roomPassword);
}

export async function createLocalRoom({ name, password, pubKey, displayName }) {
  const roomId = await getOrCreateRoomId(name);
  const existing = await roomsStore.get(roomId);
  if (existing) {
    return { room: existing, roomId, alreadyExisted: true };
  }
  const createdAt = Date.now();
  const genesis = await buildGenesisBlock({
    authorPubKey: pubKey,
    roomId,
    roomName: name,
    createdAt
  });
  await blocksStore.put({ roomId, ...genesis });
  const record = {
    id: roomId,
    name,
    displayName: displayName || name,
    passwordHash: null,
    roomKey: null,
    joinedAt: createdAt,
    lastBlockHash: genesis.hash,
    height: 0,
    createdByMe: true
  };
  await roomsStore.put(record);
  return { room: record, roomId, alreadyExisted: false, genesis };
}

export async function joinLocalRoom({ name, password, pubKey, displayName }) {
  const roomId = await getOrCreateRoomId(name);
  const roomKey = await computeRoomKey(name, password);
  const existing = await roomsStore.get(roomId);
  const record = existing || {
    id: roomId,
    name,
    displayName: displayName || name,
    joinedAt: Date.now(),
    lastBlockHash: null,
    height: -1,
    createdByMe: false
  };
  record.name = name;
  record.displayName = displayName || name;
  record.roomKey = roomKey;
  await roomsStore.put(record);
  return { room: record, roomId, roomKey };
}

export async function setRoomKey(roomId, roomKey) {
  const r = await roomsStore.get(roomId);
  if (!r) return;
  r.roomKey = roomKey;
  await roomsStore.put(r);
  return r;
}

export async function updateRoomTip(roomId, tipBlock) {
  const r = await roomsStore.get(roomId);
  if (!r) return;
  r.lastBlockHash = tipBlock.hash;
  r.height = tipBlock.index;
  await roomsStore.put(r);
}

export {
  buildMessageBlock,
  appendBlock,
  loadChain,
  tip,
  validateChain,
  verifyBlock,
  decryptBlockContent
};
