"use strict";
(() => {
    const root = document.querySelector(".flowing-menu");
    if (!root) return;
    const list = root.querySelector(".flowing-menu__list");
    if (!list) return;
    const items = [ ...root.querySelectorAll(".flowing-menu__item") ];
    if (!items.length) return;

    const SPEED = 60;  
    const DURATION = .5;
    const STRETCH = .6;  
    const MAGNET = .25;  
    const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
    const reduced = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const rows = items.map(item => ({
        item: item,
        link: item.querySelector(".flowing-menu__link"),
        text: item.querySelector(".flowing-menu__label-text"),
        divider: item.querySelector(".flowing-menu__divider"),
        track: item.querySelector(".flowing-menu__track"),
        band: item.querySelector(".flowing-menu__band")
    }));

    const metrics = [];
    const marquees = [];
    const band = { top: 0, bottom: 0, vTop: 0, vBottom: 0, toTop: 0, toBottom: 0, lead: 1, shown: false, index: -1, rest: 0 };
    const cursor = { x: 0, y: null, t: 0, vx: 0 };
    const engine = { raf: 0, last: 0, timers: [], touched: false };

    const marqueeAt = index => {
        if (!marquees[index]) marquees[index] = { x: 0, part: 0, spin: 0, covered: false };
        return marquees[index];
    };
    const setCopies = row => {
        const part = row.track?.firstElementChild;
        if (!part) return;
        const width = part.getBoundingClientRect().width;
        const total = row.item.getBoundingClientRect().width;
        const needed = width > 0 ? Math.max(3, Math.ceil(total / width) + 2) : 3;
        while (row.track.children.length < needed) row.track.appendChild(part.cloneNode(true));
        if (width > 0) {
            const state = marqueeAt(rows.indexOf(row));
            state.part = width;
            state.x = ((state.x % width) + width) % width - width;
        }
    };

    const measure = () => {
        metrics.length = 0;
        rows.forEach(row => metrics.push({
            top: row.item.offsetTop,
            height: row.item.offsetHeight
        }));
        rows.forEach(setCopies);
        if (band.shown && band.index >= 0 && metrics[band.index]) {
            const m = metrics[band.index];
            band.toTop = m.top;
            band.toBottom = m.top + m.height;
        }
        paint();
        kick();
    };

    const paint = () => {
        rows.forEach((row, index) => {
            const m = metrics[index];
            if (!row.band || !m) return;
            const state = marqueeAt(index);
            state.covered = false;
            const from = Math.max(band.top, m.top);
            const to = Math.min(band.bottom, m.top + m.height);
            if (!band.shown || to - from < .25) {
                row.band.style.visibility = "hidden";
            } else {
                row.band.style.visibility = "visible";
                row.band.style.clipPath = `inset(${(band.top - m.top).toFixed(2)}px 0px ${(m.top + m.height - band.bottom).toFixed(2)}px 0px)`;
                state.covered = (to - from) / m.height > .04;
            }
            if (row.track) row.track.style.transform = `translate3d(${state.x.toFixed(2)}px, 0, 0)`;
        });
    };

    const frame = now => {
        engine.raf = 0;
        const b = band;
        const reducedMotion = reduced();
        const elapsed = clamp((now - engine.last) / 1000, 0, 1 / 20);
        engine.last = now;
        let busy = false;

        if (b.shown) {
            const current = b.index >= 0 ? metrics[b.index] : null;
            if (current) {
                const lean = cursor.y === null || reducedMotion
                    ? 0
                    : clamp((cursor.y - (current.top + current.height / 2)) * MAGNET, -current.height * .3, current.height * .3);
                b.toTop = current.top + lean;
                b.toBottom = current.top + current.height + lean;
            } else if (b.index < 0) {
                b.toTop = b.toBottom = b.rest;
            }
            const gap = (b.toTop + b.toBottom) / 2 - (b.top + b.bottom) / 2;
            if (Math.abs(gap) > 2) b.lead = gap > 0 ? 1 : -1;
            if (reducedMotion) {
                b.top = b.toTop;
                b.bottom = b.toBottom;
                b.vTop = b.vBottom = 0;
            } else {
                const omega = Math.PI * 2 / DURATION;
                const fast = omega * (1 + 1.1 * STRETCH);
                const slow = omega * (1 - .4 * STRETCH);
                const zeta = 1 - .3 * STRETCH;
                const wTop = b.lead > 0 ? slow : fast;
                const wBottom = b.lead > 0 ? fast : slow;
                const steps = Math.max(1, Math.ceil(elapsed / (1 / 240)));
                const dt = elapsed / steps;
                for (let i = 0; i < steps; i += 1) {
                    b.vTop += (-wTop * wTop * (b.top - b.toTop) - 2 * zeta * wTop * b.vTop) * dt;
                    b.vBottom += (-wBottom * wBottom * (b.bottom - b.toBottom) - 2 * zeta * wBottom * b.vBottom) * dt;
                    b.top += b.vTop * dt;
                    b.bottom += b.vBottom * dt;
                    if (b.bottom < b.top) {
                        const mid = (b.top + b.bottom) / 2;
                        const v = (b.vTop + b.vBottom) / 2;
                        b.top = b.bottom = mid;
                        b.vTop = b.vBottom = v;
                    }
                }
            }
            const resting = Math.abs(b.top - b.toTop) < .1 && Math.abs(b.bottom - b.toBottom) < .1 && Math.abs(b.vTop) < 2 && Math.abs(b.vBottom) < 2;
            if (resting) {
                b.top = b.toTop;
                b.bottom = b.toBottom;
                b.vTop = b.vBottom = 0;
                if (b.index < 0 && b.bottom - b.top < .5) b.shown = false;
            } else busy = true;
        }
        cursor.vx *= Math.exp(-elapsed / .3);
        const push = clamp(cursor.vx * .4 * .55, -1600, 1600);

        marquees.forEach(state => {
            if (!state) return;
            const goal = state.covered ? 1 : 0;
            state.spin += (goal - state.spin) * (1 - Math.exp(-elapsed / .35));
            if (Math.abs(goal - state.spin) < .002) state.spin = goal;
            if (!state.covered && state.spin === 0) return;
            busy = true;
            if (state.part <= 0 || reducedMotion) return;
            state.x += (-SPEED + push) * state.spin * elapsed;
            state.x = ((state.x % state.part) + state.part) % state.part - state.part;
        });

        paint();
        if (busy) engine.raf = requestAnimationFrame(frame);
    };

    const kick = () => {
        if (engine.raf) return;
        engine.last = performance.now();
        engine.raf = requestAnimationFrame(frame);
    };

    const goTo = (index, from) => {
        const m = metrics[index];
        if (!m) return;
        const top = m.top;
        const bottom = m.top + m.height;
        if (!band.shown) {
            const start = from === "bottom" ? bottom : from === "center" ? (top + bottom) / 2 : top;
            band.top = band.bottom = start;
            band.vTop = band.vBottom = 0;
            band.shown = true;
        }
        const shift = (top + bottom) / 2 - (band.top + band.bottom) / 2;
        if (Math.abs(shift) > .5) band.lead = shift > 0 ? 1 : -1;
        else band.lead = from === "bottom" ? -1 : 1;
        band.toTop = top;
        band.toBottom = bottom;
        band.index = index;
        kick();
    };

    const release = toward => {
        if (!band.shown) return;
        const point = toward === "top" ? band.toTop : toward === "bottom" ? band.toBottom : (band.toTop + band.toBottom) / 2;
        band.lead = toward === "top" ? -1 : 1;
        band.rest = point;
        band.toTop = band.toBottom = point;
        band.index = -1;
        cursor.y = null;
        kick();
    };

    const rowAt = clientY => {
        const y = clientY - list.getBoundingClientRect().top;
        return metrics.findIndex(m => m && y >= m.top && y < m.top + m.height);
    };

    const halfOf = (clientY, index) => {
        const m = metrics[index];
        if (!m) return "top";
        return clientY - list.getBoundingClientRect().top - m.top < m.height / 2 ? "top" : "bottom";
    };

    const stopTimers = () => {
        engine.timers.forEach(clearTimeout);
        engine.timers = [];
    };

    root.addEventListener("pointermove", event => {
        if (event.pointerType === "touch") return;
        engine.touched = true;
        stopTimers();
        const now = performance.now();
        const gap = (now - cursor.t) / 1000;
        if (gap > 0 && gap < .1) {
            const instant = (event.clientX - cursor.x) / gap;
            cursor.vx += (instant - cursor.vx) * (1 - Math.exp(-gap / .08));
        }
        cursor.x = event.clientX;
        cursor.t = now;
        cursor.y = event.clientY - list.getBoundingClientRect().top;
        const index = rowAt(event.clientY);
        if (index >= 0 && index !== band.index) goTo(index, halfOf(event.clientY, index));
        else kick();
    });

    root.addEventListener("pointerleave", event => {
        if (event.pointerType === "touch") return;
        if (band.index < 0) return;
        const rect = list.getBoundingClientRect();
        if (event.clientY <= rect.top) release("top");
        else if (event.clientY >= rect.bottom) release("bottom");
        else release(halfOf(event.clientY, band.index));
    });

    rows.forEach((row, index) => {
        row.link?.addEventListener("pointerdown", event => {
            if (event.pointerType !== "touch") return;
            engine.touched = true;
            stopTimers();
            goTo(index, halfOf(event.clientY, index));
        });
    });

    const stop = () => {
        engine.touched = true;
        stopTimers();
        if (band.shown) release("bottom");
    };
    const start = () => {
        stopTimers();
        engine.touched = false;
        if (reduced()) return;
        const EASE = "cubic-bezier(0.2, 0.9, 0.2, 1)";
        rows.forEach((row, index) => {
            row.text?.animate([ { transform: "translateY(110%)" }, { transform: "none" } ], {
                duration: 900,
                delay: index * 70,
                easing: EASE,
                fill: "backwards"
            });
            row.divider?.animate([ { transform: "scaleX(0)" }, { transform: "none" } ], {
                duration: 1100,
                delay: index * 70,
                easing: EASE,
                fill: "backwards"
            });
        });
        const count = rows.length;
        const startAt = 650 + count * 70;
        rows.forEach((row, index) => {
            engine.timers.push(window.setTimeout(() => {
                if (!engine.touched) goTo(index, "top");
            }, startAt + index * 170));
        });
        engine.timers.push(window.setTimeout(() => {
            if (!engine.touched) release("bottom");
        }, startAt + count * 170 + 120));
    };

    const dialog = root.closest("dialog");
    if (dialog) dialog.addEventListener("close", stop);

    window.addEventListener("resize", measure, { passive: true });
    if ("ResizeObserver" in window) new ResizeObserver(measure).observe(root);

    window.__flowingMenu = { start, stop };

    measure();
})();
