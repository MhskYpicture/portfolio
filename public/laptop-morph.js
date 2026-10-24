"use strict";

(function() {
    const VERT = `\nattribute vec2 position;\nattribute vec2 uv;\nvarying vec2 vUv;\nvoid main() {\n    vUv = uv;\n    gl_Position = vec4(position, 0.0, 1.0);\n}`;
    const FRAG = `\nprecision highp float;\nuniform sampler2D tCurrent;\nuniform sampler2D tNext;\nuniform vec2 uResolution;\nuniform vec2 uCurrentSize;\nuniform vec2 uNextSize;\nuniform float uProgress;\nuniform float uTime;\nuniform float uReduce;\nvarying vec2 vUv;\n\nfloat hash21(vec2 p) {\n    vec3 p3 = fract(vec3(p.xyx) * 0.1031);\n    p3 += dot(p3, p3.yzx + 33.33);\n    return fract((p3.x + p3.y) * p3.z);\n}\nfloat noise(vec2 p) {\n    vec2 i = floor(p);\n    vec2 f = fract(p);\n    vec2 u = f * f * (3.0 - 2.0 * f);\n    float a = hash21(i);\n    float b = hash21(i + vec2(1.0, 0.0));\n    float c = hash21(i + vec2(0.0, 1.0));\n    float d = hash21(i + vec2(1.0, 1.0));\n    return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);\n}\nfloat fbm(vec2 p) {\n    float v = 0.0;\n    float a = 0.5;\n    for (int i = 0; i < 5; i++) {\n        v += a * noise(p);\n        p *= 2.0;\n        a *= 0.5;\n    }\n    return v;\n}\nvec2 coverUV(vec2 uv, vec2 res, vec2 img) {\n    float rA = res.x / max(res.y, 1.0);\n    float iA = img.x / max(img.y, 1.0);\n    vec2 s = vec2(1.0);\n    float ratio = rA / max(iA, 0.0001);\n    if (ratio > 1.0) s.y = 1.0 / ratio;\n    else s.x = ratio;\n    return (uv - 0.5) * s + 0.5;\n}\nvoid main() {\n    float p = clamp(uProgress, 0.0, 1.0);\n    float env = sin(p * 3.14159265);\n    vec2 uv = vUv;\n    if (uReduce < 0.5) {\n        uv += vec2(sin(uTime * 0.22 + uv.y * 4.0), cos(uTime * 0.18 + uv.x * 4.0)) * 0.004;\n    }\n    vec2 uvC = uv;\n    vec2 uvN = uv;\n    float m = smoothstep(0.0, 1.0, p);\n    if (uReduce < 0.5) {\n        float nn = fbm(uv * 2.6 + uTime * 0.03);\n        float warp = fbm(uv * 4.2 - uTime * 0.02);\n        vec2 g = vec2(nn, warp) - 0.5;\n        uvC = uv + g * 0.34 * p;\n        uvN = uv - g * 0.34 * (1.0 - p);\n        m = smoothstep(nn - 0.16, nn + 0.16, p);\n    }\n    vec2 sC = coverUV(uvC, uResolution, uCurrentSize);\n    vec2 sN = coverUV(uvN, uResolution, uNextSize);\n    float ca = uReduce < 0.5 ? env * 0.012 : 0.0;\n    vec3 colC = vec3(\n        texture2D(tCurrent, sC + vec2(ca, 0.0)).r,\n        texture2D(tCurrent, sC).g,\n        texture2D(tCurrent, sC - vec2(ca, 0.0)).b\n    );\n    vec3 colN = vec3(\n        texture2D(tNext, sN + vec2(ca, 0.0)).r,\n        texture2D(tNext, sN).g,\n        texture2D(tNext, sN - vec2(ca, 0.0)).b\n    );\n    vec3 col = mix(colC, colN, m);\n    float vig = smoothstep(0.45, 0.95, length(uv - 0.5));\n    col = mix(col, vec3(0.02, 0.015, 0.012), vig * 0.18);\n    gl_FragColor = vec4(col, 1.0);\n}`;
    const HOLD = 2800;
    const MORPH = 1100;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let teardown = () => {};
    function mount(host, list) {
        teardown();
        teardown = () => {};
        if (!host) return;
        const empty = host.querySelector(".laptop-empty");
        const bar = host.querySelector(".laptop-progress");
        host.querySelectorAll(".laptop-canvas, .laptop-fallback").forEach(node => node.remove());
        host.classList.remove("is-playing");
        const items = (list || []).filter(item => item && item.src);
        const shell = host.closest(".computer");
        if (shell) shell.setAttribute("aria-label", items[0]?.title ? `Ordinateur, ${items[0].title}` : "Ordinateur");
        if (!items.length) {
            if (empty) empty.hidden = false;
            return;
        }
        if (empty) empty.hidden = true;
        const canvas = document.createElement("canvas");
        canvas.className = "laptop-canvas";
        host.appendChild(canvas);
        const gl = canvas.getContext("webgl", {
            antialias: true,
            premultipliedAlpha: false,
            alpha: false
        }) || canvas.getContext("experimental-webgl");
        if (!gl) {
            canvas.remove();
            mountFallback(host, items, bar, shell);
            return;
        }
        function compile(type, src) {
            const sh = gl.createShader(type);
            gl.shaderSource(sh, src);
            gl.compileShader(sh);
            if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) return null;
            return sh;
        }
        const vs = compile(gl.VERTEX_SHADER, VERT);
        const fs = compile(gl.FRAGMENT_SHADER, FRAG);
        if (!vs || !fs) {
            canvas.remove();
            mountFallback(host, items, bar, shell);
            return;
        }
        const prog = gl.createProgram();
        gl.attachShader(prog, vs);
        gl.attachShader(prog, fs);
        gl.linkProgram(prog);
        if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
            canvas.remove();
            mountFallback(host, items, bar, shell);
            return;
        }
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
        [ "tCurrent", "tNext", "uResolution", "uCurrentSize", "uNextSize", "uProgress", "uTime", "uReduce" ].forEach(name => {
            U[name] = gl.getUniformLocation(prog, name);
        });
        gl.uniform1f(U.uReduce, reduced ? 1 : 0);
        function makeTexture(image) {
            const tex = gl.createTexture();
            gl.bindTexture(gl.TEXTURE_2D, tex);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
            gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
            if (image) gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image); else gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([ 20, 18, 16, 255 ]));
            return tex;
        }
        const textures = items.map(() => ({
            tex: makeTexture(null),
            size: [ 1, 1 ],
            ready: false
        }));
        let current = 0;
        let nextIdx = 0;
        let progress = 0;
        let animating = false;
        let rafId = 0;
        let timer = 0;
        let onScreen = true;
        let alive = true;
        items.forEach((item, i) => {
            const img = new Image;
            img.crossOrigin = "anonymous";
            img.onload = () => {
                if (!alive) return;
                try {
                    textures[i].tex = makeTexture(img);
                    textures[i].size = [ img.naturalWidth || 1, img.naturalHeight || 1 ];
                    textures[i].ready = true;
                } catch {}
            };
            img.src = item.src;
        });
        function resize() {
            const dpr = Math.min(window.devicePixelRatio || 1, 2);
            const w = Math.max(1, Math.round(host.offsetWidth * dpr));
            const h = Math.max(1, Math.round(host.offsetHeight * dpr));
            if (canvas.width !== w || canvas.height !== h) {
                canvas.width = w;
                canvas.height = h;
            }
            gl.viewport(0, 0, canvas.width, canvas.height);
            gl.uniform2f(U.uResolution, canvas.width, canvas.height);
        }
        function draw(t) {
            if (!alive) return;
            const cur = textures[current];
            const nxt = textures[nextIdx] || cur;
            gl.uniform1f(U.uTime, t * .001);
            gl.uniform1f(U.uProgress, progress);
            gl.activeTexture(gl.TEXTURE0);
            gl.bindTexture(gl.TEXTURE_2D, cur.tex);
            gl.uniform1i(U.tCurrent, 0);
            gl.activeTexture(gl.TEXTURE1);
            gl.bindTexture(gl.TEXTURE_2D, nxt.tex);
            gl.uniform1i(U.tNext, 1);
            gl.uniform2fv(U.uCurrentSize, cur.size);
            gl.uniform2fv(U.uNextSize, nxt.size);
            gl.drawArrays(gl.TRIANGLES, 0, 3);
        }
        function loop(t) {
            if (!alive || !onScreen || document.hidden) {
                rafId = 0;
                return;
            }
            draw(t);
            rafId = requestAnimationFrame(loop);
        }
        function wake() {
            if (!rafId && alive && onScreen && !document.hidden) rafId = requestAnimationFrame(loop);
        }
        function armBar() {
            if (!bar || reduced || items.length < 2) return;
            host.classList.add("is-playing");
            bar.style.animation = "none";
            void bar.offsetWidth;
            bar.style.animation = `laptopPlay ${HOLD + MORPH}ms linear forwards`;
        }
        function label(index) {
            if (!shell) return;
            const title = items[index]?.title;
            shell.setAttribute("aria-label", title ? `Ordinateur, ${title}` : "Ordinateur");
        }
        function afterMorph() {
            current = nextIdx;
            progress = 0;
            animating = false;
            label(current);
            schedule();
        }
        function tween() {
            animating = true;
            const start = performance.now();
            const dur = reduced ? 180 : MORPH;
            (function step(now) {
                if (!alive) return;
                const t = Math.min(1, (now - start) / dur);
                const e = t < .5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
                progress = e;
                if (t < 1) requestAnimationFrame(step); else afterMorph();
            })(start);
        }
        function goNext() {
            if (!alive || animating || items.length < 2) return;
            nextIdx = (current + 1) % items.length;
            progress = 0;
            tween();
        }
        function schedule() {
            window.clearTimeout(timer);
            if (!alive || items.length < 2 || !onScreen || document.hidden) return;
            armBar();
            timer = window.setTimeout(goNext, reduced ? 4200 : HOLD);
        }
        const onResize = () => resize();
        window.addEventListener("resize", onResize);
        const ro = "ResizeObserver" in window ? new ResizeObserver(onResize) : null;
        if (ro) ro.observe(host);
        const io = "IntersectionObserver" in window ? new IntersectionObserver(entries => {
            onScreen = entries.some(entry => entry.isIntersecting);
            if (onScreen) {
                wake();
                schedule();
            } else window.clearTimeout(timer);
        }, {
            threshold: .08
        }) : null;
        if (io) io.observe(host);
        const onVis = () => {
            if (document.hidden) {
                window.clearTimeout(timer);
                if (rafId) cancelAnimationFrame(rafId);
                rafId = 0;
            } else {
                wake();
                schedule();
            }
        };
        document.addEventListener("visibilitychange", onVis);
        resize();
        wake();
        if (items.length > 1) schedule();
        teardown = () => {
            alive = false;
            window.clearTimeout(timer);
            if (rafId) cancelAnimationFrame(rafId);
            window.removeEventListener("resize", onResize);
            document.removeEventListener("visibilitychange", onVis);
            if (ro) ro.disconnect();
            if (io) io.disconnect();
            const lose = gl.getExtension("WEBGL_lose_context");
            if (lose) lose.loseContext();
        };
    }
    function mountFallback(host, items, bar, shell) {
        const img = document.createElement("img");
        img.className = "laptop-fallback";
        img.alt = "";
        img.src = items[0].src;
        host.appendChild(img);
        if (items.length < 2) return;
        let index = 0;
        const arm = () => {
            if (!bar || reduced) return;
            host.classList.add("is-playing");
            bar.style.animation = "none";
            void bar.offsetWidth;
            bar.style.animation = `laptopPlay ${HOLD + MORPH}ms linear forwards`;
        };
        arm();
        const timer = window.setInterval(() => {
            index = (index + 1) % items.length;
            img.src = items[index].src;
            if (shell) {
                const title = items[index].title;
                shell.setAttribute("aria-label", title ? `Ordinateur, ${title}` : "Ordinateur");
            }
            arm();
        }, reduced ? 4200 : HOLD + MORPH);
        const prev = teardown;
        teardown = () => {
            prev();
            window.clearInterval(timer);
        };
    }
    window.mountLaptopMorph = mount;
})();