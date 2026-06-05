import Dexie from 'dexie';

export const db = new Dexie('WebInfoShareDB');

db.version(1).stores({
  profile: 'id',
  rooms: 'id, name, joinedAt',
  blocks: '[roomId+index], roomId, hash, timestamp',
  kv: 'key'
});

db.open().catch((err) => {
  console.error('Dexie open failed', err);
});
