// Bus Driver — player behaviour
//
// 1. PLAYER   — YouTube's IFrame Player API turns the hidden
//               <div id="ytPlayer"> into a real, controllable player.
// 2. METADATA — for each track we call YouTube's public oEmbed
//               endpoint to get the real title, channel, and thumbnail.
// 3. UI       — we mirror whatever the player + oEmbed tell us: spin
//               the disc, fill the progress bar, swap the cover art.
//
// To use your own songs, edit PLAYLIST_ITEMS below (video ID or full link).

(() => {
  const PLAYLIST_ITEMS = [
    "https://music.youtube.com/watch?v=zuPoUsdXrqM&list=PLTJ1PnzCWyFw",
    "https://music.youtube.com/watch?v=N0jnLZxYwYc&list=PLTJ1PnzCWyFw",
    "https://music.youtube.com/watch?v=oFxbBeYhLqM&list=PLTJ1PnzCWyFw",
    "https://music.youtube.com/watch?v=CTuvMubzXpU&list=PLTJ1PnzCWyFw",
    "https://music.youtube.com/watch?v=d3lZvNexPL0&list=PLTJ1PnzCWyFw",
    "https://music.youtube.com/watch?v=CTNgz5gb3D8&list=PLTJ1PnzCWyFw",
    "https://music.youtube.com/watch?v=lFdSi01tpYM&list=PLTJ1PnzCWyFw",
    "https://music.youtube.com/watch?v=otQmzlm-s7Q&list=PLTJ1PnzCWyFw",
    "https://music.youtube.com/watch?v=tPNwGuu_rQ4&list=PLTJ1PnzCWyFw",
    "https://music.youtube.com/watch?v=nRJ8vHpi6_g&list=PLTJ1PnzCWyFw",
    "https://music.youtube.com/watch?v=xKx_80QM2LU&list=PLTJ1PnzCWyFw",
    "https://music.youtube.com/watch?v=wYdXuNtJkPk&list=PLTJ1PnzCWyFw",
    "https://music.youtube.com/watch?v=zuPoUsdXrqM&list=PLTJ1PnzCWyFw"
  ];

  const PLAYLIST_IDS = PLAYLIST_ITEMS.map(normalizeVideoId);

  function normalizeVideoId(value) {
    if (typeof value !== "string") return "";
    const idMatch = value.match(/[?&]v=([A-Za-z0-9_-]{11})/) || value.match(/youtu\.be\/([A-Za-z0-9_-]{11})/) || value.match(/([A-Za-z0-9_-]{11})$/);
    return idMatch ? idMatch[1] : value;
  }

  const player = document.querySelector(".player-bar");
  const playToggle = document.getElementById("playToggle");
  const prevTrack = document.getElementById("prevTrack");
  const nextTrack = document.getElementById("nextTrack");
  const currentTimeEl = document.getElementById("currentTime");
  const durationEl = document.getElementById("duration");
  const progressFill = document.getElementById("progressFill");
  const progressTrack = document.getElementById("progressTrack");
  const listenerCountEl = document.getElementById("listenerCount");
  const clockEl = document.getElementById("clock");
  const trackTitleEl = document.getElementById("trackTitle");
  const trackArtistEl = document.getElementById("trackArtist");
  const coverArtEl = document.getElementById("coverArt");

  let ytPlayer = null; // the YT.Player instance, once the API is ready
  let apiReady = false;
  let trackIndex = 0;
  let tickTimer = null;
  let pendingAutoplay = false; // true if the visitor pressed play before the API finished loading
  let metaRequestToken = 0; // guards against a slow oEmbed reply landing after we've moved on

  /* ======================================================================
     1. PLAYER — YouTube IFrame Player API
     ====================================================================== */

  // Called automatically by the YouTube API script once it's loaded.
  window.onYouTubeIframeAPIReady = () => {
    apiReady = true;
    ytPlayer = new YT.Player("ytPlayer", {
      height: "100%",
      width: "100%",
      videoId: PLAYLIST_IDS[trackIndex],
      playerVars: {
        controls: 0,
        disablekb: 1,
        modestbranding: 1,
        rel: 0,
        playsinline: 1,
      },
      events: {
        onReady: () => {
          if (pendingAutoplay) {
            ytPlayer.playVideo();
            pendingAutoplay = false;
          }
        },
        onStateChange: onPlayerStateChange,
      },
    });
  };

  function onPlayerStateChange(event) {
    if (event.data === YT.PlayerState.PLAYING) {
      setPlayingState(true);
    } else if (event.data === YT.PlayerState.PAUSED) {
      setPlayingState(false);
    } else if (event.data === YT.PlayerState.ENDED) {
      setPlayingState(false);
      goToTrack(trackIndex + 1, { autoplay: true });
    }
  }

  /* ======================================================================
     2. METADATA — real title/artist/cover per track, via oEmbed
     ====================================================================== */

  async function loadTrackInfo(index) {
    const videoId = PLAYLIST_IDS[index];
    const requestToken = ++metaRequestToken;

    trackTitleEl.textContent = "Loading…";
    trackArtistEl.textContent = "Bus Driver Radio";
    currentTimeEl.textContent = "0:00";
    durationEl.textContent = "0:00";
    progressFill.style.width = "0%";

    // Cover art: show YouTube's thumbnail immediately (fast, no CORS
    // dependency), then swap to the oEmbed one below if it differs.
    // Falls back through hqdefault, then the bus-cockpit photo, if a
    // thumbnail is missing.
    coverArtEl.src = `https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg`;
    coverArtEl.onerror = () => {
      coverArtEl.onerror = () => {
        coverArtEl.onerror = null;
        coverArtEl.src = "assets/backgrounds/bus-cockpit.jpg";
      };
      coverArtEl.src = `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
    };

    try {
      const url = `https://www.youtube.com/oembed?url=${encodeURIComponent(
        `https://www.youtube.com/watch?v=${videoId}`
      )}&format=json`;
      const res = await fetch(url);
      if (!res.ok) throw new Error("oEmbed request failed");
      const data = await res.json();

      // A newer track may have started loading while this was in
      // flight — don't let a stale reply overwrite it.
      if (requestToken !== metaRequestToken) return;

      trackTitleEl.textContent = data.title || "Now playing";
      trackArtistEl.textContent = data.author_name || "Bus Driver Radio";
      if (data.thumbnail_url) coverArtEl.src = data.thumbnail_url;
    } catch (err) {
      if (requestToken !== metaRequestToken) return;
      trackTitleEl.textContent = "Now playing";
      trackArtistEl.textContent = "Bus Driver Radio";
    }
  }

  function goToTrack(index, { autoplay = false } = {}) {
    trackIndex = (index + PLAYLIST_IDS.length) % PLAYLIST_IDS.length;
    loadTrackInfo(trackIndex);
    if (!ytPlayer) return;
    if (autoplay) {
      ytPlayer.loadVideoById(PLAYLIST_IDS[trackIndex]);
    } else {
      ytPlayer.cueVideoById(PLAYLIST_IDS[trackIndex]);
    }
  }

  /* ======================================================================
     3. UI — reflecting player state on screen
     ====================================================================== */

  function setPlayingState(isPlaying) {
    player.classList.toggle("is-playing", isPlaying);
    playToggle.setAttribute("aria-pressed", String(isPlaying));
    playToggle.setAttribute("aria-label", isPlaying ? "Pause" : "Play");

    clearInterval(tickTimer);
    if (isPlaying) {
      tickTimer = setInterval(renderProgress, 500);
    }
  }

  function formatTime(seconds) {
    if (!isFinite(seconds) || seconds < 0) return "0:00";
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  }

  function renderProgress() {
    if (!ytPlayer || typeof ytPlayer.getCurrentTime !== "function") return;
    const current = ytPlayer.getCurrentTime() || 0;
    const duration = ytPlayer.getDuration() || 0;
    currentTimeEl.textContent = formatTime(current);
    durationEl.textContent = formatTime(duration);
    progressFill.style.width = `${duration ? (current / duration) * 100 : 0}%`;
  }

  /* ======================================================================
     Controls
     ====================================================================== */

  function wireControls() {
    playToggle.addEventListener("click", () => {
      if (!apiReady || !ytPlayer || typeof ytPlayer.getPlayerState !== "function") {
        // API/script still loading — remember the visitor wants to play,
        // and start as soon as onReady fires.
        pendingAutoplay = true;
        setPlayingState(true); // immediate visual feedback (disc starts spinning)
        return;
      }
      const state = ytPlayer.getPlayerState();
      if (state === YT.PlayerState.PLAYING) {
        ytPlayer.pauseVideo();
      } else {
        ytPlayer.playVideo();
      }
    });

    prevTrack.addEventListener("click", () => {
      goToTrack(trackIndex - 1, { autoplay: true });
    });

    nextTrack.addEventListener("click", () => {
      goToTrack(trackIndex + 1, { autoplay: true });
    });

    progressTrack.addEventListener("click", (event) => {
      if (!ytPlayer || typeof ytPlayer.getDuration !== "function") return;
      const duration = ytPlayer.getDuration();
      if (!duration) return;
      const rect = progressTrack.getBoundingClientRect();
      const ratio = Math.min(Math.max((event.clientX - rect.left) / rect.width, 0), 1);
      ytPlayer.seekTo(ratio * duration, true);
    });
  }

  /* ======================================================================
     Clock + listener count — small cosmetic touches, unrelated to YouTube
     ====================================================================== */

  function updateClock() {
    const now = new Date();
    let hours = now.getHours();
    const minutes = now.getMinutes().toString().padStart(2, "0");
    const ampm = hours >= 12 ? "PM" : "AM";
    hours = hours % 12 || 12;
    clockEl.innerHTML = `${hours}<span class="clock__colon">:</span>${minutes} ${ampm}`;
  }

  function startListenerDrift() {
    let listeners = Number(listenerCountEl.textContent) || 30;
    setInterval(() => {
      const delta = Math.round((Math.random() - 0.5) * 4); // -2..+2
      listeners = Math.max(3, listeners + delta);
      listenerCountEl.textContent = listeners;
    }, 4000);
  }

  /* ======================================================================
     Init
     ====================================================================== */

  loadTrackInfo(trackIndex); // show real track info immediately, don't wait on the player API
  updateClock();
  setInterval(updateClock, 1000 * 15);
  startListenerDrift();
  wireControls();
})();
