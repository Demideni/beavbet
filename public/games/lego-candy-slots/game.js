
// Lego Candy Slots — SB1000-like (cluster pays, cascades, bombs, FS)
// Key UX fix: every spin animates full drop (no teleporting symbols).
(() => {
  const canvas = document.getElementById("c");
  const ctx = canvas.getContext("2d");

  const ui = {
    bal: document.getElementById("bal"),
    bet: document.getElementById("bet"),
    win: document.getElementById("win"),
    mode: document.getElementById("mode"),
    fs: document.getElementById("fs"),
    fsm: document.getElementById("fsm"),
    spinBtn: document.getElementById("spinBtn"),
    buyModal: document.getElementById("buyModal"),
    cancelBuy: document.getElementById("cancelBuy"),
    confirmBuy: document.getElementById("confirmBuy"),
    tapbar: document.getElementById("tapbar"),
  };

// --- START BUTTON (PNG only) / hide tapbar ---
// Place your button here: public/games/lego-candy-slots/assets/ui/btn-start.png
const START_BTN_SRC = "./assets/ui/btn-start.png";
function getBtnSize(){
  // responsive size that feels premium on phones
  const W = window.innerWidth || 390;
  return Math.round(Math.min(220, Math.max(150, W * 0.38)));
}
function layoutStartButton(){
  if(!ui.spinBtn) return;
  const size = getBtnSize();
  // Hide any tapbar if present (we keep only the button)
  if(ui.tapbar) ui.tapbar.style.display = "none";
  ui.spinBtn.style.position = "fixed";
  ui.spinBtn.style.left = "50%";
  ui.spinBtn.style.bottom = "calc(18px + env(safe-area-inset-bottom))";
  ui.spinBtn.style.transform = "translateX(-50%)";
  ui.spinBtn.style.width = size + "px";
  ui.spinBtn.style.height = size + "px";
  ui.spinBtn.style.border = "none";
  ui.spinBtn.style.padding = "0";
  ui.spinBtn.style.margin = "0";
  ui.spinBtn.style.borderRadius = "999px";
  ui.spinBtn.style.background = `url('${START_BTN_SRC}') center/contain no-repeat`;
  ui.spinBtn.style.backgroundColor = "transparent";
  ui.spinBtn.style.boxShadow = "0 10px 35px rgba(0,0,0,0.45)";
  ui.spinBtn.style.touchAction = "manipulation";
  ui.spinBtn.style.userSelect = "none";
  ui.spinBtn.textContent = ""; // ensure no text label
}

  // --- UI FX helpers (studs flash + button pulse) ---
  function flashTapbar(){
    if(!ui.tapbar) return;
    if(ui.tapbar.style && ui.tapbar.style.display === 'none') return;
    ui.tapbar.classList.remove('flash');
    // force reflow so animation restarts
    void ui.tapbar.offsetWidth;
    ui.tapbar.classList.add('flash');
    setTimeout(()=>ui.tapbar.classList.remove('flash'), 600);
  }
  function pulseSpinBtn(){
    if(!ui.spinBtn) return;
    ui.spinBtn.classList.remove('pulse');
    void ui.spinBtn.offsetWidth;
    ui.spinBtn.classList.add('pulse');
    setTimeout(()=>ui.spinBtn.classList.remove('pulse'), 800);
  }

  const COLS = 6, ROWS = 5, MIN_CLUSTER = 8;
  const BUY_BONUS_COST_MULT = 100;
  const FS_AWARD = 10;
  const MAX_WIN_MULT = 5000;

  const SPIN_DROP_MS = 360;
  const CASCADE_DROP_MS = 300;
  const STAGGER_MS = 16;

  const SYMBOLS = [
    { id: "low_blue",   file: "low_blue.png",   weight: 16, pay: [0,0,0,0,0,0,0, 0.2,0.3,0.4,0.6,0.9,1.2,1.6,2.0] },
    { id: "low_green",  file: "low_green.png",  weight: 16, pay: [0,0,0,0,0,0,0, 0.2,0.3,0.4,0.6,0.9,1.2,1.6,2.0] },
    { id: "low_purple", file: "low_purple.png", weight: 16, pay: [0,0,0,0,0,0,0, 0.2,0.3,0.4,0.6,0.9,1.2,1.6,2.0] },
    { id: "low_red",    file: "low_red.png",    weight: 16, pay: [0,0,0,0,0,0,0, 0.2,0.3,0.4,0.6,0.9,1.2,1.6,2.0] },
    { id: "low_yellow", file: "low_yellow.png", weight: 16, pay: [0,0,0,0,0,0,0, 0.2,0.3,0.4,0.6,0.9,1.2,1.6,2.0] },
    { id: "mid_candy",   file: "mid_candy.png",   weight: 10, pay: [0,0,0,0,0,0,0, 0.3,0.5,0.8,1.2,1.7,2.4,3.2,4.0] },
    { id: "mid_crystal", file: "mid_crystal.png", weight: 10, pay: [0,0,0,0,0,0,0, 0.3,0.5,0.8,1.2,1.7,2.4,3.2,4.0] },
    { id: "high_head",   file: "high_head.png",   weight: 6,  pay: [0,0,0,0,0,0,0, 0.6,1.0,1.5,2.2,3.2,4.6,6.2,8.0] },
  ];
  const SCATTER = { id: "scatter", file: "scatter.png", weight: 2 };

  const MULTI_BOMBS = [
    { mult: 2, file:"m_x2.png", w: 36 },
    { mult: 5, file:"m_x5.png", w: 26 },
    { mult:10, file:"m_x10.png", w: 18 },
    { mult:25, file:"m_x25.png", w: 10 },
    { mult:50, file:"m_x50.png", w: 6 },
    { mult:100,file:"m_x100.png",w: 3 },
  ];

  const IMG = new Map();
  function loadImage(src){ return new Promise((res,rej)=>{ const i=new Image(); i.onload=()=>res(i); i.onerror=rej; i.src=src; }); }
  async function loadAssets(){
    const base="./assets/symbols/";
    const files=new Set();
    SYMBOLS.forEach(s=>files.add(s.file));
    files.add(SCATTER.file);
    MULTI_BOMBS.forEach(b=>files.add(b.file));
    await Promise.all([...files].map(async f=>{ IMG.set(f, await loadImage(base+f)); }));
  }

  function pickWeighted(list){
    let sum=0; for(const it of list) sum += (it.weight ?? it.w);
    let r=Math.random()*sum;
    for(const it of list){ r -= (it.weight ?? it.w); if(r<=0) return it; }
    return list[list.length-1];
  }
  function randomSymbol(){
    const pool=[...SYMBOLS.map(s=>({id:s.id,file:s.file,weight:s.weight})), {id:SCATTER.id,file:SCATTER.file,weight:SCATTER.weight,isScatter:true}];
    return pickWeighted(pool);
  }

  let balance=0, bet=1, lastWin=0;
  let isFS=false, fsLeft=0, fsMulti=1;
  let spinning=false;

  let grid=[]; // {symId,img,x,y,yAnim}
  let bombs=[]; // {x,y,img,mult,alpha}

  let W=0,H=0, cell=0, pad=0, topY=0, leftX=0;
  let innerPad=24; // inner fog padding and frame inner edge

  function resize(){
    const dpr=Math.max(1, Math.min(2, window.devicePixelRatio||1));
    const ww=innerWidth, hh=innerHeight;
    canvas.width=Math.floor(ww*dpr); canvas.height=Math.floor(hh*dpr);
    canvas.style.width=ww+"px"; canvas.style.height=hh+"px";
    ctx.setTransform(dpr,0,0,dpr,0,0);
    W=ww; H=hh;

    const safeTop=70;
    const safeBottom = getBtnSize() + 60; // keep board above the start button
    const usableH=H-safeTop-safeBottom;
    const usableW=Math.min(W,520);
    cell=Math.floor(Math.min((usableW-24)/COLS,(usableH-24)/ROWS));
    pad=Math.floor(cell*0.12);
    const boardW=COLS*cell+(COLS-1)*pad;
    const boardH=ROWS*cell+(ROWS-1)*pad;
    leftX=Math.floor((W-boardW)/2);
    topY=Math.floor(safeTop+(usableH-boardH)/2);

    layoutStartButton();

    for(let r=0;r<ROWS;r++) for(let c=0;c<COLS;c++){
      const i=r*COLS+c;
      if(!grid[i]) continue;
      grid[i].x=leftX+c*(cell+pad);
      grid[i].y=topY+r*(cell+pad);
    }
  }

  function roundRect(x,y,w,h,r){
    ctx.beginPath();
    ctx.moveTo(x+r,y);
    ctx.arcTo(x+w,y,x+w,y+h,r);
    ctx.arcTo(x+w,y+h,x,y+h,r);
    ctx.arcTo(x,y+h,x,y,r);
    ctx.arcTo(x,y,x+w,y,r);
    ctx.closePath();
  }

  function drawBG(){
    const g=ctx.createRadialGradient(W*0.5,H*0.35,40,W*0.5,H*0.55,Math.max(W,H));
    g.addColorStop(0,"rgba(59,130,246,0.14)");
    g.addColorStop(0.45,"rgba(2,6,23,0.55)");
    g.addColorStop(1,"rgba(0,0,0,0.95)");
    ctx.fillStyle=g; ctx.fillRect(0,0,W,H);
    ctx.globalAlpha=0.18; ctx.fillStyle="#e5e7eb";
    for(let i=0;i<40;i++){ const x=(i*97)%W, y=(i*173)%H; ctx.fillRect(x,y,1,1); }
    ctx.globalAlpha=1;
  }

  function drawFrame(){
  // Procedural frame (no PNG). Frame is ALWAYS on top of fog + symbols.
  const bw = COLS*cell + (COLS-1)*pad;
  const bh = ROWS*cell + (ROWS-1)*pad;

  // Inner edge aligns with the fog area (innerPad)
  const ix = leftX - innerPad;
  const iy = topY  - innerPad;
  const iw = bw + innerPad*2;
  const ih = bh + innerPad*2;

  // Frame thickness around the fog area
  const thick = Math.max(14, Math.floor(cell * 0.22));
  const ox = ix - thick;
  const oy = iy - thick;
  const ow = iw + thick*2;
  const oh = ih + thick*2;

  const rOuter = Math.max(22, Math.floor(cell * 0.55));
  const rInner = Math.max(18, Math.floor(cell * 0.45));

  ctx.save();
  ctx.shadowColor = "rgba(0,0,0,0.45)";
  ctx.shadowBlur = 22;

  const grad = ctx.createLinearGradient(ox, oy, ox, oy+oh);
  grad.addColorStop(0.00, "rgba(120,66,0,0.95)");
  grad.addColorStop(0.32, "rgba(222,145,44,0.96)");
  grad.addColorStop(0.62, "rgba(164,88,10,0.96)");
  grad.addColorStop(1.00, "rgba(92,46,0,0.95)");

  ctx.fillStyle = grad;
  ctx.beginPath();
  roundRect(ox, oy, ow, oh, rOuter);
  roundRect(ix, iy, iw, ih, rInner);
  ctx.fill("evenodd");

  // Inner highlight
  ctx.shadowBlur = 0;
  ctx.lineWidth = 2;
  ctx.strokeStyle = "rgba(255,255,255,0.22)";
  roundRect(ix+1, iy+1, iw-2, ih-2, rInner);
  ctx.stroke();

  // Outer subtle outline
  ctx.lineWidth = 1;
  ctx.strokeStyle = "rgba(0,0,0,0.35)";
  roundRect(ox+0.5, oy+0.5, ow-1, oh-1, rOuter);
  ctx.stroke();

  ctx.restore();
}

  function draw(){
  drawBG();
  drawInnerSlotBG();
  drawCellSeparators();

  for(const c of grid){
    if(!c.img) continue;
    ctx.save();
    ctx.shadowColor="rgba(59,130,246,0.28)";
    ctx.shadowBlur=10;
    ctx.drawImage(c.img,c.x,c.yAnim,cell,cell);
    ctx.restore();
  }

  drawHighlights();

  for(const b of bombs){
    if(!b.img) continue;
    ctx.save();
    ctx.globalAlpha=b.alpha;
    ctx.shadowColor="rgba(59,130,246,0.65)";
    ctx.shadowBlur=16;

    const s = (b.scale ?? 1);
    const sz = Math.floor(cell*0.92);
    const cx = b.x + sz/2;
    const cy = b.y + sz/2;
    ctx.drawImage(b.img, cx - (sz*s)/2, cy - (sz*s)/2, sz*s, sz*s);

    ctx.restore();
  }

  drawPopups();

  // frame goes last: on top of fog + symbols (like real slots)
  drawFrame();

  requestAnimationFrame(draw);
}

  function neighbors(idx){
    const r=Math.floor(idx/COLS), c=idx%COLS;
    const out=[];
    if(r>0) out.push(idx-COLS);
    if(r<ROWS-1) out.push(idx+COLS);
    if(c>0) out.push(idx-1);
    if(c<COLS-1) out.push(idx+1);
    return out;
  }

  function findClusters(){
    const seen=new Array(grid.length).fill(false);
    const clusters=[];
    for(let i=0;i<grid.length;i++){
      if(seen[i]) continue;
      const id=grid[i].symId;
      if(id==="scatter"){ seen[i]=true; continue; }
      const q=[i]; seen[i]=true;
      const members=[];
      while(q.length){
        const cur=q.pop(); members.push(cur);
        for(const nb of neighbors(cur)){
          if(seen[nb]) continue;
          if(grid[nb].symId===id){ seen[nb]=true; q.push(nb); }
        }
      }
      if(members.length>=MIN_CLUSTER) clusters.push({id,members});
    }
    return clusters;
  }

  function payoutFor(id,n){
    const sym=SYMBOLS.find(s=>s.id===id);
    if(!sym) return 0;
    const idx=Math.min(sym.pay.length-1,n);
    return sym.pay[idx]||0;
  }

  function easeOutCubic(t){ return 1-Math.pow(1-t,3); }
  function animateY(obj,from,to,ms,delay=0){
    return new Promise(res=>{
      const start=performance.now()+delay;
      function tick(now){
        if(now<start) return requestAnimationFrame(tick);
        const t=Math.min(1,(now-start)/ms);
        const k=easeOutCubic(t);
        obj.yAnim=from+(to-from)*k;
        if(t<1) requestAnimationFrame(tick); else res();
      }
      requestAnimationFrame(tick);
    });
  }

  async function animateFullDrop(){
    const startOffset=(cell+pad)*(ROWS+2);
    const jobs=[];
    for(let r=0;r<ROWS;r++) for(let c=0;c<COLS;c++){
      const i=r*COLS+c;
      const obj=grid[i];
      const target=obj.y;
      const from=target-startOffset-Math.random()*(cell+pad)*2;
      jobs.push(animateY(obj,from,target,SPIN_DROP_MS,c*STAGGER_MS));
    }
    await Promise.all(jobs);
  }

  async function animateCascadeDrop(){
    const jobs=[];
    for(let i=0;i<grid.length;i++){
      const obj=grid[i];
      jobs.push(animateY(obj,obj.yAnim,obj.y,CASCADE_DROP_MS,(i%COLS)*10));
    }
    await Promise.all(jobs);
  }

  function removeIndices(setIdx){ for(const idx of setIdx){ grid[idx].symId=null; grid[idx].img=null; } }

  function collapseAndRefill(){
    for(let c=0;c<COLS;c++){
      const col=[];
      for(let r=ROWS-1;r>=0;r--){
        const idx=r*COLS+c;
        if(grid[idx].symId) col.push(grid[idx].symId);
      }
      while(col.length<ROWS){ col.push(randomSymbol().id); }
      for(let r=ROWS-1;r>=0;r--){
        const idx=r*COLS+c;
        const id=col[ROWS-1-r];
        grid[idx].symId=id;
        const file=(id==="scatter")?SCATTER.file:SYMBOLS.find(s=>s.id===id).file;
        grid[idx].img=IMG.get(file);
      }
    }
  }

  function countScatters(){ return grid.reduce((a,c)=>a+(c.symId==="scatter"),0); }

  function updateUI(){
    ui.bal.textContent=`$${balance.toFixed(2)}`;
    // legacy (hidden) HUD keeps updating safely
    ui.bet.textContent=`BET $${bet.toFixed(2)}`;
    ui.win.textContent=`WIN $${lastWin.toFixed(2)}`;
    ui.mode.textContent=`MODE ${isFS?"FS":"BASE"}`;
    ui.fs.textContent = (fsLeft>0 ? String(fsLeft) : "-");
    ui.fsm.textContent=`FS MULTI x${fsMulti}`;
  }

  async function fetchBalance(){
    try{
      if(window.parent && window.parent.PULZ_GAME?.getBalance) balance = await window.parent.PULZ_GAME.getBalance();
      else balance=1000;
    }catch{ balance=1000; }
    updateUI();
  }
  async function chargeBet(amount){
    try{
      if(window.parent && window.parent.PULZ_GAME?.start){
        const r=await window.parent.PULZ_GAME.start({amount});
        balance = (r.balance ?? (balance-amount));
      } else balance -= amount;
    }catch{ balance -= amount; }
  }
  async function creditWin(win){
    try{
      if(window.parent && window.parent.PULZ_GAME?.finish){
        const r=await window.parent.PULZ_GAME.finish({win});
        balance = (r.balance ?? (balance+win));
      } else balance += win;
    }catch{ balance += win; }
  }

  function placeBombs(picked){
    bombs.length=0;
    for(const b of picked){
      const c=Math.floor(Math.random()*COLS), r=Math.floor(Math.random()*ROWS);
      const x=leftX+c*(cell+pad)+Math.floor(cell*0.04);
      const y=topY+r*(cell+pad)+Math.floor(cell*0.04);
      bombs.push({x,y,img:IMG.get(b.file),mult:b.mult,alpha:0});
    }
  }
  function maybeSpawnBombsBase(){
    const count = Math.random()<0.55?1:(Math.random()<0.25?2:0);
    const picked=[];
    for(let i=0;i<count;i++) picked.push(pickWeighted(MULTI_BOMBS));
    return picked;
  }
  function spawnBombsFS(){
    const count = 1 + (Math.random()<0.55?1:0) + (Math.random()<0.25?1:0);
    const picked=[];
    for(let i=0;i<count;i++) picked.push(pickWeighted(MULTI_BOMBS));
    return picked;
  }
  async function animateBombsIn(){
    await Promise.all(bombs.map(b=>new Promise(res=>{
      const start=performance.now(), ms=180;
      function tick(now){
        const t=Math.min(1,(now-start)/ms);
        b.alpha=t;
        if(t<1) requestAnimationFrame(tick); else res();
      }
      requestAnimationFrame(tick);
    })));
  }

  function newGrid(){
    grid.length=0;
    for(let r=0;r<ROWS;r++) for(let c=0;c<COLS;c++){
      const s=randomSymbol();
      const x=leftX+c*(cell+pad), y=topY+r*(cell+pad);
      grid.push({symId:s.id,img:IMG.get(s.file),x,y,yAnim:y});
    }
  }

  async function doSpin({buyBonus=false}={}){
    if(spinning) return;
    spinning=true;
    lastWin=0; bombs.length=0;

    if(buyBonus){
      const cost=bet*BUY_BONUS_COST_MULT;
      if(balance<cost){ spinning=false; return; }
      await chargeBet(cost);
      isFS=true; fsLeft=FS_AWARD; fsMulti=1;
    } else {
      if(!isFS){
        if(balance<bet){ spinning=false; return; }
        await chargeBet(bet);
      }
    }

    // key feel: full drop EVERY SPIN
    newGrid();
    await animateFullDrop();

    if(!isFS && !buyBonus){
      const sc=countScatters();
      if(sc>=4){ isFS=true; fsLeft=FS_AWARD; fsMulti=1; }
    }

    let totalSpinWin=0;
    let totalSpinMult=0;
    let safety=0;

    while(true){
      const clusters=findClusters();
      if(!clusters.length) break;
      safety++; if(safety>18) break;

      let cascadeWin=0;
      const toRemove=new Set();
      for(const cl of clusters){
        cascadeWin += payoutFor(cl.id, cl.members.length) * bet;
        cl.members.forEach(i=>toRemove.add(i));
      }
      totalSpinWin += cascadeWin;

      // bombs
      const picked = isFS ? spawnBombsFS() : maybeSpawnBombsBase();
      placeBombs(picked);
      await animateBombsIn();
      const add = picked.reduce((a,b)=>a+b.mult,0);
      if(isFS) fsMulti += add;
      else totalSpinMult += add;

      // cascade
      removeIndices(toRemove);
      collapseAndRefill();
      for(const c of grid) c.yAnim -= (cell+pad)*0.8;
      await animateCascadeDrop();
    }

    let finalWin = totalSpinWin;
    if(isFS) finalWin = totalSpinWin * Math.max(1, fsMulti);
    else if(totalSpinMult>0) finalWin = totalSpinWin * (1+totalSpinMult);

    finalWin = Math.min(finalWin, bet*MAX_WIN_MULT);
    lastWin = finalWin;

    // UI FX: flash bar on any win; pulse button on big wins
    if(finalWin > 0){
      flashTapbar();
      const x = finalWin / Math.max(0.01, bet);
      if(x >= 20) pulseSpinBtn();
      if(x >= 60) setTimeout(pulseSpinBtn, 220);
    }

    await creditWin(finalWin);

    if(isFS && !buyBonus){
      fsLeft=Math.max(0,fsLeft-1);
      if(fsLeft===0){ isFS=false; fsMulti=1; }
    }

    updateUI();
    spinning=false;
  }

  // input: tap spin, hold for buy bonus modal
  let holdTimer=null;
  ui.spinBtn.addEventListener("pointerdown",()=>{
    if(spinning) return;
    holdTimer=setTimeout(()=>{ ui.buyModal.style.display="flex"; holdTimer=null; },520);
  });
  ui.spinBtn.addEventListener("pointerup",()=>{
    if(spinning) return;
    if(holdTimer){ clearTimeout(holdTimer); holdTimer=null; doSpin({buyBonus:false}); }
  });
  ui.spinBtn.addEventListener("pointerleave",()=>{ if(holdTimer){ clearTimeout(holdTimer); holdTimer=null; } });
  ui.cancelBuy.addEventListener("click",()=> ui.buyModal.style.display="none");
  ui.confirmBuy.addEventListener("click",async()=>{ ui.buyModal.style.display="none"; await doSpin({buyBonus:true}); });

  window.addEventListener("resize",resize);

  (async()=>{
    resize();
    await loadAssets();
    await fetchBalance();
    newGrid();
    updateUI();
    draw();
    await animateFullDrop();
  })();
})();
function drawCellSeparators(){
  // subtle separators so cells read cleanly, without shifting layout
  ctx.save();
  ctx.globalAlpha = 0.09;
  ctx.lineWidth = 1;
  ctx.strokeStyle = "rgba(255,255,255,0.9)";
  for(let r=0;r<ROWS;r++){
    for(let c=0;c<COLS;c++){
      const x = leftX + c*(cell+pad);
      const y = topY  + r*(cell+pad);
      roundRect(x+2, y+2, cell-4, cell-4, Math.max(10, Math.floor(cell*0.22)));
      ctx.stroke();
    }
  }
  ctx.restore();
}


