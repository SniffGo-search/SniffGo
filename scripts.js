(function(){
  const TOTAL = 150;
  const PAGE_SIZE = 10;
  const resultsEl = document.getElementById('results');
  const countEl = document.getElementById('resultCount');
  const pagerEl = document.getElementById('pager');
  const qInput = document.getElementById('q');
  const searchBtn = document.getElementById('searchBtn');
  const luckyBtn = document.getElementById('luckyBtn');
  const resultsMeta = document.getElementById('resultsMeta');
  let dataset = [];
  let filtered = [];
  let page = 1;

  // color palette for playful icons
  const COLORS = ['#EA4335','#4285F4','#FBBC05','#34A853','#7C4DFF','#FF7043'];

  // Map themes to real, helpful resources (each theme uses a different site)
  const RESOURCE_MAP = {
    design: 'https://www.smashingmagazine.com',
    javascript: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript',
    cooking: 'https://www.seriouseats.com',
    travel: 'https://www.lonelyplanet.com',
    fitness: 'https://www.acefitness.org',
    movies: 'https://www.imdb.com',
    music: 'https://www.allmusic.com',
    science: 'https://www.nature.com',
    history: 'https://www.britannica.com',
    photography: 'https://www.dpreview.com'
  };

  // Generate a dataset of 150 sample search results, each with title, url, snippet, and info
  function makeDataset(){
    const themes = ['design','javascript','cooking','travel','fitness','movies','music','science','history','photography'];
    for(let i=1;i<=TOTAL;i++){
      const theme = themes[i % themes.length];
      const title = `Sample Result ${i} — ${capitalize(theme)} guide ${i%7===0 ? ' (advanced)' : ''}`;
      const path = `guide-${i}`;
      const base = RESOURCE_MAP[theme] || 'https://example.com';
      // Each item links to a unique fragment/anchor of the real resource so links are distinct while still pointing at a helpful site
      const url = `${base}/#${path}`;
      const domain = (new URL(base)).host;
      const snippet = `This is a short snippet for sample result ${i}. It demonstrates search preview text for the ${theme} topic. For real reference material, see ${domain}. Try searching by "${theme}" or "result ${i}".`;
      const info = `Full info for "${title}": This demo entry points you to ${domain} — a real resource for ${theme}. It includes a helpful starting page (${url}), a short snippet, and this longer info block with tips and background details. Use it to test link behavior, info toggles, and highlighting.`;
      dataset.push({
        id: i,
        title,
        url,
        site: domain,
        snippet,
        info,
        tag: theme,
        color: COLORS[i % COLORS.length]
      });
    }
  }

  function capitalize(s){ return s.charAt(0).toUpperCase()+s.slice(1) }

  // Render a page of results
  function renderPage(){
    resultsEl.innerHTML = '';
    if(filtered.length === 0){
      resultsMeta.classList.add('hidden');
      resultsEl.innerHTML = `<p style="color:var(--muted);text-align:center;padding:18px">No results. Try a different query.</p>`;
      return;
    }
    resultsMeta.classList.remove('hidden');
    const start = (page-1)*PAGE_SIZE;
    const pageItems = filtered.slice(start, start+PAGE_SIZE);

    countEl.textContent = `About ${filtered.length} results`;

    pageItems.forEach(item => {
      const r = document.createElement('article');
      r.className = 'result';
      // build escaped pieces
      const eTitle = escapeHtml(item.title);
      const eUrl = escapeHtml(item.url);
      const eSite = escapeHtml(item.site);
      const eSnippet = escapeHtml(item.snippet);
      const eInfo = escapeHtml(item.info);

      r.innerHTML = `
        <div class="play-icon" style="background:${item.color}" aria-hidden="true">${playSvg()}</div>
        <div class="result-body">
          <div class="result-head">
            <h3 class="result-title"><a class="result-link" href="${eUrl}" target="_blank" rel="noopener noreferrer">${eTitle}</a></h3>
            <button class="info-btn" data-id="${item.id}" aria-expanded="false" title="More info">info</button>
          </div>
          <div class="result-url"><a href="${eUrl}" target="_blank" rel="noopener noreferrer">${eSite}</a></div>
          <div class="result-snippet">${eSnippet}</div>
          <div class="result-info" id="info-${item.id}">${eInfo}</div>
        </div>
      `;
      resultsEl.appendChild(r);
    });

    renderPager();
    // highlight terms after elements are added
    highlight(qInput.value.trim());
    attachInfoHandlers();
  }

  function renderPager(){
    const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
    pagerEl.innerHTML = '';
    if(totalPages <= 1) return;
    const prevBtn = document.createElement('button');
    prevBtn.className = 'pager-btn';
    prevBtn.textContent = '← Prev';
    prevBtn.disabled = page===1;
    prevBtn.onclick = () => { if(page>1){ page--; renderPage(); window.scrollTo({top:0,behavior:'smooth'}) }};
    pagerEl.appendChild(prevBtn);

    const info = document.createElement('span');
    info.style.margin = '0 8px';
    info.textContent = `Page ${page} of ${totalPages}`;
    pagerEl.appendChild(info);

    const nextBtn = document.createElement('button');
    nextBtn.className = 'pager-btn';
    nextBtn.textContent = 'Next →';
    nextBtn.disabled = page===totalPages;
    nextBtn.onclick = () => { if(page<totalPages){ page++; renderPage(); window.scrollTo({top:0,behavior:'smooth'}) }};
    pagerEl.appendChild(nextBtn);
  }

  // attach handlers to all info buttons on the page
  function attachInfoHandlers(){
    document.querySelectorAll('.info-btn').forEach(btn => {
      const id = btn.getAttribute('data-id');
      const infoEl = document.getElementById(`info-${id}`);
      btn.onclick = () => {
        const visible = infoEl.classList.toggle('visible');
        btn.setAttribute('aria-expanded', visible ? 'true' : 'false');
        // re-run highlight so highlighted terms appear inside info area too
        highlight(qInput.value.trim());
      };
    });
  }

  // Simple search: substring match on title, snippet, tag, and info
  function doSearch(q){
    const t = (q||'').trim().toLowerCase();
    if(!t){
      filtered = [...dataset];
    } else {
      filtered = dataset.filter(item => {
        return item.title.toLowerCase().includes(t) ||
               item.snippet.toLowerCase().includes(t) ||
               item.tag.toLowerCase().includes(t) ||
               item.info.toLowerCase().includes(t);
      });
    }
    page = 1;
    renderPage();
  }

  // highlight query terms in results (title, snippet, url, info)
  function highlight(q){
    // remove previous highlights by resetting textContent -> will lose markup but we re-insert escaped content
    if(!q){
      // restore raw content for visible elements
      document.querySelectorAll('.result').forEach(article => {
        const idAttr = article.querySelector('.info-btn')?.getAttribute('data-id');
        const item = dataset.find(it => String(it.id) === String(idAttr));
        if(!item) return;
        article.querySelector('.result-title').innerHTML = `<a class="result-link" href="${escapeHtml(item.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(item.title)}</a>`;
        article.querySelector('.result-url').innerHTML = `<a href="${escapeHtml(item.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(item.site)}</a>`;
        article.querySelector('.result-snippet').textContent = item.snippet;
        const infoEl = article.querySelector('.result-info');
        if(infoEl) infoEl.textContent = item.info;
      });
      return;
    }
    const terms = q.split(/\s+/).filter(Boolean).map(escapeRegExp);
    if(terms.length===0) return;
    const re = new RegExp('(' + terms.join('|') + ')', 'ig');
    document.querySelectorAll('.result').forEach(article => {
      const idAttr = article.querySelector('.info-btn')?.getAttribute('data-id');
      const item = dataset.find(it => String(it.id) === String(idAttr));
      if(!item) return;
      const tTitle = escapeHtml(item.title).replace(re, '<span class="highlight">$1</span>');
      article.querySelector('.result-title').innerHTML = `<a class="result-link" href="${escapeHtml(item.url)}" target="_blank" rel="noopener noreferrer">${tTitle}</a>`;
      const tUrl = escapeHtml(item.site).replace(re, '<span class="highlight">$1</span>');
      article.querySelector('.result-url').innerHTML = `<a href="${escapeHtml(item.url)}" target="_blank" rel="noopener noreferrer">${tUrl}</a>`;
      article.querySelector('.result-snippet').innerHTML = escapeHtml(item.snippet).replace(re, '<span class="highlight">$1</span>');
      const infoEl = article.querySelector('.result-info');
      if(infoEl){
        infoEl.innerHTML = escapeHtml(item.info).replace(re, '<span class="highlight">$1</span>');
      }
    });
  }

  // utility: escape HTML
  function escapeHtml(s){
    return String(s).replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  }
  function escapeRegExp(s){ return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') }

  // playful SVG for icon (not using any trademark)
  function playSvg(){
    return `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true" xmlns="http://www.w3.org/2000/svg">
      <rect x="2" y="2" width="20" height="20" rx="6" fill="rgba(255,255,255,0.06)"></rect>
      <path d="M9 8.5v7l6-3.5-6-3.5z" fill="white"></path>
    </svg>`;
  }

  // "I'm Feeling Playful" finds a random result and scrolls to it
  luckyBtn.addEventListener('click', () => {
    const idx = Math.floor(Math.random()*dataset.length);
    qInput.value = dataset[idx].tag;
    doSearch(qInput.value);
    // go to page containing the item
    const pos = filtered.findIndex(it => it.id === dataset[idx].id);
    if(pos>=0){
      page = Math.floor(pos / PAGE_SIZE) + 1;
      renderPage();
      // open the info section for the lucky result
      setTimeout(() => {
        const infoBtn = document.querySelector(`.info-btn[data-id="${dataset[idx].id}"]`);
        if(infoBtn) infoBtn.click();
      }, 150);
      window.scrollTo({top:0,behavior:'smooth'});
    }
  });

  // main search button and enter handling
  searchBtn.addEventListener('click', () => doSearch(qInput.value));
  qInput.addEventListener('keydown', e => {
    if(e.key === 'Enter'){ doSearch(qInput.value); e.preventDefault(); }
    if(e.key === 'Escape'){ qInput.value=''; doSearch(''); }
  });

  // init
  makeDataset();
  filtered = [...dataset];
  renderPage();

  // expose for debugging (optional)
  window._searchly = {dataset, doSearch};
})();
