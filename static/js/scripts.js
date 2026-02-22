const contentDir = 'contents/';
const configFile = 'config.yml';

const markdownTargets = {
    home: 'home-md',
    news: 'news-md',
    awards: 'awards-md'
};

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

    const responsiveNavItems = [].slice.call(document.querySelectorAll('#navbarResponsive .nav-link'));
    responsiveNavItems.forEach(navItem => {
        navItem.addEventListener('click', () => {
            if (window.getComputedStyle(navbarToggler).display !== 'none') {
                navbarToggler.click();
            }
        });
    });
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

function publicationActionButton(iconClass, label, url) {
    if (!url) {
        return '';
    }

    return `<a class="paper-action" href="${url}" target="_blank" rel="noopener noreferrer"><i class="${iconClass}"></i>${label}</a>`;
}

function highlightSelfName(authorsText) {
    return authorsText.replace(/Song Fei/g, '<strong><u>Song Fei</u></strong>');
}

function parseAuthorTokens(markerText) {
    const matches = markerText.match(/✉️|[*‡†]/g);
    return matches || [];
}

function formatAuthors(authorsRaw) {
    const segments = authorsRaw.split(',').map(segment => segment.trim()).filter(Boolean);
    const authorParts = [];
    const noteParts = [];

    segments.forEach(segment => {
        const noteMatch = segment.match(/^([*‡†✉️])\s*(.+)$/);
        if (noteMatch) {
            noteParts.push(`${noteMatch[1]} ${noteMatch[2]}`);
            return;
        }

        const authorMatch = segment.match(/^(.*?)([*‡†✉️]+)$/);
        if (authorMatch) {
            const authorName = highlightSelfName(authorMatch[1].trim());
            const markers = parseAuthorTokens(authorMatch[2]).join('');
            authorParts.push(`${authorName}<sup>${markers}</sup>`);
            return;
        }

        authorParts.push(highlightSelfName(segment));
    });

    return {
        authorsHtml: authorParts.join(', '),
        notesHtml: noteParts.length ? noteParts.join(' · ') : ''
    };
}

function renderTopicTags(topics) {
    if (!Array.isArray(topics) || topics.length === 0) {
        return '';
    }

    return topics
        .map(topic => `<span class="paper-tag paper-topic-tag">${topic}</span>`)
        .join('');
}

function createPublicationItem(item) {
    const paperImage = item.image || 'static/assets/img/background.jpeg';
    const paperLink = item.project_url || '#';
    const { authorsHtml, notesHtml } = formatAuthors(item.authors || 'Unknown Authors');
    const paperDate = item.date || ((item.year && item.month) ? `${item.year}.${String(item.month).padStart(2, '0')}` : (item.year || 'TBD'));
    const paperStatus = item.status || item.venue || '';
    const topicTags = renderTopicTags(item.topics);
    const paperUrl = item.paper || item.arxiv || '';
    const shouldShowArxiv = item.arxiv && item.arxiv !== paperUrl;

    return `
        <article class="paper-row">
            <a class="paper-thumb image-wrapper" href="${paperLink}" target="_blank" rel="noopener noreferrer" data-description="${paperStatus}">
                <img src="${paperImage}" alt="${item.title}">
            </a>
            <div class="paper-content">
                <h3 class="paper-title"><a href="${paperLink}" target="_blank" rel="noopener noreferrer">${item.title}</a></h3>
                ${topicTags ? `<div class="paper-topic-row">${topicTags}</div>` : ''}
                <p class="paper-authors">${authorsHtml}</p>
                ${notesHtml ? `<p class="paper-author-notes">${notesHtml}</p>` : ''}
                <div class="paper-meta">
                    <span class="paper-tag"><i class="bi bi-calendar-event"></i>${paperDate}</span>
                    ${paperStatus ? `<span class="paper-tag"><i class="bi bi-patch-check"></i>${paperStatus}</span>` : ''}
                </div>
                <div class="paper-actions">
                    ${publicationActionButton('bi bi-file-earmark-pdf', 'Paper', paperUrl)}
                    ${publicationActionButton('bi bi-window', 'Project', item.project_url)}
                    ${shouldShowArxiv ? publicationActionButton('bi bi-file-earmark-text', 'arXiv', item.arxiv) : ''}
                    ${publicationActionButton('bi bi-github', 'GitHub', item.github)}
                </div>
            </div>
        </article>
    `;
}

function renderPublications() {
    const publicationRoot = document.getElementById('publications-list');
    if (!publicationRoot) {
        return Promise.resolve();
    }

    return Promise.resolve();
}

window.addEventListener('DOMContentLoaded', () => {
    marked.use({ mangle: false, headerIds: false });

    setActiveNav();
    setupResponsiveNavbar();

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

    const publicationTask = renderPublications().catch(error => console.log(error));

    Promise.all([...markdownTasks, publicationTask]).then(() => {
        if (window.MathJax && window.MathJax.typeset) {
            MathJax.typeset();
        }
    });
});
