(() => {
  // ====== Config / Rules ======
  const NUM_DECKS = 6;
  const MIN_BET = 5;
  const MAX_BET = 500;
  const DEALER_STANDS_SOFT_17 = true; // common rule in many casinos
  const BLACKJACK_PAYOUT = 1.5;       // 3:2

  // ====== UI ======
  const el = (id) => document.getElementById(id);

  const dealerCardsEl = el("dealerCards");
  const playerCardsEl = el("playerCards");
  const dealerScoreEl = el("dealerScore");
  const playerScoreEl = el("playerScore");
  const messageEl = el("message");

  const balanceEl = el("balance");
  const betEl = el("bet");

  const dealBtn = el("dealBtn");
  const hitBtn = el("hitBtn");
  const standBtn = el("standBtn");
  const doubleBtn = el("doubleBtn");
  const newBtn = el("newBtn");

  const betMinus = el("betMinus");
  const betPlus = el("betPlus");
  const chipBtns = Array.from(document.querySelectorAll(".chip"));

  // ====== State ======
  let shoe = [];
  let balance = 1000;
  let bet = 10;

  let dealerHand = [];
  let playerHand = [];
  let inRound = false;
  let dealerHoleHidden = true;
  let canDouble = false;

  // ====== Deck / Shoe ======
  const SUITS = ["♠", "♥", "♦", "♣"];
  const RANKS = ["A","2","3","4","5","6","7","8","9","10","J","Q","K"];

  function buildShoe() {
    const cards = [];
    for (let d = 0; d < NUM_DECKS; d++) {
      for (const s of SUITS) {
        for (const r of RANKS) cards.push({ r, s });
      }
    }
    // Fisher–Yates shuffle
    for (let i = cards.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [cards[i], cards[j]] = [cards[j], cards[i]];
    }
    return cards;
  }

  function ensureShoe() {
    // if low, reshuffle (simple)
    if (shoe.length < 52) shoe = buildShoe();
  }

  function draw() {
    ensureShoe();
    return shoe.pop();
  }

  // ====== Hand Value ======
  function cardValue(card) {
    if (card.r === "A") return 11;
    if (["K","Q","J"].includes(card.r)) return 10;
    return parseInt(card.r, 10);
  }

  function handTotals(hand) {
    // return best total <=21 if possible, and info about soft
    let total = 0;
    let aces = 0;
    for (const c of hand) {
      total += cardValue(c);
      if (c.r === "A") aces++;
    }
    // downgrade aces from 11 to 1 while bust
    while (total > 21 && aces > 0) {
      total -= 10;
      aces--;
    }
    const isSoft = hand.some(c => c.r === "A") && total <= 21 && (hand.reduce((sum,c)=>sum+cardValue(c),0) !== total);
    return { total, isSoft };
  }

  function isBlackjack(hand) {
    return hand.length === 2 && handTotals(hand).total === 21;
  }

  // ====== Render ======
  function renderCard(card, faceDown=false) {
    const div = document.createElement("div");
    div.className = "card" + (faceDown ? " back" : "");
    if (faceDown) return div;

    const isRed = (card.s === "♥" || card.s === "♦");
    if (isRed) div.classList.add("red");

    const miniTop = document.createElement("div");
    miniTop.className = "mini";
    miniTop.textContent = `${card.r}${card.s}`;

    const miniBottom = document.createElement("div");
    miniBottom.className = "mini bottom";
    miniBottom.textContent = `${card.r}${card.s}`;

    const center = document.createElement("div");
    center.textContent = card.s;

    div.appendChild(miniTop);
    div.appendChild(center);
    div.appendChild(miniBottom);
    return div;
  }

  function renderHands() {
    dealerCardsEl.innerHTML = "";
    playerCardsEl.innerHTML = "";

    dealerHand.forEach((c, idx) => {
      const faceDown = (idx === 1 && dealerHoleHidden);
      dealerCardsEl.appendChild(renderCard(c, faceDown));
    });
    playerHand.forEach(c => playerCardsEl.appendChild(renderCard(c)));

    const dealerShown = dealerHoleHidden
      ? [dealerHand[0]] // show only upcard value
      : dealerHand;

    dealerScoreEl.textContent = dealerHand.length
      ? (dealerHoleHidden ? `${handTotals(dealerShown).total} + ?` : `${handTotals(dealerHand).total}${handTotals(dealerHand).isSoft ? " (soft)" : ""}`)
      : "—";

    playerScoreEl.textContent = playerHand.length
      ? `${handTotals(playerHand).total}${handTotals(playerHand).isSoft ? " (soft)" : ""}`
      : "—";

    balanceEl.textContent = `$${balance}`;
    betEl.textContent = `$${bet}`;
  }

  function setMessage(txt) {
    messageEl.textContent = txt;
  }

  function setControls({ deal, hit, stand, dbl, betControls }) {
    dealBtn.disabled = !deal;
    hitBtn.disabled = !hit;
    standBtn.disabled = !stand;
    doubleBtn.disabled = !dbl;

    betMinus.disabled = !betControls;
    betPlus.disabled = !betControls;
    chipBtns.forEach(b => b.disabled = !betControls);
  }

  // ====== Betting ======
  function clampBet() {
    bet = Math.max(MIN_BET, Math.min(MAX_BET, bet));
    if (bet > balance) bet = Math.max(MIN_BET, Math.min(balance, bet));
  }

  function changeBet(delta) {
    if (inRound) return;
    bet += delta;
    clampBet();
    renderHands();
  }

  // ====== Round Flow ======
  function startRound() {
    if (inRound) return;
    clampBet();
    if (bet > balance) {
      setMessage("Недостаточно баланса для ставки.");
      return;
    }

    inRound = true;
    dealerHoleHidden = true;
    canDouble = true;

    dealerHand = [draw(), draw()];
    playerHand = [draw(), draw()];

    balance -= bet;

    setControls({ deal:false, hit:true, stand:true, dbl:true, betControls:false });
    renderHands();

    // Check immediate outcomes
    const pBJ = isBlackjack(playerHand);
    const dBJ = isBlackjack(dealerHand);

    if (pBJ || dBJ) {
      dealerHoleHidden = false;
      renderHands();
      settleBlackjack(pBJ, dBJ);
      return;
    }

    setMessage("Ваш ход: Hit / Stand / Double.");
  }

  function settleBlackjack(pBJ, dBJ) {
    // If both BJ: push (return bet)
    if (pBJ && dBJ) {
      balance += bet;
      setMessage("Push: у обоих Blackjack. Ставка возвращена.");
    } else if (pBJ) {
      // payout 3:2 -> win bet + 1.5*bet, plus return bet already taken? we took bet from balance, so add back bet + profit
      const win = bet + bet * BLACKJACK_PAYOUT;
      balance += win;
      setMessage(`Blackjack! Выплата 3:2. Вы выиграли $${(bet * BLACKJACK_PAYOUT).toFixed(0)}.`);
    } else {
      setMessage("У дилера Blackjack. Вы проиграли.");
    }
    endRound();
  }

  function hit() {
    if (!inRound) return;
    playerHand.push(draw());
    canDouble = false;
    renderHands();

    const pt = handTotals(playerHand).total;
    if (pt > 21) {
      dealerHoleHidden = false;
      renderHands();
      setMessage("Bust! Вы перебрали. Проигрыш.");
      endRound();
      return;
    }
    setMessage("Ваш ход: Hit / Stand.");
    setControls({ deal:false, hit:true, stand:true, dbl:false, betControls:false });
  }

  function stand() {
    if (!inRound) return;
    canDouble = false;
    setControls({ deal:false, hit:false, stand:false, dbl:false, betControls:false });
    dealerPlay();
  }

  function doubleDown() {
    if (!inRound) return;
    if (!canDouble || playerHand.length !== 2) return;

    // need extra bet
    if (balance < bet) {
      setMessage("Недостаточно баланса для Double.");
      return;
    }

    balance -= bet;      // take additional bet
    bet *= 2;            // total bet
    canDouble = false;

    playerHand.push(draw());
    renderHands();

    const pt = handTotals(playerHand).total;
    if (pt > 21) {
      dealerHoleHidden = false;
      renderHands();
      setMessage("Double: Bust. Проигрыш.");
      endRound();
      return;
    }
    setMessage("Double: авто Stand.");
    setControls({ deal:false, hit:false, stand:false, dbl:false, betControls:false });
    dealerPlay();
  }

  function dealerPlay() {
    dealerHoleHidden = false;
    renderHands();

    let { total: dt, isSoft } = handTotals(dealerHand);

    // Dealer hits until 17+, with rule for soft 17
    while (dt < 17 || (!DEALER_STANDS_SOFT_17 && dt === 17 && isSoft)) {
      dealerHand.push(draw());
      ({ total: dt, isSoft } = handTotals(dealerHand));
    }

    renderHands();
    settleNormal();
  }

  function settleNormal() {
    const pt = handTotals(playerHand).total;
    const dt = handTotals(dealerHand).total;

    if (dt > 21) {
      // dealer bust
      balance += bet * 2;
      setMessage(`Дилер перебрал (${dt}). Вы выиграли $${bet}.`);
      endRound();
      return;
    }

    if (pt > dt) {
      balance += bet * 2;
      setMessage(`Вы выиграли! ${pt} vs ${dt}. Профит $${bet}.`);
    } else if (pt < dt) {
      setMessage(`Вы проиграли. ${pt} vs ${dt}.`);
    } else {
      balance += bet; // push returns stake
      setMessage(`Push. ${pt} vs ${dt}. Ставка возвращена.`);
    }
    endRound();
  }

  function endRound() {
    inRound = false;
    // reset bet back to reasonable if it exceeds balance
    bet = Math.min(bet, Math.max(MIN_BET, balance || MIN_BET));
    clampBet();

    setControls({ deal:true, hit:false, stand:false, dbl:false, betControls:true });
    renderHands();

    if (balance <= 0) {
      setMessage("Баланс 0. Нажмите New Game, чтобы начать заново.");
      setControls({ deal:false, hit:false, stand:false, dbl:false, betControls:false });
    }
  }

  function newGame() {
    shoe = buildShoe();
    balance = 1000;
    bet = 10;
    dealerHand = [];
    playerHand = [];
    inRound = false;
    dealerHoleHidden = true;
    canDouble = false;

    setMessage("Выберите ставку и нажмите Deal.");
    setControls({ deal:true, hit:false, stand:false, dbl:false, betControls:true });
    renderHands();
  }

  // ====== Events ======
  dealBtn.addEventListener("click", startRound);
  hitBtn.addEventListener("click", hit);
  standBtn.addEventListener("click", stand);
  doubleBtn.addEventListener("click", doubleDown);
  newBtn.addEventListener("click", newGame);

  betMinus.addEventListener("click", () => changeBet(-5));
  betPlus.addEventListener("click", () => changeBet(+5));
  chipBtns.forEach(btn => {
    btn.addEventListener("click", () => changeBet(parseInt(btn.dataset.chip, 10)));
  });

  // ====== Init ======
  newGame();
})();
