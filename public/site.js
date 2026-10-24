"use strict";

const $ = (sel, ctx = document) => ctx.querySelector(sel);

const $$ = (sel, ctx = document) => [ ...ctx.querySelectorAll(sel) ];

const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

if (!reduced) document.documentElement.classList.add("motion-ready");

const esc = value => String(value ?? "").replace(/[&<>"']/g, ch => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
}[ch]));

function splitChars(el) {
    const text = el.textContent;
    el.textContent = "";
    [ ...text ].forEach((ch, i) => {
        const span = document.createElement("span");
        span.className = "profile-character";
        span.style.setProperty("--character-index", i);
        span.textContent = ch === " " ? " " : ch;
        el.appendChild(span);
    });
}

function sloganLetters() {
    const line = $("#heroSlogan");
    if (!line) return;
    const text = line.textContent.trim();
    line.textContent = "";
    let index = 0;
    [ ...text ].forEach(ch => {
        if (ch === " ") {
            const space = document.createElement("span");
            space.className = "hero-space";
            line.appendChild(space);
            return;
        }
        const span = document.createElement("span");
        span.className = "hero-letter";
        span.style.setProperty("--letter-index", index++);
        span.textContent = ch;
        line.appendChild(span);
    });
}

function revealOnView(selector, rootMargin = "0px 0px -10% 0px") {
    const nodes = $$(selector);
    if (!nodes.length) return;
    if (reduced || !("IntersectionObserver" in window)) {
        nodes.forEach(node => node.classList.add("is-visible"));
        return;
    }
    const io = new IntersectionObserver(entries => {
        entries.forEach(entry => {
            if (!entry.isIntersecting) return;
            entry.target.classList.add("is-visible");
            io.unobserve(entry.target);
        });
    }, {
        threshold: .28,
        rootMargin: rootMargin
    });
    nodes.forEach(node => io.observe(node));
}

function getClient() {
    const cfg = window.CONFIG?.supabase || {};
    if (!cfg.url || !cfg.anonKey || !window.supabase?.createClient) return null;
    try {
        return window.supabase.createClient(cfg.url, cfg.anonKey);
    } catch {
        return null;
    }
}

async function fetchGalleryPhotos() {
    const C = window.CONFIG || {};
    const client = getClient();
    if (client) {
        try {
            const {data: data, error: error} = await client.from(C.supabase?.table || "photos").select("*").eq("published", true).order("sort_order", {
                ascending: true
            });
            if (!error && data?.length) {
                const mapped = data.map(r => {
                    let src = r.image_url || "";
                    if (src && !src.startsWith("http")) {
                        const bucket = C.supabase?.bucket || "photos";
                        src = `${C.supabase.url}/storage/v1/object/public/${bucket}/${src}`;
                    }
                    return {
                        src: src,
                        title: r.title || "MHSKYPICS",
                        note: r.note || "",
                        placement: r.placement || "gallery"
                    };
                }).filter(p => p.src);
                if (mapped.length) return mapped;
            }
        } catch (err) {
            console.warn("Supabase photos:", err);
        }
    }
    if (Array.isArray(C.photos) && C.photos.length) {
        return C.photos.map(p => ({
            src: p.src,
            title: p.title || "MHSKYPICS",
            note: p.note || "",
            placement: p.placement || "gallery"
        }));
    }
    return [];
}

async function fetchProjects() {
    const client = getClient();
    if (client) {
        try {
            const {data: data, error: error} = await client.from("projects").select("*").eq("published", true).order("sort_order", {
                ascending: true
            });
            if (!error && data?.length) {
                return data.map(r => {
                    let image = r.image_url || "";
                    if (image && !image.startsWith("http")) {
                        const bucket = window.CONFIG?.supabase?.bucket || "photos";
                        image = `${window.CONFIG.supabase.url}/storage/v1/object/public/${bucket}/${image}`;
                    }
                    const rawImages = Array.isArray(r.images) ? r.images : [];
                    const images = rawImages.map(src => {
                        let url = src || "";
                        if (url && !url.startsWith("http")) {
                            const bucket = window.CONFIG?.supabase?.bucket || "photos";
                            url = `${window.CONFIG.supabase.url}/storage/v1/object/public/${bucket}/${url}`;
                        }
                        return url;
                    }).filter(Boolean);
                    if (image && !images.includes(image)) images.unshift(image);
                    return {
                        id: r.id,
                        title: r.title || "",
                        subtitle: r.subtitle || "",
                        category: r.category || "",
                        description: r.description || "",
                        role: r.role || "",
                        type: r.type || "",
                        client: r.client || "",
                        technologies: r.technologies || [],
                        url: r.url || "",
                        completed: r.completed || "",
                        year: r.year || "",
                        image: image,
                        images: images
                    };
                });
            }
        } catch (err) {
            console.warn("Supabase projects:", err);
        }
    }
    return (window.CONFIG?.projects || []).map(p => ({
        ...p,
        image: p.image || "",
        images: Array.isArray(p.images) ? p.images : (p.image ? [p.image] : [])
    }));
}

const TONES = [ "#d8d1c7", "#e4d5c8", "#d5ddd4", "#e7dcd2", "#d9d4cc", "#e2d3c4" ];

function pixels() {
    return `<div class="work-gallery-pixels" aria-hidden="true">${Array.from({
        length: 48
    }, (_, i) => `<i style="--pixel-order:${i * 7 % 48}"></i>`).join("")}</div>`;
}

function viewButton(href, label) {
    const [a, b] = label;
    return `<a class="work-view-button" href="${esc(href)}" target="_blank" rel="noopener" aria-label="${esc(a + " " + b)}">\n        <span class="work-button-part"><span class="work-word-window"><span class="work-word-roll"><span>${esc(a)}</span><span>${esc(a)}</span></span></span></span>\n        <span class="work-button-part"><span class="work-word-window"><span class="work-word-roll"><span>${esc(b)}</span><span>${esc(b)}</span></span></span></span>\n    </a>`;
}

function mediaBlock(item, tone) {
    const images = Array.isArray(item.images) && item.images.length ? item.images : (item.image ? [item.image] : []);
    if (images.length) {
        if (images.length === 1) {
            return `<div class="work-gallery-screen"><img src="${esc(images[0])}" alt=""></div>${pixels()}`;
        }
        const slides = images.map((src, i) => `<img class="work-gallery-slide${i === 0 ? " is-active" : ""}" src="${esc(src)}" alt="" data-slide="${i}">`).join("");
        return `<div class="work-gallery-screen work-gallery-carousel" data-carousel>\n            ${slides}\n            <div class="work-gallery-dots">${images.map((_, i) => `<button type="button" class="work-gallery-dot${i === 0 ? " is-active" : ""}" data-dot="${i}" aria-label="Image ${i + 1}"></button>`).join("")}</div>\n        </div>${pixels()}`;
    }
    if (item.mediaType === "video" && item.media) {
        return `<div class="work-gallery-screen"><video autoplay muted loop playsinline><source src="${esc(item.media)}" type="video/mp4"></video></div>`;
    }
    return `<div class="work-fallback" style="--work-tone:${tone}">\n        <b>${esc(item.title)}</b>\n        <span>${esc(item.subtitle || item.category || "")}</span>\n        <em>${esc(item.year || item.completed || item.badge || "")}</em>\n    </div>`;
}

function initWorkCarousels() {
    $$("[data-carousel]").forEach(carousel => {
        const slides = $$("[data-slide]", carousel);
        const dots = $$("[data-dot]", carousel);
        if (slides.length < 2) return;
        let index = 0;
        const show = i => {
            index = (i + slides.length) % slides.length;
            slides.forEach((s, k) => s.classList.toggle("is-active", k === index));
            dots.forEach((d, k) => d.classList.toggle("is-active", k === index));
        };
        dots.forEach((dot, i) => dot.addEventListener("click", () => show(i)));
        // auto-rotate
        let timer = window.setInterval(() => show(index + 1), 3200);
        carousel.addEventListener("mouseenter", () => window.clearInterval(timer));
    });
}

function renderWorks(projects) {
    const grid = $("#worksGrid");
    const count = $("#worksCount");
    if (!grid) return;
    if (count) count.textContent = String(projects.length);
    if (!projects.length) {
        grid.innerHTML = '<p class="empty-note">Aucun projet publié.</p>';
        return;
    }
    grid.innerHTML = projects.map((project, i) => {
        const tone = TONES[i % TONES.length];
        const client = project.client && project.client !== "—" ? `Client: ${project.client}` : "";
        const tech = Array.isArray(project.technologies) ? project.technologies.filter(Boolean).join(" · ") : "";
        const media = project.url ? `<a class="work-gallery-media" style="--work-tone:${tone}" href="${esc(project.url)}" target="_blank" rel="noopener" aria-label="Open ${esc(project.title)}">${mediaBlock(project, tone)}</a>` : `<div class="work-gallery-media" style="--work-tone:${tone}">${mediaBlock(project, tone)}</div>`;
        return `<article class="work-gallery-entry">\n            <div class="work-gallery-frame">${media}</div>\n            <div class="work-gallery-copy">\n                <div class="work-gallery-title">\n                    <h3>${esc(project.title)}</h3>\n                    <p class="work-gallery-mobile-summary">${esc(project.description || "")}</p>\n                    ${project.subtitle ? `<span>${esc(project.subtitle)}</span>` : ""}\n                    ${client ? `<span class="work-gallery-client">${esc(client)}</span>` : ""}\n                </div>\n                ${project.url ? viewButton(project.url, [ "View", "Project" ]) : ""}\n                ${project.description ? `<p>${esc(project.description)}</p>` : ""}\n                ${tech ? `<p class="work-tech">${esc(tech)}</p>` : ""}\n            </div>\n        </article>`;
    }).join("");
    $$(".work-gallery-entry", grid).forEach(el => revealOnViewNode(el));
}

function renderDrops() {
    const products = window.CONFIG?.products || [];
    const grid = $("#dropsGrid");
    const count = $("#dropsCount");
    if (!grid) return;
    if (count) count.textContent = String(products.length);
    grid.innerHTML = products.map((product, i) => {
        const tone = TONES[(i + 2) % TONES.length];
        const price = typeof product.price === "number" ? `$${product.price.toFixed(2)}` : "";
        return `<article class="work-gallery-entry">\n            <div class="work-gallery-frame">\n                <a class="work-gallery-media" style="--work-tone:${tone}" href="${esc(product.url)}" target="_blank" rel="noopener" aria-label="Buy ${esc(product.name)}">\n                    ${mediaBlock({
            ...product,
            title: product.name
        }, tone)}\n                </a>\n            </div>\n            <div class="work-gallery-copy">\n                <div class="work-gallery-title">\n                    <h3>${esc(product.name)}</h3>\n                    <p class="work-gallery-mobile-summary">${esc(product.description || "")}</p>\n                    ${product.badge ? `<span>${esc(product.badge)}</span>` : ""}\n                    ${price ? `<span class="work-gallery-client">${esc(price)}</span>` : ""}\n                </div>\n                ${product.url ? viewButton(product.url, [ "Buy", "Drop" ]) : ""}\n                ${product.description ? `<p>${esc(product.description)}</p>` : ""}\n            </div>\n        </article>`;
    }).join("");
    $$(".work-gallery-entry", grid).forEach(el => revealOnViewNode(el));
}

function paintFlexCaption(photos, index) {
    const cap = $("#flexCaption");
    const live = $("#flexLive");
    const photo = photos[index];
    if (!cap || !photo) return;
    const n = String(index + 1).padStart(2, "0");
    const total = String(photos.length).padStart(2, "0");
    cap.innerHTML = `<span class="flex-carousel__title"><span>${esc(photo.title || "Photo")}</span>${photo.note ? `<span class="flex-carousel__subtitle">${esc(photo.note)}</span>` : ""}</span><span class="flex-carousel__count"><span>${n}</span><span class="flex-carousel__slash">/</span><span>${total}</span></span>`;
    if (live) live.textContent = `${photo.title || "Photo"}, ${index + 1} sur ${photos.length}`;
}

function mountShotFallback(stage, list) {
    stage.classList.add("is-fallback");
    const track = document.createElement("div");
    track.className = "shots-fallback-track";
    track.innerHTML = list.map((photo, i) => `<button type="button" class="shots-fallback-card" data-index="${i}" aria-label="Ouvrir ${esc(photo.title || "Photo")}"><img src="${esc(photo.src)}" alt="${esc(photo.title || "Photo")}" draggable="false"></button>`).join("");
    stage.appendChild(track);
    let x = 0;
    let dragging = false;
    let moved = 0;
    let lastX = 0;
    const clampX = () => {
        const min = Math.min(0, stage.clientWidth - track.scrollWidth);
        x = Math.max(min, Math.min(0, x));
        track.style.transform = `translate3d(${x}px,0,0)`;
    };
    stage.addEventListener("pointerdown", event => {
        dragging = true;
        moved = 0;
        lastX = event.clientX;
        stage.classList.add("is-dragging");
    });
    stage.addEventListener("pointermove", event => {
        if (!dragging) return;
        const dx = event.clientX - lastX;
        lastX = event.clientX;
        moved += Math.abs(dx);
        x += dx;
        clampX();
    });
    const endDrag = () => {
        dragging = false;
        stage.classList.remove("is-dragging");
    };
    stage.addEventListener("pointerup", endDrag);
    stage.addEventListener("pointercancel", endDrag);
    stage.addEventListener("click", event => {
        if (moved > 8) return;
        const card = event.target.closest("[data-index]");
        if (card) window.morphViewer?.open(Number(card.dataset.index));
    });
    paintFlexCaption(list, 0);
    stage.dataset.revealed = "true";
}

async function renderShots(photos) {
    const stage = $("#flexCarousel");
    const count = $("#shotsCount");
    const list = photos.filter(photo => photo.src && !/^photos\/photo\d+\.jpg$/i.test(photo.src));
    if (count) count.textContent = String(list.length);
    if (!stage) return;
    window.morphViewer?.setItems(list);
    if (!list.length) {
        stage.innerHTML = '<p class="empty-note">Aucune photo publiée.</p>';
        return;
    }
    if (window.mountFlexCarousel) {
        try {
            const mounted = await window.mountFlexCarousel(stage, {
                preset: "liquid",
                items: list.map(photo => ({
                    src: photo.src,
                    alt: photo.title || "Photo",
                    title: photo.title || "",
                    subtitle: photo.note || ""
                })),
                settings: {
                    intro: "rise",
                    cardHeight: .62,
                    gap: 18,
                    radius: 20,
                    fit: "natural"
                },
                onSelect: index => window.morphViewer?.open(index),
                onActive: index => paintFlexCaption(list, index),
                onReveal: () => {
                    stage.dataset.revealed = "true";
                }
            });
            if (mounted) return;
        } catch (err) {
            console.warn("Flex carousel:", err);
            stage.querySelector("canvas")?.remove();
        }
    }
    mountShotFallback(stage, list);
}

const seen = new WeakSet;

function revealOnViewNode(el) {
    if (seen.has(el)) return;
    seen.add(el);
    if (reduced || !("IntersectionObserver" in window)) {
        el.classList.add("is-visible");
        return;
    }
    const io = new IntersectionObserver(entries => {
        entries.forEach(entry => {
            if (!entry.isIntersecting) return;
            entry.target.classList.add("is-visible");
            io.disconnect();
        });
    }, {
        threshold: .22
    });
    io.observe(el);
}

function renderMarquee(projects) {
    const track = $("#brandTrack");
    if (!track) return;
    const tools = [
        { name: "F#", logo: "brand-logos/fsharp.svg" },
        { name: "SQL", logo: "brand-logos/sqlite.svg" },
        { name: "C#", logo: "brand-logos/csharp.svg" },
        { name: "CSS", logo: "brand-logos/css.svg" },
        { name: "HTML", logo: "brand-logos/html5.svg" },
        { name: "XML", logo: "brand-logos/xml.svg" },
        { name: "JavaScript", logo: "brand-logos/javascript.svg" },
        { name: "React", logo: "brand-logos/react.svg" },
        { name: "Next.js", logo: "brand-logos/nextdotjs.svg" },
        { name: "OriginKit", logo: "brand-logos/origin.svg" },
        { name: "Convex", logo: "brand-logos/convex.svg" },
        { name: "Cloudflare", logo: "brand-logos/cloudflare.svg" },
        { name: "Netlify", logo: "brand-logos/netlify.svg" },
        { name: "Ko-fi", logo: "brand-logos/kofi.svg" },
        { name: "CapCut", logo: "brand-logos/capcut.svg" },
        { name: "After Effects", logo: "brand-logos/after-effects.svg" },
        { name: "Prequel", logo: "brand-logos/prequel.svg" },
        { name: "Snapseed", logo: "brand-logos/googlephotos.svg" }
    ];
    const group = tools.map(t => `<span class="brand-card"><img src="${esc(t.logo)}" alt="" loading="lazy">${esc(t.name)}</span>`).join("");
    track.innerHTML = `<div class="brand-marquee-group">${group}</div><div class="brand-marquee-group" aria-hidden="true">${group}</div>`;
}

function initReel(projects) {
    const reel = $("#heroReel");
    if (!reel || !projects.length) return;
    let index = 0;
    const paint = i => {
        const project = projects[i % projects.length];
        const slide = document.createElement("span");
        slide.className = "project-reel-slide";
        if (project.image) {
            const img = document.createElement("img");
            img.src = project.image;
            img.alt = "";
            slide.appendChild(img);
        } else {
            slide.style.background = TONES[i % TONES.length];
            slide.style.color = "#111110";
            slide.style.display = "grid";
            slide.style.placeItems = "center";
            slide.style.font = "700 12px/1.1 Montserrat, sans-serif";
            slide.style.letterSpacing = "-.04em";
            slide.style.textAlign = "center";
            slide.style.padding = "4px";
            slide.textContent = project.title;
        }
        reel.appendChild(slide);
        while (reel.children.length > 2) reel.firstElementChild.remove();
    };
    paint(0);
    if (reduced || projects.length < 2) return;
    window.setInterval(() => {
        index = (index + 1) % projects.length;
        paint(index);
    }, 2800);
}

function initCutoutDrag() {
    $$("[data-cutout]").forEach(el => {
        let drag = null;
        el.addEventListener("pointerdown", event => {
            if (event.button > 0) return;
            const style = getComputedStyle(el);
            drag = {
                id: event.pointerId,
                x: event.clientX,
                y: event.clientY,
                ox: parseFloat(style.getPropertyValue("--shift-x")) || 0,
                oy: parseFloat(style.getPropertyValue("--shift-y")) || 0
            };
            el.classList.add("is-grabbed");
            el.setPointerCapture(event.pointerId);
        });
        el.addEventListener("pointermove", event => {
            if (!drag || drag.id !== event.pointerId) return;
            el.style.setProperty("--shift-x", `${drag.ox + event.clientX - drag.x}px`);
            el.style.setProperty("--shift-y", `${drag.oy + event.clientY - drag.y}px`);
        });
        const end = event => {
            if (!drag || drag.id !== event.pointerId) return;
            drag = null;
            el.classList.remove("is-grabbed");
            if (reduced) {
                el.style.setProperty("--shift-x", "0px");
                el.style.setProperty("--shift-y", "0px");
                return;
            }
            const ox = parseFloat(getComputedStyle(el).getPropertyValue("--shift-x")) || 0;
            const oy = parseFloat(getComputedStyle(el).getPropertyValue("--shift-y")) || 0;
            const start = performance.now();
            const step = now => {
                const t = Math.min(1, (now - start) / 520);
                const e = 1 - Math.pow(1 - t, 3);
                el.style.setProperty("--shift-x", `${ox * (1 - e)}px`);
                el.style.setProperty("--shift-y", `${oy * (1 - e)}px`);
                if (t < 1) requestAnimationFrame(step);
            };
            requestAnimationFrame(step);
        };
        el.addEventListener("pointerup", end);
        el.addEventListener("pointercancel", end);
    });
}

function initMenu() {
    const trigger = $("#menuTrigger");
    const dialog = $("#mobileMenu");
    const close = $("#menuClose");
    if (!trigger || !dialog) return;
    const shut = () => {
        if (dialog.open) dialog.close();
        trigger.setAttribute("aria-expanded", "false");
    };
    trigger.addEventListener("click", () => {
        dialog.showModal();
        trigger.setAttribute("aria-expanded", "true");
        window.__flowingMenu?.start?.();
    });
    close?.addEventListener("click", shut);
    dialog.addEventListener("click", event => {
        const link = event.target.closest("a");
        if (link) shut();
    });
    dialog.addEventListener("close", () => window.__flowingMenu?.stop?.());
    dialog.addEventListener("cancel", () => trigger.setAttribute("aria-expanded", "false"));
}

function initSkills(photos) {
    const skills = window.CONFIG?.about?.skills || [];
    const percents = [ 93, 89, 67, 54 ];
    const list = $("#skillList");
    const heading = $(".services-menu h2");
    if (heading && skills.length) {
        const dot = heading.querySelector("span");
        heading.textContent = "";
        if (dot) heading.appendChild(dot);
        heading.append(document.createTextNode(skills.map(skill => skill.name).join(" · ")));
    }
    if (!list || !skills.length) return;
    list.innerHTML = skills.map((skill, i) => `\n        <div class="service-choice" style="--service-order:${i}">\n            <h3>\n                <button type="button" aria-pressed="${i === 0 ? "true" : "false"}" data-skill="${i}">\n                    <span class="service-number">${String(i + 1).padStart(2, "0")}</span>\n                    <span class="service-label">${esc(skill.name)}</span>\n                </button>\n            </h3>\n        </div>`).join("") + `<p class="service-note" id="skillNote"></p><div class="service-progress" aria-hidden="true"><i id="skillBar"></i></div>`;
    $$(".service-label", list).forEach(splitChars);
    $$(".service-choice", list).forEach(el => revealOnViewNode(el));
    const note = $("#skillNote");
    const bar = $("#skillBar");
    const show = index => {
        const skill = skills[index];
        if (!skill) return;
        $$("[data-skill]", list).forEach(btn => btn.setAttribute("aria-pressed", String(btn.dataset.skill === String(index))));
        const pct = percents[index];
        if (note) note.textContent = [ skill.note, pct ? `${pct}%` : "" ].filter(Boolean).join(" · ");
        if (bar) bar.style.width = `${pct}%`;
    };
    show(0);
    list.addEventListener("click", event => {
        const btn = event.target.closest("[data-skill]");
        if (!btn) return;
        show(Number(btn.dataset.skill));
    });
    revealOnView("[data-service-reveal]");
}

function initCounters() {
    const nodes = $$("[data-count]");
    if (!nodes.length) return;
    const run = el => {
        const target = Number(el.dataset.count);
        if (reduced) {
            el.textContent = String(target);
            return;
        }
        const start = performance.now();
        const step = now => {
            const t = Math.min(1, (now - start) / 1400);
            el.textContent = String(Math.round(target * (1 - Math.pow(1 - t, 3))));
            if (t < 1) requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
    };
    const box = $(".profile-stats");
    if (!box || reduced || !("IntersectionObserver" in window)) {
        nodes.forEach(run);
        return;
    }
    const io = new IntersectionObserver(entries => {
        if (!entries.some(e => e.isIntersecting)) return;
        nodes.forEach(run);
        io.disconnect();
    }, {
        threshold: .4
    });
    io.observe(box);
}

function initContact() {
    const form = $("#messageForm");
    const status = $("#messageStatus");
    const button = $("#messageSend");
    if (!form) return;
    const say = (text, isError) => {
        if (!status) return;
        status.textContent = text || "";
        status.classList.toggle("is-error", Boolean(isError));
    };
    form.addEventListener("submit", async event => {
        event.preventDefault();
        const name = $("#msgName")?.value.trim() || "";
        const email = $("#msgEmail")?.value.trim() || "";
        const body = $("#msgBody")?.value.trim() || "";
        if (name.length < 1 || body.length < 1) {
            say("Ajoute ton nom et un message.", true);
            return;
        }
        if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            say("Cet email ne semble pas valide.", true);
            return;
        }
        const cfg = window.CONFIG?.supabase || {};
        if (!cfg.url || !cfg.anonKey) {
            say("Envoi indisponible pour le moment.", true);
            return;
        }
        if (button) button.disabled = true;
        say("Envoi…", false);
        try {
            const res = await fetch(`${cfg.url}/rest/v1/messages`, {
                method: "POST",
                headers: {
                    apikey: cfg.anonKey,
                    Authorization: `Bearer ${cfg.anonKey}`,
                    "Content-Type": "application/json",
                    Prefer: "return=minimal"
                },
                body: JSON.stringify({
                    name: name,
                    email: email || null,
                    body: body
                })
            });
            if (!res.ok) {
                let message = "Envoi impossible.";
                try {
                    const payloadErr = await res.json();
                    message = payloadErr.message || payloadErr.error || message;
                } catch {}
                const missing = /messages|schema cache|relation/i.test(message);
                throw new Error(missing ? "La boîte n’est pas encore activée. Lance le SQL messages dans Supabase." : message);
            }
            form.reset();
            say("Message envoyé.", false);
        } catch (err) {
            say(err.message || "Envoi impossible.", true);
        } finally {
            if (button) button.disabled = false;
        }
    });
}

function splitInline(el) {
    [ ...el.childNodes ].forEach(node => {
        if (node.nodeType === Node.TEXT_NODE) {
            const frag = document.createDocumentFragment();
            node.textContent.split(/(\s+)/).forEach(part => {
                if (!part) return;
                if (/^\s+$/.test(part)) frag.appendChild(document.createTextNode(" ")); else {
                    const word = document.createElement("span");
                    word.className = "profile-text-word";
                    word.textContent = part;
                    frag.appendChild(word);
                }
            });
            node.replaceWith(frag);
        } else if (node.nodeName === "STRONG" || node.classList?.contains("you-word")) {
            const word = document.createElement("span");
            word.className = node.classList?.contains("you-word") ? "profile-text-word is-you" : "profile-text-word is-strong";
            word.textContent = node.textContent;
            node.replaceWith(word);
        }
    });
    $$(".profile-text-word", el).forEach(splitChars);
}

function initThought() {
    const machine = $(".thought-machine");
    const paper = $("#thoughtPaper");
    if (!machine || !paper) return;
    const text = paper.textContent;
    paper.setAttribute("aria-label", text);
    paper.textContent = "";
    const copy = document.createElement("span");
    copy.className = "thought-copy";
    copy.setAttribute("aria-hidden", "true");
    [ ...text ].forEach(char => {
        const glyph = document.createElement("span");
        glyph.className = "thought-glyph";
        glyph.textContent = char;
        copy.appendChild(glyph);
    });
    paper.appendChild(copy);
    const keys = $(".thought-keys", machine);
    const views = [ 210, 280, 350, 420, 490, 560, 630, 700, 770, 840, 910, 980 ];
    views.forEach((x, index) => {
        const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        svg.setAttribute("class", "thought-key");
        svg.setAttribute("viewBox", `${x} 800 58 50`);
        svg.style.left = `${16.40625 + index * 5.46875}%`;
        const image = document.createElementNS("http://www.w3.org/2000/svg", "image");
        image.setAttribute("href", "about/thought-typewriter.webp");
        image.setAttribute("width", "1280");
        image.setAttribute("height", "1280");
        svg.appendChild(image);
        keys.appendChild(svg);
    });
    const glyphs = [ ...copy.children ];
    const keyNodes = [ ...keys.children ];
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) {
        glyphs.forEach(glyph => glyph.classList.add("is-inked"));
        machine.dataset.typed = String(glyphs.length);
        return;
    }
    let index = 0;
    let cancelled = false;
    const tick = () => {
        if (cancelled) return;
        if (index >= glyphs.length) {
            machine.dataset.typing = "false";
            return;
        }
        glyphs[index].classList.add("is-inked");
        machine.dataset.typed = String(index + 1);
        if (glyphs[index].textContent.trim()) {
            const key = keyNodes[index % keyNodes.length];
            key.classList.remove("is-pressed");
            void key.getBoundingClientRect();
            key.classList.add("is-pressed");
        }
        const delay = glyphs[index].textContent === " " ? 36 : 62;
        index += 1;
        window.setTimeout(tick, delay);
    };
    const start = () => {
        machine.dataset.typing = "true";
        window.setTimeout(tick, 280);
    };
    if ("IntersectionObserver" in window) {
        const observer = new IntersectionObserver(entries => {
            if (!entries.some(entry => entry.isIntersecting)) return;
            observer.disconnect();
            start();
        }, {
            threshold: .45
        });
        observer.observe(machine);
    } else start();

    // Interactive typing: let visitors type their own quote on the machine
    const input = document.createElement("input");
    input.type = "text";
    input.className = "thought-input";
    input.setAttribute("aria-label", "write your fav quote");
    input.setAttribute("placeholder", "write your fav quote here");
    input.setAttribute("maxlength", "120");
    machine.appendChild(input);
    machine.classList.add("is-typeable");
    machine.setAttribute("tabindex", "0");
    machine.setAttribute("role", "textbox");
    machine.setAttribute("aria-label", "write your fav quote");

    const allGlyphs = [ ...glyphs ];
    let currentText = text;
    let isEditing = false;
    let sentText = "";

    const strikeKey = (ch) => {
        if (!ch.trim()) return;
        const key = keyNodes[allGlyphs.length % keyNodes.length];
        key.classList.remove("is-pressed");
        void key.getBoundingClientRect();
        key.classList.add("is-pressed");
    };

    const appendGlyph = (ch) => {
        const glyph = document.createElement("span");
        glyph.className = "thought-glyph is-inked";
        glyph.textContent = ch;
        copy.appendChild(glyph);
        allGlyphs.push(glyph);
        strikeKey(ch);
        machine.dataset.typed = String(allGlyphs.length);
    };

    const removeLastGlyph = () => {
        const glyph = allGlyphs.pop();
        if (glyph) glyph.remove();
        machine.dataset.typed = String(allGlyphs.length);
    };

    const syncToInput = () => {
        input.value = currentText;
    };

    const beginEditing = () => {
        if (isEditing) return;
        isEditing = true;
        cancelled = true;
        machine.dataset.typing = "false";
        // clear current quote
        allGlyphs.splice(0).forEach(g => g.remove());
        currentText = "";
        machine.dataset.typed = "0";
        copy.textContent = "";
        syncToInput();
        input.focus();
    };

    machine.addEventListener("click", () => {
        if (!isEditing) beginEditing();
        else input.focus();
    });
    machine.addEventListener("keydown", (event) => {
        if (!isEditing) return;
        if (event.key === "Escape") {
            input.blur();
            return;
        }
        if (event.key === "Enter") {
            event.preventDefault();
            sendQuote();
            input.blur();
            return;
        }
    });

    input.addEventListener("input", () => {
        const value = input.value;
        if (value.length > currentText.length) {
            const added = value.slice(currentText.length);
            [ ...added ].forEach(appendGlyph);
        } else if (value.length < currentText.length) {
            const diff = currentText.length - value.length;
            for (let i = 0; i < diff; i += 1) removeLastGlyph();
        }
        currentText = value;
        paper.setAttribute("aria-label", currentText || " ");
    });

    const sendQuote = async () => {
        const value = currentText.trim();
        if (!value || value === sentText) return;
        const cfg = window.CONFIG?.supabase || {};
        if (!cfg.url || !cfg.anonKey) return;
        try {
            await fetch(`${cfg.url}/rest/v1/quotes`, {
                method: "POST",
                headers: {
                    apikey: cfg.anonKey,
                    Authorization: `Bearer ${cfg.anonKey}`,
                    "Content-Type": "application/json",
                    Prefer: "return=minimal"
                },
                body: JSON.stringify({ text: value })
            });
            sentText = value;
        } catch {}
    };

    input.addEventListener("blur", () => {
        sendQuote();
    });
}

function initProfileCard() {
    const root = $("[data-profile-card]");
    if (!root) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const size = {
        width: root.offsetWidth,
        height: root.offsetHeight
    };
    const x = {
        p: 0,
        v: 0,
        target: 0
    };
    const y = {
        p: 0,
        v: 0,
        target: 0
    };
    const light = {
        p: 0,
        target: 0
    };
    let raf = 0;
    let last = 0;
    let slowUntil = 0;
    let touchId = null;
    const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
    const write = () => {
        const angle = reduced ? 0 : 12;
        const depth = reduced ? 0 : 8;
        const tilt = Math.min(1, Math.hypot(x.p, y.p));
        root.style.setProperty("--pc-light-x", `${((x.p + 1) * .5 * size.width).toFixed(1)}px`);
        root.style.setProperty("--pc-light-y", `${((y.p + 1) * .5 * size.height).toFixed(1)}px`);
        root.style.setProperty("--pc-pointer-x", `${((x.p + 1) * 50).toFixed(2)}%`);
        root.style.setProperty("--pc-pointer-y", `${((y.p + 1) * 50).toFixed(2)}%`);
        root.style.setProperty("--pc-band-x", `${(50 + x.p * 15).toFixed(2)}%`);
        root.style.setProperty("--pc-band-y", `${(50 + y.p * 15).toFixed(2)}%`);
        root.style.setProperty("--pc-rotate-x", `${(y.p * angle).toFixed(3)}deg`);
        root.style.setProperty("--pc-rotate-y", `${(-x.p * angle).toFixed(3)}deg`);
        root.style.setProperty("--pc-shift-x", `${(x.p * depth).toFixed(2)}px`);
        root.style.setProperty("--pc-shift-y", `${(y.p * depth).toFixed(2)}px`);
        root.style.setProperty("--pc-reach", tilt.toFixed(4));
        root.style.setProperty("--pc-tilt", (tilt * light.p).toFixed(4));
        root.style.setProperty("--pc-active", light.p.toFixed(4));
    };
    const frame = now => {
        const dt = Math.min(.05, (now - last) / 1e3 || 0);
        last = now;
        const slow = now < slowUntil;
        const stiffness = slow ? 24 : 120;
        const damping = slow ? 9 : 16;
        const steps = Math.max(1, Math.ceil(dt / (1 / 120)));
        const h = dt / steps;
        for (let i = 0; i < steps; i += 1) {
            [ x, y ].forEach(axis => {
                axis.v += (stiffness * (axis.target - axis.p) - damping * axis.v) * h;
                axis.p += axis.v * h;
            });
        }
        const tau = light.target > light.p ? .18 : slow ? .9 : .45;
        light.p += (light.target - light.p) * (1 - Math.exp(-dt / tau));
        write();
        const moving = Math.abs(x.target - x.p) > 5e-4 || Math.abs(y.target - y.p) > 5e-4 || Math.abs(x.v) > 5e-4 || Math.abs(y.v) > 5e-4 || Math.abs(light.target - light.p) > .002;
        raf = moving ? requestAnimationFrame(frame) : 0;
        if (!moving) {
            x.p = x.target;
            y.p = y.target;
            light.p = light.target;
            write();
        }
    };
    const wake = () => {
        if (raf) return;
        last = performance.now();
        raf = requestAnimationFrame(frame);
    };
    const aim = (nx, ny, on = true) => {
        x.target = clamp(nx, -1, 1);
        y.target = clamp(ny, -1, 1);
        light.target = on ? 1 : 0;
        slowUntil = 0;
        wake();
    };
    const aimAt = event => {
        const rect = root.getBoundingClientRect();
        if (!rect.width || !rect.height) return;
        aim((event.clientX - rect.left) / rect.width * 2 - 1, (event.clientY - rect.top) / rect.height * 2 - 1);
    };
    root.addEventListener("pointerenter", event => {
        if (event.pointerType === "mouse") aimAt(event);
    });
    root.addEventListener("pointermove", event => {
        if (event.pointerType === "mouse" || event.pointerId === touchId) aimAt(event);
    });
    root.addEventListener("pointerleave", event => {
        if (event.pointerType === "mouse") aim(0, 0, false);
    });
    root.addEventListener("pointerdown", event => {
        if (event.pointerType === "mouse") return;
        touchId = event.pointerId;
        aimAt(event);
    });
    const releaseTouch = event => {
        if (event.pointerId !== touchId) return;
        touchId = null;
        aim(0, 0, false);
    };
    root.addEventListener("pointerup", releaseTouch);
    root.addEventListener("pointercancel", releaseTouch);
    if ("ResizeObserver" in window) {
        new ResizeObserver(() => {
            size.width = root.offsetWidth;
            size.height = root.offsetHeight;
            write();
        }).observe(root);
    }
    if (!reduced) {
        x.p = .62;
        y.p = -.55;
        light.p = 1;
        slowUntil = performance.now() + 1400;
        write();
        wake();
    } else write();
}

function initAbout() {
    $$(".profile-name-line").forEach(splitChars);
    $$(".profile-biography p").forEach(splitInline);
    revealOnView("[data-reveal]");
    const contact = $("#contact");
    if (contact) revealOnViewNode(contact);
    initThought();
    initProfileCard();
}

sloganLetters();

initMenu();

initCutoutDrag();

initAbout();

initCounters();

initContact();

renderDrops();

(async () => {
    const [projects, photos] = await Promise.all([ fetchProjects(), fetchGalleryPhotos() ]);
    const gallery = photos.filter(photo => photo.placement !== "screen");
    const screen = photos.filter(photo => photo.placement === "screen" || photo.placement === "both");
    renderWorks(projects);
    initWorkCarousels();
    renderShots(gallery);
    renderMarquee(projects);
    initReel(projects);
    initSkills(gallery.length ? gallery : [ {
        src: "photos/mhsky.jpg",
        title: "MHSKY"
    } ]);
    if (window.mountLaptopMorph) window.mountLaptopMorph($("#laptopScreen"), screen);
})();