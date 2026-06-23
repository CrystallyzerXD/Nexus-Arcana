/* ═══════════════════════════════════════════════
   BOSS PICKER
═══════════════════════════════════════════════ */
let _bossPickerSource = 'local';

function showBossPicker(source){
  _bossPickerSource = source||'local';
  selectedBossIdx = -1; // limpiar selección para que el usuario elija activamente
  const backBtn = document.getElementById('bossPickBackBtn');
  backBtn.onclick = ()=>showScreen(
    source==='online'   ? 'onlineScreen' :
    source==='local'    ? 'botModeScreen' :
    'singlePlayerScreen'
  );
  renderBossPickerGrid();
  showScreen('bossPickScreen');
}

function renderBossPickerGrid(){
  const grid = document.getElementById('bossPickGrid');
  grid.innerHTML='';
  document.getElementById('bossPickConfirmBtn').disabled = (selectedBossIdx===-1);

  BOSSES.forEach((b,i)=>{
    const card = document.createElement('div');
    card.className='boss-pick-card'+(selectedBossIdx===i?' selected':'');
    card.id='bossPickCard_'+i;

    // Helper para texto de ataque
    const atkMeta = a=>{
      const dur=t=>t===0||t===-1?'∞':'×'+(t||3);
      switch(a.type){
        case 'direct':{ let s='-'+a.value+' HP'; if(a.selfDmg>0) s+=', -'+(a.selfDmgType==='pct_max'?a.selfDmg+'% HP máx':a.selfDmgType==='pct'?a.selfDmg+'% HP':a.selfDmg+' HP')+' propio'; if(a.selfHeal>0) s+=', +'+a.selfHeal+' HP absorción'; if(a.lifeSteal>0) s+=', +'+a.lifeSteal+'% robo de vida'; return s;}
        case 'dot':       return '-'+a.value+' HP/turno ('+dur(a.turns)+')';
        case 'regen':     return '+'+a.value+' HP/turno ('+dur(a.turns)+')';
        case 'shield':    return '-'+a.value+'% daño ('+(a.turns===0||a.turns===-1?'∞':(a.turns||2)+' turnos')+')';
        case 'cumulative':return '-'+a.value+' HP (+'+a.value+' por uso acumulado)';
        case 'prob':      return a.prob+'%: -'+a.value+' HP / falla: -'+(a.consequence||0)+' propio';
        default:          return '';
      }
    };

    const hp = (_bossPickerSource==='local2v1'?'2000':'1000')+' HP';
    card.innerHTML=
      '<div class="boss-pick-main">'+
        '<div class="boss-pick-icon">👁</div>'+
        '<div style="flex:1;min-width:0">'+
          '<div class="boss-pick-name">'+b.name+'</div>'+
          '<div class="boss-pick-title">'+b.title+'</div>'+
        '</div>'+
        '<div class="boss-pick-hp">'+hp+'</div>'+
        '<div class="boss-pick-check">✔</div>'+
      '</div>'+
      '<div class="boss-pick-toggle" onclick="event.stopPropagation();this.nextElementSibling.classList.toggle(\'open\');this.textContent=this.nextElementSibling.classList.contains(\'open\')?\'▲ ocultar ataques\':\'▼ ver ataques\'">▼ ver ataques</div>'+
      '<div class="boss-pick-atks">'+
        b.attacks.map(a=>
          '<div class="boss-pick-atk">'+
            '<span class="boss-pick-atk-name">'+a.name+'</span>'+
            '<span class="boss-pick-atk-val">'+atkMeta(a)+'</span>'+
          '</div>'
        ).join('')+
      '</div>';

    card.onclick=()=>{
      selectedBossIdx=i;
      BOSS_CARD=BOSSES[i];
      document.querySelectorAll('.boss-pick-card').forEach((c,ci)=>
        c.classList.toggle('selected', ci===i));
      document.getElementById('bossPickConfirmBtn').disabled=false;
    };
    grid.appendChild(card);
  });
}

function confirmBossPick(){
  if(selectedBossIdx<0 || selectedBossIdx>=BOSSES.length) return;
  BOSS_CARD=BOSSES[selectedBossIdx];
  if(_bossPickerSource==='online'){
    updateOnlineBossGrid();
    if(_fbRoomRef)
      _fbSend({type:'mode_update', mode:'boss', bossIdx:selectedBossIdx});
    showScreen('onlineScreen');
  } else if(_bossPickerSource==='local2v1'){
    launchLocalBoss2v1();
  } else {
    launchBotMode('boss');
  }
}

/* ── Selector de jefe en lobby online ── */
function buildOnlineBossGrid(){
  const grid = document.getElementById('onlineBossGrid');
  if(!grid) return;
  grid.innerHTML='';
  BOSSES.forEach((b,i)=>{
    const el=document.createElement('div');
    el.className='mode-mini-card'+(selectedBossIdx===i?' selected':'');
    el.id='obBtn_'+i;
    el.innerHTML='👁<br>'+b.name;
    el.onclick=()=>selectOnlineBoss(i);
    grid.appendChild(el);
  });
}

function updateOnlineBossGrid(){
  BOSSES.forEach((_,i)=>{
    const el=document.getElementById('obBtn_'+i);
    if(el) el.className='mode-mini-card'+(selectedBossIdx===i?' selected':'');
  });
}

function selectOnlineBoss(idx){
  selectedBossIdx=idx;
  BOSS_CARD=BOSSES[idx];
  updateOnlineBossGrid();
  if(_fbRoomRef)
    _fbSend({type:'mode_update', mode:'boss', bossIdx:idx});
}

/* ═══════════════════════════════════════════════
   MODO TRIPLE — 1v1v1 FFA
═══════════════════════════════════════════════ */
function triplePlayerObj(num, cfg){
  const cards=shuffle(cfg.deckIds.map(id=>makeCard(CARD_POOL.find(c=>c.id===id))));
  const active=cards.shift();
  return {num, name:cfg.name, active, pile:cards, hand:[]};
}

function tripleIsAlive(num){
  const p=num===1?p1:num===2?p2:p3;
  if(!p) return false;
  return !!(p.active || (Array.isArray(p.pile) && p.pile.length>0));
}

function tripleAlivePlayers(){
  return [1,2,3].filter(n=>tripleIsAlive(n));
}

function triplePlayerByNum(num){ return num===1?p1:num===2?p2:p3; }

function buildGameUI_Triple(){
  document.getElementById('modeChip').textContent='FFA 1v1v1';
  document.getElementById('modeChip').className='mode-chip chip-std';
  document.getElementById('handSection').style.display='none';

  document.getElementById('battlefieldWrap').innerHTML=`
  <div class="triple-zones" id="tripleZonesWrap">
    <div class="triple-zone" id="tz1"><div class="triple-zone-name" id="tz1name">J1</div><div class="triple-zone-card"><div class="triple-zone-cardname" id="tz1card">—</div><div class="triple-zone-hp" id="tz1hp">—</div><div class="triple-zone-hpbar"><div class="triple-zone-hpfill" id="tz1bar" style="width:100%"></div></div><div class="triple-zone-effects" id="tz1effects"></div></div><div class="triple-zone-pile" id="tz1pile">Pila: 0</div></div>
    <div class="triple-zone" id="tz2"><div class="triple-zone-name" id="tz2name">J2</div><div class="triple-zone-card"><div class="triple-zone-cardname" id="tz2card">—</div><div class="triple-zone-hp" id="tz2hp">—</div><div class="triple-zone-hpbar"><div class="triple-zone-hpfill" id="tz2bar" style="width:100%"></div></div><div class="triple-zone-effects" id="tz2effects"></div></div><div class="triple-zone-pile" id="tz2pile">Pila: 0</div></div>
    <div class="triple-zone" id="tz3"><div class="triple-zone-name" id="tz3name">J3</div><div class="triple-zone-card"><div class="triple-zone-cardname" id="tz3card">—</div><div class="triple-zone-hp" id="tz3hp">—</div><div class="triple-zone-hpbar"><div class="triple-zone-hpfill" id="tz3bar" style="width:100%"></div></div><div class="triple-zone-effects" id="tz3effects"></div></div><div class="triple-zone-pile" id="tz3pile">Pila: 0</div></div>
  </div>`;

  document.getElementById('attackPanelWrap').innerHTML=`
  <div id="tripleTargetPanel" class="triple-target-panel" style="display:none">
    <div class="triple-target-title">⚔ ELEGIR OBJETIVO</div>
    <div class="triple-target-btns" id="tripleTargetBtns"></div>
  </div>
  <div class="attack-panel" id="attackPanel">
    <div class="attack-panel-title">ATAQUES — <span id="atkPanelPlayer"></span></div>
    <div class="attacks-row" id="attacksRow"></div>
  </div>`;
}

function renderTripleMode(){
  const cp=triplePlayerByNum(currentPlayer);
  document.getElementById('turnNum').textContent=turnNumber;
  const tp=document.getElementById('turnPlayerEl');
  tp.textContent='Turno de: '+cp.name;
  tp.className='turn-player turn-p'+Math.min(currentPlayer,2); // estilo p1/p2
  const banner=document.getElementById('phaseBanner');
  banner.textContent='TURNO DE '+cp.name.toUpperCase();
  banner.className='phase-banner phase-p'+(currentPlayer===1?'1':'2');

  // En local/bot: el "yo" es el jugador del turno actual; en online: myPlayerNum fijo
  const localMyNum = isOnline ? myPlayerNum : currentPlayer;
  // En botMode local, solo puede interactuar el humano (jugador 1)
  const canInteract = isOnline ? (currentPlayer===myPlayerNum) : (!botMode || currentPlayer===1);

  // Zonas de jugadores
  [1,2,3].forEach(n=>{
    const pl=triplePlayerByNum(n);
    const zone=document.getElementById('tz'+n);
    const alive=tripleIsAlive(n);
    zone.className='triple-zone'+(n===currentPlayer?' active-turn':'')+(n===localMyNum?' mine':'')+(alive?'':' eliminated');
    document.getElementById('tz'+n+'name').textContent=pl.name+(n===localMyNum?' (tú)':'');
    if(pl.active){
      const pct=Math.max(0,pl.active.hp/pl.active.maxHp*100);
      document.getElementById('tz'+n+'card').textContent=pl.active.name;
      document.getElementById('tz'+n+'hp').textContent=Math.max(0,pl.active.hp)+' / '+pl.active.maxHp+' HP';
      const bar=document.getElementById('tz'+n+'bar');
      bar.style.width=pct+'%';
      bar.style.background=pct>60?'var(--green)':pct>25?'var(--orange)':'#e05a5a';
      // Efectos activos (DoT / regen)
      const effEl=document.getElementById('tz'+n+'effects');
      if(effEl){
        effEl.innerHTML='';
        (pl.active.effects||[]).forEach(ef=>{
          const t=document.createElement('span');
          t.className='effect-tag '+(ef.type==='dot'?'effect-dot':'effect-regen');
          t.textContent=(ef.type==='dot'?'☠ ':'♥ ')+ef.name+' ('+(ef.remaining===-1?'∞':ef.remaining)+')';
          effEl.appendChild(t);
        });
      }
    } else {
      document.getElementById('tz'+n+'card').textContent=alive?'Sin carta activa':'— ELIMINADO —';
      document.getElementById('tz'+n+'hp').textContent='';
      document.getElementById('tz'+n+'bar').style.width='0%';
      const effEl=document.getElementById('tz'+n+'effects');
      if(effEl) effEl.innerHTML='';
    }
    document.getElementById('tz'+n+'pile').textContent='Pila: '+(Array.isArray(pl.pile)?pl.pile.length:0);
  });

  // Panel de objetivo + ataques
  const targetPanel=document.getElementById('tripleTargetPanel');
  const me=triplePlayerByNum(localMyNum);

  if(canInteract && !attackUsed && me && me.active){
    // Mostrar selector de objetivo (sin incluirse a sí mismo)
    targetPanel.style.display='block';
    const btns=document.getElementById('tripleTargetBtns');
    btns.innerHTML='';
    [1,2,3].filter(n=>n!==localMyNum && tripleIsAlive(n)).forEach(n=>{
      const pl=triplePlayerByNum(n);
      const btn=document.createElement('button');
      btn.className='triple-target-btn'+(pendingTarget===n?' selected':'');
      btn.textContent='→ '+pl.name+(pl.active?' ('+Math.max(0,pl.active.hp)+' HP)':'');
      btn.onclick=()=>{ pendingTarget=n; renderTripleMode(); };
      btns.appendChild(btn);
    });
  } else {
    targetPanel.style.display='none';
  }

  // Ataques
  const row=document.getElementById('attacksRow');
  const nameEl=document.getElementById('atkPanelPlayer');
  if(!row) return;
  row.innerHTML='';
  if(nameEl) nameEl.textContent=cp.name;
  if(canInteract && me && me.active){
    (me.active.attacks||[]).forEach((atk,i)=>{
      const disabled=attackUsed||pendingTarget===0;
      const btn=buildAtkBtnElement(atk,i,false,disabled);
      btn.onclick=()=>useAttack_Triple(i);
      row.appendChild(btn);
    });
  } else if(cp.active){
    // Turno de otro jugador (online) o bot (local) — botones deshabilitados
    (cp.active.attacks||[]).forEach((atk,i)=>{
      const btn=buildAtkBtnElement(atk,i,false,true);
      row.appendChild(btn);
    });
  } else {
    row.innerHTML='<div style="font-size:12px;color:var(--text-dim)">Sin carta activa</div>';
  }
}

function tripleHandleCardDeath(player){
  // Reemplaza la carta muerta del jugador (estándar, sin mano de 3)
  if(!player.active || player.active.hp>0) return;
  addLog('<b>'+player.active.name+'</b> de '+player.name+' cayó.','log-sys');
  if(Array.isArray(player.pile) && player.pile.length>0){
    const next=player.pile.shift(); next.effects=[]; next.cumulativeUses={};
    player.active=next;
    playSfxCarta();
    addLog(player.name+' invoca a <b>'+next.name+'</b>.','log-sys');
  } else {
    player.active=null;
    addLog(player.name+' fue <b>eliminado</b>.','log-sys');
  }
}

function useAttack_Triple(atkIndex){
  if(attackUsed || !isMyTurn() || pendingTarget===0) return;
  // En local/bot: el attacker es el currentPlayer; en online: myPlayerNum
  const attackerNum = isOnline ? myPlayerNum : currentPlayer;
  const attacker=triplePlayerByNum(attackerNum);
  const defender=triplePlayerByNum(pendingTarget);
  if(!attacker || !attacker.active || !defender || !defender.active) return;
  const atk=(attacker.active.attacks||[])[atkIndex];
  if(!atk) return;
  attackUsed=true;
  resolveAtk_Standard(atk, attacker, defender, atkIndex);
  tripleHandleCardDeath(defender);
  tripleHandleCardDeath(attacker);
  const alive=tripleAlivePlayers();
  if(alive.length===0){
    // Empate: ambos murieron al mismo tiempo (daño propio letal)
    document.getElementById('endTitle').textContent='¡Empate!';
    document.getElementById('endTitle').className='end-title';
    document.getElementById('endSub').textContent='Turno '+turnNumber+'. Ambos jugadores cayeron al mismo tiempo.';
    _humanWon=false; _stopResync(); renderGame(); showEndScreen(); return;
  }
  if(alive.length===1){ endGame_Triple(alive[0]); return; }
  // En bot mode: si el jugador humano murió, fin inmediato
  if(botMode && !tripleIsAlive(1)){
    const titleEl=document.getElementById('endTitle');
    titleEl.textContent='Derrota'; titleEl.className='end-title end-lose';
    document.getElementById('endSub').textContent='Tus cartas cayeron en el turno '+turnNumber+'.';
    _humanWon=false; renderGame(); showEndScreen(); return;
  }
  endTurn_Triple();
}

function endTurn_Triple(){
  // Tick efectos sobre todos los jugadores activos
  for(const n of [1,2,3]){
    const pl=triplePlayerByNum(n);
    if(!pl || !pl.active) continue;
    pl.active.effects=(pl.active.effects||[]).filter(ef=>{
      if(ef.type==='dot'){
        pl.active.hp=Math.max(0,pl.active.hp-ef.value);
        addLog('<b>'+ef.name+'</b> causa '+ef.value+' hp a '+pl.active.name+'.','log-dmg');
      } else if(ef.type==='regen'){
        const h=Math.min(ef.value,pl.active.maxHp-pl.active.hp);
        pl.active.hp=Math.min(pl.active.maxHp,pl.active.hp+ef.value);
        addLog('<b>'+ef.name+'</b> restaura '+h+' hp a '+pl.active.name+'.','log-heal');
      }
      if(ef.remaining!==-1) ef.remaining--;
      return ef.remaining>0||ef.remaining===-1;
    });
    if(pl.active&&pl.active.shieldTurns&&pl.active.shieldTurns!==-1){
      pl.active.shieldTurns--;
      if(pl.active.shieldTurns<=0){delete pl.active.shieldPct;delete pl.active.shieldTurns;}
    }
    if(pl.active && pl.active.hp<=0){
      tripleHandleCardDeath(pl);
    }
  }
  const alive=tripleAlivePlayers();
  if(alive.length===0){
    document.getElementById('endTitle').textContent='¡Empate!';
    document.getElementById('endTitle').className='end-title';
    document.getElementById('endSub').textContent='Turno '+turnNumber+'. Ambos jugadores cayeron al mismo tiempo.';
    _humanWon=false; _stopResync(); renderGame(); showEndScreen(); return;
  }
  if(alive.length===1){ endGame_Triple(alive[0]); return; }

  // Avanzar al siguiente jugador vivo
  // En modo bot: si el jugador humano (p1) murió, terminar inmediatamente
  if(botMode && !tripleIsAlive(1)){
    const remaining=tripleAlivePlayers();
    const winnerNum=remaining[0]||2;
    const titleEl=document.getElementById('endTitle');
    const subEl=document.getElementById('endSub');
    titleEl.textContent='Derrota'; titleEl.className='end-title end-lose';
    subEl.textContent='Tus cartas cayeron en el turno '+turnNumber+'. Los bots sobrevivieron.';
    _humanWon=false; renderGame(); showEndScreen(); return;
  }

  attackUsed=false; pendingTarget=0;
  let next=(currentPlayer%3)+1;
  let tries=0;
  while(!tripleIsAlive(next) && tries<3){ next=(next%3)+1; tries++; }
  currentPlayer=next;
  if(currentPlayer===1) turnNumber++;
  addLog('— Turno '+turnNumber+': '+(triplePlayerByNum(currentPlayer).name||'?')+' —','log-sys');
  sendGameState(); renderGame();
  maybeTriggerBot();
}

function endGame_Triple(winnerNum){
  const winner=triplePlayerByNum(winnerNum);
  const goData={tripleWinner:winnerNum, winnerName:winner?winner.name:'?', turn:turnNumber};
  _pendingGameOver=goData; sendGameState();
  _stopResync(); _startGameOverResend(goData);
  _humanWon = winnerNum===1;
  document.getElementById('endTitle').textContent=(winner&&winner.name?winner.name:'Alguien')+' gana el FFA';
  document.getElementById('endTitle').className='end-title end-win end-win-glow';
  document.getElementById('endSub').textContent='Los demás retadores cayeron en el turno '+turnNumber+'.';
  renderGame();
  showEndScreen();
  // Solo en FFA vs bots (botMode=true)
  if(botMode && !isOnline){
    var _ffaWon = winnerNum === 1;
    _trackMatch({ won:_ffaWon, lost:!_ffaWon, myKOs:p1?p1.kills||0:0, mode:'ffa' });
  }
}

/* ── Forzar modo triple en lobby ── */
function forceTripleMode(){
  onlineGameMode='triple';
  onlinePlayerCount=3;
  // Mostrar banner
  const banner=document.getElementById('tripleJoinedBanner');
  if(banner) banner.style.display='block';
  // Ocultar selectors de modo y jefe
  const ms=document.getElementById('onlineModeSelector');
  const bs=document.getElementById('onlineBossSelector');
  const md=document.getElementById('onlineModeDisplay');
  if(ms) ms.style.display='none';
  if(bs) bs.style.display='none';
  if(md){
    md.style.display='block';
    const t=document.getElementById('onlineModeDisplayText');
    if(t) t.textContent='FFA 1v1v1 — Todos contra todos';
  }
}

function _showHostClosedToast(){
  var t = document.createElement('div');
  t.textContent = 'El anfitrión cerró la sala.';
  t.style.cssText = 'position:fixed;bottom:2rem;left:50%;transform:translateX(-50%);background:#2a1a1a;color:#e08080;border:1px solid #e08080;padding:.6rem 1.4rem;border-radius:8px;font-size:.9rem;z-index:9999;pointer-events:none;';
  document.body.appendChild(t);
  setTimeout(function(){ t.remove(); }, 3000);
}

function leaveOnlineLobby(){
  if(_fbRoomRef && isOnline){
    if(myPlayerNum !== 1) _fbSend({type:'player_left', playerNum: myPlayerNum});
  }
  isOnline=false; _fbDisconnect();
  showScreen('titleScreen');
}

function confirmAbandon(){
  var m = document.getElementById('abandonModal');
  var btnLobby = document.getElementById('abandonModalBtnLobby');
  var btnLeave = document.getElementById('abandonModalBtnLeave');
  var desc = document.getElementById('abandonModalDesc');
  if(tutGameMode || _tutGameSession){
    btnLobby.hidden = true;
    btnLeave.textContent = 'Salir del tutorial';
    btnLeave.onclick = function(){ m.style.display='none'; exitInGameTutorial(); };
    desc.textContent = 'El progreso del tutorial no se guarda.';
    document.getElementById('abandonModalTitle').textContent = '¿Abandonar el tutorial?';
    m.style.display = 'flex';
    return;
  }
  if(isOnline && myPlayerNum === 1){
    // Anfitrión online: puede ir al lobby o salir directamente
    btnLobby.hidden = false;
    btnLeave.textContent = 'Salir al menú principal';
    desc.textContent = 'La partida online se cancelará. El rival contará como victoria.';
  } else {
    btnLobby.hidden = true;
    btnLeave.textContent = 'Abandonar partida';
    desc.textContent = isOnline ? 'Se contará como derrota para ti.' : 'Se perderá la partida actual.';
  }
  m.style.display = 'flex';
}
function _sendForfeit(){
  if(isOnline && _fbRoomRef){
    _fbSend({ type:'forfeit', playerNum: myPlayerNum });
  }
}
function _sendPlayerLeft(){
  if(isOnline && _fbRoomRef){
    _fbSend({ type: myPlayerNum === 1 ? 'forfeit' : 'player_left', playerNum: myPlayerNum });
  }
}
function _doAbandon(){
  document.getElementById('abandonModal').style.display='none';
  _caosActive=false; _caosEffect=null; _caosShieldDefender=null;
  _renderCaosBanner();
  _stopConnListener();
  // Limpiar estado pendiente de Liga para que la siguiente partida no active el flujo de Liga
  if(typeof ligaState !== 'undefined' && ligaState){
    ligaState._pendingLeagueMatch = null;
    ligaState._pendingKnockout    = null;
  }
  if(isOnline){
    _sendPlayerLeft();
    setTimeout(function(){ isOnline=false; _fbDisconnect(); showScreen('titleScreen'); }, 400);
  } else {
    showScreen('titleScreen');
  }
}
function _doAbandonToLobby(){
  document.getElementById('abandonModal').style.display='none';
  // No desconectar — mantener la sala abierta y notificar al guest
  if(_fbRoomRef) _fbSend({type:'reset_lobby'});
  doResetToLobby('host');
}
function _showExitAppModal(){
  document.getElementById('exitAppModal').style.display='flex';
}
function _doExitApp(){
  // Capacitor (Android)
  if(window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.App){
    window.Capacitor.Plugins.App.exitApp();
    return;
  }
  // Electron (desktop)
  if(window.require){
    try{ window.require('electron').remote.app.quit(); return; }catch(e){}
    try{ window.require('@electron/remote').app.quit(); return; }catch(e){}
  }
  // Navegador: cierra la pestaña si fue abierta por script, si no muestra aviso
  window.close();
}


/* ═══════════════════════════════════════════════
   LAUNCH MODE → BUILD SETUP
═══════════════════════════════════════════════ */
function launchMode(mode){ botMode=false; bossLocal2v1=false; if(mode==='rapido'){gameMode='rapido';_launchRapido();return;} _caosActive=(mode==='caos'); _launchSetup(mode==='draft'?'standard':mode); document.getElementById('setupBackBtn').onclick=()=>showScreen('singlePlayerScreen'); }
function launchBotMode(mode){ botMode=true; bossLocal2v1=false; if(mode==='rapido'){gameMode='rapido';_launchRapido();return;} _caosActive=(mode==='caos'); _launchSetup(mode==='draft'?'standard':mode); document.getElementById('setupBackBtn').onclick=()=>showScreen('botModeScreen'); }

function _launchRapido(){
  turnNumber=1; attackUsed=false; isOnline=false; logEntries=[];
  document.getElementById('logWrap').innerHTML='';
  const makeRP=(num,nameVal)=>{
    // Jugador humano: solo cartas desbloqueadas. Bot: puede usar cualquiera
    const isBot = botMode && num===2;
    const pool = isBot ? CARD_POOL : CARD_POOL.filter(c=>_isCardUnlocked(c.id));
    const cards=shuffle([...pool]).slice(0,3).map(c=>makeCard(c));
    const active=cards.shift();
    return {num, name:nameVal, active, pile:cards, kills:0};
  };
  p1=makeRP(1, _loadP1Name()||( botMode?'Jugador':'Jugador 1'));
  p2=makeRP(2, botMode?'Bot':(_loadP2Name()||'Jugador 2'));
  currentPlayer=1;
  buildGameUI_Standard();
  showScreen('gameScreen');
  addLog('⚡ ¡Duelo Rápido! '+p1.name+' vs '+p2.name+' — 3 cartas al azar.','log-sys');
  showRoulette([
    {num:1,name:p1.name,color:ROUL_COLORS[0]},
    {num:2,name:p2.name,color:ROUL_COLORS[1]}
  ], startNum=>{
    currentPlayer=startNum;
    if(_caosActive){ _rollCaosEffect(); addLog('🎲 Efecto del turno: <b>'+_caosEffectLabel(_caosEffect)+'</b>.','log-sys'); }
    addLog('— Turno 1: '+(startNum===1?p1:p2).name+' comienza —','log-sys');
    renderGame(); maybeTriggerBot();
  });
}
function showBotModeScreen(){ botMode=true; showScreen('botModeScreen'); }

function _resetModSelection(){
  draftMode = false;
  _botModSel = 'standard';
  _localModSel = 'standard';
  // Resetear botones activos a "Sin modificadores"
  ['botModRow','localModRow'].forEach(function(rowId){
    var row = document.getElementById(rowId);
    if(!row) return;
    row.querySelectorAll('.mod-btn').forEach(function(b){ b.classList.remove('active'); });
    var def = row.querySelector('.mod-btn[data-mod="standard"]');
    if(def) def.classList.add('active');
  });
}

var _botModSel = 'standard';
var _localModSel = 'standard';
function selectMod(ctx, btn, mode){
  if(ctx==='bot'){ _botModSel=mode; document.querySelectorAll('#botModRow .mod-btn').forEach(b=>b.classList.remove('active')); }
  else { _localModSel=mode; document.querySelectorAll('#localModRow .mod-btn').forEach(b=>b.classList.remove('active')); }
  btn.classList.add('active');
  draftMode = (mode==='draft');
  const noteId = ctx==='bot' ? 'botModNote' : 'localModNote';
  const note = document.getElementById(noteId);
  if(note) note.style.display = mode==='rapido' ? 'block' : 'none';
}

function _launchSetup(mode){
  gameMode = mode;
  p1sel=[]; p2sel=[]; p3sel=[]; chalSel=[];

  const grid    = document.getElementById('setupGrid');
  const header  = document.getElementById('setupHeader');
  const badge   = document.getElementById('modifierBadge');
  const startBtn= document.getElementById('startBtn');
  startBtn.disabled = true;
  startBtn.textContent = 'Comenzar ▶';
  badge.style.display = 'none';

  if(mode === 'boss'){
    header.textContent = 'MODO JEFE — PREPARAR PARTIDA';
    grid.className = 'setup-grid single';
    grid.innerHTML = buildBossSetup();
    startBtn.className = 'btn btn-boss';
  } else if(mode === 'triple'){
    header.textContent = botMode ? 'FFA VS 2 BOTS — TU MAZO' : 'FFA 1v1v1 — PREPARAR PARTIDA';
    grid.className = botMode ? 'setup-grid single' : 'setup-grid';
    grid.innerHTML = buildTripleSetup();
    startBtn.className = 'btn btn-primary';
    badge.textContent='✦ MODIFICADOR ACTIVO: FFA 1v1v1';
    badge.style.cssText='display:inline-flex;background:#1a0a0a;border:.5px solid #f76e6e;color:#f76e6e;';
  } else if(mode === 'espejo'){
    header.textContent = botMode ? 'MODO ESPEJO — VS BOT' : 'MODO ESPEJO — PREPARAR PARTIDA';
    grid.className = 'setup-grid';
    grid.innerHTML = buildEspejoSetup();
    startBtn.className = 'btn btn-primary';
    badge.textContent='✦ MODIFICADOR ACTIVO: ESPEJO';
    badge.style.cssText='display:inline-flex;background:#04131a;border:.5px solid #4dc9f6;color:#4dc9f6;';
  } else if(mode === 'caos'){
    header.textContent = botMode ? 'MODO CAOS — VS BOT' : 'MODO CAOS — PREPARAR PARTIDA';
    grid.className = botMode ? 'setup-grid single' : 'setup-grid';
    grid.innerHTML = buildStdSetup();
    startBtn.className = 'btn btn-primary';
    badge.textContent = '✦ MODIFICADOR ACTIVO: CAOS';
    badge.style.cssText = 'display:inline-flex;background:#1a0a1a;border:.5px solid #c77dff;color:#c77dff;';
  } else if(mode === 'endless'){
    header.textContent = 'SUPERVIVENCIA — PREPARAR MAZO';
    grid.className = 'setup-grid single';
    grid.innerHTML = buildStdSetup();
    startBtn.className = 'btn btn-primary';
    badge.textContent = '∞ MODO: SUPERVIVENCIA ENDLESS';
    badge.style.cssText = 'display:inline-flex;background:#1a0505;border:.5px solid #f76e6e;color:#f76e6e;';
  } else {
    const label = mode==='hand3' ? 'MANO DE 3' : 'PARTIDA ESTÁNDAR';
    header.textContent = label + (botMode ? ' — VS BOT' : ' — PREPARAR PARTIDA');
    if(mode==='hand3'){
      badge.textContent='✦ MODIFICADOR ACTIVO: MANO DE 3';
      badge.style.cssText='display:inline-flex;background:#0a140a;border:.5px solid var(--green);color:#7affaa;';
    }
    grid.className = botMode ? 'setup-grid single' : 'setup-grid';
    grid.innerHTML = buildStdSetup();
    startBtn.className = 'btn btn-primary';
  }

  buildDeckPickers();
  _applyDraftSetupState();
  showScreen('setupScreen');
}


function _applyDraftSetupState(){
  var startBtn = document.getElementById('startBtn');
  document.querySelectorAll('.player-setup').forEach(function(panel){
    if(draftMode){
      // Overlay sobre el deck-preview
      panel.querySelectorAll('.deck-preview').forEach(function(dp){
        if(!dp.querySelector('.draft-deck-overlay')){
          var o = document.createElement('div');
          o.className = 'draft-deck-overlay';
          o.innerHTML = '<span>Las cartas se elegirán<br>en el Draft</span>';
          dp.style.position = 'relative';
          dp.appendChild(o);
        }
      });
      panel.querySelectorAll('.mini-card').forEach(function(mc){ mc.style.pointerEvents='none'; mc.style.opacity='0.3'; });
      panel.querySelectorAll('.btn-sm').forEach(function(b){ b.style.display='none'; });
      // Bloquear barra de mazos guardados
      panel.querySelectorAll('.loadout-bar,.deck-loadout-row,.loadout-row,[id^="loadout"]').forEach(function(el){ el.style.pointerEvents='none'; el.style.opacity='0.35'; });
    } else {
      panel.querySelectorAll('.draft-deck-overlay').forEach(function(o){ o.remove(); });
      panel.querySelectorAll('.mini-card').forEach(function(mc){ mc.style.pointerEvents=''; mc.style.opacity=''; });
      panel.querySelectorAll('.btn-sm').forEach(function(b){ b.style.display=''; });
      panel.querySelectorAll('.loadout-bar,.deck-loadout-row,.loadout-row,[id^="loadout"]').forEach(function(el){ el.style.pointerEvents=''; el.style.opacity=''; });
    }
  });
  if(startBtn){
    if(draftMode){ startBtn.disabled=false; startBtn.textContent='Draft ▶'; }
    else          { startBtn.textContent='Comenzar ▶'; updateDeckCount(1); }
  }
  // Badge de modificador activo
  var badge = document.getElementById('modifierBadge');
  if(badge && draftMode){
    badge.textContent = '⚔ MODIFICADOR ACTIVO: DRAFT';
    badge.style.cssText = 'display:inline-flex;background:#1a0f04;border:.5px solid #ff9e4f;color:#ff9e4f;';
  }
}

function buildBossSetup(){
  return `
  <div class="player-setup boss-panel" style="max-width:420px;margin:0 auto">
    <h2 class="boss-hdr">★ El Jefe — ${BOSS_CARD.name}</h2>
    <div class="boss-preview">
      <div class="boss-preview-name">👁 ${BOSS_CARD.name}</div>
      <div class="boss-preview-sub" id="chalBossHpSub">1000 HP · ★×10 · Legendario</div>
      <div class="boss-preview-desc">${BOSS_CARD.flavor}</div>
      ${BOSS_CARD.attacks.map(a=>'<div class="boss-preview-atk">'+a.name+' — '+a.description+'</div>').join('')}
    </div>
    <h2 class="p1-hdr" style="margin-top:1rem;margin-bottom:1rem">Retador <span style="font-weight:400;color:var(--text);font-size:13px;letter-spacing:.04em">— ${_loadP1Name()||'Retador'}</span></h2>
    <input type="text" id="chalNameInput" style="display:none" value="${_loadP1Name()||'Retador'}" maxlength="18">
    <div class="deck-size-row">
      <label>Cartas en pila:</label>
      <input type="range" min="6" max="8" value="6" step="1" id="chalSize" oninput="updateDeckSize('chal')">
      <span class="deck-size-val" id="chalSizeVal">6</span>
    </div>
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px">
      <span style="font-size:11px;color:var(--text-muted)">Selecciona las cartas:</span>
      <button class="btn btn-sm" style="border-color:var(--purple);color:#c4b0ff" onclick="randomDeck('chal')">⚄ Aleatorio</button>
    </div>
    <div class="deck-preview" id="chalDeck"></div>
    <div class="deck-count" id="chalDeckCount">0 / 6 seleccionadas</div>
  </div>`;
}

function buildBoss2v1Setup(){
  return `
  <div class="player-setup boss-panel" style="max-width:420px;margin:0 auto">
    <h2 class="boss-hdr">★ El Jefe — ${BOSS_CARD.name}</h2>
    <div class="boss-preview">
      <div class="boss-preview-name">👁 ${BOSS_CARD.name}</div>
      <div class="boss-preview-sub">2000 HP · Legendario · IA automática</div>
      <div class="boss-preview-desc">${BOSS_CARD.flavor}</div>
      ${BOSS_CARD.attacks.map(a=>'<div class="boss-preview-atk">'+a.name+' — '+a.description+'</div>').join('')}
    </div>
  </div>
  <div class="player-setup">
    <h2 class="p1-hdr">Retador 1</h2>
    <div style="margin-bottom:1rem"><label class="field-label">Nombre</label>
      <input type="text" id="p1name" value="Retador 1" maxlength="18"></div>
    <div class="deck-size-row"><label>Cartas en pila:</label>
      <input type="range" min="6" max="8" value="6" step="1" id="p1size" oninput="updateDeckSize(1)">
      <span class="deck-size-val" id="p1sizeVal">6</span></div>
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px">
      <span style="font-size:11px;color:var(--text-muted)">Selecciona las cartas:</span>
      <button class="btn btn-sm btn-p1" onclick="randomDeck(1)">⚄ Aleatorio</button></div>
    <div class="deck-preview" id="p1deck"></div>
    <div class="deck-count" id="p1deckCount">0 / 6 seleccionadas</div>
  </div>
  <div class="player-setup">
    <h2 class="p2-hdr">Retador 2</h2>
    <div style="margin-bottom:1rem"><label class="field-label">Nombre</label>
      <input type="text" id="p2name" value="${_loadP2Name()||'Retador 2'}" maxlength="18" oninput="_saveP2Name(this.value)"></div>
    <div class="deck-size-row"><label>Cartas en pila:</label>
      <input type="range" min="6" max="8" value="6" step="1" id="p2size" oninput="updateDeckSize(2)">
      <span class="deck-size-val" id="p2sizeVal">6</span></div>
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px">
      <span style="font-size:11px;color:var(--text-muted)">Selecciona las cartas:</span>
      <button class="btn btn-sm btn-p2" onclick="randomDeck(2)">⚄ Aleatorio</button></div>
    <div class="deck-preview" id="p2deck"></div>
    <div class="deck-count" id="p2deckCount">0 / 6 seleccionadas</div>
  </div>`;
}

function launchLocalBoss2v1(){
  botMode=false; bossLocal2v1=true; gameMode='boss';
  p1sel=[]; p2sel=[];
  document.getElementById('setupHeader').textContent='2v1 — '+BOSS_CARD.name.toUpperCase();
  document.getElementById('modifierBadge').style.display='none';
  document.getElementById('setupGrid').innerHTML=buildBoss2v1Setup();
  document.getElementById('setupBackBtn').onclick=()=>{ bossLocal2v1=false; showScreen('singlePlayerScreen'); };
  buildDeckPickers();
  checkStartReady();
  showScreen('setupScreen');
}

function buildStdSetup(){
  const p2section = botMode ? `
  <div class="player-setup" style="opacity:.55;pointer-events:none">
    <h2 class="p2-hdr">🤖 Bot <span style="font-size:11px;font-weight:400;color:var(--text-muted)">— mazo aleatorio al empezar</span></h2>
    <div style="padding:1rem;text-align:center;color:var(--text-dim);font-size:13px">El bot elige sus cartas al azar automáticamente.</div>
  </div>` : `
  <div class="player-setup">
    <h2 class="p2-hdr">Jugador 2</h2>
    <div style="margin-bottom:1rem"><label class="field-label">Nombre</label>
      <input type="text" id="p2name" value="${_loadP2Name()||'Jugador 2'}" maxlength="18" oninput="_saveP2Name(this.value)"></div>
    <div class="deck-size-row"><label>Cartas en pila:</label>
      <input type="range" min="6" max="8" value="6" step="1" id="p2size" oninput="updateDeckSize(2)">
      <span class="deck-size-val" id="p2sizeVal">6</span></div>
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px">
      <span style="font-size:11px;color:var(--text-muted)">Selecciona las cartas:</span>
      <button class="btn btn-sm btn-p2" onclick="randomDeck(2)">⚄ Aleatorio</button></div>
    <div class="deck-preview" id="p2deck"></div>
    <div class="deck-count" id="p2deckCount">0 / 6 seleccionadas</div>
  </div>`;
  return `
  <div class="player-setup">
    <h2 class="p1-hdr" style="margin-bottom:1rem">${botMode?'Tú':'Jugador 1'} <span style="font-weight:400;color:var(--text);font-size:13px;letter-spacing:.04em">— ${_loadP1Name()||'Jugador'}</span></h2>
    <div class="deck-size-row"><label>Cartas en pila:</label>
      <input type="range" min="6" max="8" value="6" step="1" id="p1size" oninput="updateDeckSize(1)">
      <span class="deck-size-val" id="p1sizeVal">6</span></div>
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px">
      <span style="font-size:11px;color:var(--text-muted)">Selecciona las cartas:</span>
      <button class="btn btn-sm btn-p1" onclick="randomDeck(1)">⚄ Aleatorio</button></div>
    <div class="deck-preview" id="p1deck"></div>
    <div class="deck-count" id="p1deckCount">0 / 6 seleccionadas</div>
  </div>
  ${p2section}`;
}

function buildTripleSetup(){
  if(botMode) return buildStdSetup(); // en modo bot, solo p1 configura (p2/p3 son bots)
  return `
  ${buildStdSetup()}
  <div class="player-setup" style="grid-column:1/-1;max-width:420px;margin:0 auto;width:100%">
    <h2 class="p1-hdr" style="color:var(--purple)">Jugador 3</h2>
    <div style="margin-bottom:1rem"><label class="field-label">Nombre</label>
      <input type="text" id="p3name" value="Jugador 3" maxlength="18"></div>
    <div class="deck-size-row"><label>Cartas en pila:</label>
      <input type="range" min="6" max="8" value="6" step="1" id="p3size" oninput="updateDeckSize(3)">
      <span class="deck-size-val" id="p3sizeVal">6</span></div>
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px">
      <span style="font-size:11px;color:var(--text-muted)">Selecciona las cartas:</span>
      <button class="btn btn-sm" style="border-color:var(--purple);color:#c4b0ff" onclick="randomDeck(3)">⚄ Aleatorio</button></div>
    <div class="deck-preview" id="p3deck"></div>
    <div class="deck-count" id="p3deckCount">0 / 6 seleccionadas</div>
  </div>`;
}

function buildEspejoSetup(){
  const p2section = botMode ? `
  <div class="player-setup" style="opacity:.55;pointer-events:none">
    <h2 class="p2-hdr">🤖 Bot <span style="font-size:11px;font-weight:400;color:var(--text-muted)">— usará el mismo mazo</span></h2>
    <div style="padding:1rem;text-align:center;color:var(--text-dim);font-size:13px">Recibirá el mismo mazo en orden aleatorio.</div>
  </div>` : `
  <div class="player-setup">
    <h2 class="p2-hdr">Jugador 2</h2>
    <div style="margin-bottom:1rem"><label class="field-label">Nombre</label>
      <input type="text" id="p2name" value="${_loadP2Name()||'Jugador 2'}" maxlength="18" oninput="_saveP2Name(this.value)"></div>
    <div style="padding:.85rem 1rem;text-align:center;color:#4dc9f6;font-size:12px;background:rgba(77,201,246,.06);border-radius:8px;border:.5px solid rgba(77,201,246,.3)">🔁 Recibirá el mismo mazo que Jugador 1, barajado al azar</div>
  </div>`;
  return `
  <div class="player-setup">
    <h2 class="p1-hdr" style="margin-bottom:1rem">${botMode?'Tú':'Jugador 1'} <span style="font-weight:400;color:var(--text);font-size:13px;letter-spacing:.04em">— ${_loadP1Name()||'Jugador'}</span></h2>
    <div class="deck-size-row"><label>Cartas en pila:</label>
      <input type="range" min="6" max="8" value="6" step="1" id="p1size" oninput="updateDeckSize(1)">
      <span class="deck-size-val" id="p1sizeVal">6</span></div>
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px">
      <span style="font-size:11px;color:var(--text-muted)">Mazo compartido:</span>
      <button class="btn btn-sm" style="border-color:#4dc9f6;color:#4dc9f6" onclick="randomDeck(1)">⚄ Aleatorio</button></div>
    <div class="deck-preview" id="p1deck"></div>
    <div class="deck-count" id="p1deckCount">0 / 6 seleccionadas</div>
  </div>
  ${p2section}`;
}

/* ═══════════════════════════════════════════════
   DECK PICKERS
═══════════════════════════════════════════════ */
function buildDeckPickers(){
  if(gameMode === 'boss' && bossLocal2v1){
    buildPicker(1, 'p1deck'); buildPicker(2, 'p2deck');
  } else if(gameMode === 'boss'){
    buildPicker('chal', 'chalDeck');
  } else if(gameMode === 'triple' && !botMode){
    buildPicker(1, 'p1deck'); buildPicker(2, 'p2deck'); buildPicker(3, 'p3deck');
  } else if(gameMode === 'espejo'){
    buildPicker(1, 'p1deck');
  } else {
    buildPicker(1, 'p1deck');
    if(!botMode) buildPicker(2, 'p2deck');
  }
  if(typeof _renderDeckLoadouts === 'function') _renderDeckLoadouts();
}

function buildPicker(player, containerId){
  const container = document.getElementById(containerId);
  if(!container) return;
  container.innerHTML = '';
  CARD_POOL.forEach(card=>{
    const isUnlocked = _isCardUnlocked(card.id);
    const d = document.createElement('div');
    d.className = 'mini-card' + (isUnlocked ? '' : ' mini-card-locked');
    d.dataset.id = card.id;
    var infoBtn = '<button class="mini-card-info" title="Ver carta" onclick="event.stopPropagation();openCardPreview('+card.id+','+JSON.stringify(player)+')">ⓘ</button>';
    if(isUnlocked){
      d.innerHTML = '<div class="mini-card-name">'+card.name+'</div><div class="mini-card-hp"><span class="mini-card-hp-txt">'+card.hp+' hp · '+card.stars+'★</span>'+infoBtn+'</div>';
      d.onclick = ()=>toggleCard(player, card.id, d);
    } else {
      var isStoreCard = _STORE_CARD_IDS.indexOf(card.id) !== -1;
      var lockLabel = isStoreCard ? 'Tienda' : 'Logro';
      var lockTitle = isStoreCard ? 'Desbloquea esta carta en la Tienda' : 'Desbloquea esta carta con logros';
      d.innerHTML = '<div class="mini-card-name">🔒 '+card.name+'</div><div class="mini-card-hp"><span class="mini-card-hp-txt">'+lockLabel+' · '+card.stars+'★</span>'+infoBtn+'</div>';
      d.title = lockTitle;
    }
    container.appendChild(d);
  });
}

function getSel(player){ return player===1?p1sel:player===2?p2sel:player===3?p3sel:chalSel; }
function setSel(player, arr){ if(player===1)p1sel=arr; else if(player===2)p2sel=arr; else if(player===3)p3sel=arr; else chalSel=arr; }

function getRarityCount(sel, rarity){
  return sel.filter(id=>{ const c=CARD_POOL.find(c=>c.id===id); return c&&c.rarity===rarity; }).length;
}

function toggleCard(player, cardId, el){
  if(!_isCardUnlocked(cardId)) return; // carta bloqueada, no se puede seleccionar
  const sel = getSel(player);
  const sizeId = player===1?'p1size':player===2?'p2size':'chalSize';
  const maxSize = parseInt(document.getElementById(sizeId).value);
  const idx = sel.indexOf(cardId);
  if(idx>=0){ sel.splice(idx,1); el.classList.remove('selected'); }
  else {
    if(sel.length>=maxSize){ flashCount(player); return; }
    const card = CARD_POOL.find(c=>c.id===cardId);
    const limit = RARITY_LIMITS[card.rarity]??Infinity;
    if(getRarityCount(sel,card.rarity)>=limit){ flashRarityLimit(player,card.rarity,limit); return; }
    sel.push(cardId); el.classList.add('selected');
  }
  updateDeckCount(player);
}

function flashCount(player){
  const countId = player===1?'p1deckCount':player===2?'p2deckCount':'chalDeckCount';
  const el = document.getElementById(countId);
  if(!el) return;
  el.style.color='#e08080';setTimeout(()=>el.style.color='',700);
}

function flashRarityLimit(player, rarity, limit){
  const countId = player===1?'p1deckCount':player===2?'p2deckCount':'chalDeckCount';
  const el = document.getElementById(countId);
  if(!el) return;
  const orig = el.textContent;
  el.textContent='¡Límite '+rarity+': máx. '+limit+'!';
  el.style.color='#e08080';
  setTimeout(()=>{ el.style.color=''; updateDeckCount(player); },1800);
}

function updateDeckSize(player){
  const sizeId = player===1?'p1size':player===2?'p2size':player===3?'p3size':'chalSize';
  const valId  = player===1?'p1sizeVal':player===2?'p2sizeVal':player===3?'p3sizeVal':'chalSizeVal';
  const val = document.getElementById(sizeId).value;
  document.getElementById(valId).textContent = val;
  // Actualizar preview de vida del jefe si es modo boss 1v1
  if(player==='chal'){
    const n = parseInt(val);
    const hp = n>=8?1500:n>=7?1250:1000;
    const sub = document.getElementById('chalBossHpSub');
    if(sub) sub.textContent = hp+' HP · ★×10 · Legendario';
  }
  const sel = getSel(player);
  const maxSize = parseInt(val);
  while(sel.length>maxSize){
    const removed = sel.pop();
    const deckId = player===1?'p1deck':player===2?'p2deck':player===3?'p3deck':'chalDeck';
    const el = document.querySelector('#'+deckId+' [data-id="'+removed+'"]');
    if(el) el.classList.remove('selected');
  }
  updateDeckCount(player);
}

function updateDeckCount(player){
  const sel = getSel(player);
  const sizeId = player===1?'p1size':player===2?'p2size':player===3?'p3size':'chalSize';
  const countId= player===1?'p1deckCount':player===2?'p2deckCount':player===3?'p3deckCount':'chalDeckCount';
  const maxSize = parseInt(document.getElementById(sizeId).value);
  const el = document.getElementById(countId);
  if(el) el.textContent = sel.length+' / '+maxSize+' seleccionadas';
  checkStartReady();
  if(player===1 && typeof _updateLoadoutSaveBtn === 'function') _updateLoadoutSaveBtn();
}

function checkStartReady(){
  let ready = false;
  if(gameMode==='boss' && bossLocal2v1){
    const m1 = parseInt((document.getElementById('p1size')||{}).value||6);
    const m2 = parseInt((document.getElementById('p2size')||{}).value||6);
    ready = p1sel.length===m1 && p2sel.length===m2;
  } else if(gameMode==='boss'){
    const max = parseInt((document.getElementById('chalSize')||{}).value||6);
    ready = chalSel.length===max;
  } else if(botMode){
    // En modo bot solo necesita p1 listo
    const m1 = parseInt((document.getElementById('p1size')||{}).value||6);
    ready = p1sel.length===m1;
  } else if(gameMode==='triple'){
    const m1 = parseInt((document.getElementById('p1size')||{}).value||6);
    const m2 = parseInt((document.getElementById('p2size')||{}).value||6);
    const m3 = parseInt((document.getElementById('p3size')||{}).value||6);
    ready = p1sel.length===m1 && p2sel.length===m2 && p3sel.length===m3;
  } else if(gameMode==='espejo'){
    const m1 = parseInt((document.getElementById('p1size')||{}).value||6);
    ready = p1sel.length===m1;
  } else {
    const m1 = parseInt((document.getElementById('p1size')||{}).value||6);
    const m2 = parseInt((document.getElementById('p2size')||{}).value||6);
    ready = p1sel.length===m1 && p2sel.length===m2;
  }
  document.getElementById('startBtn').disabled = !ready;
}

function randomDeck(player){
  const sizeId = player===1?'p1size':player===2?'p2size':player===3?'p3size':'chalSize';
  const deckId = player===1?'p1deck':player===2?'p2deck':player===3?'p3deck':'chalDeck';
  const maxSize = parseInt(document.getElementById(sizeId).value);
  const sel = getSel(player);
  sel.length = 0;
  document.querySelectorAll('#'+deckId+' .mini-card').forEach(el=>el.classList.remove('selected'));
  const rarityCounts = {};
  const shuffled = shuffle(CARD_POOL.filter(c=>_isCardUnlocked(c.id)));
  for(const card of shuffled){
    if(sel.length>=maxSize) break;
    const limit = RARITY_LIMITS[card.rarity]??Infinity;
    const count = rarityCounts[card.rarity]||0;
    if(count<limit){ sel.push(card.id); rarityCounts[card.rarity]=count+1; }
  }
  sel.forEach(id=>{
    if(!_isCardUnlocked(id)) return; // seguridad extra
    const el = document.querySelector('#'+deckId+' [data-id="'+id+'"]');
    if(el) el.classList.add('selected');
  });
  updateDeckCount(player);
}

/* ═══════════════════════════════════════════════
   HELPERS
═══════════════════════════════════════════════ */
function deepClone(obj){ return JSON.parse(JSON.stringify(obj)); }
function shuffle(arr){ for(let i=arr.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[arr[i],arr[j]]=[arr[j],arr[i]]}return arr; }

function makeCard(cardData){
  const c = deepClone(cardData);
  c.effects=[]; c.cumulativeUses={};
  return c;
}

