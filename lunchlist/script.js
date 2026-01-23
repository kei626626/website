'use strict';

/**
 * ここを「ウェブに公開（CSV）」のURLに差し替え
 * 例: https://docs.google.com/spreadsheets/d/e/XXXX/pub?gid=0&single=true&output=csv
 */
const SHEET_CSV_URL = 'PASTE_YOUR_CSV_URL_HERE';

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

    state.genres = [...new Set(state.shops.flatMap(s => s.genre))].sort((a,b)=>a.localeCompare(b,'ja'));
    renderChecks();

    state.filtered = state.shops;
    renderList(state.filtered);
    updateCount();
    el.hint.textContent = '全件表示';

    el.btnFilter.onclick = onFilter;
    el.btnRandom.onclick = onRandom;
    el.btnReset.onclick = onReset;
  } catch (e) {
    el.hint.textContent = `読み込みエラー：${e.message}`;
  }
}

async function loadShopsFromSheet() {
  if (!SHEET_CSV_URL || SHEET_CSV_URL.includes('PASTE_YOUR')) {
    throw new Error('SHEET_CSV_URL を設定してね');
  }

  const res = await fetch(SHEET_CSV_URL, { cache: 'no-store' });
  if (!res.ok) throw new Error('スプレッドシートCSVが読めません（公開設定を確認）');
  const csv = await res.text();

  const shops = csvToShops(csv);
  if (!shops.length) throw new Error('シートにデータがない or ヘッダ名が違うかも');
  return shops;
}

/**
 * CSV → shops配列
 * ヘッダ: name, genre, visited, walk, price, url, note
 */
function csvToShops(csvText) {
  const lines = csvText
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .split('\n')
    .filter(l => l.trim() !== '');

  if (lines.length < 2) return [];

  const headers = parseCsvLine(lines[0]).map(h => h.trim());

  return lines.slice(1).map(line => {
    const row = parseCsvLine(line);
    const obj = {};
    headers.forEach((h, i) => (obj[h] = row[i] ?? ''));

    const name = String(obj.name ?? '').trim();
    if (!name) return null;

    const genre = String(obj.genre ?? '')
      .split(',')
      .map(s => s.trim())
      .filter(Boolean);

    const visited = String(obj.visited ?? '').trim().toLowerCase() === 'true';
    const walk = toNum(obj.walk);
    const price = toNum(obj.price);
    const url = String(obj.url ?? '').trim();
    const note = String(obj.note ?? '').trim();

    return { name, genre, visited, walk, price, url, note };
  }).filter(Boolean);
}

/** ダブルクォート対応の超軽量CSV1行パーサ */
function parseCsvLine(line) {
  const out = [];
  let cur = '';
  let inQ = false;

  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      if (inQ && line[i + 1] === '"') { cur += '"'; i++; }
      else inQ = !inQ;
    } else if (c === ',' && !inQ) {
      out.push(cur);
      cur = '';
    } else {
      cur += c;
    }
  }
  out.push(cur);
  return out;
}

function toNum(v) {
  const n = Number(String(v ?? '').trim());
  return Number.isFinite(n) && n >= 0 ? Math.floor(n) : 0;
}

function renderChecks() {
  el.genreBox.innerHTML = '';
  state.genres.forEach(g => {
    const l = document.createElement('label');
    l.className = 'check';
    l.innerHTML = `<input type="checkbox" value="${escapeAttr(g)}">${escapeText(g)}`;
    l.querySelector('input').onchange = e =>
      e.target.checked ? state.selected.add(g) : state.selected.delete(g);
    el.genreBox.appendChild(l);
  });
}

function onFilter() {
  const sel = [...state.selected];
  state.filtered = sel.length === 0
    ? state.shops
    : state.shops.filter(s => sel.every(g => s.genre.includes(g)));

  el.hint.textContent = sel.length ? `絞り込み：${sel.join('・')}` : '全件表示';
  renderList(state.filtered);
  updateCount();
}

function onRandom() {
  const pool = state.filtered.length ? state.filtered : state.shops;
  if (!pool.length) {
    el.hint.textContent = '候補がない…';
    return;
  }
  const pick = pool[Math.floor(Math.random() * pool.length)];
  renderList(pool, pick.name);
  el.hint.textContent = `これ行こ：${pick.name}`;
}

function onReset() {
  state.selected.clear();
  document.querySelectorAll('.check input').forEach(i => i.checked = false);
  state.filtered = state.shops;
  renderList(state.filtered);
  el.hint.textContent = 'リセット（全件）';
  updateCount();
}

function renderList(list, highlight) {
  el.list.innerHTML = '';
  list.forEach(s => {
    const d = document.createElement('div');
    d.className = 'shop';
    if (s.name === highlight) d.style.outline = '2px solid #0f172a';

    const tags = [
      ...(s.genre || []).map(g => `<span class="tag">${escapeText(g)}</span>`),
      `<span class="tag ${s.visited ? 'tag-strong' : ''}">${s.visited ? '行った' : '行ってない'}</span>`,
      s.url ? `<a class="tag" href="${escapeAttr(s.url)}" target="_blank" rel="noopener noreferrer">食べログ</a>` : ''
    ].filter(Boolean).join('');

    const meta = [
      `<span>徒歩：${s.walk ? escapeText(String(s.walk)) : '—'}分</span>`,
      `<span>予算：${s.price ? escapeText(String(s.price)) : '—'}円</span>`,
      s.note ? `<span>メモ：${escapeText(s.note)}</span>` : ''
    ].filter(Boolean).join(' ');

    d.innerHTML = `
      <p class="shopName">${escapeText(s.name)}</p>
      <div class="tags">${tags}</div>
      <div class="meta">${meta}</div>
    `;
    el.list.appendChild(d);
  });
}

function updateCount() {
  el.count.textContent = `${state.filtered.length} 件`;
}

function escapeAttr(s) {
  return String(s)
    .replaceAll('&','&amp;')
    .replaceAll('"','&quot;')
    .replaceAll('<','&lt;')
    .replaceAll('>','&gt;');
}
function escapeText(s) {
  return String(s)
    .replaceAll('&','&amp;')
    .replaceAll('<','&lt;')
    .replaceAll('>','&gt;');
}
