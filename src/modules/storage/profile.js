import { db } from './db.js';

export const profile = {
  async get(id = 'me') {
    return db.table('profile').get(id);
  },
  async put(record) {
    return db.table('profile').put(record);
  },
  async clear() {
    return db.table('profile').clear();
  }
};

export const rooms = {
  async list() {
    return db.table('rooms').toArray();
  },
  async get(id) {
    return db.table('rooms').get(id);
  },
  async put(record) {
    return db.table('rooms').put(record);
  },
  async remove(id) {
    return db.table('rooms').delete(id);
  }
};

export const blocks = {
  async forRoom(roomId) {
    return db.table('blocks').where('roomId').equals(roomId).sortBy('index');
  },
  async put(record) {
    return db.table('blocks').put(record);
  },
  async get(roomId, index) {
    return db.table('blocks').get([roomId, index]);
  },
  async byHash(hash) {
    return db.table('blocks').where('hash').equals(hash).first();
  },
  async countForRoom(roomId) {
    return db.table('blocks').where('roomId').equals(roomId).count();
  },
  async clearRoom(roomId) {
    return db.table('blocks').where('roomId').equals(roomId).delete();
  }
};

export const kv = {
  async get(key) {
    const r = await db.table('kv').get(key);
    return r?.value;
  },
  async set(key, value) {
    return db.table('kv').put({ key, value });
  },
  async remove(key) {
    return db.table('kv').delete(key);
  }
};
