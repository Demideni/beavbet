(() => {
  const canvas = document.getElementById("game-canvas");
  if (!canvas) return console.error("[game] Canvas not found");
  const ctx = canvas.getContext("2d");

  // ===== Assets =====
  function loadImage(src) {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => resolve(null);
      img.src = src;
    });
  }

  // Try multiple paths to avoid iOS/iframe baseURI weirdness
  function loadImageAny(src) {
    const candidates = [
      src,
      src.startsWith("./") ? src.slice(2) : src,
      src.startsWith("assets/") ? "./" + src : src,
      src.startsWith("assets/") ? "/games/robinson/" + src : src,
      src.startsWith("./assets/") ? "/games/robinson/" + src.slice(2) : src,
      "/games/robinson/" + src.replace(/^\.\//, ""),
    ];
    // de-dupe
    const uniq = [...new Set(candidates)];
    return new Promise(async (resolve) => {
      for (const u of uniq) {
        const img = await loadImage(u);
        if (img) return resolve(img);
      }
      return resolve(null);
    });
  }


  const GFX = {
    bg: null,
    bgSpace: null,
    moon: null,
    mars: null,
    robinson: null,
    island: null,

    // pickups
    bonusX2: null,
    bonusX3: null,
    bonusAdd1: null,
    bonusAdd2: null,
    bonusAdd3: null,
    rocket: null,

    ready: false,
  };

  Promise.all([
    loadImageAny("assets/splash_bg.png"),
    loadImageAny("assets/background/bg_space.png"),
    loadImageAny("assets/background/planet_moon.png"),
    loadImageAny("assets/background/planet_mars.png"),

    loadImageAny("assets/robinson.png"),
    loadImageAny("assets/island_long.png"),

    // bonus types
    loadImageAny("assets/bonus_x2.png"),
    loadImageAny("assets/bonus_x3.png"),
    loadImageAny("assets/bonus_add1.png"),
    loadImageAny("assets/bonus_add2.png"),
    loadImageAny("assets/bonus_add3.png"),

    // hazards
    loadImageAny("assets/rocket.png"),
  ]).then(
    ([
      bg,
      bgSpace,
      moon,
      mars,
      robinson,
      island,
      bonusX2,
      bonusX3,
      bonusAdd1,
      bonusAdd2,
      bonusAdd3,
      rocket,
    ]) => {
      GFX.bg = bg;
      GFX.bgSpace = bgSpace;
      GFX.moon = moon;
      GFX.mars = mars;

      GFX.robinson = robinson;
      GFX.island = island;

      GFX.bonusX2 = bonusX2;
      GFX.bonusX3 = bonusX3;
      GFX.bonusAdd1 = bonusAdd1;
      GFX.bonusAdd2 = bonusAdd2;
      GFX.bonusAdd3 = bonusAdd3;

      GFX.rocket = rocket;
      GFX.ready = true;
    }
  );

  // ===== Resize / DPR =====
  let W = 0,
    H = 0,
    dpr = 1;

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = window.innerWidth;
    H = window.innerHeight;
    canvas.width = Math.floor(W * dpr);
    canvas.height = Math.floor(H * dpr);
    canvas.style.width = W + "px";
    canvas.style.height = H + "px";
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  window.addEventListener("resize", resize);
  resize();

  // ===== Utils =====
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const easeInOut = (t) => 0.5 - 0.5 * Math.cos(Math.PI * clamp(t, 0, 1));
  const rnd = (a, b) => a + Math.random() * (b - a);

  function aabb(ax, ay, aw, ah, bx, by, bw, bh) {
    return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;
  }

  function pushHeroFloater(text, color) {
    if (!world.heroFloaters) world.heroFloaters = [];
    world.heroFloaters.unshift({ text, color, t: 0 });
    if (world.heroFloaters.length > HERO_FLOATER_MAX) {
      world.heroFloaters.length = HERO_FLOATER_MAX;
    }
  }


  // ===== State =====
  const State = {
    IDLE: "IDLE",
    RUNNING: "RUNNING",
    LANDING_ROLL: "LANDING_ROLL",
    FINISH_WIN: "FINISH_WIN",
    FINISH_LOSE: "FINISH_LOSE",
  };

  let state = State.IDLE;
  let lastTime = performance.now();

  // ===== Params =====
  const HERO_X_REL = 0.25;
  const WATER_LINE_REL = 0.80;
  const PLATFORM_Y_RAISE_PX = 110; // поднять палубы выше, чтобы не перекрывались инфо-блоком
  const PLAYFIELD_TOP_REL = 0.18;

  const GRAVITY = 750;
  const START_VY = -420;
  const OBJECT_SPEED_BASE = 520;

  // roll
  const ROLL_FRICTION = 1700;
  const ROLL_STOP_VX = 35;

  // ribbon
  const RIBBON_LIFE = 0.45;
  const RIBBON_MAX = 36;
  const RIBBON_MIN_DIST = 6;
  const RIBBON_SHIFT_K = 0.70;

  // platforms
  const PLATFORM_POOL = 9;
  // Платформы (палубы) должны идти ровной цепочкой: фиксированная высота и шаг.
  // Шаг = длина 3 платформ (по ТЗ).
  // По ТЗ: авианосцы длиннее в 1.5 раза и стоят в 2 раза дальше.
  // Было: width_mul=1.0, spacing=3.0 длины → станет: width_mul=1.5, spacing=6.0 длины.
  const PLATFORM_WIDTH_MUL = 1.95; // +30% длина авианосцев
  const PLATFORM_SPACING_MULT = 6.0; // расстояние между платформами = 6 длины платформы

  // landing zones (0..1 along deck)
  // Посадочные зоны под “нормальную” палубу.
  // (Нормализованные координаты вдоль палубы 0..1)
  const WIN_ZONE_L = 0.18;
  const WIN_ZONE_R = 0.62;
  const LOSE_ZONE_L = 0.78;
  const LOSE_ZONE_R = 0.96;

  // pickups (air)
  const PICKUP_POOL = 70;
  const BONUS_CHANCE = 0.80;
  // Ты имел в виду НЕ размер, а количество.
  // Размер оставляем базовым, а плотность увеличиваем.
  // По ТЗ: бонусов/ракет больше, заметнее, выше по экрану и уже в самом начале раунда.
  const PICKUP_SIZE = 78;
  const BONUS_SIZE = Math.round(PICKUP_SIZE * 1.3); // бонусы +30%
  const ROCKET_SIZE = PICKUP_SIZE; // ракеты без изменений
  const PICKUP_DENSITY = 3.2; // заметно плотнее
  const PICKUP_SPACING_MIN_PX = Math.round(170 / PICKUP_DENSITY);
  const PICKUP_SPACING_MAX_PX = Math.round(330 / PICKUP_DENSITY);
  const PICKUP_MIN_SEP_PX = 135; // защита от “вплотную” даже при высокой плотности
  const BONUS_IMPULSE = 260; // up
  const HIT_IMPULSE = 160; // down

  // hero stacked event labels (near hero)
  const HERO_FLOATER_LIFE = 1.15;     // seconds
  const HERO_FLOATER_RISE = 22;       // px
  const HERO_FLOATER_STACK_GAP = 22;  // px between lines
  const HERO_FLOATER_MAX = 6;         // max lines in stack


  // ===== World =====
  const world = {
    t: 0,
    // Parallax time runs at a stable base speed and must NOT accelerate with gameplay speed.
    parallaxT: 0,
    roundT: 0,
    roundDur: 3.6,

    cam: { x: 0, y: 0, shake: 0, zoom: 1, zoomTarget: 1, zoomT: 0 },

    hero: { x: 0, y: 0, vy: 0, w: 0, h: 0, rot: 0, prevBottom: 0 },

    platforms: [], // {id,x,y,w,h}
    nextPlatformId: 1,
    platformY: 0,
    platformSpacingPx: 0,

    pickups: [], // {id,x,y,w,h,type,age}
    nextPickupId: 1,
    nextPickupX: 0,

    bonusCount: 0,

    bet: 1,
    mult: 1,
    add: 0, // additive winnings in bet currency

    roundId: null,
    floaters: [], // legacy world-space floaters
    heroFloaters: [], // stacked labels near hero: {text,color,t}

    stars: [],
    result: null,
    finishT: 0,

    plan: null,
    decided: false,

    roll: { vx: 0, platformId: null, remain: 0, speed: 0 },

    fx: {
      mode: "BLUE",
      fireUntil: 0,

      worldSpeed: OBJECT_SPEED_BASE,

      ribbon: [],
      ribbonMax: RIBBON_MAX,
      lastRibbonX: 0,
      lastRibbonY: 0,

      particles: [],
    },
  };

  // ===== Hit pause / time scale =====
  const TIME = {
    scale: 1,
    freeze: 0,
  };

  // ===== User speed modes (does NOT change outcomes; only real-time pacing) =====
  const SPEED = {
    mode: 'NORMAL',
    scale: 1,
    scales: { SLOW: 0.8, NORMAL: 1, FAST: 1.25 },
  };

  function setSpeedMode(mode) {
    if (!SPEED.scales[mode]) return;
    SPEED.mode = mode;
    SPEED.scale = SPEED.scales[mode];
    // show mode in UI if stats bar exists
    const el = document.getElementById('statSpeed');
    if (el) el.textContent = mode;
  }

  function cycleSpeedMode() {
    const order = ['SLOW', 'NORMAL', 'FAST'];
    const i = order.indexOf(SPEED.mode);
    setSpeedMode(order[(i + 1) % order.length]);
  }

  // keyboard (desktop): 1/2/3
  window.addEventListener('keydown', (e) => {
    if (e.key === '1') setSpeedMode('SLOW');
    if (e.key === '2') setSpeedMode('NORMAL');
    if (e.key === '3') setSpeedMode('FAST');
  });

  // mobile-friendly: tap the stats bar to cycle speed
  window.addEventListener('load', () => {
    setSpeedMode('NORMAL');
    // mobile: tap top-left corner of the game canvas to cycle speed
    const handler = (ev) => {
      const rect = canvas.getBoundingClientRect();
      const clientX = ev.touches ? ev.touches[0].clientX : ev.clientX;
      const clientY = ev.touches ? ev.touches[0].clientY : ev.clientY;
      const x = (clientX - rect.left) * (canvas.width / rect.width);
      const y = (clientY - rect.top) * (canvas.height / rect.height);
      if (x >= 0 && y >= 0 && x < 110 && y < 70) {
        cycleSpeedMode();
      }
    };
    canvas.addEventListener('click', handler);
    canvas.addEventListener('touchstart', handler, { passive: true });
  });

  function hitPause(freezeSec = 0.06, slowScale = 0.25, slowRecover = 0.12) {
    TIME.freeze = Math.max(TIME.freeze, freezeSec);
    TIME.scale = Math.min(TIME.scale, slowScale);

    const startT = world.t;
    const startScale = TIME.scale;
    const target = 1;

    function step() {
      const t = clamp((world.t - startT) / slowRecover, 0, 1);
      TIME.scale = startScale + (target - startScale) * t;
      if (t < 1) requestAnimationFrame(step);
      else TIME.scale = 1;
    }
    requestAnimationFrame(step);
  }

  function initStars() {
    world.stars = [];
    const n = Math.floor((W * H) / 16000);
    for (let i = 0; i < n; i++) {
      world.stars.push({
        x: Math.random() * W,
        y: Math.random() * H,
        s: 0.6 + Math.random() * 1.8,
        a: 0.15 + Math.random() * 0.6,
      });
    }
  }
  initStars();

  // Camera FX removed: no shake/zoom to avoid visual jitter on landing/rolling.
  function cameraKick() {}
  function cameraPunch() {}

  function kickStartFeel() {
    if (!window.gsap) return;
    gsap.fromTo(
      canvas,
      { filter: "brightness(1)" },
      { filter: "brightness(1.18)", duration: 0.12, yoyo: true, repeat: 1, ease: "sine.inOut" }
    );
  }

  function emitStart() {
    window.RobinsonBridge?.emitRoundStart?.({ ts: Date.now() });
  }
  function emitEnd(result) {
    window.RobinsonBridge?.emitRoundEnd?.({ result, ts: Date.now(), bonuses: world.bonusCount });
  }
  function emitBonus(type) {
    window.RobinsonBridge?.emitBonusCollect?.({ type, ts: Date.now(), total: world.bonusCount });
  }
  function emitHit(type) {
    window.RobinsonBridge?.emitHit?.({ type, ts: Date.now() });
  }

  function setDamagedTrail(seconds = 1.2) {
    world.fx.mode = "FIRE";
    world.fx.fireUntil = world.t + seconds;
  }

  // ===== Planning =====
  function planRound() {
    // позже вернём вашу математику/детерминизм как было
    const isWin = Math.random() < 0.5;
    world.plan = { result: isWin ? "WIN" : "LOSE" };
  }

  function platformBaseSize() {
    const scale = Math.min(W / 1200, H / 800, 1);
    return {
      w: Math.round(520 * scale * PLATFORM_WIDTH_MUL),
      h: Math.round(170 * scale),
    };
  }

  function spawnPlatform(x, y) {
    const { w, h } = platformBaseSize();
    const p = {
      id: world.nextPlatformId++,
      x,
      y,
      w,
      h,
    };
    world.platforms.push(p);
    if (world.platforms.length > PLATFORM_POOL) world.platforms.shift();
    return p;
  }

  function resetRound() {
    world.roundT = 0;
    world.finishT = 0;
    world.result = null;
    world.decided = false;

    world.platforms = [];
    world.pickups = [];
    world.nextPlatformId = 1;
    world.nextPickupId = 1;
    world.bonusCount = 0;
    world.mult = 1;
    world.add = 0;
    world.floaters = [];
    world.heroFloaters = [];

    const heroX = W * HERO_X_REL;
    world.hero.x = heroX;
    world.hero.y = H * 0.45;
    world.hero.vy = START_VY;
    world.hero.rot = 0;

    const scale = Math.min(W / 1200, H / 800, 1);
    const heroScale = 1.9; // +90%
    world.hero.w = Math.round(110 * scale * heroScale);
    world.hero.h = Math.round(110 * scale * heroScale);
    world.hero.prevBottom = world.hero.y + world.hero.h / 2;

    world.roll.vx = 0;
    world.roll.platformId = null;
    world.roll.remain = 0;
    world.roll.speed = 0;

    world.cam.x = 0;
    world.cam.y = 0;
    world.cam.shake = 0;
    world.cam.zoom = 1;
    world.cam.zoomTarget = 1;
    world.cam.zoomT = 0;

    world.fx.mode = "BLUE";
    world.fx.fireUntil = 0;
    world.fx.particles = [];
    world.fx.ribbon = [];
    world.fx.worldSpeed = OBJECT_SPEED_BASE;
    world.fx.lastRibbonX = world.hero.x;
    world.fx.lastRibbonY = world.hero.y;

    // Keep parallax scrolling stable (no acceleration tied to worldSpeed)
    world.parallaxT = 0;

    planRound();

    // ===== Platforms: ровная цепочка (фиксированная высота + фиксированный шаг) =====
    const { w: pw, h: ph } = platformBaseSize();
    world.platformY = Math.round(H * WATER_LINE_REL) - PLATFORM_Y_RAISE_PX;
    world.platformSpacingPx = Math.max(240, Math.round(pw * PLATFORM_SPACING_MULT));

    // стартовая платформа прямо под героем
    const startPlatform = spawnPlatform(heroX, world.platformY);
    // гарантируем размеры (spawnPlatform берёт свежие размеры, но для ясности)
    startPlatform.w = pw;
    startPlatform.h = ph;

    // герой стартует С платформы и сразу улетает
    world.hero.y = deckTopY(startPlatform) - world.hero.h * 0.45;
    world.hero.vy = START_VY;
    world.hero.prevBottom = world.hero.y + world.hero.h / 2;

    // наполняем цепочку платформ впереди (чтобы всегда было куда лететь)
    let x = heroX;
    const neededRight = W * 2.2;
    while (x < neededRight) {
      x += world.platformSpacingPx;
      const p = spawnPlatform(x, world.platformY);
      p.w = pw;
      p.h = ph;
    }

    // ===== Pickups =====
    // Спавним сразу несколько объектов ближе к старту + дальше поддерживаем плотный спавн.
    world.nextPickupX = 0; // сразу активируем catch-up
    const startX = W * 0.62;
    for (let i = 0; i < 6; i++) {
      spawnPickupAtX(startX + i * 120);
    }
  }

  function endRound(result) {
    if (state !== State.RUNNING && state !== State.LANDING_ROLL) return;

    world.result = result;
    emitEnd(result);

    // Casino settlement (if available)
    try {
      const api = window.PULZ_GAME && typeof window.PULZ_GAME === "object" ? window.PULZ_GAME : null;
      const rid = world.roundId;
      if (api?.finishRound && rid) {
        const payload = { roundId: rid, multiplier: world.mult || 1, result: result === "WIN" ? "won" : "lost" };
        Promise.resolve(api.finishRound(payload))
          .then((r) => {
            if (r?.balance != null) window.RobinsonUI?.setBalance?.(r.balance);
          })
          .catch((e) => console.warn("[game] finishRound failed", e));
      }
    } catch (e) {
      console.warn("[game] finishRound error", e);
    }

    window.RobinsonUI?.flashResult?.(result === "WIN");
    window.RobinsonUI?.showResultText?.(result, result === "WIN");

    state = result === "WIN" ? State.FINISH_WIN : State.FINISH_LOSE;
    world.finishT = 0;

    cameraKick(result === "WIN" ? 1.2 : 1.6);

    setTimeout(() => {
      state = State.IDLE;
      window.RobinsonUI?.unlockAfterRound?.();
    }, 1050);
  }

  function startRound() {
    if (state !== State.IDLE) return;
    state = State.RUNNING;

    window.RobinsonUI?.lockForRound?.();
    resetRound();
    kickStartFeel();
    emitStart();
  }

// Public API called by /ui.js (iframe)
window.RobinsonGame = {
  setBet(v) {
    const n = Number(v);
    if (!Number.isFinite(n) || n <= 0) return;
    world.bet = n;
  },
  start(opts = {}) {
    if (state !== State.IDLE) return;
    const nBet = Number(opts.bet);
    if (Number.isFinite(nBet) && nBet > 0) world.bet = nBet;
    world.roundId = opts.roundId || null;
    world.mult = 1;
    world.add = 0;
    world.floaters = [];
    state = State.RUNNING;

    resetRound();
    kickStartFeel();
    emitStart();
  },
};


  // ===== Platform geometry =====
  function deckTopY(p) {
    return p.y - p.h / 2 + 6;
  }
  function deckLeftX(p) {
    return p.x - p.w / 2;
  }
  function deckRightX(p) {
    return p.x + p.w / 2;
  }

  // ===== Ribbon =====
  function pushRibbonPoint(x, y) {
    const dx = x - world.fx.lastRibbonX;
    const dy = y - world.fx.lastRibbonY;
    if (dx * dx + dy * dy < RIBBON_MIN_DIST * RIBBON_MIN_DIST) return;

    world.fx.ribbon.push({ x, y, t: 0, life: RIBBON_LIFE });
    world.fx.lastRibbonX = x;
    world.fx.lastRibbonY = y;

    if (world.fx.ribbon.length > world.fx.ribbonMax) world.fx.ribbon.shift();
  }

  function spawnRibbonPoint() {
    if (world.fx.mode !== "BLUE") return;
    const back = 0.55 * Math.max(world.hero.w, world.hero.h);
    const x = world.hero.x - back * 0.10;
    const y = world.hero.y + back * 0.15;
    pushRibbonPoint(x, y);
  }

  // ===== Fire / Smoke =====
  function spawnFireParticles(dt) {
    if (world.fx.mode === "FIRE" && world.t >= world.fx.fireUntil) {
      world.fx.mode = "BLUE";
    }
    if (world.fx.mode !== "FIRE") return;

    const speed = Math.max(300, world.fx.worldSpeed || OBJECT_SPEED_BASE);
    const back = 0.55 * Math.max(world.hero.w, world.hero.h);
    const sx = world.hero.x - back * 0.10;
    const sy = world.hero.y + back * 0.15;

    const rate = 90;
    const count = Math.max(1, Math.floor(rate * dt));

    for (let i = 0; i < count; i++) {
      const jitter = (Math.random() - 0.5) * 10;
      const px = sx + jitter;
      const py = sy + jitter;

      const isSmoke = Math.random() < 0.55;
      world.fx.particles.push({
        kind: isSmoke ? "SMOKE" : "FIRE",
        x: px,
        y: py,
        vx: -(speed * 0.35 + Math.random() * speed * 0.25) + (Math.random() - 0.5) * 60,
        vy: (Math.random() - 0.5) * 80 - (isSmoke ? 30 : 0),
        life: isSmoke ? 0.9 + Math.random() * 0.55 : 0.35 + Math.random() * 0.25,
        t: 0,
        size: isSmoke ? 10 + Math.random() * 18 : 8 + Math.random() * 12,
        a: isSmoke ? 0.18 + Math.random() * 0.10 : 0.28 + Math.random() * 0.18,
      });
    }

    if (world.fx.particles.length > 750) {
      world.fx.particles.splice(0, world.fx.particles.length - 750);
    }
  }

  // ===== Spawners =====
  function maybeSpawnNextPlatform(dt) {
    // Ровная цепочка: всегда держим справа запас платформ.
    // Спавним новую, когда правый край цепочки приблизился.
    if (world.platforms.length === 0) return;

    let rightmost = world.platforms[0];
    for (let i = 1; i < world.platforms.length; i++) {
      if (world.platforms[i].x > rightmost.x) rightmost = world.platforms[i];
    }

    const margin = W * 1.2;
    if (rightmost.x < W + margin) {
      const { w: pw, h: ph } = platformBaseSize();
      const p = spawnPlatform(rightmost.x + world.platformSpacingPx, world.platformY);
      p.w = pw;
      p.h = ph;
    }
  }

  function spawnPickupAtX(x) {

    // Два "коридора" по Y: верхний и нижний, но без прилипания к палубе.
    const topMin = H * PLAYFIELD_TOP_REL + 40;
    // Делаем воздушные объекты выше и заметнее.
    const topMax = H * 0.36;

    // низ — выше палубы, чтобы бонусы/ракеты не оказывались "на платформе"
    const { h: ph } = platformBaseSize();
    const deckTop = world.platformY - ph / 2;
    // "Низ" всё равно выше палубы, но не сваливаемся в самый низ экрана.
    const lowMin = H * 0.48;
    const lowMax = Math.min(deckTop - 120, H * (WATER_LINE_REL - 0.16));

    // Держим вокруг траектории героя, но специально сдвигаем вверх.
    const target = clamp(world.hero.y - 120 + rnd(-210, 210), topMin, lowMax);
    const y = clamp(target + rnd(-45, 45), topMin, lowMax);

    const isBonus = Math.random() < BONUS_CHANCE;
    let type = "ROCKET";
    if (isBonus) {
      const r = Math.random();
      // tune: more +1/+2, rarer x3/+3
      if (r < 0.22) type = "BONUS_X2";
      else if (r < 0.30) type = "BONUS_X3";
      else if (r < 0.62) type = "BONUS_ADD1";
      else if (r < 0.88) type = "BONUS_ADD2";
      else type = "BONUS_ADD3";
    }

    // Не даём объектам появляться вплотную друг к другу.
    for (const p of world.pickups) {
      const dx = p.x - x;
      const dy = p.y - y;
      if (dx * dx + dy * dy < PICKUP_MIN_SEP_PX * PICKUP_MIN_SEP_PX) {
        return; // пропускаем спавн, следующий будет скоро из-за плотности
      }
    }

    world.pickups.push({
      id: world.nextPickupId++,
      x,
      y,
      w: (type === "ROCKET" ? ROCKET_SIZE : BONUS_SIZE),
      h: (type === "ROCKET" ? ROCKET_SIZE : BONUS_SIZE),
      type,
      age: 0,
    });

    if (world.pickups.length > PICKUP_POOL) world.pickups.shift();
  }

  function spawnPickup() {
    const x = W + rnd(110, 260);
    spawnPickupAtX(x);
  }

  function maybeSpawnPickup(dt, worldSpeed) {
    // nextPickupX = дистанция до следующего спавна (px). При дропах FPS можем перепрыгнуть,
    // поэтому спавним catch-up через while.
    world.nextPickupX -= worldSpeed * dt;
    let safety = 0;
    while (world.nextPickupX <= 0 && safety++ < 3) {
      spawnPickup();
      world.nextPickupX += rnd(PICKUP_SPACING_MIN_PX, PICKUP_SPACING_MAX_PX);
    }
  }

  function updatePickups(dt, worldSpeed) {
    const hx = world.hero.x - world.hero.w / 2;
    const hy = world.hero.y - world.hero.h / 2;
    const hw = world.hero.w;
    const hh = world.hero.h;

    for (let i = world.pickups.length - 1; i >= 0; i--) {
      const p = world.pickups[i];
      p.age += dt;
      p.x -= worldSpeed * dt;

      if (p.x < -220 || p.age > 6.0) {
        world.pickups.splice(i, 1);
        continue;
      }

      const px = p.x - p.w / 2;
      const py = p.y - p.h / 2;

      if (aabb(hx, hy, hw, hh, px, py, p.w, p.h)) {
        world.pickups.splice(i, 1);

        if (p.type === "BONUS_X2") {
          world.mult = clamp(world.mult * 2, 0.1, 999);
          world.bonusCount += 1;
          emitBonus("BONUS_X2");
          pushHeroFloater("x2", "rgba(70,255,160,1)");
          world.hero.vy = Math.min(world.hero.vy, 0) - BONUS_IMPULSE;
        } else if (p.type === "BONUS_X3") {
          world.mult = clamp(world.mult * 3, 0.1, 999);
          world.bonusCount += 1;
          emitBonus("BONUS_X3");
          pushHeroFloater("x3", "rgba(70,255,160,1)");
          world.hero.vy = Math.min(world.hero.vy, 0) - BONUS_IMPULSE;
        } else if (p.type === "BONUS_ADD1" || p.type === "BONUS_ADD2" || p.type === "BONUS_ADD3") {
          const n = p.type === "BONUS_ADD1" ? 1 : p.type === "BONUS_ADD2" ? 2 : 3;
          world.add += (Number(world.bet) || 0) * n;
          world.bonusCount += 1;
          emitBonus(p.type);
          pushHeroFloater("+" + n, "rgba(70,255,160,1)");
          world.hero.vy = Math.min(world.hero.vy, 0) - BONUS_IMPULSE;
        } else {
          // ROCKET: /2 on everything
          world.mult = clamp(world.mult * 0.5, 0.1, 999);
          world.add *= 0.5;

          emitHit("ROCKET");
          pushHeroFloater("/2", "rgba(255,90,90,1)");

          setDamagedTrail(1.2);
          world.hero.vy = Math.max(world.hero.vy, 0) + HIT_IMPULSE;
        }
      }
    }
  }

  // ===== Landing (FIXED): landing strip collider, no nearest, no teleport =====
  function tryTouchdown(speed) {
    if (world.decided) return;

    const hero = world.hero;
    const bottomNow = hero.y + hero.h / 2;
    const bottomPrev = hero.prevBottom;

    // садимся только когда летим вниз
    if (hero.vy < 0) return;

    // небольшой допуск по X, чтобы не было "почти попал"
    const PAD_X = hero.w * 0.16;

    for (let i = 0; i < world.platforms.length; i++) {
      const p = world.platforms[i];

      const top = deckTopY(p);

      // swept по X (платформа сдвигается за кадр)
      const leftNow = deckLeftX(p);
      const rightNow = deckRightX(p);
      const prevX = typeof p.prevX === "number" ? p.prevX : p.x;
      const leftPrev = prevX - p.w / 2;
      const rightPrev = prevX + p.w / 2;
      const leftSweep = Math.min(leftPrev, leftNow);
      const rightSweep = Math.max(rightPrev, rightNow);

      // должен быть над палубой по X (учитывая sweep и допуск)
      if (hero.x < leftSweep - PAD_X || hero.x > rightSweep + PAD_X) continue;

      // пересёк верх палубы между кадрами
      const crossed = bottomPrev < top && bottomNow >= top;
      if (!crossed) continue;

      // финальная проверка X в swept-границах
      if (hero.x < leftSweep || hero.x > rightSweep) continue;

      // === САДИМСЯ В ЛЮБОЙ ТОЧКЕ ВЕРХНЕЙ ПАЛУБЫ ===
      world.decided = true;

      hero.y = top - hero.h * 0.45;
      hero.vy = 0;
      hero.rot = 0.06;

      state = State.LANDING_ROLL;

      // катится РОВНО половину длины палубы
      world.roll.platformId = p.id;
      world.roll.remain = Math.max(10, p.w * 0.5);

      // скорость качения зависит от текущей скорости мира (feel)
      world.roll.speed = clamp(speed * 0.85, 340, 860);

      // no camera FX on landing (requested)

      return;
    }
  }
    // UI sync (play button FX speed follows multiplier)
    try {
      const m = Number(world.mult) || 1;
      const running = state === State.RUNNING || state === State.LANDING_ROLL;
      window.RobinsonUI?.setPlayFX?.({ multiplier: m, running });
    } catch (e) {}




  // ===== Update =====
  function update(dt) {
    world.tPrev = world.t;
    world.t += dt;

    // Parallax runs at stable base speed (must not accelerate with worldSpeed)
    world.parallaxT += dt;

    // camera FX disabled (keep stable)
    world.cam.shake = 0;
    world.cam.x = 0;
    world.cam.y = 0;
    world.cam.zoom = 1;
    world.cam.zoomTarget = 1;

    // stars
    const starSpeed = state === State.RUNNING ? 260 : 90;
    for (const st of world.stars) {
      st.x -= (starSpeed * 0.14) * st.s * dt;
      if (st.x < -20) {
        st.x = W + 20;
        st.y = Math.random() * H;
      }
    }

    if (state === State.RUNNING) {
      // camera FX disabled
      world.roundT += dt;
      const p = clamp(world.roundT / world.roundDur, 0, 1);
      const speed = OBJECT_SPEED_BASE * (0.9 + 0.55 * easeInOut(p));
      world.fx.worldSpeed = speed;

      // spawn platforms
      maybeSpawnNextPlatform(dt);

      // move platforms (store prevX to fix "tunneling" in landing)
      for (let i = world.platforms.length - 1; i >= 0; i--) {
        const plat = world.platforms[i];
        plat.prevX = plat.x;
        plat.x -= speed * dt;
        if (plat.x < -900) world.platforms.splice(i, 1);
      }

      // spawn pickups
      maybeSpawnPickup(dt, speed);

      // hero physics
      world.hero.prevBottom = world.hero.y + world.hero.h / 2;
      world.hero.vy += GRAVITY * dt;
      world.hero.y += world.hero.vy * dt;

      // top limit
      const topLimit = H * PLAYFIELD_TOP_REL;
      if (world.hero.y < topLimit) {
        world.hero.y = topLimit;
        if (world.hero.vy < 0) world.hero.vy = 0;
      }

      // tilt
      world.hero.rot = clamp(world.hero.vy / 1200, -0.35, 0.55);

      // touchdown (fixed)
      tryTouchdown(speed);

      // pickups collision
      updatePickups(dt, speed);

      // floating texts
      for (let i = world.floaters.length - 1; i >= 0; i--) {
        const f = world.floaters[i];
        f.age += dt;
        f.y -= 28 * dt;
        if (f.age > 0.75) world.floaters.splice(i, 1);
      }

      // LOSE only if реально ушёл вниз
      if (world.hero.y - world.hero.h / 2 > H + 110 && !world.result) {
        endRound("LOSE");
      }

      // fx
      spawnRibbonPoint();
      spawnFireParticles(dt);
    }

    if (state === State.LANDING_ROLL) {
      const hero = world.hero;

      const pRoll = world.platforms.find((pp) => pp.id === world.roll.platformId);
      if (!pRoll) {
        setDamagedTrail(1.1);
        hero.vy = 420;
        endRound("LOSE");
        return;
      }

      world.fx.worldSpeed = Math.max(world.fx.worldSpeed, OBJECT_SPEED_BASE * 0.9);

      // катимся вправо фиксированное расстояние (половина палубы)
      const v = Math.max(240, world.roll.speed || 420);
      hero.x += v * dt;
      world.roll.remain -= v * dt;

      // приклеиваем к палубе
      hero.y = deckTopY(pRoll) - hero.h * 0.45;
      hero.rot = 0.10 + (v / 900) * 0.10;

      const rightEdge = deckRightX(pRoll);

      // если палуба закончилась раньше — падает и проигрыш
      if (hero.x + hero.w * 0.35 >= rightEdge) {
        setDamagedTrail(1.4);
        hero.vy = 420;

        // no camera FX on fall

        endRound("LOSE");
        return;
      }

      // если докатился нужную дистанцию — победа
      if (world.roll.remain <= 0) {
        // camera FX disabled
        endRound("WIN");
        return;
      }
    }



    if (state === State.FINISH_LOSE) {
      world.fx.worldSpeed = Math.max(world.fx.worldSpeed, OBJECT_SPEED_BASE);
      spawnFireParticles(dt);

      world.finishT += dt;
      world.hero.vy += GRAVITY * 0.70 * dt;
      world.hero.y += world.hero.vy * dt;
      world.hero.rot += 1.6 * dt;
      // camera FX disabled
    }

    if (state === State.FINISH_WIN) {
      world.finishT += dt;
      // camera FX disabled
    }


    // hero stacked floaters: advance & cleanup
    if (world.heroFloaters && world.heroFloaters.length) {
      for (let i = world.heroFloaters.length - 1; i >= 0; i--) {
        const f = world.heroFloaters[i];
        f.t += dt;
        if (f.t >= HERO_FLOATER_LIFE) world.heroFloaters.splice(i, 1);
      }
    }

    // ribbon life
    for (let i = world.fx.ribbon.length - 1; i >= 0; i--) {
      const rp = world.fx.ribbon[i];
      rp.t += dt;
      if (rp.t >= rp.life) world.fx.ribbon.splice(i, 1);
    }

    // particles
    for (let i = world.fx.particles.length - 1; i >= 0; i--) {
      const pp = world.fx.particles[i];
      pp.t += dt;
      pp.x += pp.vx * dt;
      pp.y += pp.vy * dt;

      const k = pp.t / pp.life;
      if (pp.kind === "SMOKE") {
        pp.size *= 1 + 0.35 * dt;
        pp.vx *= 1 - 0.65 * dt;
        pp.vy *= 1 - 0.65 * dt;
      } else {
        pp.size *= 1 + 0.22 * dt;
        pp.vx *= 1 - 0.45 * dt;
        pp.vy *= 1 - 0.45 * dt;
      }

      if (k >= 1) world.fx.particles.splice(i, 1);
    }
  }

  // ===== Render helpers =====
  function drawCentered(img, x, y, w, h, rot = 0) {
    if (!img) return false;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rot);
    ctx.drawImage(img, -w / 2, -h / 2, w, h);
    ctx.restore();
    return true;
  }

  // ===== Render FX =====
  function renderRibbonTwoLayer() {
    const pts = world.fx.ribbon;
    if (pts.length < 2) return;

    const ws = Math.max(250, world.fx.worldSpeed || OBJECT_SPEED_BASE);

    ctx.save();
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    for (let i = 1; i < pts.length; i++) {
      const a = i / pts.length;

      const p0 = pts[i - 1];
      const p1 = pts[i];

      const k0 = clamp(p0.t / p0.life, 0, 1);
      const k1 = clamp(p1.t / p1.life, 0, 1);

      const x0 = p0.x - ws * (RIBBON_SHIFT_K * k0);
      const y0 = p0.y;

      const x1 = p1.x - ws * (RIBBON_SHIFT_K * k1);
      const y1 = p1.y;

      const t = clamp(a * (1 - k1), 0, 1);

      ctx.globalAlpha = 0.16 * t;
      ctx.strokeStyle = "#2cf2ff";
      ctx.lineWidth = 30 * t;
      ctx.beginPath();
      ctx.moveTo(x0, y0);
      ctx.lineTo(x1, y1);
      ctx.stroke();

      ctx.globalAlpha = 0.44 * t;
      ctx.strokeStyle = "#8ff3ff";
      ctx.lineWidth = 11 * t;
      ctx.beginPath();
      ctx.moveTo(x0, y0);
      ctx.lineTo(x1, y1);
      ctx.stroke();
    }

    ctx.globalAlpha = 1;
    ctx.restore();
  }

  function renderFireParticles() {
    if (world.fx.particles.length === 0) return;

    for (let i = 0; i < world.fx.particles.length; i++) {
      const p = world.fx.particles[i];
      const k = p.t / p.life;
      const alpha = p.a * (1 - k);

      if (p.kind === "FIRE") {
        ctx.globalAlpha = alpha;
        ctx.fillStyle = "#ff7a00";
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * (0.5 + 0.7 * (1 - k)), 0, Math.PI * 2);
        ctx.fill();

        ctx.globalAlpha = alpha * 0.7;
        ctx.fillStyle = "#ffd000";
        ctx.beginPath();
        ctx.arc(p.x - 2, p.y - 2, p.size * 0.35, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.globalAlpha = alpha;
        ctx.fillStyle = "rgba(80,85,95,1)";
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * (0.65 + 0.75 * k), 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.globalAlpha = 1;
  }

  function renderPickups() {
    for (const p of world.pickups) {
      const isBonus = p.type.startsWith("BONUS");
      const pulse = isBonus ? (0.92 + 0.08 * Math.sin(world.t * 5 + p.id)) : 1;

      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.scale(pulse, pulse);

      // Если есть спрайты — рисуем их (это приоритет).
      let img = null;
      if (p.type === "BONUS_X2") img = GFX.bonusX2;
      else if (p.type === "BONUS_X3") img = GFX.bonusX3;
      else if (p.type === "BONUS_ADD1") img = GFX.bonusAdd1;
      else if (p.type === "BONUS_ADD2") img = GFX.bonusAdd2;
      else if (p.type === "BONUS_ADD3") img = GFX.bonusAdd3;
      else if (p.type === "ROCKET") img = GFX.rocket;

      if (img) {
        ctx.globalAlpha = 1;
        ctx.drawImage(img, -p.w / 2, -p.h / 2, p.w, p.h);
        ctx.restore();
        continue;
      }

if (isBonus) {
        ctx.globalAlpha = 0.10;
        ctx.fillStyle = "#ffd54a";
        ctx.beginPath();
        ctx.arc(0, 0, p.w * 0.75, 0, Math.PI * 2);
        ctx.fill();

        ctx.globalAlpha = 0.95;
        ctx.fillStyle = "#ffd54a";
        ctx.beginPath();
        ctx.arc(0, 0, p.w * 0.38, 0, Math.PI * 2);
        ctx.fill();

        ctx.globalAlpha = 0.55;
        ctx.fillStyle = "#fff3c1";
        ctx.beginPath();
        ctx.arc(-3, -3, p.w * 0.18, 0, Math.PI * 2);
        ctx.fill();
      } else {
      ctx.globalAlpha = 0.30;
        ctx.fillStyle = "#ff3b3b";
        ctx.beginPath();
        ctx.arc(0, 0, p.w * 0.80, 0, Math.PI * 2);
        ctx.fill();

        ctx.globalAlpha = 0.95;
        ctx.fillStyle = "#ff3b3b";
        ctx.beginPath();
        ctx.arc(0, 0, p.w * 0.32, 0, Math.PI * 2);
        ctx.fill();

        ctx.globalAlpha = 0.75;
        ctx.fillStyle = "#ffd0d0";
        ctx.beginPath();
        ctx.arc(2, -2, p.w * 0.14, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();
      ctx.globalAlpha = 1;
    }
  }

  // ===== Render =====
  function render(alpha = 1) {
    ctx.clearRect(0, 0, W, H);

    ctx.save();
    // Camera FX removed: render in screen-space (no shake/zoom/translate)

    // BG + Parallax (space)
    // Use stable parallax time (no coupling to worldSpeed acceleration)
    const ws = OBJECT_SPEED_BASE;
    const pt = world.parallaxT;

    function drawTiledX(img, speedFactor, alpha = 1) {
      if (!img) return;
      // scale background to cover screen
      const scale = Math.max(W / img.width, H / img.height);
      const dw = img.width * scale;
      const dh = img.height * scale;

      // horizontal parallax scroll
      const period = Math.max(1, dw);
      let ox = -((pt * ws * speedFactor) % period);

      ctx.save();
      ctx.globalAlpha = alpha;
      // tile enough times to cover screen
      for (let x = ox; x < W + period; x += period) {
        ctx.drawImage(img, x, (H - dh) / 2, dw, dh);
      }
      // draw one extra to the left if needed
      if (ox > 0) {
        ctx.drawImage(img, ox - period, (H - dh) / 2, dw, dh);
      }
      ctx.restore();
    }

    // 1) deep space background (preferred)
    if (GFX.ready && GFX.bgSpace) {
      drawTiledX(GFX.bgSpace, 0.15, 1);
      // subtle overlay for readability
      ctx.save();
      ctx.globalAlpha = 0.30;
      ctx.fillStyle = "#05070d";
      ctx.fillRect(0, 0, W, H);
      ctx.restore();
    } else if (GFX.ready && GFX.bg) {
      // fallback splash background (old)
      const img = GFX.bg;
      const s = Math.max(W / img.width, H / img.height);
      const dw = img.width * s;
      const dh = img.height * s;
      ctx.globalAlpha = 1;
      ctx.drawImage(img, (W - dw) / 2, (H - dh) / 2, dw, dh);

      ctx.globalAlpha = 0.30;
      ctx.fillStyle = "#05070d";
      ctx.fillRect(0, 0, W, H);
      ctx.globalAlpha = 1;
    } else {
      // no images yet: procedural stars
      ctx.fillStyle = "#05070d";
      ctx.fillRect(-60, -60, W + 120, H + 120);
      for (const st of world.stars) {
        ctx.globalAlpha = st.a;
        ctx.fillStyle = "#9be7ff";
        ctx.fillRect(st.x, st.y, st.s, st.s);
      }
      ctx.globalAlpha = 1;
    }

    // 2) parallax planets (moon/mars)
    {
      const t = pt;

      function drawPlanet(img, baseX, baseY, speedFactor, targetSize, alpha) {
        if (!img) return false;
        const s = targetSize / Math.max(1, Math.max(img.width, img.height));
        const w = img.width * s;
        const h = img.height * s;

        const span = W + w * 2;
        const x = baseX - ((t * ws * speedFactor) % span) + w;

        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.drawImage(img, x - w / 2, baseY - h / 2, w, h);
        ctx.restore();
        return true;
      }

      const sizeMoon = Math.min(W, H) * 0.34;
      const sizeMars = Math.min(W, H) * 0.26;

      const okMoon = drawPlanet(GFX.moon, W * 0.78, H * 0.45, 0.10, sizeMoon, 0.45);
      const okMars = drawPlanet(GFX.mars, W * 0.85, H * 0.20, 0.15, sizeMars, 0.42);

      // fallback: simple circles if planets not found
      if (!okMoon || !okMars) {
        const p1x = (W * 0.78) - ((t * ws * 0.015) % (W + 300)) + 150;
        const p2x = (W * 0.38) - ((t * ws * 0.028) % (W + 420)) + 210;

        ctx.save();
        ctx.globalAlpha = 0.10;
        ctx.fillStyle = "#2cf2ff";
        ctx.beginPath();
        ctx.arc(p1x, H * 0.28, 58, 0, Math.PI * 2);
        ctx.fill();

        ctx.globalAlpha = 0.16;
        ctx.fillStyle = "#7c5cff";
        ctx.beginPath();
        ctx.arc(p2x, H * 0.18, 34, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    }

    // platforms
    for (const p of world.platforms) {
      const ok = drawCentered(GFX.island, p.x, p.y, p.w, p.h, 0);
      if (!ok) {
        ctx.fillStyle = "rgba(0,180,255,0.70)";
        ctx.fillRect(p.x - p.w / 2, p.y - p.h / 2, p.w, p.h);
      }
    }

    // pickups
    renderPickups();

    // fx
    if (world.fx.mode === "BLUE") renderRibbonTwoLayer();
    else renderFireParticles();


    // hero
    const h = world.hero;
    const heroDrawn = drawCentered(GFX.robinson, h.x, h.y, h.w, h.h, h.rot);
    if (!heroDrawn) {
      ctx.save();
      ctx.translate(h.x, h.y);
      ctx.rotate(h.rot);
      ctx.fillStyle = "#00c8ff";
      ctx.beginPath();
      ctx.arc(0, 0, 18, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // stacked labels near hero (top-right)
    if (world.heroFloaters && world.heroFloaters.length) {
      const hx = h.x + h.w * 0.65;
      const hy = h.y - h.h * 0.15;

      ctx.save();
      ctx.textAlign = "left";
      ctx.textBaseline = "middle";
      ctx.font = "900 20px Arial";
      ctx.shadowColor = "rgba(0,0,0,0.55)";
      ctx.shadowBlur = 10;

      for (let i = 0; i < world.heroFloaters.length; i++) {
        const f = world.heroFloaters[i];
        const k = clamp(f.t / HERO_FLOATER_LIFE, 0, 1);
        const alpha = 1 - k;
        const rise = HERO_FLOATER_RISE * k;

        ctx.globalAlpha = alpha;
        ctx.fillStyle = f.color || "rgba(70,255,160,1)";
        ctx.fillText(f.text, hx, hy - i * HERO_FLOATER_STACK_GAP - rise);
      }
      ctx.restore();
      ctx.globalAlpha = 1;
    }

    // legacy floating texts (world space) — keep if something else uses it
    if (world.floaters && world.floaters.length) {
      for (const f of world.floaters) {
        const a = clamp(1 - f.age / 0.75, 0, 1);
        ctx.save();
        ctx.globalAlpha = a;
        ctx.font = "900 22px Arial";
        ctx.fillStyle = f.color || "#7CFFB1";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.shadowColor = "rgba(0,0,0,0.45)";
        ctx.shadowBlur = 10;
        ctx.fillText(f.text, f.x, f.y);
        ctx.restore();
      }
      ctx.globalAlpha = 1;
    }


    // HUD (screen space): potential win above hero
    {
      const h = world.hero;
      const sx = h.x + world.cam.x;
      const sy = h.y + world.cam.y - h.h * 0.60; // ближе к Робинзону
      const bet = Number(world.bet) || 0;
      const mult = Number(world.mult) || 1;
      const add = Number(world.add) || 0;
      const pot = bet * mult + add;

      ctx.save();
      ctx.globalAlpha = state === State.RUNNING || state === State.LANDING_ROLL ? 1 : 0;
      ctx.font = "900 22px Arial"; // +40% размер
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillStyle = "#FFD84D";
      ctx.shadowColor = "rgba(0,0,0,0.55)";
      ctx.shadowBlur = 12;
      ctx.fillText("$" + pot.toFixed(pot >= 100 ? 0 : 2), sx, sy);
      ctx.restore();
    }

    if (!GFX.ready) {
      ctx.fillStyle = "rgba(255,255,255,0.75)";
      ctx.font = "600 14px Arial";
      ctx.fillText("Loading assets...", 24, H - 24);
    }

    // restore render-level save()
    ctx.restore();
  }

  // ===== Loop =====
  function loop(time) {
    let dt = (time - lastTime) / 1000;
    lastTime = time;

    // clamp huge frame gaps (tab switch / mobile hiccup)
    dt = Math.min(dt, 0.12);

    if (TIME.freeze > 0) {
      TIME.freeze = Math.max(0, TIME.freeze - dt);
      dt = 0;
    } else {
      dt = dt * TIME.scale * SPEED.scale;
    }

    // fixed timestep simulation (stable feel like "real game")
    const FIXED = 1 / 60;
    loop.acc = (loop.acc || 0) + dt;

    // avoid spiral of death
    loop.acc = Math.min(loop.acc, FIXED * 6);

    while (loop.acc >= FIXED) {
      // keep previous camera state for render interpolation
      world.camPrev = { x: world.cam.x, y: world.cam.y, zoom: world.cam.zoom, shake: world.cam.shake, t: world.t };
      update(FIXED);
      loop.acc -= FIXED;
    }

    // if we didn't step, ensure camPrev exists
    if (!world.camPrev) world.camPrev = { x: world.cam.x, y: world.cam.y, zoom: world.cam.zoom, shake: world.cam.shake, t: world.t };
    const alpha = loop.acc / FIXED;
    render(alpha);
    requestAnimationFrame(loop);
  }

  requestAnimationFrame(loop);
})();