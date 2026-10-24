"use strict";

(function() {
    const viewer = document.getElementById("morphViewer");
    const stage = document.getElementById("mvStage");
    const dotsEl = document.getElementById("mvDots");
    const caption = document.getElementById("mvCaption");
    if (!viewer || !stage) {
        window.morphViewer = {
            open() {},
            setItems() {}
        };
        return;
    }
    const VERT = `\nattribute vec2 position;\nattribute vec2 uv;\nvarying vec2 vUv;\nvoid main() {\n    vUv = uv;\n    gl_Position = vec4(position, 0.0, 1.0);\n}`;
    const FRAG = `\nprecision highp float;\n\nuniform sampler2D tCurrent;\nuniform sampler2D tNext;\nuniform vec2 uResolution;\nuniform vec2 uCurrentSize;\nuniform vec2 uNextSize;\nuniform float uProgress;\nuniform float uDir;\nuniform int uMode;\nuniform float uIntensity;\nuniform float uScale;\nuniform float uAberration;\nuniform float uDrift;\nuniform float uTime;\nuniform float uReduce;\nuniform vec2 uPointer;\nuniform vec3 uOverlay;\n\nvarying vec2 vUv;\n\nconst float PI = 3.14159265359;\n\nfloat hash11(float p) {\n    p = fract(p * 0.1031);\n    p *= p + 33.33;\n    p *= p + p;\n    return fract(p);\n}\n\nfloat hash21(vec2 p) {\n    vec3 p3 = fract(vec3(p.xyx) * 0.1031);\n    p3 += dot(p3, p3.yzx + 33.33);\n    return fract((p3.x + p3.y) * p3.z);\n}\n\nfloat noise(vec2 p) {\n    vec2 i = floor(p);\n    vec2 f = fract(p);\n    vec2 u = f * f * (3.0 - 2.0 * f);\n    float a = hash21(i);\n    float b = hash21(i + vec2(1.0, 0.0));\n    float c = hash21(i + vec2(0.0, 1.0));\n    float d = hash21(i + vec2(1.0, 1.0));\n    return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);\n}\n\nfloat fbm(vec2 p) {\n    float v = 0.0;\n    float a = 0.5;\n    for (int i = 0; i < 5; i++) {\n        v += a * noise(p);\n        p *= 2.0;\n        a *= 0.5;\n    }\n    return v;\n}\n\nmat2 rot(float a) {\n    float s = sin(a);\n    float c = cos(a);\n    return mat2(c, -s, s, c);\n}\n\nvec2 coverUV(vec2 uv, vec2 res, vec2 img) {\n    float rA = res.x / max(res.y, 1.0);\n    float iA = img.x / max(img.y, 1.0);\n    vec2 s = vec2(1.0);\n    float ratio = rA / max(iA, 0.0001);\n    if (ratio > 1.0) {\n        s.y = 1.0 / ratio;\n    } else {\n        s.x = ratio;\n    }\n    return (uv - 0.5) * s + 0.5;\n}\n\nvoid main() {\n    float p = clamp(uProgress, 0.0, 1.0);\n    float env = sin(p * PI);\n\n    vec2 uv = vUv;\n\n    uv += vec2(sin(uTime * 0.25 + uv.y * 4.0), cos(uTime * 0.22 + uv.x * 4.0)) * uDrift * 0.008;\n    uv = (uv - 0.5) * (1.0 - uDrift * 0.02 * sin(uTime * 0.4)) + 0.5;\n\n    vec2 uvC = uv;\n    vec2 uvN = uv;\n    float m = smoothstep(0.0, 1.0, p);\n\n    if (uReduce < 0.5) {\n        if (uMode == 3) {\n            vec2 c = uv - 0.5;\n            float r = length(c);\n            float ang = env * uIntensity * 3.5 * (1.0 - r);\n            uvC = rot(ang) * c + 0.5;\n            uvN = rot(-ang) * c + 0.5;\n            m = smoothstep(0.0, 1.0, p);\n        } else if (uMode == 1) {\n            float d = distance(uv, uPointer);\n            float ring = p * 1.6;\n            float wave = sin((d - ring) * 30.0) * env;\n            vec2 dir = normalize(uv - uPointer + 1e-4);\n            vec2 disp = dir * wave * uIntensity * 0.25;\n            uvC = uv + disp;\n            uvN = uv + disp * 0.6;\n            m = 1.0 - smoothstep(ring - 0.03, ring + 0.03, d);\n        } else if (uMode == 2) {\n            float slices = 14.0;\n            float row = floor(uv.y * slices);\n            float rnd = hash11(row);\n            vec2 disp = vec2((rnd - 0.5) * env * uIntensity * 0.6, 0.0);\n            uvC = uv + disp;\n            uvN = uv + disp;\n            float localX = uDir > 0.0 ? uv.x : 1.0 - uv.x;\n            float th = p * 1.5 - 0.25 + (rnd - 0.5) * 0.25;\n            m = 1.0 - smoothstep(th - 0.06, th + 0.06, localX);\n        } else {\n            float nn = fbm(uv * uScale + uTime * 0.03);\n            float warp = fbm(uv * uScale * 1.7 - uTime * 0.02);\n            vec2 g = vec2(nn, warp) - 0.5;\n            uvC = uv + g * uIntensity * 0.5 * p;\n            uvN = uv - g * uIntensity * 0.5 * (1.0 - p);\n            m = smoothstep(nn - 0.15, nn + 0.15, p);\n        }\n    }\n\n    vec2 sC = coverUV(uvC, uResolution, uCurrentSize);\n    vec2 sN = coverUV(uvN, uResolution, uNextSize);\n\n    float ca = uReduce < 0.5 ? uAberration * env * 0.03 : 0.0;\n\n    vec3 colC = vec3(\n        texture2D(tCurrent, sC + vec2(ca, 0.0)).r,\n        texture2D(tCurrent, sC).g,\n        texture2D(tCurrent, sC - vec2(ca, 0.0)).b\n    );\n    vec3 colN = vec3(\n        texture2D(tNext, sN + vec2(ca, 0.0)).r,\n        texture2D(tNext, sN).g,\n        texture2D(tNext, sN - vec2(ca, 0.0)).b\n    );\n\n    vec3 col = mix(colC, colN, m);\n\n    float vig = smoothstep(1.25, 0.25, length(uv - 0.5));\n    col = mix(col, uOverlay, (1.0 - vig) * 0.28);\n\n    gl_FragColor = vec4(col, 1.0);\n}`;
    const OPTS = {
        mode: 0,
        intensity: .55,
        scale: 2.4,
        aberration: .35,
        drift: .4,
        duration: 1.1
    };
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const esc = value => String(value ?? "").replace(/[&<>"']/g, ch => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    }[ch]));
    let items = [];
    let current = 0;
    let nextIdx = 0;
    let dir = 1;
    let engine = null;
    let engineFailed = false;
    let fallbackImg = null;
    let animating = false;
    let rafId = null;
    let lastFocus = null;
    const progress = {
        v: 0
    };
    const textures = [];
    function buildEngine() {
        const canvas = document.createElement("canvas");
        canvas.className = "mv-canvas";
        const gl = canvas.getContext("webgl", {
            antialias: true,
            premultipliedAlpha: false
        }) || canvas.getContext("experimental-webgl");
        if (!gl) return null;
        function compile(type, src) {
            const sh = gl.createShader(type);
            gl.shaderSource(sh, src);
            gl.compileShader(sh);
            if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
                console.warn("Morph shader:", gl.getShaderInfoLog(sh));
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
        const buf = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, buf);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([ -1, -1, 0, 0, 3, -1, 2, 0, -1, 3, 0, 2 ]), gl.STATIC_DRAW);
        const aPos = gl.getAttribLocation(prog, "position");
        const aUv = gl.getAttribLocation(prog, "uv");
        gl.enableVertexAttribArray(aPos);
        gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 16, 0);
        gl.enableVertexAttribArray(aUv);
        gl.vertexAttribPointer(aUv, 2, gl.FLOAT, false, 16, 8);
        const U = {};
        [ "tCurrent", "tNext", "uResolution", "uCurrentSize", "uNextSize", "uProgress", "uDir", "uMode", "uIntensity", "uScale", "uAberration", "uDrift", "uTime", "uReduce", "uPointer", "uOverlay" ].forEach(name => {
            U[name] = gl.getUniformLocation(prog, name);
        });
        gl.uniform1i(U.uMode, OPTS.mode);
        gl.uniform1f(U.uIntensity, OPTS.intensity);
        gl.uniform1f(U.uScale, OPTS.scale);
        gl.uniform1f(U.uAberration, OPTS.aberration);
        gl.uniform1f(U.uDrift, OPTS.drift);
        gl.uniform1f(U.uReduce, reduced ? 1 : 0);
        gl.uniform2f(U.uPointer, .5, .5);
        gl.uniform3f(U.uOverlay, .01, .03, .05);
        function makeTexture(image) {
            const tex = gl.createTexture();
            gl.bindTexture(gl.TEXTURE_2D, tex);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
            gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
            if (image) gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image); else gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([ 12, 14, 20, 255 ]));
            return tex;
        }
        return {
            canvas: canvas,
            gl: gl,
            U: U,
            makeTexture: makeTexture
        };
    }
    function ensureTexture(i) {
        if (!engine || textures[i]) return;
        textures[i] = {
            tex: engine.makeTexture(null),
            size: [ 1, 1 ]
        };
        const img = new Image;
        img.crossOrigin = "anonymous";
        img.onload = () => {
            try {
                textures[i].tex = engine.makeTexture(img);
                textures[i].size = [ img.naturalWidth || 1, img.naturalHeight || 1 ];
            } catch (err) {
                console.warn("Morph texture:", err);
            }
        };
        img.src = items[i].src;
    }
    function resize() {
        if (!engine) return;
        const rect = stage.getBoundingClientRect();
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        engine.canvas.width = Math.max(1, Math.round(rect.width * dpr));
        engine.canvas.height = Math.max(1, Math.round(rect.height * dpr));
        engine.gl.viewport(0, 0, engine.canvas.width, engine.canvas.height);
        engine.gl.uniform2f(engine.U.uResolution, engine.canvas.width, engine.canvas.height);
    }
    window.addEventListener("resize", () => {
        if (viewer.classList.contains("open")) resize();
    });
    function loop(t) {
        if (!engine || !viewer.classList.contains("open")) {
            rafId = null;
            return;
        }
        const {gl: gl, U: U} = engine;
        gl.uniform1f(U.uTime, t * .001);
        gl.uniform1f(U.uProgress, progress.v);
        gl.uniform1f(U.uDir, dir);
        const cur = textures[current];
        const nxt = textures[nextIdx] || cur;
        if (!cur) {
            rafId = requestAnimationFrame(loop);
            return;
        }
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
            const t = Math.min(1, (now - start) / (duration * 1e3));
            const e = t < .5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
            progress.v = from + (to - from) * e;
            if (t < 1) requestAnimationFrame(step); else {
                animating = false;
                if (done) done();
            }
        })(start);
    }
    function updateUi(idx = current) {
        const it = items[idx] || {};
        if (caption) {
            const label = [ it.title, it.note ].filter(Boolean).join(" · ") || "Photo";
            caption.innerHTML = `<span class="morph-slider-caption-text is-active">${esc(label)}</span>`;
        }
        if (dotsEl) dotsEl.querySelectorAll(".morph-slider-dot").forEach((dot, i) => {
            const on = i === idx;
            dot.classList.toggle("is-active", on);
            if (on) dot.setAttribute("aria-current", "true"); else dot.removeAttribute("aria-current");
        });
    }
    function goTo(delta) {
        if (animating || items.length < 2) return;
        if (!engine) {
            current = (current + delta + items.length) % items.length;
            if (fallbackImg) fallbackImg.src = items[current].src;
            updateUi();
            return;
        }
        dir = delta;
        nextIdx = (current + delta + items.length) % items.length;
        ensureTexture(nextIdx);
        progress.v = 0;
        updateUi(nextIdx);
        tweenProgress(1, reduced ? .25 : OPTS.duration, () => {
            current = nextIdx;
            progress.v = 0;
        });
    }
    function jumpTo(index) {
        if (index === current || animating || !items.length) return;
        if (!engine) {
            current = index;
            if (fallbackImg) fallbackImg.src = items[index].src;
            updateUi();
            return;
        }
        dir = index > current ? 1 : -1;
        nextIdx = index;
        ensureTexture(index);
        progress.v = 0;
        updateUi(index);
        tweenProgress(1, reduced ? .25 : OPTS.duration, () => {
            current = index;
            progress.v = 0;
        });
    }
    function open(idx) {
        if (!items.length) return;
        current = (idx % items.length + items.length) % items.length;
        nextIdx = current;
        progress.v = 0;
        if (!engine && !engineFailed && !fallbackImg) {
            engine = buildEngine();
            if (engine) stage.prepend(engine.canvas); else {
                engineFailed = true;
                fallbackImg = document.createElement("img");
                fallbackImg.className = "mv-fallback";
                fallbackImg.alt = "";
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
        lastFocus = document.activeElement;
        viewer.classList.add("open");
        viewer.setAttribute("aria-hidden", "false");
        document.body.style.overflow = "hidden";
        updateUi();
        stage.focus();
    }
    function close() {
        viewer.classList.remove("open");
        viewer.setAttribute("aria-hidden", "true");
        document.body.style.overflow = "";
        if (rafId) {
            cancelAnimationFrame(rafId);
            rafId = null;
        }
        if (lastFocus && typeof lastFocus.focus === "function") lastFocus.focus();
    }
    let dragActive = false;
    let dragStartX = 0;
    let dragW = 1;
    let dragDir = 0;
    let dragMovedX = 0;
    stage.addEventListener("pointerdown", event => {
        if (event.target.closest(".morph-slider-btn, .morph-slider-dot, .morph-viewer-close")) return;
        if (animating || items.length < 2 || !engine || !viewer.classList.contains("open")) return;
        dragActive = true;
        dragDir = 0;
        dragMovedX = 0;
        dragStartX = event.clientX;
        const rect = stage.getBoundingClientRect();
        dragW = rect.width || 1;
        engine.gl.uniform2f(engine.U.uPointer, (event.clientX - rect.left) / rect.width, 1 - (event.clientY - rect.top) / rect.height);
        try {
            stage.setPointerCapture(event.pointerId);
        } catch {}
    });
    stage.addEventListener("pointermove", event => {
        if (!dragActive) return;
        const ndx = (event.clientX - dragStartX) / dragW;
        dragMovedX = Math.abs(event.clientX - dragStartX);
        const delta = ndx < 0 ? 1 : -1;
        if (dragMovedX < 4) return;
        if (delta !== dragDir) {
            dragDir = delta;
            dir = delta;
            nextIdx = (current + delta + items.length) % items.length;
            ensureTexture(nextIdx);
        }
        progress.v = Math.min(Math.abs(ndx), 1);
        updateUi(progress.v > .5 ? nextIdx : current);
    });
    function endDrag() {
        if (!dragActive) return;
        dragActive = false;
        if (!dragDir) return;
        const target = nextIdx;
        if (progress.v > .35) {
            updateUi(target);
            tweenProgress(1, .45, () => {
                current = target;
                progress.v = 0;
            });
        } else {
            updateUi(current);
            tweenProgress(0, .35, () => {
                nextIdx = current;
            });
        }
        dragDir = 0;
    }
    stage.addEventListener("pointerup", endDrag);
    stage.addEventListener("pointercancel", endDrag);
    document.getElementById("mvClose")?.addEventListener("click", close);
    document.getElementById("mvPrev")?.addEventListener("click", () => goTo(-1));
    document.getElementById("mvNext")?.addEventListener("click", () => goTo(1));
    viewer.addEventListener("click", event => {
        if (event.target === viewer) close();
    });
    document.addEventListener("keydown", event => {
        if (!viewer.classList.contains("open")) return;
        if (event.key === "ArrowLeft") goTo(-1);
        if (event.key === "ArrowRight") goTo(1);
        if (event.key === "Escape") {
            event.preventDefault();
            close();
        }
    });
    function setItems(list) {
        items = list || [];
        textures.length = 0;
        if (!dotsEl) return;
        const many = items.length > 18;
        dotsEl.innerHTML = many ? "" : items.map((_, i) => `<button type="button" class="morph-slider-dot${i === 0 ? " is-active" : ""}" aria-label="Photo ${i + 1}"></button>`).join("");
        dotsEl.querySelectorAll(".morph-slider-dot").forEach((dot, i) => {
            dot.addEventListener("click", () => jumpTo(i));
        });
    }
    window.morphViewer = {
        open: open,
        close: close,
        setItems: setItems
    };
})();