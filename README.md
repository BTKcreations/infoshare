# Web Info Share

A blockchain-based, peer-to-peer, end-to-end encrypted information sharing Progressive Web App. Installable on desktop, Android, iOS, and macOS. Hosted on GitHub Pages.

## What it does

- **First launch** — a registration form collects Full Name, unique Username, Phone, Email, and an optional Bio. Everything except the public fields is encrypted at rest on the device.
- **Dashboard** — create or join rooms by name + password.
- **Room** — every message is a block in a per-room hash chain, encrypted with a key derived from the room password. New peers joining pull the chain from the Gun relay mesh and replay it as an animated stream of chat bubbles.
- **Offline-first** — the app, the chain, and your profile live in IndexedDB. Username claims are queued and published when the relay is reachable.

## Architecture

- **Frontend:** React 18 + Vite
- **Styling:** Tailwind CSS + Framer Motion animations
- **PWA:** vite-plugin-pwa (Workbox SW, manifest, install prompt, iOS meta)
- **P2P:** Gun.js relay mesh (public relays; no server you operate)
- **Storage:** Dexie.js (IndexedDB) for profile, rooms, blocks
- **Crypto:** Web Crypto API only
  - SHA-256 for block hashes and the room ID
  - PBKDF2 (210,000 iterations, SHA-256) for the unlock passphrase key and the per-room key
  - AES-GCM for block content and at-rest profile fields
  - Gun SEA for signing block hashes with the user's keypair
- **Blockchain:** per-room chain, genesis block + sequential blocks, each `hash = SHA-256(index || timestamp || authorPubKey || prevHash || ciphertext || iv)`, each `signature = SEA.sign(hash, priv)`. Full chain validation runs on demand.

## Run locally

```bash
npm install
npm run dev
```

Open http://localhost:5173.

## Build

```bash
npm run build
npm run preview
```

Output is in `dist/`. `base: './'` is set so the build is portable to any GitHub Pages subpath.

## Deploy to GitHub Pages

1. Push this repo to GitHub.
2. In the repository settings -> Pages, set Source to **GitHub Actions**.
3. Push to `main`. The `.github/workflows/deploy.yml` workflow builds and deploys `dist/` to Pages.
4. The first deployment URL is shown in the workflow run.

The manifest, icons, and service worker are wired through `vite-plugin-pwa`. The site is installable as a PWA on Chrome/Edge (Add to Home Screen), Android (Install App), iOS Safari (Share -> Add to Home Screen), and macOS Safari (Add to Dock on supported versions).

## Security model

| Field        | Where it lives                | Who can see it |
|--------------|-------------------------------|----------------|
| Full name    | IndexedDB (plain)             | Anyone with the device |
| Username     | IndexedDB + Gun (pubkey claim pinned on `gun.get('usernames')`) | Public |
| Phone / Email / Bio | IndexedDB, AES-GCM encrypted with key derived from your unlock passphrase | Only you, on this device |
| Private key  | IndexedDB, AES-GCM encrypted  | Only you, on this device |
| Room blocks  | IndexedDB + Gun relay mesh, ciphertext is AES-GCM under the room key | Anyone with the room password (peers can't read content) |
| Block author | Block header carries the author's public key | Public within the room |

The unlock passphrase never leaves the device. The room password is used to derive the room key on this device; it is also never stored in plaintext or sent over the wire (it never needs to be — it just has to match on every device that joins the room).

## How to test the P2P sync

1. Open the deployed app in two browser windows (or two devices).
2. In window A: create account -> create room "demo" with password "pass".
3. In window B: create account (different username) -> join room "demo" with password "pass".
4. Window B's dashboard opens the room. The chain (just the genesis block) animates in.
5. Send a message from either window. The other window sees the new block slide in with its block header (`#N • linking to 0x…`) and then collapses to a chat bubble.

If the public relays are unreachable (firewall, captive portal), the app still works locally for the creator. Joining requires at least one reachable relay to pull the chain. The username-claim is queued when offline and re-attempted on next online.

## File map (high-level)

```
src/
  main.jsx                 entry, SW registration
  App.jsx                  router, gates
  routes/
    Onboarding.jsx         registration
    Unlock.jsx             passphrase unlock
    Dashboard.jsx          room list, create/join
    Room.jsx               chat + chain + reveal
  components/
    BlockReveal.jsx        animated incoming block
    MessageBubble.jsx      settled message
    ChainStatus.jsx        tip + integrity summary
    PeerStatus.jsx         online peer counter
    Toast.jsx              notification system
    RoomCard.jsx
    CreateRoomModal.jsx
    JoinRoomModal.jsx
  modules/
    crypto/                hash, kdf, aes, identity (SEA)
    blockchain/            block, chain, store
    p2p/                   gun, roomSync, presence
    storage/               db (Dexie), profile
    auth/                  session (lock/unlock)
  hooks/
    useUser.js
    useRoom.js
    useChain.js            subscribes, syncs, animates
public/
  manifest.webmanifest     via vite-plugin-pwa
  icons/                   192, 512, maskable
  404.html                 SPA fallback
.github/workflows/
  deploy.yml               build + deploy to GitHub Pages
```

## v1 scope (text only)

The room protocol is content-agnostic — a block's payload is whatever bytes the room key encrypts. v1 only sends and renders UTF-8 text. Future v2 work: images, files, voice notes, multi-device profile sync, chain export/import, conflict-resolution UI, theming.

## License

MIT.
