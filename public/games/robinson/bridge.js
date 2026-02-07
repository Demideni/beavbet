(() => {
  // Безопасные вызовы наружу (Next.js страница может прокинуть window.PULZ_GAME)
  const getApi = () => (window.PULZ_GAME && typeof window.PULZ_GAME === "object" ? window.PULZ_GAME : null);

  const safeCall = (fnName, payload) => {
    try {
      const api = getApi();
      if (!api) return;
      const fn = api[fnName];
      if (typeof fn === "function") fn(payload);
    } catch (e) {
      console.warn("[bridge] call failed:", fnName, e);
    }
  };

  window.RobinsonBridge = {
    // Казино может дать баланс/ставку — мы пока не трогаем, только хуки раунда
    emitRoundStart(data) {
      safeCall("onRoundStart", data);
    },
    emitRoundEnd(data) {
      safeCall("onRoundEnd", data);
    },
    // На будущее: запросить ставку / поставить / списать / начислить
    getContext() {
      const api = getApi();
      return api?.getContext ? api.getContext() : null;
    },
  };
})();
