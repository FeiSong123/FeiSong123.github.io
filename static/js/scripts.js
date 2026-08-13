const contentDir = 'contents/';
const configFile = 'config.yml';
const publicationsFile = 'publications.yml';

const markdownTargets = {
    home: 'home-md'
};

const TYPEWRITER_ROLES = [
    'AIGC Researcher',
    'Image Restoration',
    'Low-level Vision',
    'MPhil @ HKUST(GZ)',
    'Robotics Enthusiast'
];

const THEME_KEY = 'fei-theme';

/* ---------- publications ---------- */

const PUB_CATEGORIES = [
    { id: 'all', label: 'All' },
    { id: 'cvpr-iccv', label: 'CVPR / ICCV' },
    { id: 'iclr-neurips', label: 'ICLR / NeurIPS' },
    { id: 'miccai', label: 'MICCAI' },
    { id: 'other', label: 'Others' }
];

const COUNTER_BUCKETS = {
    cv: /cvpr|iccv|eccv/i,
    ml: /neurips|iclr|icml/i,
    ai: /aaai|ijcai|acm\s*mm/i,
    med: /miccai|midl|isbi/i
};

const LINK_EMOJI = {
    Paper: '📖 ',
    Website: '🌐 ',
    HuggingFace: '🤗 ',
    GitHub: ''
};

let pubData = [];
let pubState = { cat: 'all', query: '' };
let initialCategory = 'all';

function setupPublicationsView() {
    const publicationsSection = document.getElementById('publications');
    if (!publicationsSection) {
        return;
    }

    const params = new URLSearchParams(window.location.search);
    const isPublicationsView = params.get('view') === 'publications';

    const requestedCat = params.get('cat');
    if (requestedCat && PUB_CATEGORIES.some(c => c.id === requestedCat)) {
        initialCategory = requestedCat;
    }

    if (isPublicationsView || window.location.hash === '#publications') {
        publicationsSection.classList.remove('publications-hidden');
    }

    if (isPublicationsView) {
        document.body.classList.add('publications-view');
    }
}

function buildPaperCard(p, index) {
    const primary = (p.links && p.links[0]) || {};
    const href = primary.url || '#';
    const notes = p.notes ? `<p class="paper-author-notes">${p.notes}</p>` : '';

    const tags = [`<span class="paper-tag"><i class="bi bi-patch-check"></i>${p.venue}</span>`];
    (p.extra_tags || []).forEach(t => {
        tags.push(`<span class="paper-tag"><i class="bi ${t.icon}"></i>${t.label}</span>`);
    });

    let actions = (p.links || []).map(link => {
        const icon = link.icon ? `<i class="bi ${link.icon}"></i>` : (LINK_EMOJI[link.label] || '');
        return `<a class="paper-action" href="${link.url}" target="_blank" rel="noopener noreferrer">${icon}${link.label}</a>`;
    }).join('');

    actions += `<button class="paper-action cite-btn" type="button" data-key="${p.key}" title="Copy BibTeX">📋 Cite</button>`;

    const badges = (p.repos || []).map(r => `
        <span class="repo-stats repo-stats-inline">
            <a href="https://github.com/${r.owner}/${r.repo}/stargazers" target="_blank" rel="noopener noreferrer"><img src="https://img.shields.io/github/stars/${r.owner}/${r.repo}?style=flat-square&logo=github" alt="${r.repo} stars"></a>
            <a href="https://github.com/${r.owner}/${r.repo}/network/members" target="_blank" rel="noopener noreferrer"><img src="https://img.shields.io/github/forks/${r.owner}/${r.repo}?style=flat-square&logo=github" alt="${r.repo} forks"></a>
        </span>`).join('');

    const searchText = `${p.title} ${stripHtml(p.authors)}`.toLowerCase();

    return `
        <article class="paper-row" data-category="${p.category || 'other'}" data-search="${escapeHtml(searchText)}">
            <a class="paper-thumb image-wrapper" href="${href}" target="_blank" rel="noopener noreferrer" data-description="${p.venue}">
                <img src="${p.thumb}" alt="${p.alt || p.title}" loading="lazy">
            </a>
            <div class="paper-content">
                <h3 class="paper-title"><a href="${href}" target="_blank" rel="noopener noreferrer">${p.title}</a></h3>
                <p class="paper-authors">${p.authors}</p>
                ${notes}
                <div class="paper-meta">${tags.join('')}</div>
                <div class="paper-actions">${actions}${badges}</div>
            </div>
        </article>`;
}

function buildPubChips() {
    const wrap = document.getElementById('pub-filter-chips');
    if (!wrap) {
        return;
    }
    const counts = { all: pubData.length };
    pubData.forEach(p => {
        const c = p.category || 'other';
        counts[c] = (counts[c] || 0) + 1;
    });
    wrap.innerHTML = PUB_CATEGORIES.map(c =>
        `<button class="filter-chip${c.id === 'all' ? ' active' : ''}" type="button" data-cat="${c.id}">${c.label} (${counts[c.id] || 0})</button>`
    ).join('');
    wrap.querySelectorAll('.filter-chip').forEach(btn => {
        btn.addEventListener('click', () => {
            pubState.cat = btn.dataset.cat;
            wrap.querySelectorAll('.filter-chip').forEach(b => b.classList.toggle('active', b === btn));
            applyPubFilters();
        });
    });
}

function applyPubFilters() {
    const rows = document.querySelectorAll('#publications-list .paper-row');
    const q = pubState.query.trim().toLowerCase();
    let visible = 0;
    rows.forEach(row => {
        const okCat = pubState.cat === 'all' || row.dataset.category === pubState.cat;
        const okQuery = !q || row.dataset.search.includes(q);
        const show = okCat && okQuery;
        row.classList.toggle('hidden', !show);
        if (show) {
            visible++;
        }
    });
    const list = document.getElementById('publications-list');
    let empty = document.getElementById('pub-empty');
    if (visible === 0) {
        if (!empty) {
            empty = document.createElement('p');
            empty.id = 'pub-empty';
            empty.className = 'empty-state';
            empty.textContent = 'No matching publications 😢';
            list.appendChild(empty);
        }
    } else if (empty) {
        empty.remove();
    }
}

function setupPubSearch() {
    const input = document.getElementById('pub-search-input');
    if (!input) {
        return;
    }
    input.addEventListener('input', () => {
        pubState.query = input.value;
        applyPubFilters();
    });
}

function setPubCounters() {
    const counts = { cv: 0, ml: 0, ai: 0, med: 0 };
    pubData.forEach(p => {
        const venue = p.venue || '';
        Object.keys(COUNTER_BUCKETS).forEach(key => {
            if (COUNTER_BUCKETS[key].test(venue)) {
                counts[key]++;
            }
        });
    });
    document.querySelectorAll('[data-counter]').forEach(el => {
        el.textContent = counts[el.dataset.counter] || 0;
    });
}

function stripHtml(html) {
    const div = document.createElement('div');
    div.innerHTML = html;
    return div.textContent || '';
}

function escapeHtml(str) {
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function buildBibtex(p) {
    const type = p.bib_type || 'inproceedings';
    const clean = html => stripHtml(html).replace(/[✉️‡†*]/g, '').replace(/\s+/g, ' ').trim();
    const authors = clean(p.authors).split(',').map(s => s.trim()).filter(Boolean);
    let authorStr;
    if (authors.length <= 1) {
        authorStr = authors[0] || '';
    } else if (authors.length === 2) {
        authorStr = authors.join(' and ');
    } else {
        authorStr = authors.slice(0, -1).join(', ') + ' and ' + authors[authors.length - 1];
    }

    const lines = [
        `  title={${clean(p.title)}},`,
        `  author={${authorStr}},`
    ];
    if (type === 'inproceedings') {
        lines.push(`  booktitle={${clean(p.venue)}},`);
    } else if (type === 'article') {
        lines.push('  journal={arXiv preprint},');
    } else if (p.links && p.links.length) {
        lines.push(`  howpublished={\\url{${p.links[0].url}}},`);
    }
    lines.push(`  year={${p.year || ''}}`);

    return `@${type}{${p.key || 'paper'},\n${lines.join('\n')}\n}\n`;
}

function copyText(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
        return navigator.clipboard.writeText(text);
    }
    return new Promise((resolve, reject) => {
        const ta = document.createElement('textarea');
        ta.value = text;
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        try {
            document.execCommand('copy');
            resolve();
        } catch (e) {
            reject(e);
        } finally {
            document.body.removeChild(ta);
        }
    });
}

function showToast(message) {
    const toast = document.getElementById('site-toast');
    if (!toast) {
        return;
    }
    toast.textContent = message;
    toast.classList.add('show');
    clearTimeout(toast._timer);
    toast._timer = setTimeout(() => toast.classList.remove('show'), 2200);
}

function bindCiteButtons() {
    document.querySelectorAll('#publications-list .cite-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const paper = pubData.find(p => p.key === btn.dataset.key);
            if (!paper) {
                return;
            }
            copyText(buildBibtex(paper))
                .then(() => showToast('BibTeX copied to clipboard 📋'))
                .catch(() => showToast('Copy failed 😢'));
        });
    });
}

function revealPaperRows() {
    const section = document.getElementById('publications');
    if (!section || getComputedStyle(section).display === 'none') {
        return;
    }
    section.querySelectorAll('.paper-row').forEach((el, i) => {
        el.classList.add('reveal');
        el.style.transitionDelay = (i % 6) * 70 + 'ms';
        requestAnimationFrame(() => requestAnimationFrame(() => el.classList.add('revealed')));
    });
}

function renderPublications() {
    const list = document.getElementById('publications-list');
    if (!list) {
        return Promise.resolve();
    }
    return fetch(`${contentDir}${publicationsFile}`)
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
            return response.text();
        })
        .then(text => {
            const data = jsyaml.load(text);
            pubData = (data && data.papers) || [];
        })
        .then(() => {
            list.innerHTML = pubData.map((p, i) => buildPaperCard(p, i)).join('');
            buildPubChips();
            setupPubSearch();

            // 支持 URL 里的 ?cat= 参数(例如研究兴趣卡片跳转)
            if (initialCategory !== 'all') {
                pubState.cat = initialCategory;
                const chip = document.querySelector(`#pub-filter-chips .filter-chip[data-cat="${initialCategory}"]`);
                if (chip) {
                    document.querySelectorAll('#pub-filter-chips .filter-chip').forEach(b => b.classList.remove('active'));
                    chip.classList.add('active');
                }
            }
            applyPubFilters();
            setPubCounters();
            bindCiteButtons();
            revealPaperRows();
        })
        .catch(error => {
            console.log(error);
            list.innerHTML = '<p class="empty-state">Failed to load publications.</p>';
        });
}

/* ---------- page utils ---------- */

function getCurrentPage() {
    const pageName = window.location.pathname.split('/').pop();
    return pageName || 'index.html';
}

function setActiveNav() {
    const page = getCurrentPage();
    const navLinks = document.querySelectorAll('[data-nav]');
    navLinks.forEach(link => {
        const href = link.getAttribute('href');
        if (href === page || (page === '' && href === 'index.html')) {
            link.classList.add('active');
        }
    });
}

function setupResponsiveNavbar() {
    const navbarToggler = document.body.querySelector('.navbar-toggler');
    if (!navbarToggler) {
        return;
    }

    const responsiveNavItems = [].slice.call(
        document.querySelectorAll('#navbarResponsive .nav-link:not(.dropdown-toggle), #navbarResponsive .dropdown-item')
    );
    responsiveNavItems.forEach(navItem => {
        navItem.addEventListener('click', () => {
            if (window.getComputedStyle(navbarToggler).display !== 'none') {
                navbarToggler.click();
            }
        });
    });
}

function setupThemeToggle() {
    const toggle = document.getElementById('theme-toggle');
    if (!toggle) {
        return;
    }

    const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    let saved = null;
    try {
        saved = localStorage.getItem(THEME_KEY);
    } catch (e) { /* ignore */ }

    const useDark = saved ? saved === 'dark' : prefersDark;
    document.body.classList.toggle('dark', useDark);

    toggle.addEventListener('click', () => {
        const dark = !document.body.classList.contains('dark');
        document.body.classList.toggle('dark', dark);
        try {
            localStorage.setItem(THEME_KEY, dark ? 'dark' : 'light');
        } catch (e) { /* ignore */ }
    });
}

function setupTypewriter() {
    const el = document.getElementById('typewriter-text');
    if (!el || !TYPEWRITER_ROLES.length) {
        return;
    }

    let roleIndex = 0;
    let charIndex = 0;
    let deleting = false;

    const tick = () => {
        const word = TYPEWRITER_ROLES[roleIndex];
        if (!deleting) {
            charIndex++;
            el.textContent = word.slice(0, charIndex);
            if (charIndex === word.length) {
                deleting = true;
                return setTimeout(tick, 1700);
            }
            return setTimeout(tick, 65 + Math.random() * 70);
        }
        charIndex--;
        el.textContent = word.slice(0, charIndex);
        if (charIndex === 0) {
            deleting = false;
            roleIndex = (roleIndex + 1) % TYPEWRITER_ROLES.length;
            return setTimeout(tick, 450);
        }
        return setTimeout(tick, 32);
    };

    setTimeout(tick, 900);
}

function setupScrollEffects() {
    const header = document.getElementById('mainNav');
    const backToTop = document.getElementById('back-to-top');

    const onScroll = () => {
        const y = window.scrollY;
        if (header) {
            header.classList.toggle('scrolled', y > 8);
        }
        if (backToTop) {
            backToTop.classList.toggle('visible', y > 640);
        }
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();

    if (backToTop) {
        backToTop.addEventListener('click', () => {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
    }
}

function setupRevealAnimations() {
    const reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const selectors = '.paper-row, .news-section, .service-section, .experience-card, .intro-counters, section:not(.top-section) > .container';
    const elements = document.querySelectorAll(selectors);
    if (!elements.length) {
        return;
    }
    if (!('IntersectionObserver' in window) || reduceMotion) {
        elements.forEach(el => el.classList.add('revealed'));
        return;
    }

    const isVisible = el => {
        const r = el.getBoundingClientRect();
        return r.top < window.innerHeight * 0.92 && r.bottom > 0;
    };

    const observer = new IntersectionObserver(entries => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('revealed');
                observer.unobserve(entry.target);
            }
        });
    }, { threshold: 0.1 });

    elements.forEach(el => {
        if (el.closest('.publications-hidden')) {
            return;
        }
        el.classList.add('reveal');
        if (isVisible(el)) {
            el.classList.add('revealed');
            return;
        }
        observer.observe(el);
    });
}

function setupCounters() {
    const counters = document.querySelectorAll('.counter-value');
    if (!counters.length) {
        return;
    }

    const animate = el => {
        const target = parseInt(el.textContent, 10) || 0;
        if (target <= 0) {
            el.textContent = '0';
            return;
        }
        const duration = 1100;
        const start = performance.now();
        const step = now => {
            const progress = Math.min((now - start) / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 3);
            el.textContent = Math.round(target * eased);
            if (progress < 1) {
                requestAnimationFrame(step);
            }
        };
        requestAnimationFrame(step);
    };

    if (!('IntersectionObserver' in window)) {
        counters.forEach(animate);
        return;
    }

    const observer = new IntersectionObserver(entries => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                animate(entry.target);
                observer.unobserve(entry.target);
            }
        });
    }, { threshold: 0.5 });

    counters.forEach(counter => observer.observe(counter));
}

function renderConfig(config) {
    Object.keys(config).forEach(key => {
        const target = document.getElementById(key);
        if (target) {
            target.innerHTML = config[key];
        }
    });
}

function renderMarkdown(sectionName, targetId) {
    const target = document.getElementById(targetId);
    if (!target) {
        return Promise.resolve();
    }

    return fetch(`${contentDir}${sectionName}.md`)
        .then(response => response.text())
        .then(markdown => {
            target.innerHTML = marked.parse(markdown);
        });
}

window.addEventListener('DOMContentLoaded', () => {
    marked.use({ mangle: false, headerIds: false });

    setActiveNav();
    setupResponsiveNavbar();
    setupPublicationsView();
    setupThemeToggle();
    setupTypewriter();
    setupScrollEffects();
    setupRevealAnimations();

    renderPublications().then(setupCounters);

    fetch(`${contentDir}${configFile}`)
        .then(response => response.text())
        .then(text => {
            const config = jsyaml.load(text);
            renderConfig(config);
        })
        .catch(error => console.log(error));

    const markdownTasks = Object.entries(markdownTargets).map(([name, targetId]) =>
        renderMarkdown(name, targetId).catch(error => console.log(error))
    );

    Promise.all(markdownTasks).then(() => {
        if (window.MathJax && window.MathJax.typeset) {
            MathJax.typeset();
        }
    });
});
