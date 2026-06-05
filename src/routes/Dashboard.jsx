import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '../hooks/useUser.js';
import { useRoomList } from '../hooks/useRoom.js';
import { lockSession } from '../modules/auth/session.js';
import { createLocalRoom, joinLocalRoom } from '../modules/blockchain/store.js';
import RoomCard from '../components/RoomCard.jsx';
import CreateRoomModal from '../components/CreateRoomModal.jsx';
import JoinRoomModal from '../components/JoinRoomModal.jsx';

export default function Dashboard() {
  const user = useUser();
  const navigate = useNavigate();
  const { rooms, refresh } = useRoomList();
  const [createOpen, setCreateOpen] = useState(false);
  const [joinOpen, setJoinOpen] = useState(false);

  if (!user) {
    navigate('/unlock', { replace: true });
    return null;
  }

  const onCreate = async ({ name, password }) => {
    const { roomId } = await createLocalRoom({
      name,
      password,
      pubKey: user.pub,
      displayName: name
    });
    await refresh();
    navigate(`/room/${roomId}`);
  };

  const onJoin = async ({ name, password }) => {
    const { roomId, roomKey } = await joinLocalRoom({
      name,
      password,
      pubKey: user.pub,
      displayName: name
    });
    await refresh();
    navigate(`/room/${roomId}`, { state: { roomKey } });
  };

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-ink-800 px-4 py-3 flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-chain-500/20 flex items-center justify-center">
          <div className="w-4 h-4 rounded bg-chain-500" />
        </div>
        <div className="flex-1">
          <div className="font-semibold">Web Info Share</div>
          <div className="text-xs text-ink-400">
            <span className="text-ink-200">{user.fullName}</span> · <span className="font-mono text-chain-400">@{user.username}</span>
          </div>
        </div>
        <button className="btn-ghost" onClick={() => { lockSession(); navigate('/unlock', { replace: true }); }}>
          Lock
        </button>
      </header>
      <main className="flex-1 p-4 max-w-3xl w-full mx-auto">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xl font-semibold">Your rooms</h1>
          <div className="flex gap-2">
            <button className="btn-ghost" onClick={() => setJoinOpen(true)}>Join</button>
            <button className="btn-primary" onClick={() => setCreateOpen(true)}>Create</button>
          </div>
        </div>
        {rooms.length === 0 ? (
          <div className="card p-8 text-center">
            <div className="text-ink-300 mb-2">No rooms yet</div>
            <p className="text-sm text-ink-500 mb-4">Create a room to anchor the first genesis block, or join an existing one with its name and password.</p>
            <div className="flex gap-2 justify-center">
              <button className="btn-ghost" onClick={() => setJoinOpen(true)}>Join existing</button>
              <button className="btn-primary" onClick={() => setCreateOpen(true)}>Create new</button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {rooms.map((r) => <RoomCard key={r.id} room={r} />)}
          </div>
        )}
      </main>
      <CreateRoomModal open={createOpen} onClose={() => setCreateOpen(false)} onCreate={onCreate} />
      <JoinRoomModal open={joinOpen} onClose={() => setJoinOpen(false)} onJoin={onJoin} />
    </div>
  );
}
