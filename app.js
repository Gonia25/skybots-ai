// Year
document.getElementById('year').textContent = new Date().getFullYear();

// ---- Inline demos (no sticky player) ----
// Support either id="audio-list" (v4+) or id="audio-grid" (older)
const listEl = document.getElementById('audio-list') || document.getElementById('audio-grid');

// Single shared audio element
const A = new Audio();
A.preload = 'metadata';
let current = -1;
let seeking = false;
let durations = [];

const playIcon  = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14l11-7z"/></svg>';
const pauseIcon = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 5h4v14H6zm8 0h4v14h-4z"/></svg>';

const fmt = s => !isFinite(s) || s <= 0 ? '--:--' : `${String(Math.floor(s/60)).padStart(2,'0')}:${String(Math.round(s % 60)).padStart(2,'0')}`;

// Robust loader with multiple fallbacks and cache-busting
async function loadList(){
  const origin = location.origin;
  const project = '/skybots-apple-style-landing/';
  // Directory of current page (ensure trailing slash)
  const dir = location.pathname.endsWith('/') ? location.pathname : location.pathname.replace(/[^/]+$/, '');
  const candidates = [
    `data/audios.json`,
    `${dir}data/audios.json`,
    `${project}data/audios.json`,
    `${origin}${project}data/audios.json`
  ].map(u => `${u}${u.includes('?') ? '&' : '?'}v=${Date.now()}`);
  for (const url of candidates){
    try {
      const r = await fetch(url, {cache:'no-store'});
      if(!r.ok) throw new Error('HTTP '+r.status);
      const text = await r.text();
      const json = JSON.parse(text);
      if (Array.isArray(json) && json.length) return json;
    } catch(e) {
      // try next
    }
  }
  // Built‑in fallback list if JSON cannot be fetched.  Use the
  // legacy MP3 filenames shipped on the main branch so that the
  // demos still render even when the JSON is unavailable or
  // mismatched.  These files live in `/audio/` and will load if
  // present; otherwise durations will remain `--:--`.
  return [
    { title: 'Sales Bot — Warm Intro',      url: 'audio/demo_1.mp3' },
    { title: 'Service Bot — Scheduling',    url: 'audio/demo_2.mp3' },
    { title: 'Lead Capture — No Form',      url: 'audio/demo_3.mp3' }
  ];
}

loadList().then(async (demos) => {
  demos = (demos || []).slice(0, 3);
  // Render the demo bars
  listEl.innerHTML = demos.map((d, i) => `
    <div class="demo" role="listitem" data-i="${i}">
      <button class="play" aria-label="Play ${d.title}" data-i="${i}">${playIcon}</button>
      <h4>${d.title}</h4>
      <span class="time" id="time-${i}">--:--</span>
      <input class="seek" id="seek-${i}" type="range" min="0" max="100" value="0" aria-label="Seek ${d.title}">
    </div>
  `).join('');
  // Load real durations
  await Promise.all(demos.map((d, i) => new Promise(res => {
    const a = new Audio();
    a.preload = 'metadata';
    a.src = d.url;
    a.onloadedmetadata = () => {
      durations[i] = a.duration;
      const t = document.getElementById(`time-${i}`);
      if(t) t.textContent = fmt(a.duration);
      res();
    };
    a.onerror = () => res();
  })));
  // Play/pause events
  listEl.addEventListener('click', e => {
    const btn = e.target.closest('.play');
    if(!btn) return;
    const i = +btn.dataset.i;
    const row = listEl.querySelector(`.demo[data-i="${i}"]`);
    if(current !== i){
      current = i;
      A.src = demos[i].url;
      A.currentTime = 0;
      listEl.querySelectorAll('.demo').forEach(el => el.classList.remove('is-playing'));
    }
    if(A.paused){
      A.play().catch(() => {});
      btn.innerHTML = pauseIcon;
      row.classList.add('is-playing');
    } else {
      A.pause();
      btn.innerHTML = playIcon;
      row.classList.remove('is-playing');
    }
    // Reset other buttons
    listEl.querySelectorAll('.play').forEach(b => { if(+b.dataset.i !== i) b.innerHTML = playIcon; });
  });
  // Seek input events
  listEl.addEventListener('input', e => {
    if(e.target.classList.contains('seek')) seeking = true;
  });
  listEl.addEventListener('change', e => {
    if(!e.target.classList.contains('seek') || current === -1 || !isFinite(A.duration)) return;
    A.currentTime = (e.target.value / 100) * A.duration;
    seeking = false;
  });
  // Progress + time updates
  A.addEventListener('timeupdate', () => {
    if(seeking || !isFinite(A.duration) || current === -1) return;
    const val = (A.currentTime / A.duration) * 100;
    const s = document.getElementById(`seek-${current}`);
    if(s) s.value = val || 0;
    const t = document.getElementById(`time-${current}`);
    if(t) t.textContent = `${fmt(A.currentTime)} / ${fmt(durations[current] || A.duration)}`;
  });
  A.addEventListener('ended', () => {
    const btn = listEl.querySelector(`.play[data-i="${current}"]`);
    if(btn) btn.innerHTML = playIcon;
    const row = listEl.querySelector(`.demo[data-i="${current}"]`);
    if(row) row.classList.remove('is-playing');
  });
}).catch(() => {
  if(listEl) listEl.innerHTML = '<p class="muted">Demos unavailable.</p>';
});