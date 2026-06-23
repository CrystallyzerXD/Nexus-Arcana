/* ═══════════════════════════════════════════════
   ONLINE MULTIPLAYER
═══════════════════════════════════════════════ */

function isMyTurn(){
  if(!isOnline) return true;
  return currentPlayer === myPlayerNum;
}

/* ── Serialización compacta: solo lo que cambia ── */
function packCard(card){
  if(!card) return null;
  return {
    id: card.id,
    hp: card.hp,
    mhp: card.maxHp,
    fx: (card.effects||[]).map(e=>({t:e.type,n:e.name,v:e.value,r:e.remaining})),
    cu: card.cumulativeUses||{},
    sp: card.shieldPct||0,
    st: card.shieldTurns||0
  };
}

function unpackCard(pc){
  if(!pc) return null;
  const base = deepClone(CARD_POOL.find(c=>c.id===pc.id));
  if(!base) return null;
  base.hp = pc.hp; base.maxHp = pc.mhp;
  base.effects = (pc.fx||[]).map(e=>({type:e.t,name:e.n,value:e.v,remaining:e.r}));
  base.cumulativeUses = pc.cu||{};
  if(pc.sp) base.shieldPct  = pc.sp;
  if(pc.st) base.shieldTurns= pc.st;
  return base;
}

function packPlayer(p){
  const r={ num:p.num, name:p.name, active:packCard(p.active), pids:p.pile.map(c=>c.id) };
  if(p.hand)        r.hids=p.hand.map(c=>c.id);
  if(p.needsToPlay) r.ntp=1;
  if(p._invokeOnly) r.io=1;   // para mano-de-3: indica que este jugador solo debe invocar y devolver el turno
  if(p._didAttack)  r.da=1;   // para mano-de-3: indica que ya atacó antes de que su carta muriera
  return r;
}

function unpackPlayer(pp){
  const pl={
    num: pp.num, name: pp.name,
    active: unpackCard(pp.active),
    pile: (pp.pids||[]).map(id=>{ const c=deepClone(CARD_POOL.find(x=>x.id===id)); c.effects=[];c.cumulativeUses={}; return c; })
  };
  if(pp.hids) pl.hand=pp.hids.map(id=>{ const c=deepClone(CARD_POOL.find(x=>x.id===id)); c.effects=[];c.cumulativeUses={}; return c; });
  else pl.hand=[];
  if(pp.ntp) pl.needsToPlay=true; else pl.needsToPlay=false;
  if(pp.io)  pl._invokeOnly=true;
  if(pp.da)  pl._didAttack=true;
  return pl;
}

function packBossCard(c){
  if(!c) return null;
  return { hp:c.hp, mhp:c.maxHp, fx:(c.effects||[]).map(e=>({t:e.type,n:e.name,v:e.value,r:e.remaining})), cu:c.cumulativeUses||{} };
}
function unpackBossCard(pb){
  if(!pb) return null;
  const base=makeCard(BOSS_CARD);
  base.hp=pb.hp; base.maxHp=pb.mhp||base.maxHp;
  base.effects=(pb.fx||[]).map(e=>({type:e.t,name:e.n,value:e.v,remaining:e.r}));
  base.cumulativeUses=pb.cu||{};
  return base;
}

// Estado de fin de partida persistente: se reenvía cada 2s hasta que el rival confirme
let _pendingGameOver = null;  // flag one-shot para el próximo sendGameState
let _gameOverResend  = null;  // datos guardados para reenvío hasta confirmación
let _gameOverTimer   = null;  // intervalo de reenvío

function _startGameOverResend(goData){
  _gameOverResend = goData;
  if(_gameOverTimer) clearInterval(_gameOverTimer);
  _gameOverTimer = setInterval(()=>{
    if(!isOnline || !_fbRoomRef){ _clearGameOverResend(); return; }
    // Parar si ya no estamos en la pantalla de juego (e.g. ya se mostró el fin)
    if(!document.getElementById('gameScreen').classList.contains('active')){ _clearGameOverResend(); return; }
    _pendingGameOver = {..._gameOverResend};
    sendGameState(true);  // resync: no incrementar seq en reenvíos de game-over
  }, 2000);
}
function _clearGameOverResend(){
  _gameOverResend = null;
  if(_gameOverTimer){ clearInterval(_gameOverTimer); _gameOverTimer=null; }
}

let _resyncTimer = null;
let _bossAITimeout = null;

function scheduleBossAI(delay){
  if(_bossAITimeout) clearTimeout(_bossAITimeout);
  _bossAITimeout = setTimeout(()=>{ _bossAITimeout=null; runBossAI_Online(); }, delay||1900);
}

function _startResync(){
  _stopResync();
  if(!isOnline) return;
  _resyncTimer = setInterval(()=>{
    if(!isOnline || !_fbRoomRef) return;
    if(!document.getElementById('gameScreen').classList.contains('active')) return;
    if(isMyTurn()){
      sendGameState(true);  // resync: no incrementar seq
    } else if(gameMode==='boss' && currentPlayer==='boss'){
      if(myPlayerNum===1){ if(!_bossAITimeout) scheduleBossAI(500); }
      else { sendGameState(true); }  // resync: no incrementar seq
    }
  }, 8000);
}
function _stopResync(){
  if(_resyncTimer){ clearInterval(_resyncTimer); _resyncTimer=null; }
  if(_bossAITimeout){ clearTimeout(_bossAITimeout); _bossAITimeout=null; }
  // _gameOverResend se mantiene activo — lo limpia _clearGameOverResend()
}

function sendGameState(resync){
  if(!isOnline || !_fbRoomRef) return;
  if(!resync) _stateSeq++;   // solo incrementar en eventos reales, no en resyncs
  const recentLogs = logEntries.slice(-40);
  const state = { gm:gameMode, p1:packPlayer(p1), p2:packPlayer(p2), cp:currentPlayer, tn:turnNumber, au:attackUsed, log:recentLogs, seq:_stateSeq };
  if(gameMode==='boss'){ state.boss=packBossCard(boss.card); state.bi=selectedBossIdx; }
  if(gameMode==='triple'){ state.p3=packPlayer(p3); }
  if(_caosActive){ state.ce=_caosEffect; }  // sincronizar efecto de Caos
  if(_pendingGameOver){ state.go=_pendingGameOver; _pendingGameOver=null; }
  console.log('[NEXUS] sendGameState | resync:', !!resync, '| seq:', _stateSeq, '| turno:', turnNumber, '| cp:', currentPlayer, '| go:', !!state.go, '| p1pile:', state.p1?.pids?.length, '| p2pile:', state.p2?.pids?.length);
  _fbSend({ type:'game_state', state });
  if(!resync) _startResync();
}

/* ═══════════════════════════════════════════════
   ONLINE BOSS 2v1
═══════════════════════════════════════════════ */

function buildGameUI_OnlineBoss2v1(){
  document.getElementById('gameScreen').classList.add('boss-battle');
  document.getElementById('modeChip').textContent='JEFE 2v1';
  document.getElementById('modeChip').className='mode-chip chip-boss';
  document.getElementById('handSection').style.display='none';

  document.getElementById('battlefieldWrap').innerHTML=`
  <div class="boss-zone" id="bossZoneEl">
    <div class="boss-zone-label">★ JEFE — ${BOSS_CARD.name.toUpperCase()}</div>
    <div class="boss-card-layout">
      <div class="boss-art" id="bossArt">👁</div>
      <div class="boss-info">
        <div class="boss-name">${BOSS_CARD.name}</div>
        <div class="boss-hp-label"><span>HP</span><span id="bossHpText">2000 / 2000</span></div>
        <div class="boss-hp-bar"><div class="boss-hp-fill" id="bossHpBar" style="width:100%"></div></div>
        <div class="boss-effects" id="bossEffects"></div>
        <div class="boss-desc">${BOSS_CARD.flavor}</div>
      </div>
    </div>
  </div>
  <div style="display:grid;grid-template-columns:1fr 1fr;gap:.75rem;margin-top:.5rem">
    <div>
      <div class="challenger-zone-title p1-hdr" id="ob_p1Name" style="font-size:10px;margin-bottom:4px">J1</div>
      ${battleCardHTML('ob_p1_')}
      <div style="font-size:10px;color:var(--text-muted);margin-top:3px">Pila: <span id="ob_p1_pileCount">0</span></div>
    </div>
    <div>
      <div class="challenger-zone-title p2-hdr" id="ob_p2Name" style="font-size:10px;margin-bottom:4px">J2</div>
      ${battleCardHTML('ob_p2_')}
      <div style="font-size:10px;color:var(--text-muted);margin-top:3px">Pila: <span id="ob_p2_pileCount">0</span></div>
    </div>
  </div>`;

  document.getElementById('attackPanelWrap').innerHTML=`
  <div class="attack-panel panel-challenger" id="ob_atkPanel">
    <div class="attack-panel-title">ATAQUES — <span id="ob_atkPanelName"></span></div>
    <div class="attacks-col" id="ob_atkCol"></div>
  </div>`;
}

function renderOnlineBoss2v1(){
  if(!boss||!boss.card) return;
  const bc=boss.card;
  document.getElementById('turnNum').textContent=turnNumber;
  const isBossTurn=(currentPlayer==='boss');
  const tp=document.getElementById('turnPlayerEl');
  tp.textContent='Turno de: '+(isBossTurn?boss.name:currentPlayer===1?p1.name:p2.name);
  tp.className='turn-player '+(isBossTurn?'turn-boss':currentPlayer===1?'turn-p1':'turn-p2');
  const banner=document.getElementById('phaseBanner');
  banner.textContent=(isBossTurn?'TURNO DEL JEFE':'TURNO DE '+(currentPlayer===1?p1.name:p2.name).toUpperCase());
  banner.className='phase-banner '+(isBossTurn?'phase-boss':currentPlayer===1?'phase-p1':'phase-p2');
  document.getElementById('bossZoneEl').className='boss-zone'+(isBossTurn?' active-turn':'');

  // Boss HP
  const bpct=Math.max(0,bc.hp/bc.maxHp*100);
  document.getElementById('bossHpText').textContent=Math.max(0,bc.hp)+' / '+bc.maxHp;
  document.getElementById('bossHpBar').style.width=bpct+'%';
  const beff=document.getElementById('bossEffects');
  beff.innerHTML='';
  (bc.effects||[]).forEach(ef=>{
    const t=document.createElement('span');
    t.className='effect-tag '+(ef.type==='dot'?'effect-dot':'effect-regen');
    t.textContent=(ef.type==='dot'?'☠ ':'♥ ')+ef.name+' ('+(ef.remaining===-1?'∞':ef.remaining)+')';
    beff.appendChild(t);
  });

  // Player zones
  renderOBPlayerZone(p1,'ob_p1_');
  renderOBPlayerZone(p2,'ob_p2_');
  document.getElementById('ob_p1Name').textContent=p1.name;
  document.getElementById('ob_p2Name').textContent=p2.name;
  document.getElementById('ob_p1_pileCount').textContent=p1.pile.length;
  document.getElementById('ob_p2_pileCount').textContent=p2.pile.length;

  // Attack panel
  const col=document.getElementById('ob_atkCol');
  const nameEl=document.getElementById('ob_atkPanelName');
  if(!col) return;
  col.innerHTML='';
  const canAct=!isBossTurn && isMyTurn() && !attackUsed;
  const me=currentPlayer===1?p1:p2;
  if(nameEl) nameEl.textContent=me.name;
  if(isBossTurn){
    col.innerHTML='<div style="font-size:10px;color:var(--boss-glow);letter-spacing:.08em;font-family:var(--font-title);margin-bottom:6px">👁 '+boss.name.toUpperCase()+' ELIGE ATAQUE…</div>';
    (BOSS_CARD.attacks||[]).forEach(atk=>{
      const btn=buildAtkBtnElement(atk,0,true,true);
      btn.style.cursor='default';
      col.appendChild(btn);
    });
  } else if(me.active){
    (me.active.attacks||[]).forEach((atk,i)=>{
      const btn=buildAtkBtnElement(atk,i,false,!canAct);
      btn.onclick=()=>useAttack_OnlineBoss2v1(i);
      col.appendChild(btn);
    });
  } else {
    col.innerHTML='<div style="font-size:11px;color:var(--text-dim);text-align:center;padding:.5rem">Sin carta activa</div>';
  }
}

function renderOBPlayerZone(player, prefix){
  const card=player.active;
  const cardEl=document.getElementById(prefix+'card');
  if(!cardEl) return;
  if(!card){
    document.getElementById(prefix+'cardName').textContent='— sin carta —';
    document.getElementById(prefix+'hp').textContent='—';
    document.getElementById(prefix+'hpBar').style.width='0%';
    document.getElementById(prefix+'art').innerHTML='<div class="card-art-placeholder" style="font-size:10px;color:var(--text-dim)">Sin carta</div>';
    document.getElementById(prefix+'effects').innerHTML='';
    return;
  }
  const r=RARITIES[card.stars]||RARITIES[1];
  document.getElementById(prefix+'cardName').textContent='#'+String(card.id).padStart(3,'0')+' '+card.name;
  const pct=Math.max(0,card.hp/card.maxHp*100);
  document.getElementById(prefix+'hp').textContent=Math.max(0,card.hp)+' / '+card.maxHp;
  const bar=document.getElementById(prefix+'hpBar');
  bar.style.width=pct+'%';
  bar.className='hp-fill '+(pct>60?'hp-high':pct>25?'hp-mid':'hp-low');
  const artEl=document.getElementById(prefix+'art');
  artEl.style.borderBottom='2px solid '+r.border;
  artEl.innerHTML=card.image
    ?'<img src="'+card.image+'" alt="'+card.name+'"><div class="card-id-badge" style="color:'+r.border+'">#'+String(card.id).padStart(3,'0')+'</div>'
    :'<div class="card-art-placeholder" style="color:'+r.border+'">'+card.name.slice(0,7).toUpperCase()+'</div><div class="card-id-badge" style="color:'+r.border+'">#'+String(card.id).padStart(3,'0')+'</div>';
  const isActive=(currentPlayer===player.num);
  cardEl.className='battle-card'+(isActive?(player.num===1?' active-glow-p1':' active-glow-p2'):'');
  const effEl=document.getElementById(prefix+'effects');
  effEl.innerHTML='';
  (card.effects||[]).forEach(ef=>{
    const t=document.createElement('span');
    t.className='effect-tag '+(ef.type==='dot'?'effect-dot':'effect-regen');
    t.textContent=(ef.type==='dot'?'☠ ':'♥ ')+ef.name+' ('+(ef.remaining===-1?'∞':ef.remaining)+')';
    effEl.appendChild(t);
  });
}

function useAttack_OnlineBoss2v1(atkIndex){
  if(attackUsed || !isMyTurn() || currentPlayer==='boss') return;
  const attacker=currentPlayer===1?p1:p2;
  if(!attacker.active) return;
  const atk=attacker.active.attacks[atkIndex];
  attackUsed=true;
  // El objetivo siempre es el boss
  resolveAtk_Standard(atk, attacker, {active:boss.card, name:boss.name, num:'boss'}, atkIndex);
  // checkDeath boss
  if(boss.card.hp<=0){
    endGame_OnlineBoss2v1('players');
    return;
  }
  endTurn_OnlineBoss2v1();
}

function endTurn_OnlineBoss2v1(){
  // Tick efectos de todas las cartas
  [p1,p2].forEach(player=>{
    if(!player.active) return;
    player.active.effects=(player.active.effects||[]).filter(ef=>{
      if(ef.type==='dot'){
        player.active.hp=Math.max(0,player.active.hp-ef.value);
        addLog('<b>'+ef.name+'</b> causa '+ef.value+' hp a '+player.active.name+'.','log-dmg');
        animCard('ob_p'+player.num+'_card','anim-dmg');
      } else if(ef.type==='regen'){
        const healed=Math.min(ef.value,player.active.maxHp-player.active.hp);
        player.active.hp=Math.min(player.active.maxHp,player.active.hp+healed);
        addLog('<b>'+ef.name+'</b> restaura '+healed+' hp a '+player.active.name+'.','log-heal');
        animCard('ob_p'+player.num+'_card','anim-heal');
      }
      if(ef.remaining!==-1) ef.remaining--;
      return ef.remaining>0||ef.remaining===-1;
    });
    if(player.active&&player.active.shieldTurns&&player.active.shieldTurns!==-1){
      player.active.shieldTurns--;
      if(player.active.shieldTurns<=0){delete player.active.shieldPct;delete player.active.shieldTurns;}
    }
    if(player.active&&player.active.hp<=0){
      addLog('<b>'+player.active.name+'</b> cayó por daño continuo.','log-sys');
      obNextCard(player);
    }
  });
  // Tick efectos del boss
  if(boss.card){
    boss.card.effects=(boss.card.effects||[]).filter(ef=>{
      if(ef.type==='dot'){
        boss.card.hp=Math.max(0,boss.card.hp-ef.value);
        addLog('<b>'+ef.name+'</b> causa '+ef.value+' hp al jefe.','log-dmg');
      } else if(ef.type==='regen'){
        const healed=Math.min(ef.value,boss.card.maxHp-boss.card.hp);
        boss.card.hp=Math.min(boss.card.maxHp,boss.card.hp+healed);
        addLog('<b>'+ef.name+'</b> restaura '+healed+' hp al jefe.','log-heal');
      }
      if(ef.remaining!==-1) ef.remaining--;
      return ef.remaining>0||ef.remaining===-1;
    });
    if(boss.card.hp<=0){ endGame_OnlineBoss2v1('players'); return; }
  }

  // Si los dos quedaron sin cartas tras los ticks → boss gana
  const p1Dead=!p1.active&&p1.pile.length===0;
  const p2Dead=!p2.active&&p2.pile.length===0;
  if(p1Dead&&p2Dead){ endGame_OnlineBoss2v1('boss'); return; }

  // Avanzar turno: 1 → 2 → boss → 1 → … (saltando jugadores eliminados)
  attackUsed=false;
  if(currentPlayer===1){
    if(p2Dead){
      // P2 ya no tiene cartas → saltar directo a turno del boss
      currentPlayer='boss';
      addLog('— '+boss.name+' actúa ('+p2.name+' eliminado) —','log-sys');
      sendGameState(); renderGame();
      if(myPlayerNum===1 || bossLocal2v1) scheduleBossAI(1900);
      return;
    }
    currentPlayer=2;
    addLog('— Turno de '+p2.name+' —','log-sys');
  } else if(currentPlayer===2){
    currentPlayer='boss';
    addLog('— Turno de '+boss.name+' —','log-sys');
    sendGameState();
    renderGame();
    if(myPlayerNum===1 || bossLocal2v1) scheduleBossAI(1900);
    return;
  } else {
    currentPlayer=1; turnNumber++;
    addLog('— Turno '+turnNumber+': '+p1.name+' —','log-sys');
  }
  sendGameState();
  renderGame();
}

function runBossAI_Online(){
  if(!boss||!boss.card) return;
  // Elegir ataque al azar
  const attacks=BOSS_CARD.attacks;
  const bossAtkIdx=Math.floor(Math.random()*attacks.length);
  const atk=attacks[bossAtkIdx];
  // Elegir objetivo al azar entre los jugadores vivos
  const alive=[p1,p2].filter(pl=>pl.active&&pl.active.hp>0);
  if(alive.length===0){ endGame_OnlineBoss2v1('boss'); return; }
  const target=alive[Math.floor(Math.random()*alive.length)];
  addLog(boss.name+' usa <b>'+atk.name+'</b> sobre <b>'+target.name+'</b>.','log-boss');
  resolveAtk_Standard(atk, {active:boss.card, name:boss.name, num:'boss'}, target, bossAtkIdx);
  // Verificar muertes de jugadores
  [p1,p2].forEach(pl=>{
    if(pl.active&&pl.active.hp<=0){
      addLog('<b>'+pl.active.name+'</b> de '+pl.name+' cayó.','log-sys');
      obNextCard(pl);
    }
  });
  const p1Out=!p1.active&&p1.pile.length===0;
  const p2Out=!p2.active&&p2.pile.length===0;
  if(p1Out&&p2Out){ endGame_OnlineBoss2v1('boss'); return; }
  attackUsed=false; turnNumber++;
  if(p1Out){
    // P1 eliminado → empezar por P2
    currentPlayer=2;
    addLog('— Turno '+turnNumber+': '+p2.name+' ('+p1.name+' eliminado) —','log-sys');
  } else {
    currentPlayer=1;
    addLog('— Turno '+turnNumber+': '+p1.name+' —','log-sys');
  }
  sendGameState();
  renderGame();
}

function obNextCard(player){
  if(player.pile.length>0){
    const next=player.pile.shift(); next.effects=[]; next.cumulativeUses={};
    player.active=next;
    playSfxCarta();
    addLog(player.name+' invoca a <b>'+next.name+'</b>.','log-sys');
  } else {
    player.active=null;
    addLog(player.name+' se quedó sin cartas.','log-sys');
  }
}

function endGame_OnlineBoss2v1(winner){
  document.getElementById('gameScreen').classList.remove('boss-battle');
  _switchBgm(bgm);
  const title=document.getElementById('endTitle');
  const sub=document.getElementById('endSub');
  _humanWon = winner==='players';
  if(winner==='players'){
    title.textContent='¡VICTORIA!';
    title.className='end-title end-win-glow';
    sub.textContent=p1.name+' y '+p2.name+' derrotaron a '+boss.name+' juntos.';
  } else {
    title.textContent='DERROTA';
    title.className='end-title end-lose-glow';
    sub.textContent=boss.name+' devoró a ambos retadores.';
  }
  const goData={bossWinner:winner, bossName:(boss&&boss.name)||BOSS_CARD.name, turn:turnNumber};
  _pendingGameOver=goData; sendGameState();
  _stopResync(); _startGameOverResend(goData);
  renderGame();
  showEndScreen();
}

/* ── Reset lobby (anfitrión reinicia sin cerrar sala) ── */
function resetToLobby(){
  if(!confirm('¿Volver al lobby? La partida actual se cancelará.')) return;
  if(_fbRoomRef){
    _fbSend({type:'reset_lobby'});
  }
  doResetToLobby('host');
}

function doResetToLobby(role){
  _stopResync(); _clearGameOverResend(); hideConnLost(); _stopConnListener();
  // Cerrar overlay de ruleta si quedó abierto
  var _rov = document.getElementById('rouletteOverlay');
  if(_rov) _rov.style.display = 'none';
  _rouletteActive = false;
  // Limpiar estado de juego
  iSentReady=false; opponentConfigs={}; attackUsed=false; logEntries=[]; _stateSeq=0;
  _caosActive=false; _caosEffect=null; _caosShieldDefender=null; _renderCaosBanner();
  p1={}; p2={}; p3={}; boss={}; challenger={}; pendingTarget=0;
  onlinePlayerCount=2;
  selectedBossIdx=-1; BOSS_CARD=BOSSES[0]; onlineGameMode='standard';
  document.getElementById('onlineBossSelector').style.display='none';
  // Resetear selector de modos al estado inicial
  ['omBtn_standard','omBtn_boss'].forEach(id=>{ const e=document.getElementById(id); if(e) e.classList.remove('selected'); });
  const omStd=document.getElementById('omBtn_standard'); if(omStd) omStd.classList.add('selected');
  const modsDiv=document.getElementById('onlineStdMods'); if(modsDiv) modsDiv.style.display='flex';
  document.querySelectorAll('#onlineStdMods .mod-btn').forEach(b=>b.classList.remove('active'));
  const noMod=document.getElementById('omMod_standard'); if(noMod) noMod.classList.add('active');
  onlineGameMode='standard'; _applyOnlineModeUI('standard'); // restaurar UI del mazo
  const tb=document.getElementById('tripleJoinedBanner'); if(tb) tb.style.display='none';
  document.getElementById('logWrap').innerHTML='';
  // Limpiar selección de mazo
  mySel=[];
  document.querySelectorAll('#onlineMyDeck .mini-card').forEach(el=>el.classList.remove('selected'));
  updateOnlineDeckCount();
  document.getElementById('onlineReadyBtn').disabled=true;
  document.getElementById('onlineReadyStatus').textContent='';
  var _onName = _loadP1Name()||('Jugador '+myPlayerNum);
  document.getElementById('onlineMyName').value=_onName;
  var _onLbl = document.getElementById('onlineMyNameLabel');
  if(_onLbl) _onLbl.textContent='— '+_onName;
  // Volver al lobby (ya tenemos sala abierta)
  document.getElementById('onlineConnectDiv').style.display='none';
  document.getElementById('onlineLobbyDiv').style.display='block';
  document.getElementById('resetLobbyBtn').style.display='none';
  document.getElementById('skipCycleBtn').style.display='none';
  document.getElementById('resyncBtn').style.display='none';
  showScreen('onlineScreen');
  if(myPlayerNum===1){
    document.getElementById('onlineModeSelector').style.display='block';
    document.getElementById('onlineModeDisplay').style.display='none';
    // Notificar al invitado del modo actual
    if(_fbRoomRef){
      _fbSend({type:'mode_update', mode:onlineGameMode});
    }
    // Re-leer cuántos jugadores siguen conectados y restaurar estado
    if(_fbRoomRef){
      _fbRoomRef.child('playerCount').once('value', snap => {
        const count = snap.val() || 1;
        if(count >= 3){
          forceTripleMode();
          setOnlineStatus('⚡ 3 jugadores conectados — Modo FFA','#c4b0ff');
        } else if(count >= 2){
          setOnlineStatus('✓ Rival conectado — configura tu mazo y pulsa ¡Listo!','#7affaa');
          _fbSend({type:'mode_update', mode:onlineGameMode, bossIdx:selectedBossIdx});
        } else {
          setOnlineStatus('Lobby reiniciado — espera al rival.','');
        }
      });
    } else {
      setOnlineStatus('Lobby reiniciado — espera al rival.','');
    }
  } else {
    document.getElementById('onlineModeSelector').style.display='none';
    document.getElementById('onlineModeDisplay').style.display='block';
    setOnlineStatus('El anfitrión reinició el lobby — espera a que configure.','');
  }
}

/* ── UI ── */
function showOnlineScreen(){
  mySel=[]; opponentConfigs={}; iSentReady=false; onlineGameMode='standard'; onlinePlayerCount=2; pendingTarget=0;
  document.getElementById('onlineConnectDiv').style.display='block';
  document.getElementById('onlineLobbyDiv').style.display='none';
  document.getElementById('onlineConnectError').textContent='';
  document.getElementById('joinCodeInput').value='';
  showScreen('onlineScreen');
  buildOnlineDeckPicker();
  _applyOnlineModeUI('standard'); // restaurar picker si quedó oculto de sesión draft previa
}

function buildOnlineDeckPicker(){
  const container=document.getElementById('onlineMyDeck');
  if(!container) return;
  container.innerHTML='';
  CARD_POOL.forEach(card=>{
    const isUnlocked=_isCardUnlocked(card.id);
    const d=document.createElement('div');
    d.className='mini-card'+(isUnlocked?'':' mini-card-locked');
    d.dataset.id=card.id;
    if(isUnlocked){
      d.innerHTML='<div class="mini-card-name">'+card.name+'</div><div class="mini-card-hp">'+card.hp+' hp · '+card.stars+'★</div>';
      d.onclick=()=>toggleOnlineCard(card.id,d);
    } else {
      const isStore=_STORE_CARD_IDS.indexOf(card.id)!==-1;
      d.innerHTML='<div class="mini-card-name">🔒 '+card.name+'</div><div class="mini-card-hp">'+(isStore?'Tienda':'Logro')+' · '+card.stars+'★</div>';
      d.title=isStore?'Desbloquea esta carta en la Tienda':'Desbloquea esta carta con logros';
    }
    container.appendChild(d);
  });
}

function toggleOnlineCard(cardId,el){
  const maxSize=parseInt(document.getElementById('onlineMySize').value);
  const idx=mySel.indexOf(cardId);
  if(idx>=0){ mySel.splice(idx,1); el.classList.remove('selected'); }
  else{
    if(mySel.length>=maxSize){ flashOnlineCount(); return; }
    const card=CARD_POOL.find(c=>c.id===cardId);
    const limit=RARITY_LIMITS[card.rarity]??Infinity;
    if(getRarityCount(mySel,card.rarity)>=limit) return;
    mySel.push(cardId); el.classList.add('selected');
  }
  updateOnlineDeckCount();
}

function flashOnlineCount(){
  const el=document.getElementById('onlineMyCount');
  el.style.color='#e08080'; setTimeout(()=>el.style.color='',700);
}

function updateOnlineDeckSize(broadcast){
  const val=document.getElementById('onlineMySize').value;
  document.getElementById('onlineMySizeVal').textContent=val;
  const maxSize=parseInt(val);
  while(mySel.length>maxSize){
    const removed=mySel.pop();
    const el=document.querySelector('#onlineMyDeck [data-id="'+removed+'"]');
    if(el) el.classList.remove('selected');
  }
  updateOnlineDeckCount();
  // Solo el anfitrión retransmite el tamaño al invitado
  if(broadcast && myPlayerNum===1 && _fbRoomRef){
    _fbSend({type:'deck_size_update', deckSize:maxSize});
  }
}

function updateOnlineDeckCount(){
  const maxSize=parseInt(document.getElementById('onlineMySize').value);
  document.getElementById('onlineMyCount').textContent=mySel.length+' / '+maxSize+' seleccionadas';
  document.getElementById('onlineReadyBtn').disabled=(mySel.length!==maxSize);
}

function randomOnlineDeck(){
  const maxSize=parseInt(document.getElementById('onlineMySize').value);
  mySel.length=0;
  document.querySelectorAll('#onlineMyDeck .mini-card').forEach(el=>el.classList.remove('selected'));
  const rarityCounts={};
  const shuffled=shuffle(CARD_POOL.filter(c=>_isCardUnlocked(c.id)));
  for(const card of shuffled){
    if(mySel.length>=maxSize) break;
    const limit=RARITY_LIMITS[card.rarity]??Infinity;
    const count=rarityCounts[card.rarity]||0;
    if(count<limit){ mySel.push(card.id); rarityCounts[card.rarity]=count+1; }
  }
  mySel.forEach(id=>{
    const el=document.querySelector('#onlineMyDeck [data-id="'+id+'"]');
    if(el) el.classList.add('selected');
  });
  updateOnlineDeckCount();
}

/* ── Firebase: conectar ── */
function onlineCreate(){ _fbConnect('create', ''); }

function onlineJoin(){
  const code = document.getElementById('joinCodeInput').value.trim().toUpperCase();
  if(code.length < 2){ document.getElementById('onlineConnectError').textContent = 'Ingresa el código de sala.'; return; }
  _fbConnect('join', code);
}

function _fbGenCode(){
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let c = '';
  for(let i = 0; i < 4; i++) c += chars[Math.floor(Math.random() * chars.length)];
  return c;
}

function _fbDisconnect(){
  if(_fbMsgListener && _fbRoomRef){
    _fbRoomRef.child('messages').off('child_added', _fbMsgListener);
    _fbRoomRef.child('presence').off('child_changed');
    _fbMsgListener = null;
  }
  if(_fbRoomRef){
    if(myPlayerNum === 1){
      // Host se va → borrar sala completa
      _fbRoomRef.remove();
    } else {
      // Invitado se va → borrar su presencia y decrementar contador
      _fbRoomRef.child('presence/p' + myPlayerNum).remove();
      _fbRoomRef.child('playerCount').transaction(function(count){
        return Math.max(1, (count || 2) - 1);
      });
    }
  }
  _fbRoomRef = null;
  ws = null;
}

function _fbSend(data){
  if(!_fbRoomRef) return;
  const ref = _fbRoomRef.child('messages').push();
  _fbLastMsgKey = ref.key;
  ref.set({ from: myPlayerNum, data: data, ts: firebase.database.ServerValue.TIMESTAMP });
}

function _fbConnect(action, code){
  const errEl = document.getElementById('onlineConnectError');
  errEl.textContent = 'Conectando…'; errEl.style.color = 'var(--text-muted)';

  if(action === 'create'){
    // Generar código único
    const tryCode = (attempt) => {
      const c = _fbGenCode();
      const ref = _fbDb.ref('rooms/' + c);
      ref.transaction(current => {
        if(current !== null) return; // código ocupado, reintentar
        return { created: firebase.database.ServerValue.TIMESTAMP, playerCount: 1 };
      }, (err, committed) => {
        if(!committed){
          if(attempt < 10) tryCode(attempt + 1);
          else { errEl.textContent = 'No se pudo crear sala. Intenta de nuevo.'; errEl.style.color = '#e08080'; }
          return;
        }
        roomCode = c;
        _fbRoomRef = ref;
        myPlayerNum = 1;
        // Host: si se desconecta abruptamente → borrar sala completa
        _fbRoomRef.onDisconnect().remove();
        _fbRoomRef.child('presence/p1').set('online');
        _fbListenRoom();
        handleWsMessage({ type: 'room_created', code: c });
      });
    };
    tryCode(0);

  } else {
    // Unirse a sala existente
    const ref = _fbDb.ref('rooms/' + code);
    ref.once('value', snap => {
      if(!snap.exists()){
        errEl.textContent = 'Sala no encontrada. Verifica el código.'; errEl.style.color = '#e08080'; return;
      }
      const data = snap.val();
      const count = data.playerCount || 1;
      if(count >= 3){
        errEl.textContent = 'La sala ya está llena (máx. 3 jugadores).'; errEl.style.color = '#e08080'; return;
      }
      const newNum = count + 1;
      ref.child('playerCount').set(newNum);
      roomCode = code;
      _fbRoomRef = ref;
      myPlayerNum = newNum;
      // Invitado: si se desconecta abruptamente → borrar solo su presencia
      _fbRoomRef.child('presence/p' + newNum).onDisconnect().remove();
      _fbRoomRef.child('presence/p' + newNum).set('online');
      _fbListenRoom();
      handleWsMessage({ type: 'room_joined', playerNum: newNum, code: code });
      // Notificar al host que alguien se unió
      var _myC = _loadCosmetics();
      _fbSend(newNum === 2
        ? { type: 'opponent_joined', playerNum: 2, avatar: _myC.avatar, avbg: _myC.avbg, frame: _myC.frame, title: _myC.title }
        : { type: 'third_joined' }
      );
    });
  }
}

function _fbListenRoom(){
  // Escuchar mensajes nuevos
  let firstLoad = true;
  _fbMsgListener = _fbRoomRef.child('messages').on('child_added', snap => {
    if(firstLoad){ return; } // ignorar mensajes previos al conectarse
    const msg = snap.val();
    if(!msg || msg.from === myPlayerNum) return; // ignorar propios
    try{ handleWsMessage({ type: 'relay', from: msg.from, data: msg.data }); }
    catch(e){ console.error('FB msg error:', e); }
  });
  // Marcar firstLoad=false en el siguiente tick (después de cargar historial)
  _fbRoomRef.child('messages').once('value', () => { firstLoad = false; });

  // Detectar desconexión de otros jugadores
  function _onPresenceGone(snap){
    if(!isOnline) return;
    const who = parseInt(snap.key.replace('p',''));
    if(who !== myPlayerNum) handleWsMessage({ type: 'opponent_disconnected', who: who });
  }
  _fbRoomRef.child('presence').on('child_changed', snap => {
    if(!isOnline) return;
    if(snap.val() === 'gone') _onPresenceGone(snap);
  });
  _fbRoomRef.child('presence').on('child_removed', snap => {
    _onPresenceGone(snap);
  });
}

/* ── Mensajes entrantes ── */
function handleWsMessage(msg){
  switch(msg.type){
    case 'room_created':
      myPlayerNum=1; roomCode=msg.code; showOnlineLobby(1); break;
    case 'room_joined':
      myPlayerNum=msg.playerNum||2; roomCode=msg.code; showOnlineLobby(myPlayerNum);
      setOnlineStatus('✓ Conectado — configura tu mazo y pulsa ¡Listo!','#7affaa'); break;
    case 'opponent_joined':
      setOnlineStatus('✓ Rival conectado — configura tu mazo y pulsa ¡Listo!','#7affaa');
      if(_fbRoomRef) _fbSend({type:'mode_update', mode:onlineGameMode, bossIdx:selectedBossIdx});
      // Guardar cosméticos del oponente (P2) y enviar los propios
      if(msg.avatar !== undefined) _onlineOpponentCosm = {avatar: msg.avatar, avbg: msg.avbg, frame: msg.frame};
      (function(){ var c=_loadCosmetics(); _fbSend({type:'cosm_info',avatar:c.avatar,avbg:c.avbg,frame:c.frame,title:c.title}); })();
      if(iSentReady) relaySentReady(); break;
    case 'third_joined':
      // Un 3er jugador se unió → modo FFA forzado
      forceTripleMode();
      setOnlineStatus('⚡ 3 jugadores conectados — Modo FFA activado','#c4b0ff');
      if(iSentReady) relaySentReady(); // re-enviar config al 3er jugador
      break;
    case 'relay':
      handleRelayMsg(msg.from,msg.data); break;
    case 'opponent_disconnected':
      var _whoLeft = msg.who || 0;
      if(myPlayerNum === 1){
        // Host: un guest se fue
        var _inGame = document.getElementById('gameScreen').classList.contains('active');
        if(_rouletteActive){
          // Durante ruleta: cancelar y volver al lobby
          _cancelRoulette();
          doResetToLobby('host');
          setOnlineStatus('⚠ Un jugador se desconectó. Lobby reiniciado.','#e08080');
        } else if(_inGame){
          // Mid-game: rival se desconectó → volver al lobby
          var _leftName = (_whoLeft===2 ? (p2&&p2.name||'Jugador 2') : (p3&&p3.name||'Jugador '+_whoLeft));
          doResetToLobby('host');
          setOnlineStatus('⚠ ' + _leftName + ' se desconectó. Lobby reiniciado.','#e08080');
        } else {
          // Lobby: resetear
          doResetToLobby('host');
          setOnlineStatus('⚠ Jugador ' + _whoLeft + ' se desconectó. Esperando rival…','#e08080');
        }
      } else {
        // Guest recibe evento de presencia
        if(_whoLeft === 1 || _whoLeft === 0){
          // Host se fue → sala cerrada, ir al título
          _stopConnListener();
          _cancelRoulette();
          isOnline = false;
          _fbDisconnect();
          _showHostClosedToast();
          showScreen('titleScreen');
        } else {
          // Otro guest se fue → notificar pero NO desconectar
          var _guestLeftName = (_whoLeft===2 ? (p2&&p2.name) : (p3&&p3.name)) || ('Jugador '+_whoLeft);
          setOnlineStatus('⚠ ' + _guestLeftName + ' se desconectó.','#e08080');
          if(document.getElementById('gameScreen').classList.contains('active') && !_rouletteActive){
            _addLog('— <strong>' + _guestLeftName + ' se desconectó.</strong>');
            endGame_Standard(myPlayerNum===2 ? p2 : p3);
          } else if(_rouletteActive){
            _cancelRoulette();
            doResetToLobby('guest');
          }
        }
      }
      break;
    case 'error':
      document.getElementById('onlineConnectError').textContent=msg.msg;
      document.getElementById('onlineConnectError').style.color='#e08080'; break;
  }
}

function showOnlineLobby(playerNum){
  document.getElementById('onlineConnectDiv').style.display='none';
  document.getElementById('onlineLobbyDiv').style.display='block';
  document.getElementById('onlineCodeDisplay').textContent=roomCode;
  document.getElementById('onlineRoleLabel').textContent=playerNum===1?'ANFITRIÓN (J1) — comparte el código:':'INVITADO (J2) — sala:';
  const hdr=document.getElementById('onlineMyHeader');
  hdr.textContent='Tu mazo (Jugador '+playerNum+')';
  hdr.className=playerNum===1?'p1-hdr':'p2-hdr';
  var _onName2 = _loadP1Name()||('Jugador '+playerNum);
  document.getElementById('onlineMyName').value=_onName2;
  var _onLbl2 = document.getElementById('onlineMyNameLabel');
  if(_onLbl2) _onLbl2.textContent='— '+_onName2;
  if(playerNum===1){
    setOnlineStatus('Esperando que el rival ingrese el código…','');
    document.getElementById('onlineModeSelector').style.display='block';
    document.getElementById('onlineModeDisplay').style.display='none';
    // Anfitrión: slider habilitado
    const sizeEl=document.getElementById('onlineMySize');
    if(sizeEl) sizeEl.disabled=false;
  } else {
    document.getElementById('onlineModeSelector').style.display='none';
    document.getElementById('onlineModeDisplay').style.display='block';
    // Invitado: slider deshabilitado (solo refleja el del anfitrión)
    const sizeEl=document.getElementById('onlineMySize');
    if(sizeEl) sizeEl.disabled=true;
  }
}

function selectOnlineMode(mainMode, el){
  // mainMode es 'standard' o 'boss'
  ['omBtn_standard','omBtn_boss'].forEach(id=>{
    const e=document.getElementById(id); if(e) e.classList.remove('selected');
  });
  el.classList.add('selected');
  // Modificadores: mostrar solo cuando Estándar
  const modsDiv=document.getElementById('onlineStdMods');
  if(modsDiv) modsDiv.style.display=(mainMode==='standard'?'flex':'none');
  // Selector de jefe
  const bossSelector=document.getElementById('onlineBossSelector');
  if(bossSelector){
    if(mainMode==='boss'){
      bossSelector.style.display='block';
      buildOnlineBossGrid();
    } else {
      bossSelector.style.display='none';
    }
  }
  if(mainMode==='boss'){
    onlineGameMode='boss';
    if(_fbRoomRef){ _fbSend({type:'mode_update', mode:'boss', bossIdx:selectedBossIdx}); }
  } else {
    // Mantener el modificador activo
    const activeMod=document.querySelector('#onlineStdMods .mod-btn.active');
    const mod=activeMod?activeMod.id.replace('omMod_',''):'standard';
    onlineGameMode=mod;
    if(_fbRoomRef){ _fbSend({type:'mode_update', mode:mod}); }
  }
}

function selectOnlineMod(mod, el){
  document.querySelectorAll('#onlineStdMods .mod-btn').forEach(b=>b.classList.remove('active'));
  el.classList.add('active');
  onlineGameMode=mod;
  draftMode=(mod==='draft');
  _applyOnlineModeUI(mod);
  if(_fbRoomRef){ _fbSend({type:'mode_update', mode:mod}); }
}

function _applyOnlineModeUI(mode){
  const pickerWrap = document.getElementById('onlineDeckPickerWrap');
  const sizeRow    = document.getElementById('onlineDeckSizeRow');
  const notice     = document.getElementById('onlineModeNotice');
  const readyBtn   = document.getElementById('onlineReadyBtn');
  if(!pickerWrap || !notice) return;

  if(mode === 'draft'){
    pickerWrap.style.display = 'none';
    sizeRow.style.display    = '';
    notice.style.display     = 'block';
    notice.style.cssText     = 'display:block;padding:.85rem 1rem;text-align:center;border-radius:8px;font-size:12px;margin-bottom:.5rem;color:#c4b0ff;background:rgba(155,89,247,.06);border:.5px solid rgba(155,89,247,.3)';
    notice.textContent       = '⚔ Las cartas se elegirán una a una en el Draft al comenzar.';
    if(readyBtn) readyBtn.disabled = false;
  } else if(mode === 'rapido'){
    // Rápido: sin selección, 3 cartas al azar
    pickerWrap.style.display = 'none';
    sizeRow.style.display    = 'none';
    notice.style.display     = 'block';
    notice.style.cssText     = 'display:block;padding:.85rem 1rem;text-align:center;border-radius:8px;font-size:12px;margin-bottom:.5rem;color:#ffd93d;background:rgba(255,217,61,.06);border:.5px solid rgba(255,217,61,.3)';
    notice.textContent       = '⚡ Se asignarán 3 cartas al azar de tu colección desbloqueada al comenzar.';
    if(readyBtn) readyBtn.disabled = false;
  } else if(mode === 'espejo' && myPlayerNum === 2){
    // Espejo invitado: usa el mazo del anfitrión
    pickerWrap.style.display = 'none';
    sizeRow.style.display    = 'none';
    notice.style.display     = 'block';
    notice.style.cssText     = 'display:block;padding:.85rem 1rem;text-align:center;border-radius:8px;font-size:12px;margin-bottom:.5rem;color:#4dc9f6;background:rgba(77,201,246,.06);border:.5px solid rgba(77,201,246,.3)';
    notice.textContent       = '🔁 Usarás el mismo mazo que el anfitrión, barajado al azar.';
    if(readyBtn) readyBtn.disabled = false;
  } else {
    // Modo normal: mostrar selector de mazo
    pickerWrap.style.display = '';
    sizeRow.style.display    = '';
    notice.style.display     = 'none';
    updateOnlineDeckCount(); // restaurar validación normal
  }
}

function setOnlineStatus(msg,color){
  const el=document.getElementById('onlineStatusMsg');
  if(!el) return;
  el.textContent=msg; el.style.color=color||'var(--text-muted)';
}

/* ── Relay ── */
var _onlineOpponentCosm = null;
var _TITLE_RANK_CLASS = {'Aprendiz':'rank-aprendiz','Combatiente':'rank-combatiente','Guerrero':'rank-guerrero',
  'Veterano':'rank-veterano','Experto':'rank-experto','Élite':'rank-elite','Maestro':'rank-maestro',
  'Gran Maestro':'rank-gran-maestro','Leyenda':'rank-leyenda','Nexus Master':'rank-nexus-master'};
function _applyZoneTitle(el, ti){
  if(!el) return;
  el.textContent = ti.name;
  el.className = _TITLE_RANK_CLASS[ti.name]||'rank-aprendiz';
  el.style.background = ''; el.style.color = '';
  el.style.display = 'block';
}

function _applyOnlineOpponentAvatar(cosm){
  if(!cosm) return;
  var myNum = myPlayerNum || 1;
  var oppNum = myNum === 1 ? 2 : 1;
  var slot = document.getElementById('p'+oppNum+'zoneAvatar');
  if(!slot) return;
  var av = _COSM_AVATARS[cosm.avatar] || _COSM_AVATARS[0];
  var bg = _COSM_AVBGS[cosm.avbg]    || _COSM_AVBGS[0];
  var fr = _COSM_FRAMES[cosm.frame]   || _COSM_FRAMES[0];
  var ti = _COSM_TITLES[cosm.title]   || _COSM_TITLES[0];
  slot.style.display = 'block';
  slot.style.visibility = 'visible';
  slot.style.background = bg.color;
  slot.innerHTML = '<img src="'+av.src+'" alt="'+av.name+'" style="width:100%;height:100%;object-fit:contain;image-rendering:pixelated;">';
  slot.style.outline = fr.cls ? '2px solid '+(fr.color||'transparent') : 'none';
  slot.style.outlineOffset = '1px';
  var titleEl = document.getElementById('p'+oppNum+'zoneTitle');
  _applyZoneTitle(titleEl, ti);
}

function handleRelayMsg(from,data){
  if(data.type==='cosm_info'){
    _onlineOpponentCosm = {avatar: data.avatar, avbg: data.avbg, frame: data.frame, title: data.title||0};
    _applyOnlineOpponentAvatar(_onlineOpponentCosm);
    return;
  }
  if(data.type==='player_ready'){
    opponentConfigs[from]=data;
    // Si soy invitado y el host me manda el modo, mostrarlo
    if(myPlayerNum!==1 && data.mode){
      onlineGameMode=data.mode;
      draftMode=(data.mode==='draft');
      if(data.bossIdx!==undefined){ selectedBossIdx=data.bossIdx; BOSS_CARD=BOSSES[selectedBossIdx]; }
      const bossName=(data.mode==='boss'&&data.bossIdx!==undefined)?BOSSES[data.bossIdx].name:'';
      const names={standard:'Estándar',hand3:'Estándar — Mano de 3',draft:'Estándar — Draft',espejo:'Estándar — Espejo',caos:'Estándar — Caos',rapido:'Estándar — Rápido',boss:'Modo Jefe 2v1'+(bossName?' — '+bossName:''),triple:'FFA 1v1v1'};
      const el=document.getElementById('onlineModeDisplayText');
      if(el) el.textContent=names[data.mode]||data.mode;
      _applyOnlineModeUI(data.mode);
    }
    // Host: chequear si ya se puede iniciar
    if(iSentReady && myPlayerNum===1){
      const needed=onlinePlayerCount===3?[2,3]:[2];
      if(needed.every(n=>opponentConfigs[n])) startOnlineGame();
    }
  } else if(data.type==='roulette_start'){
    if(myPlayerNum !== 1) showRouletteWaiting();
  } else if(data.type==='player_left'){
    // Un guest notificó que se va de forma intencional
    handleWsMessage({ type: 'opponent_disconnected', who: data.playerNum });
  } else if(data.type==='forfeit'){
    // El rival abandonó — contamos victoria para quien NO abandonó
    if(document.getElementById('gameScreen').classList.contains('active')){
      var winner = (data.playerNum === 1) ? p2 : p1;
      _addLog('— <strong>' + (data.playerNum===1?p1.name:p2.name) + ' abandonó la partida.</strong>');
      endGame_Standard(winner);
    }
  } else if(data.type==='game_state'){
    receiveGameState(data.state);
  } else if(data.type==='mode_update'){
    // El anfitrión cambió el modo — actualizar display en tiempo real
    onlineGameMode=data.mode;
    if(data.bossIdx!==undefined){ selectedBossIdx=data.bossIdx; BOSS_CARD=BOSSES[selectedBossIdx]; }
    const bossName=data.bossIdx!==undefined?BOSSES[data.bossIdx].name:'';
    const names={standard:'Estándar',hand3:'Estándar — Mano de 3',draft:'Estándar — Draft',espejo:'Estándar — Espejo',caos:'Estándar — Caos',rapido:'Estándar — Rápido',boss:'Modo Jefe 2v1'+(bossName?' — '+bossName:'')};
    const el=document.getElementById('onlineModeDisplayText');
    if(el) el.textContent=names[data.mode]||data.mode;
    draftMode=(data.mode==='draft');
    _applyOnlineModeUI(data.mode); // actualizar UI del mazo para el invitado
  } else if(data.type==='deck_size_update'){
    // Invitado: actualizar slider con el tamaño del anfitrión
    const sizeEl=document.getElementById('onlineMySize');
    const sizeVal=document.getElementById('onlineMySizeVal');
    if(sizeEl){ sizeEl.value=data.deckSize; }
    if(sizeVal){ sizeVal.textContent=data.deckSize; }
    updateOnlineDeckCount();
  } else if(data.type==='reset_lobby'){
    doResetToLobby('guest');
  } else if(data.type==='request_resync'){
    // Invitado pidió resync → host reenvía estado
    if(myPlayerNum===1) sendGameState(true);
  } else if(data.type==='opponent_joined'){
    // Jugador 2 se unió → notificar al host
    setOnlineStatus('✓ Rival conectado — configura tu mazo y pulsa ¡Listo!','#7affaa');
    if(_fbRoomRef) _fbSend({type:'mode_update', mode:onlineGameMode, bossIdx:selectedBossIdx});
    // Guardar cosméticos de P2 y enviarle los propios
    if(data.avatar !== undefined) _onlineOpponentCosm = {avatar:data.avatar, avbg:data.avbg, frame:data.frame, title:data.title||0};
    (function(){ var c=_loadCosmetics(); _fbSend({type:'cosm_info',avatar:c.avatar,avbg:c.avbg,frame:c.frame,title:c.title}); })();
    if(iSentReady) relaySentReady();
  } else if(data.type==='third_joined'){
    // 3er jugador se unió → forzar FFA
    forceTripleMode();
    setOnlineStatus('⚡ 3 jugadores conectados — Modo FFA activado','#c4b0ff');
    if(iSentReady) relaySentReady();
  } else if(['draft_start','draft_waiting','draft_pair','draft_pick','draft_pick_result','draft_done'].indexOf(data.type)!==-1){
    if(typeof _draftHandleRelay==='function') _draftHandleRelay(data);
  }
}

function sendOnlineReady(){
  let deckIds=[...mySel];
  let deckSize=parseInt(document.getElementById('onlineMySize').value);
  // Rápido: asignar 3 cartas desbloqueadas al azar automáticamente
  if(onlineGameMode==='rapido'){
    const unlocked=shuffle(CARD_POOL.filter(c=>_isCardUnlocked(c.id)));
    deckIds=unlocked.slice(0,3).map(c=>c.id);
    deckSize=3;
  }
  // Draft: mazo vacío — el draft asignará las cartas
  if(onlineGameMode==='draft'){ deckIds=[]; }
  // Espejo invitado: mazo vacío (el host usará su propio mazo para ambos)
  if(onlineGameMode==='espejo' && myPlayerNum===2){ deckIds=[]; deckSize=6; }
  const config={type:'player_ready',playerNum:myPlayerNum,
    name:document.getElementById('onlineMyName').value||'Jugador '+myPlayerNum,
    deckIds, deckSize, mode:onlineGameMode, bossIdx:selectedBossIdx};
  iSentReady=true;
  document.getElementById('onlineReadyBtn').disabled=true;
  document.getElementById('onlineReadyStatus').textContent='Esperando al rival…';
  _fbSend(config);
  // El overlay de ruleta se mostrará cuando llegue el primer game_state del host
  // Host: intentar iniciar si ya tenemos todas las configs necesarias
  if(myPlayerNum===1){
    const needed=onlinePlayerCount===3?[2,3]:[2];
    if(needed.every(n=>opponentConfigs[n])) startOnlineGame();
  }
}

function relaySentReady(){
  if(!_fbRoomRef) return;
  _fbSend({type:'player_ready',playerNum:myPlayerNum,
    name:document.getElementById('onlineMyName').value||'Jugador '+myPlayerNum,
    deckIds:[...mySel],deckSize:parseInt(document.getElementById('onlineMySize').value),
    mode:onlineGameMode, bossIdx:selectedBossIdx});
}

/* ── Iniciar juego (solo host) ── */
function startOnlineGame(){
  hideConnLost(); // limpiar overlay si quedó de partida anterior
  _clearGameOverResend(); // cancelar resend de fin de partida anterior si quedó activo
  const myCfg={name:document.getElementById('onlineMyName').value||'Jugador '+myPlayerNum,
    deckIds:[...mySel],deckSize:parseInt(document.getElementById('onlineMySize').value),
    bossIdx:selectedBossIdx};
  // Reconstruir configs de todos los jugadores
  const cfgs={};
  cfgs[myPlayerNum]=myCfg;
  Object.assign(cfgs, opponentConfigs);
  let p1Cfg=cfgs[1]||myCfg;
  let p2Cfg=cfgs[2]||myCfg;
  const p3Cfg=cfgs[3]||null;
  // Modo: el host elige; si soy invitado uso el del host
  const hostCfg=cfgs[1];
  const mode=myPlayerNum===1?onlineGameMode:(hostCfg?hostCfg.mode||'standard':onlineGameMode);
  onlineGameMode=mode;

  currentPlayer=1; turnNumber=1; attackUsed=false; _stateSeq=0;
  isOnline=true; logEntries=[];
  _startConnListener();
  document.getElementById('logWrap').innerHTML='';

  // Rápido: auto-asignar 3 cartas desbloqueadas para el host (mySel está vacío porque el picker estaba oculto)
  if(mode==='rapido'){
    if(!p1Cfg.deckIds||p1Cfg.deckIds.length===0){
      const unlocked=shuffle(CARD_POOL.filter(c=>_isCardUnlocked(c.id)));
      p1Cfg={...p1Cfg, deckIds:unlocked.slice(0,3).map(c=>c.id), deckSize:3};
    }
    if(!p2Cfg.deckIds||p2Cfg.deckIds.length===0){
      const unlocked=shuffle(CARD_POOL.filter(c=>_isCardUnlocked(c.id)));
      p2Cfg={...p2Cfg, deckIds:unlocked.slice(0,3).map(c=>c.id), deckSize:3};
    }
  }
  // Espejo: p2 recibe el mismo mazo que p1 (barajado de forma independiente)
  if(mode==='espejo'){ p2Cfg={...p2Cfg, deckIds:[...(p1Cfg.deckIds||[])], deckSize:p1Cfg.deckSize||6}; }
  // Draft: delegar completamente al flujo de draft
  if(mode==='draft'){
    _caosActive=false;
    gameMode='standard';
    draftMode=true;
    _draftSize=parseInt(document.getElementById('onlineMySize').value)||6;
    _startDraft();
    return;
  }
  // Caos: activar el modificador
  _caosActive=(mode==='caos'); _caosEffect=null; _caosShieldDefender=null;
  // Normalizar gameMode: espejo juega como standard (no cambia lógica); caos MANTIENE su tag para que el invitado lo detecte
  gameMode = (mode==='espejo') ? 'standard' : mode;

  if(mode==='hand3'){
    const makeH3=(num,cfg)=>{
      const all=shuffle(cfg.deckIds.map(id=>makeCard(CARD_POOL.find(c=>c.id===id))));
      const hand=all.splice(0,3);
      return {num,name:cfg.name,active:null,pile:all,hand,needsToPlay:true};
    };
    p1=makeH3(1,p1Cfg); p2=makeH3(2,p2Cfg);
    buildGameUI_Hand3();
    showScreen('gameScreen');
    addLog('¡Partida online Mano de 3! '+p1.name+' vs '+p2.name+'.','log-sys');
  } else if(mode==='boss'){
    const makeStd=(num,cfg)=>{
      const cards=shuffle(cfg.deckIds.map(id=>makeCard(CARD_POOL.find(c=>c.id===id))));
      const active=cards.shift();
      return {num,name:cfg.name,active,pile:cards};
    };
    p1=makeStd(1,p1Cfg); p2=makeStd(2,p2Cfg);
    // Si el host mandó bossIdx, usarlo
    if(p1Cfg.bossIdx!==undefined){ selectedBossIdx=p1Cfg.bossIdx; BOSS_CARD=BOSSES[selectedBossIdx]; }
    boss={card:makeCard(BOSS_CARD),name:BOSS_CARD.name};
    boss.card.hp=boss.card.maxHp=2000;
    buildGameUI_OnlineBoss2v1();
    showScreen('gameScreen');
    addLog('¡Modo Jefe 2v1! '+p1.name+' y '+p2.name+' vs '+BOSS_CARD.name+' ('+boss.card.maxHp+' HP).','log-sys');
    addLog('Turno de '+p1.name+'.','log-sys');
    _showBossIntro(BOSS_CARD, function(){ _switchBgm(_bgmBossBattle); });
  } else if(mode==='triple'){
    p1=triplePlayerObj(1,p1Cfg);
    p2=triplePlayerObj(2,p2Cfg);
    p3=triplePlayerObj(3,p3Cfg||{name:'Jugador 3',deckIds:p1Cfg.deckIds});
    pendingTarget=0;
    buildGameUI_Triple();
    showScreen('gameScreen');
    addLog('¡FFA 1v1v1! '+p1.name+' vs '+p2.name+' vs '+p3.name+'.','log-sys');
  } else {
    const makeStd=(num,cfg)=>{
      const cards=shuffle(cfg.deckIds.map(id=>makeCard(CARD_POOL.find(c=>c.id===id))));
      const active=cards.shift();
      return {num,name:cfg.name,active,pile:cards};
    };
    p1=makeStd(1,p1Cfg); p2=makeStd(2,p2Cfg);
    buildGameUI_Standard();
    showScreen('gameScreen');
    addLog('¡Partida online! '+p1.name+' vs '+p2.name+'.','log-sys');
  }
  // Mostrar botones de control solo al anfitrión
  if(myPlayerNum===1){
    document.getElementById('resetLobbyBtn').style.display='';
    document.getElementById('skipCycleBtn').style.display='';
  }
  // Botón Sync visible para todos en partida online
  document.getElementById('resyncBtn').style.display='';

  // Anfitrión: ruleta para decidir quién empieza (solo modos no-jefe)
  if(mode !== 'boss'){
    // Avisar a los guests para que muestren el overlay de espera
    if(_fbRoomRef) _fbSend({type:'roulette_start'});
    const roulPlayers = mode==='triple'
      ? [{num:1,name:p1.name,color:ROUL_COLORS[0]},{num:2,name:p2.name,color:ROUL_COLORS[1]},{num:3,name:p3.name,color:ROUL_COLORS[2]}]
      : [{num:1,name:p1.name,color:ROUL_COLORS[0]},{num:2,name:p2.name,color:ROUL_COLORS[1]}];
    showRoulette(roulPlayers, startNum=>{
      currentPlayer=startNum;
      addLog('— Turno 1: '+(startNum===1?p1:startNum===2?p2:p3).name+' comienza —','log-sys');
      renderGame();
      sendGameState();
    });
  } else {
    renderGame();
    sendGameState();
  }
}

/* ── Recibir estado del servidor ── */
function receiveGameState(state){
  // Si el juego aún no está activo (nueva partida), resetear seq para no rechazar el primer estado
  const _onGame = document.getElementById('gameScreen').classList.contains('active');
  if(!_onGame) _stateSeq = 0;

  // Ignorar estados más viejos que el actual (por número de secuencia)
  if(state.seq !== undefined && state.seq < _stateSeq){
    console.log('[NEXUS] receiveGameState BLOQUEADO | state.seq:', state.seq, '< _stateSeq:', _stateSeq, '| turno recibido:', state.tn, '| go:', !!state.go);
    return;
  }
  if(state.seq !== undefined){
    console.log('[NEXUS] receiveGameState ACEPTADO | seq:', state.seq, '→', _stateSeq, '| turno:', state.tn, '| go:', !!state.go, '| p1pile:', state.p1?.pids?.length, '| p2pile:', state.p2?.pids?.length);
    _stateSeq = state.seq;
  }

  // Cerrar overlay de draft si quedó abierto (invitado al terminar el draft)
  var _drov = document.getElementById('draftOverlay');
  if(_drov && _drov.style.display!=='none'){ _drov.style.display='none'; draftMode=false; }

  p1=unpackPlayer(state.p1); p2=unpackPlayer(state.p2);
  currentPlayer=state.cp; turnNumber=state.tn; attackUsed=state.au;
  isOnline=true; logEntries=state.log||[];
  if(gameMode==='triple' && state.cp !== undefined && state.cp !== myPlayerNum){
    pendingTarget=0;
  }
  const incomingMode=state.gm||'standard';
  const onGame=document.getElementById('gameScreen').classList.contains('active');
  if(!onGame || gameMode!==incomingMode){
    gameMode=incomingMode; onlineGameMode=incomingMode;
    _caosActive=(incomingMode==='caos'); _caosShieldDefender=null;
    document.getElementById('logWrap').innerHTML='';
    if(gameMode==='triple') buildGameUI_Triple();
    else if(gameMode==='boss'){
      boss={card:null,name:BOSS_CARD.name}; buildGameUI_OnlineBoss2v1();
      showScreen('gameScreen');
      _showBossIntro(BOSS_CARD, function(){ _switchBgm(_bgmBossBattle); });
    }
    else if(gameMode==='hand3') buildGameUI_Hand3();
    else buildGameUI_Standard();
    if(gameMode!=='boss') showScreen('gameScreen');
  }
  // Cerrar overlay de ruleta si estaba visible (llegó el primer game_state)
  var rov=document.getElementById('rouletteOverlay');
  if(rov && rov.style.display!=='none') rov.style.display='none';
  // Resetear timer de reconexión — recibimos datos, conexión OK
  _startConnListener();
  // Sincronizar efecto de Caos del jugador activo
  if(state.ce !== undefined){ _caosEffect=state.ce; _renderCaosBanner(); }
  if(gameMode==='triple' && state.p3) p3=unpackPlayer(state.p3);
  if(gameMode==='boss' && state.boss){
    if(state.bi!==undefined && state.bi!==selectedBossIdx){
      selectedBossIdx=state.bi; BOSS_CARD=BOSSES[selectedBossIdx];
    }
    if(!boss) boss={};
    boss.card=unpackBossCard(state.boss); boss.name=BOSS_CARD.name;
  }
  const logWrap=document.getElementById('logWrap');
  logWrap.innerHTML='';
  logEntries.forEach(e=>{ const div=document.createElement('div'); div.className=e.cls; div.innerHTML=e.html; logWrap.appendChild(div); });
  logWrap.scrollTop=logWrap.scrollHeight;

  // ── Detectar fin de partida enviado por el otro jugador ──
  if(state.go){
    // Si ya estamos en la pantalla fin, ignorar reenvíos duplicados
    if(document.getElementById('endScreen').classList.contains('active')) return;
    renderGame(); // actualizar tablero con el estado final
    const go=state.go;
    const titleEl=document.getElementById('endTitle');
    const subEl=document.getElementById('endSub');
    if(go.tripleWinner !== undefined){
      _humanWon = go.tripleWinner===myPlayerNum;
      titleEl.textContent=(go.winnerName||'Alguien')+' gana el FFA';
      titleEl.className='end-title end-win end-win-glow';
      subEl.textContent='Los demás retadores cayeron en el turno '+(go.turn||turnNumber)+'.';
    } else if(go.bossWinner !== undefined){
      _humanWon = go.bossWinner==='players';
      if(go.bossWinner==='players'){
        titleEl.textContent='¡VICTORIA!'; titleEl.className='end-title end-win-glow';
        subEl.textContent=(p1.name||'J1')+' y '+(p2.name||'J2')+' derrotaron a '+(go.bossName||BOSS_CARD.name)+' juntos.';
      } else {
        titleEl.textContent='DERROTA'; titleEl.className='end-title end-lose-glow';
        subEl.textContent=(go.bossName||BOSS_CARD.name)+' devoró a ambos retadores.';
      }
    } else if(go.winnerNum !== undefined){
      _humanWon = go.winnerNum===myPlayerNum;
      const winner=go.winnerNum===1?p1:p2;
      const loser=go.winnerNum===1?p2:p1;
      titleEl.textContent=_humanWon ? (go.winnerName||winner.name||'Tú')+' gana' : 'Derrota';
      titleEl.className=_humanWon?'end-title end-win end-win-glow':'end-title end-lose end-lose-glow';
      subEl.textContent='Turno '+(go.turn||turnNumber)+'. '+(loser.active?loser.active.name+' fue la última carta en caer.':loser.name+' se quedó sin cartas.');
    }
    _clearGameOverResend(); // receptor confirmó — detener reenvíos
    showEndScreen();
    return;
  }

  renderGame();
  // Resync: arrancar si es mi turno O si es turno del jefe (nadie tiene isMyTurn() pero necesitamos la IA)
  if(isMyTurn() || (gameMode==='boss' && currentPlayer==='boss')) _startResync(); else _stopResync();
  // Si el host recibe estado con turno del boss, dispara la IA
  if(gameMode==='boss' && currentPlayer==='boss' && myPlayerNum===1){
    setTimeout(runBossAI_Online, 1900);
  }
  // Triple: detectar fin de partida en jugadores no atacantes (fallback)
  if(gameMode==='triple'){
    const alive=tripleAlivePlayers();
    if(alive.length<=1 && document.getElementById('gameScreen').classList.contains('active')){
      const w=alive[0]||currentPlayer;
      const winner=triplePlayerByNum(w);
      const titleEl=document.getElementById('endTitle');
      const subEl=document.getElementById('endSub');
      _humanWon = w===myPlayerNum;
      if(titleEl){ titleEl.textContent=(winner&&winner.name?winner.name:'Alguien')+' gana el FFA'; titleEl.className='end-title end-win end-win-glow'; }
      if(subEl) subEl.textContent='Los demás retadores cayeron en el turno '+turnNumber+'.';
      showEndScreen();
    }
  }
}

/* ── Skip de ciclo (botón de emergencia para el host) ── */
function nextOnlinePlayer(cp){
  if(gameMode==='triple')              return cp===1?2:cp===2?3:1;
  if(gameMode==='boss' && isOnline){   return cp===1?2:cp===2?'boss':1; }
  return cp===1?2:1; // 1v1
}

function forceResync(){
  if(!isOnline || !_fbRoomRef) return;
  if(myPlayerNum === 1){
    // Host: reenvía su estado autoritativo
    sendGameState(true);
  } else {
    // Invitado: pide al host que reenvíe
    _fbSend({ type:'request_resync' });
  }
}

function forceSkipCycle(){
  if(!isOnline || myPlayerNum!==1) return;
  if(_gameOverResend){ alert('La partida ya terminó — espera la pantalla de fin.'); return; }
  if(!confirm('⚡ Forzar avance de ciclo de turnos?\n(Usa esto solo si la partida quedó trabada)')) return;
  // Ciclo completo: 1v1 = 2 pasos, boss/triple = 3 pasos
  const steps = (gameMode==='triple' || (gameMode==='boss' && isOnline)) ? 3 : 2;
  for(let i=0;i<steps;i++){
    const next = nextOnlinePlayer(currentPlayer);
    if(next===1) turnNumber++; // nuevo "ronda" al volver al jugador 1
    currentPlayer = next;
  }
  attackUsed = false;
  // Cancelar IA del jefe pendiente para no acumular ejecuciones
  if(_bossAITimeout){ clearTimeout(_bossAITimeout); _bossAITimeout=null; }
  addLog('⚡ <i>Ciclo de turnos forzado por el host.</i>', 'log-sys');
  // Si terminamos en turno del jefe, relanzar la IA
  if(gameMode==='boss' && currentPlayer==='boss' && isOnline) scheduleBossAI(500);
  sendGameState();
  renderGame();
}

