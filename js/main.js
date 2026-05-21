let state = {
    query: "",
    activeTag: null,
    activeYear: null
};

let projects = [];
let macroTags = [];
let availableYears = [];

const MONTHS = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];

const searchInput = document.getElementById('search-input');
const tagsContainer = document.getElementById('tags-container');
const yearsContainer = document.getElementById('years-container');
const archiveContainer = document.getElementById('archive-container');
const showingText = document.getElementById('showing-text');
const activeFiltersText = document.getElementById('active-filters-text');

// === SISTEMA DI ANIMAZIONE APPLE (SCROLL REVEAL) ===
const revealObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add('reveal-visible');
            observer.unobserve(entry.target); 
        }
    });
}, {
    root: null,
    rootMargin: '0px 0px -50px 0px', 
    threshold: 0.1
});

// 1. Filtro Globale dai Tag in riga o dalle Card
window.filterByTag = (tag) => {
    state.activeTag = tag;
    searchInput.value = ""; 
    state.query = "";
    renderFilters();
    renderProjects();
    
    // Smooth scroll al punto giusto
    const section = document.getElementById('database-section');
    if(section) {
        section.scrollIntoView({ behavior: 'smooth' });
    } else {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
};

// 2. Apertura fluida dai Progetti Correlati (Related Cards)
window.openRelatedProject = (absoluteIndex) => {
    
    // 1. Applica la classe fade-out al contenitore principale (CSS: transition opacity)
    if(archiveContainer) {
        archiveContainer.classList.add('fade-out');
    }

    // 2. Aspetta 400ms per completare la transizione visiva
    setTimeout(() => {
        const p = projects[absoluteIndex];
        const pTag = p.tags && p.tags.length > 0 ? p.tags[0].toLowerCase() : null;
        const pYear = p.data?.anno || 2026;
        
        // Reset dei filtri in modo da poter trovare il progetto correlato
        if(state.activeTag && state.activeTag !== pTag) { state.activeTag = null; }
        if(state.activeYear && state.activeYear !== pYear) { state.activeYear = null; }
        if(state.query !== "") { state.query = ""; searchInput.value = ""; }
        
        renderFilters();
        renderProjects(); 
        
        // Apriamo manualmente il progetto bersaglio
        const safeId = `proj-${absoluteIndex}`;
        const targetRow = document.getElementById(`row-${safeId}`);
        const targetContent = document.getElementById(`content-${safeId}`);
        
        if(targetRow && targetContent) {
            targetRow.classList.add('open');
            targetContent.classList.add('open');
            
            // --- TRUCCO CINEMATOGRAFICO ---
            // A. Disattiviamo lo scroll morbido temporaneamente
            document.documentElement.style.scrollBehavior = 'auto';
            
            // B. Calcoliamo la posizione esatta della riga appena aperta (offset per l'header)
            const y = targetRow.getBoundingClientRect().top + window.pageYOffset - 40;
            
            // C. Salto istantaneo mentre lo schermo è ancora sfumato
            window.scrollTo(0, y);
            
            // D. Ripristiniamo lo scroll morbido per la navigazione successiva
            document.documentElement.style.scrollBehavior = 'smooth';
        }
        
        // 3. Rimuove il fade-out per rivelare il nuovo contenuto GIÀ IN POSIZIONE
        if(archiveContainer) {
            archiveContainer.classList.remove('fade-out');
        }

    }, 400); // 400 millisecondi di delay (coincide col CSS transition)
};

async function init() {
    if(!archiveContainer) return;
    archiveContainer.innerHTML = '<div class="p-6 text-center font-mono text-sm font-bold tracking-widest text-foreground uppercase">Loading archive data...</div>';
    
    try {
        const response = await fetch('https://ixd-supsi.github.io/n70api/data.json');
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        
        let rawProjects = await response.json();
        
        // ORDINAMENTO: Anno crescente, poi Alfabetico.
        projects = rawProjects.sort((a, b) => {
            const yearA = a.data?.anno || 2026;
            const yearB = b.data?.anno || 2026;
            if (yearA !== yearB) return yearA - yearB; 
            return (a.titolo || '').localeCompare(b.titolo || '');
        });
        
        const allFirstTags = projects
            .filter(p => p.tags && p.tags.length > 0)
            .map(p => p.tags[0].toLowerCase());
        macroTags = [...new Set(allFirstTags)].sort();

        const allYears = projects.map(p => p.data?.anno || 2026);
        availableYears = [...new Set(allYears)].sort((a, b) => b - a);

        renderFilters();
        setupEventListeners();
        renderProjects();

        // Applica animazione al footer
        const footer = document.querySelector('footer');
        if(footer) {
            footer.classList.add('reveal-hidden');
            revealObserver.observe(footer);
        }

    } catch (error) {
        console.error("ERRORE API:", error);
        archiveContainer.innerHTML = '<div class="p-6 text-center text-foreground font-mono text-sm font-bold">Failed to load API data. Check console.</div>';
    }
}

function renderFilters() {
    if(!yearsContainer || !tagsContainer) return;

    yearsContainer.innerHTML = '';
    const allYearBtn = document.createElement('button');
    allYearBtn.className = 'pill pill-year';
    if (state.activeYear === null) allYearBtn.dataset.active = "true";
    allYearBtn.textContent = 'ALL';
    allYearBtn.onclick = () => { state.activeYear = null; renderFilters(); renderProjects(); };
    yearsContainer.appendChild(allYearBtn);

    availableYears.forEach(year => {
        const btn = document.createElement('button');
        btn.className = 'pill pill-year';
        if (state.activeYear === year) btn.dataset.active = "true";
        btn.textContent = year;
        btn.onclick = () => { state.activeYear = year; renderFilters(); renderProjects(); };
        yearsContainer.appendChild(btn);
    });

    tagsContainer.innerHTML = '';
    const allCatBtn = document.createElement('button');
    allCatBtn.className = 'pill pill-tag';
    if (state.activeTag === null) allCatBtn.dataset.active = "true";
    allCatBtn.textContent = 'ALL';
    allCatBtn.onclick = () => { state.activeTag = null; renderFilters(); renderProjects(); };
    tagsContainer.appendChild(allCatBtn);

    macroTags.forEach(tag => {
        const btn = document.createElement('button');
        btn.className = 'pill pill-tag';
        if (state.activeTag === tag) btn.dataset.active = "true";
        btn.textContent = tag;
        btn.onclick = () => { state.activeTag = tag; renderFilters(); renderProjects(); };
        tagsContainer.appendChild(btn);
    });
}

function handleSearch(e) {
    state.query = e.target.value.toLowerCase();
    renderProjects();
}

// === FUNZIONE DI APERTURA/CHIUSURA ===
function toggleProject(id) {
    const row = document.getElementById(`row-${id}`);
    const content = document.getElementById(`content-${id}`);
    
    if (row && content) {
        row.classList.toggle('open');
        content.classList.toggle('open');
    }
}

function renderProjects() {
    if(!archiveContainer) return;
    archiveContainer.innerHTML = '';

    const filtered = projects.filter(p => {
        const tags = p.tags || [];
        const pTag = tags.length > 0 ? tags[0].toLowerCase() : 'uncategorized';
        const pYear = p.data?.anno || 2026;
        
        if (state.activeTag && pTag !== state.activeTag) return false;
        if (state.activeYear && pYear !== state.activeYear) return false;
        if (state.query) {
            const searchString = `${p.titolo || ''} ${p.autore || ''} ${p.descrizione || ''} ${tags.join(' ')}`.toLowerCase();
            if (!searchString.includes(state.query)) return false;
        }
        return true;
    });

    if(showingText) showingText.textContent = `SHOWING ${filtered.length} / ${projects.length}`;
    if(activeFiltersText) activeFiltersText.textContent = `${state.activeTag ? state.activeTag.toUpperCase() : 'ALL CATEGORIES'} · ${state.activeYear ? state.activeYear : 'ALL YEARS'}`;

    if (filtered.length === 0) {
        archiveContainer.innerHTML = `<div class="p-12 text-center font-mono text-sm font-bold uppercase text-foreground">No projects match the query</div>`;
        return;
    }

    filtered.forEach((p) => {
        const absoluteIndex = projects.indexOf(p);
        const data = p.data || { giorno: 1, mese: 1, anno: 2026 };
        const dateStr = `${String(data.giorno).padStart(2, "0")} ${MONTHS[(data.mese || 1) - 1]} ${data.anno}`;
        const tags = p.tags || [];
        const mainTag = tags.length > 0 ? tags[0] : 'Project';
        const subTags = tags.slice(1);
        
        const imageUrl = (p.immagine && p.immagine.length > 1) ? `assets/images/immagini_api/${p.immagine[1]}` : 
                         ((p.immagine && p.immagine.length > 0) ? `assets/images/immagini_api/${p.immagine[0]}` : '');
        const previewUrl = (p.immagine && p.immagine.length > 0) ? `assets/images/immagini_api/${p.immagine[0]}` : '';
        
        const hasUrl = p.url && p.url !== "https://..." && p.url.trim() !== "";
        let linkHtml = '';
        if (hasUrl) {
            linkHtml = `<a href="${p.url}" target="_blank" rel="noreferrer" class="go-link-btn">EXTERNAL LINK ↗</a>`;
        } else {
            linkHtml = `<div class="go-link-btn" style="opacity: 0.3; cursor: not-allowed; background: transparent; color: #000; border-color: #000;">OFFLINE</div>`;
        }

        const descrizione = p.descrizione && p.descrizione.trim() !== "" ? p.descrizione : "No description available in the database.";
        const safeId = `proj-${absoluteIndex}`;
        
        const wrapper = document.createElement('div');
        wrapper.className = 'reveal-hidden'; 

        const related = projects.filter(rp => rp !== p && rp.tags && rp.tags.length > 0 && rp.tags[0] === mainTag).slice(0, 4);
        let relatedHtml = '';
        if(related.length > 0) {
            const cardsHtml = related.map(rp => {
                const rpIndex = projects.indexOf(rp);
                const rpImg = (rp.immagine && rp.immagine.length > 1) ? `assets/images/immagini_api/${rp.immagine[1]}` : 
                         ((rp.immagine && rp.immagine.length > 0) ? `assets/images/immagini_api/${rp.immagine[0]}` : '');
                
                const shortDesc = (rp.descrizione && rp.descrizione.trim() !== "") 
                    ? rp.descrizione.substring(0, 100).trim() + '...' 
                    : "Descrizione non disponibile...";
                
                return `
                <div class="group border border-foreground flex flex-col cursor-pointer bg-background hover:bg-sysgray transition-colors duration-300" onclick="window.openRelatedProject(${rpIndex})">
                    <div class="p-4 flex flex-col gap-4 h-full">
                        <div class="w-full aspect-square border border-foreground bg-cover bg-center block group-hover:hidden" style="background-image: url('${rpImg}')"></div>
                        
                        <div class="w-full aspect-square hidden group-hover:flex items-start justify-start text-foreground font-mono text-sm leading-relaxed text-left hyphens-auto" lang="en">
                            ${shortDesc}
                        </div>

                        <div class="flex flex-col gap-1 mt-auto">
                            <div class="font-bold text-lg uppercase truncate text-foreground">${rp.titolo || 'UNTITLED'}</div>
                            <div class="text-sm uppercase truncate text-foreground">${rp.autore || 'UNKNOWN'}</div>
                        </div>
                        
                        <div class="flex justify-between items-center text-sm uppercase border-t border-foreground pt-3 mt-2 transition-colors">
                            <span class="text-foreground">${rp.data?.anno || 2026}</span>
                            <span class="pill pill-tag bg-transparent transition-colors" onclick="event.stopPropagation(); window.filterByTag('${mainTag.toLowerCase()}')">${mainTag}</span>
                        </div>
                    </div>
                </div>
                `;
            }).join('');
            
            relatedHtml = `
            <div class="grid grid-cols-12 gap-6 p-12 border-t border-foreground bg-background">
                <div class="col-span-12 font-mono text-sm font-bold tracking-widest uppercase mb-2 text-foreground">RELATED</div>
                <div class="col-span-12 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
                    ${cardsHtml}
                </div>
            </div>`;
        }

        const rowHtml = `
            <div id="row-${safeId}" class="archive-row-header archive-grid-layout">
                <span class="font-mono text-sm">${String(absoluteIndex + 1).padStart(2, "0")}</span>
                <span class="archive-thumb block" style="background-image: url('${imageUrl}')"></span>
                <span class="font-mono font-bold text-xl uppercase truncate pr-4">${p.titolo || 'UNTITLED'}</span>
                <span class="col-author font-mono text-sm uppercase truncate pr-4">${p.autore || 'UNKNOWN'}</span>
                <span class="col-date font-mono text-sm tracking-widest uppercase">${dateStr}</span>
                <span class="col-tag">
                    <span class="pill pill-tag" onclick="event.stopPropagation(); window.filterByTag('${mainTag.toLowerCase()}')">${mainTag}</span>
                </span>
                <span class="col-arrow archive-arrow font-mono text-lg">↓</span>
            </div>
        `;

        const expandedHtml = `
            <div id="content-${safeId}" class="archive-detail-wrapper">
                <div class="archive-detail-inner border-b border-foreground">
                    <div class="grid grid-cols-12 gap-6 p-12 border-b border-foreground">
                        <div class="col-span-12 md:col-span-2 font-mono text-sm font-bold tracking-widest uppercase mt-1 text-foreground">VISUAL DATA</div>
                        <div class="col-span-12 md:col-span-10">
                             <div class="w-full aspect-[16/9] border border-foreground bg-cover bg-center" style="background-image: url('${previewUrl}')"></div>
                        </div>
                    </div>

                    <div class="grid grid-cols-12 gap-6 p-12 border-b border-foreground">
                        <div class="col-span-12 md:col-span-2 font-mono text-sm font-bold tracking-widest uppercase mt-1 text-foreground">LOG ENTRY</div>
                        <div class="col-span-12 md:col-span-8">
                             <p class="font-mono text-sm leading-relaxed text-foreground text-justify hyphens-auto" lang="en">${descrizione}</p>
                        </div>
                    </div>

                    <div class="grid grid-cols-12 gap-6 p-12 border-b border-foreground">
                        <div class="col-span-12 md:col-span-2 font-mono text-sm font-bold tracking-widest uppercase mt-1 text-foreground">META DATA</div>
                        <div class="col-span-12 md:col-span-10 flex flex-col items-start gap-6">
                            ${subTags.length > 0 ? `
                            <div class="flex flex-wrap gap-2 text-sm">
                                ${subTags.map(t => `<span class="meta-label">${t}</span>`).join('')}
                            </div>` : `<div class="font-mono text-sm italic opacity-50 uppercase text-foreground">NO SUB-TAGS IN RECORD</div>`}
                            ${linkHtml}
                        </div>
                    </div>
                    ${relatedHtml}
                </div>
            </div>
        `;

        wrapper.innerHTML = rowHtml + expandedHtml;
        wrapper.querySelector('.archive-row-header').addEventListener('click', () => toggleProject(safeId));
        
        archiveContainer.appendChild(wrapper);
        revealObserver.observe(wrapper);
    });
}

function setupEventListeners() {
    if(searchInput) searchInput.addEventListener('input', handleSearch);
}

init();