import { useEffect, useState } from 'react';
import { onSessionChange, getSession } from '../modules/auth/session.js';

export function useUser() {
  const [user, setUser] = useState(() => getSession());
  useEffect(() => {
    return onSessionChange((u) => setUser(u));
  }, []);
  return user;
}
