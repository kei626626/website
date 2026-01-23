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

async function init(){
  const res = await fetch('./data/shops.json', { cache:'no-store' });
  state.shops = await res.json();

  state.genres = [...new Set(state.shops.flatMap(s => s.genre))];
  renderChecks();
  state.filtered = state.shops;
  renderList(state.filtered);
  updateCount();

  el.btnFilter.onclick = onFilter;
  el.btnRandom.onclick = onRandom;
  el.btnReset.onclick = onReset;
}

function renderChecks(){
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

function onFilter(){
  const sel = [...state.selected];
  state.filtered = sel.length === 0
    ? state.shops
    : state.shops.filter(s => sel.every(g => s.genre.includes(g)));

  el.hint.textContent = sel.length ? `絞り込み：${sel.join('・')}` : '全件表示';
  renderList(state.filtered);
  updateCount();
}

function onRandom(){
  const pool = state.filtered.length ? state.filtered : state.shops;
  const pick = pool[Math.floor(Math.random() * pool.length)];
  renderList(pool, pick.name);
  el.hint.textContent = `これ行こ：${pick.name}`;
}

function onReset(){
  state.selected.clear();
  document.querySelectorAll('.check input').forEach(i => i.checked = false);
  state.filtered = state.shops;
  renderList(state.filtered);
  el.hint.textContent = 'リセットした';
  updateCount();
}

function renderList(list, highlight){
  el.list.innerHTML = '';
  list.forEach(s => {
    const d = document.createElement('div');
    d.className = 'shop';
    if (s.name === highlight) d.style.outline = '2px solid #0f172a';

    d.innerHTML = `
      <p class="shopName">${s.name}</p>
      <div class="tags">
        ${s.genre.map(g => `<span class="tag">${g}</span>`).join('')}
        <span class="tag ${s.visited ? 'tag-strong' : ''}">
          ${s.visited ? '行った' : '行ってない'}
        </span>
        ${s.url ? `<a class="tag" href="${s.url}" target="_blank">食べログ</a>` : ''}
      </div>
      <div class="meta">
        <span>徒歩：${s.walk}分</span>
        <span>予算：${s.price}円</span>
        ${s.note ? `<span>メモ：${s.note}</span>` : ''}
      </div>
    `;
    el.list.appendChild(d);
  });
}

function updateCount(){
  el.count.textContent = `${state.filtered.length} 件`;
}
