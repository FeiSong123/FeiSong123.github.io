const contentDir = 'contents/';
const configFile = 'config.yml';

const markdownTargets = {
    home: 'home-md',
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
