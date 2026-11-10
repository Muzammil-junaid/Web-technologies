/* =====================================================
   Spotify Clone - script.js
   Works on every page: index, search, playlist, artist,
   premium and login. Just add:
   <script src="script.js"></script>  before </body>
   ===================================================== */
(() => {
  'use strict';

  const $  = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

  /* ---------- 1. Song data (used by search + as default queue) ---------- */
  const SONGS = [
    { title: 'Neon Rain',         artist: 'Neon Harbor',       album: 'Neon Rain',    time: '3:42' },
    { title: 'Slow Tides',        artist: 'Luna Vale',         album: 'Tidal Hours',  time: '3:15' },
    { title: 'Velvet Sky',        artist: 'Desert Echo',       album: 'Dust & Gold',  time: '4:02' },
    { title: 'City Lights',       artist: 'Kite Runners',      album: 'Skyline Run',  time: '2:58' },
    { title: 'Paper Moon',        artist: 'Aria Blaze',        album: 'Blaze',        time: '3:31' },
    { title: 'Echo Valley',       artist: 'The Midnight Owls', album: 'Hollow Hills', time: '4:20' },
    { title: 'Golden Hour Drive', artist: 'Desert Echo',       album: 'Dust & Gold',  time: '3:48' },
    { title: 'Static Dreams',     artist: 'Neon Harbor',       album: 'Neon Rain',    time: '3:05' },
    { title: 'Lantern',           artist: 'Luna Vale',         album: 'Tidal Hours',  time: '2:49' },
    { title: 'Midnight Compile',  artist: 'Kite Runners',      album: 'Skyline Run',  time: '3:27' },
    { title: 'Harbor Lights',     artist: 'Neon Harbor',       album: 'Midnight Pier', time: '3:33' },
    { title: 'Afterglow',         artist: 'Neon Harbor',       album: 'Midnight Pier', time: '4:10' },
    { title: 'Low Tide Radio',    artist: 'Neon Harbor',       album: 'Glass Harbor', time: '2:55' },
    { title: 'Sandstorm Lullaby', artist: 'Desert Echo',       album: 'Dust & Gold',  time: '3:21' },
    { title: 'Rooftop Signal',    artist: 'Kite Runners',      album: 'Skyline Run',  time: '3:09' },
    { title: 'Ember',             artist: 'Aria Blaze',        album: 'Blaze',        time: '2:44' },
  ].map(s => ({ ...s, img: imgFor(s.title, 100) }));

  function slug(text) {
    return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  }
  function imgFor(title, size) {
    return `https://picsum.photos/seed/${slug(title)}/${size}/${size}`;
  }

  /* ---------- 2. Small helpers ---------- */
  function toSeconds(t) {
    const [m, s] = t.split(':').map(Number);
    return (m || 0) * 60 + (s || 0);
  }
  function toClock(sec) {
    sec = Math.max(0, Math.floor(sec));
    return Math.floor(sec / 60) + ':' + String(sec % 60).padStart(2, '0');
  }
  function playerImg(url) {               // always show a 120x120 picture in the player
    return url.replace(/\/\d+\/\d+$/, '/120/120');
  }
  function store(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) { /* ignore */ }
  }
  function load(key) {
    try { return JSON.parse(localStorage.getItem(key)); } catch (e) { return null; }
  }

  /* ---------- 3. Toast (little popup message) ---------- */
  let toastEl, toastTimer;
  function toast(message) {
    if (!toastEl) {
      toastEl = document.createElement('div');
      toastEl.className = 'toast';
      toastEl.setAttribute('role', 'status');
      document.body.appendChild(toastEl);
    }
    toastEl.textContent = message;
    toastEl.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.remove('show'), 2200);
  }

  /* ---------- 4. Player state ---------- */
  const saved = load('spc_player');
  const state = {
    song:    saved ? saved.song : { ...SONGS[0] },
    pos:     saved ? saved.pos  : 84,           // seconds played
    playing: saved ? saved.playing : false,
    shuffle: saved ? !!saved.shuffle : false,
    repeat:  saved ? !!saved.repeat : false,
    liked:   saved ? !!saved.liked : true,
  };
  let queue = SONGS;                            // list that Next / Previous walk through

  function duration() { return toSeconds(state.song.time); }
  function persist() { store('spc_player', state); }

  function rowToSong(tr) {
    const img = $('img', tr);
    return {
      title:  $('.song strong', tr).textContent.trim(),
      artist: $('.song span', tr).textContent.trim(),
      time:   $('.time', tr).textContent.trim(),
      img:    img ? img.src : imgFor($('.song strong', tr).textContent, 100),
    };
  }
  function refreshQueue() {
    const rows = $$('.tracks tbody tr');
    queue = rows.length ? rows.map(rowToSong) : SONGS;
  }

  /* ---------- 5. Draw the player bar ---------- */
  function render() {
    const player = $('.player');
    if (!player) return;

    const np = $('.np', player);
    $('.thumb img', np).src = playerImg(state.song.img);
    $('.thumb img', np).alt = state.song.title;
    $('div strong', np).textContent = state.song.title;
    $('div span', np).textContent = state.song.artist;

    const heart = $('.heart', np);
    heart.textContent = state.liked ? '♥' : '♡';
    heart.classList.toggle('off', !state.liked);

    const times = $$('.progress > span', player);
    times[0].textContent = toClock(state.pos);
    times[1].textContent = state.song.time;
    $('.progress .bar i', player).style.width = (state.pos / duration() * 100) + '%';

    $('.pp', player).textContent = state.playing ? '⏸' : '▶';
    const bigPlay = $('.big-play');
    if (bigPlay) bigPlay.textContent = state.playing ? '⏸' : '▶';

    $$('.ctrl-row li', player).forEach(li => {
      const icon = li.textContent.trim();
      if (icon === '🔀') li.classList.toggle('on', state.shuffle);
      if (icon === '🔁') li.classList.toggle('on', state.repeat);
    });

    // highlight the playing row in any song table
    $$('.tracks tbody tr').forEach(tr => {
      const title = $('.song strong', tr);
      tr.classList.toggle('playing', !!title && title.textContent.trim() === state.song.title);
    });
  }

  /* ---------- 6. Player actions ---------- */
  function playSong(song) {
    state.song = { ...song };
    state.pos = 0;
    state.playing = true;
    state.liked = false;
    persist();
    render();
  }
  function indexInQueue() {
    return queue.findIndex(s => s.title === state.song.title);
  }
  function next() {
    if (!queue.length) return;
    let i = indexInQueue();
    if (state.shuffle && queue.length > 1) {
      let r;
      do { r = Math.floor(Math.random() * queue.length); } while (r === i);
      i = r;
    } else {
      i = (i + 1) % queue.length;
    }
    playSong(queue[i]);
  }
  function previous() {
    if (state.pos > 3) { state.pos = 0; persist(); render(); return; }
    const i = indexInQueue();
    playSong(queue[(i - 1 + queue.length) % queue.length]);
  }
  function togglePlay() {
    state.playing = !state.playing;
    persist();
    render();
  }

  // the "fake" clock: moves the progress bar once per second
  setInterval(() => {
    if (!state.playing) return;
    state.pos += 1;
    if (state.pos >= duration()) {
      if (state.repeat) { state.pos = 0; } else { next(); return; }
    }
    persist();
    render();
  }, 1000);

  /* ---------- 7. Click handling (one listener for the whole page) ---------- */
  document.addEventListener('click', e => {
    const t = e.target;

    // --- player buttons ---
    const ctrl = t.closest('.player .ctrl-row li');
    if (ctrl) {
      if (ctrl.classList.contains('pp')) { togglePlay(); return; }
      const icon = ctrl.textContent.trim();
      if (icon === '⏭') next();
      if (icon === '⏮') previous();
      if (icon === '🔀') { state.shuffle = !state.shuffle; toast(state.shuffle ? 'Shuffle on 🔀' : 'Shuffle off'); }
      if (icon === '🔁') { state.repeat = !state.repeat; toast(state.repeat ? 'Repeat on 🔁' : 'Repeat off'); }
      persist(); render();
      return;
    }

    // --- seek bar & volume bar ---
    const bar = t.closest('.bar');
    if (bar) {
      const rect = bar.getBoundingClientRect();
      const pct = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
      if (bar.closest('.progress')) {
        state.pos = Math.floor(pct * duration());
        persist(); render();
      } else if (bar.closest('.volume')) {
        $('i', bar).style.width = (pct * 100) + '%';
        const icon = $$('.volume span').pop();
        icon.textContent = pct === 0 ? '🔇' : pct < 0.5 ? '🔉' : '🔊';
      }
      return;
    }

    // --- heart in the player ---
    if (t.closest('.np .heart')) {
      state.liked = !state.liked;
      toast(state.liked ? 'Added to Liked Songs 💚' : 'Removed from Liked Songs');
      persist(); render();
      return;
    }

    // --- big green play button on playlist / artist pages ---
    const big = t.closest('.big-play');
    if (big) {
      e.preventDefault();
      const rows = $$('.tracks tbody tr');
      const inList = rows.some(r => r.classList.contains('playing'));
      if (inList) togglePlay(); else if (rows.length) playSong(rowToSong(rows[0]));
      return;
    }

    // --- action icons (shuffle, like, download, more) ---
    const act = t.closest('.pl-actions li');
    if (act) {
      const icon = act.textContent.trim();
      if (icon === '♡' || icon === '♥') {
        const on = act.classList.toggle('liked');
        act.textContent = on ? '♥' : '♡';
        toast(on ? 'Saved to your library 💚' : 'Removed from your library');
      } else if (icon === '🔀') {
        state.shuffle = !state.shuffle; persist(); render();
        toast(state.shuffle ? 'Shuffle on 🔀' : 'Shuffle off');
      } else if (icon === '⬇') {
        toast('Download started (demo) ⬇️');
      } else if (icon === '⋯') {
        toast('More options coming soon ✨');
      }
      return;
    }

    // --- play button on cards and tiles (home page, artist page) ---
    const playBtn = t.closest('.card .play, .tile .play');
    if (playBtn) {
      e.preventDefault();
      const card = playBtn.closest('.card, .tile');
      const img = $('img', card);
      const titleEl = $('h3', card);
      const title = titleEl ? titleEl.textContent.trim() : card.textContent.replace('▶', '').trim();
      const artistEl = $('p', card);
      const song = SONGS.find(s => s.title === title);
      playSong(song || {
        title,
        artist: artistEl ? artistEl.textContent.trim() : 'Playlist',
        time: toClock(180 + (title.length * 7) % 120),
        img: img ? img.src : imgFor(title, 100),
      });
      toast('Now playing: ' + title + ' 🎶');
      return;
    }

    // --- click a song row to play it ---
    const row = t.closest('.tracks tbody tr');
    if (row) {
      refreshQueue();
      playSong(rowToSong(row));
      return;
    }

    // --- follow button on artist page ---
    const follow = t.closest('.follow-btn');
    if (follow) {
      const on = follow.classList.toggle('following');
      follow.textContent = on ? 'Following' : 'Follow';
      toast(on ? 'You are now following this artist 🎉' : 'Unfollowed');
      return;
    }

    // --- category tiles on search page ---
    const cat = t.closest('.cat');
    if (cat) {
      e.preventDefault();
      const input = $('#searchInput');
      if (input) { input.value = cat.dataset.q || ''; input.dispatchEvent(new Event('input')); input.focus(); }
      return;
    }

    // --- arrows at the top (browser back / forward) ---
    const arrow = t.closest('.arrow');
    if (arrow) {
      arrow.textContent.trim() === '‹' ? history.back() : history.forward();
      return;
    }

    // --- "＋" in library ---
    if (t.closest('.library-head span')) { toast('Create playlist is coming soon ➕'); return; }

    // --- links that go nowhere (href="#") ---
    const dead = t.closest('a[href="#"]');
    if (dead) {
      e.preventDefault();
      toast('This is a demo project 🎧');
    }
  });

  // Spacebar = play / pause (but not while typing)
  document.addEventListener('keydown', e => {
    const tag = (e.target.tagName || '').toLowerCase();
    if (e.code === 'Space' && !['input', 'textarea', 'button', 'a', 'summary'].includes(tag)) {
      e.preventDefault();
      togglePlay();
    }
  });

  /* ---------- 8. Home page: greeting ---------- */
  function setupGreeting() {
    const g = $('.greeting');
    if (!g) return;
    const h = new Date().getHours();
    const word = h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
    const user = load('spc_user');
    g.textContent = user && user.name ? `${word}, ${user.name}` : word;
  }

  /* ---------- 9. Search page ---------- */
  function setupSearch() {
    const input = $('#searchInput');
    if (!input) return;
    const browse  = $('#browse');
    const results = $('#results');
    const body    = $('#resultRows');
    const count   = $('#resultCount');
    const empty   = $('#noResults');
    const table   = $('#resultTable');

    function run() {
      const q = input.value.trim().toLowerCase();
      if (!q) {
        browse.classList.remove('hidden');
        results.classList.add('hidden');
        return;
      }
      const found = SONGS.filter(s =>
        [s.title, s.artist, s.album].some(v => v.toLowerCase().includes(q)));

      browse.classList.add('hidden');
      results.classList.remove('hidden');
      body.innerHTML = found.map((s, i) => `
        <tr>
          <td class="num"><span class="n">${i + 1}</span><span class="hover-play">▶</span></td>
          <td><div class="song"><div class="mini"><img src="${s.img}" alt="${s.title}" loading="lazy"></div>
              <div><strong>${s.title}</strong><span>${s.artist}</span></div></div></td>
          <td class="album">${s.album}</td>
          <td class="time">${s.time}</td>
        </tr>`).join('');

      table.classList.toggle('hidden', !found.length);
      empty.classList.toggle('hidden', !!found.length);
      $('#emptyQuery').textContent = input.value.trim();
      count.textContent = found.length + (found.length === 1 ? ' song found' : ' songs found');
      refreshQueue();
      render();
    }

    input.addEventListener('input', run);
    const fromUrl = new URLSearchParams(location.search).get('q');
    if (fromUrl) { input.value = fromUrl; }
    run();
  }

  /* ---------- 10. Login / Sign up page ---------- */
  function setupAuth() {
    const form = $('#authForm');
    if (!form) return;
    const tabs = $$('.auth-tab');
    const title = $('#authTitle');
    const submit = $('#authSubmit');
    const footText = $('#authFoot');
    let mode = location.hash === '#signup' ? 'signup' : 'login';

    function setMode(m) {
      mode = m;
      tabs.forEach(t => {
        t.classList.toggle('active', t.dataset.mode === m);
        t.setAttribute('aria-selected', t.dataset.mode === m);
      });
      $$('.signup-only').forEach(el => el.classList.toggle('hidden', m !== 'signup'));
      title.textContent  = m === 'signup' ? 'Sign up for free' : 'Log in to Spotify Clone';
      submit.textContent = m === 'signup' ? 'Create account' : 'Log in';
      footText.innerHTML = m === 'signup'
        ? 'Already have an account? <a href="#" data-mode="login">Log in here</a>.'
        : 'Don\'t have an account? <a href="#" data-mode="signup">Sign up for free</a>.';
      $$('.field').forEach(f => { f.classList.remove('bad'); $('.msg', f).textContent = ''; });
    }

    function fail(id, message) {
      const field = $('#' + id).closest('.field');
      field.classList.add('bad');
      $('.msg', field).textContent = message;
    }

    tabs.forEach(t => t.addEventListener('click', () => setMode(t.dataset.mode)));
    footText.addEventListener('click', e => {
      const a = e.target.closest('a[data-mode]');
      if (a) { e.preventDefault(); e.stopPropagation(); setMode(a.dataset.mode); }
    });

    form.addEventListener('submit', e => {
      e.preventDefault();
      setMode(mode);                                   // clears old errors
      const name = $('#name').value.trim();
      const email = $('#email').value.trim();
      const pass = $('#password').value;
      let ok = true;

      if (mode === 'signup' && name.length < 2) { fail('name', 'Please enter your name (at least 2 letters).'); ok = false; }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { fail('email', 'Enter a valid email like you@example.com.'); ok = false; }
      if (pass.length < 6) { fail('password', 'Password must be at least 6 characters.'); ok = false; }
      if (!ok) return;

      const display = name || email.split('@')[0];
      store('spc_user', { name: display, email });
      toast(mode === 'signup' ? `Welcome, ${display}! 🎉` : `Welcome back, ${display}! 💚`);
      setTimeout(() => { location.href = 'index.html'; }, 1100);
    });

    setMode(mode);
  }

  /* ---------- 11. Start everything ---------- */
  document.addEventListener('DOMContentLoaded', () => {
    refreshQueue();
    setupGreeting();
    setupSearch();
    setupAuth();
    render();
  });
})();
