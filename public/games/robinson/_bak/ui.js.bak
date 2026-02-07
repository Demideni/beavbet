(() => {
  const $play = document.getElementById("play-btn");
  if (!$play) {
    console.error("[ui] #play-btn not found");
    return;
  }

  let state = "IDLE"; // IDLE | RUNNING | LOCKED
  let idleTween = null;

  const setLabel = (txt) => ($play.textContent = txt);

  const setEnabled = (enabled) => {
    $play.style.pointerEvents = enabled ? "auto" : "none";
    $play.style.opacity = enabled ? "1" : "0.7";
  };

  const startIdleAnim = () => {
    if (!window.gsap) return;
    stopIdleAnim();
    idleTween = gsap.to($play, {
      scale: 1.06,
      duration: 0.9,
      yoyo: true,
      repeat: -1,
      ease: "sine.inOut",
    });
  };

  const stopIdleAnim = () => {
    if (idleTween) {
      idleTween.kill();
      idleTween = null;
    }
    if (window.gsap) gsap.set($play, { scale: 1 });
  };

  const tapAnim = () => {
    if (!window.gsap) return;
    gsap.fromTo(
      $play,
      { scale: 1 },
      { scale: 0.92, duration: 0.08, yoyo: true, repeat: 1, ease: "power2.out" }
    );
  };

  const lockForRound = () => {
    state = "RUNNING";
    stopIdleAnim();
    setEnabled(false);
    setLabel("...");
    if (window.gsap) {
      gsap.to($play, { boxShadow: "0 0 10px rgba(0,180,255,0.45), inset 0 0 10px rgba(255,255,255,0.25)", duration: 0.2 });
    }
  };

  const unlockAfterRound = () => {
    state = "IDLE";
    setEnabled(true);
    setLabel("PLAY");
    startIdleAnim();
    if (window.gsap) {
      // лёгкий “return”
      gsap.fromTo($play, { scale: 0.98 }, { scale: 1, duration: 0.25, ease: "back.out(2)" });
    }
  };

  // публичный UI API
  window.RobinsonUI = {
    onPlayClick(handler) {
      $play.addEventListener("click", () => {
        if (state !== "IDLE") return;
        tapAnim();
        handler?.();
      });
    },
    lockForRound,
    unlockAfterRound,
    startIdleAnim,
    stopIdleAnim,
    flashResult(isWin) {
      if (!window.gsap) return;
      gsap.fromTo(
        $play,
        { filter: "brightness(1)" },
        { filter: `brightness(${isWin ? 1.35 : 1.1})`, duration: 0.18, yoyo: true, repeat: 3, ease: "sine.inOut" }
      );
    },
    showResultText(text, isWin) {
  // меняем текст на кнопке на короткое время — как “казино”
  const prev = $play.textContent;
  $play.textContent = text;

  if (window.gsap) {
    gsap.fromTo(
      $play,
      { scale: 1 },
      { scale: 1.08, duration: 0.22, ease: "back.out(2)" }
    );
  }

  setTimeout(() => {
    $play.textContent = prev;
  }, 650);
},

  };

  // стартовое состояние
  startIdleAnim();
})();
