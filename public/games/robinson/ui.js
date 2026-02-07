(() => {
  const $play = document.getElementById("play-btn");
  const $playLabel = document.getElementById("play-label");
  const $betBox = document.getElementById("bet-box");
  const $betValue = document.getElementById("bet-value");
  const $balValue = document.getElementById("bal-value");

  const $modal = document.getElementById("bet-modal");
  const $grid = document.getElementById("bet-grid");
  const $close = document.getElementById("bet-close");

  if (!$play || !$betBox || !$betValue || !$balValue || !$modal || !$grid || !$close) {
    console.error("[ui] required elements not found");
    return;
  }

  // ---- State ----
  // IDLE: можно нажимать, есть пульс; ARMED: более яркий неон; RUNNING/LOCKED: недоступно
  let state = "IDLE"; // IDLE | ARMED | RUNNING
  let balance = 0;

  // bets in USD
  const BETS = [0.2, 0.5, 1, 2, 5, 10, 20, 50, 100, 200];
  let bet = 1;

  let roundId = null;

  const fmt = (n) => {
    const v = Math.max(0, Number(n) || 0);
    return "$" + v.toFixed(v >= 100 ? 0 : 2);
  };

  // ---- Tiny WebAudio (no external files) ----
  const SFX = (() => {
    let ctx = null;
    let master = null;
    let humOsc = null;
    let humGain = null;

    const ensure = () => {
      if (ctx) return ctx;
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = 0.55;
      master.connect(ctx.destination);

      // subtle "energy hum"
      humOsc = ctx.createOscillator();
      humOsc.type = "sine";
      humOsc.frequency.value = 62;

      humGain = ctx.createGain();
      humGain.gain.value = 0.0;

      const humFilter = ctx.createBiquadFilter();
      humFilter.type = "lowpass";
      humFilter.frequency.value = 420;

      humOsc.connect(humFilter);
      humFilter.connect(humGain);
      humGain.connect(master);
      humOsc.start();

      return ctx;
    };

    const resume = async () => {
      const c = ensure();
      if (!c) return;
      if (c.state === "suspended") {
        try { await c.resume(); } catch {}
      }
    };

    const env = (gainNode, t0, a, d) => {
      gainNode.gain.cancelScheduledValues(t0);
      gainNode.gain.setValueAtTime(0, t0);
      gainNode.gain.linearRampToValueAtTime(a, t0 + 0.001 + a * 0.02);
      gainNode.gain.exponentialRampToValueAtTime(Math.max(0.0001, a * 0.12), t0 + d);
      gainNode.gain.exponentialRampToValueAtTime(0.0001, t0 + d + 0.08);
    };

    const zap = () => {
      const c = ensure();
      if (!c) return;
      const t0 = c.currentTime;

      const o = c.createOscillator();
      o.type = "triangle";
      o.frequency.setValueAtTime(520, t0);
      o.frequency.exponentialRampToValueAtTime(1200, t0 + 0.05);

      const g = c.createGain();
      env(g, t0, 0.55, 0.12);

      const f = c.createBiquadFilter();
      f.type = "highpass";
      f.frequency.value = 220;

      o.connect(f);
      f.connect(g);
      g.connect(master);
      o.start(t0);
      o.stop(t0 + 0.16);

      // tiny click
      const click = c.createBufferSource();
      const buf = c.createBuffer(1, Math.floor(c.sampleRate * 0.02), c.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
      click.buffer = buf;

      const ng = c.createGain();
      env(ng, t0, 0.35, 0.05);
      click.connect(ng);
      ng.connect(master);
      click.start(t0);
    };

    const snap = () => {
      const c = ensure();
      if (!c) return;
      const t0 = c.currentTime;

      const o = c.createOscillator();
      o.type = "sawtooth";
      o.frequency.setValueAtTime(420, t0);
      o.frequency.exponentialRampToValueAtTime(90, t0 + 0.12);

      const g = c.createGain();
      env(g, t0, 0.65, 0.18);

      const f = c.createBiquadFilter();
      f.type = "lowpass";
      f.frequency.setValueAtTime(1200, t0);
      f.frequency.exponentialRampToValueAtTime(240, t0 + 0.18);

      o.connect(f);
      f.connect(g);
      g.connect(master);

      o.start(t0);
      o.stop(t0 + 0.22);
    };

    const setHum = (level) => {
      const c = ensure();
      if (!c || !humGain) return;
      const t0 = c.currentTime;
      humGain.gain.cancelScheduledValues(t0);
      humGain.gain.setTargetAtTime(level, t0, 0.08);
    };

    return { resume, zap, snap, setHum };
  })();

  // ---- Helpers ----
  const setBet = (v) => {
    bet = v;
    $betValue.textContent = fmt(bet);
    window.RobinsonGame?.setBet?.(bet);
    refreshArmed();
  };

  const setBalance = (v) => {
    balance = Math.max(0, Number(v) || 0);
    $balValue.textContent = fmt(balance);
    refreshArmed();
  };

  const setEnabled = (enabled) => {
    $play.style.pointerEvents = enabled ? "auto" : "none";
    $betBox.style.pointerEvents = enabled ? "auto" : "none";
    $betBox.style.opacity = enabled ? "1" : "0.65";
  };

  const setVisualState = (next) => {
    state = next;
    $play.classList.toggle("is-locked", next === "RUNNING");
    $play.classList.toggle("is-armed", next === "ARMED");
    $play.classList.toggle("is-idle", next === "IDLE");
    if ($playLabel) $playLabel.textContent = next === "RUNNING" ? "..." : "PLAY";
    SFX.setHum(0);
  };

  const refreshArmed = () => {
    if (state === "RUNNING") return;
    const armed = bet > 0 && balance >= bet;
    setVisualState(armed ? "ARMED" : "IDLE");
  };

  const flash = () => {
    $play.classList.remove("flash");
    // reflow
    void $play.offsetWidth;
    $play.classList.add("flash");
    setTimeout(() => $play.classList.remove("flash"), 320);
  };

  const tapAnim = () => {
    if (!window.gsap) return;
    gsap.fromTo(
      $play,
      { scale: 1 },
      { scale: 0.92, duration: 0.08, yoyo: true, repeat: 1, ease: "power2.out" }
    );
    gsap.fromTo(
      "#bottom-ui",
      { x: 0 },
      { x: 1.8, duration: 0.04, yoyo: true, repeat: 5, ease: "sine.inOut" }
    );
  };

  const lockForRound = () => {
    setVisualState("RUNNING");
    setEnabled(false);
  };

  const unlockAfterRound = () => {
    setEnabled(true);
    roundId = null;
    // IMPORTANT: reset UI state so Play can be pressed again
    setVisualState("IDLE");
    refreshArmed();
    if (window.gsap) gsap.fromTo($play, { scale: 0.98 }, { scale: 1, duration: 0.22, ease: "back.out(2)" });
  };

  // ---- Modal ----
  const openModal = () => $modal.classList.remove("hidden");
  const closeModal = () => $modal.classList.add("hidden");

  const renderBetGrid = () => {
    $grid.innerHTML = "";
    for (const v of BETS) {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "bet-opt" + (v === bet ? " active" : "");
      b.textContent = fmt(v);
      b.addEventListener("click", () => {
        setBet(v);
        renderBetGrid();
        closeModal();
      });
      $grid.appendChild(b);
    }
  };

  $betBox.addEventListener("click", () => {
    if (state === "RUNNING") return;
    renderBetGrid();
    openModal();
  });
  $close.addEventListener("click", closeModal);
  $modal.addEventListener("click", (e) => {
    if (e.target === $modal) closeModal();
  });

  // ---- Casino API wiring ----
  const getApi = () => (window.PULZ_GAME && typeof window.PULZ_GAME === "object" ? window.PULZ_GAME : null);

  async function refreshBalance() {
    try {
      const api = getApi();
      if (!api?.getBalance) return;
      const b = await api.getBalance();
      setBalance(b);
    } catch (e) {
      console.warn("[ui] getBalance failed", e);
    }
  }

  async function onPlay() {
    if (state === "RUNNING") return;

    // unlock audio on first interaction
    SFX.resume();

    flash();
    tapAnim();
    SFX.zap();

    const api = getApi();
    if (!api?.placeBet || !api?.finishRound) {
      console.warn("[ui] PULZ_GAME api missing; starting locally");
      lockForRound();
      window.RobinsonGame?.start?.({ bet, roundId: "local" });
      return;
    }

    try {
      lockForRound();
      const { balance: b, roundId: rid } = await api.placeBet(bet);
      roundId = rid;
      setBalance(b);
      window.RobinsonGame?.start?.({ bet, roundId });
    } catch (e) {
      console.warn("[ui] placeBet failed", e);
      unlockAfterRound();
    }
  }

  $play.addEventListener("click", onPlay);

  // Game → UI callbacks
  window.RobinsonUI = {
    lockForRound,
    unlockAfterRound,
    setBalance,
    refreshBalance,

    // multiplier sync from game.js
    setPlayFX({ multiplier = 1, running = false } = {}) {
      const m = Math.max(1, Number(multiplier) || 1);
      // faster sparks when higher multiplier (clamped)
      const dur = Math.max(1.2, 3.2 - Math.min(2.0, (m - 1) * 0.22));
      $play.style.setProperty("--spark-dur", dur.toFixed(2) + "s");
      $play.style.setProperty("--orb-spin", (dur * 0.9).toFixed(2) + "s");
      $play.style.setProperty("--orb-breathe", (running ? 0.95 : 1.25).toFixed(2) + "s");
      // little extra brightness
      $play.style.filter = running ? "brightness(1.05)" : "";
    },

    flashResult(isWin) {
      if (!window.gsap) return;
      gsap.fromTo(
        $play,
        { filter: "brightness(1)" },
        { filter: `brightness(${isWin ? 1.30 : 1.08})`, duration: 0.18, yoyo: true, repeat: 3, ease: "sine.inOut" }
      );
      if (!isWin) SFX.snap();
    },

    showResultText(text, isWin) {
      if ($playLabel) {
        const prev = $playLabel.textContent;
        $playLabel.textContent = String(text || "").toUpperCase();
        $play.classList.add("is-locked"); // show label
        setTimeout(() => {
          $playLabel.textContent = prev || "PLAY";
          $play.classList.toggle("is-locked", state === "RUNNING");
        }, 650);
      }
      if (!isWin) SFX.snap();
    },
  };

  // init
  setBet(bet);
  refreshBalance();
  // start hum in idle (will be silent until audio unlocked)
  refreshArmed();
})();

// Expose helper for keyboard shortcuts
window.RobinsonUI = window.RobinsonUI || {};
window.RobinsonUI.clickPlay = function(){
  const b = document.getElementById('play-btn');
  if (b) b.click();
};
