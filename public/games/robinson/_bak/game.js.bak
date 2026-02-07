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

  const GFX = {
    bg: null,
    robinson: null,
    island: null,
    bonus: null,
    rocket: null,
    ready: false,
  };

  Promise.all([
    loadImage("./assets/splash_bg.png"),
    loadImage("./assets/robinson.png"),
    loadImage("./assets/island_long.png"),
    loadImage("./assets/bonus.png"),
    loadImage("./assets/rocket.png"),
  ]).then(([bg, robinson, island, bonus, rocket]) => {
    GFX.bg = bg;
    GFX.robinson = robinson;
    GFX.island = island;
    GFX.bonus = bonus;
    GFX.rocket = rocket;
    GFX.ready = true;
  });

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
  // Возвращаем “нормальный” размер палубы (как было до экспериментов).
  const PLATFORM_WIDTH_MUL = 1.0;
  const PLATFORM_SPACING_MULT = 3.0; // расстояние между платформами = 3 длины платформы

  // landing zones (0..1 along deck)
  // Посадочные зоны под “нормальную” палубу.
  // (Нормализованные координаты вдоль палубы 0..1)
  const WIN_ZONE_L = 0.18;
  const WIN_ZONE_R = 0.62;
  const LOSE_ZONE_L = 0.78;
  const LOSE_ZONE_R = 0.96;

  // pickups (air)
  const PICKUP_POOL = 30;
  const BONUS_CHANCE = 0.62;
  // Ты имел в виду НЕ размер, а количество.
  // Размер оставляем базовым, а плотность увеличиваем.
  const PICKUP_SIZE = 26;
  const PICKUP_DENSITY = 1.8; // >1.5, потому что у тебя стало слишком редко
  const PICKUP_SPACING_MIN_PX = Math.round(220 / PICKUP_DENSITY);
  const PICKUP_SPACING_MAX_PX = Math.round(420 / PICKUP_DENSITY);
  const PICKUP_MIN_SEP_PX = 150; // защита от “вплотную” даже при высокой плотности
  const BONUS_IMPULSE = 260; // up
  const HIT_IMPULSE = 220; // down

  // ===== World =====
  const world = {
    t: 0,
    roundT: 0,
    roundDur: 3.6,

    cam: { x: 0, y: 0, shake: 0 },

    hero: { x: 0, y: 0, vy: 0, w: 0, h: 0, rot: 0, prevBottom: 0 },

    platforms: [], // {id,x,y,w,h}
    nextPlatformId: 1,
    platformY: 0,
    platformSpacingPx: 0,

    pickups: [], // {id,x,y,w,h,type,age}
    nextPickupId: 1,
    nextPickupX: 0,

    bonusCount: 0,

    stars: [],
    result: null,
    finishT: 0,

    plan: null,
    decided: false,

    roll: { vx: 0, platformId: null },

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

  function cameraKick(amount = 1) {
    world.cam.shake = Math.max(world.cam.shake, amount);
  }
  function cameraPunch(dx = 0, dy = 0) {
    world.cam.x += dx;
    world.cam.y += dy;
  }

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

    world.cam.x = 0;
    world.cam.y = 0;
    world.cam.shake = 0;

    world.fx.mode = "BLUE";
    world.fx.fireUntil = 0;
    world.fx.particles = [];
    world.fx.ribbon = [];
    world.fx.worldSpeed = OBJECT_SPEED_BASE;
    world.fx.lastRibbonX = world.hero.x;
    world.fx.lastRibbonY = world.hero.y;

    planRound();

    // ===== Platforms: ровная цепочка (фиксированная высота + фиксированный шаг) =====
    const { w: pw, h: ph } = platformBaseSize();
    world.platformY = Math.round(H * WATER_LINE_REL);
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
    // Будем спавнить по "пройденному расстоянию" (в пикселях), чтобы на любой скорости
    // объекты не появлялись вплотную.
    world.nextPickupX = rnd(PICKUP_SPACING_MIN_PX, PICKUP_SPACING_MAX_PX);
  }

  function endRound(result) {
    if (state !== State.RUNNING && state !== State.LANDING_ROLL) return;

    world.result = result;
    emitEnd(result);

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

  window.RobinsonUI?.onPlayClick?.(startRound);

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

  function spawnPickup() {
    const x = W + rnd(180, 520);

    // Два "коридора" по Y: верхний и нижний, но без прилипания к палубе.
    const topMin = H * PLAYFIELD_TOP_REL + 40;
    const topMax = H * 0.42;

    // низ — выше палубы, чтобы бонусы/ракеты не оказывались "на платформе"
    const { h: ph } = platformBaseSize();
    const deckTop = world.platformY - ph / 2;
    const lowMin = H * 0.54;
    const lowMax = Math.min(deckTop - 70, H * (WATER_LINE_REL - 0.10));

    const useTop = Math.random() < 0.5;
    const y = useTop ? rnd(topMin, topMax) : rnd(lowMin, lowMax);

    const type = Math.random() < BONUS_CHANCE ? "BONUS" : "ROCKET";

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
      w: PICKUP_SIZE,
      h: PICKUP_SIZE,
      type,
      age: 0,
    });

    if (world.pickups.length > PICKUP_POOL) world.pickups.shift();
  }

  function maybeSpawnPickup(dt, worldSpeed) {
    // nextPickupX используем как "следующая дистанция до спавна" в пикселях
    world.nextPickupX -= worldSpeed * dt;
    if (world.nextPickupX > 0) return;
    spawnPickup();
    world.nextPickupX = rnd(PICKUP_SPACING_MIN_PX, PICKUP_SPACING_MAX_PX);
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

        if (p.type === "BONUS") {
          world.bonusCount += 1;
          emitBonus("BONUS");
          window.RobinsonUI?.onBonusCollect?.("BONUS", world.bonusCount);

          // impulse UP, continue flight
          world.hero.vy = Math.min(world.hero.vy, 0) - BONUS_IMPULSE;
          cameraKick(0.45);
        } else {
          // ROCKET: impulse DOWN, fire trail, continue
          emitHit("ROCKET");
          setDamagedTrail(1.2);
          world.hero.vy = Math.max(world.hero.vy, 0) + HIT_IMPULSE;
          cameraKick(0.85);
          cameraPunch(-6, 4);
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

    // садимся только когда падаем вниз
    if (hero.vy < 0) return;

    const PAD_X = hero.w * 0.18;

    // перебираем все платформы и ищем реальный контакт
    for (let i = 0; i < world.platforms.length; i++) {
      const p = world.platforms[i];

      const top = deckTopY(p);

      // Платформа двигается по X во время кадра, поэтому используем swept-проверку по X.
      const leftNow = deckLeftX(p);
      const rightNow = deckRightX(p);
      const prevX = typeof p.prevX === "number" ? p.prevX : p.x;
      const leftPrev = prevX - p.w / 2;
      const rightPrev = prevX + p.w / 2;
      const leftSweep = Math.min(leftPrev, leftNow);
      const rightSweep = Math.max(rightPrev, rightNow);

      // по X должен быть над палубой (учитывая sweep)
      if (hero.x < leftSweep - PAD_X || hero.x > rightSweep + PAD_X) continue;

      // пересёк линию верхушки палубы между кадрами
      const crossed = bottomPrev < top && bottomNow >= top;
      if (!crossed) continue;

      // реальный X внутри swept-объёма палубы
      if (hero.x < leftSweep || hero.x > rightSweep) continue;

      // зона по текущей палубе (0..1). Берём текущие границы, чтобы зоны были стабильные.
      const denom = Math.max(1, rightNow - leftNow);
      const norm = clamp((hero.x - leftNow) / denom, 0, 1);

      const inWinZone = norm >= WIN_ZONE_L && norm <= WIN_ZONE_R;
      const inLoseZone = norm >= LOSE_ZONE_L && norm <= LOSE_ZONE_R;

      const wantWin = world.plan.result === "WIN";
      const okZone = wantWin ? inWinZone : inLoseZone;

      // если не в нужной зоне — это промах, НЕ садимся на ЭТУ платформу
      if (!okZone) continue;

      // САДИМСЯ: фиксируем только Y, X не трогаем
      world.decided = true;

      hero.y = top - hero.h * 0.45;
      hero.vy = 0;
      hero.rot = 0.08;

      state = State.LANDING_ROLL;
      world.roll.vx = Math.max(320, speed * 0.85);
      world.roll.platformId = p.id;

      // FEEL
      hitPause(0.055, 0.22, 0.14);
      cameraPunch(-8, 6);
      cameraKick(1.25);
      return;
    }
  }

  // ===== Update =====
  function update(dt) {
    world.t += dt;

    // camera shake
    world.cam.shake = Math.max(0, world.cam.shake - dt * 3.6);
    const s = world.cam.shake;
    if (s > 0) {
      world.cam.x = Math.sin(world.t * 41.3) * 6 * s;
      world.cam.y = Math.cos(world.t * 37.7) * 5 * s;
    } else {
      world.cam.x = 0;
      world.cam.y = 0;
    }

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

      // roll right
      world.roll.vx = Math.max(0, world.roll.vx - ROLL_FRICTION * dt);
      hero.x += world.roll.vx * dt;

      hero.y = deckTopY(pRoll) - hero.h * 0.45;
      hero.rot = 0.10 + (world.roll.vx / 900) * 0.10;

      const rightEdge = deckRightX(pRoll);

      if (hero.x + hero.w * 0.35 >= rightEdge) {
        setDamagedTrail(1.4);
        hero.vy = 420;

        hitPause(0.08, 0.18, 0.18);
        cameraPunch(-14, 10);
        cameraKick(1.8);

        endRound("LOSE");
        return;
      }

      if (world.roll.vx <= ROLL_STOP_VX) {
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
      if (world.finishT < 0.6) cameraKick(0.12);
    }

    if (state === State.FINISH_WIN) {
      world.finishT += dt;
      if (world.finishT < 0.35) cameraKick(0.07);
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
      const pulse = 0.86 + 0.14 * Math.sin(world.t * 10 + p.id);

      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.scale(pulse, pulse);

      // Если есть спрайты — рисуем их (это приоритет).
      if (p.type === "BONUS" && GFX.bonus) {
        ctx.globalAlpha = 1;
        ctx.drawImage(GFX.bonus, -p.w / 2, -p.h / 2, p.w, p.h);
        ctx.restore();
        continue;
      }
      if (p.type === "ROCKET" && GFX.rocket) {
        ctx.globalAlpha = 1;
        ctx.drawImage(GFX.rocket, -p.w / 2, -p.h / 2, p.w, p.h);
        ctx.restore();
        continue;
      }

      if (p.type === "BONUS") {
        ctx.globalAlpha = 0.22;
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
        ctx.globalAlpha = 0.20;
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
  function render() {
    ctx.clearRect(0, 0, W, H);

    ctx.save();
    ctx.translate(world.cam.x, world.cam.y);

    // BG
    if (GFX.ready && GFX.bg) {
      const img = GFX.bg;
      const s = Math.max(W / img.width, H / img.height);
      const dw = img.width * s;
      const dh = img.height * s;
      ctx.globalAlpha = 1;
      ctx.drawImage(img, (W - dw) / 2, (H - dh) / 2, dw, dh);

      ctx.globalAlpha = 0.18;
      ctx.fillStyle = "#05070d";
      ctx.fillRect(0, 0, W, H);
      ctx.globalAlpha = 1;
    } else {
      ctx.fillStyle = "#05070d";
      ctx.fillRect(-60, -60, W + 120, H + 120);
      for (const st of world.stars) {
        ctx.globalAlpha = st.a;
        ctx.fillStyle = "#9be7ff";
        ctx.fillRect(st.x, st.y, st.s, st.s);
      }
      ctx.globalAlpha = 1;
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

    ctx.restore();

    if (!GFX.ready) {
      ctx.fillStyle = "rgba(255,255,255,0.75)";
      ctx.font = "600 14px Arial";
      ctx.fillText("Loading assets...", 24, H - 24);
    }
  }

  // ===== Loop =====
  function loop(time) {
    let dt = (time - lastTime) / 1000;
    lastTime = time;
    dt = Math.min(dt, 0.033);

    if (TIME.freeze > 0) {
      TIME.freeze = Math.max(0, TIME.freeze - dt);
      dt = 0;
    } else {
      dt = dt * TIME.scale;
    }

    update(dt);
    render();
    requestAnimationFrame(loop);
  }

  requestAnimationFrame(loop);
})();
