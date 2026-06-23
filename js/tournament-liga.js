/* ═══════════════════════════════════════════════
   MODO FIESTA LIGA — PASO 1: DATOS Y CALENDARIO
═══════════════════════════════════════════════ */

// ─── 35 Facciones IA ───
const LIGA_FACTIONS = [
  {name:'Vórtex Carmesí',      icon:'🔴'},
  {name:'Orden del Éter',       icon:'🔵'},
  {name:'Sombra Fracturada',    icon:'⚫'},
  {name:'Legión Primordial',    icon:'🟤'},
  {name:'Caos Ascendente',      icon:'🌀'},
  {name:'Cristal Oscuro',       icon:'💎'},
  {name:'Heraldos del Trueno',  icon:'⚡'},
  {name:'Llamas del Abismo',    icon:'🔥'},
  {name:'Tormenta Índigo',      icon:'🌊'},
  {name:'Eco del Vacío',        icon:'🌑'},
  {name:'Hijos del Crepúsculo', icon:'🌅'},
  {name:'Vorágine Astral',      icon:'🌌'},
  {name:'Pacto de Sangre',      icon:'🩸'},
  {name:'Muralla de Ceniza',    icon:'🪨'},
  {name:'Espíritus del Nether', icon:'👻'},
  {name:'Bestias del Umbral',   icon:'🐉'},
  {name:'Centinelas del Nexo',  icon:'🛡️'},
  {name:'Imperio Espectral',    icon:'👑'},
  {name:'Dracones de Obsidiana',icon:'🦎'},
  {name:'Forjadores de Almas',  icon:'⚒️'},
  {name:'Ira Celeste',          icon:'☄️'},
  {name:'Marea Oscura',         icon:'🌊'},
  {name:'Portadores del Eclipse',icon:'🌒'},
  {name:'Señores del Vacío',    icon:'🕳️'},
  {name:'Vanguardia Arcana',    icon:'🔮'},
  {name:'Orden de la Penumbra', icon:'🌫️'},
  {name:'Fragmentos del Caos',  icon:'💥'},
  {name:'Custodios del Abismo', icon:'⛓️'},
  {name:'Runa Sangrienta',      icon:'🗡️'},
  {name:'Almas Errantes',       icon:'💀'},
  {name:'Guardianes del Nexo',  icon:'🔱'},
  {name:'Tinieblas Eternas',    icon:'🌙'},
  {name:'Ecos del Infinito',    icon:'♾️'},
  {name:'Colmena Mente',        icon:'🧠'},
  {name:'Convergencia Arcana',  icon:'✨'},
];

// ─── Estado del torneo ───
let ligaState     = null;
let ligaSetupMode = false;

// ─── Generador de calendario (método círculo) ───
// 36 equipos, 8 jornadas, cada equipo juega 1 vez por jornada
// Índice 35 = jugador (fijo), índices 0-34 = IA (rotan)
function _ligaGenSchedule(shuffledAI) {
  // shuffledAI: array de 35 índices [0..34] en orden aleatorio
  const FIXED = 35;          // jugador
  const rot   = shuffledAI;  // 35 elementos
  const n1    = rot.length;  // 35
  const rounds = [];

  for (let r = 0; r < 8; r++) {
    const round = [];
    // Partido fijo: jugador vs rot[r]
    round.push({ homeIdx: FIXED, awayIdx: rot[r], homeKills: 0, awayKills: 0, played: false, isDraw: false });
    // Otros 17 partidos: emparejar el resto del círculo
    for (let i = 1; i <= Math.floor(n1 / 2); i++) {
      const a = rot[(r + i)      % n1];
      const b = rot[(r + n1 - i) % n1];
      round.push({ homeIdx: a, awayIdx: b, homeKills: 0, awayKills: 0, played: false, isDraw: false });
    }
    rounds.push(round);
  }
  return rounds;
}

// ─── Inicializar torneo ───
function _ligaInitTournament(playerName, playerDeck) {
  // Construir participantes: índices 0-34 = IA, 35 = jugador
  const participants = LIGA_FACTIONS.map((f, i) => ({
    name: f.name, icon: f.icon,
    deck: partyMakeAIDeck(playerDeck.length),   // misma cantidad que el jugador
    isPlayer: false,
    origIdx: i,
    pj:0, g:0, e:0, p:0, pts:0, kills:0
  }));
  participants.push({
    name: playerName, icon: '⚔️',
    deck: playerDeck,
    isPlayer: true,
    origIdx: 35,
    pj:0, g:0, e:0, p:0, pts:0, kills:0
  });

  // Mezclar índices IA para el calendario
  const aiIndices = Array.from({length: 35}, (_, i) => i);
  for (let i = aiIndices.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [aiIndices[i], aiIndices[j]] = [aiIndices[j], aiIndices[i]];
  }

  ligaState = {
    playerName,
    playerDeck,
    participants,
    schedule: _ligaGenSchedule(aiIndices),
    currentJornada: 0,
    phase: 'liga',
    _pendingLeagueMatch: null,
    _pendingKnockout:    null,
    playoffs: [],
    r16:      [],
    qf:       [],
    sf:       [],
    final:    null,
    log:      [],
    sfLosers: [],
    _playerKnockoutFlawless: true,  // se vuelve false si el jugador pierde CUALQUIER partido de la llave
  };
}

// ─── Interceptar "Elegir nombre ▶" tras elegir mazo ───
function _ligaInterceptStart() {
  ligaSetupMode = false;
  // Guardar IDs del mazo seleccionado (igual que p1sel en el setup)
  const savedDeck = [...p1sel];
  if (!savedDeck.length) { alert('Elige al menos una carta.'); return; }

  // Ir a la pantalla de nombre de equipo
  _ligaShowNameScreen(savedDeck);
}

// ─── Entry point ───
function launchLigaMode() {
  const _saved = _loadTourneyProgress('liga');
  if(_saved){
    _showTourneyResumeModal(_saved,
      function(){ _restoreTourneyProgress(_saved); },
      function(){ _clearTourneyProgress(); _launchLigaModeNew(); }
    );
    return;
  }
  _launchLigaModeNew();
}
function _launchLigaModeNew() {
  partyState = null; partySetupMode = false;
  ligaSetupMode = true;
  botMode       = true;
  _launchSetup('standard');
  document.getElementById('setupHeader').innerHTML =
    '<span style="background:linear-gradient(90deg,#4a90d9,#8b5cf6,#c9a84c,#8b5cf6,#4a90d9);background-size:200%;-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;animation:liga-shimmer 3s ease infinite;font-family:var(--font-title);font-size:10px;letter-spacing:.2em">NEXUS LEAGUE</span> — ELIGE TU MAZO';
  document.getElementById('startBtn').textContent = 'Elegir nombre ▶';
  document.getElementById('setupBackBtn').onclick = () => {
    ligaSetupMode = false;
    showScreen('botModeScreen');
  };
  // El nombre del equipo se elige en la siguiente pantalla
  const _pn = document.getElementById('p1name');
  if (_pn && _pn.parentElement) _pn.parentElement.style.display = 'none';
}

// ─── Paso 2: Pantalla de nombre ───
function _ligaShowNameScreen(savedDeck) {
  window._ligaPendingDeck = savedDeck;
  const input = document.getElementById('ligaTeamNameInput');
  input.value = '';
  document.getElementById('ligaNameConfirmBtn').disabled = true;
  showScreen('ligaNameScreen');
}

function _ligaNameBack() {
  // Volver a la selección de mazo
  window._ligaPendingDeck = null;
  ligaSetupMode = true;
  botMode = true;
  _launchSetup('standard');
  document.getElementById('setupHeader').innerHTML =
    '<span style="background:linear-gradient(90deg,#4a90d9,#8b5cf6,#c9a84c,#8b5cf6,#4a90d9);background-size:200%;-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;animation:liga-shimmer 3s ease infinite;font-family:var(--font-title);font-size:10px;letter-spacing:.2em">NEXUS LEAGUE</span> — ELIGE TU MAZO';
  document.getElementById('startBtn').textContent = 'Elegir nombre ▶';
  document.getElementById('setupBackBtn').onclick = () => {
    ligaSetupMode = false;
    showScreen('botModeScreen');
  };
  // El nombre del equipo se elige en la siguiente pantalla
  const _pn2 = document.getElementById('p1name');
  if (_pn2 && _pn2.parentElement) _pn2.parentElement.style.display = 'none';
}

var _LIGA_INTRO_TAGLINES = [
  'Solo los más fuertes alzan el trofeo.',
  'Treinta y seis facciones. Un campeón.',
  'La gloria no se negocia. Se conquista.',
  'El torneo más duro de Nexus Arcana.',
  'Han entrenado toda la vida para este momento.',
  'El destino de una facción empieza aquí.',
  'Que comience la leyenda.',
];

var _ligaIntroTimeout = null;

function _ligaNameConfirm() {
  const name = document.getElementById('ligaTeamNameInput').value.trim();
  if (!name) return;
  const deck = window._ligaPendingDeck;
  window._ligaPendingDeck = null;
  _ligaInitTournament(name, deck);
  document.getElementById('ligaTablePhaseLabel').textContent  = 'FASE DE LIGA';
  document.getElementById('ligaTableJornadaLabel').textContent = 'CLASIFICACIÓN PREVIA — JORNADA 1 / 8';
  renderLigaTable();
  document.getElementById('ligaTableActions').innerHTML =
    `<button class="btn btn-primary" onclick="_ligaStartJornada()">Comenzar Jornada 1 ▶</button>`;
  showScreen('ligaTableScreen');
  _showLigaIntro(name);
}

function _toRoman(n){
  var vals=[1000,900,500,400,100,90,50,40,10,9,5,4,1];
  var syms=['M','CM','D','CD','C','XC','L','XL','X','IX','V','IV','I'];
  var r='';
  for(var i=0;i<vals.length;i++){while(n>=vals[i]){r+=syms[i];n-=vals[i];}}
  return r;
}

function _showLigaIntro(name) {
  const overlay  = document.getElementById('ligaIntroOverlay');
  const nameEl   = document.getElementById('ligaIntroName');
  const tagEl    = document.getElementById('ligaIntroTagline');
  const seasonEl = document.getElementById('ligaIntroSeason');
  const season   = _toRoman((_loadStats().ligaPlayed || 0) + 1);
  if(seasonEl) seasonEl.textContent = 'TEMPORADA ' + season + ' · 36 FACCIONES · LA GLORIA OS ESPERA';
  // Resetear animaciones re-clonando el contenido
  nameEl.textContent = name.toUpperCase();
  tagEl.textContent  = _LIGA_INTRO_TAGLINES[Math.floor(Math.random()*_LIGA_INTRO_TAGLINES.length)];
  // Forzar reflow para reiniciar animaciones CSS
  overlay.classList.remove('active');
  void overlay.offsetWidth;
  overlay.classList.add('active');
  _switchBgm(_bgmLeague);
  // Re-trigger animations on children by forcing reflow
  overlay.querySelectorAll('[style*="animation"], .liga-intro-league, .liga-intro-presents, .liga-intro-name, .liga-intro-tagline, .liga-intro-season, .liga-intro-skip, .liga-intro-line').forEach(el => {
    el.style.animation = 'none';
    void el.offsetWidth;
    el.style.animation = '';
  });
  if(_ligaIntroTimeout) clearTimeout(_ligaIntroTimeout);
  _ligaIntroTimeout = setTimeout(_ligaIntroDone, 4800);
}

function _ligaIntroSkip() {
  if(_ligaIntroTimeout){ clearTimeout(_ligaIntroTimeout); _ligaIntroTimeout = null; }
  _ligaIntroDone();
}

function _ligaIntroDone() {
  const overlay = document.getElementById('ligaIntroOverlay');
  overlay.style.transition = 'opacity .6s ease';
  overlay.style.opacity = '0';
  setTimeout(function(){
    overlay.classList.remove('active');
    overlay.style.transition = '';
    overlay.style.opacity = '';
  }, 620);
}

/* ── Boss intro ── */
var _bossIntroTimeout = null;
var _bossIntroCallback = null;
var _BOSS_ICONS = { 0:'🌀', '-1':'❄️', '-2':'🪨' };
var _BOSS_SPRITES = { 0:'img/vorathyn_pixel.png', '-1':'img/seraveth pixel.png', '-2':'img/morvack_pixel.png' };


function _showBossIntro(boss, onDone){
  _bossIntroCallback = onDone || null;
  var overlay  = document.getElementById('bossIntroOverlay');
  var iconEl   = document.getElementById('bossIntroIcon');
  var nameEl   = document.getElementById('bossIntroName');
  var titleEl  = document.getElementById('bossIntroTitle');
  var flavorEl = document.getElementById('bossIntroFlavor');
  var bossSpriteSrc = _BOSS_SPRITES[String(boss.id)];
  if(bossSpriteSrc){
    iconEl.innerHTML = '<img src="'+bossSpriteSrc+'" style="height:clamp(8rem,30vw,14rem);width:auto;image-rendering:pixelated;image-rendering:crisp-edges;display:block;margin:0 auto;" onerror="this.parentElement.textContent=_BOSS_ICONS[\''+String(boss.id)+'\']||\'👁\'">';
  } else {
    iconEl.textContent = _BOSS_ICONS[String(boss.id)] || '👁';
  }
  nameEl.textContent   = boss.name.toUpperCase();
  titleEl.textContent  = boss.title || '';
  flavorEl.textContent = boss.flavor || '';
  overlay.classList.remove('active');
  void overlay.offsetWidth;
  overlay.classList.add('active');
  overlay.querySelectorAll('.boss-intro-warning,.boss-intro-icon,.boss-intro-name,.boss-intro-divider,.boss-intro-title,.boss-intro-flavor,.boss-intro-skip').forEach(function(el){
    el.style.animation='none'; void el.offsetWidth; el.style.animation='';
  });
  _switchBgm(_bgmBossBattle);
  if(_bossIntroTimeout) clearTimeout(_bossIntroTimeout);
  _bossIntroTimeout = setTimeout(_bossIntroDone, 5000);
}

function _bossIntroSkip(){
  if(_bossIntroTimeout){ clearTimeout(_bossIntroTimeout); _bossIntroTimeout=null; }
  _bossIntroDone();
}

function _bossIntroDone(){
  var overlay = document.getElementById('bossIntroOverlay');
  overlay.style.transition='opacity .5s ease';
  overlay.style.opacity='0';
  setTimeout(function(){
    overlay.classList.remove('active');
    overlay.style.transition='';
    overlay.style.opacity='';
    if(_bossIntroCallback){ var cb=_bossIntroCallback; _bossIntroCallback=null; cb(); }
  }, 520);
}

// ─── Helpers de pantallas de fin ───
/* ═══════════════════════════════════════════════════════════
   MODO FIESTA LIGA — PASO 9: INTEGRACIÓN FINAL
═══════════════════════════════════════════════════════════ */

// ─── Mostrar tabla en modo solo-lectura desde el bracket ───
function _ligaShowTableFromBracket(returnRound) {
  renderLigaTable();
  document.getElementById('ligaTableActions').innerHTML =
    `<button class="btn btn-primary" onclick="_ligaShowBracket('${returnRound}')">← Volver al bracket</button>`;
  showScreen('ligaTableScreen');
}

// ─── Limpieza de estado al salir al menú principal ───
function _ligaGoToMenu() {
  ligaState      = null;
  ligaSetupMode  = false;
  botMode        = false;
  _clearTourneyProgress();
  showScreen('titleScreen');
}

// ─── Confirmar abandono de Liga ───
function _ligaAbandonConfirm() {
  if (confirm('¿Seguro que quieres abandonar la Liga? Se perderá todo el progreso.')) {
    _ligaGoToMenu();
  }
}

// ─── Eliminación desde la tabla (evita <strong> dentro de onclick) ───
function _ligaEliminatedInLiga(rank) {
  // Seedear el bracket eliminatorio si aún no existe, para poder simular
  // el resto del torneo (playoffs → final) y mostrar quién ganó.
  if (!ligaState.playoffs || !ligaState.playoffs.length) _ligaInitKnockoutBracket();
  _ligaShowElimination('liga',
    `Terminaste en el puesto <strong>${rank}°</strong> de 36 equipos.`
    + `<br><span style="font-size:10px;color:var(--text-dim)">No clasificaste a los Playoffs.</span>`);
}

// ─── Helper: fase actual del bracket (para botón "Ver bracket" en elim) ───
function _ligaCurrentPhase() {
  if (!ligaState) return 'playoffs';
  if (ligaState.final && ligaState.final.played)              return 'final';
  if (ligaState.sf    && ligaState.sf.some(t=>t.played1))     return 'sf';
  if (ligaState.qf    && ligaState.qf.some(t=>t.played1))     return 'qf';
  if (ligaState.r16   && ligaState.r16.some(t=>t.played1))    return 'r16';
  if (ligaState.playoffs && ligaState.playoffs.some(t=>t.played1)) return 'playoffs';
  return 'playoffs';
}

// ─── Helper: construir la ruta del jugador por el torneo ───
function _ligaBuildRoute() {
  if (!ligaState) return '';
  const p    = ligaState.participants[35];
  const rank = _ligaGetPlayerRank();
  const lines = [];
  lines.push(`📋 ${rank}° en la Fase de Liga — ${p.pts} pts · ${p.kills} KO`);

  if (rank > 8) {
    // Pasó por playoffs
    const poTie = (ligaState.playoffs||[]).find(t=>t.home&&(t.home.isPlayer||t.away&&t.away.isPlayer));
    if (poTie && poTie.winner) {
      const hT=poTie.kills1H+poTie.kills2H, aT=poTie.kills1A+poTie.kills2A;
      const won = poTie.winner.isPlayer;
      lines.push(`${won?'✅':'❌'} Playoffs ${hT}–${aT} → ${won?'Clasificado':'Eliminado'}`);
    }
  } else {
    lines.push('⏭️ Clasificado directo a Octavos');
  }

  const steps = [
    { key:'r16', label:'Octavos' },
    { key:'qf',  label:'Cuartos' },
    { key:'sf',  label:'Semis'   },
  ];
  steps.forEach(({key, label}) => {
    const arr = ligaState[key] || [];
    const tie = arr.find(t=>t.home&&(t.home.isPlayer||(t.away&&t.away.isPlayer)));
    if (!tie || !tie.played1) return;
    const hT=tie.kills1H+tie.kills2H, aT=tie.kills1A+tie.kills2A;
    const won = tie.winner && tie.winner.isPlayer;
    lines.push(`${won?'✅':'❌'} ${label} — Global ${hT}–${aT} → ${won?'Avanzó':'Eliminado'}`);
  });

  const fin = ligaState.final;
  if (fin && fin.played) {
    const won = fin.winner && fin.winner.isPlayer;
    lines.push(`${won?'🏆':'🥈'} Final — ${fin.homeKills}–${fin.awayKills} → ${won?'¡CAMPEÓN!':'Subcampeón'}`);
  } else if (fin && fin.winner && !fin.winner.isPlayer) {
    // Mostrar campeón simulado si el jugador no llegó a la final
    lines.push(`🏆 Campeón: ${fin.winner.icon||''} ${fin.winner.name}`);
  }

  return lines.join('<br>');
}

// ─── Pantalla de eliminación / subcampeón ───
function _ligaShowElimination(reason, detail) {
  const isFinal = reason === 'final';

  // Simular el resto del torneo para que el bracket quede completo
  _ligaSimulateRemainingBracket();

  const trophies = { liga:'😔', playoffs:'🏳️', r16:'🏅', qf:'🥉', sf:'🥈', final:'🥈' };
  const titles   = {
    liga:'ELIMINADO EN LIGA', playoffs:'ELIMINADO EN PLAYOFFS',
    r16:'ELIMINADO EN OCTAVOS', qf:'ELIMINADO EN CUARTOS',
    sf:'ELIMINADO EN SEMIS', final:'SUBCAMPEÓN'
  };

  document.getElementById('ligaElimTrophy').textContent = trophies[reason] || '💔';
  document.getElementById('ligaElimTitle').textContent  = titles[reason]   || 'ELIMINADO';
  document.getElementById('ligaElimSub').innerHTML      = detail || '';
  document.getElementById('ligaElimRoute').innerHTML    = _ligaBuildRoute();

  // Mostrar botón de bracket siempre (ya está simulado)
  const bracketBtn = document.getElementById('ligaElimBracketBtn');
  if (bracketBtn) bracketBtn.style.display = '';

  _clearTourneyProgress();
  var _lChamp = ligaState.final && ligaState.final.winner;
  _trackMatch({ isTournamentOnly:true, ligaEnd:true, ligaBest:reason, ligaWon:false, champName:_lChamp ? _lChamp.name : '—' });
  showScreen('ligaElimScreen');
}

// ─── Pantalla de campeón ───
function _ligaShowChampion() {
  const p    = ligaState.participants[35];
  const rank = _ligaGetPlayerRank();
  document.getElementById('ligaChampSub').innerHTML =
    `<strong>${p.name}</strong> conquista la Nexus League 🏆<br>`
    +`<span style="font-size:10px;color:var(--text-dim);display:block;margin-top:.4rem">`
    +`${rank}° en liga · ${p.pts} pts · ${p.kills} KO</span>`;
  document.getElementById('ligaChampRoute').innerHTML = _ligaBuildRoute();
  _trackMatch({ isTournamentOnly:true, ligaEnd:true, ligaWon:true, champName:(ligaState.participants[35].name||'—') });
  // Invicto de Liga: ganó los 8 de fase de liga Y todas las llaves sin perder un solo partido
  if((ligaState._playerGroupWins||0) >= 8 && ligaState._playerKnockoutFlawless){
    var _sp = _loadStats(); _sp.ligaPerfectGroups = (_sp.ligaPerfectGroups||0)+1; _saveStats(_sp); _checkAchievements(_sp);
  }
  showScreen('ligaChampScreen');
}

/* ═══════════════════════════════════════════════════════════
   MODO FIESTA LIGA — PASO 3: FASE DE LIGA
═══════════════════════════════════════════════════════════ */

// ─── Sim IA vs IA con posibilidad de empate ───
function _ligaSimLeagueMatch(deckA, deckB) {
  if (Math.random() < 0.05) {              // 5 % empate
    const k = Math.min(deckA.length, deckB.length); // todos murieron = kills == tamaño del mazo
    return { isDraw:true, homeKills:k, awayKills:k, homeWon:false };
  }
  const res = partySimMatch(deckA, deckB);
  return { isDraw:res.isDraw||false, homeKills:res.killedA, awayKills:res.killedB, homeWon:res.winner==='A' };
}

// ─── Aplicar resultado a la tabla ───
function _ligaApplyMatchResult(homeIdx, awayIdx, homeKills, awayKills, isDraw, homeWon) {
  const H = ligaState.participants[homeIdx];
  const A = ligaState.participants[awayIdx];
  H.pj++; A.pj++;
  H.kills += homeKills;
  A.kills += awayKills;
  if (isDraw) {
    H.pts++; A.pts++;
    H.e++;   A.e++;
  } else if (homeWon) {
    H.pts += 3; H.g++; A.p++;
  } else {
    A.pts += 3; A.g++; H.p++;
  }
}

// ─── Clasificación ordenada ───
function _ligaGetSortedStandings() {
  return [...ligaState.participants].sort((a,b) => {
    if (b.pts   !== a.pts)   return b.pts   - a.pts;
    if (b.kills !== a.kills) return b.kills - a.kills;
    return a.origIdx - b.origIdx;
  });
}
function _ligaGetPlayerRank() {
  return _ligaGetSortedStandings().findIndex(p => p.isPlayer) + 1;
}

// ─── Renderizar tabla ───
function renderLigaTable() {
  const sorted = _ligaGetSortedStandings();
  const tbody  = document.getElementById('ligaStandingsTbody');
  tbody.innerHTML = '';
  sorted.forEach((p, pos) => {
    const rank = pos + 1;
    let cls = rank<=8 ? 'lt-direct' : rank<=24 ? 'lt-playoff' : 'lt-out';
    if (p.isPlayer) cls += ' lt-player';
    const tr = document.createElement('tr');
    tr.className = cls;
    tr.innerHTML = `<td>${rank}</td><td style="text-align:left">${p.icon} ${p.name}</td>`
      + `<td>${p.pj}</td><td>${p.g}</td><td>${p.e}</td><td>${p.p}</td>`
      + `<td><strong>${p.pts}</strong></td><td>${p.kills}</td>`;
    tbody.appendChild(tr);
  });
}

// ─── Historial de resultados (Paso 5: liga + eliminatorias) ───
function _ligaShowLog(returnScreen) {
  const back = returnScreen || 'ligaTableScreen';
  const list = document.getElementById('ligaLogList');
  list.innerHTML = '';

  if (!ligaState.log.length) {
    list.innerHTML = '<div style="color:var(--text-dim);text-align:center;padding:1rem;font-size:11px">Sin resultados aún.</div>';
    document.getElementById('ligaLogBackBtn').onclick = () => showScreen(back);
    showScreen('ligaLogScreen');
    return;
  }

  const PHASE_HEADERS = {
    playoffs: '— PLAYOFFS —', r16: '— OCTAVOS DE FINAL —',
    qf: '— CUARTOS DE FINAL —', sf: '— SEMIFINALES —', final: '— GRAN FINAL —'
  };

  let lastSection = null;

  ligaState.log.forEach(entry => {
    // Calcular clave de sección
    const section = entry.jornada !== undefined ? `j_${entry.jornada}` : `p_${entry.phase}`;

    if (section !== lastSection) {
      lastSection = section;
      const hdr = document.createElement('div');
      hdr.style.cssText = 'font-weight:700;margin-top:.6rem;font-size:10px;letter-spacing:1px;padding:2px 4px;'
        + (section.startsWith('j_') ? 'color:var(--purple)' : 'color:#c9a84c');

      if (section.startsWith('j_')) {
        hdr.textContent = `— JORNADA ${entry.jornada + 1} —`;
      } else {
        hdr.textContent = PHASE_HEADERS[entry.phase] || `— ${entry.phase.toUpperCase()} —`;
      }
      list.appendChild(hdr);
    }

    const row = document.createElement('div');
    const isP = entry.isPlayer;
    row.style.cssText = 'padding:2px 6px;border-radius:3px;font-size:11px;'
      + (isP ? 'color:#b07af0;font-weight:600;background:rgba(176,122,240,.07)' : 'color:var(--text-muted)');

    let suffix = '';
    if (entry.isDraw) suffix += ' <span style="color:#c9a84c;font-size:9px">(Empate)</span>';
    if (entry.leg && entry.leg > 0) suffix += ` <span style="color:var(--text-dim);font-size:9px">· P${entry.leg}</span>`;

    row.innerHTML = entry.text + suffix;
    list.appendChild(row);
  });

  document.getElementById('ligaLogBackBtn').onclick = () => showScreen(back);
  showScreen('ligaLogScreen');
}

// ─── Iniciar jornada ───
function _ligaStartJornada() {
  const jornada = ligaState.currentJornada;        // 0–7
  const matches = ligaState.schedule[jornada];

  const playerMatchIdx = matches.findIndex(m => m.homeIdx===35 || m.awayIdx===35);

  // Simular 17 partidos de IA
  const simLines = [];
  for (let i = 0; i < matches.length; i++) {
    if (i === playerMatchIdx) continue;
    const m   = matches[i];
    const H   = ligaState.participants[m.homeIdx];
    const A   = ligaState.participants[m.awayIdx];
    const res = _ligaSimLeagueMatch(H.deck, A.deck);
    m.homeKills = res.homeKills; m.awayKills = res.awayKills;
    m.isDraw = res.isDraw; m.played = true;
    _ligaApplyMatchResult(m.homeIdx, m.awayIdx, res.homeKills, res.awayKills, res.isDraw, res.homeWon);
    ligaState.log.push({ jornada, isPlayer:false, isDraw:res.isDraw,
      text:`${H.icon} ${H.name} ${res.homeKills}–${res.awayKills} ${A.icon} ${A.name}` });
    const empate = res.isDraw ? ' <span style="color:#c9a84c;font-size:9px">(E)</span>' : '';
    simLines.push(`${H.icon} ${H.name} <b>${res.homeKills}</b> — <b>${res.awayKills}</b> ${A.icon} ${A.name}${empate}`);
  }

  // Partido del jugador
  const pm         = matches[playerMatchIdx];
  const playerIsHome = pm.homeIdx === 35;
  const oppIdx     = playerIsHome ? pm.awayIdx : pm.homeIdx;
  const opp        = ligaState.participants[oppIdx];
  const player     = ligaState.participants[35];

  ligaState._pendingLeagueMatch = { jornada, matchIdx: playerMatchIdx };

  _partyShowSimModal(
    `JORNADA ${jornada+1} / 8 — RESULTADOS`,
    simLines,
    `⚔️ Tu partido: ${player.icon} ${player.name} vs ${opp.icon} ${opp.name}`,
    () => _ligaLaunchPlayerMatch(playerMatchIdx)
  );
}

// ─── Lanzar partido real del jugador ───
function _ligaLaunchPlayerMatch(matchIdx) {
  const { jornada } = ligaState._pendingLeagueMatch;
  const m           = ligaState.schedule[jornada][matchIdx];
  const playerIsHome= m.homeIdx === 35;
  const oppIdx      = playerIsHome ? m.awayIdx : m.homeIdx;
  const opp         = ligaState.participants[oppIdx];
  const player      = ligaState.participants[35];

  botMode = true; gameMode = 'standard';
  turnNumber = 1; attackUsed = false; isOnline = false; logEntries = [];
  document.getElementById('logWrap').innerHTML = '';

  const makeLP = (name, deckIds) => {
    const cards = shuffle(deckIds.map(id => makeCard(CARD_POOL.find(c => c.id===id))));
    return { name, active: cards.shift(), pile: cards, kills: 0 };
  };

  p1 = makeLP(player.name, player.deck);
  p2 = makeLP(`${opp.icon} ${opp.name}`, opp.deck);
  p1.num = 1; p2.num = 2;
  window._gameP1Deck = [...player.deck];
  window._gameCardKOs = {};

  buildGameUI_Standard();
  showScreen('gameScreen');
  addLog(`🏆 Liga — Jornada ${jornada+1} · ${p1.name} vs ${p2.name}`, 'log-sys');
  showRoulette(
    [{num:1,name:p1.name,color:ROUL_COLORS[0]},{num:2,name:p2.name,color:ROUL_COLORS[1]}],
    startNum => {
      currentPlayer = startNum;
      addLog('— Turno 1: '+(startNum===1?p1:p2).name+' comienza —','log-sys');
      renderGame(); maybeTriggerBot();
    }
  );
}

// ─── Fin del partido real (fase de liga) ───
function _ligaOnLeagueMatchEnd(winner, isDraw, p1Kills, p2Kills) {
  const { jornada, matchIdx } = ligaState._pendingLeagueMatch;
  ligaState._pendingLeagueMatch = null;

  const m            = ligaState.schedule[jornada][matchIdx];
  const playerIsHome = m.homeIdx === 35;
  m.homeKills = playerIsHome ? p1Kills : p2Kills;
  m.awayKills = playerIsHome ? p2Kills : p1Kills;
  m.isDraw    = isDraw;
  m.played    = true;

  const playerWon = !isDraw && winner && winner.num === 1;
  const homeWon   = playerIsHome ? playerWon : !playerWon;
  _ligaApplyMatchResult(m.homeIdx, m.awayIdx, m.homeKills, m.awayKills, isDraw, homeWon);

  const oppIdx = playerIsHome ? m.awayIdx : m.homeIdx;
  const opp    = ligaState.participants[oppIdx];
  const player = ligaState.participants[35];
  const hName  = playerIsHome ? player.name : opp.name;
  const aName  = playerIsHome ? opp.name    : player.name;
  const hIcon  = playerIsHome ? player.icon : opp.icon;
  const aIcon  = playerIsHome ? opp.icon    : player.icon;
  ligaState.log.push({ jornada, isPlayer:true, isDraw,
    text:`${hIcon} ${hName} ${m.homeKills}–${m.awayKills} ${aIcon} ${aName}` });

  var _llWon = !isDraw && winner && winner.num === 1;
  if(_llWon) ligaState._playerGroupWins = (ligaState._playerGroupWins||0) + 1;
  _trackMatch({ won:_llWon, lost:!isDraw&&!_llWon, drawn:isDraw, myKOs:p1Kills, oppKOs:p2Kills, mode:'standard' });
  // Déjà Vu Liga: registrar rival vencido en fase de liga
  if(_llWon && opp){
    ligaState._leagueBeaten = ligaState._leagueBeaten || [];
    if(!ligaState._leagueBeaten.includes(opp.name)) ligaState._leagueBeaten.push(opp.name);
  }
  ligaState.currentJornada++;
  _saveTourneyProgress();
  _ligaAfterJornada();
}

// ─── Stub para eliminatorias (Pasos 6-7) ───
/* ═══════════════════════════════════════════════════════════
   MODO FIESTA LIGA — PASO 6: ELIMINATORIAS (PLAYOFFS → FINAL)
═══════════════════════════════════════════════════════════ */

// ─── Helper labels ───
function _ligaRoundLabel(round) {
  return { playoffs:'Playoffs', r16:'Octavos', qf:'Cuartos', sf:'Semifinales', final:'Final' }[round] || round;
}

// ─── Texto plano de resultado de un cruce (para log) ───
function _ligaTieResultText(tie, isFinal) {
  if (isFinal) return `${tie.home.name} ${tie.homeKills}–${tie.awayKills} ${tie.away.name}`;
  const hT = tie.kills1H + tie.kills2H;
  const aT = tie.kills1A + tie.kills2A;
  const wn = tie.winner ? ` → ${tie.winner.name}` : '';
  return `${tie.home.name} ${tie.kills1H}–${tie.kills1A}·${tie.kills2H}–${tie.kills2A} (${hT}–${aT})${wn}`;
}

// ─── HTML de línea para el modal de simulación ───
function _ligaTieDisplayLine(tie, isFinal) {
  if (isFinal) {
    return `${tie.home.icon} ${tie.home.name} <b>${tie.homeKills}</b>–<b>${tie.awayKills}</b> ${tie.away.icon} ${tie.away.name}`;
  }
  const hT = tie.kills1H + tie.kills2H;
  const aT = tie.kills1A + tie.kills2A;
  const wn = tie.winner ? ` <b style="color:#4a90d9">→ ${tie.winner.icon} ${tie.winner.name}</b>` : '';
  return `${tie.home.icon} ${tie.home.name} ${tie.kills1H}–${tie.kills1A}·${tie.kills2H}–${tie.kills2A} `
       + `<span style="color:#c9a84c">(${hT}–${aT})</span>${wn}`;
}

// ─── Sim cruce 2 piernas (IA vs IA) ───
function _ligaSimKnockoutTie(tie) {
  const res1 = partySimMatch(tie.home.deck, tie.away.deck);
  tie.kills1H = res1.killedA; tie.kills1A = res1.killedB; tie.played1 = true;

  // Pierna 2: el equipo away juega en casa (invertidos como deckA)
  const res2 = partySimMatch(tie.away.deck, tie.home.deck);
  tie.kills2H = res2.killedB; tie.kills2A = res2.killedA; tie.played2 = true;

  const hT = tie.kills1H + tie.kills2H;
  const aT = tie.kills1A + tie.kills2A;
  // Empate global → avanza quien tenga más estrellas; si igual, el local
  if(hT === aT){
    tie.winner = _deckStars(tie.home.deck) >= _deckStars(tie.away.deck) ? tie.home : tie.away;
  } else {
    tie.winner = hT > aT ? tie.home : tie.away;
  }
}

// ─── Sim partido único (final IA vs IA) ───
function _ligaSimFinalTie(tie) {
  const res = partySimMatch(tie.home.deck, tie.away.deck);
  tie.homeKills = res.killedA; tie.awayKills = res.killedB;
  tie.played = true;
  tie.winner = res.winner === 'A' ? tie.home : tie.away;
}

// ─── Simular TODOS los cruces de una ronda (IA, sin jugador) ───
function _ligaSimAllKnockoutRound(round) {
  const isFinal = round === 'final';
  const ties = isFinal ? [ligaState.final] : ligaState[round];
  const simLines = [];
  ties.forEach(tie => {
    if (!tie || !tie.home || !tie.away) return;
    if (isFinal) _ligaSimFinalTie(tie); else _ligaSimKnockoutTie(tie);
    simLines.push(_ligaTieDisplayLine(tie, isFinal));
    ligaState.log.push({ phase: round, leg: 0, isPlayer: false, isDraw: false,
      text: _ligaTieResultText(tie, isFinal) });
  });
  return simLines;
}

// ─── Simular todos los partidos restantes de Liga (cuando el jugador es eliminado) ───
function _ligaSimulateRemainingBracket(){
  if(!ligaState) return;
  // 1. Playoffs no jugados (ej: eliminado en fase de liga)
  if(ligaState.playoffs){
    var allPoPlayed = ligaState.playoffs.every(function(t){ return !t || !t.home || t.winner; });
    if(!allPoPlayed){
      ligaState.playoffs.forEach(function(tie){
        if(!tie || !tie.home || !tie.away || tie.winner) return;
        _ligaSimKnockoutTie(tie);
        ligaState.log.push({ phase:'playoffs', leg:0, isPlayer:false, isDraw:false,
          text: _ligaTieResultText(tie, false) });
      });
      _ligaFeedR16fromPlayoffs();
    }
  }
  // 2. R16 → QF → SF
  var rounds = ['r16','qf','sf'];
  var nextMap = { r16:'qf', qf:'sf', sf:'final' };
  rounds.forEach(function(round){
    var ties = ligaState[round] || [];
    var anyUnplayed = ties.some(function(t){ return t && t.home && t.away && !t.winner; });
    if(!anyUnplayed) return;
    ties.forEach(function(tie){
      if(!tie || !tie.home || !tie.away || tie.winner) return;
      _ligaSimKnockoutTie(tie);
      ligaState.log.push({ phase:round, leg:0, isPlayer:false, isDraw:false,
        text: _ligaTieResultText(tie, false) });
    });
    var next = nextMap[round];
    if(next === 'final') _ligaFeedNextKnockoutRound('sf', 'final');
    else if(next)        _ligaFeedNextKnockoutRound(round, next);
  });
  // 3. Final
  var fin = ligaState.final;
  if(fin && fin.home && fin.away && !fin.winner){
    _ligaSimFinalTie(fin);
    ligaState.log.push({ phase:'final', leg:0, isPlayer:false, isDraw:false,
      text: _ligaTieResultText(fin, true) });
  }
}

// ─── Rellenar R16 con top-8 + ganadores de playoffs ───
// 1° vs ganador playoff[7] (16v17), …, 8° vs ganador playoff[0] (9v24)
function _ligaFeedR16fromPlayoffs() {
  const sorted = _ligaGetSortedStandings();
  for (let i = 0; i < 8; i++) {
    ligaState.r16[i].home = sorted[i];
    ligaState.r16[i].away = (ligaState.playoffs[7 - i] && ligaState.playoffs[7 - i].winner) || null;
  }
}

// ─── Rellenar ronda siguiente con ganadores de la actual ───
function _ligaFeedNextKnockoutRound(current, next) {
  if (next === 'final') {
    ligaState.final.home = ligaState.sf[0].winner || null;
    ligaState.final.away = ligaState.sf[1].winner || null;
  } else {
    const cur  = ligaState[current];
    const nxt  = ligaState[next];
    for (let i = 0; i < nxt.length; i++) {
      nxt[i].home = cur[i * 2]     && cur[i * 2].winner     || null;
      nxt[i].away = cur[i * 2 + 1] && cur[i * 2 + 1].winner || null;
    }
  }
}

// ─── Iniciar una ronda eliminatoria ───
function _ligaStartKnockoutRound(round) {
  const isFinal  = round === 'final';
  const ties     = isFinal ? [ligaState.final] : ligaState[round];
  const pIdx     = ties.findIndex(t => t && ((t.home && t.home.isPlayer) || (t.away && t.away.isPlayer)));

  // Simular los cruces de IA
  const simLines = [];
  for (let i = 0; i < ties.length; i++) {
    if (i === pIdx) continue;
    const tie = ties[i];
    if (!tie || !tie.home || !tie.away) continue;
    if (isFinal) _ligaSimFinalTie(tie); else _ligaSimKnockoutTie(tie);
    simLines.push(_ligaTieDisplayLine(tie, isFinal));
    ligaState.log.push({ phase: round, leg: 0, isPlayer: false, isDraw: false,
      text: _ligaTieResultText(tie, isFinal) });
  }

  if (pIdx === -1) { _ligaAfterKnockoutRound(round); return; }

  const tie = ties[pIdx];
  const legInfo = isFinal ? 'Partido único' : 'Ida y vuelta';
  _partyShowSimModal(
    `${_ligaRoundLabel(round).toUpperCase()} — RESULTADOS`,
    simLines.length
      ? simLines
      : ['<span style="color:var(--text-dim)">No hay otros cruces en esta ronda.</span>'],
    `⚔️ Tu cruce (${legInfo}): ${tie.home.icon} ${tie.home.name} vs ${tie.away.icon} ${tie.away.name}`,
    () => _ligaRunTieLeg(round, pIdx, 1)
  );
}

// ─── Lanzar una pierna del cruce del jugador ───
function _ligaRunTieLeg(round, tieIdx, leg) {
  const isFinal = round === 'final';
  const ties    = isFinal ? [ligaState.final] : ligaState[round];
  const tie     = ties[tieIdx];

  const player = ligaState.participants[35];
  const opp    = tie.home.isPlayer ? tie.away : tie.home;

  ligaState._pendingKnockout = { round, tieIdx, leg };

  botMode = true; gameMode = 'standard';
  turnNumber = 1; attackUsed = false; isOnline = false; logEntries = [];
  document.getElementById('logWrap').innerHTML = '';

  const makeLP = (name, deckIds) => {
    const cards = shuffle(deckIds.map(id => makeCard(CARD_POOL.find(c => c.id === id))));
    return { name, active: cards.shift(), pile: cards, kills: 0 };
  };

  p1 = makeLP(player.name, player.deck);
  p2 = makeLP(`${opp.icon} ${opp.name}`, opp.deck);
  p1.num = 1; p2.num = 2;
  window._gameP1Deck = [...player.deck];
  window._gameCardKOs = {};

  const legLabel = isFinal ? 'Gran Final' : `${_ligaRoundLabel(round)} — Pierna ${leg}`;
  buildGameUI_Standard();
  showScreen('gameScreen');
  addLog(`🏆 Liga · ${legLabel} · ${p1.name} vs ${p2.name}`, 'log-sys');
  showRoulette(
    [{num:1, name:p1.name, color:ROUL_COLORS[0]}, {num:2, name:p2.name, color:ROUL_COLORS[1]}],
    startNum => {
      currentPlayer = startNum;
      addLog('— Turno 1: '+(startNum===1?p1:p2).name+' comienza —', 'log-sys');
      renderGame(); maybeTriggerBot();
    }
  );
}

// ─── Fin del partido del jugador (eliminatorias) ───
function _ligaOnKnockoutMatchEnd(winner, isDraw, p1Kills, p2Kills) {
  const { round, tieIdx, leg } = ligaState._pendingKnockout;
  ligaState._pendingKnockout = null;

  const isFinal     = round === 'final';
  const ties        = isFinal ? [ligaState.final] : ligaState[round];
  const tie         = ties[tieIdx];
  const playerIsHome = tie.home.isPlayer;
  const playerWon   = !isDraw && winner && winner.num === 1;
  const opp         = playerIsHome ? tie.away : tie.home;

  // Invicto de Liga: perder CUALQUIER partido individual de la llave anula el logro
  if (!isDraw && !playerWon) ligaState._playerKnockoutFlawless = false;

  // ── FINAL (pierna única) ──────────────────────────
  if (isFinal) {
    tie.homeKills = playerIsHome ? p1Kills : p2Kills;
    tie.awayKills = playerIsHome ? p2Kills : p1Kills;
    tie.played = true; tie.isDraw = isDraw;
    tie.winner = playerWon
      ? (playerIsHome ? tie.home : tie.away)
      : (playerIsHome ? tie.away : tie.home);

    ligaState.log.push({ phase:'final', leg:1, isPlayer:true, isDraw,
      text:`${tie.home.icon} ${tie.home.name} ${tie.homeKills}–${tie.awayKills} ${tie.away.icon} ${tie.away.name}` });

    _trackMatch({ won:playerWon, lost:!playerWon, myKOs:playerIsHome?p1Kills:p2Kills, oppKOs:playerIsHome?p2Kills:p1Kills, mode:'standard' });
    if(playerWon && opp && (ligaState._leagueBeaten||[]).includes(opp.name)){
      var _ldvf=_loadStats(); _ldvf.ligaDejaVu=(_ldvf.ligaDejaVu||0)+1; _saveStats(_ldvf); _checkAchievements(_ldvf);
    }
    _clearTourneyProgress();
    if (!playerWon) {
      _ligaShowElimination('final',
        `Perdiste la Final <strong>${tie.homeKills}–${tie.awayKills}</strong> ante <strong>${opp.name}</strong>.`);
    } else {
      _ligaShowChampion();
    }
    return;
  }

  // ── IDA Y VUELTA ──────────────────────────────────
  const homeKills = playerIsHome ? p1Kills : p2Kills;
  const awayKills = playerIsHome ? p2Kills : p1Kills;

  if (leg === 1) {
    tie.kills1H = homeKills; tie.kills1A = awayKills;
    tie.played1 = true; tie.isDraw1 = isDraw;

    ligaState.log.push({ phase: round, leg: 1, isPlayer: true, isDraw,
      text:`${tie.home.icon} ${tie.home.name} ${tie.kills1H}–${tie.kills1A} ${tie.away.icon} ${tie.away.name}` });

    _trackMatch({ won:playerWon, lost:!isDraw&&!playerWon, drawn:isDraw, myKOs:playerIsHome?p1Kills:p2Kills, mode:'standard' });
    _saveTourneyProgress();
    _ligaShowBracket(round);
    const diff = tie.kills1H - tie.kills1A;
    const aggTxt = diff > 0 ? `(+${diff} ventaja)` : diff < 0 ? `(${diff} desventaja)` : '(igualados)';
    document.getElementById('ligaBracketActions').innerHTML =
      `<button class="btn" style="margin-right:.5rem" onclick="_ligaShowLog('ligaBracketScreen')">📋 Historial</button>`
      +`<button class="btn btn-primary" onclick="_ligaRunTieLeg('${round}',${tieIdx},2)">Vuelta ${aggTxt} ▶</button>`;

  } else {
    // Pierna 2
    tie.kills2H = homeKills; tie.kills2A = awayKills;
    tie.played2 = true; tie.isDraw2 = isDraw;

    const hT = tie.kills1H + tie.kills2H;
    const aT = tie.kills1A + tie.kills2A;

    ligaState.log.push({ phase: round, leg: 2, isPlayer: true, isDraw,
      text:`${tie.home.icon} ${tie.home.name} ${tie.kills2H}–${tie.kills2A} ${tie.away.icon} ${tie.away.name} (Global ${hT}–${aT})` });

    // Resolver cruce
    if (hT > aT) {
      tie.winner = tie.home;
    } else if (aT > hT) {
      tie.winner = tie.away;
    } else {
      // Empate global: el JUGADOR siempre es eliminado; entre IAs avanza el local
      tie.winner = (tie.home.isPlayer || tie.away.isPlayer)
        ? (tie.home.isPlayer ? tie.away : tie.home)   // jugador pierde
        : tie.home;                                    // IA: avanza local
    }

    _trackMatch({ won:playerWon, lost:!isDraw&&!playerWon, drawn:isDraw, myKOs:playerIsHome?p1Kills:p2Kills, oppKOs:playerIsHome?p2Kills:p1Kills, mode:'standard' });
    if(tie.winner.isPlayer && opp && (ligaState._leagueBeaten||[]).includes(opp.name)){
      var _ldv=_loadStats(); _ldv.ligaDejaVu=(_ldv.ligaDejaVu||0)+1; _saveStats(_ldv); _checkAchievements(_ldv);
    }
    if (!tie.winner.isPlayer) {
      const diff = playerIsHome ? `${hT}–${aT}` : `${aT}–${hT}`;
      _ligaSimulateRemainingBracket();
      _clearTourneyProgress();
      renderLigaBracket(round);
      _ligaShowElimination(round,
        `Caíste en ${_ligaRoundLabel(round)}. Global <strong>${diff}</strong> para <strong>${tie.winner.name}</strong>.`);
    } else {
      _ligaAfterKnockoutRound(round);
    }
  }
}

// ─── Transición entre rondas ───
function _ligaAfterKnockoutRound(round) {
  const next = { playoffs:'r16', r16:'qf', qf:'sf', sf:'final' }[round];
  if (!next) return;  // ya manejado en _ligaOnKnockoutMatchEnd

  if (round === 'playoffs') _ligaFeedR16fromPlayoffs();
  else                      _ligaFeedNextKnockoutRound(round, next);

  _saveTourneyProgress(); // guardar DESPUÉS de alimentar la siguiente ronda
  _ligaShowBracket(next);
  document.getElementById('ligaBracketActions').innerHTML =
    `<button class="btn" style="margin-right:.5rem" onclick="_ligaShowTableFromBracket('${next}')">📊 Tabla</button>`
    +`<button class="btn" style="margin-right:.5rem" onclick="_ligaShowLog('ligaBracketScreen')">📋 Historial</button>`
    +`<button class="btn btn-primary" onclick="_ligaStartKnockoutRound('${next}')">Iniciar ${_ligaRoundLabel(next)} ▶</button>`;
}

/* ═══════════════════════════════════════════════════════════
   MODO FIESTA LIGA — PASO 4: BRACKET VISUAL + INIT KNOCKOUT
═══════════════════════════════════════════════════════════ */

// ─── Estructura vacía de un tie (2 piernas) ───
function _ligaMakeTie(home, away) {
  return { home, away,
    kills1H:0, kills1A:0, played1:false, isDraw1:false,
    kills2H:0, kills2A:0, played2:false, isDraw2:false,
    winner:null };
}
// ─── Estructura vacía de un tie (1 pierna) ───
function _ligaMakeFinalTie(home, away) {
  return { home, away, homeKills:0, awayKills:0, played:false, isDraw:false, winner:null };
}

// ─── Inicializar bracket eliminatorio tras la fase de liga ───
function _ligaInitKnockoutBracket() {
  ligaState.phase = 'knockout';
  const sorted = _ligaGetSortedStandings();
  // sorted[0-7]  = Top 8 → pasan directamente a R16
  // sorted[8-23] = Pos 9-24 → Playoffs (16 equipos, 8 cruces)
  // sorted[24-35]= eliminados

  // Playoffs: 9v24, 10v23 … 16v17  (indices 8-15 vs 23-16)
  ligaState.playoffs = [];
  for (let i = 0; i < 8; i++) {
    ligaState.playoffs.push(_ligaMakeTie(sorted[8 + i], sorted[23 - i]));
  }

  // R16: 8 cruces — slots vacíos; se rellenan después de playoffs
  ligaState.r16  = Array.from({length:8},  () => _ligaMakeTie(null, null));
  ligaState.qf   = Array.from({length:4},  () => _ligaMakeTie(null, null));
  ligaState.sf   = Array.from({length:2},  () => _ligaMakeTie(null, null));
  ligaState.final = _ligaMakeFinalTie(null, null);
}

/* ═══════════════════════════════════════════════════════════
   MODO FIESTA LIGA — PASO 8: BRACKET VISUAL COMPLETO
═══════════════════════════════════════════════════════════ */

// ─── Render del bracket (todas las rondas, TBD, ronda activa) ───
function renderLigaBracket(activeRound) {
  const ROUNDS = [
    { key:'playoffs', label:'Playoffs', tbd:16, legs:2 },
    { key:'r16',      label:'Octavos',  tbd:8,  legs:2 },
    { key:'qf',       label:'Cuartos',  tbd:4,  legs:2 },
    { key:'sf',       label:'Semis',    tbd:2,  legs:2 },
    { key:'final',    label:'Final',    tbd:1,  legs:1 },
  ];

  const container = document.getElementById('ligaBracketRounds');
  container.innerHTML = '';

  ROUNDS.forEach(rd => {
    const isActive = rd.key === activeRound;

    // Obtener ties
    let ties;
    if (rd.key === 'final') {
      ties = ligaState.final ? [ligaState.final] : [null];
    } else {
      const arr = ligaState[rd.key] || [];
      ties = arr.length ? arr : Array.from({length: rd.tbd}, () => null);
    }

    const col = document.createElement('div');
    // Playoffs más ancho para acomodar nombres; otras rondas más estrechas
    const colW = rd.key === 'playoffs' ? '148px' : '136px';
    col.style.cssText = `min-width:${colW};flex-shrink:0;display:flex;flex-direction:column;gap:3px`;

    // Cabecera de ronda
    const ttl = document.createElement('div');
    const activeColor = isActive ? '#c9a84c' : 'var(--text-dim)';
    const activeBorder = isActive ? '#c9a84c' : 'var(--border)';
    ttl.style.cssText = `font-size:8.5px;font-weight:700;letter-spacing:1px;text-transform:uppercase;`
      + `text-align:center;padding:4px 0;margin-bottom:4px;`
      + `color:${activeColor};border-bottom:.5px solid ${activeBorder};`;
    ttl.textContent = rd.label + (isActive ? ' ◀' : '');
    col.appendChild(ttl);

    ties.forEach(tie => {
      const card = document.createElement('div');

      // ── TBD (slot vacío) ─────────────────────────
      if (!tie || !tie.home) {
        card.className = 'lbm';
        card.style.opacity = '0.3';
        card.style.fontSize = '9px';
        card.innerHTML = '<div class="lbm-team" style="color:var(--text-dim)">— TBD —</div>'
                       + '<div class="lbm-team" style="color:var(--text-dim)">— TBD —</div>';
        col.appendChild(card);
        return;
      }

      // ── Cruce con datos ──────────────────────────
      const hasPlayer = tie.home.isPlayer || (tie.away && tie.away.isPlayer);
      card.className = 'lbm' + (hasPlayer ? ' lbm-player' : '');

      const hWon = tie.winner === tie.home;
      const aWon = tie.winner === tie.away;

      // Score
      let score = '';
      if (rd.legs === 2) {
        if (tie.played1 && tie.played2) {
          const hT = tie.kills1H + tie.kills2H, aT = tie.kills1A + tie.kills2A;
          score = `<div class="lbm-score">Ida ${tie.kills1H}–${tie.kills1A} · Vta ${tie.kills2H}–${tie.kills2A}</div>`
                + `<div class="lbm-global">Global ${hT}–${aT}</div>`;
        } else if (tie.played1) {
          score = `<div class="lbm-score">Ida ${tie.kills1H}–${tie.kills1A}</div>`;
        }
      } else if (tie.played) {
        score = `<div class="lbm-score">${tie.homeKills}–${tie.awayKills}</div>`;
      }

      const hCls = 'lbm-team'+(hWon?' lbm-winner':'')+(tie.home.isPlayer?' lbm-player-team':'');
      const away = tie.away;
      const aCls = away
        ? 'lbm-team'+(aWon?' lbm-winner':'')+(away.isPlayer?' lbm-player-team':'')
        : 'lbm-team';
      const awayHtml = away
        ? `${away.icon} ${away.name}`
        : `<span style="color:var(--text-dim)">TBD</span>`;

      card.innerHTML = `<div class="${hCls}">${tie.home.icon} ${tie.home.name}</div>`
                     + `<div class="${aCls}">${awayHtml}</div>`
                     + score;
      col.appendChild(card);
    });

    container.appendChild(col);
  });
}

// ─── Mostrar pantalla de bracket ───
// returnScreen: pantalla a la que vuelve el botón ← del log si se abre desde aquí
function _ligaShowBracket(activeRound, returnScreen) {
  const labels = {
    playoffs:'PLAYOFFS', r16:'OCTAVOS DE FINAL',
    qf:'CUARTOS DE FINAL', sf:'SEMIFINALES', final:'GRAN FINAL'
  };
  document.getElementById('ligaBracketLabel').textContent = labels[activeRound] || 'ELIMINATORIAS';
  document.getElementById('ligaBracketSub').textContent   = 'Nexus League — Fase Eliminatoria';

  // Guardar returnScreen para el botón ← del log lanzado desde bracket
  window._ligaBracketReturn = returnScreen || null;

  renderLigaBracket(activeRound);

  // Si se abre desde pantalla de eliminación/campeón → solo lectura, sin botones de acción
  if (returnScreen) {
    document.getElementById('ligaBracketActions').innerHTML =
      `<button class="btn" onclick="showScreen('${returnScreen}')">← Volver</button>`;
  }

  showScreen('ligaBracketScreen');
}

// ─── Entry point: salida de la fase de liga hacia eliminatorias ───
function _ligaStartPlayoffs() {
  _ligaInitKnockoutBracket();
  const rank = _ligaGetPlayerRank();

  if (rank <= 8) {
    // Jugador clasifica directo a Octavos — simular los 8 playoffs de IA
    const simLines = _ligaSimAllKnockoutRound('playoffs');
    _ligaFeedR16fromPlayoffs();
    _partyShowSimModal(
      'PLAYOFFS — RESULTADOS',
      simLines,
      `✅ Clasificaste directo como ${rank}° — pasas a Octavos de Final`,
      () => {
        _ligaShowBracket('r16');
        document.getElementById('ligaBracketActions').innerHTML =
          `<button class="btn" style="margin-right:.5rem" onclick="_ligaShowTableFromBracket('r16')">📊 Tabla</button>`
          +`<button class="btn btn-primary" onclick="_ligaStartKnockoutRound('r16')">Iniciar Octavos ▶</button>`;
      }
    );
  } else {
    // Jugador juega playoffs (posición 9-24)
    _ligaStartKnockoutRound('playoffs');
  }
}

// ─── Post-jornada: actualizar y mostrar tabla ───
function _ligaAfterJornada() {
  const done = ligaState.currentJornada; // 1–8 tras incrementar

  document.getElementById('ligaTablePhaseLabel').textContent = 'FASE DE LIGA';
  document.getElementById('ligaTableJornadaLabel').textContent =
    done === 8 ? 'CLASIFICACIÓN FINAL (8/8)' : `JORNADA ${done} / 8 COMPLETADA`;

  renderLigaTable();

  const actEl = document.getElementById('ligaTableActions');
  if (done < 8) {
    actEl.innerHTML =
      `<button class="btn" style="margin-right:.5rem" onclick="_ligaShowLog('ligaTableScreen')">📋 Historial</button>`
      +`<button class="btn btn-primary" onclick="_ligaStartJornada()">Jornada ${done+1} ▶</button>`;
  } else {
    // ligaPerfectGroups se comprueba al final (campeón + fase de grupos perfecta)
    const rank = _ligaGetPlayerRank();
    if(rank === 24){ var _sb=_loadStats(); _sb.ligaBarely=(_sb.ligaBarely||0)+1; _saveStats(_sb); _checkAchievements(_sb); }
    if (rank > 24) {
      actEl.innerHTML =
        `<p style="color:var(--text-dim);font-size:11px;margin-bottom:.5rem">`
        +`Terminaste en el puesto <strong>${rank}°</strong>. No clasificaste a los Playoffs.</p>`
        +`<button class="btn" style="margin-right:.5rem" onclick="_ligaShowLog('ligaTableScreen')">📋 Historial</button>`
        +`<button class="btn btn-primary" onclick="_ligaEliminatedInLiga(${rank})">Ver resultado ▶</button>`;
    } else {
      const nextLabel = rank <= 8 ? 'Ir a Octavos ▶' : 'Ir a Playoffs ▶';
      actEl.innerHTML =
        `<button class="btn" style="margin-right:.5rem" onclick="_ligaShowLog('ligaTableScreen')">📋 Historial</button>`
        +`<button class="btn btn-primary" onclick="_ligaStartPlayoffs()">${nextLabel}</button>`;
    }
  }

  showScreen('ligaTableScreen');
}

