import { useEffect, useRef } from 'react';

/*
  Bicicleta de la portada que se deshace en cubos al bajar (efecto «remolino»).
  El avance del scroll dentro de la portada (0 a 1) decide en qué punto va la animación,
  así que al subir la bici se vuelve a armar. Se dibuja con WebGL 2: la tarjeta gráfica
  calcula dónde va cada cubo, por eso aguanta miles de cubos de 3 px sin trabarse.

  - hueco: el elemento que marca dónde va la bici (el CSS decide su tamaño y posición).
  - portada: la sección que da el recorrido del scroll.
  - onListo(true|false): avisa si el efecto pudo arrancar; si no, se muestra la foto normal.
*/

const LADO = 3;                       // tamaño de cada cubo en px
const A0 = 0.06, AW = 0.30;           // la ola que vuelve la foto cubos va de A0 a A0+AW del recorrido
const ESPERA = 0.09;                  // lo que espera cada cubo antes de soltarse
const UMBRAL = 0.22;                  // cuánta bici debe haber en una celda para que salga un cubo
const POR_CUBO = 16;                  // números que se guardan por cada cubo

// Cada cubo sabe dónde nació, su color y unos números al azar; con eso y el avance (uP)
// calcula aquí mismo dónde está y cómo gira.
const VS_CUBO = `#version 300 es
precision highp float;
layout(location=0) in vec3 aPos;
layout(location=1) in vec3 aNormal;
layout(location=2) in vec2 aOrigen;
layout(location=3) in vec3 aColor;
layout(location=4) in vec2 aTiempo;
layout(location=5) in vec4 aAzar;
layout(location=6) in vec4 aAzar2;
layout(location=7) in float aZ0;
uniform vec2 uTam;
uniform vec4 uCaja;
uniform float uP, uLado;
uniform int uPase;
out vec4 vColor;
const float POP = 0.035, GIRO = 0.06, DUR = 0.40, FOCO = 900.0, DESTELLO = 0.35;
const float TAU = 6.2831853, PI = 3.14159265;
const vec3 LUZ = normalize(vec3(-0.35, -0.75, 0.55));
mat3 girar(vec3 r) {
    float cx = cos(r.x), sx = sin(r.x), cy = cos(r.y), sy = sin(r.y), cz = cos(r.z), sz = sin(r.z);
    return mat3(cz * cy, sz * cy, -sy,
                cz * sy * sx - sz * cx, sz * sy * sx + cz * cx, cy * sx,
                cz * sy * cx + sz * sx, sz * sy * cx - cz * sx, cy * cx);
}
void main() {
    float a = aTiempo.x, d = aTiempo.y;
    float r1 = aAzar.x, r2 = aAzar.y, r3 = aAzar.z, r5 = aAzar2.x, r6 = aAzar2.y;
    float rx0 = aAzar2.z, ry0 = aAzar2.w;
    vec3 pos = vec3(aOrigen, 0.0), rot = vec3(0.0);
    float alfa = 1.0, esc = 1.0, claro = 0.0;
    float t = (uP - d) / DUR;
    if (t <= 0.0) {
        // en su sitio: aparece de frente, con un destello, y gira hasta mostrar tres caras
        float f = max(0.0, 1.0 - (uP - a) / POP);
        float g0 = min(1.0, (uP - a) / GIRO), g = g0 * g0 * (3.0 - 2.0 * g0);
        pos.z = aZ0 * g;
        rot = vec3(rx0 * g, ry0 * g, 0.0);
        esc = 1.0 + 0.32 * f;
        claro = f * DESTELLO;
    } else {
        // remolino: gira alrededor del eje vertical de la bici, sube en espiral y se desvanece arriba
        t = min(t, 1.0);
        float eje = uCaja.x + uCaja.z * 0.5;
        float dx = aOrigen.x - eje, r0 = abs(dx), f0 = dx >= 0.0 ? 0.0 : PI;
        float e = t * t * (3.0 - 2.0 * t);
        float r = r0 + (24.0 + r1 * 72.0 - r0) * e;
        float vueltas = (1.4 + r2 * 1.6) * TAU * (0.35 * t + 0.65 * t * t);
        float fi = f0 + vueltas;
        pos = vec3(eje + r * cos(fi),
                   aOrigen.y + (-40.0 - aOrigen.y) * pow(t, 1.7) + sin(t * 9.0 + r3 * TAU) * 10.0 * t,
                   r * sin(fi));
        rot = vec3((2.0 + r5 * 5.0) * t + rx0, vueltas + r6 * 4.0 * t + ry0, (r3 - 0.5) * 5.0 * t);
        alfa = t < 0.6 ? 1.0 : 1.0 - (t - 0.6) / 0.4;
        esc = 1.0 - 0.45 * t;
        pos.z += aZ0 * (1.0 - t);
        alfa *= 1.0 - 0.4 * clamp((-pos.z - 40.0) / 380.0, 0.0, 1.0);
    }
    mat3 R = girar(rot);
    vec3 n = R * aNormal;
    vec2 centro = uTam * 0.5;
    bool macizo = alfa >= 0.999;
    bool fuera = uP <= a || alfa <= 0.01
        || (uPase == 0 && !macizo) || (uPase == 1 && macizo)
        || dot(n, vec3(centro - pos.xy, FOCO - pos.z)) < 0.0;
    if (fuera) { gl_Position = vec4(2.0, 2.0, 2.0, 1.0); vColor = vec4(0.0); return; }
    vec3 w = pos + R * (aPos * uLado * 0.46 * esc);
    float z = min(w.z, FOCO * 0.8), k = FOCO / (FOCO - z);
    vec2 s = centro + (w.xy - centro) * k;
    gl_Position = vec4(s.x / uTam.x * 2.0 - 1.0, 1.0 - s.y / uTam.y * 2.0, -z / 1500.0, 1.0);
    float brillo = 0.62 + 0.68 * max(0.0, dot(n, LUZ));
    vec3 color = min(vec3(1.0), mix(aColor, vec3(1.0), claro) * brillo);
    vColor = vec4(color * alfa, alfa);
}`;

const FS_COLOR = `#version 300 es
precision mediump float;
in vec4 vColor;
out vec4 o;
void main() { o = vColor; }`;

// La foto: se pinta completa y se le abren huecos en las celdas por donde ya pasó la ola.
const VS_FOTO = `#version 300 es
precision highp float;
layout(location=0) in vec2 aQ;
uniform vec2 uTam;
uniform vec4 uCaja;
out vec2 vUv;
out vec2 vPx;
void main() {
    vUv = aQ;
    vPx = aQ * uCaja.zw;
    vec2 s = uCaja.xy + vPx;
    gl_Position = vec4(s.x / uTam.x * 2.0 - 1.0, 1.0 - s.y / uTam.y * 2.0, 0.0, 1.0);
}`;

const FS_FOTO = `#version 300 es
precision highp float;
uniform sampler2D uFoto, uCeldas;
uniform vec2 uRejilla;
uniform float uLado, uP, uA0, uAW;
in vec2 vUv;
in vec2 vPx;
out vec4 o;
void main() {
    vec2 celda = floor(vPx / uLado);
    float a = uA0 + uAW * texture(uCeldas, (celda + 0.5) / uRejilla).r;
    if (uP > a) discard;
    o = texture(uFoto, vUv);
}`;

// Azar repetible: con la misma semilla los cubos siempre salen igual al subir y bajar.
function azar(semilla) {
    let s = semilla | 0;
    return () => {
        s = (s + 0x6D2B79F5) | 0;
        let t = Math.imul(s ^ (s >>> 15), 1 | s);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}


const cuadroSiguiente = () => new Promise((r) => requestAnimationFrame(r));
const ALCANCE = 110;                  // ms: qué tan rápido alcanza el efecto un scroll que ya iba adelantado

/* Compila los programas de la tarjeta gráfica. Si el navegador lo permite
   (KHR_parallel_shader_compile), la compilación corre aparte y aquí solo se pregunta
   cada cuadro si ya terminó, en vez de dejar la página congelada esperándola. */
async function programas(gl, pares) {
    const paralelo = gl.getExtension('KHR_parallel_shader_compile');
    const lista = pares.map(([fuenteV, fuenteF]) => {
        const p = gl.createProgram();
        for (const [fuente, tipo] of [[fuenteV, gl.VERTEX_SHADER], [fuenteF, gl.FRAGMENT_SHADER]]) {
            const sh = gl.createShader(tipo);
            gl.shaderSource(sh, fuente);
            gl.compileShader(sh);
            gl.attachShader(p, sh);
        }
        gl.linkProgram(p);
        return p;
    });
    if (paralelo) {
        while (!lista.every((p) => gl.getProgramParameter(p, paralelo.COMPLETION_STATUS_KHR))) {
            await cuadroSiguiente();
            if (gl.isContextLost()) throw new Error('contexto perdido');
        }
    }
    return lista.map((p) => {
        if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p));
        const u = {};
        for (let i = 0, n = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS); i < n; i++) {
            const nombre = gl.getActiveUniform(p, i).name;
            u[nombre] = gl.getUniformLocation(p, nombre);
        }
        return { p, u };
    });
}

function textura(gl, filtro) {
    const t = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, t);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, filtro);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, filtro);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    return t;
}

export default function BiciCubos({ src, hueco, portada, onListo }) {
    const lienzoRef = useRef(null);
    const avisar = useRef(onListo);
    avisar.current = onListo;

    useEffect(() => {
        const lienzo = lienzoRef.current;
        const stage = lienzo?.parentElement;
        if (!lienzo || !stage || !hueco.current || !portada.current) return undefined;
        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined;

        let vivo = true, cuadro = 0, listo = false;
        let gl = null, pCubo, pFoto, vaoCubo, vaoFoto, tablaCubos, texCeldas, foto = null;
        let W = 0, H = 0, ix = 0, iy = 0, iw = 0, ih = 0, cols = 0, rows = 0, nCubos = 0;
        // p: hasta dónde se ha bajado; pv: lo que se está mostrando. Son iguales, salvo cuando el
        // efecto arranca con la página ya bajada: ahí pv alcanza a p en unos cuadros en vez de saltar.
        let p = 0, pv = 0, alcanzar = false, antes = 0;
        let bajo = null;
        const primerScroll = new Promise((r) => { bajo = r; });
        let cajaArmada = '';
        const pequeno = document.createElement('canvas');   // la foto reducida a una celda por píxel

        /* Parte la foto en una rejilla; cada celda con suficiente bici se vuelve un cubo con el
           color promedio de ese pedazo. El promedio lo saca el navegador al reducir la foto
           (una celda = un píxel), así no hay que recorrer los 580.000 píxeles a mano. */
        function armar() {
            const L = LADO, rnd = azar(7);
            cols = Math.ceil(iw / L);
            rows = Math.ceil(ih / L);
            pequeno.width = cols;
            pequeno.height = rows;
            const cx = pequeno.getContext('2d', { willReadFrequently: true });
            cx.clearRect(0, 0, cols, rows);
            cx.imageSmoothingEnabled = true;
            cx.imageSmoothingQuality = 'high';
            // cada celda mide L px en pantalla: la foto se reduce a (iw/L × ih/L) y se ajusta a la rejilla
            cx.drawImage(foto.bmp, 0, 0, iw / L, ih / L);
            const d = cx.getImageData(0, 0, cols, rows).data;

            const celdas = new Uint8Array(cols * rows);
            const datos = new Float32Array(cols * rows * POR_CUBO);
            let n = 0;
            for (let r = 0; r < rows; r++) {
                for (let c = 0; c < cols; c++) {
                    // la ola entra de arriba hacia abajo
                    const u = r / (rows - 1 || 1);
                    const orden = Math.round(Math.min(1, Math.max(0, u * 0.86 + rnd() * 0.14)) * 255);
                    celdas[r * cols + c] = orden;
                    const a = A0 + AW * orden / 255;
                    const r1 = rnd(), r2 = rnd(), r3 = rnd(), r4 = rnd(), r5 = rnd(), r6 = rnd(), r7 = rnd(), r8 = rnd(), r9 = rnd(), r10 = rnd();
                    const i = (r * cols + c) * 4;
                    if (d[i + 3] / 255 < UMBRAL) continue;
                    datos.set([
                        ix + (c + 0.5) * L, iy + (r + 0.5) * L,
                        d[i] / 255, d[i + 1] / 255, d[i + 2] / 255,
                        a, a + ESPERA + r1 * 0.07,
                        r2, r3, r4, r5,
                        r6, r7,
                        -0.44 + (r8 - 0.5) * 0.24, 0.6 + (r9 - 0.5) * 0.3,
                        (r10 - 0.5) * L * 1.5
                    ], n * POR_CUBO);
                    n++;
                }
            }
            nCubos = n;
            gl.bindBuffer(gl.ARRAY_BUFFER, tablaCubos);
            gl.bufferData(gl.ARRAY_BUFFER, datos.subarray(0, n * POR_CUBO), gl.STATIC_DRAW);
            gl.bindTexture(gl.TEXTURE_2D, texCeldas);
            gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.R8, cols, rows, 0, gl.RED, gl.UNSIGNED_BYTE, celdas);
        }

        // mide el escenario y el hueco de la bici (la foto va contenida y apoyada abajo);
        // solo rehace el lienzo o los cubos si de verdad cambió algo
        function medir() {
            if (!listo) return;
            const r = stage.getBoundingClientRect(), s = hueco.current?.getBoundingClientRect();
            if (!s?.width) return;
            W = r.width;
            H = r.height;
            const dpr = Math.min(window.devicePixelRatio || 1, 2);
            const lw = Math.round(W * dpr), lh = Math.round(H * dpr);
            if (lienzo.width !== lw || lienzo.height !== lh) { lienzo.width = lw; lienzo.height = lh; }
            const k = Math.min(s.width / foto.w, s.height / foto.h);
            iw = Math.round(foto.w * k);
            ih = Math.round(foto.h * k);
            ix = Math.round(s.left - r.left + (s.width - iw) / 2);
            iy = Math.round(s.top - r.top + s.height - ih);
            const caja = `${ix},${iy},${iw},${ih}`;
            if (caja !== cajaArmada) { cajaArmada = caja; armar(); }
        }

        function pintar(ahora) {
            cuadro = 0;
            if (!listo) return;
            let seguir = false;
            if (alcanzar) {
                const dt = Math.min(64, Math.max(0, (ahora ?? performance.now()) - antes));
                antes = ahora ?? performance.now();
                pv += (p - pv) * (1 - Math.exp(-dt / ALCANCE));
                if (Math.abs(p - pv) < 0.001) { pv = p; alcanzar = false; } else seguir = true;
            } else pv = p;
            gl.viewport(0, 0, lienzo.width, lienzo.height);
            gl.depthMask(true);
            gl.clearColor(0, 0, 0, 0);
            gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
            // la sombra del piso se va cuando la bici se deshace
            hueco.current?.style.setProperty('--sombra', (1 - Math.min(1, Math.max(0, (pv - A0) / (AW + ESPERA + 0.12)))).toFixed(3));
            gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);

            // 1) la foto, con huecos donde la ola ya pasó
            if (pv < A0 + AW) {
                gl.useProgram(pFoto.p);
                gl.disable(gl.DEPTH_TEST);
                gl.enable(gl.BLEND);
                gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, foto.tex);
                gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, texCeldas);
                gl.uniform1i(pFoto.u.uFoto, 0);
                gl.uniform1i(pFoto.u.uCeldas, 1);
                gl.uniform2f(pFoto.u.uTam, W, H);
                gl.uniform4f(pFoto.u.uCaja, ix, iy, iw, ih);
                gl.uniform2f(pFoto.u.uRejilla, cols, rows);
                gl.uniform1f(pFoto.u.uLado, LADO);
                gl.uniform1f(pFoto.u.uP, pv);
                gl.uniform1f(pFoto.u.uA0, A0);
                gl.uniform1f(pFoto.u.uAW, AW);
                gl.bindVertexArray(vaoFoto);
                gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
            }

            // 2) los cubos: primero los macizos y después los que se desvanecen, mezclados encima
            if (pv > A0 && nCubos) {
                gl.useProgram(pCubo.p);
                gl.uniform2f(pCubo.u.uTam, W, H);
                gl.uniform4f(pCubo.u.uCaja, ix, iy, iw, ih);
                gl.uniform1f(pCubo.u.uP, pv);
                gl.uniform1f(pCubo.u.uLado, LADO);
                gl.bindVertexArray(vaoCubo);
                gl.enable(gl.DEPTH_TEST);
                gl.depthFunc(gl.LEQUAL);
                gl.disable(gl.BLEND);
                gl.uniform1i(pCubo.u.uPase, 0);
                gl.drawArraysInstanced(gl.TRIANGLES, 0, 36, nCubos);
                gl.enable(gl.BLEND);
                gl.depthMask(false);
                gl.uniform1i(pCubo.u.uPase, 1);
                gl.drawArraysInstanced(gl.TRIANGLES, 0, 36, nCubos);
                gl.depthMask(true);
            }
            gl.bindVertexArray(null);
            if (seguir) pedir();
        }
        const pedir = () => { if (!cuadro) cuadro = requestAnimationFrame(pintar); };

        // el scroll manda: el avance es cuánto se ha bajado dentro de la portada.
        // Si no cambió (por ejemplo, ya se pasó la portada), no se vuelve a pintar.
        function alScroll() {
            const el = portada.current;
            if (!el) return;
            if (!listo) { if (el.getBoundingClientRect().top < 0) bajo?.(); return; }
            const max = Math.max(1, el.offsetHeight - window.innerHeight);
            const np = Math.min(1, Math.max(0, -el.getBoundingClientRect().top / max));
            if (np !== p) { p = np; pedir(); }
        }
        // varios avisos de tamaño seguidos (carga de fuentes, arrastrar la ventana) se juntan en uno por cuadro
        let medicion = 0;
        const alCambiarTam = () => {
            if (medicion) return;
            medicion = requestAnimationFrame(() => { medicion = 0; medir(); alScroll(); pedir(); });
        };

        window.addEventListener('scroll', alScroll, { passive: true });
        window.addEventListener('resize', alCambiarTam);
        const ro = 'ResizeObserver' in window ? new ResizeObserver(alCambiarTam) : null;
        ro?.observe(hueco.current);
        // si el navegador le quita la tarjeta gráfica a la página, vuelve la foto normal
        const perdido = (ev) => { ev.preventDefault(); listo = false; avisar.current?.(false); };
        lienzo.addEventListener('webglcontextlost', perdido);

        /* Arranque: la foto (descargada y decodificada fuera del hilo principal) y los programas de la
           tarjeta gráfica se preparan al tiempo, mientras la bici hace su entrada. Mientras tanto se ve
           la foto normal, idéntica. */
        (async () => {
            const entradas = [...(hueco.current?.getAnimations?.() || []), ...(lienzo.getAnimations?.() || [])];
            const entrada = Promise.all(entradas.map((a) => a.finished.catch(() => {})));
            const cargarFoto = fetch(src)
                .then((r) => r.blob())
                .then((blob) => createImageBitmap(blob, { premultiplyAlpha: 'premultiply' }));

            gl = lienzo.getContext('webgl2', { antialias: true, alpha: true, premultipliedAlpha: true });
            if (!gl) { cargarFoto.then((b) => b.close(), () => {}); return; }
            const [bmp, progs] = await Promise.all([cargarFoto, programas(gl, [[VS_CUBO, FS_COLOR], [VS_FOTO, FS_FOTO]])]);
            if (!vivo) { bmp.close(); return; }
            [pCubo, pFoto] = progs;

            // un cubo: 6 caras, 2 triángulos por cara, cada esquina con la dirección de su cara
            const molde = [];
            for (let eje = 0; eje < 3; eje++) {
                for (const signo of [-1, 1]) {
                    const e1 = (eje + 1) % 3, e2 = (eje + 2) % 3;
                    for (const [u, v] of [[-1, -1], [1, -1], [1, 1], [-1, -1], [1, 1], [-1, 1]]) {
                        const pos = [0, 0, 0], nor = [0, 0, 0];
                        pos[eje] = signo; pos[e1] = u; pos[e2] = v; nor[eje] = signo;
                        molde.push(...pos, ...nor);
                    }
                }
            }
            vaoCubo = gl.createVertexArray();
            gl.bindVertexArray(vaoCubo);
            gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
            gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(molde), gl.STATIC_DRAW);
            gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 24, 0);
            gl.enableVertexAttribArray(1); gl.vertexAttribPointer(1, 3, gl.FLOAT, false, 24, 12);
            // los datos de cada cubo avanzan una fila por cubo, no por esquina
            tablaCubos = gl.createBuffer();
            gl.bindBuffer(gl.ARRAY_BUFFER, tablaCubos);
            [[2, 2, 0], [3, 3, 2], [4, 2, 5], [5, 4, 7], [6, 4, 11], [7, 1, 15]].forEach(([lugar, cuantos, desde]) => {
                gl.enableVertexAttribArray(lugar);
                gl.vertexAttribPointer(lugar, cuantos, gl.FLOAT, false, POR_CUBO * 4, desde * 4);
                gl.vertexAttribDivisor(lugar, 1);
            });
            vaoFoto = gl.createVertexArray();
            gl.bindVertexArray(vaoFoto);
            gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
            gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([0, 0, 1, 0, 0, 1, 1, 1]), gl.STATIC_DRAW);
            gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
            gl.bindVertexArray(null);
            texCeldas = textura(gl, gl.NEAREST);

            const tex = textura(gl, gl.LINEAR);
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, bmp);
            foto = { w: bmp.width, h: bmp.height, bmp, tex };

            // se espera a que la bici termine de entrar (para medirla quieta); pero si ya se bajó,
            // la entrada se termina de una vez para que el efecto arranque sin hacer esperar
            if (portada.current && portada.current.getBoundingClientRect().top < 0) bajo();
            await Promise.race([entrada, primerScroll]);
            if (!vivo) return;
            entradas.forEach((a) => { try { a.finish(); } catch { /* ya terminó */ } });

            listo = true;
            p = -1;            // fuerza el primer dibujo
            medir();
            alScroll();
            pv = 0;            // si ya se había bajado, el efecto alcanza esa posición en vez de saltar
            alcanzar = p > 0.001;
            antes = performance.now();
            pintar();
            await cuadroSiguiente();
            if (vivo && listo) avisar.current?.(true);
        })().catch(() => { if (vivo) avisar.current?.(false); });

        return () => {
            vivo = false;
            listo = false;
            cancelAnimationFrame(cuadro);
            cancelAnimationFrame(medicion);
            window.removeEventListener('scroll', alScroll);
            window.removeEventListener('resize', alCambiarTam);
            ro?.disconnect();
            lienzo.removeEventListener('webglcontextlost', perdido);
            hueco.current?.style.removeProperty('--sombra');
            foto?.bmp.close();
            // no se suelta el contexto a la fuerza: React en desarrollo monta dos veces el mismo lienzo
            avisar.current?.(false);
        };
    }, [src, hueco, portada]);

    return <canvas ref={lienzoRef} className="hero-cubos" aria-hidden="true" />;
}
