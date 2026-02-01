'use strict';

const SHEET_CSV_URL =
  'https://docs.google.com/spreadsheets/d/e/2PACX-1vRuWhW5NJoGZB6LTffHc9inOzDww4npuLfP25w6umuaDIxrezPyVyQglYS5lshr5UlgIaG0gHILdo2D/pub?gid=640762363&single=true&output=csv';

const state = {
  shops: [],
  genres: [],
  selected: new Set(),
  filtered: []
};

const el = {
  genreBox: document.getElementById('genreBox'),
  btnFilter: document.getElementById('btnFilter'),
  btnRandom: document.getElementById('btnRandom'),
  btnReset: document.getElementById('btnReset'),
  list: document.getElementById('list'),
  hint: document.getElementById('hint'),
  count: document.getElementById('count')
};

init();

async function init() {
  try {
    state.shops = await loadShopsFromSheet();

    state.genres = [...new Set(state.shops.flatMap(s => s.genre))]
      .sort((a, b) => a.localeCompare(b, 'ja'));

    renderChecks();

    // 初期表示なし
    el.list.innerHTML = '';
    el.count.textContent = '—';
    el.hint.textContent = 'ジャンルを選んで絞り込むか、ランダムで決めてね';

    el.btnFilter.onclick = onFilter;
    el.btnRandom.onclick = onRandom;
    el.btnReset.onclick = onReset;
  } catch (e) {
    el.hint.textContent = `読み込みエラー：${e.message}`;
  }
}

async function loadShopsFromSheet() {
  const res = await fetch(SHEET_CSV_URL, { cache: 'no-store' });
  if (!res.ok) throw new Error('スプレッドシートが読めません');
  const csv = await res.text();
  return csvToShops(csv);
}

function csvToShops(csvText) {
  const lines = csvText.replace(/\r/g, '').split('\n').filter(l => l.trim());
  const headers = parseCsvLine(lines.shift()).map(h => h.trim());

  return lines.map(line => {
    const row = parseCsvLine(line);
    const obj = {};
    headers.forEach((h, i) => (obj[h] = row[i] ?? ''));

    const name = String(obj.name ?? '').trim();
    if (!name) return null;

    return {
  name,
  genre: String(obj.genre ?? '').split(',').map(s => s.trim()).filter(Boolean),

  visited: (() => {
  const v = String(obj.visited ?? '').trim().toLowerCase();
  return (v === 'true' || v === 'yes' || v === 'はい' || v === '1');
})(),

  walk: Number(obj.walk) || 0,
  price: Number(obj.price) || 0,
  url: String(obj.url ?? '').trim(),
  note: String(obj.note ?? '').trim()
};

  }).filter(Boolean);
}

function parseCsvLine(line) {
  const out = [];
  let cur = '', inQ = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      if (inQ && line[i + 1] === '"') { cur += '"'; i++; }
      else inQ = !inQ;
    } else if (c === ',' && !inQ) {
      out.push(cur); cur = '';
    } else cur += c;
  }
  out.push(cur);
  return out;
}

function renderChecks() {
  el.genreBox.innerHTML = '';
  state.genres.forEach(g => {
    const l = document.createElement('label');
    l.className = 'check';
    l.innerHTML = `<input type="checkbox" value="${g}">${g}`;
    l.querySelector('input').onchange = e =>
      e.target.checked ? state.selected.add(g) : state.selected.delete(g);
    el.genreBox.appendChild(l);
  });
}

// ★ OR固定フィルタ
function onFilter() {
  const sel = [...state.selected];
  if (sel.length === 0) {
    el.hint.textContent = 'ジャンルを1つ以上選んでね';
    return;
  }

  state.filtered = state.shops.filter(s =>
    sel.some(g => s.genre.includes(g))
  );

  el.hint.textContent = `絞り込み：${sel.join('・')}`;
  renderList(state.filtered);
  updateCount();
}

function onRandom() {
  const pool = state.filtered.length ? state.filtered : state.shops;
  const pick = pool[Math.floor(Math.random() * pool.length)];
  renderList(pool, pick.name);
  el.hint.textContent = `これ行こ：${pick.name}`;
  updateCount(pool.length);
}

function onReset() {
  state.selected.clear();
  state.filtered = [];
  document.querySelectorAll('.check input').forEach(i => i.checked = false);
  el.list.innerHTML = '';
  el.count.textContent = '—';
  el.hint.textContent = 'リセットした';
}

function renderList(list, highlight) {
  el.list.innerHTML = '';
  list.forEach(s => {
    const d = document.createElement('div');
    d.className = 'shop';
    if (s.name === highlight) d.style.outline = '2px solid #34d399';

    d.innerHTML = `
      <p class="shopName">${s.name}</p>
      <div class="tags">
        ${s.genre.map(g => `<span class="tag">${g}</span>`).join('')}
        <span class="tag ${s.visited ? 'tag-strong' : ''}">
          ${s.visited ? '行った' : '行ってない'}
        </span>
        ${s.url ? `<a class="tag tag-link" href="${s.url}" target="_blank">食べログ</a>` : ''}
      </div>
      <div class="meta">
        <span>徒歩：${s.walk || '—'}分</span>
        <span>予算：${s.price || '—'}円</span>
        ${s.note ? `<span>メモ：${s.note}</span>` : ''}
      </div>
    `;
    el.list.appendChild(d);
  });
}

function updateCount(n) {
  el.count.textContent = `${n ?? state.filtered.length} 件`;
}
