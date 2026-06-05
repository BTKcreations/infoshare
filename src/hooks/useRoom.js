import { useEffect, useState } from 'react';
import { rooms as roomsStore } from '../modules/storage/profile.js';

export function useRoomList() {
  const [rooms, setRooms] = useState([]);
  const refresh = async () => setRooms(await roomsStore.list());
  useEffect(() => { refresh(); }, []);
  return { rooms, refresh };
}
