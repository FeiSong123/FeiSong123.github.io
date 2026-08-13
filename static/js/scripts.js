const contentDir = 'contents/';
const configFile = 'config.yml';

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

function setupPublicationsView() {
    const publicationsSection = document.getElementById('publications');
    if (!publicationsSection) {
        return;
    }

    const params = new URLSearchParams(window.location.search);
    const isPublicationsView = params.get('view') === 'publications';

    if (isPublicationsView || window.location.hash === '#publications') {
        publicationsSection.classList.remove('publications-hidden');
        // 从隐藏态切换到可见时,让论文卡片做一次级联淡入
        publicationsSection.querySelectorAll('.paper-row').forEach((el, i) => {
            el.classList.add('reveal');
            el.style.transitionDelay = (i % 6) * 70 + 'ms';
            requestAnimationFrame(() => requestAnimationFrame(() => el.classList.add('revealed')));
        });
    }

    if (isPublicationsView) {
        document.body.classList.add('publications-view');
    }
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

    let rowIndex = 0;
    elements.forEach(el => {
        // publications 默认隐藏,进入该视图时由 setupPublicationsView 统一处理
        if (el.closest('.publications-hidden')) {
            return;
        }
        el.classList.add('reveal');
        if (el.classList.contains('paper-row')) {
            el.style.transitionDelay = (rowIndex % 8) * 60 + 'ms';
            rowIndex++;
        }
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
    setupCounters();

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
