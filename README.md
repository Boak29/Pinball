# Pinball

Pinball game developed in JavaScript with Phaser v2 + Box2D.

![alt screenshot](https://raw.githubusercontent.com/lrusso/Pinball/main/Pinball.png)

## Web:

https://lrusso.github.io/Pinball/Pinball.htm

## TikTok LIVE Interactive Mode

Game ini bisa dijadikan **TikTok LIVE Interactive Game** — penonton bisa mengirim gift untuk memicu aksi di game!

### Cara Kerja

```
Penonton kirim gift → TikTok LIVE → Relay Server (cloud) → Game di HP streamer
```

### Interaksi Gift

| Gift | Aksi |
|------|------|
| Gift murah (1 diamond) | **Extra Ball** — bola tambahan muncul |
| Gift sedang (2-10 diamond) | **Power-up** — Speed boost / Wider flippers / 3x Score |
| Gift mahal (11-50 diamond) | **Sabotase** — Screen shake / Heavy gravity / Weak flippers |
| Gift VIP (50+ diamond) | **Obstacle** — rintangan baru muncul di meja |

### Setup

#### 1. Deploy Relay Server (sekali saja)

```bash
cd tiktok-relay-server
npm install
npm start
```

Atau deploy ke **Railway** / **Render** (free tier):
- Buat repo terpisah dengan folder `tiktok-relay-server`
- Set build command: `npm install`
- Set start command: `node index.js`
- Server akan berjalan di port yang diberikan

#### 2. Mainkan Game

Buka game dengan parameter:
```
PinballGame.htm?user=username_tiktok&ws=wss://relay-server-url
```

- `user` = username TikTok kamu (tanpa @)
- `ws` = URL WebSocket relay server

Contoh:
```
PinballGame.htm?user=pinball_streamer&ws=wss://tiktok-pinball-relay.onrender.com
```

#### 3. Streaming

1. Buka URL game di browser HP
2. Mulai TikTok LIVE dari HP
3. Screen share game ke TikTok LIVE
4. Penonton kirim gift → game bereaksi otomatis

### Testing Tanpa TikTok

Untuk testing, buka:
```
PinballGame.htm?user=test_user
```
Game akan tetap berjalan normal tanpa koneksi TikTok.

## Based on the work of:

https://phaser.io/examples/v2/box2d/pinball
