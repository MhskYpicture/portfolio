"use strict";

(function initBellToggle() {
    const root = document.getElementById("bellToggle");
    if (!root) return;
    const button = root.querySelector(".bell-toggle__button");
    const glyph = root.querySelector(".bell-toggle__glyph");
    const offEl = root.querySelector(".bell-toggle__face--off");
    const onEl = root.querySelector(".bell-toggle__face--on");
    const waveL = root.querySelector(".bell-toggle__wave--left");
    const waveR = root.querySelector(".bell-toggle__wave--right");
    const badge = root.querySelector(".bell-toggle__badge");
    const offLabel = "Notify me";
    const onLabel = "You'll be notified";
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    let on = false;
    let mix = 0;
    let frame = 0;
    let wOff = 0;
    let wOn = 0;
    const paint = () => {
        const clip = Math.max(wOff, wOn) - (wOff + (wOn - wOff) * mix);
        root.style.setProperty("--bt-clip", Math.max(0, clip).toFixed(2) + "px");
    };
    const measure = () => {
        wOff = offEl.offsetWidth;
        wOn = onEl.offsetWidth;
        paint();
    };
    const passOffset = (k, passes) => 1 - Math.pow(1 - (k + 2 / 3) / (passes + 1), .6);
    const ring = () => {
        if (reduced.matches || !glyph) return;
        glyph.getAnimations().forEach(anim => anim.cancel());
        const ease = "cubic-bezier(0.77, 0, 0.175, 1)";
        const passes = 5;
        const frames = [ {
            transform: "rotate(0deg)",
            offset: 0,
            easing: ease
        } ];
        for (let k = 0; k < passes; k++) {
            const angle = 17 * Math.pow(1 - k / passes, 1) * (k % 2 ? 1 : -1);
            frames.push({
                transform: `rotate(${angle.toFixed(2)}deg)`,
                offset: passOffset(k, passes),
                easing: ease
            });
        }
        frames.push({
            transform: "rotate(0deg)",
            offset: 1
        });
        glyph.animate(frames, {
            duration: 820,
            easing: "linear"
        });
        for (let k = 0; k < passes; k++) {
            const side = k % 2 ? waveR : waveL;
            if (!side) continue;
            const strength = 1 - k / passes;
            side.animate([ {
                opacity: 0,
                transform: "scale(0.55)"
            }, {
                opacity: .9 * strength,
                offset: .3
            }, {
                opacity: 0,
                transform: "scale(1.25)"
            } ], {
                duration: 380,
                delay: passOffset(k, passes) * 820,
                easing: "ease-out"
            });
        }
    };
    const glide = () => {
        cancelAnimationFrame(frame);
        if (reduced.matches) {
            mix = on ? 1 : 0;
            paint();
            return;
        }
        const from = mix;
        const to = on ? 1 : 0;
        const start = performance.now();
        const step = now => {
            const p = Math.min(1, (now - start) / 300);
            const eased = 1 - Math.pow(1 - p, 3);
            mix = from + (to - from) * eased;
            paint();
            if (p < 1) frame = requestAnimationFrame(step);
        };
        frame = requestAnimationFrame(step);
    };
    button.addEventListener("pointerdown", event => {
        if (event.button === 0) root.dataset.pressed = "";
    });
    const release = () => {
        delete root.dataset.pressed;
    };
    button.addEventListener("pointerup", release);
    button.addEventListener("pointercancel", release);
    button.addEventListener("pointerleave", release);
    button.addEventListener("click", () => {
        on = !on;
        root.dataset.on = on ? "true" : "false";
        button.setAttribute("aria-pressed", String(on));
        button.setAttribute("aria-label", on ? onLabel : offLabel);
        if (badge) badge.toggleAttribute("data-show", on);
        if (on) ring();
        glide();
    });
    measure();
    document.fonts?.ready.then(measure);
    window.addEventListener("resize", measure, {
        passive: true
    });
})();

(function initCurvedEmail() {
    const root = document.getElementById("emailCurve");
    const input = document.getElementById("msgEmail");
    if (!root || !input) return;
    const height = 58;
    const bend = 22;
    const fontSize = 16;
    const cornerRadius = 16;
    const borderWidth = 1.5;
    const buttonText = "OK";
    const bg = "#eeeae1";
    const ink = "#141413";
    const placeholderColor = "#5c5854";
    const border = "#222524";
    const accent = "#222524";
    const chip = "#b94835";
    const btnInk = "#eeeae1";
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("class", "curved-input__svg");
    svg.setAttribute("role", "presentation");
    root.insertBefore(svg, input);
    let width = 0;
    let focused = false;
    let caretIndex = 0;
    let scrollLen = 0;
    let geom = null;
    let textStartU = 0;
    let shownPath = null;
    const round = n => Math.round(n * 100) / 100;
    const geometry = (w, sag, thickness, pad) => {
        const s = Math.max(-w * .35, Math.min(sag, w * .35));
        const rise = Math.abs(s);
        const dir = s >= 0 ? 1 : -1;
        const svgH = thickness + rise + pad * 2;
        if (rise < .75) {
            const midY = pad + thickness / 2;
            return {
                straight: true,
                W: w,
                svgH: svgH,
                uPerLen: 1,
                point: (u, v) => [ u, midY + v ],
                angleAt: () => 0,
                uFromPoint: x => x
            };
        }
        const radius = (w * w * .25 + rise * rise) / (2 * rise);
        const cx = w / 2;
        const apexY = pad + thickness / 2 + (dir > 0 ? 0 : rise);
        const cy = apexY + dir * radius;
        const phi = Math.asin(Math.min(1, w / (2 * radius)));
        return {
            straight: false,
            W: w,
            svgH: svgH,
            R: radius,
            dir: dir,
            uPerLen: w / (2 * radius * phi),
            point: (u, v) => {
                const th = (u - cx) / cx * phi;
                const rho = radius - dir * v;
                return [ cx + rho * Math.sin(th), cy - dir * rho * Math.cos(th) ];
            },
            angleAt: u => dir * ((u - cx) / cx) * phi * (180 / Math.PI),
            uFromPoint: (x, y) => {
                const th = Math.atan2(x - cx, dir * (cy - y));
                return cx + th / phi * cx;
            }
        };
    };
    const fmt = (g, u, v) => {
        const [x, y] = g.point(u, v);
        return `${round(x)} ${round(y)}`;
    };
    const edge = (g, uTo, v, forward) => {
        if (g.straight) return `L ${fmt(g, uTo, v)}`;
        const rho = round(g.R - g.dir * v);
        const sweep = forward === g.dir > 0 ? 1 : 0;
        return `A ${rho} ${rho} 0 0 ${sweep} ${fmt(g, uTo, v)}`;
    };
    const bentRect = (g, u0, u1, vTop, vBot, radius) => {
        const rc = Math.max(0, Math.min(radius, (vBot - vTop) / 2, (u1 - u0) / 2));
        return [ `M ${fmt(g, u0 + rc, vTop)}`, edge(g, u1 - rc, vTop, true), `Q ${fmt(g, u1, vTop)} ${fmt(g, u1, vTop + rc)}`, `L ${fmt(g, u1, vBot - rc)}`, `Q ${fmt(g, u1, vBot)} ${fmt(g, u1 - rc, vBot)}`, edge(g, u0 + rc, vBot, false), `Q ${fmt(g, u0, vBot)} ${fmt(g, u0, vBot - rc)}`, `L ${fmt(g, u0, vTop + rc)}`, `Q ${fmt(g, u0, vTop)} ${fmt(g, u0 + rc, vTop)}`, "Z" ].join(" ");
    };
    const bentLine = (g, u0, u1, v) => `M ${fmt(g, u0, v)} ${edge(g, u1, v, true)}`;
    const el = (name, attrs) => {
        const node = document.createElementNS("http://www.w3.org/2000/svg", name);
        Object.entries(attrs).forEach(([key, value]) => node.setAttribute(key, value));
        return node;
    };
    const render = () => {
        geom = width > 2 ? geometry(width, bend, height, Math.ceil(borderWidth / 2) + 6) : null;
        svg.replaceChildren();
        shownPath = null;
        if (!geom) return;
        const g = geom;
        const value = input.value;
        const caret = Math.min(caretIndex, value.length);
        const btnInset = Math.max(5, borderWidth + 4);
        const chipH = Math.min(34, Math.max(16, height * .34));
        const chipW = chipH * 1.25;
        const iconU = 22 + chipW / 2;
        textStartU = 22 + chipW + 13;
        const measure = el("text", {
            x: "-9999",
            y: "-9999",
            "font-size": fontSize,
            "font-weight": "600",
            visibility: "hidden"
        });
        measure.textContent = buttonText;
        svg.appendChild(measure);
        let btnTextW = buttonText.length * fontSize * .62;
        try {
            btnTextW = measure.getComputedTextLength() || btnTextW;
        } catch {}
        const btnW = Math.max(btnTextW + fontSize * 2.7, height * 1.35);
        const btnU1 = g.W - btnInset;
        const btnU0 = btnU1 - btnW;
        const textEndU = Math.max(textStartU + 20, btnU0 - 14);
        const winLen = (textEndU - textStartU) / g.uPerLen;
        const vBase = fontSize * .34;
        const probe = el("text", {
            "font-size": fontSize,
            "font-weight": "500",
            visibility: "hidden"
        });
        const probePath = el("path", {
            id: "ci-probe",
            d: bentLine(g, 0, g.W, vBase),
            fill: "none"
        });
        const probeText = el("textPath", {
            href: "#ci-probe"
        });
        probeText.textContent = value || " ";
        probe.appendChild(probeText);
        svg.append(probePath, probe);
        let totalLen = 0;
        let caretLen = 0;
        if (value.length) {
            try {
                totalLen = probeText.getSubStringLength(0, value.length);
                caretLen = caret > 0 ? probeText.getSubStringLength(0, caret) : 0;
            } catch {}
        }
        if (caretLen - scrollLen > winLen - 2) scrollLen = caretLen - winLen + 2;
        if (caretLen - scrollLen < 0) scrollLen = caretLen;
        if (totalLen - scrollLen < winLen) scrollLen = Math.max(0, totalLen - winLen);
        scrollLen = Math.max(0, scrollLen);
        const caretU = textStartU + (caretLen - scrollLen) * g.uPerLen;
        const scrollU = scrollLen * g.uPerLen;
        svg.replaceChildren();
        svg.setAttribute("width", g.W);
        svg.setAttribute("height", round(g.svgH));
        svg.setAttribute("viewBox", `0 0 ${g.W} ${round(g.svgH)}`);
        svg.style.filter = "drop-shadow(0 5px 12px rgba(34,37,36,.22))";
        const clipId = "ci-clip";
        const textPathId = "ci-text";
        const btnPathId = "ci-btn";
        const defs = el("defs", {});
        const clip = el("clipPath", {
            id: clipId
        });
        clip.appendChild(el("path", {
            d: bentRect(g, textStartU - 6, textEndU + 8, -height / 2, height / 2, 0)
        }));
        defs.appendChild(clip);
        svg.appendChild(defs);
        const band = bentRect(g, 0, g.W, -height / 2, height / 2, cornerRadius);
        svg.appendChild(el("path", {
            class: "curved-input__ring",
            d: band,
            fill: "none",
            stroke: chip,
            "stroke-width": borderWidth + 6
        }));
        svg.appendChild(el("path", {
            d: band,
            fill: bg,
            stroke: border,
            "stroke-width": borderWidth
        }));
        svg.appendChild(el("path", {
            id: textPathId,
            d: bentLine(g, textStartU - scrollU, g.W, vBase),
            fill: "none"
        }));
        const [ix, iy] = g.point(iconU, 0);
        const icon = el("g", {
            transform: `translate(${round(ix)} ${round(iy)}) rotate(${round(g.angleAt(iconU))})`,
            "aria-hidden": "true"
        });
        icon.appendChild(el("rect", {
            x: -chipW / 2,
            y: -chipH / 2,
            width: chipW,
            height: chipH,
            rx: chipH * .27,
            fill: chip
        }));
        const ew = chipW * .5;
        const eh = chipH * .5;
        const sw = Math.max(1.1, chipH * .075);
        icon.appendChild(el("rect", {
            x: -ew / 2,
            y: -eh / 2,
            width: ew,
            height: eh,
            rx: 1.4,
            fill: "none",
            stroke: "#fff",
            "stroke-width": sw,
            "stroke-linejoin": "round"
        }));
        icon.appendChild(el("path", {
            d: `M ${round(-ew / 2)} ${round(-eh / 2 + sw * .4)} L 0 ${round(eh * .14)} L ${round(ew / 2)} ${round(-eh / 2 + sw * .4)}`,
            fill: "none",
            stroke: "#fff",
            "stroke-width": sw,
            "stroke-linejoin": "round",
            "stroke-linecap": "round"
        }));
        svg.appendChild(icon);
        const clipped = el("g", {
            "clip-path": `url(#${clipId})`
        });
        const shown = el("text", {
            "font-size": fontSize,
            "font-weight": "500",
            fill: value ? ink : placeholderColor,
            "aria-hidden": "true"
        });
        const pathNode = el("textPath", {
            href: `#${textPathId}`
        });
        shownPath = pathNode;
        pathNode.textContent = value || input.placeholder || "";
        shown.appendChild(pathNode);
        clipped.appendChild(shown);
        if (focused) {
            const [cx, cy] = g.point(caretU, 0);
            const caretH = Math.min(height * .58, fontSize * 1.45);
            const caretG = el("g", {
                transform: `translate(${round(cx)} ${round(cy)}) rotate(${round(g.angleAt(caretU))})`
            });
            const line = el("line", {
                y1: -caretH / 2,
                y2: caretH / 2,
                stroke: ink,
                "stroke-width": "1.5",
                "stroke-linecap": "round"
            });
            const blink = el("animate", {
                attributeName: "opacity",
                values: "1;0",
                dur: "1.06s",
                calcMode: "discrete",
                repeatCount: "indefinite"
            });
            line.appendChild(blink);
            caretG.appendChild(line);
            clipped.appendChild(caretG);
        }
        svg.appendChild(clipped);
        const btnH = height - btnInset * 2;
        const button = el("g", {
            class: "curved-input__button",
            role: "button",
            tabindex: "0",
            "aria-label": buttonText
        });
        button.appendChild(el("path", {
            class: "curved-input__button-bg",
            d: bentRect(g, btnU0, btnU1, -height / 2 + btnInset, height / 2 - btnInset, Math.min(cornerRadius * .72, btnH / 2)),
            fill: accent
        }));
        button.appendChild(el("path", {
            id: btnPathId,
            d: bentLine(g, btnU0, btnU1, vBase),
            fill: "none"
        }));
        const label = el("text", {
            fill: btnInk,
            "text-anchor": "middle",
            "font-size": fontSize,
            "font-weight": "600",
            "pointer-events": "none"
        });
        const labelPath = el("textPath", {
            href: `#${btnPathId}`,
            startOffset: "50%"
        });
        labelPath.textContent = buttonText;
        label.appendChild(labelPath);
        button.appendChild(label);
        svg.appendChild(button);
        button.addEventListener("pointerdown", event => event.stopPropagation());
        button.addEventListener("click", confirmEmail);
        button.addEventListener("keydown", event => {
            if (event.key === "Enter" || event.key === " ") confirmEmail(event);
        });
    };
    const confirmEmail = event => {
        event.preventDefault();
        event.stopPropagation();
        const next = document.getElementById("msgBody");
        if (next) next.focus();
    };
    svg.addEventListener("pointerdown", event => {
        if (event.target.closest(".curved-input__button")) return;
        event.preventDefault();
    });
    svg.addEventListener("click", event => {
        if (event.target.closest(".curved-input__button")) return;
        const value = input.value;
        let index = value.length;
        if (geom && shownPath && value.length) {
            try {
                const point = new DOMPoint(event.clientX, event.clientY).matrixTransform(svg.getScreenCTM().inverse());
                const target = scrollLen + (geom.uFromPoint(point.x, point.y) - textStartU) / geom.uPerLen;
                let best = 0;
                let bestDist = Infinity;
                for (let i = 0; i <= value.length; i++) {
                    const length = i === 0 ? 0 : shownPath.getSubStringLength(0, i);
                    const dist = Math.abs(length - target);
                    if (dist < bestDist) {
                        bestDist = dist;
                        best = i;
                    }
                }
                index = best;
            } catch {
                index = value.length;
            }
        }
        input.focus();
        try {
            input.setSelectionRange(index, index);
        } catch {}
        caretIndex = index;
        render();
    });
    const syncCaret = () => {
        caretIndex = input.selectionStart ?? input.value.length;
        render();
    };
    input.addEventListener("input", syncCaret);
    input.addEventListener("keyup", syncCaret);
    input.addEventListener("select", syncCaret);
    input.addEventListener("focus", () => {
        focused = true;
        root.classList.add("curved-input--focused");
        syncCaret();
    });
    input.addEventListener("blur", () => {
        focused = false;
        root.classList.remove("curved-input--focused");
        render();
    });
    input.form?.addEventListener("reset", () => {
        scrollLen = 0;
        caretIndex = 0;
        requestAnimationFrame(render);
    });
    const watch = new ResizeObserver(() => {
        const next = Math.round(root.clientWidth);
        if (next !== width) {
            width = next;
            render();
        }
    });
    watch.observe(root);
    document.fonts?.ready.then(render);
    width = Math.round(root.clientWidth);
    render();
})();