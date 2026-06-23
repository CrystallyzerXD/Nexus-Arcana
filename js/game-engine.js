/* ═══════════════════════════════════════════════
   GAME START
═══════════════════════════════════════════════ */
// Genera un mazo aleatorio para el bot
function makeBotDeck(size){
  return shuffle([...CARD_POOL]).slice(0, size||6).map(c=>c.id);
}

function startGame(){
  if(partySetupMode){ _partyInterceptStart(); return; }
  if(ligaSetupMode) { _ligaInterceptStart();  return; }
  if(draftMode)     { isOnline=false; _startDraft(); return; }
  _tutGameSession = false; // partida real — limpiar sesión de tutorial si quedó activa
  turnNumber=1; attackUsed=false; isOnline=false; logEntries=[];
  document.getElementById('logWrap').innerHTML='';

  // En modo bot, auto-generar mazo del rival (saltar si ya tiene cartas, ej: del draft)
  if(botMode && gameMode!=='boss' && !p2sel.length){
    const size = parseInt((document.getElementById('p1size')||{}).value||6);
    p2sel = makeBotDeck(size);
    if(gameMode==='triple'){ p3sel = makeBotDeck(size); }
  }

  if(gameMode==='triple' && !isOnline){
    const makeP=(num,sel,nameId)=>{
      const cards=shuffle(sel.map(id=>makeCard(CARD_POOL.find(c=>c.id===id))));
      const active=cards.shift();
      const _tFallback=num===1?(_loadP1Name()||'Jugador 1'):(num===2?(botMode?'Bot':(_loadP2Name()||'Jugador 2')):'Jugador '+num);
      const name=(document.getElementById(nameId)||{}).value||_tFallback;
      return {num,name,active,pile:cards};
    };
    const p3ids = p3sel.length ? p3sel : makeBotDeck(6);
    p1=makeP(1,[...p1sel],'p1name');
    p2=makeP(2,[...p2sel],'p2name');
    p3=makeP(3,p3ids,'p3name');
    currentPlayer=1; pendingTarget=0;
    buildGameUI_Triple();
    showScreen('gameScreen');
    addLog((botMode?'¡Tú vs 2 bots!':'¡FFA 1v1v1!')+' '+p1.name+' vs '+p2.name+' vs '+p3.name+'.','log-sys');
    showRoulette([
      {num:1,name:p1.name,color:ROUL_COLORS[0]},
      {num:2,name:p2.name,color:ROUL_COLORS[1]},
      {num:3,name:p3.name,color:ROUL_COLORS[2]}
    ], startNum=>{
      currentPlayer=startNum;
      addLog('— Turno 1: '+triplePlayerByNum(startNum).name+' comienza —','log-sys');
      renderGame(); maybeTriggerBot();
    });
    return;
  }

  if(gameMode==='boss' && bossLocal2v1){
    const makeRetador=(num)=>{
      const cards=shuffle(getSel(num).map(id=>makeCard(CARD_POOL.find(c=>c.id===id))));
      const active=cards.shift();
      return {num, name:(document.getElementById('p'+num+'name')||{}).value||'Retador '+num, active, pile:cards};
    };
    p1=makeRetador(1); p2=makeRetador(2);
    boss={name:BOSS_CARD.name, card:makeCard(BOSS_CARD)};
    boss.card.hp = 2000; boss.card.maxHp = 2000; // 2v1 local: jefe con el doble de vida
    currentPlayer=1; myPlayerNum=1;
    document.getElementById('setupScreen').style.display = 'none';
    _showBossIntro(BOSS_CARD, function(){
      document.getElementById('setupScreen').style.display = '';
      buildGameUI_OnlineBoss2v1();
      showScreen('gameScreen');
      addLog('¡Comienza la batalla! '+p1.name+' y '+p2.name+' vs '+boss.name+' (2000 HP).','log-sys');
      addLog('— Turno 1: '+p1.name+' ataca primero —','log-sys');
      renderGame();
    });
    return;
  }

  if(gameMode==='boss'){
    const cards = shuffle(chalSel.map(id=>makeCard(CARD_POOL.find(c=>c.id===id))));
    const active = cards.shift();
    challenger = {
      name: (document.getElementById('chalNameInput')||{}).value||'Retador',
      active, pile:cards, hand:[]
    };
    boss = { name: BOSS_CARD.name, card: makeCard(BOSS_CARD) };
    // Escalar HP del jefe según tamaño del mazo del retador
    var _bossHp = chalSel.length >= 8 ? 1500 : chalSel.length >= 7 ? 1250 : 1000;
    boss.card.hp = _bossHp; boss.card.maxHp = _bossHp;
    currentPlayer = 'challenger';
    // Ocultar setupScreen antes de la intro para no ver el frame intermedio
    document.getElementById('setupScreen').style.display = 'none';
    _showBossIntro(BOSS_CARD, function(){
      document.getElementById('setupScreen').style.display = '';
      buildGameUI_Boss();
      showScreen('gameScreen');
      addLog('¡Comienza el enfrentamiento! '+challenger.name+' vs '+boss.name+'.','log-sys');
      renderGame();
    });
    return; // modo jefe 1v1: sin ruleta

  } else if(gameMode==='hand3'){
    const makeH3Player = (num, selIds)=>{
      const all = shuffle(selIds.map(id=>makeCard(CARD_POOL.find(c=>c.id===id))));
      const hand = all.splice(0,3);
      const _h3Fallback = num===1 ? (_loadP1Name()||'Jugador 1') : (botMode?'Bot':(_loadP2Name()||'Jugador 2'));
      return { num, name:(document.getElementById('p'+num+'name')||{}).value||_h3Fallback, active:null, pile:all, hand, needsToPlay:true };
    };
    p1 = makeH3Player(1,[...p1sel]);
    p2 = makeH3Player(2,[...p2sel]);
    currentPlayer=1;
    buildGameUI_Hand3();
    showScreen('gameScreen');
    addLog('¡Comienza la partida con Mano de 3! '+p1.name+' vs '+p2.name+'.','log-sys');

  } else if(gameMode==='espejo'){
    const sharedIds = [...p1sel];
    const makeEP = (num, nameDefault)=>{
      const cards = shuffle(sharedIds.map(id=>makeCard(CARD_POOL.find(c=>c.id===id))));
      const active = cards.shift();
      const nameEl = document.getElementById('p'+num+'name');
      return { num, name:(nameEl?nameEl.value:null)||nameDefault, active, pile:cards };
    };
    p1 = makeEP(1, _loadP1Name()||'Jugador 1');
    p2 = makeEP(2, botMode?'Bot':(_loadP2Name()||'Jugador 2'));
    currentPlayer=1;
    buildGameUI_Standard();
    showScreen('gameScreen');
    addLog('¡Modo Espejo! '+p1.name+' vs '+p2.name+' — mismo mazo, diferente suerte.','log-sys');
  } else if(gameMode==='caos'){
    const makeCP=(num,selIds)=>{ const cards=shuffle(selIds.map(id=>makeCard(CARD_POOL.find(c=>c.id===id)))); const active=cards.shift(); const _cpFallback=num===1?(_loadP1Name()||'Jugador 1'):(botMode?'Bot':(_loadP2Name()||'Jugador 2')); return {num,name:(document.getElementById('p'+num+'name')||{}).value||_cpFallback,active,pile:cards}; };
    if(botMode) p2sel=makeBotDeck(parseInt((document.getElementById('p1size')||{}).value||6));
    p1=makeCP(1,[...p1sel]); p2=makeCP(2,[...p2sel]);
    currentPlayer=1; buildGameUI_Standard(); showScreen('gameScreen');
    addLog('🎲 ¡Modo Caos! '+p1.name+' vs '+p2.name+'.','log-sys');
  } else if(gameMode==='endless'){
    turnNumber=1; attackUsed=false; isOnline=false; logEntries=[];
    document.getElementById('logWrap').innerHTML='';
    _endlessWave=1;
    if(typeof _relicReset==='function') _relicReset();
    _endlessPool=shuffle(CARD_POOL.map(c=>makeCard(c)));
    // Evitar que salgan de entrada las mismas cartas elegidas por el jugador
    const _p1ids=new Set(p1sel);
    _endlessPool=_endlessPool.filter(c=>!_p1ids.has(c.id));
    const p1cards=shuffle(p1sel.map(id=>makeCard(CARD_POOL.find(c=>c.id===id))));
    const p1active=p1cards.shift();
    const p1nameVal=(document.getElementById('p1name')||{}).value||_loadP1Name()||'Jugador';
    p1={num:1,name:p1nameVal,active:p1active,pile:p1cards,kills:0};
    const firstEnemy=_endlessNextEnemy();
    p2={num:2,name:'Enemigo',active:firstEnemy,pile:[],kills:0};
    currentPlayer=1;
    buildGameUI_Standard();
    const chip=document.getElementById('modeChip');
    if(chip) chip.textContent='🏴 OLEADA 1';
    showScreen('gameScreen');
    addLog('🏴 ¡Supervivencia! Oleada 1: <b>'+firstEnemy.name+'</b> entra al campo.','log-sys');
    renderGame();
    if(typeof _relicShowPicker==='function') setTimeout(_relicShowPicker, 500);
    maybeTriggerBot();
    return;
  } else {
    const makeStdPlayer = (num, selIds)=>{
      const cards = shuffle(selIds.map(id=>makeCard(CARD_POOL.find(c=>c.id===id))));
      const active = cards.shift();
      const nameEl = document.getElementById('p'+num+'name');
      const fallback = num===1 ? (_loadP1Name()||'Jugador 1') : (num===2 ? (botMode?'Bot':(_loadP2Name()||'Jugador 2')) : 'Jugador '+num);
      return { num, name:(nameEl?nameEl.value:null)||fallback, active, pile:cards };
    };
    p1 = makeStdPlayer(1,[...p1sel]);
    p2 = makeStdPlayer(2,[...p2sel]);
    window._gameP1Deck = [...p1sel];   // snapshot para stats por carta
    window._gameCardKOs = {};          // KOs acumulados por carta activa de p1
    currentPlayer=1;
    buildGameUI_Standard();
    showScreen('gameScreen');
    addLog('¡Comienza la partida! '+p1.name+' vs '+p2.name+'.','log-sys');
  }

  // Ruleta: quién comienza (solo modos locales 1v1 / mano de 3)
  showRoulette([
    {num:1,name:p1.name,color:ROUL_COLORS[0]},
    {num:2,name:p2.name,color:ROUL_COLORS[1]}
  ], startNum=>{
    currentPlayer=startNum;
    const first=startNum===1?p1:p2;
    if(gameMode==='hand3'){
      addLog('— '+first.name+' elige primera carta —','log-sys');
    } else {
      addLog('— Turno 1: '+first.name+' comienza —','log-sys');
    }
    renderGame(); maybeTriggerBot();
  });
}

/* ═══════════════════════════════════════════════
   BUILD GAME UI (structure injection)
═══════════════════════════════════════════════ */
function buildGameUI_Standard(){ _buildGameUI_Std(false); }
function buildGameUI_Hand3(){    _buildGameUI_Std(true);  }

function _injectGameAvatar(){
  var c = _loadCosmetics();
  var av = _COSM_AVATARS[c.avatar]||_COSM_AVATARS[0];
  var bg = _COSM_AVBGS[c.avbg]||_COSM_AVBGS[0];
  var fr = _COSM_FRAMES[c.frame]||_COSM_FRAMES[0];
  var myNum = (typeof myPlayerNum!=='undefined' && myPlayerNum) ? myPlayerNum : 1;
  var mySlot  = document.getElementById(myNum===2 ? 'p2zoneAvatar' : 'p1zoneAvatar');
  var botSlot = document.getElementById(myNum===2 ? 'p1zoneAvatar' : 'p2zoneAvatar');

  // Avatar + título del jugador
  if(mySlot){
    mySlot.style.display = 'block';
    mySlot.style.visibility = 'visible';
    mySlot.style.background = bg.color;
    mySlot.innerHTML = '<img src="'+av.src+'" alt="'+av.name
      +'" style="width:100%;height:100%;object-fit:contain;image-rendering:pixelated;">';
    mySlot.style.outline = fr.cls ? '2px solid '+(fr.color||'transparent') : 'none';
    mySlot.style.outlineOffset = '1px';
  }
  var ti = _COSM_TITLES[c.title]||_COSM_TITLES[0];
  var myTitleEl = document.getElementById(myNum===2 ? 'p2zoneTitle' : 'p1zoneTitle');
  _applyZoneTitle(myTitleEl, ti);

  // Avatar del oponente
  if(botSlot){
    if(isOnline){
      // Online: oponente humano — silueta genérica
      botSlot.style.display = 'block';
      botSlot.style.visibility = 'visible';
      botSlot.style.background = '#1a1a2e';
      botSlot.innerHTML = '<svg viewBox="0 0 24 24" style="width:100%;height:100%;padding:2px" fill="none" xmlns="http://www.w3.org/2000/svg">'
        +'<circle cx="12" cy="8" r="3.5" fill="#4a4a6a"/>'
        +'<path d="M5 20c0-3.866 3.134-7 7-7s7 3.134 7 7" stroke="#4a4a6a" stroke-width="2" stroke-linecap="round"/>'
        +'</svg>';
      botSlot.style.outline = 'none';
    } else {
      // Bot local — ícono de robot
      botSlot.style.visibility = 'visible';
      botSlot.style.background = '#1a1a2e';
      botSlot.innerHTML = '<svg viewBox="0 0 24 24" style="width:100%;height:100%;padding:3px" fill="none" xmlns="http://www.w3.org/2000/svg">'
        +'<rect x="5" y="8" width="14" height="10" rx="2" fill="#4a4a6a"/>'
        +'<rect x="9" y="5" width="6" height="4" rx="1" fill="#4a4a6a"/>'
        +'<circle cx="9" cy="13" r="1.5" fill="#a0a0c0"/>'
        +'<circle cx="15" cy="13" r="1.5" fill="#a0a0c0"/>'
        +'<rect x="10" y="16" width="4" height="1" rx=".5" fill="#a0a0c0"/>'
        +'<line x1="12" y1="5" x2="12" y2="3" stroke="#4a4a6a" stroke-width="1.5" stroke-linecap="round"/>'
        +'<circle cx="12" cy="2.5" r="1" fill="#6a6a8a"/>'
        +'</svg>';
      botSlot.style.outline = 'none';
    }
  }
}

function _buildGameUI_Std(isHand3){
  const chip=document.getElementById('modeChip');
  chip.textContent=isHand3?'MANO DE 3':(_caosActive?'🎲 CAOS':'1 vs 1');
  chip.className='mode-chip '+(isHand3?'chip-hand':'chip-std');
  document.getElementById('handSection').style.display=isHand3?'block':'none';

  document.getElementById('battlefieldWrap').innerHTML=`
  <div class="battlefield">
    <div class="player-zone" id="p1zone">
      <div class="zone-header">
        <div style="display:flex;align-items:center;gap:.5rem">
          <div id="p1zoneAvatar" style="width:36px;height:36px;border-radius:50%;background:var(--surface2);overflow:hidden;flex-shrink:0;display:none"></div>
          <div style="display:flex;flex-direction:column;justify-content:center">
            <span class="zone-name zone-p1" id="p1zoneName">J1</span>
            <div id="p1zoneTitle" style="font-size:9px;letter-spacing:.1em;display:none;margin-top:1px;font-family:var(--font-title)"></div>
          </div>
        </div>
        <span class="pile-count" style="align-self:flex-start;margin-top:2px">Pila: <span id="p1pileCount">0</span></span>
      </div>
      ${battleCardHTML('p1')}
      <div class="pile-row" id="p1pile"></div>
    </div>
    <div class="player-zone" id="p2zone">
      <div class="zone-header">
        <div style="display:flex;align-items:center;gap:.5rem">
          <div id="p2zoneAvatar" style="width:36px;height:36px;border-radius:50%;background:var(--surface2);overflow:hidden;flex-shrink:0;visibility:hidden"></div>
          <div style="display:flex;flex-direction:column;justify-content:center">
            <span class="zone-name zone-p2" id="p2zoneName">J2</span>
            <div id="p2zoneTitle" style="font-size:9px;letter-spacing:.1em;display:none;margin-top:1px;font-family:var(--font-title)"></div>
          </div>
        </div>
        <span class="pile-count" style="align-self:flex-start;margin-top:2px">Pila: <span id="p2pileCount">0</span></span>
      </div>
      ${battleCardHTML('p2')}
      <div class="pile-row" id="p2pile"></div>
    </div>
  </div>`;

  document.getElementById('attackPanelWrap').innerHTML=`
  <div class="attack-panel" id="attackPanel">
    <div class="attack-panel-title">ATAQUES DISPONIBLES — <span id="atkPanelPlayer"></span></div>
    <div class="attacks-row" id="attacksRow"></div>
  </div>`;
  _injectGameAvatar();
  if(isOnline) _applyOnlineOpponentAvatar(_onlineOpponentCosm);
}

function buildGameUI_Boss(){
  document.getElementById('gameScreen').classList.add('boss-battle');
  document.getElementById('modeChip').textContent='MODO JEFE';
  document.getElementById('modeChip').className='mode-chip chip-boss';
  document.getElementById('handSection').style.display='none';

  document.getElementById('battlefieldWrap').innerHTML=`
  <div class="boss-zone" id="bossZoneEl">
    <div class="boss-zone-label">★ JEFE — ${BOSS_CARD.name.toUpperCase()} <span style="color:var(--text-dim);font-size:9px">IA automática</span></div>
    <div class="boss-card-layout">
      <div class="boss-art" id="bossArt">👁</div>
      <div class="boss-info">
        <div class="boss-name">${BOSS_CARD.name}</div>
        <div class="boss-hp-label"><span>HP</span><span id="bossHpText">1000 / 1000</span></div>
        <div class="boss-hp-bar"><div class="boss-hp-fill" id="bossHpBar" style="width:100%"></div></div>
        <div class="boss-effects" id="bossEffects"></div>
        <div class="boss-desc">${BOSS_CARD.flavor}</div>
      </div>
    </div>
  </div>
  <div class="challenger-zone">
    <div class="challenger-zone-title" id="chalZoneTitle">RETADOR</div>
    <div style="display:grid;grid-template-columns:auto 1fr;gap:.75rem;align-items:start">
      <div class="battle-card" style="width:130px">
        <div class="card-art" id="chalArt"><div class="card-art-placeholder">?</div></div>
        <div class="card-info">
          <div class="card-name" id="chalCardName">—</div>
          <div class="hp-bar-wrap">
            <div class="hp-label"><span>HP</span><span id="chalHp">—</span></div>
            <div class="hp-bar"><div class="hp-fill hp-high" id="chalHpBar" style="width:100%"></div></div>
          </div>
          <div class="card-effects" id="chalEffects"></div>
        </div>
      </div>
      <div>
        <div style="font-size:11px;color:var(--text-muted);margin-bottom:4px">Pila: <span id="chalPileCount">0</span> carta(s)</div>
        <div class="pile-row" id="chalPile"></div>
      </div>
    </div>
  </div>`;

  document.getElementById('attackPanelWrap').innerHTML=`
  <div class="attack-panel panel-challenger">
    <div class="attack-panel-title">ATAQUES — <span id="chalPanelName"></span></div>
    <div class="attacks-col" id="chalAttacksCol"></div>
  </div>`;
}

function battleCardHTML(prefix){
  return `<div class="battle-card" id="${prefix}card">
    <div class="card-art" id="${prefix}art"><div class="card-art-placeholder">?</div></div>
    <div class="card-info">
      <div class="card-name" id="${prefix}cardName">—</div>
      <div class="hp-bar-wrap">
        <div class="hp-label"><span>HP</span><span id="${prefix}hp">—</span></div>
        <div class="hp-bar"><div class="hp-fill hp-high" id="${prefix}hpBar" style="width:100%"></div></div>
      </div>
      <div class="card-effects" id="${prefix}effects"></div>
    </div>
  </div>`;
}

/* ═══════════════════════════════════════════════
   RENDER
═══════════════════════════════════════════════ */
function renderGame(){
  if(gameMode==='triple')    renderTripleMode();
  else if(gameMode==='boss' && (isOnline || bossLocal2v1)) renderOnlineBoss2v1();
  else if(gameMode==='boss') renderBossMode();
  else if(gameMode==='hand3') renderHand3Mode();
  else renderStandardMode();
}

/* ── Standard ── */
function renderStandardMode(){
  const cp = currentPlayer===1?p1:p2;
  document.getElementById('turnNum').textContent = turnNumber;
  const tp = document.getElementById('turnPlayerEl');
  tp.textContent = 'Turno de: '+cp.name;
  tp.className = 'turn-player turn-p'+currentPlayer;
  const banner = document.getElementById('phaseBanner');
  banner.textContent = 'TURNO DE '+cp.name.toUpperCase();
  banner.className = 'phase-banner '+(currentPlayer===1?'phase-p1':'phase-p2');
  renderPlayerZone(p1,'p1',currentPlayer===1);
  renderPlayerZone(p2,'p2',currentPlayer===2);
  renderStdAttacks();

  // Tutorial: cuando vuelve el turno del jugador, disparar callback pendiente
  if(tutGameMode && currentPlayer===1 && !attackUsed && _tutGameOnP1Turn){
    var cb = _tutGameOnP1Turn;
    _tutGameOnP1Turn = null;
    setTimeout(function(){
      cb(); // incrementa _tutGStep primero
      renderStdAttacks(); // re-renderiza con el nuevo paso ya aplicado
      _tutGTagAtkBtns();
    }, 300);
  }
}

function renderPlayerZone(player, prefix, isActive){
  const card = player.active;
  document.getElementById(prefix+'zoneName').textContent = player.name;
  document.getElementById(prefix+'pileCount').textContent = player.pile.length;
  const cardEl = document.getElementById(prefix+'card');

  if(!card){
    document.getElementById(prefix+'cardName').textContent='— sin carta activa —';
    document.getElementById(prefix+'hp').textContent='—';
    document.getElementById(prefix+'hpBar').style.width='0%';
    document.getElementById(prefix+'art').innerHTML='<div class="card-art-placeholder" style="font-size:10px;color:var(--text-dim)">Sin carta</div>';
    document.getElementById(prefix+'effects').innerHTML='';
    return;
  }

  const r = RARITIES[card.stars]||RARITIES[1];
  document.getElementById(prefix+'cardName').textContent='#'+String(card.id).padStart(3,'0')+' '+card.name;
  const pct = Math.max(0, card.hp/card.maxHp*100);
  const _hideHP = prefix==='p2' && typeof _relicHideEnemyHP==='function' && _relicHideEnemyHP();
  document.getElementById(prefix+'hp').textContent= _hideHP ? '??? / ???' : Math.max(0,card.hp)+' / '+card.maxHp;
  const bar = document.getElementById(prefix+'hpBar');
  bar.style.width= _hideHP ? '50%' : pct+'%';
  bar.className='hp-fill '+(_hideHP?'hp-mid':pct>60?'hp-high':pct>25?'hp-mid':'hp-low');
  const artEl = document.getElementById(prefix+'art');
  artEl.style.borderBottom='2px solid '+r.border;
  artEl.innerHTML = card.image
    ? '<img src="'+card.image+'" alt="'+card.name+'"><div class="card-rarity-bar" style="background:'+r.border+'88"></div><div class="card-id-badge" style="color:'+r.border+'">#'+String(card.id).padStart(3,'0')+'</div>'
    : '<div class="card-art-placeholder" style="color:'+r.border+'">'+card.name.slice(0,7).toUpperCase()+'</div><div class="card-id-badge" style="color:'+r.border+'">#'+String(card.id).padStart(3,'0')+'</div>';

  // Caos: escudo gratis del turno → se muestra sobre el DEFENSOR (jugador que no ataca)
  if(_caosActive && _caosEffect === 'shield' && !isActive){
    artEl.innerHTML += '<div class="caos-shield-overlay" title="Escudo de Caos: absorbe el daño este turno">🛡</div>';
  }

  const _animClasses = ['anim-hit','anim-heal','anim-lunge-r','anim-lunge-l','anim-dmg'].filter(c=>cardEl.classList.contains(c));
  cardEl.className = 'battle-card';
  if(isActive) cardEl.classList.add(prefix==='p1'?'active-glow-p1':'active-glow-p2');
  _animClasses.forEach(c=>cardEl.classList.add(c));

  const effEl = document.getElementById(prefix+'effects');
  effEl.innerHTML='';
  (card.effects||[]).forEach(ef=>{
    const t=document.createElement('span');
    t.className='effect-tag '+(ef.type==='dot'?'effect-dot':'effect-regen');
    t.textContent=(ef.type==='dot'?'☠ ':'♥ ')+ef.name+' ('+(ef.remaining===-1?'∞':ef.remaining)+')';
    effEl.appendChild(t);
  });
  const pileEl = document.getElementById(prefix+'pile');
  pileEl.innerHTML='';
  player.pile.forEach(()=>{
    const d=document.createElement('div');d.className='pile-card-back';
    const img=document.createElement('img');img.src=CARD_BACK;img.alt='carta';
    d.appendChild(img);pileEl.appendChild(d);
  });
}

function renderStdAttacks(){
  const cp = currentPlayer===1?p1:p2;
  const el = document.getElementById('atkPanelPlayer');
  if(el) el.textContent = cp.name;
  const row = document.getElementById('attacksRow');
  if(!row) return;
  row.innerHTML='';
  if(!cp.active){row.innerHTML='<div style="font-size:12px;color:var(--text-dim)">Sin carta activa</div>';return;}
  // En botMode local: deshabilitar cuando es turno del bot (currentPlayer=2)
  const botBlocked = botMode && !isOnline && currentPlayer!==1;
  (cp.active.attacks||[]).forEach((atk,i)=>{
    const tutBlocked = tutGameMode && (!_TUT_GAME_STEPS[_tutGStep] || _TUT_GAME_STEPS[_tutGStep].action !== 'attack');
    const btn = buildAtkBtnElement(atk, i, false, attackUsed || !isMyTurn() || botBlocked || tutBlocked);
    btn.onclick=()=>useAttack_Standard(i);
    row.appendChild(btn);
  });
}

/* ── Hand3 ── */
function renderHand3Mode(){
  const cp = currentPlayer===1?p1:p2;
  document.getElementById('turnNum').textContent=turnNumber;
  const tp=document.getElementById('turnPlayerEl');
  tp.textContent='Turno de: '+cp.name;
  tp.className='turn-player turn-p'+currentPlayer;
  const banner=document.getElementById('phaseBanner');
  banner.textContent='TURNO DE '+cp.name.toUpperCase();
  banner.className='phase-banner '+(currentPlayer===1?'phase-p1':'phase-p2');

  renderPlayerZone(p1,'p1',currentPlayer===1);
  renderPlayerZone(p2,'p2',currentPlayer===2);
  renderHand3Section();
  renderStdAttacks();

}

function renderHand3Section(){
  const cp = currentPlayer===1?p1:p2;
  const section = document.getElementById('handSection');
  const grid = document.getElementById('handGrid');
  document.getElementById('handOwnerTag').textContent=cp.name.toUpperCase();

  // Solo mostrar la mano cuando el jugador activo no tiene carta (necesita elegir)
  if(!cp.needsToPlay){section.style.display='none';return;}
  // En online, solo si es mi turno; en botMode local, solo si es turno del humano
  if(isOnline && !isMyTurn()){section.style.display='none';return;}
  if(botMode && !isOnline && currentPlayer!==1){section.style.display='none';return;}

  if(cp.hand.length===0){section.style.display='none';return;}
  section.style.display='block';
  grid.innerHTML='';

  cp.hand.forEach((card,i)=>{
    const r=RARITIES[card.stars]||RARITIES[1];
    const div=document.createElement('div');
    div.className='hand-card'+(cp.needsToPlay?'':' hand-disabled');
    div.innerHTML=
      '<div class="hand-card-art" style="border-bottom:1.5px solid '+r.border+'">'+
        (card.image?'<img src="'+card.image+'" alt="'+card.name+'">':'<div style="font-size:10px;color:'+r.border+'">'+card.name.slice(0,6).toUpperCase()+'</div>')+
      '</div>'+
      '<div class="hand-card-info">'+
        '<div class="hand-card-name">'+card.name+'</div>'+
        '<div class="hand-card-hp">'+card.hp+' hp · '+card.stars+'★</div>'+
        (cp.needsToPlay?'<button class="play-btn" onclick="invocarCarta('+i+')">Invocar ▶</button>':'')+
      '</div>';
    grid.appendChild(div);
  });
  if(cp.hand.length===0&&cp.needsToPlay){
    grid.innerHTML='<div style="font-size:12px;color:var(--text-dim);grid-column:span 3;text-align:center;padding:.5rem">Sin cartas disponibles</div>';
  }
}

function invocarCarta(idx){
  const cp = currentPlayer===1?p1:p2;
  if(!cp.needsToPlay) return;
  if(!isMyTurn()) return;
  const card = cp.hand[idx];
  if(!card) return;
  cp.hand.splice(idx,1);
  cp.active=card;
  cp.needsToPlay=false;
  playSfxCarta();
  addLog(cp.name+' invoca a <b>'+card.name+'</b> desde su mano.','log-sys');
  const invokeOnly  = cp._invokeOnly;  delete cp._invokeOnly;
  const alreadyAttacked = cp._didAttack; delete cp._didAttack;

  if(alreadyAttacked){
    // Carta murió por DoT durante el turno propio → ya atacamos, avanzar
    advanceTurn();
  } else if(invokeOnly){
    // Solo veníamos a invocar (el rival esperaba); devolver el turno al jugador original
    const returnTo = cp===p1 ? p2 : p1;
    currentPlayer = returnTo.num;
    sendGameState(); renderGame();
    maybeTriggerBot();
  } else {
    // Carta murió porque el rival atacó (o inicio de partida)
    // Si el rival también necesita invocar, dejarlo hacerlo antes de atacar
    const other = cp===p1?p2:p1;
    if(other.needsToPlay && !other.active){
      other._invokeOnly = true;
      currentPlayer = other.num;
      addLog(other.name+' elige su primera carta.','log-sys');
      sendGameState(); renderGame();
      maybeTriggerBot();
    } else {
      sendGameState(); renderGame();
    }
  }
}

function advanceTurn(){
  currentPlayer=currentPlayer===1?2:1;
  if(currentPlayer===1){
    turnNumber++;
    if(gameMode==='endless' && typeof _relicOnP1TurnStart==='function') _relicOnP1TurnStart();
  }
  attackUsed=false;
  if(gameMode==='hand3'){
    const next=currentPlayer===1?p1:p2;
    while(next.hand.length<3&&next.pile.length>0){
      const c=next.pile.shift(); c.effects=c.effects||[]; c.cumulativeUses=c.cumulativeUses||{};
      next.hand.push(c);
    }
  }
  addLog('— Turno '+turnNumber+': '+(currentPlayer===1?p1:p2).name+' —','log-sys');
  sendGameState();
  renderGame();
  maybeTriggerBot();
}

/* ── Boss ── */
function renderBossMode(){
  const isChal = currentPlayer==='challenger';
  document.getElementById('turnNum').textContent=turnNumber;
  const tp=document.getElementById('turnPlayerEl');
  tp.textContent='Turno de: '+(isChal?challenger.name:boss.name);
  tp.className='turn-player '+(isChal?'turn-p1':'turn-boss');
  const banner=document.getElementById('phaseBanner');
  banner.textContent=(isChal?'TURNO DEL RETADOR — '+challenger.name:'TURNO DEL JEFE — '+boss.name).toUpperCase();
  banner.className='phase-banner '+(isChal?'phase-p1':'phase-boss');

  // Boss HP
  const bc = boss.card;
  const bpct = Math.max(0,bc.hp/bc.maxHp*100);
  document.getElementById('bossHpText').textContent=Math.max(0,bc.hp)+' / '+bc.maxHp;
  document.getElementById('bossHpBar').style.width=bpct+'%';
  const bz = document.getElementById('bossZoneEl');
  if(bz){
    bz.className='boss-zone'+(currentPlayer==='boss'?' active-turn':'');
  }
  const bossEffEl = document.getElementById('bossEffects');
  if(bossEffEl){
    bossEffEl.innerHTML='';
    (bc.effects||[]).forEach(ef=>{
      const t=document.createElement('span');
      t.className='effect-tag '+(ef.type==='dot'?'effect-dot':'effect-regen');
      t.textContent=(ef.type==='dot'?'☠ ':'♥ ')+ef.name+' ('+(ef.remaining===-1?'∞':ef.remaining)+')';
      bossEffEl.appendChild(t);
    });
  }

  // Challenger
  const cc = challenger.active;
  document.getElementById('chalZoneTitle').textContent=challenger.name.toUpperCase();
  document.getElementById('chalPanelName').textContent=challenger.name;
  document.getElementById('chalPileCount').textContent=challenger.pile.length;
  if(cc){
    const r=RARITIES[cc.stars]||RARITIES[1];
    document.getElementById('chalCardName').textContent='#'+String(cc.id).padStart(3,'0')+' '+cc.name;
    const cpct=Math.max(0,cc.hp/cc.maxHp*100);
    document.getElementById('chalHp').textContent=Math.max(0,cc.hp)+' / '+cc.maxHp;
    const cb=document.getElementById('chalHpBar');
    cb.style.width=cpct+'%';
    cb.className='hp-fill '+(cpct>60?'hp-high':cpct>25?'hp-mid':'hp-low');
    const ca=document.getElementById('chalArt');
    ca.style.borderBottom='2px solid '+r.border;
    ca.innerHTML=cc.image
      ?'<img src="'+cc.image+'" alt="'+cc.name+'"><div class="card-id-badge" style="color:'+r.border+'">#'+String(cc.id).padStart(3,'0')+'</div>'
      :'<div class="card-art-placeholder" style="color:'+r.border+'">'+cc.name.slice(0,6).toUpperCase()+'</div><div class="card-id-badge" style="color:'+r.border+'">#'+String(cc.id).padStart(3,'0')+'</div>';
    const chalEffEl=document.getElementById('chalEffects');
    chalEffEl.innerHTML='';
    (cc.effects||[]).forEach(ef=>{
      const t=document.createElement('span');
      t.className='effect-tag '+(ef.type==='dot'?'effect-dot':'effect-regen');
      t.textContent=(ef.type==='dot'?'☠ ':'♥ ')+ef.name+' ('+(ef.remaining===-1?'∞':ef.remaining)+')';
      chalEffEl.appendChild(t);
    });
  }
  const chalPileEl=document.getElementById('chalPile');
  if(chalPileEl){
    chalPileEl.innerHTML='';
    challenger.pile.forEach(()=>{
      const d=document.createElement('div');d.className='pile-card-back';
      const img=document.createElement('img');img.src=CARD_BACK;img.alt='carta';
      d.appendChild(img);chalPileEl.appendChild(d);
    });
  }

  // Solo ataques del retador (boss ataca automáticamente)
  const chalCol=document.getElementById('chalAttacksCol');
  if(chalCol){
    chalCol.innerHTML='';
    if(!isChal){
      // Turno del jefe — mostrar sus ataques (desactivados) para referencia
      chalCol.innerHTML='<div style="font-size:10px;color:var(--boss-glow);letter-spacing:.08em;font-family:var(--font-title);margin-bottom:6px">👁 '+boss.name.toUpperCase()+' ELIGE ATAQUE…</div>';
      (BOSS_CARD.attacks||[]).forEach(atk=>{
        const btn=buildAtkBtnElement(atk,0,true,true);
        btn.style.cursor='default';
        chalCol.appendChild(btn);
      });
    } else if(challenger.active){
      (challenger.active.attacks||[]).forEach((atk,i)=>{
        const btn=buildAtkBtnElement(atk,i,false,attackUsed);
        btn.onclick=()=>useAttack_Boss_Challenger(i);
        chalCol.appendChild(btn);
      });
    }
  }
}

/* ─── Attack button builder ─── */
function buildAtkBtnElement(atk, idx, isBossBtn, disabled){
  const btn = document.createElement('button');
  btn.className = 'atk-btn'+(isBossBtn?' boss-atk':'');
  btn.disabled = disabled;
  let meta='';
  switch(atk.type){
    case 'direct':{
      meta='-'+atk.value+' hp directo';
      if(atk.selfDmg>0){
        const selfStr=atk.selfDmgType==='pct_max'?atk.selfDmg+'% HP máx propio':
                      atk.selfDmgType==='pct'?atk.selfDmg+'% HP actual propio':
                      '-'+atk.selfDmg+' hp propio';
        meta+=', '+selfStr;
      }
      if(atk.selfHeal>0) meta+=', +'+atk.selfHeal+' hp absorción';
      if(atk.lifeSteal>0) meta+=', +'+atk.lifeSteal+'% robo de vida';
      break;}
    case 'dot':{
      const dur=atk.turns===0||atk.turns===-1?'∞':'×'+( atk.turns||3);
      meta='-'+atk.value+' hp/turno ('+dur+')'; break;}
    case 'regen':{
      const dur=atk.turns===0||atk.turns===-1?'∞':'×'+(atk.turns||3);
      meta='+'+atk.value+' hp/turno ('+dur+')'; break;}
    case 'cumulative':meta='-'+atk.value+' hp (+'+atk.value+' por uso acumulado)'; break;
    case 'shield':{
      const dur=atk.turns===0||atk.turns===-1?'∞':( atk.turns||2)+' turnos';
      meta='-'+atk.value+'% daño ('+dur+')'; break;}
    case 'prob':      meta=atk.prob+'%: -'+atk.value+' hp'+(atk.consequence>0?' / falla: -'+atk.consequence+' propio':''); break;
  }
  btn.innerHTML=
    '<div class="atk-name">'+atk.name+(atk.type==='prob'?'<span class="prob-badge">'+atk.prob+'%</span>':'')+' </div>'+
    '<div class="atk-meta">'+meta+'</div>'+
    (atk.description?'<div class="atk-desc">'+atk.description+'</div>':'');
  return btn;
}

/* ═══════════════════════════════════════════════
   COMBAT — STANDARD / HAND3
═══════════════════════════════════════════════ */
function useAttack_Standard(atkIndex){
  if(attackUsed) return;
  if(gameMode==='boss' && (isOnline || bossLocal2v1)) { useAttack_OnlineBoss2v1(atkIndex); return; }
  const attacker = currentPlayer===1?p1:p2;
  const defender = currentPlayer===1?p2:p1;
  if(!attacker.active) return;
  if(gameMode==='hand3'&&attacker.needsToPlay) return;
  if(!isMyTurn()) return;
  const atk = attacker.active.attacks[atkIndex];
  attackUsed=true;

  // Tutorial: si es turno del jugador (P1) y el paso actual espera un ataque, avanzar tras el turno del bot
  if(tutGameMode && currentPlayer===1){
    var _curStep = _TUT_GAME_STEPS[_tutGStep];
    if(_curStep && _curStep.action === 'attack'){
      _tutGHide();
      _tutGameOnP1Turn = function(){
        _tutGStep++;
        _tutGTagAtkBtns();
        _tutGRender();
      };
    }
  }

  if(_caosActive && _caosEffect === 'shield'){
    addLog('🛡 ¡Escudo gratis! '+defender.name+' absorbe todo el daño este turno.','log-sys');
    _caosShieldDefender = defender;
    resolveAtk_Standard(atk, attacker, defender, atkIndex);
    const atkDied = checkDeath_Standard(attacker, defender);
    if(!atkDied) endTurn();
    return;
  }

  if(_caosActive && _caosEffect === 'heal'){
    if(atk.type==='dot'){
      // DoT invertido: se convierte en regen para el atacante
      const turns = (atk.turns===0||atk.turns===-1) ? -1 : (atk.turns||3);
      attacker.active.effects = attacker.active.effects||[];
      attacker.active.effects.push({type:'regen', name:atk.name+' (invertido)', value:atk.value, remaining:turns});
      addLog('💚 ¡Curación! <b>'+atk.name+'</b> se invierte: +'+atk.value+' HP/turno (×'+turns+') para '+attacker.active.name+'.','log-heal');
    } else {
      const healVal = atk.value || 20;
      const healed = Math.min(healVal, (attacker.active.maxHp||999)-attacker.active.hp);
      attacker.active.hp = Math.min(attacker.active.maxHp||999, attacker.active.hp+healVal);
      addLog('💚 ¡Curación! '+attacker.active.name+' recupera '+healed+' HP.','log-heal');
    }
    endTurn(); return;
  }

  if(_caosActive && _caosEffect === 'double'){
    // Daño doble: clonar ataque con valor x2
    const boosted = Object.assign({}, atk, (atk.type==='shield'||atk.type==='regen') ? {} : {value: (atk.value||0)*2, selfDmg: (atk.selfDmg||0)*2});
    addLog('⚡ ¡Daño doble! El ataque vale el doble.','log-sys');
    resolveAtk_Standard(boosted, attacker, defender, atkIndex);
  } else if(_caosActive && _caosEffect === 'reverse'){
    // Daño invertido: el daño va al atacante
    addLog('🔄 ¡Daño invertido! El daño recae en '+attacker.name+'.','log-dmg');
    resolveAtk_Standard(atk, attacker, attacker, atkIndex);
  } else {
    resolveAtk_Standard(atk, attacker, defender, atkIndex);
  }

  const defDied = checkDeath_Standard(defender, attacker);
  if(!defDied){
    const atkDied = checkDeath_Standard(attacker, defender);
    if(!atkDied) endTurn();
  }
}

function resolveAtk_Standard(atk, attacker, defender, atkIdx){
  playSfxAttack();
  if(gameMode==='endless' && typeof _relicModifyAtk==='function') atk=_relicModifyAtk(atk,attacker);
  if(botMode && !isOnline && !tutGameMode && !_tutGameSession && attacker===p1 && attacker.active && gameMode!=='rapido'){
    var s=_loadStats(); s.cardUsage=s.cardUsage||{};
    var _ck='c'+attacker.active.id; s.cardUsage[_ck]=(s.cardUsage[_ck]||0)+1;
    _saveStats(s);
  }
  const _lunge = attacker.num===1 ? 'anim-lunge-r' : 'anim-lunge-l';
  switch(atk.type){
    case 'direct':{
      animCard('p'+attacker.num+'card', _lunge);
      dealDmg_Standard(defender, atk.value, atk.name);
      if(atk.selfDmg>0){
        const selfAmt = atk.selfDmgType==='pct_max' ? Math.floor(attacker.active.maxHp*atk.selfDmg/100)
                       : atk.selfDmgType==='pct'     ? Math.floor(attacker.active.hp*atk.selfDmg/100)
                       : atk.selfDmg;
        attacker.active.hp=Math.max(0, attacker.active.hp-selfAmt);
        addLog('<b>'+atk.name+'</b>: '+attacker.active.name+' recibe '+selfAmt+' hp de daño propio.','log-dmg');
        animCard('p'+attacker.num+'card','anim-hit');
        _floatDmg('p'+attacker.num+'card', selfAmt, false);
      }
      if(attacker.active && attacker.active.hp>0){
        if(atk.selfHeal>0){
          const healAmt = Math.min(atk.selfHeal, attacker.active.maxHp - attacker.active.hp);
          if(healAmt>0){
            attacker.active.hp += healAmt;
            addLog('<b>'+atk.name+'</b>: '+attacker.active.name+' absorbe +'+healAmt+' hp.','log-heal');
            animCard('p'+attacker.num+'card','anim-heal');
            _floatDmg('p'+attacker.num+'card', healAmt, true);
          }
        }
        if(atk.lifeSteal>0){
          const stealAmt = Math.min(Math.floor(atk.value * atk.lifeSteal / 100), attacker.active.maxHp - attacker.active.hp);
          if(stealAmt>0){
            attacker.active.hp += stealAmt;
            addLog('<b>'+atk.name+'</b>: '+attacker.active.name+' roba +'+stealAmt+' hp ('+atk.lifeSteal+'% del daño).','log-heal');
            animCard('p'+attacker.num+'card','anim-heal');
            _floatDmg('p'+attacker.num+'card', stealAmt, true);
          }
        }
      }
      if(gameMode==='endless' && typeof _relicPostAtk==='function') _relicPostAtk(atk,attacker);
      break;}
    case 'dot':{
      if(_caosShieldDefender && defender===_caosShieldDefender){ addLog('🛡 '+atk.name+' bloqueado por el escudo.','log-sys'); break; }
      const dotR=(atk.turns===0||atk.turns===-1)?-1:(atk.turns||3);
      defender.active.effects=defender.active.effects||[];
      // Si ya existe el mismo efecto (mismo nombre), resetear turnos en lugar de apilar
      const existingDot=defender.active.effects.find(e=>e.type==='dot'&&e.name===atk.name);
      if(existingDot){
        if(existingDot.remaining===-1){
          addLog('<b>'+atk.name+'</b> ya es permanente en '+defender.active.name+'. Sin efecto.','log-sys');
        } else {
          existingDot.remaining=dotR;
          existingDot.value=atk.value;
          addLog(attacker.name+' renueva <b>'+atk.name+'</b> en '+defender.active.name+'. ('+dotR+' turnos)','log-dmg');
        }
      } else {
        defender.active.effects.push({type:'dot',name:atk.name,value:atk.value,remaining:dotR});
        const dotDur=dotR===-1?'permanente':dotR+' turnos';
        addLog(attacker.name+' aplica <b>'+atk.name+'</b> a '+defender.active.name+'. -'+atk.value+' HP/turno ('+dotDur+').','log-dmg');
      }
      break;}
    case 'regen':{
      const regR=(atk.turns===0||atk.turns===-1)?-1:(atk.turns||3);
      attacker.active.effects=attacker.active.effects||[];
      // Si ya existe el mismo efecto (mismo nombre), resetear turnos en lugar de apilar
      const existingReg=attacker.active.effects.find(e=>e.type==='regen'&&e.name===atk.name);
      if(existingReg){
        if(existingReg.remaining===-1){
          addLog('<b>'+atk.name+'</b> ya es permanente en '+attacker.active.name+'. Sin efecto.','log-sys');
        } else {
          existingReg.remaining=regR;
          addLog(attacker.name+' renueva <b>'+atk.name+'</b>. Regeneración (+'+regR+' turnos)','log-heal');
        }
      } else {
        attacker.active.effects.push({type:'regen',name:atk.name,value:atk.value,remaining:regR});
        const regDur=regR===-1?'permanente':regR+' turnos';
        addLog(attacker.name+' activa <b>'+atk.name+'</b>. Regeneración ('+regDur+').','log-heal');
      }
      break;}
    case 'cumulative':{
      const uses=(attacker.active.cumulativeUses[atkIdx]||0)+1;
      attacker.active.cumulativeUses[atkIdx]=uses;
      const dmg=atk.value*uses;
      addLog('<b>'+atk.name+'</b> uso #'+uses+': -'+dmg+' hp.','log-dmg');
      animCard('p'+attacker.num+'card', _lunge);
      dealDmg_Standard(defender,dmg,atk.name); break;}
    case 'shield':{
      const shTurns=(atk.turns===0||atk.turns===-1)?-1:(atk.turns||2);
      attacker.active.shieldTurns=shTurns;
      attacker.active.shieldPct=atk.value;
      const shDur=shTurns===-1?'permanente':shTurns+' turnos';
      addLog(attacker.active.name+' activa <b>'+atk.name+'</b>: -'+atk.value+'% daño ('+shDur+').','log-heal'); break;}
    case 'prob':{
      const roll=Math.floor(Math.random()*100)+1;
      const ok=roll<=atk.prob;
      addLog('<b>'+atk.name+'</b>: tirada '+roll+' (≤'+atk.prob+') → '+(ok?'¡ÉXITO!':'FALLA'),'log-prob');
      if(ok){
        animCard('p'+attacker.num+'card', _lunge);
        dealDmg_Standard(defender,atk.value,atk.name);
      } else if(atk.consequence>0){
        attacker.active.hp=Math.max(0,attacker.active.hp-atk.consequence);
        addLog(attacker.active.name+' recibe '+atk.consequence+' hp de daño propio.','log-dmg');
        animCard('p'+attacker.num+'card','anim-hit');
        _floatDmg('p'+attacker.num+'card', atk.consequence, false);
        atk._wasFail=true;
        if(gameMode==='endless' && typeof _relicPostAtk==='function') _relicPostAtk(atk,attacker);
      } else { addLog('No ocurre nada.','log-sys'); }
      break;}
  }
}

function dealDmg_Standard(target, amount, atkName){
  if(!target.active) return;
  if(_caosShieldDefender && target === _caosShieldDefender) return;
  const sh=target.active.shieldPct||0;
  const reduced=sh>0?Math.floor(amount*(1-sh/100)):amount;
  target.active.hp=Math.max(0,target.active.hp-reduced);
  let msg=(atkName?'<b>'+atkName+'</b>: ':'')+target.active.name+' recibe '+reduced+' hp de daño.';
  if(sh>0) msg+=' (escudo -'+sh+'%)';
  addLog(msg,'log-dmg');
  animCard('p'+target.num+'card','anim-hit');
  _floatDmg('p'+target.num+'card', reduced, false);
  // shieldTurns se decrementa por turno en endTurn(), no por golpe
}

var _FLOATDMG_ALIAS = {'pbosscard':'bossZoneEl','p1card':'ob_p1_card','p2card':'ob_p2_card'};
function _floatDmg(cardId, amount, isHeal){
  var _resolvedId = (!document.getElementById(cardId) && _FLOATDMG_ALIAS[cardId]) ? _FLOATDMG_ALIAS[cardId] : cardId;
  const el = document.getElementById(_resolvedId);
  if(!el || amount <= 0) return;
  const rect = el.getBoundingClientRect();
  const div = document.createElement('div');
  div.className = 'float-dmg-el';
  div.textContent = (isHeal ? '+' : '-') + amount;
  const size = Math.min(28, Math.max(18, 14 + Math.floor(amount / 8)));
  div.style.fontSize = size + 'px';
  div.style.color = isHeal ? '#6bcb77' : (amount >= 20 ? '#ff4455' : '#ff8866');
  div.style.left = (rect.left + rect.width * 0.5 - 16) + 'px';
  div.style.top  = (rect.top  + rect.height * 0.25) + 'px';
  document.body.appendChild(div);
  setTimeout(() => div.remove(), 780);
}

function checkDeath_Standard(defender, attacker){
  if(!defender.active||defender.active.hp>0) return false;
  addLog('<b>'+defender.active.name+'</b> ha caído.','log-sys');
  // Conteo de kills siempre (para stats y Modo Fiesta)
  attacker.kills = (attacker.kills||0) + 1;
  // KOs por carta activa (para estadísticas individuales)
  if(botMode && !isOnline && attacker === p1 && attacker.active && window._gameCardKOs){
    var _cko = String(attacker.active.id);
    window._gameCardKOs[_cko] = (window._gameCardKOs[_cko] || 0) + 1;
  }
  // David vs Goliat: 1★ mata a 9★
  if(botMode && attacker.active && attacker.active.stars===1 && defender.active.stars===9){
    var _dvg=_loadStats(); _dvg.davidVsGoliath=(_dvg.davidVsGoliath||0)+1; _saveStats(_dvg); _checkAchievements(_dvg);
  }

  if(gameMode==='endless'){
    if(defender===p2){
      // El enemigo murió → siguiente oleada
      // KO del enemigo → vampirismo
      if(typeof _relicOnP1KO==='function') _relicOnP1KO();
      _endlessWave++;
      const next=_endlessNextEnemy();
      next.effects=[]; next.cumulativeUses={};
      p2.active=next;
      playSfxCarta();
      addLog('🏴 <b>Oleada '+_endlessWave+'</b>: <b>'+next.name+'</b> entra al campo.','log-sys');
      _updateEndlessWaveHud();
      // Cada 5 oleadas: elegir reliquia (pausa el juego hasta elegir)
      if(_endlessWave % 5 === 0 && typeof _relicShowPicker==='function'){
        setTimeout(_relicShowPicker, 400);
        return false;
      }
      return false;
    } else {
      // El jugador perdió una carta
      if(typeof _relicTrackP1Death==='function') _relicTrackP1Death(defender.active);
      if(defender.pile.length>0){
        const next=defender.pile.shift(); next.effects=[]; next.cumulativeUses={};
        defender.active=next; playSfxCarta();
        addLog(defender.name+' invoca a <b>'+next.name+'</b>.','log-sys');
        return false;
      } else if(typeof _relicCheckRevived==='function' && _relicCheckRevived()){
        return false;
      } else {
        endGame_Endless(); return true;
      }
    }
  }

  if(gameMode==='hand3'){
    defender.active=null;
    if(defender.hand.length>0){
      defender.needsToPlay=true;
      addLog(defender.name+' debe elegir una carta de su mano.','log-sys');
    } else if(defender.pile.length===0&&defender.hand.length===0){
      endGame_Standard(attacker); return true;
    }
  } else {
    if(defender.pile.length>0){
      const next=defender.pile.shift();
      next.effects=[]; next.cumulativeUses={};
      defender.active=next;
      playSfxCarta();
      addLog(defender.name+' invoca a <b>'+next.name+'</b>.','log-sys');
    } else {
      console.log('[NEXUS] checkDeath_Standard → pile=0 para', defender.name, '| llamando endGame_Standard | seq actual:', _stateSeq, '| turno:', turnNumber);
      endGame_Standard(attacker); return true;
    }
  }
  return false;
}

function endTurn(){
  if(gameMode==='boss'){ endTurn_Boss(); return; }

  const cp = currentPlayer===1?p1:p2;
  if(gameMode==='hand3'&&cp.needsToPlay){
    cp._didAttack = attackUsed;
    sendGameState(); renderGame(); maybeTriggerBot(); return;
  }

  const didAttack = attackUsed;
  let gameOver = false;

  // FASE 1: aplicar efectos a TODOS los jugadores antes de verificar muertes
  // (así si ambos mueren por DoT en el mismo turno se detecta como empate)
  for(const player of [p1,p2]){
    if(!player.active) continue;
    player.active.effects=(player.active.effects||[]).filter(ef=>{
      if(ef.type==='dot'){
        if(_caosShieldDefender && player===_caosShieldDefender){
          addLog('🛡 '+ef.name+' bloqueado por el escudo esta ronda.','log-sys');
        } else {
          player.active.hp=Math.max(0,player.active.hp-ef.value);
          const rem=ef.remaining===-1?'∞':Math.max(0,ef.remaining-1);
          addLog('<b>'+ef.name+'</b> causa '+ef.value+' hp a '+player.active.name+'. ('+rem+' restantes)','log-dmg');
          animCard('p'+player.num+'card','anim-hit');
          _floatDmg('p'+player.num+'card', ef.value, false);
        }
      } else if(ef.type==='regen'){
        const healed=Math.min(ef.value,player.active.maxHp-player.active.hp);
        player.active.hp=Math.min(player.active.maxHp,player.active.hp+ef.value);
        addLog('<b>'+ef.name+'</b> restaura '+healed+' hp a '+player.active.name+'.','log-heal');
        animCard('p'+player.num+'card','anim-heal');
        _floatDmg('p'+player.num+'card', healed, true);
      }
      if(ef.remaining!==-1) ef.remaining--;
      return ef.remaining>0||ef.remaining===-1;
    });
    // Decremento del escudo por turno
    if(player.active&&player.active.shieldTurns&&player.active.shieldTurns!==-1){
      player.active.shieldTurns--;
      if(player.active.shieldTurns<=0){delete player.active.shieldPct;delete player.active.shieldTurns;}
    }
  }

  _caosShieldDefender = null;

  // FASE 2: detectar muertes por DoT (ya aplicadas a ambos)
  const p1Dead = p1.active && p1.active.hp <= 0;
  const p2Dead = p2.active && p2.active.hp <= 0;

  if(p1Dead && p2Dead && (p1.pile||[]).length===0 && (p2.pile||[]).length===0){
    // Empate: ambos murieron por DoT en el mismo turno con pilas vacías
    addLog('<b>'+p1.active.name+'</b> y <b>'+p2.active.name+'</b> cayeron por daño continuo al mismo tiempo.','log-sys');
    // Dar kills mutuos por las últimas cartas que murieron por DoT
    p2.kills = (p2.kills||0) + 1;
    p1.kills = (p1.kills||0) + 1;
    endGame_Standard(null, true);
    return;
  }

  for(const player of [p1,p2]){
    if(!player.active || player.active.hp > 0) continue;
    const other=player===p1?p2:p1;
    addLog('<b>'+player.active.name+'</b> cayó por daño continuo.','log-sys');
    // Conteo de kills para todos los modos (muertes por DOT)
    other.kills = (other.kills||0) + 1;
    if(gameMode==='endless'){
      if(player===p2){
        if(typeof _relicOnP1KO==='function') _relicOnP1KO();
        _endlessWave++;
        const next=_endlessNextEnemy(); next.effects=[]; next.cumulativeUses={};
        p2.active=next; playSfxCarta();
        addLog('🏴 <b>Oleada '+_endlessWave+'</b>: <b>'+next.name+'</b> entra al campo.','log-sys');
        _updateEndlessWaveHud();
        if(_endlessWave % 5 === 0 && typeof _relicShowPicker==='function') setTimeout(_relicShowPicker,400);
      } else {
        if(typeof _relicTrackP1Death==='function') _relicTrackP1Death(player.active);
        if(player.pile.length>0){
          const next=player.pile.shift(); next.effects=[]; next.cumulativeUses={};
          player.active=next; playSfxCarta(); addLog(player.name+' invoca a <b>'+next.name+'</b>.','log-sys');
        } else if(typeof _relicCheckRevived==='function' && _relicCheckRevived()){
          // carta revivida toma el relevo
        } else { endGame_Endless(); gameOver=true; break; }
      }
    } else if(gameMode==='hand3'){
      player.active=null;
      if(player.hand.length>0) player.needsToPlay=true;
      else if(player.pile.length===0){ endGame_Standard(other); gameOver=true; break; }
    } else {
      if(player.pile.length>0){
        const next=player.pile.shift(); next.effects=[]; next.cumulativeUses={};
        player.active=next; playSfxCarta(); addLog(player.name+' invoca a <b>'+next.name+'</b>.','log-sys');
      } else { endGame_Standard(other); gameOver=true; break; }
    }
  }
  if(gameOver) return;

  attackUsed=false;

  if(gameMode==='hand3'){
    const cpNow=currentPlayer===1?p1:p2;
    if(cpNow.needsToPlay){
      cpNow._didAttack = didAttack;
      sendGameState(); renderGame(); maybeTriggerBot(); return;
    }
  }

  currentPlayer=currentPlayer===1?2:1;
  if(currentPlayer===1) turnNumber++;
  // Pacto de Sangre: drena cada cambio de turno (igual que DoT)
  if(gameMode==='endless' && typeof _relicActive==='function' && _relicActive('pacto_sangre') && p1 && p1.active){
    const _psDmg = 4;
    p1.active.hp = Math.max(0, p1.active.hp - _psDmg);
    addLog('🩸 <b>Pacto de Sangre</b>: '+p1.active.name+' pierde '+_psDmg+' HP.','log-dmg');
    _floatDmg('p1card', _psDmg, false);
    if(p1.active.hp <= 0 && checkDeath_Standard(p1, p2)) return;
  }

  if(gameMode==='hand3'){
    const next=currentPlayer===1?p1:p2;
    while(next.hand.length<3&&next.pile.length>0){
      const c=next.pile.shift(); c.effects=c.effects||[]; c.cumulativeUses=c.cumulativeUses||{};
      next.hand.push(c);
    }
  }

  if(_caosActive){ _rollCaosEffect(); addLog('🎲 Efecto del turno: <b>'+_caosEffectLabel(_caosEffect)+'</b>.','log-sys'); }
  addLog('— Turno '+turnNumber+': '+(currentPlayer===1?p1:p2).name+' —','log-sys');
  sendGameState();
  renderGame();
  _saveTourneyProgress();
  maybeTriggerBot();
}

function endGame_Standard(winner, _isDraw){
  // Tutorial: nunca mostrar pantalla de fin normal
  if(tutGameMode || _tutGameSession){
    _tutGameOnP1Turn = null;
    if(tutGameMode){
      // El overlay sigue activo: ir al paso "completado"
      _tutGStep = _TUT_GAME_STEPS.length - 1;
      setTimeout(function(){ _tutGTagAtkBtns(); _tutGRender(); }, 400);
    } else {
      // La partida del tutorial terminó: marcar como completado y mostrar pantalla
      _tutGameSession = false;
      localStorage.setItem(_TUT_LAUNCH_KEY,'1');
      showScreen('tutCompleteScreen');
    }
    return;
  }
  // Modo Fiesta: interceptar resultado
  if(partyState && (partyState._pendingGroupMatch != null || partyState._pendingKnockout != null)){
    _stopResync();
    // Empate real: winner también quedó sin cartas (active muerta Y pila vacía)
    // Si winner.active murió pero aún tiene pila, es victoria normal (ej: Boom con cartas restantes)
    const winnerAlsoOut = winner && (!winner.active || winner.active.hp <= 0) && (winner.pile||[]).length === 0;
    const isDraw = !!_isDraw || winnerAlsoOut;
    // Si el "ganador" murió por autodaño, dar kill al rival para igualar el marcador
    if(winnerAlsoOut && winner){
      const loser = winner === p1 ? p2 : p1;
      loser.kills = (loser.kills||0) + 1;
    }
    const p1Kills = p1.kills||0;
    const p2Kills = p2.kills||0;
    if(botMode && !isOnline && gameMode !== 'rapido' && typeof _updateCardStats === 'function' && window._gameP1Deck){
      const _pWon = !isDraw && winner === p1;
      _updateCardStats(window._gameP1Deck, _pWon, !isDraw && !_pWon, window._gameCardKOs||{});
    }
    window._gameP1Deck = null; window._gameCardKOs = null;
    if(partyState._pendingGroupMatch != null){
      _partyOnGroupMatchEnd(isDraw ? null : winner, isDraw, p1Kills, p2Kills);
    } else {
      _partyOnKnockoutMatchEnd(isDraw ? null : winner, isDraw, p1Kills, p2Kills);
    }
    return;
  }
  // Modo Fiesta Liga: interceptar resultado
  if(ligaState && (ligaState._pendingLeagueMatch != null || ligaState._pendingKnockout != null)){
    _stopResync();
    const winnerAlsoOut = winner && (!winner.active||winner.active.hp<=0) && (winner.pile||[]).length===0;
    const isDraw = !!_isDraw || winnerAlsoOut;
    if(winnerAlsoOut && winner){ const _loser=winner===p1?p2:p1; _loser.kills=(_loser.kills||0)+1; }
    const p1Kills = p1.kills||0;
    const p2Kills = p2.kills||0;
    if(botMode && !isOnline && gameMode !== 'rapido' && typeof _updateCardStats === 'function' && window._gameP1Deck){
      const _pWon = !isDraw && winner === p1;
      _updateCardStats(window._gameP1Deck, _pWon, !isDraw && !_pWon, window._gameCardKOs||{});
    }
    window._gameP1Deck = null; window._gameCardKOs = null;
    if(ligaState._pendingLeagueMatch != null){
      _ligaOnLeagueMatchEnd(isDraw ? null : winner, isDraw, p1Kills, p2Kills);
    } else {
      _ligaOnKnockoutMatchEnd(isDraw ? null : winner, isDraw, p1Kills, p2Kills);
    }
    return;
  }
  const titleEl=document.getElementById('endTitle');
  const subEl=document.getElementById('endSub');
  const winnerAlsoOut = winner && (!winner.active||winner.active.hp<=0) && (winner.pile||[]).length===0;
  const isRealDraw = !!_isDraw || winnerAlsoOut;
  if(isRealDraw){
    titleEl.textContent='¡Empate!';
    titleEl.className='end-title';
    subEl.textContent='Turno '+turnNumber+'. Ambos jugadores cayeron al mismo tiempo.';
    _humanWon=false; _stopResync(); renderGame(); showEndScreen();
    if(botMode&&!isOnline){ var _dm=(typeof gameMode!=='undefined'&&gameMode==='hand3')?'hand3':'standard'; _trackMatch({drawn:true,myKOs:p1?p1.kills||0:0,mode:_dm}); if(typeof _updateCardStats==='function'&&window._gameP1Deck){ _updateCardStats(window._gameP1Deck,false,false,window._gameCardKOs||{}); } }
    window._gameP1Deck=null; window._gameCardKOs=null;
    return;
  }
  const loser=winner===p1?p2:p1;
  _humanWon = isOnline ? (winner.num===myPlayerNum) : (winner===p1);
  titleEl.textContent=_humanWon ? winner.name+' gana' : (botMode?'Derrota':winner.name+' gana');
  titleEl.className=_humanWon?'end-title end-win end-win-glow':'end-title end-lose end-lose-glow';
  subEl.textContent='Turno '+turnNumber+'. '+(loser.active?loser.active.name+' fue la última carta en caer.':loser.name+' se quedó sin cartas.');
  // Notificar al otro jugador que la partida terminó
  if(isOnline){
    const goData={winnerNum: winner===p1?1:2, winnerName:winner.name, turn:turnNumber};
    console.log('[NEXUS] endGame_Standard → enviando game-over | ganador:', winner.name, '| seq antes:', _stateSeq, '| turno:', turnNumber);
    _pendingGameOver=goData; sendGameState();
    console.log('[NEXUS] endGame_Standard → seq después de sendGameState:', _stateSeq);
    _startGameOverResend(goData);
  }
  _stopResync();
  renderGame();
  showEndScreen();
  // Track stats solo en Un Jugador (botMode=true), nunca en Duelo Rápido
  if(botMode && !isOnline && gameMode !== 'rapido'){
    var _pWon = winner === p1;
    var _mode = (typeof gameMode !== 'undefined' && gameMode==='hand3') ? 'hand3' : (gameMode==='caos') ? 'caos' : (gameMode==='espejo') ? 'espejo' : 'standard';
    _trackMatch({ won:_pWon, lost:!isRealDraw&&!_pWon, drawn:isRealDraw, myKOs:p1?p1.kills||0:0, oppKOs:p2?p2.kills||0:0, mode:_mode });
    if(typeof _updateCardStats === 'function' && window._gameP1Deck){
      _updateCardStats(window._gameP1Deck, _pWon, !isRealDraw&&!_pWon, window._gameCardKOs||{});
    }
  }
  window._gameP1Deck = null;
  window._gameCardKOs = null;
}

function endGame_Endless(){
  const wave = _endlessWave;
  const kills = p1 ? (p1.kills||0) : 0;
  const titleEl = document.getElementById('endTitle');
  const subEl   = document.getElementById('endSub');
  _humanWon = false;
  titleEl.textContent = '¡Run terminado!';
  titleEl.className   = 'end-title';
  subEl.textContent   = 'Llegaste a la oleada '+wave+' con '+kills+' eliminaciones.';
  renderGame();
  showEndScreen();
  // Guardar stats
  var s = _loadStats();
  s.endlessPlayed = (s.endlessPlayed||0) + 1;
  s.endlessKills  = (s.endlessKills||0)  + kills;
  if(wave > (s.endlessBest||0)) s.endlessBest = wave;
  var _coinsGained = wave>50?50 : wave>40?40 : wave>30?30 : wave>20?20 : wave>10?10 : 0;
  if(typeof _relicOnEndlessEnd==='function') _coinsGained += _relicOnEndlessEnd();
  if(_coinsGained>0) s.coins = (s.coins||0) + _coinsGained;
  var _xpGained = Math.floor(wave / 5) * 5;
  var _levelBefore = _xpToLevel(s.xp||0);
  s.xp = (s.xp||0) + _xpGained;
  var _levelAfter = _xpToLevel(s.xp);
  _saveStats(s);
  var _newAch = _checkAchievements(s);
  if(_coinsGained>0) _showCoinToast(_coinsGained, _newAch*4200);
  if(_xpGained>0 && _levelAfter > _levelBefore) _showLevelUpPopup(_levelAfter, _levelBefore);
  _updateDailyProgress('endless', wave);
  renderStats();
}

/* ═══════════════════════════════════════════════
   COMBAT — BOSS
═══════════════════════════════════════════════ */
function useAttack_Boss_Challenger(atkIndex){
  if(attackUsed||currentPlayer!=='challenger') return;
  const atk=challenger.active.attacks[atkIndex];
  attackUsed=true;
  resolveAtk_Boss(atk,challenger.active,boss.card,true);
  if(boss.card.hp<=0){ endGame_Boss('challenger'); return; }
  tickEffects_Boss(boss.card,false);
  if(boss.card.hp<=0){endGame_Boss('challenger');return;}
  tickEffects_Boss(challenger.active,true);
  if(!challenger.active||challenger.active.hp<=0){
    if(!nextChalCard()){endGame_Boss('boss');return;}
  }
  currentPlayer='boss'; attackUsed=false;
  renderGame();
  setTimeout(bossAutoAttack, 2000);
}

function bossAutoAttack(){
  const atk=BOSS_CARD.attacks[Math.floor(Math.random()*BOSS_CARD.attacks.length)];
  addLog(boss.name+' usa <b>'+atk.name+'</b>.','log-boss');
  resolveAtk_Boss(atk,boss.card,challenger.active,false);
  if(!challenger.active||challenger.active.hp<=0){
    if(!nextChalCard()){endGame_Boss('boss');return;}
  }
  turnNumber++;
  attackUsed=false;
  currentPlayer='challenger';
  addLog('— Turno '+turnNumber+': '+challenger.name+' —','log-sys');
  renderGame();
}


function resolveAtk_Boss(atk, self, target, isChal){
  playSfxAttack();
  const selfLabel=isChal?challenger.active.name:boss.name;
  const tgtLabel=isChal?boss.name:challenger.active.name;
  switch(atk.type){
    case 'direct':{
      dealDmg_Boss(target,atk.value,atk.name,isChal);
      if(isChal&&atk.selfDmg>0){
        const selfAmt=atk.selfDmgType==='pct_max'?Math.floor(self.maxHp*atk.selfDmg/100)
                     :atk.selfDmgType==='pct'?Math.floor(self.hp*atk.selfDmg/100):atk.selfDmg;
        self.hp=Math.max(0,self.hp-selfAmt);
        addLog('<b>'+atk.name+'</b>: '+selfLabel+' recibe '+selfAmt+' hp de daño propio.','log-dmg');
        animEl('chalArt','anim-dmg');
      }
      break;}
    case 'dot':{
      const dotR=(atk.turns===0||atk.turns===-1)?-1:(atk.turns||3);
      target.effects=target.effects||[];
      target.effects=target.effects.filter(ef=>ef.name!==atk.name);
      target.effects.push({type:'dot',name:atk.name,value:atk.value,remaining:dotR});
      addLog(selfLabel+' aplica <b>'+atk.name+'</b> a '+tgtLabel+'.','log-dmg'); break;}
    case 'regen':{
      const regR=(atk.turns===0||atk.turns===-1)?-1:(atk.turns||3);
      self.effects=self.effects||[];
      self.effects=self.effects.filter(ef=>ef.name!==atk.name);
      self.effects.push({type:'regen',name:atk.name,value:atk.value,remaining:regR});
      addLog(selfLabel+' activa <b>'+atk.name+'</b>.','log-heal'); break;}
    case 'cumulative':{
      const uses=(self.cumulativeUses[atk.name]||0)+1;
      self.cumulativeUses[atk.name]=uses;
      const dmg=atk.value*uses;
      addLog('<b>'+atk.name+'</b> uso #'+uses+': -'+dmg+' hp.','log-dmg');
      dealDmg_Boss(target,dmg,atk.name,isChal); break;}
    case 'shield':{
      const shT=(atk.turns===0||atk.turns===-1)?-1:(atk.turns||2);
      self.shieldTurns=shT; self.shieldPct=atk.value;
      addLog(selfLabel+' activa <b>'+atk.name+'</b>: -'+atk.value+'% daño.','log-heal'); break;}
    case 'prob':{
      const roll=Math.floor(Math.random()*100)+1;
      const ok=roll<=atk.prob;
      addLog('<b>'+atk.name+'</b>: tirada '+roll+' (≤'+atk.prob+') → '+(ok?'¡ÉXITO!':'FALLA'),'log-prob');
      if(ok){ dealDmg_Boss(target,atk.value,atk.name,isChal); }
      else if(atk.consequence>0){
        self.hp=Math.max(0,self.hp-atk.consequence);
        addLog(selfLabel+' recibe '+atk.consequence+' hp de daño propio.',isChal?'log-dmg':'log-boss');
        animEl(isChal?'chalArt':'bossZoneEl','anim-dmg');
      } else addLog('No ocurre nada.','log-sys');
      break;}
  }
}

function dealDmg_Boss(target, amount, atkName, isChal){
  const sh=target.shieldPct||0;
  const reduced=sh>0?Math.floor(amount*(1-sh/100)):amount;
  target.hp=Math.max(0,target.hp-reduced);
  let msg=(atkName?'<b>'+atkName+'</b>: ':'')+target.name+' recibe '+reduced+' hp de daño.';
  if(sh>0) msg+=' (escudo -'+sh+'%)';
  addLog(msg,isChal?'log-boss':'log-dmg');
  var _bossTargetId = isChal ? 'bossZoneEl' : 'chalArt';
  animEl(_bossTargetId, isChal?'boss-pulse-anim':'anim-dmg');
  _floatDmg(_bossTargetId, reduced, false);
  // shieldTurns se decrementa por turno en tickEffects_Boss(), no por golpe
}

function nextChalCard(){
  if(challenger.pile.length===0) return false;
  const next=challenger.pile.shift();
  next.effects=[]; next.cumulativeUses={};
  challenger.active=next;
  playSfxCarta();
  addLog(challenger.name+' invoca a <b>'+next.name+'</b>.','log-sys');
  return true;
}

function endTurn_Boss(){
  tickEffects_Boss(boss.card,false);
  if(boss.card.hp<=0){endGame_Boss('challenger');return;}
  tickEffects_Boss(challenger.active,true);
  if(!challenger.active||challenger.active.hp<=0){
    if(!nextChalCard()){endGame_Boss('boss');return;}
  }
  currentPlayer=currentPlayer==='challenger'?'boss':'challenger';
  if(currentPlayer==='challenger') turnNumber++;
  attackUsed=false;
  addLog('— Turno '+turnNumber+': '+(currentPlayer==='challenger'?challenger.name:boss.name)+' —','log-sys');
  renderGame();
}

function tickEffects_Boss(card, isChal){
  if(!card) return;
  card.effects=(card.effects||[]).filter(ef=>{
    if(ef.type==='dot'){
      card.hp=Math.max(0,card.hp-ef.value);
      const rem=ef.remaining===-1?'∞':Math.max(0,ef.remaining-1);
      addLog('<b>'+ef.name+'</b> causa '+ef.value+' hp a '+card.name+'. ('+rem+' restantes)','log-dmg');
      animEl(isChal?'chalArt':'bossZoneEl',isChal?'anim-dmg':'boss-pulse-anim');
    } else if(ef.type==='regen'){
      const healed=Math.min(ef.value,card.maxHp-card.hp);
      card.hp=Math.min(card.maxHp,card.hp+ef.value);
      addLog('<b>'+ef.name+'</b> restaura '+healed+' hp a '+card.name+'.','log-heal');
      animEl(isChal?'chalArt':'bossZoneEl','anim-heal');
    }
    if(ef.remaining!==-1) ef.remaining--;
    return ef.remaining>0||ef.remaining===-1;
  });
  // Escudo por turno
  if(card.shieldTurns&&card.shieldTurns!==-1){
    card.shieldTurns--;
    if(card.shieldTurns<=0){delete card.shieldPct;delete card.shieldTurns;}
  }
}

function endGame_Boss(winner){
  document.getElementById('gameScreen').classList.remove('boss-battle');
  _switchBgm(bgm);
  const titleEl=document.getElementById('endTitle');
  const subEl=document.getElementById('endSub');
  _humanWon = winner==='challenger';
  if(winner==='challenger'){
    titleEl.textContent=challenger.name+' venció al jefe';
    titleEl.className='end-title end-win end-win-glow';
    subEl.textContent=boss.name+' ha sido derrotado en el turno '+turnNumber+'.';
  } else {
    titleEl.textContent=boss.name+' devora todo';
    titleEl.className='end-title end-lose';
    subEl.textContent=challenger.name+' se quedó sin cartas en el turno '+turnNumber+'.';
  }
  renderGame();
  showEndScreen();
  // Solo en Boss 1v1 solo (no 2v1 cooperativo, no online)
  if(!isOnline && !bossLocal2v1){
    var _bossWon = winner==='challenger';
    _trackMatch({ won:_bossWon, lost:!_bossWon, myKOs:challenger?challenger.kills||0:0, mode:'boss', bossId:BOSS_CARD.id });
    if(_bossWon){
      var _wikiId = _WIKI_BOSS_IDS[String(selectedBossIdx)];
      if(_wikiId) _unlockCard(_wikiId);
    }
  }
}

/* ═══════════════════════════════════════════════
   REVANCHA
═══════════════════════════════════════════════ */
/* ── Pantalla de fin: botones contextuales ── */
function _launchShockwave(win){
  const canvas = document.getElementById('shockwaveCanvas');
  if(!canvas) return;
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  const ctx = canvas.getContext('2d');
  const cx = canvas.width/2, cy = canvas.height/2;
  const maxR = Math.hypot(cx, cy) * 1.2;
  // win: verde arcano / lose: rojo
  const color = win ? '130,255,180' : '255,80,60';
  const waves = [
    { r:0, delay:0,   speed: maxR/28 },
    { r:0, delay:8,   speed: maxR/22 },
    { r:0, delay:16,  speed: maxR/18 },
  ];
  let frame = 0;
  const startTime = performance.now();
  const DURATION = 1600;

  function draw(now){
    const elapsed = now - startTime;
    const progress = Math.min(elapsed / DURATION, 1);
    ctx.clearRect(0,0,canvas.width,canvas.height);

    // Flash inicial de pantalla
    if(progress < 0.18){
      const flashAlpha = (0.18 - progress) / 0.18 * (win ? 0.22 : 0.28);
      ctx.fillStyle = `rgba(${color},${flashAlpha})`;
      ctx.fillRect(0,0,canvas.width,canvas.height);
    }

    // Ondas expansivas
    waves.forEach((w,i)=>{
      if(frame < w.delay) return;
      w.r += w.speed;
      const wProgress = w.r / maxR;
      const alpha = Math.max(0, (1 - wProgress) * 0.75);
      const lineW = win ? 3 - wProgress*2 : 4 - wProgress*2.5;
      ctx.beginPath();
      ctx.arc(cx, cy, w.r, 0, Math.PI*2);
      ctx.strokeStyle = `rgba(${color},${alpha})`;
      ctx.lineWidth = Math.max(0.5, lineW);
      ctx.shadowColor = `rgba(${color},${alpha*0.8})`;
      ctx.shadowBlur = win ? 18 : 22;
      ctx.stroke();
      ctx.shadowBlur = 0;
    });

    frame++;
    if(progress < 1) requestAnimationFrame(draw);
    else ctx.clearRect(0,0,canvas.width,canvas.height);
  }
  requestAnimationFrame(draw);
}

function showEndScreen(){
  _caosActive=false; _caosEffect=null; _caosShieldDefender=null;
  _renderCaosBanner();
  const online = isOnline;
  const rb=document.getElementById('endRevanchaBtn');
  const mb=document.getElementById('endMenuBtn');
  const lb=document.getElementById('endLobbyBtn');
  const sb=document.getElementById('endSalirBtn');
  if(rb) rb.style.display=online?'none':'';
  if(mb) mb.style.display=online?'none':'';
  if(lb) lb.style.display=online?'':'none';
  if(sb) sb.style.display=online?'':'none';
  showScreen('endScreen');
  _launchShockwave(_humanWon);
  if(_humanWon) playSfxVictoria(); else playSfxDerrota();
}

function endToMenu(){
  _stopResync();
  bossLocal2v1=false;
  if(isOnline){ isOnline=false; _fbDisconnect(); }
  showScreen('titleScreen');
}

function endOnlineLobby(){
  if(_fbRoomRef) _fbSend({type:'reset_lobby'});
  doResetToLobby(myPlayerNum===1?'host':'guest');
}

function revancha(){
  if(gameMode==='rapido'){ _launchRapido(); return; }
  p1sel=[]; p2sel=[]; p3sel=[]; chalSel=[];
  if(bossLocal2v1){
    launchLocalBoss2v1();
  } else {
    _launchSetup(gameMode);
  }
}

/* ═══════════════════════════════════════════════
   UTILITIES
═══════════════════════════════════════════════ */
function animEl(id, cls, ms=600){
  const el=document.getElementById(id);
  if(!el) return;
  el.classList.remove(cls); void el.offsetWidth;
  el.classList.add(cls); setTimeout(()=>el.classList.remove(cls),ms);
}
function animCard(id, cls){ animEl(id, cls, 450); }

function addLog(msg, cls=''){
  const e = {cls:'log-entry '+cls, html:msg};
  logEntries.push(e);
  const log=document.getElementById('logWrap');
  const div=document.createElement('div');
  div.className=e.cls;
  div.innerHTML=msg;
  log.appendChild(div);
  log.scrollTop=log.scrollHeight;
}

/* ═══════════════════════════════════════════════
   BOT AI
═══════════════════════════════════════════════ */
let _botTimer = null;

function maybeTriggerBot(){
  if(!botMode || isOnline || gameMode==='boss') return;
  const isBotTurn = (gameMode==='triple') ? currentPlayer!==1 : currentPlayer===2;
  if(!isBotTurn) return;
  if(_botTimer) clearTimeout(_botTimer);
  _botTimer = setTimeout(doBotTurn, tutGameMode ? 1100 : 900);
}

function doBotTurn(){
  _botTimer = null;
  if(!botMode || isOnline) return;
  const botNum = (gameMode==='triple') ? currentPlayer : 2;
  if(currentPlayer !== botNum) return; // turno cambió mientras esperaba
  const bot = gameMode==='triple' ? triplePlayerByNum(botNum) : p2;
  if(!bot) return;
  // Tutorial: bot siempre usa ataque 0, sin aleatoriedad
  if(tutGameMode && gameMode!=='triple'){
    if(bot.active && (bot.active.attacks||[]).length > 0){ useAttack_Standard(0); }
    return;
  }

  // Hand3: si bot necesita invocar carta primero
  if(gameMode==='hand3' && bot.needsToPlay){
    if(!bot.hand||bot.hand.length===0) return;
    const idx = Math.floor(Math.random()*bot.hand.length);
    // Temporalmente fingimos que somos el jugador activo para que pase los checks
    invocarCarta_Bot(bot, idx);
    return;
  }

  if(!bot.active) return;
  const attacks = bot.active.attacks || [];
  if(attacks.length===0) return;
  const atkIdx = Math.floor(Math.random()*attacks.length);

  if(gameMode==='triple'){
    const others = [1,2,3].filter(n=>n!==botNum && tripleIsAlive(n));
    if(others.length===0) return;
    pendingTarget = others[Math.floor(Math.random()*others.length)];
    useAttack_Triple(atkIdx);
  } else {
    useAttack_Standard(atkIdx);
  }
}

// Versión de invocarCarta que bypasea el check isMyTurn para el bot
function invocarCarta_Bot(bot, idx){
  if(!bot.needsToPlay) return;
  const card = bot.hand[idx];
  if(!card) return;
  bot.hand.splice(idx,1); bot.active=card; bot.needsToPlay=false;
  playSfxCarta();
  addLog(bot.name+' (bot) invoca a <b>'+card.name+'</b>.','log-sys');
  const invokeOnly  = bot._invokeOnly;  delete bot._invokeOnly;
  const alreadyAttacked = bot._didAttack; delete bot._didAttack;
  if(alreadyAttacked){ advanceTurn(); }
  else if(invokeOnly){
    // Solo veníamos a invocar; devolver turno al jugador humano
    const returnTo = bot===p1 ? p2 : p1;
    currentPlayer = returnTo.num;
    renderGame();
    maybeTriggerBot();
  } else {
    // ¿El humano también necesita invocar antes de que el bot ataque?
    const other = bot===p1?p2:p1;
    if(other.needsToPlay && !other.active){
      other._invokeOnly = true;
      currentPlayer = other.num;
      addLog(other.name+' debe elegir una carta de su mano.','log-sys');
      renderGame();
      // El bot atacará cuando el humano invoque con _invokeOnly y maybeTriggerBot lo reactive
    } else {
      renderGame();
      setTimeout(doBotTurn, 600);
    }
  }
}

function showRouletteWaiting(){
  const overlay = document.getElementById('rouletteOverlay');
  overlay.style.display = 'flex';
  document.getElementById('rouletteHeading').textContent = '⚔ DEFINIENDO ORDEN ⚔';
  const resEl = document.getElementById('rouletteResult');
  resEl.innerHTML = '<span style="color:var(--text-muted);font-size:.85rem;letter-spacing:.05em">El anfitrión está decidiendo<br>quién comienza…</span>';
  resEl.style.display = 'block';
  document.getElementById('rouletteBtn').style.display = 'none';
  // Dibujar rueda oscura con "?"
  const canvas = document.getElementById('rouletteCanvas');
  const ctx = canvas.getContext('2d');
  const cx=canvas.width/2, cy=canvas.height/2, R=cx-6;
  ctx.clearRect(0,0,canvas.width,canvas.height);
  ctx.beginPath(); ctx.arc(cx,cy,R,0,Math.PI*2);
  ctx.fillStyle='#0d0d20'; ctx.fill();
  ctx.strokeStyle='#3a3a65'; ctx.lineWidth=4; ctx.stroke();
  // Línea divisoria decorativa
  ctx.beginPath(); ctx.moveTo(cx,cy-R); ctx.lineTo(cx,cy+R);
  ctx.strokeStyle='#252545'; ctx.lineWidth=2; ctx.stroke();
  ctx.beginPath(); ctx.moveTo(cx-R,cy); ctx.lineTo(cx+R,cy);
  ctx.stroke();
  // "?" central
  ctx.textAlign='center'; ctx.textBaseline='middle';
  ctx.fillStyle='#3a3a65';
  ctx.font='bold 56px Cinzel,serif';
  ctx.fillText('?', cx, cy);
}

