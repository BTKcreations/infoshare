import Gun from 'gun';

const RELAYS = [
  'https://gun-manhattan.herokuapp.com/gun',
  'https://peer.warpgun.com/gun',
  'https://gundb-relay-mlccl.ondigitalocean.app/gun'
];

let gunInstance = null;

export function getGun() {
  if (gunInstance) return gunInstance;
  gunInstance = Gun({
    peers: RELAYS,
    localStorage: false,
    radisk: true,
    axe: false,
    multicast: false
  });
  return gunInstance;
}

export function isOnline() {
  return typeof navigator !== 'undefined' ? navigator.onLine : true;
}
