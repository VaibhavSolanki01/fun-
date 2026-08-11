# Driver

A barbershop-styled radio player. Real playback runs through YouTube's
**IFrame Player API** — the spinning disc shows the actual song's
cover art, and play/pause/next/prev genuinely control the video.

## Setup

```bash
npm install
npm start
```

Open **http://localhost:8888**.

Only dependency is **Express**, used to serve the static `public/` folder.
Playback itself needs nothing installed — it loads YouTube's free
`iframe_api` script in the browser (same as embedding any YouTube video).
No API key, login, or account required.

## Adding your own songs

Open `public/js/app.js` and edit the `PLAYLIST_ITEMS` array near the
top. Paste either a full YouTube link or just the video ID:

```js
const PLAYLIST_ITEMS = [
  "https://music.youtube.com/watch?v=N0jnLZxYwYc",
  "xxxxxxxxxxx",
];
```

Title, artist, and cover art are fetched automatically for each track
via YouTube's public oEmbed endpoint — nothing else to type. The
Next/Prev buttons cycle through the array in order.

## Files

```
server.js            Express server — serves everything in /public
public/
  index.html          page structure + the (small, on-page) YouTube player target
  css/style.css       all styling
  js/app.js           YouTube player + all UI behaviour
  assets/             icons + placeholder cover art
```

## How it works

- `app.js` creates a `YT.Player` targeting the hidden `<div id="ytPlayer">`
  in `index.html`. That div becomes a real, controllable YouTube player.
- The play/pause/next/prev buttons and progress bar just call that
  player's own methods (`playVideo`, `pauseVideo`, `seekTo`, ...).
- For each track, YouTube's oEmbed endpoint returns the real title,
  channel name, and thumbnail — no manual data entry.
- The disc only spins while a video is actually playing.
- The YouTube player isn't `display: none` because YouTube's embed
  terms require it to stay on the page. It's shrunk to 2×2px and made
  nearly transparent instead.

## Deploying

Nothing to configure — no redirect URI or domain-bound API key. Run
`npm install && npm start` on your host, and set the `PORT`
environment variable if your host requires a specific port.
