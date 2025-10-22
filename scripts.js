// /////// UTILITAIRES \\\\ 
const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const clamp = (n, min, max) => Math.max(min, Math.min(max, n));

document.addEventListener('DOMContentLoaded', () => {
  // Année footer
  const yearEl = document.getElementById('year');
  if (yearEl) yearEl.textContent = String(new Date().getFullYear());

  // Révélations au scroll
  setupReveal();

  // Parallaxe
  setupParallax();
  
  // Tech loop parallaxe
  setupTechLoopParallax();

  // Tilt cartes
  setupTilt();

  // Canvas FX
  if (!prefersReduced) initFxCanvas();
  else enableStaticBackdrop();
});

// /////// REVEAL AU SCROLL \\\\ 
function setupReveal() {
  const revealEls = Array.from(document.querySelectorAll('.reveal-up, .reveal-fade'));
  if (revealEls.length === 0) return;
  
  const io = new IntersectionObserver((entries) => {
    for (const e of entries) {
      if (e.isIntersecting) {
        e.target.classList.add('is-visible');
      } else {
        e.target.classList.remove('is-visible');
      }
    }
  }, { rootMargin: '0px 0px -10% 0px', threshold: 0.05 });
  
  revealEls.forEach(el => io.observe(el));
  
  // Gestion spéciale pour la section À propos
  setupAboutSectionAnimation();
}

// /////// ANIMATION SECTION À PROPOS \\\\ 
function setupAboutSectionAnimation() {
  const aboutCard = document.querySelector('.about-electric-card');
  const aboutTexts = document.querySelectorAll('.about-text p');
  const aboutSection = document.querySelector('#about');
  
  if (!aboutCard || aboutTexts.length === 0 || !aboutSection) return;
  
  const aboutObserver = new IntersectionObserver((entries) => {
    for (const e of entries) {
      if (e.isIntersecting) {
        aboutCard.classList.add('is-visible');
        aboutTexts.forEach((text, index) => {
          setTimeout(() => {
            text.classList.add('is-visible');
          }, index * 200);
        });
      } else {
        aboutCard.classList.remove('is-visible');
        aboutTexts.forEach(text => text.classList.remove('is-visible'));
      }
    }
  }, { rootMargin: '0px 0px -20% 0px', threshold: 0.1 });
  
  aboutObserver.observe(aboutCard);
  
  // Gestion du masquage quand on est dans le Hero
  setupHeroVisibility();
}

// /////// MASQUAGE SECTION À PROPOS DANS LE HERO \\\\ 
function setupHeroVisibility() {
  const heroSection = document.querySelector('#home');
  const aboutSection = document.querySelector('#about');
  
  if (!heroSection || !aboutSection) return;
  
  const heroObserver = new IntersectionObserver((entries) => {
    for (const e of entries) {
      if (e.isIntersecting) {
        aboutSection.style.opacity = '0';
        aboutSection.style.visibility = 'hidden';
        aboutSection.style.transform = 'translateY(40px) scale(0.95)';
        aboutSection.style.transition = 'opacity 0.6s ease, visibility 0.6s ease, transform 0.6s ease';
      } else {
        aboutSection.style.opacity = '1';
        aboutSection.style.visibility = 'visible';
        aboutSection.style.transform = 'translateY(0) scale(1)';
      }
    }
  }, { rootMargin: '0px 0px -50% 0px', threshold: 0.5 });
  
  heroObserver.observe(heroSection);
}

// /////// PARALLAXE \\\\ 
function setupParallax() {
  const layers = Array.from(document.querySelectorAll('[data-parallax]'));
  if (layers.length === 0) return;
  const onScroll = () => {
    const y = window.scrollY;
    for (const el of layers) {
      const speed = parseFloat(el.getAttribute('data-speed') || '0.2');
      el.style.transform = `translate3d(0, ${y * speed * -0.15}px, 0)`;
    }
  };
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });
}

// /////// TECH LOOP PARALLAXE \\ 
function setupTechLoopParallax() {
  const techLoop = document.querySelector('.tech-loop');
  if (!techLoop) return;
  
  // Utiliser 2 copies (gauche/droite) pour la boucle infinie
  const originalContent = techLoop.innerHTML;
  techLoop.innerHTML = originalContent + originalContent;
  
  // Désactiver l'animation CSS
  techLoop.style.animation = 'none';
  
  let offset = 0; // offset positif
  let lastScrollY = window.scrollY;
  let isScrolling = false;
  let scrollTimeout;
  
  // Initialiser au centre (au début de la première copie visible)
  const initPosition = () => {
    const copyWidth = techLoop.scrollWidth / 2;
    if (copyWidth > 0) {
      offset = 0; // partir du début et défiler vers la gauche
      return true;
    }
    return false;
  };
  
  // Tente d'initialiser plusieurs fois au cas où le layout n'est pas prêt immédiatement
  let tries = 0;
  const tryInit = () => {
    if (initPosition() || tries > 10) return;
    tries++;
    setTimeout(tryInit, 50);
  };
  tryInit();
  
  function updateLoop() {
    // Mouvement automatique vers la gauche
    offset += 0.5;
    
    // Ajustement par le scroll
    const scrollY = window.scrollY;
    const deltaY = scrollY - lastScrollY;
    if (Math.abs(deltaY) > 0) {
      isScrolling = true;
      clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(() => { isScrolling = false; }, 120);
      if (deltaY > 0) {
        // scroll down -> accélérer
        offset += Math.min(8, Math.abs(deltaY) * 0.4);
      }
      // scroll up: ne pas inverser, on garde le sens gauche
    }
    lastScrollY = scrollY;

    // Wrapping modulo robuste (gère toute valeur de offset)
    const copyWidth = techLoop.scrollWidth / 2;
    if (copyWidth > 0) {
      offset = ((offset % copyWidth) + copyWidth) % copyWidth;
    }

    // Appliquer translation vers la gauche
    techLoop.style.transform = `translateX(${-offset}px)`;

    requestAnimationFrame(updateLoop);
  }

  window.addEventListener('scroll', () => {
    // rien ici, tout est géré dans updateLoop via deltaY
  }, { passive: true });

  updateLoop();
}

// /////// TILT SUR CARTES \\\\ 
function setupTilt() {
  const cards = Array.from(document.querySelectorAll('.tilt'));
  if (cards.length === 0) return;
  const strength = 12;
  for (const card of cards) {
    card.addEventListener('mousemove', (e) => {
      const r = card.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width - 0.5;
      const py = (e.clientY - r.top) / r.height - 0.5;
      const rx = clamp(-py * strength, -strength, strength);
      const ry = clamp(px * strength, -strength, strength);
      card.style.transform = `rotateX(${rx}deg) rotateY(${ry}deg) translateY(-4px)`;
    });
    card.addEventListener('mouseleave', () => {
      card.style.transform = 'rotateX(0deg) rotateY(0deg)';
    });
  }
}

// /////// CANVAS BACKGROUND (Courbes + Chandeliers) \\\\ 
function initFxCanvas() {
  const canvas = document.getElementById('fx-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const deviceRatio = Math.min(window.devicePixelRatio || 1, 2);

  let width = window.innerWidth;
  let height = window.innerHeight;
  function resize() {
    width = window.innerWidth; height = window.innerHeight;
    canvas.width = width * deviceRatio; canvas.height = height * deviceRatio;
    canvas.style.width = width + 'px'; canvas.style.height = height + 'px';
    ctx.setTransform(deviceRatio, 0, 0, deviceRatio, 0, 0);
  }
  resize();
  window.addEventListener('resize', resize);

  // Visibilité sur la 1ère hauteur d’écran (fondu plus rapide)
  let vis = 1;
  const updateVisibility = () => {
    // extinction accélérée: 60% de scroll => opacité 0
    const f = clamp(1 - (window.scrollY / (height * 0.6)), 0, 1);
    vis = f;
    canvas.style.opacity = String(f);
  };
  updateVisibility();
  window.addEventListener('scroll', updateVisibility, { passive: true });

  // Moteurs multi-couches (OHLC/ligne) avec largeurs/hauteurs et marges horizontales différentes
  const engines = [];
  // Générer 3 bandes verticales espacées (pas de chevauchement serré)
  function generateBands(count) {
    const bands = [];
    const minGap = 0.06; // 6% de la hauteur min entre panneaux
    let attempts = 0;
    while (bands.length < count && attempts < 200) {
      const bandH = 0.22 + Math.random() * 0.18;
      const maxTop = Math.max(0, 0.92 - bandH);
      const bandT = Math.random() * maxTop;
      const candidate = { top: bandT, height: bandH };
      const overlap = bands.some(b => {
        const a1 = b.top, a2 = b.top + b.height;
        const c1 = candidate.top, c2 = candidate.top + candidate.height;
        return !(c2 + minGap < a1 || c1 > a2 + minGap);
      });
      if (!overlap) bands.push(candidate);
      attempts++;
    }
    // Si on n'a pas assez, remplissage simple
    while (bands.length < count) bands.push({ top: Math.min(0.02 * bands.length, 0.8), height: 0.28 });
    return bands;
  }
  const randWidthFrac = () => 0.6 + Math.random() * 0.2; // 60% à 80%

  // Deux couches chandeliers (avant‑plan)
  const wf1 = randWidthFrac();
  const wf2 = randWidthFrac();
  const wf3 = randWidthFrac();
  const bands = generateBands(5);
  const primary = createMarketEngine({ widthFrac: wf1, leftFrac: 0, band: bands[0], drawCandles: true, depth: 1, isPrimary: true, drawEMAs: false });
  const secondary = createMarketEngine({ widthFrac: wf2, leftFrac: 0, band: bands[1], drawCandles: true, depth: 0.35, isPrimary: false, drawEMAs: false });
  // lier une attraction douce du secondaire vers le primaire
  secondary.setFollow(() => primary.getRefPrice());
  engines.push(primary);
  engines.push(secondary);
  // Une couche courbe seule (arrière‑plan)
  engines.push(createMarketEngine({ widthFrac: wf3, leftFrac: 0, band: bands[2], drawCandles: false, depth: 0.2, drawEMAs: false }));
  engines.push(createMarketEngine({ widthFrac: randWidthFrac(), leftFrac: 0, band: bands[3], drawCandles: false, depth: 0.15, drawEMAs: false }));
  engines.push(createMarketEngine({ widthFrac: randWidthFrac(), leftFrac: 0, band: bands[4], drawCandles: false, depth: 0.12, drawEMAs: false }));

  let last = 0;
  function loop(t) {
    const dt = Math.min(50, t - last || 16);
    last = t;

    if (vis <= 0.01) { requestAnimationFrame(loop); return; }

    ctx.clearRect(0, 0, width, height);
    drawBackdrop(ctx, width, height);
    drawGrid(ctx, width, height);

    engines
      .sort((a,b) => a.depth - b.depth)
      .forEach(e => { e.update(dt, width, height); e.draw(ctx, width, height); });

    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);

  // Parallaxe au mouvement de souris
  const targetOffset = { x: 0, y: 0 }, offset = { x: 0, y: 0 };
  window.addEventListener('mousemove', (e) => {
    const nx = (e.clientX / width) - 0.5;
    const ny = (e.clientY / height) - 0.5;
    targetOffset.x = nx * 18; targetOffset.y = ny * 12;
  });
  setInterval(() => {
    offset.x += (targetOffset.x - offset.x) * 0.08;
    offset.y += (targetOffset.y - offset.y) * 0.08;
    canvas.style.transform = `translate3d(${offset.x}px, ${offset.y}px, 0)`;
  }, 16);

  function drawBackdrop(ctx, w, h) {
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, 'rgba(10,16,25,0.9)');
    g.addColorStop(1, 'rgba(8,12,18,0.85)');
    ctx.fillStyle = g; ctx.fillRect(0,0,w,h);
  }

  function drawGrid(ctx, w, h) {
    ctx.save();
    ctx.globalAlpha = 0.06;
    ctx.strokeStyle = '#7aa2ff';
    ctx.lineWidth = 1;
    const step = 64;
    ctx.beginPath();
    for (let x = (performance.now()/40)%step; x < w; x += step) { ctx.moveTo(x, 0); ctx.lineTo(x, h); }
    for (let y = (performance.now()/60)%step; y < h; y += step) { ctx.moveTo(0, y); ctx.lineTo(w, y); }
    ctx.stroke();
    ctx.restore();
  }

  function createMarketEngine(cfg = {}) {
    const candlestickWidth = 10; // px
    const gap = 6; // px (plus d'espace entre bougies)
    const widthFrac = clamp(cfg.widthFrac ?? 0.7, 0.5, 0.8);
    const leftFrac = clamp(cfg.leftFrac ?? 0, 0, 1 - widthFrac);
    const band = cfg.band || { top: 0.15, height: 0.3 };
    const drawCandles = !!cfg.drawCandles;
    const drawEMAs = cfg.drawEMAs !== false; // par défaut true
    const depth = cfg.depth ?? 1;
    const isPrimary = !!cfg.isPrimary;
    let visibleCount = Math.max(16, Math.floor((width * widthFrac) / (candlestickWidth + gap)));
    let maxHistory = Math.max(0, visibleCount - 1); // nombre de bougies fermées affichées
    let candleMs = 900 + Math.floor(Math.random() * 300); // ~1s par bougie, léger décalage par couche
    let elapsed = 0;

    let price = 100 + Math.random() * 10;
    let lastClose = price;
    let vol = 0.008; // volatilité réduite pour des bougies plus stables
    let targetVol = 0.008;
    // Dérive haussière contrôlée
    let drift = 0.0003;
    let targetDrift = 0.0003;
    // biais directionnel serpentin (AR1) et séquences vendeuses ponctuelles
    let trendBias = 0.5; // [-1,1] >0 à la hausse
    let bearStreakLeft = 0; // nombre de bougies rouges à enchaîner
    let volTimer = 0;

    const candles = [];
    let current = { o: price, h: price, l: price, c: price };

    // EMA incrémentales
    const emaShortP = 12;
    const emaLongP = 26;
    const alphaS = 2 / (emaShortP + 1);
    const alphaL = 2 / (emaLongP + 1);
    let emaS = price;
    let emaL = price;
    const closes = [];
    // Espace log + caméra
    let baseLog = Math.log(price);
    let emaLog = baseLog; // suivi lent du niveau
    let cameraCenterLog = baseLog; // centre vertical de la caméra
    let baseRangeLog = 0.022; // plage log fixe pour des bougies de taille constante
    let followRef = null; // fonction de suivi (pour secondaire)

    function randn() {
      // Box-Muller
      let u = 0, v = 0;
      while (u === 0) u = Math.random();
      while (v === 0) v = Math.random();
      return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
    }

    function update(dt, w, h) {
      // recalculer count si resize
      visibleCount = Math.max(16, Math.floor((w * widthFrac) / (candlestickWidth + gap)));
      maxHistory = Math.max(0, visibleCount - 1);

      // volatilité qui dérive doucement (clusters)
      volTimer += dt;
      if (volTimer > 1200 + Math.random() * 1800) {
        targetVol = clamp(vol * (0.8 + Math.random() * 0.4), 0.004, 0.025);
        // cible de dérive autour d'une moyenne positive
        targetDrift = 0.00025 + (Math.random() - 0.3) * 0.0005;
        volTimer = 0;
      }
      vol += (targetVol - vol) * 0.02;
      drift += (targetDrift - drift) * 0.02;
      // AR(1) sur le biais pour serpentin
      trendBias = clamp(0.92 * trendBias + 0.08 * (Math.random() * 2 - 1), -0.9, 0.9);
      // attraction douce vers le primaire si follow activé (sur prix log)
      if (typeof followRef === 'function') {
        const ref = followRef();
        if (ref > 0) {
          const diff = Math.log(ref) - Math.log(price);
          drift += diff * 0.0003; // très discret
        }
      }

      // micro ticks à l’intérieur de la bougie
      const ticks = Math.max(1, Math.round(dt / 16));
      for (let i = 0; i < ticks; i++) {
        // tendance haussière réaliste: bruit gaussien + drift positif doux,
        // amortir les renversements brutaux pour éviter l'alternance trop régulière
        let shock = randn() * (vol * 0.6) * Math.sqrt(16 / 1000);
        const meanRev = (lastClose - price) * 0.0005; // légère force de rappel
        // biais directionnel: globalement haussier, mais peut devenir négatif
        const directional = drift + 0.0005 * trendBias + (bearStreakLeft > 0 ? -0.0010 : 0);
        shock += meanRev + directional;
        const prev = price;
        price = Math.max(0.1, price * (1 + shock));
        // mise à jour OHLC stricte
        current.c = price;
        if (current.h < price) current.h = price;
        if (current.l > price) current.l = price;
        // empêcher la bougie en cours d'écraser trop les précédentes: limiter amplitude incrémentale
        const maxIntraMove = vol * 4; // borne légèrement plus permissive pour grosses bougies
        const move = Math.log(price) - Math.log(prev);
        if (Math.abs(move) > maxIntraMove) {
          const clampSign = move > 0 ? 1 : -1;
          const adjusted = Math.exp(Math.log(prev) + clampSign * maxIntraMove);
          price = adjusted; current.c = adjusted;
          if (current.h < adjusted) current.h = adjusted;
          if (current.l > adjusted) current.l = adjusted;
        }
      }
      // suivi log
      const logP = Math.log(price);
      emaLog = 0.02 * logP + 0.98 * emaLog;

      elapsed += dt;
      if (elapsed >= candleMs) {
        // clôture
        current.o = lastClose;
        // figer la taille en pixels à la clôture
        const panelInfo = computePanel(w, h);
        const scaleYClose = panelInfo.scaleY;
        const px = {
          o: scaleYClose(current.o),
          h: scaleYClose(current.h),
          l: scaleYClose(current.l),
          c: scaleYClose(current.c),
          panelTopAtClose: panelInfo.top
        };
        candles.push({ o: current.o, h: current.h, l: current.l, c: current.c, px });
        closes.push(current.c);
        // sliding window strict: on garde exactement maxHistory bougies fermées
        while (candles.length > maxHistory) candles.shift();
        while (closes.length > Math.max(200, maxHistory * 5)) closes.shift();
        if (closes.length > 500) closes.shift();

        // EMA update
        emaS = alphaS * current.c + (1 - alphaS) * emaS;
        emaL = alphaL * current.c + (1 - alphaL) * emaL;

        lastClose = current.c;
        // démarrer une nouvelle bougie avec O=dernier close et H=L=O
        current = { o: lastClose, h: lastClose, l: lastClose, c: lastClose };
        elapsed = 0;

        // gestion des séquences vendeuses pour créer des séries rouges réalistes
        const justRed = lastClose < candles[candles.length-1]?.o;
        if (bearStreakLeft > 0) {
          bearStreakLeft -= 1;
        } else {
          // probabilité élevée de séquences rouges pour équilibrer
          const pStartBear = 0.12 + Math.max(0, 0.08 - trendBias * 0.06);
          if (Math.random() < pStartBear) {
            bearStreakLeft = 1 + Math.floor(Math.random() * 2); // séquences courtes pour éviter enchaînements
          }
        }
      }
    }

    function computePanel(w, h) {
      const stepX = candlestickWidth + gap;
      const panelTop = h * band.top;
      const panelH = h * band.height;
      const panelCenterY = panelTop + panelH * 0.5;
      // pixels par unité log figé à partir de baseRangeLog
      const pixelsPerLog = (panelH * 0.9) / Math.max(1e-6, baseRangeLog);
      // la caméra suit doucement la tendance (ema) - plus lent pour éviter l'écrasement
      cameraCenterLog += (emaLog - cameraCenterLog) * 0.03;
      const scaleY = (p) => {
        const lp = Math.log(p);
        return panelCenterY - (lp - cameraCenterLog) * pixelsPerLog;
      };
      return { top: panelTop, bottom: panelTop + panelH, height: panelH, stepX, scaleY };
    }

    function draw(ctx, w, h) {
      const panelInfo = computePanel.call(this, w, h);
      const { top: panelTop, bottom: panelBottom, stepX, scaleY } = panelInfo;
      const usableW = w * widthFrac;
      const leftX = 0; // collé au bord gauche
      const rightX = leftX + usableW; // se termine selon la largeur

      const windowCandles = candles.slice(-maxHistory);

      // offset de défilement continu pendant la formation de la bougie courante
      // défilement horizontal continu
      const baseOffset = clamp((elapsed / candleMs) * stepX, 0, stepX);
      ctx.save();

      // prix line
      ctx.globalAlpha = 0.6 * depth;
      ctx.strokeStyle = 'rgba(122,162,255,0.6)';
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      const allForLine = [...windowCandles.map(c => c.c), current.c];
      // démarre à gauche avec défilement continu
      let x = leftX - baseOffset;
      for (let i = 0; i < allForLine.length; i++) {
        const y = scaleY(allForLine[i]);
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        x += stepX;
      }
      ctx.stroke();
      // accent vitesse et point lumineux
      if (allForLine.length >= 2) {
        const y2 = scaleY(allForLine[allForLine.length - 1]);
        const x2 = (leftX - baseOffset) + (allForLine.length - 1) * stepX;
        const y1 = scaleY(allForLine[allForLine.length - 2]);
        const x1 = x2 - stepX;
        ctx.save();
        ctx.globalAlpha = 0.9 * depth;
        ctx.strokeStyle = 'rgba(122,162,255,0.9)';
        ctx.lineWidth = 3.2;
        ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
        const g = ctx.createRadialGradient(x2, y2, 0, x2, y2, 24);
        g.addColorStop(0, 'rgba(255,255,255,0.95)');
        g.addColorStop(0.3, 'rgba(122,162,255,0.8)');
        g.addColorStop(1, 'rgba(122,162,255,0)');
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(x2, y2, 6, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
      }
      ctx.restore();

      // EMAs (supprimées si drawEMAs=false)
      if (drawEMAs && closes.length > emaLongP) {
        ctx.save();
        ctx.globalAlpha = Math.min(1, 0.9 * depth);
        // recalcul progressif pour affichage
        const emaSArr = [];
        const emaLArr = [];
        let eS = closes[0];
        let eL = closes[0];
        for (let i = 0; i < closes.length; i++) {
          eS = alphaS * closes[i] + (1 - alphaS) * eS;
          eL = alphaL * closes[i] + (1 - alphaL) * eL;
          emaSArr.push(eS); emaLArr.push(eL);
        }
        const seriesToX = (len) => (leftX - baseOffset);
        // Courbes bleues plus visibles
        ctx.lineWidth = 1.8;
        ctx.strokeStyle = 'rgba(122,162,255,0.9)';
        ctx.beginPath();
        let x1 = seriesToX(emaSArr.length);
        emaSArr.forEach((v, i) => { const y = scaleY(v); i ? ctx.lineTo(x1, y) : ctx.moveTo(x1, y); x1 += (candlestickWidth + gap); });
        ctx.stroke();
        ctx.restore();
      }

      if (drawCandles) {
        // Chandeliers enchaînés dans leur panel
        ctx.save();
        let xStart = leftX - baseOffset; // commencer à gauche avec défilement continu
        ctx.globalAlpha = 0.9 * depth; // opacité constante
        for (let i = 0; i < Math.min(windowCandles.length, maxHistory); i++) {
          const c = windowCandles[i];
          drawCandle(ctx, xStart + i * stepX, scaleY, normalizeCandle(c), candlestickWidth);
        }
        // bougie en cours toujours à l'index final
        const currentIndex = Math.min(windowCandles.length, maxHistory);
        drawCandle(ctx, (leftX - baseOffset) + currentIndex * stepX, scaleY, current, candlestickWidth);
        ctx.restore();
      }
    }

    function drawCandle(ctx, x, scaleY, c, w) {
      const isBull = c.c >= c.o;
      const color = isBull ? '#2ee6a6' : '#ff6b6b';
    const yHigh = scaleY(c.h), yLow = scaleY(c.l);
    const yOpen = scaleY(c.o), yClose = scaleY(c.c);
      // mèche
      ctx.strokeStyle = color; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(x, yHigh); ctx.lineTo(x, yLow); ctx.stroke();
      // corps
      ctx.fillStyle = color;
      const top = Math.min(yOpen, yClose);
      const h = Math.max(2, Math.abs(yClose - yOpen));
      ctx.fillRect(x - w * 0.5, top, w, h);
    }

  // rendre les bougies plus "pleines": réduire les mèches trop longues et forcer un corps minimum
  function normalizeCandle(c) {
    const minBody = 0.2; // 20% de l'amplitude devient corps minimum (plus de mèches)
    const o = c.o, h = c.h, l = c.l, close = c.c;
    const amp = Math.max(1e-6, h - l);
    let body = Math.abs(close - o);
    if (body < amp * minBody) {
      const mid = (o + close) / 2;
      const halfBody = (amp * minBody) / 2;
      const newO = mid - halfBody;
      const newC = mid + halfBody;
      // recouper mèches si elles sont > 60% de l’amplitude
      const newH = Math.max(newO, newC) + amp * 0.2;
      const newL = Math.min(newO, newC) - amp * 0.2;
      return { o: newO, h: newH, l: newL, c: newC };
    }
    // limiter mèches extrêmes (plus de mèches autorisées)
    const cap = amp * 1.0;
    const hi = Math.min(h, Math.max(o, close) + cap * 0.7);
    const lo = Math.max(l, Math.min(o, close) - cap * 0.7);
    return { o, h: hi, l: lo, c: close };
  }

  // dessin direct avec pixels figés
  function drawCandlePixels(ctx, x, px, w) {
    const isBull = px.c <= px.o ? false : true; // approximation
    const color = isBull ? '#2ee6a6' : '#ff6b6b';
    ctx.strokeStyle = color; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(x, px.h); ctx.lineTo(x, px.l); ctx.stroke();
    ctx.fillStyle = color;
    const top = Math.min(px.o, px.c);
    const h = Math.max(2, Math.abs(px.c - px.o));
    ctx.fillRect(x - w * 0.5, top, w, h);
  }

    // Pré-remplissage ~70% de la largeur utile pour éviter un démarrage vide
    (function prefill() {
      const targetLen = Math.max(0, visibleCount - 1);
      let guard = 0;
      while (candles.length < targetLen && guard < targetLen * 3) {
        const dt = 16 + Math.random() * 16;
        const ticks = Math.max(1, Math.round(dt / 16));
        for (let i = 0; i < ticks; i++) {
          const shock = randn() * vol * Math.sqrt(100 / 1000);
          price = Math.max(0.1, price * (1 + drift + shock));
          current.h = Math.max(current.h, price);
          current.l = Math.min(current.l, price);
          current.c = price;
        }
        current.o = lastClose;
        candles.push({ o: current.o, h: current.h, l: current.l, c: current.c });
        closes.push(current.c);
        emaS = alphaS * current.c + (1 - alphaS) * emaS;
        emaL = alphaL * current.c + (1 - alphaL) * emaL;
        lastClose = current.c;
        current = { o: lastClose, h: lastClose, l: lastClose, c: lastClose };
        guard++;
      }
      // fixer la plage log de caméra sur la base du préremplissage
      if (candles.length > 4) {
        const logs = candles.flatMap(c => [Math.log(c.o), Math.log(c.h), Math.log(c.l), Math.log(c.c)]);
        logs.sort((a,b)=>a-b);
        const low = logs[Math.floor(0.05 * (logs.length-1))];
        const high = logs[Math.floor(0.95 * (logs.length-1))];
        const mid = (low + high) / 2;
        cameraCenterLog = mid; // centrer sur le milieu du range initial
        // garder la plage initiale fixe pour des bougies de taille constante
        // baseRangeLog reste inchangé
      }
    })();

    function setFollow(getter) { followRef = getter; }
    function getRefPrice() { return current.c; }
    return { update, draw, depth, setFollow, getRefPrice };
  }
}

function enableStaticBackdrop() {
  const canvas = document.getElementById('fx-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const width = canvas.width = window.innerWidth;
  const height = canvas.height = window.innerHeight;
  ctx.fillStyle = '#0b0f14';
  ctx.fillRect(0,0,width,height);
  ctx.globalAlpha = 0.1;
  ctx.strokeStyle = '#7aa2ff';
  const step = 64;
  ctx.beginPath();
  for (let x = 0; x < width; x += step) { ctx.moveTo(x,0); ctx.lineTo(x,height); }
  for (let y = 0; y < height; y += step) { ctx.moveTo(0,y); ctx.lineTo(width,y); }
  ctx.stroke();
}

// /////// RIBBONS ANIMATION \\\\
class Ribbon {
  constructor(container, color, index) {
    this.container = container;
    this.color = color;
    this.index = index;
    this.points = [];
    this.velocity = { x: 0, y: 0 };
    this.spring = 0.03 + (Math.random() - 0.5) * 0.01;
    this.friction = 0.9 + (Math.random() - 0.5) * 0.05;
    this.thickness = 20 + Math.random() * 10;
    // Pas de décalage: la sphère s'aligne exactement sur le curseur
    this.offset = { x: 0, y: 0 };
    this.maxAge = 500;
    this.pointCount = 30;
    this.speedMultiplier = 0.6;
    this.fading = false;
    
    this.initPoints();
    this.createElement();
  }
  
  initPoints() {
    for (let i = 0; i < this.pointCount; i++) {
      this.points.push({ x: 0, y: 0, age: 0 });
    }
  }
  
  createElement() {
    this.element = document.createElement('div');
    this.element.className = 'ribbon';
    this.element.style.position = 'absolute';
    this.element.style.width = '2px';
    this.element.style.height = '2px';
    this.element.style.background = this.color;
    this.element.style.borderRadius = '50%';
    this.element.style.boxShadow = `0 0 ${this.thickness}px ${this.color}`;
    this.element.style.opacity = '0';
    this.element.style.display = 'none';
    this.element.style.visibility = 'hidden';
    this.element.style.transition = 'all 0.1s ease-out';
    this.container.appendChild(this.element);
  }
  
  update(mouseX, mouseY, dt, isActive) {
    const targetX = mouseX + this.offset.x;
    const targetY = mouseY + this.offset.y;

    // Afficher uniquement si actif ou en phase de fondu
    if (!isActive && !this.fading) {
      this.element.style.display = 'none';
      this.element.style.visibility = 'hidden';
      return;
    }
    this.element.style.display = 'block';
    this.element.style.visibility = 'visible';

    // Mise à jour du premier point (suivi curseur avec ressort + friction)
    const dx = targetX - this.points[0].x;
    const dy = targetY - this.points[0].y;

    this.velocity.x += dx * this.spring;
    this.velocity.y += dy * this.spring;
    this.velocity.x *= this.friction;
    this.velocity.y *= this.friction;

    this.points[0].x += this.velocity.x;
    this.points[0].y += this.velocity.y;

    // Mise à jour des segments (suivent le précédent)
    for (let i = 1; i < this.points.length; i++) {
      const prev = this.points[i - 1];
      const current = this.points[i];

      const segmentDelay = this.maxAge / (this.points.length - 1);
      const alpha = Math.min(1, (dt * this.speedMultiplier) / segmentDelay);

      current.x += (prev.x - current.x) * alpha;
      current.y += (prev.y - current.y) * alpha;
      current.age += dt;
    }

    // Mise à jour visuelle
    this.updateVisual();

    // En mode fondu: n'amorcer l'extinction qu'une fois très proche de la cible
    if (this.fading) {
      const dxClose = (mouseX + this.offset.x) - this.points[0].x;
      const dyClose = (mouseY + this.offset.y) - this.points[0].y;
      const dist = Math.hypot(dxClose, dyClose);
      if (dist < 10) {
        const currentOpacity = parseFloat(this.element.style.opacity) || 0.4;
        const newOpacity = Math.max(0, currentOpacity - dt * 0.0012);
        this.element.style.opacity = String(newOpacity);
        if (newOpacity <= 0.01) {
          this.element.style.display = 'none';
          this.element.style.visibility = 'hidden';
          this.element.style.opacity = '0';
          this.fading = false;
        }
      }
    }
  }
  
  updateVisual() {
    const first = this.points[0];
    this.element.style.left = first.x + 'px';
    this.element.style.top = first.y + 'px';
    
    // Create trail effect
    this.element.style.background = `radial-gradient(circle, ${this.color} 0%, transparent 70%)`;
    this.element.style.width = this.thickness + 'px';
    this.element.style.height = this.thickness + 'px';
    this.element.style.transform = 'translate(-50%, -50%)';
    
    // Opacité basée sur l'âge uniquement si pas en fondu
    if (!this.fading) {
      const age = this.points[0].age;
      const fade = Math.max(0, 1 - (age / this.maxAge));
      this.element.style.opacity = String(fade * 0.4);
    }
  }
  
  fadeOut(dt) {
    // Immediately hide when mouse is not moving
    this.element.style.display = 'none';
    this.element.style.opacity = '0';
    this.element.style.visibility = 'hidden';
  }

  startFade() {
    this.fading = true;
  }
  
  
  destroy() {
    if (this.element && this.element.parentNode) {
      this.element.parentNode.removeChild(this.element);
    }
  }
}

class RibbonsManager {
  constructor(container) {
    this.container = container;
    this.ribbons = [];
    this.mouse = { x: 0, y: 0 };
    // Deux sphères: bleu et rouge
    this.colors = ['#7aa2ff', '#ff6b6b'];
    this.lastTime = performance.now();
    this.isActive = false;
    
    this.init();
  }
  
  init() {
    // Create ribbons
    this.colors.forEach((color, index) => {
      this.ribbons.push(new Ribbon(this.container, color, index));
    });
    
    // Mouse tracking + idle timer
    this._idleTimer = null;
    this._idleDelayMs = 300;
    this._hideAll = () => {
      // Passer en mode fade des rubans; l'extinction se fera
      // uniquement une fois alignés au curseur pour une disparition douce
      if (this.isActive) this.isActive = false;
      this.ribbons.forEach(ribbon => ribbon.startFade());
      // Debug
      console.log('[ribbons] idle -> fade');
    };

    this.handleMouseMove = (e) => {
      this.mouse.x = e.clientX;
      this.mouse.y = e.clientY;
      this.isActive = true;
      // Annule le fade si on reprend le mouvement
      this.ribbons.forEach(ribbon => { ribbon.fading = false; });
      if (this._idleTimer) clearTimeout(this._idleTimer);
      this._idleTimer = setTimeout(this._hideAll, this._idleDelayMs);
    };
    
    this.handleMouseLeave = () => {
      this.isActive = false;
      // Force hide all ribbons immediately
      this.ribbons.forEach(ribbon => {
        ribbon.element.style.display = 'none';
        ribbon.element.style.opacity = '0';
        ribbon.element.style.visibility = 'hidden';
      });
    };
    
    document.addEventListener('mousemove', this.handleMouseMove);
    document.addEventListener('mouseleave', this.handleMouseLeave);
    
    // Animation loop
    this.animate();
  }
  
  animate() {
    const currentTime = performance.now();
    const dt = currentTime - this.lastTime;
    this.lastTime = currentTime;
    
    // Toujours mettre à jour pour permettre l'inertie et le fondu après l'arrêt
    this.ribbons.forEach(ribbon => {
      ribbon.update(this.mouse.x, this.mouse.y, dt, this.isActive);
    });
    
    // Continue animation
    requestAnimationFrame(() => this.animate());
  }
  
  destroy() {
    document.removeEventListener('mousemove', this.handleMouseMove);
    document.removeEventListener('mouseleave', this.handleMouseLeave);
    this.ribbons.forEach(ribbon => ribbon.destroy());
  }
}

// /////// CLICK SPARK \\\\
function createClickSpark(x, y) {
  const spark = document.createElement('div');
  spark.className = 'click-spark';
  spark.style.left = x + 'px';
  spark.style.top = y + 'px';
  document.body.appendChild(spark);
  
  setTimeout(() => {
    document.body.removeChild(spark);
  }, 400);
}

// /////// INIT \\\\
let ribbonsManager;

document.addEventListener('DOMContentLoaded', () => {
  setupReveal();
  setupParallax();
  setupTilt();
  initFxCanvas();
  enableStaticBackdrop();
  document.getElementById('year').textContent = new Date().getFullYear();
  
  // Initialize ribbons animation
  const ribbonsContainer = document.getElementById('ribbons-container');
  if (ribbonsContainer) {
    ribbonsManager = new RibbonsManager(ribbonsContainer);
  }
  
  // Click spark on tech logos
  document.querySelectorAll('.tech-loop img').forEach(img => {
    img.addEventListener('click', (e) => {
      const rect = img.getBoundingClientRect();
      const x = rect.left + rect.width / 2;
      const y = rect.top + rect.height / 2;
      createClickSpark(x, y);
    });
  });

  // Electric Border (subtil, blanc) pour les cartes
  initElectricBorders();
});

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
  if (ribbonsManager) {
    ribbonsManager.destroy();
  }
});

// /////// ELECTRIC BORDER (subtil, blanc) \\
function initElectricBorders() {
  // Ne cibler que les cartes marquées explicitement
  const cards = Array.from(document.querySelectorAll('.card.electric-enable'));
  if (cards.length === 0) return;

  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('class', 'eb-svg');
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('focusable', 'false');
  const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
  svg.appendChild(defs);
  document.body.appendChild(svg);

  const baseDur = 10; // plus lent
  const chaosScale = 18; // subtil
  
  // Optimisations de performance
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  cards.forEach((card, idx) => {
    card.classList.add('electric-border');

    const filterId = `eb-filter-${idx}`;

    const filter = document.createElementNS('http://www.w3.org/2000/svg', 'filter');
    filter.setAttribute('id', filterId);
    filter.setAttribute('color-interpolation-filters', 'sRGB');
    filter.setAttribute('x', '-200%');
    filter.setAttribute('y', '-200%');
    filter.setAttribute('width', '500%');
    filter.setAttribute('height', '500%');

    const t1 = document.createElementNS('http://www.w3.org/2000/svg', 'feTurbulence');
    t1.setAttribute('type', 'turbulence');
    t1.setAttribute('baseFrequency', '0.015');
    t1.setAttribute('numOctaves', '6');
    t1.setAttribute('seed', String(1 + idx));
    t1.setAttribute('result', 'noise1');
    const o1 = document.createElementNS('http://www.w3.org/2000/svg', 'feOffset');
    o1.setAttribute('in', 'noise1');
    o1.setAttribute('dx', '0');
    o1.setAttribute('dy', '0');
    o1.setAttribute('result', 'offsetNoise1');
    const a1 = document.createElementNS('http://www.w3.org/2000/svg', 'animate');
    a1.setAttribute('attributeName', 'dy');
    a1.setAttribute('values', '700; 0');
    a1.setAttribute('dur', `${baseDur}s`);
    a1.setAttribute('repeatCount', 'indefinite');
    a1.setAttribute('calcMode', 'linear');
    // Optimisation 40fps (25ms)
    a1.setAttribute('keyTimes', '0;1');
    a1.setAttribute('keySplines', '0.4 0 0.2 1');
    o1.appendChild(a1);

    const t2 = document.createElementNS('http://www.w3.org/2000/svg', 'feTurbulence');
    t2.setAttribute('type', 'turbulence');
    t2.setAttribute('baseFrequency', '0.015');
    t2.setAttribute('numOctaves', '6');
    t2.setAttribute('seed', String(2 + idx));
    t2.setAttribute('result', 'noise2');
    const o2 = document.createElementNS('http://www.w3.org/2000/svg', 'feOffset');
    o2.setAttribute('in', 'noise2');
    o2.setAttribute('dx', '0');
    o2.setAttribute('dy', '0');
    o2.setAttribute('result', 'offsetNoise2');
    const a2 = document.createElementNS('http://www.w3.org/2000/svg', 'animate');
    a2.setAttribute('attributeName', 'dy');
    a2.setAttribute('values', '0; -700');
    a2.setAttribute('dur', `${baseDur}s`);
    a2.setAttribute('repeatCount', 'indefinite');
    a2.setAttribute('calcMode', 'linear');
    o2.appendChild(a2);

    const t3 = document.createElementNS('http://www.w3.org/2000/svg', 'feTurbulence');
    t3.setAttribute('type', 'turbulence');
    t3.setAttribute('baseFrequency', '0.015');
    t3.setAttribute('numOctaves', '6');
    t3.setAttribute('seed', String(3 + idx));
    t3.setAttribute('result', 'noise3');
    const o3 = document.createElementNS('http://www.w3.org/2000/svg', 'feOffset');
    o3.setAttribute('in', 'noise3');
    o3.setAttribute('dx', '0');
    o3.setAttribute('dy', '0');
    o3.setAttribute('result', 'offsetNoise3');
    const a3 = document.createElementNS('http://www.w3.org/2000/svg', 'animate');
    a3.setAttribute('attributeName', 'dx');
    a3.setAttribute('values', '490; 0');
    a3.setAttribute('dur', `${baseDur}s`);
    a3.setAttribute('repeatCount', 'indefinite');
    a3.setAttribute('calcMode', 'linear');
    o3.appendChild(a3);

    const t4 = document.createElementNS('http://www.w3.org/2000/svg', 'feTurbulence');
    t4.setAttribute('type', 'turbulence');
    t4.setAttribute('baseFrequency', '0.015');
    t4.setAttribute('numOctaves', '6');
    t4.setAttribute('seed', String(4 + idx));
    t4.setAttribute('result', 'noise4');
    const o4 = document.createElementNS('http://www.w3.org/2000/svg', 'feOffset');
    o4.setAttribute('in', 'noise4');
    o4.setAttribute('dx', '0');
    o4.setAttribute('dy', '0');
    o4.setAttribute('result', 'offsetNoise4');
    const a4 = document.createElementNS('http://www.w3.org/2000/svg', 'animate');
    a4.setAttribute('attributeName', 'dx');
    a4.setAttribute('values', '0; -490');
    a4.setAttribute('dur', `${baseDur}s`);
    a4.setAttribute('repeatCount', 'indefinite');
    a4.setAttribute('calcMode', 'linear');
    o4.appendChild(a4);

    const c1 = document.createElementNS('http://www.w3.org/2000/svg', 'feComposite');
    c1.setAttribute('in', 'offsetNoise1');
    c1.setAttribute('in2', 'offsetNoise2');
    c1.setAttribute('result', 'part1');
    const c2 = document.createElementNS('http://www.w3.org/2000/svg', 'feComposite');
    c2.setAttribute('in', 'offsetNoise3');
    c2.setAttribute('in2', 'offsetNoise4');
    c2.setAttribute('result', 'part2');
    const blend = document.createElementNS('http://www.w3.org/2000/svg', 'feBlend');
    blend.setAttribute('in', 'part1');
    blend.setAttribute('in2', 'part2');
    blend.setAttribute('mode', 'color-dodge');
    blend.setAttribute('result', 'combinedNoise');
    const disp = document.createElementNS('http://www.w3.org/2000/svg', 'feDisplacementMap');
    disp.setAttribute('in', 'SourceGraphic');
    disp.setAttribute('in2', 'combinedNoise');
    disp.setAttribute('scale', String(chaosScale));
    disp.setAttribute('xChannelSelector', 'R');
    disp.setAttribute('yChannelSelector', 'B');

    filter.appendChild(t1); filter.appendChild(o1);
    filter.appendChild(t2); filter.appendChild(o2);
    filter.appendChild(t3); filter.appendChild(o3);
    filter.appendChild(t4); filter.appendChild(o4);
    filter.appendChild(c1); filter.appendChild(c2);
    filter.appendChild(blend); filter.appendChild(disp);
    defs.appendChild(filter);

    // Couches DOM
    const layers = document.createElement('div');
    layers.className = 'eb-layers';
    const stroke = document.createElement('div'); stroke.className = 'eb-stroke';
    const glow1 = document.createElement('div'); glow1.className = 'eb-glow-1';
    const glow2 = document.createElement('div'); glow2.className = 'eb-glow-2';
    const bg = document.createElement('div'); bg.className = 'eb-background-glow';
    layers.appendChild(stroke); layers.appendChild(glow1); layers.appendChild(glow2); layers.appendChild(bg);
    card.appendChild(layers);

    // Appliquer le filtre au contour
    stroke.style.filter = `url(#${filterId})`;
  });
}


