// background.js (ES module)
// Particules OGL (si dispo) + fallback étoilé Canvas 2D + rubans

const defaultColors = ['#ffffff', '#ffffff', '#ffffff'];

function hexToRgb(hex) {
  hex = hex.replace(/^#/, '');
  if (hex.length === 3) hex = hex.split('').map(c => c + c).join('');
  const int = parseInt(hex, 16);
  const r = ((int >> 16) & 255) / 255;
  const g = ((int >> 8) & 255) / 255;
  const b = (int & 255) / 255;
  return [r, g, b];
}

const vertex = `
  attribute vec3 position;
  attribute vec4 random;
  attribute vec3 color;
  uniform mat4 modelMatrix;
  uniform mat4 viewMatrix;
  uniform mat4 projectionMatrix;
  uniform float uTime;
  uniform float uSpread;
  uniform float uBaseSize;
  uniform float uSizeRandomness;
  varying vec4 vRandom;
  varying vec3 vColor;
  void main() {
    vRandom = random;
    vColor = color;
    vec3 pos = position * uSpread;
    pos.z *= 10.0;
    vec4 mPos = modelMatrix * vec4(pos, 1.0);
    float t = uTime;
    mPos.x += sin(t * random.z + 6.28 * random.w) * mix(0.1, 1.5, random.x);
    mPos.y += sin(t * random.y + 6.28 * random.x) * mix(0.1, 1.5, random.w);
    mPos.z += sin(t * random.w + 6.28 * random.y) * mix(0.1, 1.5, random.z);
    vec4 mvPos = viewMatrix * mPos;
    if (uSizeRandomness == 0.0) {
      gl_PointSize = uBaseSize;
    } else {
      gl_PointSize = (uBaseSize * (1.0 + uSizeRandomness * (random.x - 0.5))) / length(mvPos.xyz);
    }
    gl_Position = projectionMatrix * mvPos;
  }
`;

const fragment = `
  precision highp float;
  uniform float uTime;
  uniform float uAlphaParticles;
  varying vec4 vRandom;
  varying vec3 vColor;
  void main() {
    vec2 uv = gl_PointCoord.xy;
    float d = length(uv - vec2(0.5));
    if(uAlphaParticles < 0.5) {
      if(d > 0.5) discard;
      gl_FragColor = vec4(vColor + 0.2 * sin(uv.yxx + uTime + vRandom.y * 6.28), 1.0);
    } else {
      float circle = smoothstep(0.5, 0.4, d) * 0.8;
      gl_FragColor = vec4(vColor + 0.2 * sin(uv.yxx + uTime + vRandom.y * 6.28), circle);
    }
  }
`;

function initParticlesOGL(ogl, options = {}) {
  const { Renderer, Camera, Geometry, Program, Mesh } = ogl;
  const container = document.getElementById('particles-container');
  if (!container) return () => {};

  const {
    particleCount = 220,
    particleSpread = 10,
    speed = 0.1,
    particleColors,
    moveParticlesOnHover = false,
    particleHoverFactor = 1,
    alphaParticles = false,
    particleBaseSize = 100,
    sizeRandomness = 1,
    cameraDistance = 20,
    disableRotation = false,
  } = options;

  const renderer = new Renderer({ depth: false, alpha: true });
  const gl = renderer.gl;
  container.appendChild(gl.canvas);
  gl.clearColor(0, 0, 0, 0);

  const camera = new Camera(gl, { fov: 15 });
  camera.position.set(0, 0, cameraDistance);

  const resize = () => {
    const width = container.clientWidth;
    const height = container.clientHeight;
    renderer.setSize(width, height);
    camera.perspective({ aspect: gl.canvas.width / gl.canvas.height });
  };
  window.addEventListener('resize', resize, false);
  resize();

  const mouse = { x: 0, y: 0 };
  const handleMouseMove = (e) => {
    const rect = container.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    const y = -(((e.clientY - rect.top) / rect.height) * 2 - 1);
    mouse.x = x; mouse.y = y;
  };
  if (moveParticlesOnHover) window.addEventListener('mousemove', handleMouseMove, { passive: true });

  const count = particleCount;
  const positions = new Float32Array(count * 3);
  const randoms = new Float32Array(count * 4);
  const colors = new Float32Array(count * 3);
  const palette = (particleColors && particleColors.length > 0) ? particleColors : defaultColors;

  for (let i = 0; i < count; i++) {
    let x, y, z, len;
    do {
      x = Math.random() * 2 - 1;
      y = Math.random() * 2 - 1;
      z = Math.random() * 2 - 1;
      len = x * x + y * y + z * z;
    } while (len > 1 || len === 0);
    const r = Math.cbrt(Math.random());
    positions.set([x * r, y * r, z * r], i * 3);
    randoms.set([Math.random(), Math.random(), Math.random(), Math.random()], i * 4);
    const col = hexToRgb(palette[Math.floor(Math.random() * palette.length)]);
    colors.set(col, i * 3);
  }

  const geometry = new Geometry(gl, {
    position: { size: 3, data: positions },
    random: { size: 4, data: randoms },
    color: { size: 3, data: colors },
  });

  const program = new Program(gl, {
    vertex,
    fragment,
    uniforms: {
      uTime: { value: 0 },
      uSpread: { value: particleSpread },
      uBaseSize: { value: particleBaseSize },
      uSizeRandomness: { value: sizeRandomness },
      uAlphaParticles: { value: alphaParticles ? 1 : 0 },
    },
    transparent: true,
    depthTest: false,
  });

  const particles = new Mesh(gl, { mode: gl.POINTS, geometry, program });

  let animationFrameId;
  let lastTime = performance.now();
  let elapsed = 0;

  const update = (t) => {
    animationFrameId = requestAnimationFrame(update);
    const delta = t - lastTime; lastTime = t; elapsed += delta * speed;
    program.uniforms.uTime.value = elapsed * 0.001;

    if (moveParticlesOnHover) {
      particles.position.x = -mouse.x * particleHoverFactor;
      particles.position.y = -mouse.y * particleHoverFactor;
    } else {
      particles.position.x = 0; particles.position.y = 0;
    }

    if (!disableRotation) {
      particles.rotation.x = Math.sin(elapsed * 0.0002) * 0.1;
      particles.rotation.y = Math.cos(elapsed * 0.0005) * 0.15;
      particles.rotation.z += 0.01 * speed;
    }

    renderer.render({ scene: particles, camera });
  };
  animationFrameId = requestAnimationFrame(update);

  return () => {
    window.removeEventListener('resize', resize);
    if (moveParticlesOnHover) window.removeEventListener('mousemove', handleMouseMove);
    cancelAnimationFrame(animationFrameId);
    if (container.contains(gl.canvas)) container.removeChild(gl.canvas);
  };
}

function initRibbons() {
  const ribbonsContainer = document.getElementById('ribbons-container');
  if (!ribbonsContainer) return () => {};
  if (window.RibbonsManager) {
    const mgr = new window.RibbonsManager(ribbonsContainer);
    const cleanup = () => mgr.destroy();
    window.addEventListener('beforeunload', cleanup);
    return () => {
      window.removeEventListener('beforeunload', cleanup);
      mgr.destroy();
    };
  }
  return () => {};
}

// Fallback simple: étoiles en Canvas 2D plein écran
function initStarfield2D() {
  const container = document.getElementById('particles-container');
  if (!container) return () => {};
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  container.appendChild(canvas);

  let width = 0, height = 0, dpr = Math.min(window.devicePixelRatio || 1, 2);
  function resize() {
    width = container.clientWidth;
    height = container.clientHeight;
    canvas.width = Math.max(1, Math.floor(width * dpr));
    canvas.height = Math.max(1, Math.floor(height * dpr));
    canvas.style.width = width + 'px';
    canvas.style.height = height + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  window.addEventListener('resize', resize);
  resize();

  const STAR_COUNT = Math.floor((width * height) / 8000) + 120;
  const stars = [];
  function randStar() {
    const x = Math.random() * width;
    const y = Math.random() * height;
    const z = Math.random() * 0.8 + 0.2; // profondeur
    const r = Math.random() * 1.2 + 0.3; // rayon de base
    const tw = Math.random() * 0.6 + 0.2; // vitesse de scintillement
    const p = Math.random() * Math.PI * 2;
    // vitesse de dérive selon profondeur (proche -> plus rapide)
    const vx = (Math.random() * 0.04 + 0.02) * (1.4 - z); // px/ms approx.
    const vy = (Math.random() * 0.02 + 0.005) * (1.4 - z);
    const dir = Math.random() < 0.5 ? -1 : 1;
    return { x, y, z, r, tw, p, vx: vx * dir, vy: vy * dir };
  }
  for (let i = 0; i < STAR_COUNT; i++) stars.push(randStar());

  let last = performance.now();
  function loop(t) {
    const dt = Math.min(40, t - last); last = t;
    ctx.clearRect(0, 0, width, height);

    // Léger gradient spatial pour éviter un noir plat
    const g = ctx.createLinearGradient(0, 0, 0, height);
    g.addColorStop(0, 'rgba(13,18,27,0.7)');
    g.addColorStop(1, 'rgba(10,14,20,0.7)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, width, height);

    // Étoiles
    for (const s of stars) {
      // mouvement doux
      s.x += s.vx * dt;
      s.y += s.vy * dt;
      // wrap horizontal/vertical
      if (s.x < -4) s.x = width + 4;
      if (s.x > width + 4) s.x = -4;
      if (s.y < -4) s.y = height + 4;
      if (s.y > height + 4) s.y = -4;

      s.p += s.tw * dt * 0.001;
      const glow = 0.6 + 0.4 * Math.sin(s.p);
      const size = s.r * (1.2 + 0.8 * (1 - s.z));
      ctx.beginPath();
      ctx.fillStyle = `rgba(255,255,255,${0.5 * glow})`;
      ctx.arc(s.x, s.y, size, 0, Math.PI * 2);
      ctx.fill();
      // halo doux
      const r2 = size * 3;
      const rg = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, r2);
      rg.addColorStop(0, `rgba(255,255,255,${0.12 * glow})`);
      rg.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = rg;
      ctx.beginPath(); ctx.arc(s.x, s.y, r2, 0, Math.PI * 2); ctx.fill();
    }

    // Masque noir pour la zone du héros (garder le menu noir)
    const hero = document.getElementById('home');
    if (hero) {
      const rect = hero.getBoundingClientRect();
      const bottom = Math.max(0, Math.min(height, rect.bottom));
      if (bottom > 0) {
        ctx.save();
        ctx.globalCompositeOperation = 'source-over';
        ctx.fillStyle = '#0b0f14';
        ctx.fillRect(0, 0, width, bottom);
        ctx.restore();
      }
    }

    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);

  return () => {
    window.removeEventListener('resize', resize);
    if (canvas.parentNode === container) container.removeChild(canvas);
  };
}

document.addEventListener('DOMContentLoaded', () => {
  const cleanups = [];

  (async () => {
    // 1) Tenter CDN ESM (CORS + MIME ok)
    try {
      const ogl = await import('https://esm.sh/ogl@0.0.111');
      cleanups.push(initParticlesOGL(ogl, {
        particleCount: 300,
        particleSpread: 10,
        speed: 0.12,
        particleColors: ['#ffffff'],
        moveParticlesOnHover: true,
        particleHoverFactor: 1.2,
        alphaParticles: true,
        particleBaseSize: 140,
        sizeRandomness: 1,
        cameraDistance: 22,
      }));
    } catch (_) {
      // 2) Tenter vendor local facultatif
      try {
        const ogl = await import('./vendor/ogl.mjs');
        cleanups.push(initParticlesOGL(ogl, {
          particleCount: 300,
          particleSpread: 10,
          speed: 0.12,
          particleColors: ['#ffffff'],
          moveParticlesOnHover: true,
          particleHoverFactor: 1.2,
          alphaParticles: true,
          particleBaseSize: 140,
          sizeRandomness: 1,
          cameraDistance: 22,
        }));
      } catch (e2) {
        // 3) Fallback 2D
        cleanups.push(initStarfield2D());
      }
    }

    // Rubans de curseur
    cleanups.push(initRibbons());

    // Masque noir dynamique pour la hauteur du héros (au-dessus des particules)
    const container = document.getElementById('particles-container');
    if (container) {
      const mask = document.createElement('div');
      mask.style.position = 'fixed';
      mask.style.left = '0';
      mask.style.top = '0';
      mask.style.width = '100%';
      mask.style.background = '#0b0f14';
      mask.style.pointerEvents = 'none';
      // placer le masque sous les rubans (qui sont au z-index 8)
      mask.style.zIndex = '2';
      container.appendChild(mask);

      const updateMask = () => {
        const hero = document.getElementById('home');
        if (!hero) { mask.style.height = '0px'; return; }
        const rect = hero.getBoundingClientRect();
        const h = Math.max(0, rect.bottom);
        mask.style.height = h + 'px';
      };
      updateMask();
      window.addEventListener('resize', updateMask);
      window.addEventListener('scroll', updateMask, { passive: true });
      cleanups.push(() => {
        window.removeEventListener('resize', updateMask);
        window.removeEventListener('scroll', updateMask);
        if (mask.parentNode === container) container.removeChild(mask);
      });
    }

    window.addEventListener('beforeunload', () => {
      cleanups.forEach(fn => { try { fn(); } catch(_) {} });
    });
  })();
});
