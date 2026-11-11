(() => {
  'use strict';
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const slug = t => t.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const imgFor = (t, n) => `https://picsum.photos/seed/${slug(t)}/${n}/${n}`;
  const secs = t => t.split(':').reduce((m, s) => m * 60 + +s, 0);
  const clock = s => `${(s = Math.max(0, s | 0)) / 60 | 0}:${String(s % 60).padStart(2, '0')}`;
  const load = k => { try { return JSON.parse(localStorage.getItem(k)); } catch { return null; } };

  const SONGS = `Neon Rain|Neon Harbor|Neon Rain|3:42
Slow Tides|Luna Vale|Tidal Hours|3:15
Velvet Sky|Desert Echo|Dust & Gold|4:02
City Lights|Kite Runners|Skyline Run|2:58
Paper Moon|Aria Blaze|Blaze|3:31
Echo Valley|The Midnight Owls|Hollow Hills|4:20
Golden Hour Drive|Desert Echo|Dust & Gold|3:48
Static Dreams|Neon Harbor|Neon Rain|3:05
Lantern|Luna Vale|Tidal Hours|2:49
Midnight Compile|Kite Runners|Skyline Run|3:27
Harbor Lights|Neon Harbor|Midnight Pier|3:33
Afterglow|Neon Harbor|Midnight Pier|4:10
Low Tide Radio|Neon Harbor|Glass Harbor|2:55
Sandstorm Lullaby|Desert Echo|Dust & Gold|3:21
Rooftop Signal|Kite Runners|Skyline Run|3:09
Ember|Aria Blaze|Blaze|2:44`.trim().split('\n').map(l => {
    const [title, artist, album, time] = l.split('|');
    return { title, artist, album, time, img: imgFor(title, 100) };
  });

  let toastEl, toastTimer;
  const toast = msg => {
    if (!toastEl) (toastEl = Object.assign(document.createElement('div'), { className: 'toast', role: 'status' })).remove ? document.body.append(toastEl) : 0;
    if (!toastEl.parentNode) document.body.append(toastEl);
    toastEl.textContent = msg;
    toastEl.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.remove('show'), 2200);
  };

  const state = Object.assign({ song: { ...SONGS[0] }, pos: 84, playing: false, shuffle: false, repeat: false, liked: true }, load('spc_player'));
  let queue = SONGS;
  const duration = () => secs(state.song.time);
  const rowToSong = tr => ({
    title: $('.song strong', tr)?.textContent.trim() || 'Track',
    artist: $('.song span', tr)?.textContent.trim() || 'Artist',
    time: $('.time', tr)?.textContent.trim() || '3:00',
    img: $('img', tr)?.src || imgFor($('.song strong', tr)?.textContent || 'song', 100),
  });
  const refreshQueue = () => { const rows = $$('.tracks tbody tr'); queue = rows.length ? rows.map(rowToSong) : SONGS; };

  const commit = () => { try { localStorage.setItem('spc_player', JSON.stringify(state)); } catch {} render(); };
  const play = song => { Object.assign(state, { song: { ...song }, pos: 0, playing: true, liked: false }); commit(); };
  const index = () => queue.findIndex(s => s.title === state.song.title);
  const toggle = () => { state.playing = !state.playing; commit(); };
  const flag = (key, on, off) => { state[key] = !state[key]; toast(state[key] ? on : off); commit(); };

  const next = () => {
    if (!queue.length) return;
    let i = index();
    if (state.shuffle && queue.length > 1) { while ((i = (Math.random() * queue.length) | 0) === index()); }
    else { i = (i + 1) % queue.length; }
    play(queue[i]);
  };
  const prev = () => state.pos > 3 ? (state.pos = 0, commit()) : play(queue[(index() - 1 + queue.length) % queue.length]);

  setInterval(() => {
    if (!state.playing) return;
    if (++state.pos >= duration()) { if (!state.repeat) return next(); state.pos = 0; }
    commit();
  }, 1000);

  function render() {
    document.documentElement.classList.toggle('is-playing', state.playing);
    const p = $('.player');
    if (!p) return;
    const { song, pos, playing } = state;
    const cover = $('.np .thumb img', p);
    if (cover) { cover.src = song.img.replace(/\/\d+\/\d+$/, '/120/120'); cover.alt = song.title; }
    const titleEl = $('.np div strong', p); if (titleEl) titleEl.textContent = song.title;
    const artistEl = $('.np div span', p); if (artistEl) artistEl.textContent = song.artist;
    const heart = $('.heart', p);
    if (heart) { heart.textContent = state.liked ? '♥' : '♡'; heart.classList.toggle('off', !state.liked); }
    const [now, total] = $$('.progress > span', p);
    if (now) now.textContent = clock(pos);
    if (total) total.textContent = song.time;
    const bar = $('.progress .bar i', p);
    if (bar) bar.style.width = `${(pos / duration()) * 100}%`;
    const pp = $('.pp', p); if (pp) pp.textContent = playing ? '⏸' : '▶';
    const big = $('.big-play'); if (big) big.textContent = playing ? '⏸' : '▶';
    $$('.ctrl-row li', p).forEach(li => {
      const k = { '🔀': 'shuffle', '🔁': 'repeat' }[li.textContent.trim()];
      if (k) li.classList.toggle('on', state[k]);
    });
    $$('.tracks tbody tr').forEach(tr => tr.classList.toggle('playing', $('.song strong', tr)?.textContent.trim() === song.title));
  }

  document.addEventListener('click', e => {
    const el = e.target.closest('.player .ctrl-row li, .bar, .np .heart, .big-play, .follow-btn, .pl-actions li, .card .play, .tile .play, .tracks tbody tr, .cat, .arrow, .library-head span, a[href="#"]');
    if (!el) return;
    if (el.matches('a[href="#"], .big-play, .card .play, .tile .play')) e.preventDefault();

    if (el.matches('.player .ctrl-row li')) {
      if (el.classList.contains('pp')) return toggle();
      const i = el.textContent.trim();
      i === '⏭' ? next() : i === '⏮' ? prev() : i === '🔀' ? flag('shuffle', 'Shuffle on 🔀', 'Shuffle off') : i === '🔁' && flag('repeat', 'Repeat on 🔁', 'Repeat off');
    } else if (el.classList.contains('bar')) {
      const { left, width } = el.getBoundingClientRect();
      const pct = Math.min(1, Math.max(0, (e.clientX - left) / width));
      if (el.closest('.progress')) { state.pos = (pct * duration()) | 0; commit(); }
      else if (el.closest('.volume')) {
        $('i', el).style.width = `${pct * 100}%`;
        const spans = $$('.volume span');
        if (spans.length) spans[spans.length - 1].textContent = pct === 0 ? '🔇' : pct < 0.5 ? '🔉' : '🔊';
      }
    } else if (el.classList.contains('heart')) {
      flag('liked', 'Added to Liked Songs 💚', 'Removed from Liked Songs');
    } else if (el.classList.contains('big-play')) {
      const rows = $$('.tracks tbody tr');
      rows.some(r => r.classList.contains('playing')) ? toggle() : rows.length && play(rowToSong(rows[0]));
    } else if (el.classList.contains('follow-btn')) {
      const on = el.classList.toggle('following');
      el.textContent = on ? 'Following' : 'Follow';
      toast(on ? 'You are now following this artist 🎉' : 'Unfollowed');
    } else if (el.closest('.pl-actions')) {
      const i = el.textContent.trim();
      if (i === '♡' || i === '♥') {
        const on = el.classList.toggle('liked');
        el.textContent = on ? '♥' : '♡';
        toast(on ? 'Saved to your library 💚' : 'Removed from your library');
      } else if (i === '🔀') flag('shuffle', 'Shuffle on 🔀', 'Shuffle off');
      else if (i === '⬇') toast('Download started (demo) ⬇️');
      else if (i === '⋯') toast('More options coming soon ✨');
    } else if (el.matches('.card .play, .tile .play')) {
      const c = el.closest('.card, .tile');
      const title = $('h3', c)?.textContent.trim() ?? c.textContent.replace('▶', '').trim();
      play(SONGS.find(s => s.title === title) || { title, artist: $('p', c)?.textContent.trim() || 'Playlist', time: clock(180 + ((title.length * 7) % 120)), img: $('img', c)?.src || imgFor(title, 100) });
      toast(`Now playing: ${title} 🎶`);
    } else if (el.matches('.tracks tbody tr')) {
      refreshQueue();
      play(rowToSong(el));
    } else if (el.classList.contains('cat')) {
      const input = $('#searchInput');
      if (input) { input.value = el.dataset.q || ''; input.dispatchEvent(new Event('input')); input.focus(); }
    } else if (el.classList.contains('arrow')) {
      el.textContent.trim() === '‹' ? history.back() : history.forward();
    } else if (el.closest('.library-head')) {
      toast('Create playlist is coming soon ➕');
    } else if (el.matches('a[href="#"]')) {
      toast('This is a demo project 🎧');
    }
  });

  document.addEventListener('keydown', e => {
    if (e.code === 'Space' && !['INPUT', 'TEXTAREA', 'BUTTON', 'A', 'SUMMARY'].includes(e.target.tagName)) {
      e.preventDefault();
      toggle();
    }
  });

  const g = $('.greeting');
  if (g) {
    const h = new Date().getHours();
    const user = load('spc_user');
    g.textContent = `${h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening'}${user?.name ? `, ${user.name}` : ''}`;
  }

  const input = $('#searchInput');
  if (input) {
    const [browse, results, body, count, empty, table] = ['#browse', '#results', '#resultRows', '#resultCount', '#noResults', '#resultTable'].map(s => $(s));
    const run = () => {
      const q = input.value.trim().toLowerCase();
      if (browse) browse.classList.toggle('hidden', !!q);
      if (results) results.classList.toggle('hidden', !q);
      if (!q) return;
      const found = SONGS.filter(s => [s.title, s.artist, s.album].some(v => v.toLowerCase().includes(q)));
      if (body) body.innerHTML = found.map((s, i) => `<tr><td class="num"><span class="n">${i + 1}</span><span class="hover-play">▶</span></td><td><div class="song"><div class="mini"><img src="${s.img}" alt="${s.title}" loading="lazy"></div><div><strong>${s.title}</strong><span>${s.artist}</span></div></div></td><td class="album">${s.album}</td><td class="time">${s.time}</td></tr>`).join('');
      if (table) table.classList.toggle('hidden', !found.length);
      if (empty) empty.classList.toggle('hidden', !found.length);
      const eq = $('#emptyQuery'); if (eq) eq.textContent = input.value.trim();
      if (count) count.textContent = `${found.length} ${found.length === 1 ? 'song' : 'songs'} found`;
      refreshQueue();
      render();
    };
    input.addEventListener('input', run);
    input.value = new URLSearchParams(location.search).get('q') || input.value;
    run();
  }

  const form = $('#authForm');
  if (form) {
    const tabs = $$('.auth-tab'), title = $('#authTitle'), submit = $('#authSubmit'), foot = $('#authFoot');
    let mode = location.hash === '#signup' ? 'signup' : 'login';
    const setMode = m => {
      mode = m;
      const signup = m === 'signup';
      tabs.forEach(t => t.classList.toggle('active', t.dataset.mode === m));
      $$('.signup-only').forEach(el => el.classList.toggle('hidden', !signup));
      if (title) title.textContent = signup ? 'Sign up for free' : 'Log in to Spotify Clone';
      if (submit) submit.textContent = signup ? 'Create account' : 'Log in';
      if (foot) foot.innerHTML = signup ? 'Already have an account? <a href="#" data-mode="login">Log in here</a>.' : `Don't have an account? <a href="#" data-mode="signup">Sign up for free</a>.`;
      $$('.field').forEach(f => { f.classList.remove('bad'); const m = $('.msg', f); if (m) m.textContent = ''; });
    };
    tabs.forEach(t => t.addEventListener('click', () => setMode(t.dataset.mode)));
    if (foot) foot.addEventListener('click', e => { const a = e.target.closest('a[data-mode]'); if (a) { e.preventDefault(); setMode(a.dataset.mode); } });
    form.addEventListener('submit', e => {
      e.preventDefault();
      const name = $('#name')?.value.trim() || '', email = $('#email')?.value.trim() || '', pass = $('#password')?.value || '';
      const errors = [
        [mode === 'signup' && name.length < 2, 'name', 'Please enter your name (at least 2 letters).'],
        [!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email), 'email', 'Enter a valid email.'],
        [pass.length < 6, 'password', 'Password must be at least 6 characters.']
      ].filter(([bad]) => bad);
      errors.forEach(([, id, msg]) => { const f = $(`#${id}`)?.closest('.field'); if (f) { f.classList.add('bad'); const m = $('.msg', f); if (m) m.textContent = msg; } });
      if (errors.length) return;
      const display = name || email.split('@')[0];
      try { localStorage.setItem('spc_user', JSON.stringify({ name: display, email })); } catch {}
      toast(mode === 'signup' ? `Welcome, ${display}! 🎉` : `Welcome back, ${display}! 💚`);
      setTimeout(() => { location.href = 'index.html'; }, 1100);
    });
    setMode(mode);
  }

  const app = $('.app');
  if (app) {
    const here = (location.pathname.split('/').pop() || 'index.html').toLowerCase();
    app.insertAdjacentHTML('beforeend', `<nav class="bottom-nav" aria-label="Main">${[['index.html', '🏠', 'Home'], ['search.html', '🔍', 'Search'], ['playlist.html', '📚', 'Library'], ['premium.html', '💎', 'Premium']].map(([h, i, l]) =>
      `<a href="${h}"${h === here ? ' class="active" aria-current="page"' : ''}><span>${i}</span>${l}</a>`).join('')}</nav>`);
  }

  refreshQueue();
  render();
})();

