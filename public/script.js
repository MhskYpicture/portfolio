'use strict';
const $ = (sel, ctx = document) => ctx.querySelector(sel);
const $$ = (sel, ctx = document) => [...ctx.querySelectorAll(sel)];

const cursorDot  = $('.cursor-dot');
const cursorRing = $('.cursor-ring');

if (cursorDot && cursorRing) {
    let mouseX = 0, mouseY = 0, ringX = 0, ringY = 0;
    window.addEventListener('mousemove', e => {
        mouseX = e.clientX; mouseY = e.clientY;
        cursorDot.style.left = mouseX + 'px';
        cursorDot.style.top  = mouseY + 'px';
    });
    const animateRing = () => {
        ringX += (mouseX - ringX) * 0.12;
        ringY += (mouseY - ringY) * 0.12;
        cursorRing.style.left = ringX + 'px';
        cursorRing.style.top  = ringY + 'px';
        requestAnimationFrame(animateRing);
    };
    animateRing();
}

const navbar = $('#navbar');
window.addEventListener('scroll', () => {
    if (navbar) navbar.classList.toggle('scrolled', window.scrollY > 40);
}, { passive: true });

(function initNavCircularText() {
    const root = $('#navCircularText');
    if (!root) return;

    const label = 'MHSKYDEV';
    const text = `${label} â€¢ ${label} â€¢ `;
    const letters = [...text];
    const ring = document.createElement('div');
    ring.className = 'circular-text__ring';
    ring.setAttribute('role', 'img');
    ring.setAttribute('aria-label', label);

    letters.forEach((letter, i) => {
        const angle = (360 / letters.length) * i;
        const span = document.createElement('span');
        span.className = 'circular-text__letter';
        span.style.transform = `rotate(${angle}deg)`;
        const glyph = document.createElement('span');
        glyph.textContent = letter;
        span.appendChild(glyph);
        ring.appendChild(span);
    });

    root.appendChild(ring);
})();


const navBurger  = $('#navBurger');
const mobileMenu = $('#mobileMenu');
let closeMobileMenu = () => {};
if (navBurger && mobileMenu) {
    const reducedMenu = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const layers = $$('.sm-prelayer', mobileMenu);
    const panel = $('.mobile-menu-panel', mobileMenu);
    const items = $$('.flow-item', mobileMenu);
    let open = false;
    let menuTimer = 0;
    const sheet = [...layers, panel].filter(Boolean);

    const place = (el, x) => { if (el) el.style.transform = `translateX(${x})`; };

    function setOpen(next) {
        if (next === open) return;
        open = next;
        mobileMenu.classList.toggle('open', open);
        navBurger.classList.toggle('is-open', open);
        navBurger.setAttribute('aria-expanded', String(open));
        navBurger.setAttribute('aria-label', open ? 'Fermer le menu' : 'Ouvrir le menu');
        mobileMenu.setAttribute('aria-hidden', String(!open));
        mobileMenu.inert = !open;
        document.body.classList.toggle('menu-open', open);
        clearTimeout(menuTimer);
        if (reducedMenu) {
            sheet.forEach(el => place(el, open ? '0%' : '110%'));
            return;
        }
        if (open) {
            layers.forEach((el, i) => {
                el.animate(
                    [{ transform: 'translateX(110%)' }, { transform: 'translateX(0%)' }],
                    { duration: 520, delay: i * 70, easing: 'cubic-bezier(0.16, 1, 0.3, 1)', fill: 'forwards' }
                );
            });
            panel?.animate(
                [{ transform: 'translateX(110%)' }, { transform: 'translateX(0%)' }],
                { duration: 640, delay: layers.length * 70 + 60, easing: 'cubic-bezier(0.16, 1, 0.3, 1)', fill: 'forwards' }
            );
            items.forEach((el, i) => {
                const anim = el.animate(
                    [{ transform: 'translateY(70%)', opacity: 0 }, { transform: 'none', opacity: 1 }],
                    { duration: 720, delay: 240 + i * 85, easing: 'cubic-bezier(0.16, 1, 0.3, 1)', fill: 'both' }
                );
                anim.onfinish = () => anim.cancel();
            });
        } else {
            sheet.forEach(el => {
                el.getAnimations?.().forEach(a => a.cancel());
                el.animate(
                    [{ transform: 'translateX(0%)' }, { transform: 'translateX(110%)' }],
                    { duration: 320, easing: 'cubic-bezier(0.7, 0, 0.84, 0)', fill: 'forwards' }
                );
            });
        }
    }
    closeMobileMenu = () => setOpen(false);
    sheet.forEach(el => place(el, '110%'));
    mobileMenu.inert = true;
    navBurger.addEventListener('click', () => setOpen(!open));
    $$('.mobile-link').forEach(l => l.addEventListener('click', () => setOpen(false)));
    mobileMenu.addEventListener('click', e => { if (e.target === mobileMenu) setOpen(false); });
}

/* ---- Flowing Menu (mobile) : reveal tactile du panneau marquee ---- */
$$('.flow-item').forEach(item => {
    const link = item.querySelector('.mobile-link');
    if (!link) return;
    link.addEventListener('touchstart', () => item.classList.add('flow-active'), { passive: true });
    link.addEventListener('touchend', () => setTimeout(() => item.classList.remove('flow-active'), 400));
    link.addEventListener('touchcancel', () => item.classList.remove('flow-active'));
});

/* ---- Dock (ReactBits Dock) : magnification au survol + section active ---- */
(function initDock() {
    const dock = $('#dock');
    if (!dock) return;
    const items = $$('.dock-item', dock);

    dock.addEventListener('pointermove', e => {
        const mx = e.clientX;
        items.forEach(item => {
            const r = item.getBoundingClientRect();
            const dist = Math.abs(mx - (r.left + r.width / 2));
            const influence = Math.max(0, 1 - dist / 110);
            const scale = 1 + influence * 0.55;
            const lift = influence * 10;
            item.style.transform = `translateY(${(-lift).toFixed(1)}px) scale(${scale.toFixed(3)})`;
        });
    });
    dock.addEventListener('pointerleave', () => {
        items.forEach(item => { item.style.transform = ''; });
    });

    const sections = items
        .map(it => ({ el: it, target: document.querySelector(it.getAttribute('href')) }))
        .filter(o => o.target);
    if (sections.length) {
        const obs = new IntersectionObserver(entries => {
            entries.forEach(entry => {
                if (!entry.isIntersecting) return;
                const match = sections.find(s => s.target === entry.target);
                if (!match) return;
                items.forEach(it => it.classList.remove('dock-active'));
                match.el.classList.add('dock-active');
            });
        }, { threshold: 0.5, rootMargin: '-35% 0px -35% 0px' });
        sections.forEach(s => obs.observe(s.target));
    }
})();

$$('[href^="#"]').forEach(link => {
    link.addEventListener('click', e => {
        const id = link.getAttribute('href');
        const target = $(id);
        if (target) { e.preventDefault(); window.scrollTo({ top: target.offsetTop - 70, behavior: 'smooth' }); }
    });
});
document.body.setAttribute('data-theme', 'dark');
try { localStorage.removeItem('theme'); } catch { /* ignore */ }

/* ---- Text Pressure + Shuffle (React Bits) sur le titre hero ---- */
(function initTextPressure() {
    const box = $('#textPressure');
    const title = $('#tpTitle');
    if (!box || !title) return;

    const raw = title.textContent.trim();
    const chars = [...raw];
    const CHARSET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    const SHUFFLE_COUNT = 4;
    const SHUFFLE_DUR = 420;
    const STAGGER = 28;
    const ACCENT = '#6ee7b7';
    const reducedText = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    title.textContent = '';
    title.classList.add('shuffle-parent', 'is-ready');

    const cells = chars.map((ch, i) => {
        const wrap = document.createElement('span');
        wrap.className = 'shuffle-char-wrapper tp-wrap';
        wrap.style.setProperty('--i', String(i));

        const inner = document.createElement('span');
        inner.className = 'shuffle-char-inner';

        const glyph = document.createElement('span');
        glyph.className = 'tp-char shuffle-char';
        glyph.dataset.char = ch;
        glyph.textContent = ch === ' ' ? '\u00a0' : ch;
        glyph.style.setProperty('--tp-glow', '0');

        inner.appendChild(glyph);
        wrap.appendChild(inner);
        title.appendChild(wrap);

        return {
            wrap, inner, glyph,
            text: ch === ' ' ? '\u00a0' : ch,
            isSpace: ch === ' ',
            w: 0
        };
    });

    const mouse = { x: 0, y: 0 };
    const cursor = { x: 0, y: 0 };
    let pressureOn = false;
    let shuffling = false;
    let pressureRaf = 0;

    const getAttr = (distance, maxDist, minVal, maxVal) => {
        const val = maxVal - Math.abs((maxVal * distance) / maxDist);
        return Math.max(minVal, val + minVal);
    };
    const centerCursor = () => {
        const r = box.getBoundingClientRect();
        mouse.x = cursor.x = r.left + r.width / 2;
        mouse.y = cursor.y = r.top + r.height / 2;
    };
    const setSize = () => {
        const w = box.getBoundingClientRect().width || 1;
        const size = Math.max(22, Math.min(w / (chars.length * 0.78), window.innerHeight * 0.11));
        title.style.fontSize = size.toFixed(2) + 'px';
        // measure widths after font-size for shuffle strips
        requestAnimationFrame(() => {
            cells.forEach(cell => {
                cell.w = Math.max(cell.glyph.getBoundingClientRect().width, 1);
                cell.wrap.style.width = cell.w + 'px';
            });
        });
    };

    const pick = fallback => {
        if (fallback === '\u00a0' || fallback === ' ') return '\u00a0';
        return CHARSET[Math.floor(Math.random() * CHARSET.length)];
    };

    const easeOutCubic = t => 1 - Math.pow(1 - t, 3);

    const shuffleOnce = () => {
        if (reducedText || shuffling) return Promise.resolve();
        shuffling = true;
        pressureOn = false;

        const jobs = cells.map((cell, i) => new Promise(resolve => {
            if (cell.isSpace) {
                cell.inner.style.transform = '';
                cell.inner.replaceChildren(cell.glyph);
                cell.glyph.textContent = '\u00a0';
                resolve();
                return;
            }

            const w = cell.w || cell.glyph.getBoundingClientRect().width || 12;
            cell.wrap.style.width = w + 'px';
            cell.wrap.style.overflow = 'hidden';

            const mids = [];
            for (let k = 0; k < SHUFFLE_COUNT; k++) {
                const node = document.createElement('span');
                node.className = 'shuffle-char shuffle-mid';
                node.textContent = pick(cell.text);
                node.style.color = ACCENT;
                node.style.width = w + 'px';
                mids.push(node);
            }
            const head = cell.glyph.cloneNode(true);
            head.className = 'shuffle-char';
            head.style.width = w + 'px';
            cell.glyph.style.width = w + 'px';

            // strip: [orig, mid..., head] slides from -span → 0 (direction right)
            cell.inner.replaceChildren(cell.glyph, ...mids, head);
            const span = (SHUFFLE_COUNT + 1) * w;
            const from = -span;
            const to = 0;
            cell.inner.style.display = 'inline-flex';
            cell.inner.style.willChange = 'transform';
            cell.inner.style.transform = `translate3d(${from}px,0,0)`;

            const delay = (i % 2 === 1 ? Math.floor(i / 2) * STAGGER : (Math.floor(cells.length / 2) * STAGGER * 0.7) + (i / 2) * STAGGER);
            const startAt = performance.now() + delay;

            const tick = now => {
                if (now < startAt) {
                    requestAnimationFrame(tick);
                    return;
                }
                const t = Math.min(1, (now - startAt) / SHUFFLE_DUR);
                const x = from + (to - from) * easeOutCubic(t);
                cell.inner.style.transform = `translate3d(${x.toFixed(2)}px,0,0)`;
                if (t < 1) {
                    requestAnimationFrame(tick);
                    return;
                }
                cell.inner.replaceChildren(cell.glyph);
                cell.glyph.textContent = cell.text;
                cell.glyph.style.width = '';
                cell.glyph.style.color = '';
                cell.inner.style.transform = '';
                cell.inner.style.display = '';
                cell.wrap.style.overflow = '';
                resolve();
            };
            requestAnimationFrame(tick);
        }));

        return Promise.all(jobs).then(() => {
            shuffling = false;
            pressureOn = true;
        });
    };

    centerCursor();
    setSize();
    document.fonts?.ready?.then(setSize).catch(() => {});

    let resizeT = 0;
    window.addEventListener('resize', () => {
        clearTimeout(resizeT);
        resizeT = setTimeout(() => { setSize(); centerCursor(); }, 80);
    });
    window.addEventListener('mousemove', e => { cursor.x = e.clientX; cursor.y = e.clientY; });
    window.addEventListener('touchmove', e => {
        const t = e.touches[0];
        if (!t) return;
        cursor.x = t.clientX;
        cursor.y = t.clientY;
    }, { passive: true });

    const pressureFrame = () => {
        pressureRaf = requestAnimationFrame(pressureFrame);
        if (!pressureOn || shuffling) return;
        mouse.x += (cursor.x - mouse.x) / 15;
        mouse.y += (cursor.y - mouse.y) / 15;
        const tr = title.getBoundingClientRect();
        const maxDist = Math.max(tr.width / 2, 1);
        for (const cell of cells) {
            const span = cell.glyph;
            const r = span.getBoundingClientRect();
            if (!r.width) continue;
            const d = Math.hypot(mouse.x - (r.x + r.width / 2), mouse.y - (r.y + r.height / 2));
            const wdth = getAttr(d, maxDist, 5, 200);
            const wght = getAttr(d, maxDist, 100, 900);
            const glow = Math.max(0, 1 - d / (maxDist * 0.85));
            const sx = 0.82 + ((wdth - 5) / 200) * 0.48;
            const sy = 0.96 + ((wght - 100) / 1000) * 0.14;
            span.style.transform = `scale(${sx.toFixed(3)}, ${sy.toFixed(3)})`;
            span.style.setProperty('--tp-glow', glow.toFixed(3));
        }
    };
    pressureRaf = requestAnimationFrame(pressureFrame);

    // Shuffle on load, then enable pressure; reshuffle on hover
    if (reducedText) {
        pressureOn = true;
    } else {
        const boot = () => shuffleOnce();
        if (document.fonts?.ready) document.fonts.ready.then(() => requestAnimationFrame(boot));
        else requestAnimationFrame(boot);
        box.addEventListener('pointerenter', () => {
            if (!shuffling) shuffleOnce();
        });
    }
})();

const typedEl = $('#typedText');
if (typedEl) {
    const phrases = [
        'MOBILE PHOTOGRAPHER',
        'WEB DEVELOPER',
        'VIDEO EDITOR',
        'BASED IN SENEGAL',
    ];
    let phraseIdx = 0, charIdx = 0, deleting = false;
    const TYPE_SPEED = 60, DELETE_SPEED = 30, PAUSE = 2000;
    function typeLoop() {
        const current = phrases[phraseIdx];
        if (!deleting) {
            typedEl.textContent = current.slice(0, ++charIdx);
            if (charIdx === current.length) { deleting = true; setTimeout(typeLoop, PAUSE); return; }
        } else {
            typedEl.textContent = current.slice(0, --charIdx);
            if (charIdx === 0) { deleting = false; phraseIdx = (phraseIdx + 1) % phrases.length; }
        }
        setTimeout(typeLoop, deleting ? DELETE_SPEED : TYPE_SPEED);
    }
    setTimeout(typeLoop, 1200);
}

function animateCounter(el, target, duration = 2000) {
    let start = 0;
    const step = target / (duration / 16);
    const timer = setInterval(() => {
        start += step;
        if (start >= target) { start = target; clearInterval(timer); }
        el.textContent = Math.floor(start);
    }, 16);
}
const statsObserver = new IntersectionObserver(entries => {
    entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        $$('.stat-num').forEach(el => {
            const target = parseInt(el.dataset.target, 10);
            if (!isNaN(target)) animateCounter(el, target);
        });
        statsObserver.disconnect();
    });
}, { threshold: 0.5 });
const heroStats = $('.hero-stats');
if (heroStats) statsObserver.observe(heroStats);

(function initLineWaves() {
    const canvas = $('#lineWavesCanvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let W, H, time = 0, animId;
    function resize() { W = canvas.width = window.innerWidth; H = canvas.height = window.innerHeight; }
    resize();
    window.addEventListener('resize', resize, { passive: true });

    const waves = [
        { amp: 40, freq: 0.012, speed: 0.015, phase: 0,   opacity: 0.18, color: [110,231,183]  },
        { amp: 28, freq: 0.018, speed: 0.022, phase: 2.1, opacity: 0.12, color: [0,212,255]  },
        { amp: 55, freq: 0.008, speed: 0.010, phase: 1.0, opacity: 0.07, color: [110,231,183]  },
        { amp: 20, freq: 0.025, speed: 0.030, phase: 3.5, opacity: 0.10, color: [191,95,255] },
        { amp: 35, freq: 0.015, speed: 0.018, phase: 0.7, opacity: 0.09, color: [0,212,255]  },
    ];
    const LINE_COUNT = 6;

    function drawWave(wave, t) {
        const { amp, freq, speed, phase, opacity, color } = wave;
        const isDark = document.body.getAttribute('data-theme') !== 'light';
        const alpha = isDark ? opacity : opacity * 0.5;
        for (let l = 0; l < LINE_COUNT; l++) {
            const yOffset = (H / (LINE_COUNT + 1)) * (l + 1);
            const linePhase = phase + l * 0.6;
            ctx.beginPath();
            ctx.moveTo(0, yOffset);
            for (let x = 0; x <= W; x += 4) {
                const y = yOffset
                    + Math.sin(x * freq + t * speed + linePhase) * amp
                    + Math.sin(x * freq * 2.1 + t * speed * 1.4 + linePhase) * amp * 0.4;
                ctx.lineTo(x, y);
            }
            ctx.strokeStyle = `rgba(${color[0]},${color[1]},${color[2]},${alpha})`;
            ctx.lineWidth = 1;
            ctx.stroke();
        }
    }

    function drawDots(t) {
        const isDark = document.body.getAttribute('data-theme') !== 'light';
        const alpha = isDark ? 0.1 : 0.05;
        const cols = Math.ceil(W / 60), rows = Math.ceil(H / 60);
        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                const x = c * 60, y = r * 60;
                const pulse = 0.5 + 0.5 * Math.sin(t * 0.01 + r * 0.3 + c * 0.2);
                ctx.beginPath();
                ctx.arc(x, y, 1, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(110,231,183,${alpha * pulse})`;
                ctx.fill();
            }
        }
    }

    function render() {
        ctx.clearRect(0, 0, W, H);
        const isDark = document.body.getAttribute('data-theme') !== 'light';
        if (isDark) {
            const grad = ctx.createRadialGradient(W * 0.2, H * 0.5, 0, W * 0.2, H * 0.5, H * 0.8);
            grad.addColorStop(0, 'rgba(110,231,183,0.04)');
            grad.addColorStop(1, 'transparent');
            ctx.fillStyle = grad;
            ctx.fillRect(0, 0, W, H);
        }
        drawDots(time);
        waves.forEach(w => drawWave(w, time));
        time++;
        animId = requestAnimationFrame(render);
    }
    render();
    document.addEventListener('visibilitychange', () => {
        if (document.hidden) cancelAnimationFrame(animId);
        else render();
    });
})();

(function initHeroCodeBg() {
    const el = $('#heroCodeBg');
    if (!el) return;
    const tokens = [
        '&lt;/&gt;', 'const x =', '=&gt; {}', 'function()', 'import App',
        '01', '10', 'if (true)', 'return null', '{ ... }', '[ ]',
        'git commit', 'npm run dev', 'async fn', 'await data', 'export default',
        '&lt;div&gt;', '&lt;/div&gt;', 'SELECT *', 'class Cam', '=== null', '01101001',
        'new Image()', 'console.log', 'let frame',
    ];
    const COLS = 16;
    let colsHtml = '';
    for (let i = 0; i < COLS; i++) {
        const lineCount = 22 + Math.floor(Math.random() * 8);
        const spans = Array.from({ length: lineCount }, () => `<span>${tokens[Math.floor(Math.random() * tokens.length)]}</span>`).join('');
        const left = (i / COLS) * 100 + (Math.random() * 3 - 1.5);
        const duration = (16 + Math.random() * 16).toFixed(1);
        const delay = -(Math.random() * 24).toFixed(1);
        colsHtml += `<div class="code-col" style="left:${left.toFixed(2)}%; animation-duration:${duration}s; animation-delay:${delay}s;">${spans}</div>`;
    }
    let camHtml = '';
    const CAMS = 6;
    for (let i = 0; i < CAMS; i++) {
        const top = 8 + Math.random() * 78;
        const left = 8 + Math.random() * 86;
        const size = 16 + Math.random() * 16;
        const duration = (9 + Math.random() * 8).toFixed(1);
        const delay = -(Math.random() * 8).toFixed(1);
        camHtml += `<i class="fas fa-camera hero-cam-icon" style="top:${top.toFixed(1)}%; left:${left.toFixed(1)}%; font-size:${size.toFixed(0)}px; animation-duration:${duration}s; animation-delay:${delay}s;"></i>`;
    }
    el.innerHTML = colsHtml + camHtml;
})();

/* ============ SUPABASE ============ */
function getSupabaseClient() {
    const C = window.CONFIG || {};
    const { url, anonKey } = C.supabase || {};
    if (!url || !anonKey || !window.supabase?.createClient) return null;
    try { return window.supabase.createClient(url, anonKey); } catch { return null; }
}

async function fetchGalleryPhotos() {
    const C = window.CONFIG || {};
    const client = getSupabaseClient();
    if (client) {
        try {
            const { data, error } = await client
                .from(C.supabase?.table || 'photos')
                .select('*')
                .eq('published', true)
                .order('sort_order', { ascending: true });
            if (!error && data?.length) {
                const mapped = data.map(r => {
                    let src = r.image_url || '';
                    if (src && !src.startsWith('http')) {
                        const bucket = C.supabase?.bucket || 'photos';
                        src = `${C.supabase.url}/storage/v1/object/public/${bucket}/${src}`;
                    }
                    return {
                        src,
                        title: r.title || 'MHSKYPICS',
                        note: r.note || '',
                        category: r.category || '',
                        style: r.style || 'auto',
                        frameColor: r.frame_color || '#6ee7b7',
                    };
                }).filter(p => !!p.src);
                if (mapped.length) return mapped;
            }
        } catch (e) { console.warn('Supabase photos:', e); }
    }
    // Fallback: photos locales (config.js) sinon gÃ©nÃ©riques
    if (Array.isArray(C.photos) && C.photos.length) {
        return C.photos.map(p => ({
            src: p.src,
            title: p.title || 'MHSKYPICS',
            note: p.note || '',
            category: p.category || '',
            style: p.style || 'auto',
            frameColor: p.frameColor || '#6ee7b7',
        }));
    }
    return Array.from({ length: 16 }, (_, i) => ({
        src: `photos/photo${i + 1}.jpg`,
        title: `SHOT ${String(i + 1).padStart(3, '0')}`,
        note: '',
        category: '',
    }));
}

async function fetchProjects() {
    const client = getSupabaseClient();
    if (client) {
        try {
            const { data, error } = await client
                .from('projects')
                .select('*')
                .eq('published', true)
                .order('sort_order', { ascending: true });
            if (!error && data?.length) {
                return data.map(r => {
                    let image = r.image_url || '';
                    if (image && !image.startsWith('http')) {
                        const bucket = window.CONFIG?.supabase?.bucket || 'photos';
                        image = `${window.CONFIG.supabase.url}/storage/v1/object/public/${bucket}/${image}`;
                    }
                    return {
                        title: r.title || '',
                        subtitle: r.subtitle || '',
                        category: r.category || 'WEB APP',
                        description: r.description || '',
                        url: r.url || '',
                        image,
                    };
                });
            }
        } catch (e) { console.warn('Supabase projects:', e); }
    }
    // Fallback: projets locaux
    return [
        { title: 'Radio Thilogne', subtitle: 'Salnduu Fouta', category: 'WEB APP', description: '88.3 FM â€” Full website for a Senegalese radio station. Custom audio player, live stream, visualizer.', url: 'https://radiosalndufouta.com' },
        { title: 'Kane Motors', subtitle: 'Import automobile', category: 'WEB APP', description: 'Site vitrine â€” sourcing Canada, livraison Dakar. Parcours client clair et rapide.', url: 'https://kane-motors.com/' },
        { title: 'Le Noble', subtitle: 'Coran', category: 'WEB APP', description: 'Application web de lecture du Coran â€” navigation par sourates, interface Ã©purÃ©e.', url: 'https://noorcoranfree.netlify.app/' },
        { title: 'CALCULE', subtitle: 'TA MOYENNE', category: 'WEB APP', description: 'Calcule ta moyenne semestrielle en quelques secondes. Propre. Rapide. Fiable.', url: 'https://calculetamoyenne.netlify.app/' },
    ];
}

/* ============ MORPH SLIDER (ReactBits) â€” visionneuse WebGL ============
   Transition "melt" entre les photos : le pixel se dissout via un bruit fbm,
   avec aberration chromatique. Fallback <img> si WebGL indisponible. */
const morphViewer = (() => {
    const viewer  = $('#morphViewer');
    const stage   = $('#mvStage');
    const dotsEl  = $('#mvDots');
    const caption = $('#mvCaption');
    if (!viewer || !stage) return { open() {}, setItems() {} };

    const VERT = `
attribute vec2 position;
attribute vec2 uv;
varying vec2 vUv;
void main() {
    vUv = uv;
    gl_Position = vec4(position, 0.0, 1.0);
}`;

    const FRAG = `
precision highp float;

uniform sampler2D tCurrent;
uniform sampler2D tNext;
uniform vec2 uResolution;
uniform vec2 uCurrentSize;
uniform vec2 uNextSize;
uniform float uProgress;
uniform float uDir;
uniform int uMode;
uniform float uIntensity;
uniform float uScale;
uniform float uAberration;
uniform float uDrift;
uniform float uTime;
uniform float uReduce;
uniform vec2 uPointer;
uniform vec3 uOverlay;

varying vec2 vUv;

const float PI = 3.14159265359;

float hash11(float p) {
    p = fract(p * 0.1031);
    p *= p + 33.33;
    p *= p + p;
    return fract(p);
}

float hash21(vec2 p) {
    vec3 p3 = fract(vec3(p.xyx) * 0.1031);
    p3 += dot(p3, p3.yzx + 33.33);
    return fract((p3.x + p3.y) * p3.z);
}

float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    float a = hash21(i);
    float b = hash21(i + vec2(1.0, 0.0));
    float c = hash21(i + vec2(0.0, 1.0));
    float d = hash21(i + vec2(1.0, 1.0));
    return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}

float fbm(vec2 p) {
    float v = 0.0;
    float a = 0.5;
    for (int i = 0; i < 5; i++) {
        v += a * noise(p);
        p *= 2.0;
        a *= 0.5;
    }
    return v;
}

mat2 rot(float a) {
    float s = sin(a);
    float c = cos(a);
    return mat2(c, -s, s, c);
}

vec2 coverUV(vec2 uv, vec2 res, vec2 img) {
    float rA = res.x / max(res.y, 1.0);
    float iA = img.x / max(img.y, 1.0);
    vec2 s = vec2(1.0);
    float ratio = rA / max(iA, 0.0001);
    if (ratio > 1.0) {
        s.y = 1.0 / ratio;
    } else {
        s.x = ratio;
    }
    return (uv - 0.5) * s + 0.5;
}

void main() {
    float p = clamp(uProgress, 0.0, 1.0);
    float env = sin(p * PI);

    vec2 uv = vUv;

    uv += vec2(sin(uTime * 0.25 + uv.y * 4.0), cos(uTime * 0.22 + uv.x * 4.0)) * uDrift * 0.008;
    uv = (uv - 0.5) * (1.0 - uDrift * 0.02 * sin(uTime * 0.4)) + 0.5;

    vec2 uvC = uv;
    vec2 uvN = uv;
    float m = smoothstep(0.0, 1.0, p);

    if (uReduce < 0.5) {
        if (uMode == 3) {
            vec2 c = uv - 0.5;
            float r = length(c);
            float ang = env * uIntensity * 3.5 * (1.0 - r);
            uvC = rot(ang) * c + 0.5;
            uvN = rot(-ang) * c + 0.5;
            m = smoothstep(0.0, 1.0, p);
        } else if (uMode == 1) {
            float d = distance(uv, uPointer);
            float ring = p * 1.6;
            float wave = sin((d - ring) * 30.0) * env;
            vec2 dir = normalize(uv - uPointer + 1e-4);
            vec2 disp = dir * wave * uIntensity * 0.25;
            uvC = uv + disp;
            uvN = uv + disp * 0.6;
            m = 1.0 - smoothstep(ring - 0.03, ring + 0.03, d);
        } else if (uMode == 2) {
            float slices = 14.0;
            float row = floor(uv.y * slices);
            float rnd = hash11(row);
            vec2 disp = vec2((rnd - 0.5) * env * uIntensity * 0.6, 0.0);
            uvC = uv + disp;
            uvN = uv + disp;
            float localX = uDir > 0.0 ? uv.x : 1.0 - uv.x;
            float th = p * 1.5 - 0.25 + (rnd - 0.5) * 0.25;
            m = 1.0 - smoothstep(th - 0.06, th + 0.06, localX);
        } else {
            float nn = fbm(uv * uScale + uTime * 0.03);
            float warp = fbm(uv * uScale * 1.7 - uTime * 0.02);
            vec2 g = vec2(nn, warp) - 0.5;
            uvC = uv + g * uIntensity * 0.5 * p;
            uvN = uv - g * uIntensity * 0.5 * (1.0 - p);
            m = smoothstep(nn - 0.15, nn + 0.15, p);
        }
    }

    vec2 sC = coverUV(uvC, uResolution, uCurrentSize);
    vec2 sN = coverUV(uvN, uResolution, uNextSize);

    float ca = uReduce < 0.5 ? uAberration * env * 0.03 : 0.0;

    vec3 colC = vec3(
        texture2D(tCurrent, sC + vec2(ca, 0.0)).r,
        texture2D(tCurrent, sC).g,
        texture2D(tCurrent, sC - vec2(ca, 0.0)).b
    );
    vec3 colN = vec3(
        texture2D(tNext, sN + vec2(ca, 0.0)).r,
        texture2D(tNext, sN).g,
        texture2D(tNext, sN - vec2(ca, 0.0)).b
    );

    vec3 col = mix(colC, colN, m);

    float vig = smoothstep(1.25, 0.25, length(uv - 0.5));
    col = mix(col, uOverlay, (1.0 - vig) * 0.28);

    gl_FragColor = vec4(col, 1.0);
}`;

    const OPTS = { mode: 0, intensity: 0.55, scale: 2.4, aberration: 0.35, drift: 0.4, duration: 1.1 };
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    let items = [];
    let current = 0, nextIdx = 0, dir = 1;
    let engine = null, engineFailed = false;
    let fallbackImg = null;
    let animating = false;
    let rafId = null;
    const progress = { v: 0 };
    const textures = [];

    function buildEngine() {
        const canvas = document.createElement('canvas');
        canvas.className = 'mv-canvas';
        const gl = canvas.getContext('webgl', { antialias: true }) || canvas.getContext('experimental-webgl');
        if (!gl) return null;

        function compile(type, src) {
            const sh = gl.createShader(type);
            gl.shaderSource(sh, src);
            gl.compileShader(sh);
            if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
                console.warn('Morph shader:', gl.getShaderInfoLog(sh));
                return null;
            }
            return sh;
        }
        const vs = compile(gl.VERTEX_SHADER, VERT);
        const fs = compile(gl.FRAGMENT_SHADER, FRAG);
        if (!vs || !fs) return null;
        const prog = gl.createProgram();
        gl.attachShader(prog, vs);
        gl.attachShader(prog, fs);
        gl.linkProgram(prog);
        if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return null;
        gl.useProgram(prog);

        // Triangle plein Ã©cran (x, y, u, v)
        const buf = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, buf);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
            -1, -1, 0, 0,
             3, -1, 2, 0,
            -1,  3, 0, 2,
        ]), gl.STATIC_DRAW);
        const aPos = gl.getAttribLocation(prog, 'position');
        const aUv  = gl.getAttribLocation(prog, 'uv');
        gl.enableVertexAttribArray(aPos);
        gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 16, 0);
        gl.enableVertexAttribArray(aUv);
        gl.vertexAttribPointer(aUv, 2, gl.FLOAT, false, 16, 8);

        const U = {};
        ['tCurrent', 'tNext', 'uResolution', 'uCurrentSize', 'uNextSize', 'uProgress', 'uDir', 'uMode',
         'uIntensity', 'uScale', 'uAberration', 'uDrift', 'uTime', 'uReduce', 'uPointer', 'uOverlay'
        ].forEach(n => { U[n] = gl.getUniformLocation(prog, n); });

        gl.uniform1i(U.uMode, OPTS.mode);
        gl.uniform1f(U.uIntensity, OPTS.intensity);
        gl.uniform1f(U.uScale, OPTS.scale);
        gl.uniform1f(U.uAberration, OPTS.aberration);
        gl.uniform1f(U.uDrift, OPTS.drift);
        gl.uniform1f(U.uReduce, reduced ? 1 : 0);
        gl.uniform2f(U.uPointer, 0.5, 0.5);
        gl.uniform3f(U.uOverlay, 0.01, 0.03, 0.05);

        function makeTexture(image) {
            const tex = gl.createTexture();
            gl.bindTexture(gl.TEXTURE_2D, tex);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
            if (image) {
                gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
                gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
            } else {
                gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE,
                    new Uint8Array([12, 14, 20, 255]));
            }
            return tex;
        }

        return { canvas, gl, U, makeTexture };
    }

    function ensureTexture(i) {
        if (!engine || textures[i]) return;
        textures[i] = { tex: engine.makeTexture(null), size: [1, 1] };
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
            try {
                textures[i].tex = engine.makeTexture(img);
                textures[i].size = [img.naturalWidth || 1, img.naturalHeight || 1];
            } catch (e) { console.warn('Morph texture:', e); }
        };
        img.src = items[i].src;
    }

    function resize() {
        if (!engine) return;
        const r = stage.getBoundingClientRect();
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        engine.canvas.width  = Math.max(1, Math.round(r.width * dpr));
        engine.canvas.height = Math.max(1, Math.round(r.height * dpr));
        engine.gl.viewport(0, 0, engine.canvas.width, engine.canvas.height);
        engine.gl.uniform2f(engine.U.uResolution, engine.canvas.width, engine.canvas.height);
    }
    window.addEventListener('resize', () => { if (viewer.classList.contains('open')) resize(); });

    function loop(t) {
        const { gl, U } = engine;
        gl.uniform1f(U.uTime, t * 0.001);
        gl.uniform1f(U.uProgress, progress.v);
        gl.uniform1f(U.uDir, dir);
        const cur = textures[current];
        const nxt = textures[nextIdx] || cur;
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, cur.tex);
        gl.uniform1i(U.tCurrent, 0);
        gl.activeTexture(gl.TEXTURE1);
        gl.bindTexture(gl.TEXTURE_2D, nxt.tex);
        gl.uniform1i(U.tNext, 1);
        gl.uniform2fv(U.uCurrentSize, cur.size);
        gl.uniform2fv(U.uNextSize, nxt.size);
        gl.drawArrays(gl.TRIANGLES, 0, 3);
        rafId = requestAnimationFrame(loop);
    }

    function tweenProgress(to, duration, done) {
        const from = progress.v;
        const start = performance.now();
        animating = true;
        (function step(now) {
            const t = Math.min(1, (now - start) / (duration * 1000));
            const e = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
            progress.v = from + (to - from) * e;
            if (t < 1) requestAnimationFrame(step);
            else { animating = false; if (done) done(); }
        })(start);
    }

    function updateUi(idx = current) {
        if (caption) {
            const it = items[idx] || {};
            caption.innerHTML =
                `${it.category ? `<span class="mv-cat">${it.category}</span>` : ''}` +
                `<span class="mv-title">${it.title || 'MHSKYPICSÂ©'}</span>` +
                `${it.note ? `<span class="mv-note">${it.note}</span>` : ''}`;
        }
        if (dotsEl) $$('.mv-dot', dotsEl).forEach((d, i) => d.classList.toggle('active', i === idx));
    }

    function goTo(d) {
        if (animating || items.length < 2) return;
        if (!engine) {
            current = (current + d + items.length) % items.length;
            if (fallbackImg) fallbackImg.src = items[current].src;
            updateUi();
            return;
        }
        dir = d;
        nextIdx = (current + d + items.length) % items.length;
        ensureTexture(nextIdx);
        progress.v = 0;
        updateUi(nextIdx);
        tweenProgress(1, reduced ? 0.4 : OPTS.duration, () => {
            current = nextIdx;
            progress.v = 0;
        });
    }

    function open(idx) {
        if (!items.length) return;
        current = ((idx % items.length) + items.length) % items.length;
        nextIdx = current;
        progress.v = 0;

        if (!engine && !engineFailed && !fallbackImg) {
            engine = buildEngine();
            if (engine) stage.prepend(engine.canvas);
            else {
                engineFailed = true;
                fallbackImg = document.createElement('img');
                fallbackImg.className = 'mv-fallback';
                fallbackImg.alt = '';
                stage.prepend(fallbackImg);
            }
        }
        if (engine) {
            items.forEach((_, i) => ensureTexture(i));
            resize();
            if (!rafId) rafId = requestAnimationFrame(loop);
        } else if (fallbackImg) {
            fallbackImg.src = items[current].src;
        }
        viewer.classList.add('open');
        document.body.style.overflow = 'hidden';
        updateUi();
    }

    function close() {
        viewer.classList.remove('open');
        document.body.style.overflow = '';
        if (rafId) { cancelAnimationFrame(rafId); rafId = null; }
    }

    /* ---- Drag / swipe : la transition suit le doigt (comme l'original) ---- */
    let dragActive = false, dragStartX = 0, dragW = 1, dragDir = 0, dragMovedX = 0;
    stage.addEventListener('pointerdown', e => {
        if (animating || items.length < 2 || !engine) return;
        dragActive = true;
        dragDir = 0;
        dragMovedX = 0;
        dragStartX = e.clientX;
        const r = stage.getBoundingClientRect();
        dragW = r.width || 1;
        engine.gl.uniform2f(engine.U.uPointer, (e.clientX - r.left) / r.width, 1 - (e.clientY - r.top) / r.height);
        try { stage.setPointerCapture(e.pointerId); } catch { }
    });
    stage.addEventListener('pointermove', e => {
        if (!dragActive) return;
        const ndx = (e.clientX - dragStartX) / dragW;
        dragMovedX = Math.abs(e.clientX - dragStartX);
        const d = ndx < 0 ? 1 : -1;
        if (dragMovedX < 4) return;
        if (d !== dragDir) {
            dragDir = d;
            dir = d;
            nextIdx = (current + d + items.length) % items.length;
            ensureTexture(nextIdx);
        }
        progress.v = Math.min(Math.abs(ndx), 1);
        updateUi(progress.v > 0.5 ? nextIdx : current);
    });
    function endDrag() {
        if (!dragActive) return;
        dragActive = false;
        if (!dragDir) return;
        const target = nextIdx;
        if (progress.v > 0.4) {
            updateUi(target);
            tweenProgress(1, 0.5, () => { current = target; progress.v = 0; });
        } else {
            updateUi(current);
            tweenProgress(0, 0.4, () => { nextIdx = current; });
        }
        dragDir = 0;
    }
    stage.addEventListener('pointerup', endDrag);
    stage.addEventListener('pointercancel', endDrag);

    $('#mvClose')?.addEventListener('click', close);
    $('#mvPrev')?.addEventListener('click', () => goTo(-1));
    $('#mvNext')?.addEventListener('click', () => goTo(1));
    viewer.addEventListener('click', e => { if (e.target === viewer) close(); });
    document.addEventListener('keydown', e => {
        if (!viewer.classList.contains('open')) return;
        if (e.key === 'ArrowLeft')  goTo(-1);
        if (e.key === 'ArrowRight') goTo(1);
        if (e.key === 'Escape')     close();
    });

    function setItems(list) {
        items = list;
        if (dotsEl) {
            dotsEl.innerHTML = items.map((_, i) =>
                `<button type="button" class="mv-dot${i === 0 ? ' active' : ''}" aria-label="Photo ${i + 1}"></button>`).join('');
            $$('.mv-dot', dotsEl).forEach((d, i) => {
                d.addEventListener('click', () => {
                    if (i === current || animating) return;
                    if (engine) {
                        dir = i > current ? 1 : -1;
                        nextIdx = i;
                        ensureTexture(i);
                        progress.v = 0;
                        updateUi(i);
                        tweenProgress(1, reduced ? 0.4 : OPTS.duration, () => {
                            current = i;
                            progress.v = 0;
                        });
                    } else {
                        current = i;
                        if (fallbackImg) fallbackImg.src = items[i].src;
                        updateUi();
                    }
                });
            });
        }
    }

    return { open, setItems };
})();

/* ============ DOME GALLERY (spin 3D, formats mixtes + effet chroma au survol) ============ */
async function initDomeGallery() {
    const stage  = $('#domeGallery');
    const sphere = $('#domeSphere');
    if (!stage || !sphere) return;

    const photos = await fetchGalleryPhotos();
    morphViewer.setItems(photos);

    const count = photos.length;
    // Grille latitude/longitude â€” plusieurs rangÃ©es lÃ©gÃ¨rement inclinÃ©es = effet "dÃ´me"
    const rows = count <= 6 ? 2 : (count <= 12 ? 3 : 4);
    const cols = Math.max(Math.ceil(count / rows), 3);
    // Plus d'Ã©cart vertical entre rangÃ©es pour laisser les cartes respirer
    const maxPhi = (rows <= 2 ? 20 : (rows === 3 ? 26 : 32)) * 1.5;
    const baseW = 210;
    const baseH = Math.round(baseW * 1.18);
    // Rayon â€” calculÃ© sur la largeur MAX que peut atteindre une carte une fois son
    // ratio d'origine appliquÃ© (jusqu'Ã  1.85, cf. plus bas), sinon les vignettes
    // les plus larges (paysage) dÃ©bordent sur leurs voisines et se chevauchent.
    // Au moins 3 colonnes dans le calcul pour Ã©viter tan() aberrant.
    const maxCardW = Math.sqrt(baseW * baseH * 1.85);
    const radius = Math.round((maxCardW / 2) / Math.tan(Math.PI / Math.max(cols, 3))) + 220;
    const HUES = [150, 190, 45, 330, 270, 5, 205];

    const STYLE_CYCLE = ['scotch', 'pellicule', 'polaroid', 'cadre'];
    sphere.innerHTML = photos.map((p, i) => {
        const row = Math.floor(i / cols);
        const col = i % cols;
        const theta = (col * (360 / cols)) + (row % 2 ? (180 / cols) : 0);
        const phi = rows > 1 ? (-maxPhi + row * (2 * maxPhi / (rows - 1))) : 0;
        const effStyle = (!p.style || p.style === 'auto') ? STYLE_CYCLE[i % STYLE_CYCLE.length] : p.style;
        const frameVar = effStyle === 'cadre' ? ` --frame-color:${p.frameColor || '#6ee7b7'};` : '';
        const hue = HUES[i % HUES.length];
        return `
        <div class="dome-item style-${effStyle}" data-index="${i}" data-theta="${theta.toFixed(2)}" data-phi="${phi.toFixed(2)}"
             style="width:${baseW}px; height:${baseH}px; --hue:${hue};${frameVar}">
            ${p.category ? `<span class="dome-cat">${p.category}</span>` : ''}
            <img src="${p.src}" alt="${p.title}" loading="lazy" decoding="async" crossorigin="anonymous" draggable="false">
            <span class="dome-label">${p.title}${p.note ? ` Â· <em>${p.note}</em>` : ''}</span>
        </div>`;
    }).join('');

    // Chaque vignette garde son ratio d'origine (9:16, 16:9...) â€” pas de crop forcÃ©,
    // seule l'aire visuelle est Ã©quilibrÃ©e entre portrait et paysage.
    $$('.dome-item', sphere).forEach(el => {
        const img = el.querySelector('img');
        const apply = () => {
            if (!img.naturalWidth || !img.naturalHeight) return;
            let ratio = img.naturalWidth / img.naturalHeight;
            ratio = Math.max(0.55, Math.min(1.85, ratio));
            const area = baseW * baseH;
            el.style.width  = Math.round(Math.sqrt(area * ratio)) + 'px';
            el.style.height = Math.round(Math.sqrt(area / ratio)) + 'px';
        };
        if (img.complete) apply(); else img.addEventListener('load', apply, { once: true });
    });

    const items = $$('.dome-item', sphere).map(el => ({
        el,
        theta: parseFloat(el.dataset.theta),
        phi: parseFloat(el.dataset.phi),
    }));

    let rotY = 0, rotX = -6;
    let rotYTarget = 0, rotXTarget = -6;
    let velY = 0;
    let dragging = false;
    let lastX = 0, lastY = 0, lastT = 0;
    let moved = 0;
    let lastFrame = performance.now();
    const AUTO_SPEED = 0.045;
    const MAX_ROT_X = maxPhi + 16;

    function applyDepth() {
        for (const { el, theta, phi } of items) {
            let effTheta = (rotY + theta) % 360;
            if (effTheta > 180) effTheta -= 360;
            if (effTheta < -180) effTheta += 360;
            const effPhi = phi + rotX;
            const angDist = Math.sqrt(effTheta * effTheta + effPhi * effPhi * 1.5);
            const norm = Math.max(0, 1 - angDist / 135);
            const scale = 0.66 + norm * 0.42;
            const opacity = 0.12 + norm * 0.88;
            el.style.transform =
                `translate(-50%, -50%) rotateY(${theta}deg) rotateX(${phi}deg) translateZ(${radius}px) scale(${scale.toFixed(3)})`;
            el.style.opacity = opacity.toFixed(3);
            el.style.zIndex = String(Math.round(norm * 1000));
        }
    }

    function render(now) {
        const dt = Math.min(Math.max((now - lastFrame) / 16.6667, 0.001), 3);
        lastFrame = now;
        if (!dragging) {
            rotYTarget += (velY + AUTO_SPEED) * dt;
            const decay = Math.pow(0.94, dt);
            velY *= decay;
            if (Math.abs(velY) < 0.0015) velY = 0;
        }
        const lerp = dragging ? Math.min(0.5 * dt, 1) : Math.min(0.14 * dt, 1);
        rotY += (rotYTarget - rotY) * lerp;
        rotX += (rotXTarget - rotX) * lerp;
        sphere.style.transform = `rotateX(${rotX}deg) rotateY(${rotY}deg)`;
        applyDepth();
        requestAnimationFrame(render);
    }
    requestAnimationFrame(render);

    stage.addEventListener('pointerdown', e => {
        dragging = true;
        rotYTarget = rotY;
        rotXTarget = rotX;
        velY = 0;
        lastX = e.clientX; lastY = e.clientY;
        lastT = performance.now();
        moved = 0;
        stage.classList.add('dragging');
        stage.setPointerCapture(e.pointerId);
    });
    stage.addEventListener('pointermove', e => {
        if (!dragging) { updateChroma(e); return; }
        const now = performance.now();
        const dx = e.clientX - lastX;
        const dy = e.clientY - lastY;
        const dtMs = Math.max(now - lastT, 1);
        lastX = e.clientX; lastY = e.clientY; lastT = now;
        moved += Math.abs(dx) + Math.abs(dy);
        rotYTarget += dx * 0.28;
        rotXTarget = Math.max(-MAX_ROT_X, Math.min(MAX_ROT_X, rotXTarget - dy * 0.22));
        velY = (dx / dtMs) * 14;
    });
    const endDrag = () => { dragging = false; stage.classList.remove('dragging'); };
    stage.addEventListener('pointerup', endDrag);
    stage.addEventListener('pointercancel', endDrag);
    stage.addEventListener('pointerleave', () => {
        if (dragging) endDrag();
        items.forEach(({ el }) => el.style.setProperty('--chroma', 0));
    });

    sphere.addEventListener('click', e => {
        if (moved > 8) return; // c'Ã©tait un drag, pas un clic
        const item = e.target.closest('.dome-item');
        if (item) morphViewer.open(Number(item.dataset.index));
    });

    /* ---- Effet "chroma" â€” halo couleur qui suit le curseur (ReactBits Chroma Grid) ---- */
    let chromaRaf = null;
    function updateChroma(e) {
        if (chromaRaf) return;
        chromaRaf = requestAnimationFrame(() => {
            chromaRaf = null;
            const mx = e.clientX, my = e.clientY;
            for (const { el } of items) {
                const r = el.getBoundingClientRect();
                if (!r.width) continue;
                const dist = Math.hypot(mx - (r.left + r.width / 2), my - (r.top + r.height / 2));
                el.style.setProperty('--chroma', Math.max(0, 1 - dist / 260).toFixed(3));
            }
        });
    }
}
initDomeGallery();

/* ============ CARD SWAP (Projets) ============ */
async function initCardSwap() {
    const container = $('#cardSwap');
    if (!container) return;

    const projects = await fetchProjects();
    const HUES = [150, 45, 200, 330, 270, 0];
    const OFFSET_X = 34, OFFSET_Y = 26, OFFSET_Z = 90;
    const SWAP_DELAY = 4000;
    const VISIBLE = Math.min(projects.length, 4);

    container.innerHTML = projects.slice(0, 6).map((p, i) => `
        <article class="swap-card${p.image ? ' has-cover' : ''}" data-idx="${i}" style="--hue: ${HUES[i % HUES.length]}">
            ${p.image ? `<div class="swap-card-cover"><img src="${p.image}" alt="${p.title}" loading="lazy" draggable="false"></div>` : ''}
            <div class="project-tags">
                <span class="tag">${p.category}</span>
                <span class="tag featured-tag">FEATURED</span>
            </div>
            <h3 class="project-name">${p.title}${p.subtitle ? `<br><span>${p.subtitle}</span>` : ''}</h3>
            <p class="project-desc">${p.description}</p>
            ${p.url ? `<a href="${p.url}" target="_blank" rel="noopener" class="project-link"><span>VIEW PROJECT</span><i class="fas fa-external-link-alt"></i></a>` : ''}
        </article>
    `).join('');

    const dotsWrap = $('#swapDots');
    const cards = $$('.swap-card', container);
    if (dotsWrap) {
        dotsWrap.innerHTML = cards.map((_, i) => `<span class="swap-dot${i === 0 ? ' active' : ''}"></span>`).join('');
    }
    const dots = $$('.swap-dot');

    let order = cards.map((_, i) => i);
    let paused = false;
    let dragPaused = false;
    let dragState = null;
    let dragMoved = 0;

    function applyPositions() {
        order.forEach((cardIdx, pos) => {
            const card = cards[cardIdx];
            const depth = Math.min(pos, VISIBLE - 1);
            card.style.transform =
                `translate(-50%, -50%) translateX(${depth * OFFSET_X}px) translateY(${-depth * OFFSET_Y}px) translateZ(${-depth * OFFSET_Z}px) skewY(3deg)`;
            card.style.zIndex = String(100 - pos);
            card.style.opacity = pos < VISIBLE ? '1' : '0';
            card.style.pointerEvents = pos === 0 ? 'auto' : 'none';
        });
        dots.forEach((d, i) => d.classList.toggle('active', i === order[0]));
    }
    applyPositions();

    function goNext() {
        if (dragPaused || cards.length < 2) return;
        const front = cards[order[0]];
        front.classList.add('swap-leaving');
        front.style.transform = 'translate(-50%, -50%) translateY(420px) translateZ(60px) skewY(3deg)';
        front.style.opacity = '0';
        setTimeout(() => {
            order.push(order.shift());
            front.classList.remove('swap-leaving');
            applyPositions();
        }, 520);
    }
    function goPrev() {
        if (dragPaused || cards.length < 2) return;
        const incoming = cards[order[order.length - 1]];
        incoming.classList.add('swap-entering');
        incoming.style.transform = 'translate(-50%, -50%) translateY(-380px) translateZ(-160px) skewY(3deg)';
        incoming.style.opacity = '0';
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                order.unshift(order.pop());
                applyPositions();
                setTimeout(() => incoming.classList.remove('swap-entering'), 640);
            });
        });
    }
    function swap() {
        if (paused) return;
        goNext();
    }
    setInterval(swap, SWAP_DELAY);

    container.addEventListener('mouseenter', () => { paused = true; });
    container.addEventListener('mouseleave', () => { paused = false; });

    const swapPrevBtn = $('#swapPrev');
    const swapNextBtn = $('#swapNext');
    swapPrevBtn?.addEventListener('click', () => { goPrev(); paused = true; setTimeout(() => { paused = false; }, 3000); });
    swapNextBtn?.addEventListener('click', () => { goNext(); paused = true; setTimeout(() => { paused = false; }, 3000); });

    /* ---- Drag / swipe manuel (souris + tactile) ---- */
    container.addEventListener('pointerdown', e => {
        const card = e.target.closest('.swap-card');
        if (!card || cards[order[0]] !== card || e.target.closest('a') || cards.length < 2) return;
        const next = cards[order[1]] || null;
        dragState = { card, next, startX: e.clientX, startY: e.clientY, dx: 0, dy: 0, pointerId: e.pointerId };
        dragMoved = 0;
        dragPaused = true;
        card.classList.add('is-dragging');
        if (next) next.style.transition = 'none';
        card.setPointerCapture(e.pointerId);
    });

    container.addEventListener('pointermove', e => {
        if (!dragState || e.pointerId !== dragState.pointerId) return;
        dragState.dx = e.clientX - dragState.startX;
        dragState.dy = e.clientY - dragState.startY;
        dragMoved = Math.max(dragMoved, Math.abs(dragState.dx));
        const { card, next, dx, dy } = dragState;
        const rot = Math.max(-16, Math.min(16, dx / 14));
        card.style.transform = `translate(-50%, -50%) translate(${dx}px, ${(dy * 0.35).toFixed(1)}px) rotate(${rot.toFixed(2)}deg) skewY(3deg)`;
        if (next) {
            const progress = Math.min(Math.abs(dx) / 140, 1);
            const nx = OFFSET_X * (1 - progress);
            const ny = -OFFSET_Y * (1 - progress);
            const nz = -OFFSET_Z * (1 - progress);
            next.style.transform = `translate(-50%, -50%) translateX(${nx.toFixed(1)}px) translateY(${ny.toFixed(1)}px) translateZ(${nz.toFixed(1)}px) skewY(3deg)`;
        }
    });

    function endDragCard(e) {
        if (!dragState || (e && e.pointerId !== dragState.pointerId)) return;
        const { card, next, dx, dy } = dragState;
        const THRESHOLD = 90;
        card.classList.remove('is-dragging');
        if (Math.abs(dx) > THRESHOLD && cards.length > 1) {
            const goingNext = dx < 0;
            const flyX = goingNext ? -window.innerWidth : window.innerWidth;
            card.style.transition = 'transform 0.42s cubic-bezier(.4,0,.2,1), opacity 0.42s';
            card.style.transform = `translate(-50%, -50%) translate(${flyX}px, ${(dy * 0.6).toFixed(1)}px) rotate(${goingNext ? -20 : 20}deg) skewY(3deg)`;
            card.style.opacity = '0';
            if (next) {
                next.style.transition = 'transform 0.42s cubic-bezier(.4,0,.2,1)';
                next.style.transform = 'translate(-50%, -50%) skewY(3deg)';
            }
            setTimeout(() => {
                if (goingNext) order.push(order.shift());
                else order.unshift(order.pop());
                card.style.transition = '';
                card.style.opacity = '';
                if (next) next.style.transition = '';
                applyPositions();
            }, 430);
        } else {
            card.style.transition = 'transform 0.5s cubic-bezier(.34,1.56,.64,1)';
            if (next) next.style.transition = 'transform 0.5s cubic-bezier(.34,1.56,.64,1)';
            applyPositions();
            setTimeout(() => {
                card.style.transition = '';
                if (next) next.style.transition = '';
            }, 520);
        }
        dragState = null;
        setTimeout(() => { dragPaused = false; }, 60);
    }
    container.addEventListener('pointerup', endDragCard);
    container.addEventListener('pointercancel', endDragCard);

    container.addEventListener('click', e => {
        const card = e.target.closest('.swap-card');
        if (!card || e.target.closest('a')) return;
        if (dragMoved > 6) { dragMoved = 0; return; }
        const p = projects[Number(card.dataset.idx)];
        if (p?.url) window.open(p.url, '_blank', 'noopener');
    });
}
initCardSwap();

/* ============ PROFILE CARD (About) ============ */
(function initProfileCard() {
    const card   = $('#profileCard');
    const inside = card?.querySelector('.pc-inside');
    if (!card || !inside) return;

    card.addEventListener('pointermove', e => {
        const rect = card.getBoundingClientRect();
        const px = (e.clientX - rect.left) / rect.width;
        const py = (e.clientY - rect.top) / rect.height;
        const rx = (0.5 - py) * 16;
        const ry = (px - 0.5) * 16;
        card.classList.remove('pc-idle');
        inside.style.transform = `rotateX(${rx.toFixed(2)}deg) rotateY(${ry.toFixed(2)}deg)`;
        inside.style.setProperty('--pc-x', `${(px * 100).toFixed(1)}%`);
        inside.style.setProperty('--pc-y', `${(py * 100).toFixed(1)}%`);
    });
    card.addEventListener('pointerleave', () => {
        card.classList.add('pc-idle');
        inside.style.transform = 'rotateX(0deg) rotateY(0deg)';
    });
})();

const skillObserver = new IntersectionObserver(entries => {
    entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        $$('.skill-fill').forEach(bar => { bar.style.width = bar.style.getPropertyValue('--pct') || '0%'; });
        skillObserver.disconnect();
    });
}, { threshold: 0.3 });
const skillsGrid = $('.skills-grid');
if (skillsGrid) skillObserver.observe(skillsGrid);
const revealObserver = new IntersectionObserver(entries => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add('visible');
            revealObserver.unobserve(entry.target);
        }
    });
}, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });

document.addEventListener('DOMContentLoaded', () => {
    const selectors = ['.section-header', '.project-card', '.shop-card', '.about-layout', '.contact-card', '.stat-card'];
    selectors.forEach(sel => {
        $$(sel).forEach((el, i) => {
            el.classList.add('reveal');
            el.style.transitionDelay = `${i * 0.08}s`;
            revealObserver.observe(el);
        });
    });
});
$$('.shop-card').forEach(card => {
    const hue = card.dataset.hue || '150';
    card.style.setProperty('--hue', hue);
    card.querySelector('.shop-glow-ring')?.style.setProperty('--hue', hue);
});

$$('[data-tilt]').forEach(card => {
    card.addEventListener('mousemove', e => {
        const rect = card.getBoundingClientRect();
        const x = (e.clientX - rect.left) / rect.width  - 0.5;
        const y = (e.clientY - rect.top)  / rect.height - 0.5;
        card.style.transform = `translateY(-6px) rotateY(${x * 8}deg) rotateX(${-y * 8}deg)`;
        card.style.transition = 'transform 0.1s ease';
    });
    card.addEventListener('mouseleave', () => {
        card.style.transform = '';
        card.style.transition = 'transform 0.4s ease';
    });
});

(function initContactSlider() {
    const slides    = $('#contactSlides');
    const dots      = $$('.slider-dot');
    const prevBtn   = $('#sliderPrev');
    const nextBtn   = $('#sliderNext');
    if (!slides) return;

    let current = 0;
    const total = 3;
    let autoTimer;

    function goTo(idx) {
        current = ((idx % total) + total) % total;
        slides.style.transform = `translateX(-${current * (100 / total)}%)`;
        dots.forEach((d, i) => d.classList.toggle('active', i === current));
    }

    function autoAdvance() {
        autoTimer = setInterval(() => {
            const phase = $('#slideSend')?.dataset.phase;
            if (phase === 'pending' || phase === 'done') return;
            if ($('#messageForm')?.contains(document.activeElement)) return;
            goTo(current + 1);
        }, 4500);
    }
    function resetAuto() {
        clearInterval(autoTimer);
        autoAdvance();
    }

    if (prevBtn) prevBtn.addEventListener('click', () => { goTo(current - 1); resetAuto(); });
    if (nextBtn) nextBtn.addEventListener('click', () => { goTo(current + 1); resetAuto(); });
    dots.forEach(dot => {
        dot.addEventListener('click', () => { goTo(parseInt(dot.dataset.slide)); resetAuto(); });
    });

    let touchStartX = 0;
    slides.addEventListener('touchstart', e => { touchStartX = e.touches[0].clientX; }, { passive: true });
    slides.addEventListener('touchend', e => {
        if (e.target.closest('.slide-commit, input, textarea, label')) return;
        const diff = touchStartX - e.changedTouches[0].clientX;
        if (Math.abs(diff) > 40) { goTo(current + (diff > 0 ? 1 : -1)); resetAuto(); }
    });

    autoAdvance();
})();

/* ============ TEXT LOOP (ReactBits) â€” texte qui dÃ©file sur une vague ============ */
(function initTextLoop() {
    const bar     = $('#textLoopBar');
    const pathEl  = $('#textLoopPath');
    const measure = $('#tlMeasure');
    const head    = $('#tlHead');
    const tail    = $('#tlTail');
    if (!bar || !pathEl || !measure || !head || !tail) return;

    const SPEED = 90; // px/s le long du chemin
    let length = 0;

    function setup() {
        try {
            length = pathEl.getTotalLength();
            const unit = measure.textContent;
            const unitW = measure.getComputedTextLength();
            const reps = unitW > 0 ? Math.max(1, Math.ceil(length / unitW) + 1) : 1;
            head.textContent = unit.repeat(reps);
            tail.textContent = unit.repeat(reps);
        } catch { }
    }
    setup();
    if (document.fonts?.ready) document.fonts.ready.then(setup).catch(() => {});

    let paused = false;
    bar.addEventListener('pointerenter', () => { paused = true; });
    bar.addEventListener('pointerleave', () => { paused = false; });

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let offset = 0, last = null;
    function frame(ts) {
        if (last === null) last = ts;
        const dt = Math.min(0.05, (ts - last) / 1000);
        last = ts;
        if (!paused && !reduced && length > 0) {
            offset = (offset + SPEED * dt) % length;
            // deux copies dÃ©calÃ©es d'une longueur de chemin = boucle sans couture
            head.setAttribute('startOffset', String(offset));
            tail.setAttribute('startOffset', String(offset - length));
        }
        requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
})();
document.addEventListener('keydown', e => {
    const mv = $('#morphViewer');
    if (mv?.classList.contains('open')) return;
    if (e.key === 'Escape') {
        if (mobileMenu?.classList.contains('open')) { closeMobileMenu(); return; }
        if (document.querySelector('.folder-root[data-open]')) return;
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
});

window.addEventListener('error', e => console.error('JS Error:', e.error));

document.addEventListener('DOMContentLoaded', () => {
    console.log('%c', 'color:#6ee7b7;font-size:14px;font-weight:bold;text-shadow:0 0 10px #6ee7b7');
});

/* ============ SIDE RAYS ============ */
(function initSideRays() {
    const container = $('#sideRays');
    if (!container) return;
    const canvas = document.createElement('canvas');
    container.appendChild(canvas);
    const gl = canvas.getContext('webgl', { alpha: true, antialias: false, premultipliedAlpha: false });
    if (!gl) return;

    const hex = h => {
        const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(h);
        return m ? [parseInt(m[1], 16) / 255, parseInt(m[2], 16) / 255, parseInt(m[3], 16) / 255] : [1, 1, 1];
    };
    const vertSrc = `attribute vec2 position; void main(){ gl_Position = vec4(position, 0.0, 1.0); }`;
    const fragSrc = `precision highp float;
uniform float iTime; uniform vec2 iResolution; uniform float iSpeed;
uniform vec3 iRayColor1; uniform vec3 iRayColor2;
uniform float iIntensity; uniform float iSpread; uniform float iFlipX; uniform float iFlipY;
uniform float iTilt; uniform float iSaturation; uniform float iBlend; uniform float iFalloff; uniform float iOpacity;
float rayStrength(vec2 raySource, vec2 rayRefDirection, vec2 coord, float seedA, float seedB, float speed) {
  vec2 sourceToCoord = coord - raySource;
  float cosAngle = dot(normalize(sourceToCoord), rayRefDirection);
  return clamp((0.45 + 0.15 * sin(cosAngle * seedA + iTime * speed)) + (0.3 + 0.2 * cos(-cosAngle * seedB + iTime * speed)), 0.0, 1.0)
    * clamp((iResolution.x - length(sourceToCoord)) / iResolution.x, 0.5, 1.0);
}
void main() {
  vec2 fragCoord = gl_FragCoord.xy;
  if (iFlipX > 0.5) fragCoord.x = iResolution.x - fragCoord.x;
  if (iFlipY > 0.5) fragCoord.y = iResolution.y - fragCoord.y;
  vec2 coord = vec2(fragCoord.x, iResolution.y - fragCoord.y);
  vec2 rayPos = vec2(iResolution.x * 1.1, -0.5 * iResolution.y);
  float tiltRad = iTilt * 3.14159265 / 180.0;
  float cs = cos(tiltRad); float sn = sin(tiltRad);
  vec2 rel = coord - rayPos;
  vec2 tiltedCoord = vec2(rel.x * cs - rel.y * sn, rel.x * sn + rel.y * cs) + rayPos;
  float halfSpread = iSpread * 0.275;
  vec2 rayRefDir1 = normalize(vec2(cos(0.785398 + halfSpread), sin(0.785398 + halfSpread)));
  vec2 rayRefDir2 = normalize(vec2(cos(0.785398 - halfSpread), sin(0.785398 - halfSpread)));
  vec4 rays1 = vec4(iRayColor1, 1.0) * rayStrength(rayPos, rayRefDir1, tiltedCoord, 36.2214, 21.11349, iSpeed);
  vec4 rays2 = vec4(iRayColor2, 1.0) * rayStrength(rayPos, rayRefDir2, tiltedCoord, 22.3991, 18.0234, iSpeed * 0.2);
  vec4 color = rays1 * (1.0 - iBlend) * 0.9 + rays2 * iBlend * 0.9;
  float distanceToLight = length(fragCoord.xy - vec2(rayPos.x, iResolution.y - rayPos.y)) / iResolution.y;
  float brightness = iIntensity * 0.4 / pow(max(distanceToLight, 0.001), iFalloff);
  color.rgb *= brightness;
  float gray = dot(color.rgb, vec3(0.299, 0.587, 0.114));
  color.rgb = mix(vec3(gray), color.rgb, iSaturation);
  color.a = max(color.r, max(color.g, color.b)) * iOpacity;
  gl_FragColor = color;
}`;
    const compile = (type, src) => {
        const sh = gl.createShader(type);
        gl.shaderSource(sh, src);
        gl.compileShader(sh);
        if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
            console.warn(gl.getShaderInfoLog(sh));
            return null;
        }
        return sh;
    };
    const vs = compile(gl.VERTEX_SHADER, vertSrc);
    const fs = compile(gl.FRAGMENT_SHADER, fragSrc);
    if (!vs || !fs) return;
    const prog = gl.createProgram();
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.linkProgram(prog);
    gl.useProgram(prog);
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(prog, 'position');
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    const U = {};
    ['iTime', 'iResolution', 'iSpeed', 'iRayColor1', 'iRayColor2', 'iIntensity', 'iSpread', 'iFlipX', 'iFlipY', 'iTilt', 'iSaturation', 'iBlend', 'iFalloff', 'iOpacity']
        .forEach(n => { U[n] = gl.getUniformLocation(prog, n); });
    const c1 = hex('#262626');
    const c2 = hex('#00fffd');
    gl.uniform1f(U.iSpeed, 2.5);
    gl.uniform3f(U.iRayColor1, c1[0], c1[1], c1[2]);
    gl.uniform3f(U.iRayColor2, c2[0], c2[1], c2[2]);
    gl.uniform1f(U.iIntensity, 2);
    gl.uniform1f(U.iSpread, 2);
    gl.uniform1f(U.iFlipX, 0);
    gl.uniform1f(U.iFlipY, 0);
    gl.uniform1f(U.iTilt, 0);
    gl.uniform1f(U.iSaturation, 1.5);
    gl.uniform1f(U.iBlend, 0.75);
    gl.uniform1f(U.iFalloff, 1.6);
    gl.uniform1f(U.iOpacity, 1);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    let visible = true;
    let raf = 0;
    const resize = () => {
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        const w = container.clientWidth || 1;
        const h = container.clientHeight || 1;
        canvas.width = Math.max(1, Math.round(w * dpr));
        canvas.height = Math.max(1, Math.round(h * dpr));
        gl.viewport(0, 0, canvas.width, canvas.height);
        gl.uniform2f(U.iResolution, canvas.width, canvas.height);
    };
    const loop = t => {
        if (!visible) { raf = 0; return; }
        gl.uniform1f(U.iTime, t * 0.001);
        gl.drawArrays(gl.TRIANGLES, 0, 3);
        raf = requestAnimationFrame(loop);
    };
    const start = () => { if (!raf && visible) raf = requestAnimationFrame(loop); };
    resize();
    window.addEventListener('resize', resize, { passive: true });
    const io = new IntersectionObserver(entries => {
        visible = entries[0].isIntersecting;
        if (visible) start();
    }, { threshold: 0.05 });
    io.observe(container);
    start();
})();

/* ============ HOLD BUTTON â€” VIEW WORK ============ */
(function initViewWork() {
    const button = $('#viewWork');
    if (!button) return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const holdTime = reduced ? 280 : 1100;
    const releaseTime = 200;
    const HIT_PAD = 10;
    let phase = 'idle';
    let pointerId = null;
    let keyHeld = false;
    let raf = 0;
    let p = 0;
    const motion = { from: 0, to: 0, start: 0, dur: 0 };

    const goGallery = () => {
        const target = $('#gallery');
        if (target) window.scrollTo({ top: target.offsetTop - 70, behavior: reduced ? 'auto' : 'smooth' });
    };
    const paint = value => {
        p = value;
        button.style.setProperty('--hb-p', value.toFixed(4));
    };
    const setPhase = next => {
        phase = next;
        button.dataset.phase = next;
    };
    const drive = (to, duration, ease) => {
        cancelAnimationFrame(raf);
        motion.from = p;
        motion.to = to;
        motion.start = performance.now();
        motion.dur = duration;
        const step = now => {
            const t = duration > 0 ? Math.min(1, (now - motion.start) / duration) : 1;
            paint(motion.from + (motion.to - motion.from) * ease(t));
            if (t < 1) { raf = requestAnimationFrame(step); return; }
            raf = 0;
            if (motion.to === 1 && phase === 'holding') finish();
        };
        raf = requestAnimationFrame(step);
    };
    const easeOut = t => 1 - Math.pow(1 - t, 3);
    const finish = () => {
        if (phase !== 'holding') return;
        setPhase('done');
        goGallery();
        setTimeout(() => {
            setPhase('idle');
            drive(0, releaseTime, easeOut);
        }, 700);
    };
    const begin = (input = 'pointer') => {
        if (phase !== 'idle') return false;
        setPhase('holding');
        button.dataset.input = input;
        drive(1, holdTime, t => t);
        return true;
    };
    // Relâche trop tôt → annule, ne va PAS à la galerie
    const cancelHold = () => {
        if (phase !== 'holding') return;
        setPhase('idle');
        drive(0, releaseTime, easeOut);
    };
    const measure = () => {
        button.style.setProperty('--hb-w', button.offsetWidth + 'px');
        button.style.setProperty('--hb-h', button.offsetHeight + 'px');
        button.style.setProperty('--hb-hold', holdTime + 'ms');
        button.style.setProperty('--hb-cycles', String(holdTime / 1100));
    };
    measure();
    new ResizeObserver(measure).observe(button);

    button.addEventListener('pointerdown', e => {
        if (e.button !== 0 || pointerId !== null) return;
        if (!begin('pointer')) return;
        pointerId = e.pointerId;
        button._rect = button.getBoundingClientRect();
        try { button.setPointerCapture(e.pointerId); } catch { /* ignore */ }
    });
    const end = (e) => {
        if (e.pointerId !== pointerId) return;
        pointerId = null;
        cancelHold();
    };
    button.addEventListener('pointermove', e => {
        if (e.pointerId !== pointerId || !button._rect) return;
        const r = button._rect;
        const out = e.clientX < r.left - HIT_PAD || e.clientX > r.right + HIT_PAD || e.clientY < r.top - HIT_PAD || e.clientY > r.bottom + HIT_PAD;
        if (out) end(e);
    });
    button.addEventListener('pointerup', end);
    button.addEventListener('pointercancel', end);
    button.addEventListener('keydown', e => {
        if (e.key !== 'Enter' && e.key !== ' ') return;
        e.preventDefault();
        if (e.repeat || keyHeld) return;
        keyHeld = true;
        begin('keyboard');
    });
    button.addEventListener('keyup', e => {
        if (e.key !== 'Enter' && e.key !== ' ') return;
        keyHeld = false;
        cancelHold();
    });
    button.addEventListener('blur', () => {
        keyHeld = false;
        if (pointerId === null) cancelHold();
    });
    button.addEventListener('contextmenu', e => e.preventDefault());
    button.addEventListener('click', e => e.preventDefault());
})();

/* ============ SLIDE COMMIT â€” envoi du message ============ */
(function initMessageSend() {
    const root = $('#slideSend');
    const form = $('#messageForm');
    const status = $('#messageStatus');
    if (!root || !form) return;
    const track = $('.slide-commit__track', root);
    const capsule = $('.slide-commit__capsule', root);
    const label = $('.slide-commit__label', root);
    const arrow = $('.slide-commit__arrow', root);
    const spin = $('.slide-commit__spin', root);
    const done = $('.slide-commit__done', root);
    const content = $('.slide-commit__content', root);
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const PAD = 4;
    let phase = 'idle';
    let x = 0;
    let grip = null;
    let raf = 0;

    const metrics = () => {
        const width = root.clientWidth || 280;
        const height = root.clientHeight || 56;
        const GRIP = height - PAD * 2;
        const INNER = width - PAD * 2;
        const TRAVEL = Math.max(1, INNER - GRIP);
        const gripR = Math.max(0, Math.min(height / 2, 28) - PAD);
        return { GRIP, INNER, TRAVEL, gripR };
    };
    const paint = () => {
        const m = metrics();
        const v = Math.min(m.TRAVEL, Math.max(0, x));
        const edge = v + m.GRIP;
        if (capsule) {
            capsule.style.clipPath = `inset(0 ${Math.max(0, m.INNER - edge)}px 0 0 round ${m.gripR}px)`;
            capsule.style.transformOrigin = `${v}px 50%`;
            capsule.setAttribute('aria-valuenow', String(Math.round((v / m.TRAVEL) * 100)));
        }
        if (content) content.style.transform = `translateX(${(v + edge) / 2 - m.INNER / 2}px)`;
        if (label) label.style.opacity = String(Math.min(1, Math.max(0, 1 - v / (m.TRAVEL * 0.55))));
        if (arrow) arrow.style.opacity = phase === 'pending' ? '0' : String(Math.min(1, Math.max(0, 1 - Math.max(0, v - m.TRAVEL * 0.55) / (m.TRAVEL * 0.4))));
        if (spin) spin.style.opacity = phase === 'pending' ? '1' : '0';
        if (done) done.style.opacity = phase === 'done' ? '1' : '0';
    };
    const setPhase = next => {
        phase = next;
        root.dataset.phase = next;
        if (capsule) capsule.setAttribute('aria-busy', next === 'pending' ? 'true' : 'false');
    };
    const springTo = (target) => new Promise(resolve => {
        if (reduced) { x = target; paint(); resolve(); return; }
        cancelAnimationFrame(raf);
        let v = 0;
        let last = performance.now();
        const step = now => {
            const dt = Math.min(0.032, (now - last) / 1000);
            last = now;
            v += (-380 * (x - target) - 26 * v) * dt;
            x += v * dt;
            paint();
            if (Math.abs(x - target) < 0.5 && Math.abs(v) < 12) { x = target; paint(); resolve(); }
            else raf = requestAnimationFrame(step);
        };
        raf = requestAnimationFrame(step);
    });
    const say = (text, isError) => {
        if (!status) return;
        status.textContent = text || '';
        status.classList.toggle('is-error', Boolean(isError));
    };
    const readForm = () => {
        const name = $('#msgName')?.value.trim() || '';
        const email = $('#msgEmail')?.value.trim() || '';
        const body = $('#msgBody')?.value.trim() || '';
        if (name.length < 1 || body.length < 1) {
            const err = new Error('Ajoute ton nom et un message.');
            err.code = 'invalid';
            throw err;
        }
        if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            const err = new Error('Cet email ne semble pas valide.');
            err.code = 'invalid';
            throw err;
        }
        return { name, email, body };
    };
    const send = async payload => {
        const cfg = window.CONFIG?.supabase || {};
        if (!cfg.url || !cfg.anonKey) throw new Error('Envoi indisponible pour le moment.');
        const res = await fetch(`${cfg.url}/rest/v1/messages`, {
            method: 'POST',
            headers: {
                apikey: cfg.anonKey,
                Authorization: `Bearer ${cfg.anonKey}`,
                'Content-Type': 'application/json',
                Prefer: 'return=minimal',
            },
            body: JSON.stringify({
                name: payload.name,
                email: payload.email || null,
                body: payload.body,
            }),
        });
        if (!res.ok) {
            let message = 'Envoi impossible.';
            try {
                const payloadErr = await res.json();
                message = payloadErr.message || payloadErr.error || message;
            } catch { /* ignore */ }
            const missing = /messages|schema cache|relation/i.test(message);
            throw new Error(missing
                ? 'La boÃ®te nâ€™est pas encore activÃ©e. Lance le SQL messages dans Supabase.'
                : message);
        }
    };
    const commit = async () => {
        const m = metrics();
        x = m.TRAVEL;
        paint();
        let payload;
        try { payload = readForm(); }
        catch (err) {
            setPhase('error');
            say(err.message, true);
            await springTo(0);
            setTimeout(() => { if (phase === 'error') setPhase('idle'); }, 1400);
            return;
        }
        setPhase('pending');
        say('Envoiâ€¦', false);
        paint();
        const t0 = performance.now();
        try {
            await send(payload);
            const wait = Math.max(0, 320 - (performance.now() - t0));
            await new Promise(r => setTimeout(r, wait));
            setPhase('done');
            say('Message envoyÃ©.', false);
            form.reset();
            paint();
            setTimeout(() => {
                springTo(0).then(() => setPhase('idle'));
            }, 1500);
        } catch (err) {
            setPhase('error');
            say(err.message || 'Envoi impossible.', true);
            await springTo(0);
            setTimeout(() => { if (phase === 'error') setPhase('idle'); }, 1600);
        }
    };
    const localX = clientX => {
        const rect = track.getBoundingClientRect();
        const width = root.clientWidth || rect.width || 1;
        return ((clientX - rect.left) / (rect.width || 1)) * width;
    };
    track.addEventListener('pointerdown', e => {
        if (phase === 'pending' || phase === 'done' || e.button > 0) return;
        grip = { id: e.pointerId, grab: null, moved: false };
        root.dataset.held = '';
        try { track.setPointerCapture(e.pointerId); } catch { /* ignore */ }
    });
    track.addEventListener('pointermove', e => {
        if (!grip || grip.id !== e.pointerId) return;
        const at = localX(e.clientX);
        if (grip.grab === null) { grip.grab = at - x; return; }
        const m = metrics();
        const next = Math.min(m.TRAVEL, Math.max(0, at - grip.grab));
        if (Math.abs(next - x) > 0.5) grip.moved = true;
        x = next;
        paint();
    });
    const up = e => {
        if (!grip || grip.id !== e.pointerId) return;
        const moved = grip.moved;
        grip = null;
        delete root.dataset.held;
        const m = metrics();
        if (x >= m.TRAVEL - 1) commit();
        else if (moved) springTo(0);
    };
    track.addEventListener('pointerup', up);
    track.addEventListener('pointercancel', up);
    capsule?.addEventListener('keydown', e => {
        const m = metrics();
        const step = m.TRAVEL / 8;
        if (e.key === 'ArrowRight' || e.key === 'End') {
            e.preventDefault();
            if (e.key === 'End' || x + step >= m.TRAVEL) { x = m.TRAVEL; paint(); commit(); }
            else { x += step; paint(); }
        } else if (e.key === 'ArrowLeft' || e.key === 'Home' || e.key === 'Escape') {
            e.preventDefault();
            springTo(0);
        }
    });
    form.addEventListener('submit', e => e.preventDefault());
    paint();
})();

/* ============ FLEX CAROUSEL ============ */
function escHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
}

async function initFlexGallery() {
    const stage = $('#flexCarousel');
    const track = $('#flexTrack');
    const caption = $('#flexCaption');
    if (!stage || !track) return;
    const photos = await fetchGalleryPhotos();
    morphViewer.setItems(photos);
    if (!photos.length) return;

    if (window.mountFlexCarousel) {
        try {
            const mounted = await window.mountFlexCarousel(stage, {
                items: photos.map(p => ({
                    src: p.src,
                    alt: p.title || 'Photo',
                    title: p.title || '',
                    subtitle: p.note || '',
                })),
                onSelect: index => morphViewer.open(index),
                onActive: index => {
                    if (!caption) return;
                    const photo = photos[index] || {};
                    const n = String(index + 1).padStart(2, '0');
                    const total = String(photos.length).padStart(2, '0');
                    caption.textContent = [photo.title, photo.note].filter(Boolean).join(' Â· ') + `   ${n} / ${total}`;
                },
            });
            if (mounted) {
                track.remove();
                stage.querySelectorAll('.flex-glass').forEach(el => el.remove());
                stage.classList.add('is-webgl');
                return;
            }
        } catch (err) {
            console.warn('Flex carousel WebGL:', err);
            stage.querySelector('canvas')?.remove();
            stage.classList.remove('is-webgl');
        }
    }

    const STYLE_CYCLE = ['scotch', 'pellicule', 'polaroid', 'cadre'];
    const build = (copy) => photos.map((p, i) => {
        const eff = (!p.style || p.style === 'auto') ? STYLE_CYCLE[i % STYLE_CYCLE.length] : p.style;
        const frame = eff === 'cadre' ? ` style="--frame-color:${escHtml(p.frameColor || '#6ee7b7')}"` : '';
        return `<button type="button" class="shot style-${escHtml(eff)}" data-index="${i}" data-copy="${copy}"${frame}>
            ${p.category ? `<span class="shot-cat">${escHtml(p.category)}</span>` : ''}
            <img src="${escHtml(p.src)}" alt="${escHtml(p.title)}" draggable="false" crossorigin="anonymous">
            <span class="shot-label">${escHtml(p.title)}${p.note ? ` Â· <em>${escHtml(p.note)}</em>` : ''}</span>
        </button>`;
    }).join('');
    track.innerHTML = build(0) + build(1) + build(2);

    const fitImages = () => {
        const h = Math.max(160, stage.clientHeight * 0.62);
        stage.style.setProperty('--shot-img', h.toFixed(0) + 'px');
        $$('.shot img', track).forEach(img => {
            const apply = () => {
                if (!img.naturalWidth || !img.naturalHeight) return;
                const ratio = img.naturalWidth / img.naturalHeight;
                img.style.width = Math.max(72, Math.round(h * ratio)) + 'px';
                img.style.height = h.toFixed(0) + 'px';
                measure();
            };
            if (img.complete) apply();
            else img.addEventListener('load', apply, { once: true });
        });
    };
    let x = 0;
    let vx = 0;
    let dragging = false;
    let moved = 0;
    let lastX = 0;
    let lastT = 0;
    let loopW = 1;
    let placed = false;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const measure = () => {
        const cards = $$('.shot', track);
        const third = Math.floor(cards.length / 3);
        if (third < 1) return;
        const a = cards[0].getBoundingClientRect();
        const b = cards[third].getBoundingClientRect();
        const next = Math.abs(b.left - a.left);
        if (next < 40) return;
        if (!placed) {
            loopW = next;
            x = -loopW;
            placed = true;
        } else if (Math.abs(next - loopW) > 2) {
            x *= next / loopW;
            loopW = next;
        }
    };

    const nearestCaption = () => {
        if (!caption) return;
        const mid = stage.getBoundingClientRect().left + stage.clientWidth / 2;
        let best = null;
        let bestD = Infinity;
        $$('.shot', track).forEach(card => {
            const r = card.getBoundingClientRect();
            const d = Math.abs(r.left + r.width / 2 - mid);
            if (d < bestD) { bestD = d; best = card; }
        });
        if (!best) return;
        const photo = photos[Number(best.dataset.index)] || {};
        caption.textContent = photo.title || '';
    };

    let raf = 0;
    const render = () => {
        if (!dragging) {
            x += vx;
            vx *= 0.94;
            if (Math.abs(vx) < 0.05) vx = 0;
            if (!reduced && Math.abs(vx) < 0.2) x -= 0.35;
        }
        if (loopW > 1) {
            while (x < -loopW * 2) x += loopW;
            while (x > -loopW * 0.15) x -= loopW;
        }
        track.style.transform = `translate3d(${x.toFixed(2)}px,0,0)`;
        nearestCaption();
        raf = requestAnimationFrame(render);
    };

    const boot = () => { measure(); fitImages(); if (!raf) render(); };
    boot();
    window.addEventListener('resize', () => { fitImages(); setTimeout(measure, 40); }, { passive: true });
    if (document.fonts?.ready) document.fonts.ready.then(() => setTimeout(measure, 30));

    stage.addEventListener('pointerdown', e => {
        dragging = true;
        moved = 0;
        vx = 0;
        lastX = e.clientX;
        lastT = performance.now();
        stage.classList.add('is-dragging');
        try { stage.setPointerCapture(e.pointerId); } catch { /* ignore */ }
    });
    stage.addEventListener('pointermove', e => {
        if (!dragging) return;
        const now = performance.now();
        const dx = e.clientX - lastX;
        const dt = Math.max(now - lastT, 1);
        lastX = e.clientX;
        lastT = now;
        moved += Math.abs(dx);
        x += dx;
        vx = dx / dt * 16;
    });
    const endDrag = () => { dragging = false; stage.classList.remove('is-dragging'); };
    stage.addEventListener('pointerup', endDrag);
    stage.addEventListener('pointercancel', endDrag);
    stage.addEventListener('click', e => {
        if (moved > 8) return;
        const card = e.target.closest('.shot');
        if (card) morphViewer.open(Number(card.dataset.index));
    });
    stage.addEventListener('keydown', e => {
        if (e.key === 'ArrowRight') { vx = -18; e.preventDefault(); }
        if (e.key === 'ArrowLeft') { vx = 18; e.preventDefault(); }
    });
}
initFlexGallery();

/* ============ FOLDER â€” projets ============ */
function initProjectFolder() {
    const mount = $('#folderMount');
    if (!mount) return;

    const TAU = Math.PI * 2;
    const STEP = 1 / 240;
    const FLAP_REST = [
        { x: 0.16, rise: 0, r: 3 },
        { x: -0.17, rise: 0.05, r: -3.5 },
        { x: 0, rise: 0.1, r: 0.5 },
        { x: 0.25, rise: 0.08, r: 5 },
        { x: -0.25, rise: 0.09, r: -5.5 },
        { x: 0.08, rise: 0.12, r: 1.5 }
    ];
    const SPREAD_TURN = [4, -5, 3, -6, 5, -3];
    const SPREAD_DROP = [0.03, -0.04, 0.05, -0.02, 0.04, -0.05];
    const FLAP = { open: -64, peek: -15, rest: 0 };
    const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
    const mix = (rgb, target, amount) => rgb.map((c, i) => Math.round(c + (target[i] - c) * amount));
    const rgbStr = rgb => `rgb(${rgb[0]}, ${rgb[1]}, ${rgb[2]})`;
    const multiply = (a, b) => {
        const out = new Array(16);
        for (let col = 0; col < 4; col++) {
            for (let row = 0; row < 4; row++) {
                out[col * 4 + row] = a[row] * b[col * 4] + a[4 + row] * b[col * 4 + 1] + a[8 + row] * b[col * 4 + 2] + a[12 + row] * b[col * 4 + 3];
            }
        }
        return out;
    };
    const chain = (...list) => list.reduce(multiply);
    const move = (x, y, z = 0) => [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, x, y, z, 1];
    const stretch = (x, y) => [x, 0, 0, 0, 0, y, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
    const turnX = deg => {
        const r = deg * Math.PI / 180, c = Math.cos(r), s = Math.sin(r);
        return [1, 0, 0, 0, 0, c, s, 0, 0, -s, c, 0, 0, 0, 0, 1];
    };
    const turnY = deg => {
        const r = deg * Math.PI / 180, c = Math.cos(r), s = Math.sin(r);
        return [c, 0, -s, 0, 0, 1, 0, 0, s, 0, c, 0, 0, 0, 0, 1];
    };
    const turnZ = deg => {
        const r = deg * Math.PI / 180, c = Math.cos(r), s = Math.sin(r);
        return [c, s, 0, 0, -s, c, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
    };
    const toCss = m => `matrix3d(${m.map(v => (Math.abs(v) < 1e-6 ? 0 : Number(v.toFixed(5)))).join(',')})`;

    const measure = scale => {
        const w = 224 * scale;
        const h = 176 * scale;
        const tabH = 20 * scale;
        const r = 12 * scale;
        const shoulder = tabH * 0.75;
        const frontTop = tabH + h * 0.3;
        const tabW = Math.min(w * 0.42, w - r * 2 - shoulder * 2 - 10 * scale);
        const tabX = w - r - 5 * scale - shoulder - tabW;
        const docW = w * 0.54;
        return { scale, w, h, tabH, r, shoulder, tabW, tabX, frontTop, frontH: tabH + h - frontTop, docW, docH: docW * 1.22 };
    };
    const backPath = g => {
        const { w, h, tabX, tabW, tabH, shoulder, r } = g;
        const top = tabH;
        const bottom = tabH + h;
        return [
            `M 0 ${top + r}`, `Q 0 ${top} ${r} ${top}`,
            `L ${tabX - shoulder} ${top}`,
            `C ${tabX} ${top} ${tabX} 0 ${tabX + shoulder} 0`,
            `L ${tabX + tabW - shoulder} 0`,
            `C ${tabX + tabW} 0 ${tabX + tabW} ${top} ${tabX + tabW + shoulder} ${top}`,
            `L ${w - r} ${top}`, `Q ${w} ${top} ${w} ${top + r}`,
            `L ${w} ${bottom - r}`, `Q ${w} ${bottom} ${w - r} ${bottom}`,
            `L ${r} ${bottom}`, `Q 0 ${bottom} 0 ${bottom - r}`, 'Z'
        ].join(' ');
    };
    const placeFlap = (rank, count, phase, g) => {
        const rest = FLAP_REST[rank] || FLAP_REST[FLAP_REST.length - 1];
        const floor = g.tabH + g.h - 5 * g.scale - g.docH / 2;
        const mid = (count - 1) / 2;
        if (phase === 'open') {
            const gap = 12 * g.scale;
            const fit = Math.min(0.94, (g.w * 2.3 - gap * (count - 1)) / (count * g.docW));
            const step = g.docW * fit + gap;
            return {
                x: g.w / 2 + (rank - mid) * step,
                y: g.tabH - g.h * 0.02 + SPREAD_DROP[rank] * g.h * 0.7,
                r: SPREAD_TURN[rank] * 0.55,
                s: fit
            };
        }
        const part = phase === 'peek' ? 1.3 : 1;
        const rise = rest.rise + (phase === 'peek' ? 0.1 : 0);
        return {
            x: g.w / 2 + rest.x * g.w * part,
            y: floor - rise * g.h,
            r: rest.r * (phase === 'peek' ? 1.6 : 1),
            s: 1
        };
    };

    const rgb = [0, 255, 214];
    const root = document.createElement('div');
    root.className = 'folder-root';
    root.dataset.mode = 'flap';
    root.dataset.variant = 'solid';
    mount.appendChild(root);

    const stage = document.createElement('div');
    stage.className = 'folder-stage';
    stage.tabIndex = 0;
    stage.setAttribute('role', 'button');
    stage.setAttribute('aria-expanded', 'false');
    stage.setAttribute('aria-label', 'Dossier des projets');
    root.appendChild(stage);

    const ground = document.createElement('span');
    ground.className = 'folder-layer folder-ground';
    const back = document.createElement('div');
    back.className = 'folder-layer folder-back';
    const fill = document.createElement('div');
    fill.className = 'folder-back-fill';
    const tab = document.createElement('span');
    tab.className = 'folder-tab-text';
    tab.textContent = 'WORK';
    back.append(fill, tab);
    const front = document.createElement('div');
    front.className = 'folder-layer folder-front';
    const face = document.createElement('div');
    face.className = 'folder-face';
    front.appendChild(face);
    stage.append(ground, back, front);

    let projects = [];
    let items = [];
    let g = measure(1);
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const state = {
        open: false,
        hovered: false,
        phase: 'rest',
        previous: 'rest',
        changedAt: performance.now(),
        front: { value: 0, velocity: 0 },
        rx: { value: 0, velocity: 0 },
        ry: { value: 0, velocity: 0 },
        pointerX: 0,
        pointerY: 0,
        raf: 0,
        last: 0
    };

    const applyMetrics = () => {
        const scale = clamp((Math.min(window.innerWidth, 980) - 80) / 640, 0.62, 1.28);
        g = measure(scale);
        const frontTopC = mix(rgb, [255, 255, 255], 0.12);
        const frontBot = mix(rgb, [0, 0, 0], 0.06);
        const insideTop = mix(rgb, [0, 0, 0], 0.08);
        const insideBot = mix(rgb, [0, 0, 0], 0.16);
        root.style.setProperty('--folder-w', g.w + 'px');
        root.style.setProperty('--folder-h', g.h + 'px');
        root.style.setProperty('--folder-tab-h', g.tabH + 'px');
        root.style.setProperty('--folder-front-h', g.frontH + 'px');
        root.style.setProperty('--folder-front-radius', g.r + 'px');
        root.style.setProperty('--folder-doc-w', g.docW + 'px');
        root.style.setProperty('--folder-doc-h', g.docH + 'px');
        root.style.setProperty('--folder-scale', String(g.scale));
        root.style.setProperty('--folder-depth', Math.round(Math.max(g.w, g.h) * 5) + 'px');
        root.style.setProperty('--folder-base', rgbStr(rgb));
        root.style.setProperty('--folder-front-top', rgbStr(frontTopC));
        root.style.setProperty('--folder-front-bottom', rgbStr(frontBot));
        root.style.setProperty('--folder-inside-top', rgbStr(insideTop));
        root.style.setProperty('--folder-inside-bottom', rgbStr(insideBot));
        root.style.setProperty('--folder-tab-ink', 'rgba(0,0,0,0.72)');
        fill.style.clipPath = `path('${backPath(g)}')`;
        tab.style.left = g.tabX + 'px';
        tab.style.width = g.tabW + 'px';
        ground.style.transform = `translateY(${g.tabH + g.h}px)`;
    };

    const spring = () => ({ value: 0, velocity: 0 });
    const integrate = (item, target, omega, zeta, dt) => {
        const k = omega * omega;
        const d = 2 * zeta * omega;
        const steps = Math.max(1, Math.ceil(dt / STEP));
        const step = dt / steps;
        for (let i = 0; i < steps; i++) {
            item.velocity += (k * (target - item.value) - d * item.velocity) * step;
            item.value += item.velocity * step;
        }
        return Math.abs(target - item.value) > 0.02 || Math.abs(item.velocity) > 0.02;
    };

    const buildItems = list => {
        $$('.folder-item', stage).forEach(n => n.remove());
        projects = list.slice(0, 6);
        items = projects.map(() => ({ x: spring(), y: spring(), r: spring(), s: spring() }));
        projects.forEach((p, index) => {
            const node = document.createElement('a');
            node.className = 'folder-layer folder-item';
            node.dataset.folderItem = String(index);
            node.href = p.url || '#projects';
            if (p.url) { node.target = '_blank'; node.rel = 'noopener'; }
            node.setAttribute('aria-label', p.title || 'Projet');
            if (p.image) {
                node.innerHTML = `<span class="folder-photo"><img src="${escHtml(p.image)}" alt=""></span>`;
            } else {
                node.innerHTML = `<span class="folder-doc"><span class="folder-doc-title">${escHtml(p.title)}</span><span class="folder-doc-text">${escHtml(p.subtitle || p.category || '')}</span></span>`;
            }
            node.addEventListener('click', e => {
                if (!state.open) { e.preventDefault(); return; }
                e.stopPropagation();
                if (!p.url) e.preventDefault();
            });
            stage.insertBefore(node, front);
            items[index].node = node;
            const start = placeFlap(index, projects.length, 'rest', g);
            items[index].x.value = start.x;
            items[index].y.value = start.y;
            items[index].r.value = start.r;
            items[index].s.value = start.s;
        });
    };

    const frame = now => {
        state.raf = 0;
        const dt = state.last ? Math.min(0.05, (now - state.last) / 1000) : 1 / 60;
        state.last = now;
        const phase = state.open ? 'open' : (state.hovered && !reduced ? 'peek' : 'rest');
        if (phase !== state.phase) {
            state.previous = state.phase;
            state.phase = phase;
            state.changedAt = now;
        }
        const zeta = reduced ? 1 : 0.712;
        const frontOmega = TAU * 2;
        const itemOmega = TAU * 2.1;
        const soft = TAU * 1.6;
        let busy = integrate(state.front, FLAP[phase], frontOmega, zeta, dt);
        busy = integrate(state.rx, state.hovered && !reduced ? -state.pointerY * 4 : 0, soft, 1, dt) || busy;
        busy = integrate(state.ry, state.hovered && !reduced ? state.pointerX * 5 : 0, soft, 1, dt) || busy;

        const pivotX = g.w / 2;
        const pivotY = g.tabH + g.h / 2;
        const desk = chain(move(pivotX, pivotY), turnX(state.rx.value), turnY(state.ry.value), move(-pivotX, -pivotY));
        back.style.transform = toCss(desk);
        const theta = state.front.value;
        const frontMatrix = chain(desk, move(0, g.tabH + g.h, 2 * g.scale), turnX(theta), move(0, -g.frontH));
        front.style.transform = toCss(frontMatrix);
        const angle = theta * Math.PI / 180;
        const light = Math.sin(angle) * 0.5 + Math.cos(angle) * 0.86;
        front.style.setProperty('--folder-dim', clamp((1 - light / 0.86) * 0.22, 0, 0.5).toFixed(3));
        tab.style.opacity = (1 - clamp((-theta - 18) / 26, 0, 1)).toFixed(3);

        const count = items.length;
        items.forEach((item, index) => {
            const target = placeFlap(index, count, phase, g);
            busy = integrate(item.x, target.x, itemOmega, zeta, dt) || busy;
            busy = integrate(item.y, target.y, itemOmega, zeta, dt) || busy;
            busy = integrate(item.r, target.r, itemOmega, zeta, dt) || busy;
            busy = integrate(item.s, target.s, itemOmega, zeta, dt) || busy;
            const matrix = chain(
                desk,
                move(item.x.value, item.y.value, 3 * g.scale + (count - index)),
                turnZ(item.r.value),
                stretch(item.s.value, item.s.value),
                move(-g.docW / 2, -g.docH / 2)
            );
            item.node.style.transform = toCss(matrix);
            item.node.style.zIndex = String(10 + count - index);
        });
        if (busy) state.raf = requestAnimationFrame(frame);
        else state.last = 0;
    };
    const wake = () => { if (!state.raf) state.raf = requestAnimationFrame(frame); };

    const setOpen = next => {
        state.open = next;
        root.toggleAttribute('data-open', next);
        stage.setAttribute('aria-expanded', next ? 'true' : 'false');
        wake();
    };

    stage.addEventListener('click', e => {
        if (e.target.closest('.folder-item') && state.open) return;
        setOpen(!state.open);
    });
    stage.addEventListener('keydown', e => {
        if (e.target !== stage) return;
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setOpen(!state.open); }
    });
    stage.addEventListener('pointermove', e => {
        const box = root.getBoundingClientRect();
        state.pointerX = clamp(((e.clientX - box.left) / box.width) * 2 - 1, -1, 1);
        state.pointerY = clamp(((e.clientY - box.top) / box.height) * 2 - 1, -1, 1);
        if (!state.hovered) state.hovered = true;
        wake();
    });
    stage.addEventListener('pointerleave', () => { state.hovered = false; wake(); });
    document.addEventListener('keydown', e => {
        if (e.key === 'Escape' && state.open) setOpen(false);
    });
    document.addEventListener('pointerdown', e => {
        if (!root.contains(e.target) && state.open) setOpen(false);
    });
    window.addEventListener('resize', () => { applyMetrics(); wake(); }, { passive: true });

    applyMetrics();
    fetchProjects().then(list => {
        buildItems(list);
        wake();
    });
}
initProjectFolder();

/* ============ BELL TOGGLE ============ */
(function initBell() {
    const slot = $('#bellSlot');
    if (!slot) return;
    const offLabel = 'Notify me';
    const onLabel = "You'll be notified";
    slot.innerHTML = `
        <span class="bell-toggle" id="bellToggle" data-on="false">
            <button type="button" class="bell-toggle__button" aria-pressed="false" aria-label="${offLabel}">
                <span class="bell-toggle__bell" aria-hidden="true">
                    <span class="bell-toggle__glyph">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M6 16.5V10a6 6 0 0 1 12 0v6.5l1.6 2.3H4.4L6 16.5z"/>
                            <path d="M12 2.5V4"/>
                            <path d="M9.2 19.2a2.8 2.8 0 0 0 5.6 0"/>
                        </svg>
                    </span>
                    <svg class="bell-toggle__wave bell-toggle__wave--left" viewBox="0 0 14 14"><path d="M14 8a6 6 0 0 0-6 6"/><path d="M14 4A10 10 0 0 0 4 14"/></svg>
                    <svg class="bell-toggle__wave bell-toggle__wave--right" viewBox="0 0 14 14"><path d="M0 8a6 6 0 0 1 6 6"/><path d="M0 4a10 10 0 0 1 10 10"/></svg>
                </span>
                <span class="bell-toggle__say" aria-hidden="true">
                    <span class="bell-toggle__face bell-toggle__face--off">${offLabel}</span>
                    <span class="bell-toggle__face bell-toggle__face--on">${onLabel}</span>
                </span>
            </button>
        </span>`;
    const root = $('#bellToggle');
    const button = $('.bell-toggle__button', root);
    const glyph = $('.bell-toggle__glyph', root);
    const offEl = $('.bell-toggle__face--off', root);
    const onEl = $('.bell-toggle__face--on', root);
    const waveL = $('.bell-toggle__wave--left', root);
    const waveR = $('.bell-toggle__wave--right', root);
    let on = false;
    let t = 0;
    let wOff = 0;
    let wOn = 0;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const measure = () => {
        wOff = offEl.offsetWidth;
        wOn = onEl.offsetWidth;
        paint(true);
    };
    const paint = jump => {
        const v = jump ? (on ? 1 : 0) : t;
        const clip = Math.max(wOff, wOn) - (wOff + (wOn - wOff) * v);
        root.style.setProperty('--bt-clip', Math.max(0, clip).toFixed(2) + 'px');
    };
    const ring = () => {
        if (reduced || !glyph) return;
        glyph.getAnimations().forEach(a => a.cancel());
        const frames = [{ transform: 'rotate(0deg)', offset: 0 }];
        const passes = 5;
        for (let k = 0; k < passes; k++) {
            const angle = 17 * Math.pow(1 - k / passes, 1) * (k % 2 ? 1 : -1);
            frames.push({ transform: `rotate(${angle.toFixed(2)}deg)`, offset: 1 - Math.pow(1 - (k + 2 / 3) / (passes + 1), 0.6) });
        }
        frames.push({ transform: 'rotate(0deg)', offset: 1 });
        glyph.animate(frames, { duration: 820, easing: 'linear' });
        for (let k = 0; k < passes; k++) {
            const side = k % 2 ? waveR : waveL;
            const strength = 1 - k / passes;
            side.animate(
                [{ opacity: 0, transform: 'scale(0.55)' }, { opacity: 0.9 * strength, offset: 0.3 }, { opacity: 0, transform: 'scale(1.25)' }],
                { duration: 380, delay: (1 - Math.pow(1 - (k + 2 / 3) / (passes + 1), 0.6)) * 820, easing: 'ease-out' }
            );
        }
    };
    let raf = 0;
    const tick = () => {
        const target = on ? 1 : 0;
        t += (target - t) * 0.22;
        if (Math.abs(target - t) < 0.01) t = target;
        paint(false);
        if (t !== target) raf = requestAnimationFrame(tick);
        else raf = 0;
    };
    button.addEventListener('pointerdown', () => { root.dataset.pressed = ''; });
    const release = () => { delete root.dataset.pressed; };
    button.addEventListener('pointerup', release);
    button.addEventListener('pointercancel', release);
    button.addEventListener('pointerleave', release);
    button.addEventListener('click', () => {
        on = !on;
        root.dataset.on = on ? 'true' : 'false';
        button.setAttribute('aria-pressed', on ? 'true' : 'false');
        button.setAttribute('aria-label', on ? onLabel : offLabel);
        if (on && !reduced) ring();
        if (!raf) raf = requestAnimationFrame(tick);
    });
    measure();
    document.fonts?.ready.then(measure);
    window.addEventListener('resize', measure, { passive: true });
})();

/* ============ SHOP SLIDE (mobile) ============ */
(function initShopSlide() {
    const grid = $('.shop-grid');
    if (!grid) return;
    const mq = window.matchMedia('(max-width: 768px)');
    let timer = 0;
    let paused = false;
    const step = () => {
        if (!mq.matches || paused) return;
        const card = grid.querySelector('.shop-card');
        if (!card) return;
        const gap = 14;
        const delta = card.getBoundingClientRect().width + gap;
        const max = grid.scrollWidth - grid.clientWidth - 8;
        const next = grid.scrollLeft + delta >= max ? 0 : grid.scrollLeft + delta;
        grid.scrollTo({ left: next, behavior: 'smooth' });
    };
    const start = () => {
        clearInterval(timer);
        if (mq.matches) timer = setInterval(step, 3400);
    };
    grid.addEventListener('pointerdown', () => { paused = true; clearInterval(timer); });
    grid.addEventListener('pointerup', () => { paused = false; start(); });
    grid.addEventListener('pointercancel', () => { paused = false; start(); });
    mq.addEventListener?.('change', start);
    start();
})();

/* ============ SHINY TEXT (React Bits) ============ */
(function initShinyText() {
    const nodes = $$('[data-shiny], .section-title .shiny-text');
    if (!nodes.length) return;

    const EASINGS = {
        linear: t => t,
        smooth: t => 0.5 - Math.cos(Math.PI * t) / 2
    };
    const FALLOFF = [0, 0.2, 0.4, 0.6, 0.8, 1];
    const clamp = (v, min, max) => Math.min(max, Math.max(min, v));
    let paint = null;

    const parseColor = value => {
        if (!paint) paint = document.createElement('canvas').getContext('2d');
        if (!paint) return null;
        paint.fillStyle = '#000000';
        paint.fillStyle = value;
        const resolved = String(paint.fillStyle);
        if (resolved.startsWith('#')) {
            return [1, 3, 5].map(i => parseInt(resolved.slice(i, i + 2), 16)).concat(1);
        }
        const parts = resolved.match(/[\d.]+/g);
        if (!parts || parts.length < 3) return null;
        return [Number(parts[0]), Number(parts[1]), Number(parts[2]), parts.length > 3 ? Number(parts[3]) : 1];
    };

    const blend = (from, to, amount) => {
        const channel = (a, b) =>
            Math.round(Math.pow(Math.pow(a / 255, 2.2) * (1 - amount) + Math.pow(b / 255, 2.2) * amount, 1 / 2.2) * 255);
        const alpha = from[3] * (1 - amount) + to[3] * amount;
        if (alpha <= 0) return 'rgba(0,0,0,0)';
        return `rgba(${channel(from[0], to[0])}, ${channel(from[1], to[1])}, ${channel(from[2], to[2])}, ${Math.round(alpha * 1000) / 1000})`;
    };

    const mount = root => {
        if (root.dataset.shinyReady) return;
        root.dataset.shinyReady = '1';

        const computedColor = getComputedStyle(root).color;
        root.classList.add('shiny-text');

        const color = root.dataset.color
            || (computedColor && !computedColor.includes('0, 0, 0, 0') && computedColor !== 'transparent' ? computedColor : '#6ee7b7');
        const shineColor = root.dataset.shine || '#ffffff';
        const speed = Math.max(0.1, Number(root.dataset.speed) || 2.2);
        const delay = Math.max(0, Number(root.dataset.delay) || 0.35);
        const angle = Number(root.dataset.angle) || 120;
        const shineWidth = clamp(Number(root.dataset.width) || 42, 2, 200);
        const softness = clamp(Number(root.dataset.softness) || 0.85, 0, 1);
        const bands = clamp(Math.round(Number(root.dataset.bands) || 1), 1, 3);
        const glow = clamp(Number(root.dataset.glow) || 0.35, 0, 1);
        const ease = EASINGS.smooth;
        const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

        let content = '';
        for (const node of root.childNodes) {
            if (node.nodeType === Node.TEXT_NODE) content += node.textContent;
        }
        if (!content.trim()) content = root.textContent;
        if (glow > 0 && !root.querySelector('.shiny-text__glow')) {
            const glowEl = document.createElement('span');
            glowEl.className = 'shiny-text__glow';
            glowEl.setAttribute('aria-hidden', 'true');
            glowEl.textContent = content.trim();
            root.appendChild(glowEl);
        }
        const glowEl = root.querySelector('.shiny-text__glow');

        const base = parseColor(color) || [110, 231, 183, 1];
        const shine = parseColor(shineColor) || [255, 255, 255, 1];
        const clear = [shine[0], shine[1], shine[2], 0];
        const extent = () => shineWidth / 2 + (bands - 1) * shineWidth * 1.3 + 2;
        const entry = () => 100 + extent();
        const exit = () => -extent();

        const gradient = (pos, fill) => {
            const half = shineWidth / 2;
            const core = half * (1 - softness);
            const fade = half - core;
            const stops = [];
            for (let band = 0; band < bands; band++) {
                const center = pos + band * shineWidth * 1.3;
                const strength = 1 - band * 0.28;
                for (const side of [-1, 1]) {
                    for (const f of FALLOFF) {
                        const at = center + side * (core + fade * (1 - f));
                        const amount = f * f * (3 - 2 * f) * strength;
                        stops.push([at, amount]);
                    }
                }
            }
            stops.sort((a, b) => a[0] - b[0]);
            const list = stops.map(([at, amount]) => `${blend(fill, shine, amount)} ${at.toFixed(2)}%`);
            return `linear-gradient(${angle}deg, ${blend(fill, shine, 0)} 0%, ${list.join(', ')}, ${blend(fill, shine, 0)} 100%)`;
        };

        let pos = null;
        let phase = 'idle';
        let from = 0;
        let to = 0;
        let start = 0;
        let duration = 1;
        let resume = 0;
        let visible = true;
        let raf = 0;
        let timer = 0;

        const draw = () => {
            if (pos === null || reduce) {
                root.style.backgroundImage = `linear-gradient(${color}, ${color})`;
                if (glowEl) glowEl.style.backgroundImage = 'none';
                return;
            }
            root.style.backgroundImage = gradient(pos, base);
            if (glowEl) {
                glowEl.style.backgroundImage = gradient(pos, clear);
                glowEl.style.opacity = String(glow);
            }
        };

        const sweep = (a, b, now) => {
            const span = Math.abs(exit() - entry()) || 1;
            phase = 'sweep';
            from = a;
            to = b;
            start = now;
            duration = speed * 1000 * Math.max(0.15, Math.abs(b - a) / span);
        };

        const wake = () => {
            if (raf) return;
            window.clearTimeout(timer);
            timer = 0;
            raf = requestAnimationFrame(tick);
        };

        const tick = now => {
            raf = 0;
            if (reduce) { draw(); return; }
            if (phase === 'sweep') {
                const t = clamp((now - start) / duration, 0, 1);
                pos = from + (to - from) * ease(t);
                draw();
                if (t < 1) { raf = requestAnimationFrame(tick); return; }
                phase = 'wait';
                resume = now + delay * 1000;
            }
            if (phase === 'wait') {
                if (!visible) return;
                if (now < resume) {
                    timer = window.setTimeout(wake, resume - now);
                    return;
                }
                sweep(entry(), exit(), now);
                raf = requestAnimationFrame(tick);
                return;
            }
            if (phase === 'idle' && visible) {
                sweep(entry(), exit(), now);
                raf = requestAnimationFrame(tick);
            }
        };

        const io = new IntersectionObserver(entries => {
            visible = entries.some(e => e.isIntersecting);
            if (visible) wake();
        });
        io.observe(root);
        draw();
        wake();
    };

    nodes.forEach(mount);
})();

