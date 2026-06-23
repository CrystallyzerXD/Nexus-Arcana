/* ═══════════════════════════════════════════════
   MODO FIESTA — DATOS
═══════════════════════════════════════════════ */
const PARTY_COUNTRIES = [
  // CONMEBOL
  {name:'Argentina',      flag:'🇦🇷'},
  {name:'Brasil',         flag:'🇧🇷'},
  {name:'Colombia',       flag:'🇨🇴'},
  {name:'Ecuador',        flag:'🇪🇨'},
  {name:'Uruguay',        flag:'🇺🇾'},
  {name:'Venezuela',      flag:'🇻🇪'},
  {name:'Perú',           flag:'🇵🇪'},
  // UEFA
  {name:'Francia',        flag:'🇫🇷'},
  {name:'Alemania',       flag:'🇩🇪'},
  {name:'España',         flag:'🇪🇸'},
  {name:'Inglaterra',     flag:'🏴󠁧󠁢󠁥󠁮󠁧󠁿'},
  {name:'Portugal',       flag:'🇵🇹'},
  {name:'Países Bajos',   flag:'🇳🇱'},
  {name:'Bélgica',        flag:'🇧🇪'},
  {name:'Croacia',        flag:'🇭🇷'},
  {name:'Dinamarca',      flag:'🇩🇰'},
  {name:'Austria',        flag:'🇦🇹'},
  {name:'Suiza',          flag:'🇨🇭'},
  {name:'Serbia',         flag:'🇷🇸'},
  {name:'Hungría',        flag:'🇭🇺'},
  {name:'Escocia',        flag:'🏴󠁧󠁢󠁳󠁣󠁴󠁿'},
  {name:'Türkiye',        flag:'🇹🇷'},
  {name:'Eslovaquia',     flag:'🇸🇰'},
  {name:'Ucrania',        flag:'🇺🇦'},
  // CONCACAF
  {name:'Estados Unidos', flag:'🇺🇸'},
  {name:'Canadá',         flag:'🇨🇦'},
  {name:'México',         flag:'🇲🇽'},
  {name:'Panamá',         flag:'🇵🇦'},
  {name:'Jamaica',        flag:'🇯🇲'},
  {name:'Honduras',       flag:'🇭🇳'},
  // CAF
  {name:'Marruecos',      flag:'🇲🇦'},
  {name:'Senegal',        flag:'🇸🇳'},
  {name:'Egipto',         flag:'🇪🇬'},
  {name:'Nigeria',        flag:'🇳🇬'},
  {name:'Costa de Marfil',flag:'🇨🇮'},
  {name:'Camerún',        flag:'🇨🇲'},
  {name:'Sudáfrica',      flag:'🇿🇦'},
  {name:'Argelia',        flag:'🇩🇿'},
  {name:'Túnez',          flag:'🇹🇳'},
  // AFC
  {name:'Japón',          flag:'🇯🇵'},
  {name:'Corea del Sur',  flag:'🇰🇷'},
  {name:'Australia',      flag:'🇦🇺'},
  {name:'Arabia Saudita', flag:'🇸🇦'},
  {name:'Irán',           flag:'🇮🇷'},
  {name:'Catar',          flag:'🇶🇦'},
  {name:'Uzbekistán',     flag:'🇺🇿'},
  {name:'Jordania',       flag:'🇯🇴'},
  // OFC
  {name:'Nueva Zelanda',  flag:'🇳🇿'},
];

// Calendario round-robin para un grupo de 4 equipos (índices 0-3)
// 3 jornadas × 2 partidos = 6 partidos totales
const PARTY_GROUP_SCHEDULE = [
  [[0,1],[2,3]],  // Jornada 1
  [[0,2],[1,3]],  // Jornada 2
  [[0,3],[1,2]],  // Jornada 3
];

let partyState      = null;  // null = no hay torneo activo
let partySetupMode  = false; // true = jugador está armando el mazo para el torneo
let partySelectedCountry = null;
let _partySimCloseCallback = null; // callback tras cerrar el modal de sim

/* ─── Tabs de pantalla Cómo Jugar ─── */
function statsTab(btn, panelId){
  document.querySelectorAll('.stats-tab').forEach(function(b){ b.classList.remove('active'); });
  document.querySelectorAll('.stats-panel').forEach(function(p){ p.classList.remove('active'); });
  btn.classList.add('active');
  document.getElementById(panelId).classList.add('active');
  var ms = document.getElementById('migrate-section');
  if(ms) ms.style.display = panelId === 'st-panel-general' ? '' : 'none';
}

function rulesTab(btn, panelId){
  document.querySelectorAll('.rules-tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.rules-panel').forEach(p => p.classList.remove('active'));
  btn.classList.add('active');
  document.getElementById(panelId).classList.add('active');
  document.querySelector('.rules-body').scrollTop = 0;
}

/* ─── Entry point ─── */
function launchPartyMode(){
  const _saved = _loadTourneyProgress('mundial');
  if(_saved){
    _showTourneyResumeModal(_saved,
      function(){ _restoreTourneyProgress(_saved); },
      function(){ _clearTourneyProgress(); _launchPartyModeNew(); }
    );
    return;
  }
  _launchPartyModeNew();
}
function _launchPartyModeNew(){
  ligaState = null; ligaSetupMode = false;
  partySetupMode = true;
  botMode = true;
  _launchSetup('standard');
  // Sobreescribir textos del setup screen para el contexto Fiesta
  document.getElementById('setupHeader').innerHTML =
    '<span style="background:linear-gradient(90deg,#ff6b6b,#ffd93d,#6bcb77,#4d96ff,#c77dff,#ff6b6b);background-size:200%;-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;animation:rainbow-shift 3s linear infinite;font-family:var(--font-title);font-size:10px;letter-spacing:.2em">MODO FIESTA MUNDIAL</span> — ELIGE TU MAZO';
  document.getElementById('startBtn').textContent = 'Elegir país ▶';
  document.getElementById('setupBackBtn').onclick = ()=>{
    partySetupMode = false;
    showScreen('botModeScreen');
  };
  // El país actúa como nombre — ocultar campo nombre
  const _pn = document.getElementById('p1name');
  if (_pn && _pn.parentElement) _pn.parentElement.style.display = 'none';
}

/* ─── Intercept startGame para Modo Fiesta ─── */
// Se llama desde el botón "Elegir país ▶" cuando partySetupMode=true
function _partyInterceptStart(){
  partySetupMode = false;
  const deckSize   = parseInt((document.getElementById('p1size')||{}).value || 6);
  const playerName = (document.getElementById('p1name')||{}).value || _loadP1Name() || 'Jugador';
  partyState = {
    playerName,
    playerDeckIds:   [...p1sel],
    playerDeckSize:  deckSize,
    phase: 'country_select',
    countries:     [],
    groups:        [],
    playerGroupIdx:-1,
    matchResults:  [],
    currentMatchday: 0,
    bracket:       null,
  };
  _buildPartyCountryScreen();
  showScreen('partyCountryScreen');
}

/* ─── Country picker ─── */
function _buildPartyCountryScreen(){
  partySelectedCountry = null;
  document.getElementById('partyCountryConfirmBtn').disabled = true;
  const grid = document.getElementById('partyCountryGrid');
  grid.innerHTML = PARTY_COUNTRIES.map(c =>
    `<div class="country-btn" onclick="partySelectCountry(this,'${c.name.replace(/'/g,"\\'")}')">
      ${c.flag} ${c.name}
    </div>`
  ).join('');
}

function partySelectCountry(el, name){
  document.querySelectorAll('#partyCountryGrid .country-btn').forEach(b=>b.classList.remove('selected'));
  el.classList.add('selected');
  partySelectedCountry = name;
  document.getElementById('partyCountryConfirmBtn').disabled = false;
}

function partyBackToDeck(){
  partySetupMode = true;
  showScreen('setupScreen');
  document.getElementById('startBtn').textContent = 'Elegir país ▶';
  document.getElementById('setupBackBtn').onclick = ()=>{
    partySetupMode = false;
    showScreen('botModeScreen');
  };
}

var _MUNDIAL_INTRO_TAGLINES = [
  'El mundo entero los está mirando.',
  'Cuarenta y ocho naciones. Solo una levanta la copa.',
  'Este es el momento por el que entrenaron toda su vida.',
  'La historia se escribe hoy.',
  'No hay favoritos. Solo hay voluntad.',
  'El destino de una nación está en sus manos.',
  'Que el torneo más grande de Nexus comience.',
  'Gloria o nada.',
];

var _mundialIntroTimeout = null;

function partyConfirmCountry(){
  if(!partySelectedCountry) return;
  partyState.playerCountry = partySelectedCountry;
  _partyInitTournament();
  // La intro se muestra después de que _partyInitTournament termine y showScreen('partyGroupsScreen') haya sido llamado
}

var _mundialConfettiRAF = null;

function _showMundialIntro(){
  const countryObj = PARTY_COUNTRIES.find(c => c.name === partyState.playerCountry) || {};
  const overlay = document.getElementById('mundialIntroOverlay');
  const flagEl  = document.getElementById('mundialIntroFlag');
  const nameEl  = document.getElementById('mundialIntroCountry');
  const tagEl   = document.getElementById('mundialIntroTagline');

  flagEl.textContent = countryObj.flag || '🏳';
  nameEl.textContent = (partyState.playerCountry || '').toUpperCase();
  tagEl.textContent  = _MUNDIAL_INTRO_TAGLINES[Math.floor(Math.random()*_MUNDIAL_INTRO_TAGLINES.length)];

  overlay.classList.remove('active');
  void overlay.offsetWidth;
  overlay.classList.add('active');
  _switchBgm(_bgmWorldcup);

  overlay.querySelectorAll('.mundial-intro-trophy,.mundial-intro-event,.mundial-intro-flag,.mundial-intro-country,.mundial-intro-divider,.mundial-intro-tagline,.mundial-intro-sub,.mundial-intro-skip,.mundial-flash,.mundial-stadium-light').forEach(function(el){
    el.style.animation='none'; void el.offsetWidth; el.style.animation='';
  });

  _startMundialConfetti();

  if(_mundialIntroTimeout) clearTimeout(_mundialIntroTimeout);
  _mundialIntroTimeout = setTimeout(_mundialIntroDone, 4800);
}

function _startMundialConfetti(){
  if(_mundialConfettiRAF){ cancelAnimationFrame(_mundialConfettiRAF); _mundialConfettiRAF=null; }
  var cv = document.getElementById('mundialConfettiCanvas');
  if(!cv) return;
  cv.width=innerWidth; cv.height=innerHeight;
  var ctx = cv.getContext('2d');
  var COLORS = ['#e8c46a','#ffffff','#4a90d9','#e05a5a','#7affaa','#c4b0ff','#ffd93d'];
  var pieces = Array.from({length:90}, function(){
    return {
      x:Math.random()*cv.width, y:Math.random()*cv.height-cv.height,
      w:Math.random()*8+4, h:Math.random()*4+2,
      color:COLORS[Math.floor(Math.random()*COLORS.length)],
      rot:Math.random()*Math.PI*2,
      vx:(Math.random()-.5)*1.5, vy:Math.random()*2.5+1,
      vr:(Math.random()-.5)*.12,
      opacity:Math.random()*.6+.4
    };
  });
  var startTime = Date.now();
  function tick(){
    ctx.clearRect(0,0,cv.width,cv.height);
    var fade = Math.max(0, 1-(Date.now()-startTime)/4500);
    pieces.forEach(function(p){
      p.x+=p.vx; p.y+=p.vy; p.rot+=p.vr;
      if(p.y>cv.height+10){ p.y=-10; p.x=Math.random()*cv.width; }
      ctx.save();
      ctx.globalAlpha=p.opacity*fade;
      ctx.translate(p.x,p.y); ctx.rotate(p.rot);
      ctx.fillStyle=p.color;
      ctx.fillRect(-p.w/2,-p.h/2,p.w,p.h);
      ctx.restore();
    });
    if(fade>0) _mundialConfettiRAF=requestAnimationFrame(tick);
  }
  tick();
}

function _mundialIntroSkip(){
  if(_mundialIntroTimeout){ clearTimeout(_mundialIntroTimeout); _mundialIntroTimeout=null; }
  _mundialIntroDone();
}

function _mundialIntroDone(){
  if(_mundialConfettiRAF){ cancelAnimationFrame(_mundialConfettiRAF); _mundialConfettiRAF=null; }
  const overlay = document.getElementById('mundialIntroOverlay');
  overlay.style.transition='opacity .6s ease';
  overlay.style.opacity='0';
  setTimeout(function(){
    overlay.classList.remove('active');
    overlay.style.transition='';
    overlay.style.opacity='';
  }, 620);
}

/* ─── AI deck generator (respeta límites de rareza) ─── */
function partyMakeAIDeck(size){
  size = size || 6;
  const ids = [];
  const rarityCounts = {};
  const shuffled = shuffle([...CARD_POOL]);
  for(const card of shuffled){
    if(ids.length >= size) break;
    const limit = RARITY_LIMITS[card.rarity] ?? Infinity;
    const count = rarityCounts[card.rarity] || 0;
    if(count < limit){ ids.push(card.id); rarityCounts[card.rarity] = count+1; }
  }
  return ids;
}

/* ─── Inicializar torneo: sorteo y generación de mazos ─── */
function _partyInitTournament(){
  const deckSize = partyState.playerDeckSize;

  // Construir objetos de país con mazos
  const countries = PARTY_COUNTRIES.map(c => ({
    name:     c.name,
    flag:     c.flag,
    isPlayer: c.name === partyState.playerCountry,
    deck:     c.name === partyState.playerCountry
                ? [...partyState.playerDeckIds]
                : partyMakeAIDeck(deckSize),
  }));

  // Sorteo: barajar y dividir en 12 grupos de 4
  const shuffled   = shuffle([...countries]);
  const groupNames = ['A','B','C','D','E','F','G','H','I','J','K','L'];
  const groups     = groupNames.map((name, i) => ({
    name,
    // standings ordenado: cada equipo tiene estadísticas en cero
    standings: shuffled.slice(i*4, i*4+4).map(c => ({
      country: c.name,
      flag:    c.flag,
      isPlayer:c.isPlayer,
      pts: 0, pj: 0, g: 0, e: 0, p: 0, killed: 0,
    })),
    // referencia al mazo de cada equipo en el grupo (índice = posición en standings)
    decks: shuffled.slice(i*4, i*4+4).map(c => c.deck),
  }));

  // Localizar al jugador
  let playerGroupIdx = -1;
  for(let i = 0; i < groups.length; i++){
    if(groups[i].standings.some(s => s.isPlayer)){ playerGroupIdx = i; break; }
  }

  partyState = {
    ...partyState,
    countries,
    groups,
    playerGroupIdx,
    matchResults: [],
    phase: 'groups',
    currentMatchday: 1,
    jornLog: [],       // { md, lines: [string] } — acumula resultados de cada jornada
    knockoutLog: [],   // { round, label, won, myKills, oppKills, oppName, oppFlag }
  };

  partyShowGroupsScreen();
}

/* ─── Suma de estrellas de un mazo (array de IDs) ─── */
function _deckStars(deck){
  return deck.reduce((sum, id) => {
    const card = CARD_POOL.find(c => c.id === id);
    return sum + (card ? (card.stars || 0) : 0);
  }, 0);
}

/* ─── Simulación probabilística de un partido IA vs IA ─── */
// Devuelve { killedA, killedB } donde killedX = cartas que eliminó el equipo X
function partySimMatch(deckA, deckB){
  // 5% de empate (solo fase de grupos; en eliminatoria el caller resuelve el desempate)
  if(Math.random() < 0.05){
    const k = Math.min(deckA.length, deckB.length);
    return { killedA: k, killedB: k, winner: null, isDraw: true };
  }
  const sizeA = deckA.length;
  const sizeB = deckB.length;

  // Generar kills aleatorios: un equipo gana (mata todo) y el otro pierde algunas
  let killedA, killedB, winner;
  if(Math.random() < 0.5){
    killedA = sizeB;
    killedB = Math.floor(Math.random() * sizeA);
    winner = 'A';
  } else {
    killedA = Math.floor(Math.random() * sizeB);
    killedB = sizeA;
    winner = 'B';
  }

  // Ajuste por estrellas: el equipo con más estrellas debe tener más kills
  const starsA = _deckStars(deckA);
  const starsB = _deckStars(deckB);
  if(starsA !== starsB){
    const strongerShouldWin = starsA > starsB ? 'A' : 'B';
    if(winner !== strongerShouldWin){
      // Invertir resultado
      [killedA, killedB] = [killedB, killedA];
      winner = strongerShouldWin;
    }
  }
  // Si estrellas iguales, se mantiene el resultado aleatorio original

  return { killedA, killedB, winner, isDraw: false };
}

/* ═══════════════════════════════════════════════
   MODO FIESTA — FASE DE GRUPOS
═══════════════════════════════════════════════ */

// ─── Ordenar standings de un grupo ───
function _partySort(standings){
  return [...standings].sort((a,b)=>{
    if(b.pts !== a.pts) return b.pts - a.pts;
    if(b.killed !== a.killed) return b.killed - a.killed;
    return 0; // orden original como último criterio
  });
}

// ─── Aplicar resultado a standings ───
// idxA, idxB = índices en group.standings; killedA = cartas eliminadas por A, killedB por B
// aWon: true=A ganó, false=B ganó, undefined=inferir por kills (solo IA vs IA)
function _partyApplyResult(group, idxA, idxB, killedA, killedB, isDraw, aWon){
  const A = group.standings[idxA];
  const B = group.standings[idxB];
  A.pj++; B.pj++;
  A.killed += killedA; B.killed += killedB;
  if(isDraw){
    A.pts++; B.pts++; A.e++; B.e++;
  } else if(aWon === true){
    A.pts+=3; A.g++; B.p++;
  } else if(aWon === false){
    B.pts+=3; B.g++; A.p++;
  } else {
    // solo para simulación IA vs IA
    if(killedA > killedB){ A.pts+=3; A.g++; B.p++; }
    else { B.pts+=3; B.g++; A.p++; }
  }
  group.matchResults = group.matchResults || [];
  group.matchResults.push({ nameA:A.country, flagA:A.flag, nameB:B.country, flagB:B.flag, killedA, killedB, isDraw });
}

// ─── Renderizar tabla de un grupo ───
function _partyRenderGroupCard(group){
  const sorted      = _partySort(group.standings);
  const hasPlayerGrp= group.standings.some(s => s.isPlayer);
  const md          = partyState.currentMatchday;
  const total       = 3;
  // Mostrar indicadores de clasificación solo si ya se jugó al menos una jornada
  const showStatus  = md > 1 || sorted.some(s => s.pj > 0);

  const rows = sorted.map((s, i) => {
    let cls = '';
    if(s.isPlayer)              cls = 'gt-player';
    else if(showStatus && i < 2) cls = 'gt-qualified';
    return `<tr class="${cls}">
      <td>${i+1}</td>
      <td title="${s.country}" style="max-width:90px">${s.flag} ${s.country}</td>
      <td>${s.pj}</td><td>${s.g}</td><td>${s.e}</td><td>${s.p}</td>
      <td><b>${s.pts}</b></td><td>${s.killed}</td>
    </tr>`;
  }).join('');

  const cardStyle = hasPlayerGrp
    ? 'border:.5px solid transparent;background:linear-gradient(var(--surface),var(--surface)) padding-box,linear-gradient(90deg,#ff6b6b,#ffd93d,#6bcb77,#4d96ff,#c77dff) border-box;'
    : '';

  return `
  <div class="group-card" style="${cardStyle}">
    <div class="group-card-title">GRUPO ${group.name}${hasPlayerGrp?' ⭐':''}</div>
    <table class="group-table">
      <tr><th>#</th><th>País</th><th>PJ</th><th>G</th><th>E</th><th>P</th><th>Pts</th><th>KO</th></tr>
      ${rows}
    </table>
  </div>`;
}

// ─── Calcular mejores terceros ───
function _partyGetBestThirds(){
  const thirds = partyState.groups.map(g => {
    const sorted = _partySort(g.standings);
    const third  = sorted[2];
    return { ...third, group: g.name };
  });
  return _partySort(thirds);
}

// ─── Renderizar sección de mejores terceros ───
function _partyRenderBest3rd(){
  const thirds = _partyGetBestThirds();
  const rows = thirds.map((t, i) => {
    const qualifies = i < 8;
    let cls = qualifies ? 'gt-best3rd' : 'gt-eliminated';
    if(t.isPlayer) cls = 'gt-player';
    return `<tr class="${cls}">
      <td>${i+1}${qualifies?'  ✓':''}</td>
      <td>${t.flag} ${t.country}</td>
      <td>Grupo ${t.group}</td>
      <td><b>${t.pts}</b></td><td>${t.killed}</td>
    </tr>`;
  }).join('');
  return `
  <div class="group-card" style="max-width:400px">
    <div class="group-card-title">MEJORES TERCEROS</div>
    <table class="group-table">
      <tr><th>#</th><th>País</th><th>Grupo</th><th>Pts</th><th>KO</th></tr>
      ${rows}
    </table>
  </div>`;
}

// ─── Pantalla principal de grupos ───
function partyShowGroupsScreen(){
  const md    = partyState.currentMatchday;
  const total = 3; // jornadas totales

  // Label de fase
  document.getElementById('partyGroupsPhaseLabel').textContent =
    md <= total ? `JORNADA ${md} DE ${total}` : 'CLASIFICACIÓN';

  // Renderizar los 12 grupos
  document.getElementById('partyGroupsGrid').innerHTML =
    partyState.groups.map(g => _partyRenderGroupCard(g)).join('');

  // Mejores terceros (solo después de jornada 1+)
  const b3el = document.getElementById('partyBest3rdSection');
  if(md > 1 || partyState.groups[0].standings[0].pj > 0){
    b3el.innerHTML = _partyRenderBest3rd();
  } else {
    b3el.innerHTML = '';
  }

  // Log de jornadas jugadas
  const logEl = document.getElementById('partyJornLog');
  if(partyState.jornLog && partyState.jornLog.length > 0){
    logEl.innerHTML = partyState.jornLog.map(entry => `
      <details style="margin-bottom:.4rem" ${entry.md === md-1 ? 'open' : ''}>
        <summary style="cursor:pointer;color:var(--text-dim);font-family:var(--font-title);font-size:9px;letter-spacing:.1em">
          JORNADA ${entry.md} — ${entry.lines.length} partidos
        </summary>
        <div style="padding:.3rem 0 0 .5rem">
          ${entry.lines.map(l=>`<div class="psm-log-item">${l}</div>`).join('')}
        </div>
      </details>`).join('');
  } else {
    logEl.innerHTML = '';
  }

  // Texto del botón
  const btn = document.getElementById('partyGroupsNextBtn');
  if(md > total){
    btn.textContent = '🏆 Ver Bracket ▶';
  } else {
    const playerGroup   = partyState.groups[partyState.playerGroupIdx];
    const jornPairs     = PARTY_GROUP_SCHEDULE[md-1];
    const playerPairIdx = jornPairs.findIndex(pair =>
      playerGroup.standings[pair[0]].isPlayer || playerGroup.standings[pair[1]].isPlayer
    );
    const opponent = (() => {
      const pair = jornPairs[playerPairIdx];
      const s    = playerGroup.standings;
      return s[pair[0]].isPlayer ? s[pair[1]] : s[pair[0]];
    })();
    btn.textContent = `⚔️ Jornada ${md} — Jugar vs ${opponent.flag} ${opponent.country}`;
  }

  const _isFirstVisit = partyState.currentMatchday === 1 &&
    partyState.groups.every(g => g.standings.every(s => s.pj === 0));
  showScreen('partyGroupsScreen');
  if(_isFirstVisit) _showMundialIntro();
}

// ─── Botón principal: simular jornada + lanzar partido del jugador ───
function partyGroupsNext(){
  const md = partyState.currentMatchday;
  if(md > 3){
    _partyBuildBracket();
    return;
  }
  _partySimulateMatchday(md, ()=>{
    partyShowGroupsScreen();
  });
}

// ─── Simular todos los partidos de una jornada excepto el del jugador ───
// Después de mostrar el modal, llama launchPartyMatch para el partido del jugador
function _partySimulateMatchday(md, afterPlayerMatch){
  const jornPairs = PARTY_GROUP_SCHEDULE[md-1];
  const simLines  = [];

  for(let gi = 0; gi < partyState.groups.length; gi++){
    const group      = partyState.groups[gi];
    const isPlayerGrp= gi === partyState.playerGroupIdx;

    for(let pi = 0; pi < jornPairs.length; pi++){
      const [ia, ib]  = jornPairs[pi];
      const standA    = group.standings[ia];
      const standB    = group.standings[ib];

      // Si es el partido del jugador en su grupo, lo saltamos (lo juega el humano)
      if(isPlayerGrp && (standA.isPlayer || standB.isPlayer)) continue;

      const result = partySimMatch(group.decks[ia], group.decks[ib]);
      _partyApplyResult(group, ia, ib, result.killedA, result.killedB, result.isDraw, result.isDraw ? undefined : result.winner==='A');

      const drawStr = result.isDraw ? ' <span style="color:#c4b0ff">(E)</span>' : '';
      simLines.push(
        `${standA.flag} ${standA.country} <b>${result.killedA}</b> — <b>${result.killedB}</b> ${standB.flag} ${standB.country}${drawStr}`
      );
    }
  }

  // Determinar rival del jugador en esta jornada
  const playerGroup   = partyState.groups[partyState.playerGroupIdx];
  const playerPairIdx = jornPairs.findIndex(pair =>
    playerGroup.standings[pair[0]].isPlayer || playerGroup.standings[pair[1]].isPlayer
  );
  const [ia, ib] = jornPairs[playerPairIdx];
  const playerStand   = playerGroup.standings.find(s => s.isPlayer);
  const opponentStand = playerGroup.standings[playerGroup.standings[ia].isPlayer ? ib : ia];

  // Iniciar entrada de log para esta jornada (el resultado del jugador se añade después)
  partyState._currentJornLines = simLines;
  partyState._currentJornMd    = md;

  // Mostrar modal con resultados simulados y luego lanzar el partido
  _partyShowSimModal(
    `JORNADA ${md} — RESULTADOS`,
    simLines,
    `Tu partido: ${playerStand.flag} ${playerStand.country} vs ${opponentStand.flag} ${opponentStand.country}`,
    ()=>{
      _partyLaunchGroupMatch(playerGroup, ia, ib, afterPlayerMatch);
    }
  );
}

// ─── Modal de resultados simulados ───
function _partyShowSimModal(title, lines, nextMsg, onClose){
  document.getElementById('psmTitle').textContent = title;
  document.getElementById('psmLog').innerHTML =
    lines.map(l => `<div class="psm-log-item">${l}</div>`).join('') || '<div class="psm-log-item" style="color:var(--text-dim)">Sin partidos simulados.</div>';
  document.getElementById('psmNext').textContent = nextMsg;
  _partySimCloseCallback = onClose;
  document.getElementById('partySimOverlay').style.display = 'flex';
}

function partySimClose(){
  document.getElementById('partySimOverlay').style.display = 'none';
  if(_partySimCloseCallback){ const cb = _partySimCloseCallback; _partySimCloseCallback=null; cb(); }
}

// ─── Lanzar el partido real del jugador (grupo) ───
function _partyLaunchGroupMatch(group, ia, ib, afterMatch){
  const standA   = group.standings[ia];
  const standB   = group.standings[ib];
  const isP1     = standA.isPlayer;
  const playerIdx= isP1 ? ia : ib;
  const oppIdx   = isP1 ? ib : ia;
  const opponent = group.standings[oppIdx];

  // Preparar partidos estándar vs bot
  botMode   = true;
  gameMode  = 'standard';
  turnNumber= 1; attackUsed=false; isOnline=false; logEntries=[];
  document.getElementById('logWrap').innerHTML = '';

  const makePartyPlayer = (name, deckIds) => {
    const cards = shuffle(deckIds.map(id => makeCard(CARD_POOL.find(c => c.id===id))));
    return { name, active: cards.shift(), pile: cards };
  };

  const _pCountryObj = PARTY_COUNTRIES.find(c=>c.name===partyState.playerCountry)||{};
  const _pFlagStr = (_pCountryObj.flag||'') + ' ' + (partyState.playerCountry||partyState.playerName);
  p1 = makePartyPlayer(_pFlagStr.trim(), group.decks[playerIdx]);
  p2 = makePartyPlayer(`${opponent.flag} ${opponent.country}`, group.decks[oppIdx]);
  p1.num = 1; p2.num = 2;
  p1.kills = 0; p2.kills = 0;
  window._gameP1Deck = [...group.decks[playerIdx]];
  window._gameCardKOs = {};

  // Guardar contexto para cuando termine el partido
  partyState._pendingGroupMatch = { group, ia, ib, playerIdx, oppIdx, afterMatch };

  buildGameUI_Standard();
  showScreen('gameScreen');
  addLog(`🌍 Jornada ${partyState.currentMatchday} — ${p1.name} vs ${p2.name}`, 'log-sys');
  showRoulette(
    [{num:1,name:p1.name,color:ROUL_COLORS[0]},{num:2,name:p2.name,color:ROUL_COLORS[1]}],
    startNum => {
      currentPlayer = startNum;
      addLog('— Turno 1: '+(startNum===1?p1:p2).name+' comienza —','log-sys');
      renderGame(); maybeTriggerBot();
    }
  );
}

// ─── Procesar resultado real del combate de grupos ───
function _partyOnGroupMatchEnd(winner, isDraw, p1Kills, p2Kills){
  const { group, ia, ib, playerIdx, oppIdx, afterMatch } = partyState._pendingGroupMatch;
  partyState._pendingGroupMatch = null;

  // p1 siempre es el jugador en los partidos del torneo
  const playerIsA = playerIdx === ia;
  const killedA   = playerIsA ? p1Kills : p2Kills;
  const killedB   = playerIsA ? p2Kills : p1Kills;

  // aWon: ¿ganó el equipo en posición ia? p1=jugador siempre, winner.num===1 → jugador ganó
  const aWon = isDraw ? undefined : (winner && winner.num === 1) === playerIsA;

  _partyApplyResult(group, ia, ib, killedA, killedB, isDraw, isDraw ? undefined : aWon);

  // Agregar resultado del jugador al log de jornada
  if(partyState._currentJornLines !== undefined){
    const standA = group.standings[ia];
    const standB = group.standings[ib];
    const hl     = 'style="color:#6bcb77;font-weight:bold"';
    // Resaltar al ganador en el marcador
    const _dk = isDraw ? Math.min(killedA, killedB) : null;
    const resultLine = isDraw
      ? `<span style="color:#c4b0ff">${standA.flag} ${standA.country} <b>${_dk}</b> — <b>${_dk}</b> ${standB.flag} ${standB.country} (empate)</span>`
      : `${standA.flag} ${standA.country} <span ${aWon?hl:''}><b>${killedA}</b></span> — <span ${!aWon?hl:''}><b>${killedB}</b></span> ${standB.flag} ${standB.country}`;

    partyState.jornLog.push({
      md:    partyState._currentJornMd,
      lines: [...partyState._currentJornLines, resultLine],
    });
    delete partyState._currentJornLines;
    delete partyState._currentJornMd;
  }

  // Track individual match stats
  var _pgWon = !isDraw && winner && winner.num === 1;
  _trackMatch({ won:_pgWon, lost:!isDraw&&!_pgWon, drawn:isDraw, myKOs:p1Kills, oppKOs:p2Kills, mode:'standard' });
  // Déjà Vu: registrar equipo derrotado en grupos
  if(_pgWon){
    const _opp = group.standings[playerIdx === ia ? ib : ia];
    partyState._groupBeaten = partyState._groupBeaten || [];
    if(_opp && !partyState._groupBeaten.includes(_opp.country)) partyState._groupBeaten.push(_opp.country);
  }

  partyState.currentMatchday++;
  _saveTourneyProgress();
  afterMatch();
}

/* ═══════════════════════════════════════════════
   MODO FIESTA — CLASIFICACIÓN Y BRACKET
═══════════════════════════════════════════════ */

// ─── Helper: obtener equipo por posición en grupo ───
function _partyGetGroupTeam(pos, groupName){
  const group  = partyState.groups.find(g => g.name === groupName);
  const sorted = _partySort(group.standings);
  const s      = sorted[pos-1];
  const deckIdx= group.standings.indexOf(group.standings.find(st => st.country === s.country));
  return { name:s.country, flag:s.flag, isPlayer:s.isPlayer, deck:group.decks[deckIdx] };
}

// ─── Helper: obtener Nth mejor tercero con su mazo ───
function _partyGetBest3rdByRank(rank){
  const thirds = _partyGetBestThirds();
  const t      = thirds[rank-1];
  const group  = partyState.groups.find(g => g.standings.some(s => s.country === t.country));
  const deckIdx= group.standings.indexOf(group.standings.find(s => s.country === t.country));
  return { name:t.country, flag:t.flag, isPlayer:t.isPlayer, deck:group.decks[deckIdx] };
}

// ─── Construir bracket desde clasificados de grupos ───
function _partyBuildBracket(){
  // Verificar clasificación del jugador
  const pg         = partyState.groups[partyState.playerGroupIdx];
  const pgSorted   = _partySort(pg.standings);
  const playerPos  = pgSorted.findIndex(s => s.isPlayer) + 1; // 1-4

  const thirds          = _partyGetBestThirds();
  const playerThirdRank = thirds.findIndex(t => t.isPlayer) + 1; // 1-12 (0 si no es tercero)
  const playerIn8Thirds = playerPos === 3 && playerThirdRank >= 1 && playerThirdRank <= 8;

  const playerQualified = playerPos <= 2 || playerIn8Thirds;
  if(playerIn8Thirds && playerThirdRank === 8){ var _sq=_loadStats(); _sq.mundialBarely=(_sq.mundialBarely||0)+1; _saveStats(_sq); _checkAchievements(_sq); }

  const g = _partyGetGroupTeam;
  const t = _partyGetBest3rdByRank;

  // R32 según especificación exacta del usuario
  const r32Pairs = [
    [g(1,'A'), t(8)],   // P1
    [g(2,'B'), g(2,'F')],// P2
    [g(1,'C'), t(7)],   // P3
    [g(1,'E'), t(6)],   // P4
    [g(1,'G'), t(5)],   // P5
    [g(2,'H'), g(2,'L')],// P6
    [g(1,'I'), t(4)],   // P7
    [g(1,'K'), t(3)],   // P8
    [g(1,'B'), t(2)],   // P9
    [g(2,'A'), g(2,'E')],// P10
    [g(1,'D'), t(1)],   // P11
    [g(1,'F'), g(2,'J')],// P12
    [g(1,'H'), g(2,'D')],// P13
    [g(1,'J'), g(2,'G')],// P14
    [g(1,'L'), g(2,'C')],// P15
    [g(2,'I'), g(2,'K')],// P16
  ];

  const makeMatch = (home, away, id) => ({
    id, home, away, winner:null, loser:null, homeKilled:0, awayKilled:0,
  });
  const makeTBD = (n, prefix) =>
    Array.from({length:n},(_,i) => makeMatch(null,null,`${prefix}_${i}`));

  partyState.bracket = {
    r32:   r32Pairs.map(([h,a],i) => makeMatch(h,a,`r32_${i}`)),
    r16:   makeTBD(8,'r16'),
    qf:    makeTBD(4,'qf'),
    sf:    makeTBD(2,'sf'),
    third: makeTBD(1,'third'),
    final: makeTBD(1,'final'),
    sfLosers: [],
  };
  partyState.phase = 'knockout';

  if(!playerQualified){
    // Jugador no clasificó: simular todo el bracket y mostrar eliminación con bracket disponible
    _partySimulateFullBracket();
    _partyShowElimination('groups');
    return;
  }

  _partyEnterKnockoutRound('r32');
}

// ─── Entrar a una ronda de la eliminatoria ───
const ROUND_LABELS = {r32:'RONDA DE 32',r16:'OCTAVOS DE FINAL',qf:'CUARTOS DE FINAL',sf:'SEMIFINALES',third:'TERCER PUESTO',final:'GRAN FINAL'};
const ROUND_FEED   = {r32:'r16',r16:'qf',qf:'sf',sf:null};

function _partyEnterKnockoutRound(roundName){
  partyState.bracket.currentRound = roundName;
  const matches = partyState.bracket[roundName];

  // Verificar si el jugador tiene partido en esta ronda
  const playerMatchIdx = matches.findIndex(m =>
    (m.home && m.home.isPlayer) || (m.away && m.away.isPlayer)
  );

  if(playerMatchIdx === -1){
    // Jugador no tiene partido → eliminado (o nunca clasificó)
    _partyShowElimination(roundName); return;
  }

  partyState.bracket.playerMatchIdx = playerMatchIdx;

  // Simular todos los partidos que NO involucran al jugador
  const simLines = [];
  for(let i = 0; i < matches.length; i++){
    const m = matches[i];
    if(!m.home || !m.away || m.winner) continue;
    if(i === playerMatchIdx) continue; // este lo juega el humano

    const res = partySimMatch(m.home.deck, m.away.deck);
    m.winner   = res.winner === 'A' ? m.home : m.away;
    m.loser    = res.winner === 'A' ? m.away : m.home;
    m.homeKilled = res.killedA;
    m.awayKilled = res.killedB;
    simLines.push(
      `${m.home.flag} ${m.home.name} <b>${res.killedA}</b> — <b>${res.killedB}</b> ${m.away.flag} ${m.away.name}`
    );

    // Guardar perdedores de SF para el 3er puesto
    if(roundName === 'sf') partyState.bracket.sfLosers.push(m.loser);
  }

  const pm    = matches[playerMatchIdx];
  const rival = pm.home.isPlayer ? pm.away : pm.home;

  _partyShowSimModal(
    ROUND_LABELS[roundName] + ' — RESULTADOS',
    simLines,
    `Tu partido: ${pm.home.flag} ${pm.home.name} vs ${pm.away.flag} ${pm.away.name}`,
    ()=>{
      _partyFeedNextFromRound(roundName);
      renderPartyBracket();
      document.getElementById('partyBracketPhaseLabel').textContent = ROUND_LABELS[roundName];
      document.getElementById('partyBracketNextBtn').textContent =
        `Jugar vs ${rival.flag} ${rival.name} ▶`;
      // Restaurar botones si venían de pantalla de eliminación
      _partyRestoreBracketBtns();
      showScreen('partyBracketScreen');
    }
  );
}

// ─── Simular TODOS los partidos restantes del bracket (cuando el jugador es eliminado) ───
function _partySimulateFullBracket(){
  var rounds = ['r32','r16','qf','sf'];
  for(var ri = 0; ri < rounds.length; ri++){
    var rName = rounds[ri];
    var rMatches = partyState.bracket[rName];
    if(!rMatches) continue;
    for(var mi = 0; mi < rMatches.length; mi++){
      var m = rMatches[mi];
      if(m.winner || !m.home || !m.away) continue;
      var res = partySimMatch(m.home.deck, m.away.deck);
      var koWinner = res.isDraw ? (_deckStars(m.home.deck)>=_deckStars(m.away.deck)?'A':'B') : res.winner;
      m.winner = koWinner === 'A' ? m.home : m.away;
      m.loser  = koWinner === 'A' ? m.away : m.home;
      m.homeKilled = res.killedA; m.awayKilled = res.killedB;
      if(rName === 'sf') partyState.bracket.sfLosers.push(m.loser);
    }
    _partyFeedNextFromRound(rName);
  }
  // Simular tercer puesto y final
  var extraRounds = ['third','final'];
  for(var ei = 0; ei < extraRounds.length; ei++){
    var eArr = partyState.bracket[extraRounds[ei]];
    var em = eArr && eArr[0];
    if(em && em.home && em.away && !em.winner){
      var eres = partySimMatch(em.home.deck, em.away.deck);
      var eWinner = eres.isDraw ? (_deckStars(em.home.deck)>=_deckStars(em.away.deck)?'A':'B') : eres.winner;
      em.winner = eWinner === 'A' ? em.home : em.away;
      em.loser  = eWinner === 'A' ? em.away : em.home;
      em.homeKilled = eres.killedA; em.awayKilled = eres.killedB;
    }
  }
}

// ─── Alimentar la siguiente ronda con ganadores ───
function _partyFeedNextFromRound(roundName){
  // SF: armar partido por tercer puesto y final (antes del return, ya que ROUND_FEED['sf']=null)
  if(roundName === 'sf'){
    const sfMatches = partyState.bracket.sf;
    const loserA    = sfMatches[0] && sfMatches[0].loser;
    const loserB    = sfMatches[1] && sfMatches[1].loser;
    if(loserA) partyState.bracket.third[0].home = loserA;
    if(loserB) partyState.bracket.third[0].away = loserB;
    const winA = sfMatches[0] && sfMatches[0].winner;
    const winB = sfMatches[1] && sfMatches[1].winner;
    if(winA) partyState.bracket.final[0].home = winA;
    if(winB) partyState.bracket.final[0].away = winB;
    return;
  }

  const nextName = ROUND_FEED[roundName];
  if(!nextName) return;
  const matches  = partyState.bracket[roundName];
  const next     = partyState.bracket[nextName];

  // Los ganadores se llenan en pares: (P1ganador vs P2ganador), (P3 vs P4), ...
  for(let i = 0; i < next.length; i++){
    const mA = matches[i*2];
    const mB = matches[i*2+1];
    if(mA && mA.winner) next[i].home = mA.winner;
    if(mB && mB.winner) next[i].away = mB.winner;
  }
}

// ─── Botón "Siguiente partido" en bracket screen ───
function partyBracketNext(){
  const roundName  = partyState.bracket.currentRound;
  const matchIdx   = partyState.bracket.playerMatchIdx;
  const match      = partyState.bracket[roundName][matchIdx];
  _partyLaunchKnockoutMatch(roundName, matchIdx, match);
}

// ─── Lanzar partido eliminatorio del jugador ───
function _partyLaunchKnockoutMatch(roundName, matchIdx, match){
  botMode   = true;
  gameMode  = 'standard';
  turnNumber= 1; attackUsed=false; isOnline=false; logEntries=[];
  document.getElementById('logWrap').innerHTML = '';

  const playerTeam  = match.home.isPlayer ? match.home : match.away;
  const opponentTeam= match.home.isPlayer ? match.away : match.home;

  const makeKPlayer = (t) => {
    const cards = shuffle([...t.deck].map(id => makeCard(CARD_POOL.find(c => c.id===id))));
    const _kpFlagObj = t.isPlayer ? (PARTY_COUNTRIES.find(c=>c.name===partyState.playerCountry)||{}) : {};
    const _kpName = t.isPlayer
      ? ((_kpFlagObj.flag||'') + ' ' + (partyState.playerCountry||partyState.playerName)).trim()
      : `${t.flag} ${t.name}`;
    const obj   = { name: _kpName, active: cards.shift(), pile: cards };
    obj.num     = t.isPlayer ? 1 : 2;
    obj.kills   = 0;
    return obj;
  };

  p1 = makeKPlayer(playerTeam);
  p2 = makeKPlayer(opponentTeam);
  p1.num = 1; p2.num = 2;
  window._gameP1Deck = [...playerTeam.deck];
  window._gameCardKOs = {};

  partyState._pendingKnockout = { roundName, matchIdx };

  buildGameUI_Standard();
  showScreen('gameScreen');
  const roundLabel = ROUND_LABELS[roundName] || roundName;
  addLog(`🌍 ${roundLabel} — ${p1.name} vs ${p2.name}`, 'log-sys');
  showRoulette(
    [{num:1,name:p1.name,color:ROUL_COLORS[0]},{num:2,name:p2.name,color:ROUL_COLORS[1]}],
    startNum => {
      currentPlayer = startNum;
      addLog('— Turno 1: '+(startNum===1?p1:p2).name+' comienza —','log-sys');
      renderGame(); maybeTriggerBot();
    }
  );
}

// ─── Procesar resultado eliminatorio ───
function _partyOnKnockoutMatchEnd(winner, isDraw, p1Kills, p2Kills){
  const { roundName, matchIdx } = partyState._pendingKnockout;
  partyState._pendingKnockout = null;

  const match       = partyState.bracket[roundName][matchIdx];
  const playerIsHome= match.home.isPlayer;

  // p1 = jugador siempre. winner.num===1 → jugador ganó, ===2 → oponente ganó
  const playerWon = !isDraw && winner && winner.num === 1;

  // Registrar en knockoutLog
  const _opp      = playerIsHome ? match.away : match.home;
  const _myKills  = playerIsHome ? p1Kills : p2Kills;
  const _oppKills = playerIsHome ? p2Kills : p1Kills;
  partyState.knockoutLog = partyState.knockoutLog || [];
  partyState.knockoutLog.push({
    round: roundName,
    won: playerWon,
    myKills: _myKills,
    oppKills: _oppKills,
    oppName: _opp ? _opp.name : '?',
    oppFlag: _opp ? (_opp.flag||'') : '',
  });
  _trackMatch({ won:playerWon, lost:!playerWon, myKOs:_myKills, oppKOs:_oppKills, mode:'standard' });
  // Déjà Vu Mundial: ganó en grupos y vuelve a ganar en eliminatoria vs el mismo equipo
  if(playerWon && _opp && (partyState._groupBeaten||[]).includes(_opp.name)){
    var _dvu=_loadStats(); _dvu.mundialDejaVu=(_dvu.mundialDejaVu||0)+1; _saveStats(_dvu); _checkAchievements(_dvu);
  }

  if(!playerWon){
    // Jugador perdió (o empate = derrota en eliminatoria)
    const loserTeam = playerIsHome ? match.home : match.away;
    const winTeam   = playerIsHome ? match.away : match.home;
    match.winner    = winTeam;
    match.loser     = loserTeam;
    match.homeKilled= playerIsHome ? p1Kills : p2Kills;
    match.awayKilled= playerIsHome ? p2Kills : p1Kills;

    if(roundName === 'sf'){
      // Jugador perdió en semis → juega por el tercer puesto
      partyState.bracket.sfLosers.push(loserTeam);
      _partyFeedNextFromRound(roundName);
      // Simular la final ya (para mostrar bracket completo luego)
      const fin = partyState.bracket.final[0];
      if(fin && fin.home && fin.away && !fin.winner){
        const res = partySimMatch(fin.home.deck, fin.away.deck);
        const kw = res.isDraw ? (_deckStars(fin.home.deck)>=_deckStars(fin.away.deck)?'A':'B') : res.winner;
        fin.winner = kw==='A' ? fin.home : fin.away;
        fin.loser  = kw==='A' ? fin.away : fin.home;
        fin.homeKilled = res.killedA; fin.awayKilled = res.killedB;
      }
      _saveTourneyProgress();
      _partyEnterKnockoutRound('third');
      return;
    }

    if(roundName === 'third'){
      // Jugador perdió el partido por 3er puesto → queda 4.°
      _partySimulateFullBracket();
      _clearTourneyProgress();
      renderPartyBracket();
      _partyShowElimination('third');
      return;
    }

    _partyFeedNextFromRound(roundName);
    _partySimulateFullBracket();
    _clearTourneyProgress();
    renderPartyBracket();
    _partyShowElimination(roundName);
    return;
  }

  // Jugador ganó
  const playerTeam  = playerIsHome ? match.home : match.away;
  const oppTeam     = playerIsHome ? match.away : match.home;
  match.winner      = playerTeam;
  match.loser       = oppTeam;
  match.homeKilled  = playerIsHome ? p1Kills : p2Kills;
  match.awayKilled  = playerIsHome ? p2Kills : p1Kills;

  if(roundName === 'third'){
    // Jugador ganó el partido por 3er puesto → queda 3.°
    _clearTourneyProgress();
    renderPartyBracket();
    _partyShowElimination('third_win');
    return;
  }

  if(roundName === 'sf') partyState.bracket.sfLosers.push(oppTeam);

  _partyFeedNextFromRound(roundName);

  // Determinar siguiente ronda
  const nextRound = ROUND_FEED[roundName];
  if(roundName === 'sf'){
    const thirdMatch = partyState.bracket.third[0];
    if(thirdMatch.home && thirdMatch.away && !thirdMatch.home.isPlayer && !thirdMatch.away.isPlayer){
      const res = partySimMatch(thirdMatch.home.deck, thirdMatch.away.deck);
      thirdMatch.winner   = res.winner==='A' ? thirdMatch.home : thirdMatch.away;
      thirdMatch.loser    = res.winner==='A' ? thirdMatch.away : thirdMatch.home;
      thirdMatch.homeKilled = res.killedA;
      thirdMatch.awayKilled = res.killedB;
    }
    _saveTourneyProgress();
    _partyEnterKnockoutRound('final');
  } else if(roundName === 'final'){
    _clearTourneyProgress();
    _partyShowChampion();
  } else if(nextRound){
    _saveTourneyProgress();
    _partyEnterKnockoutRound(nextRound);
  } else {
    _clearTourneyProgress();
    _partyShowChampion();
  }
}

// ─── Renderizar bracket ───
function renderPartyBracket(){
  const roundOrder = ['r32','r16','qf','sf','final'];
  const roundTitles= {r32:'RONDA DE 32',r16:'OCTAVOS',qf:'CUARTOS',sf:'SEMIS',final:'FINAL'};
  const container  = document.getElementById('partyBracketRounds');
  if(!container || !partyState.bracket) return;

  container.innerHTML = roundOrder.map(rName => {
    const matches = partyState.bracket[rName];
    if(!matches) return '';
    const matchCards = matches.map(m => _partyBracketMatchHTML(m)).join('');
    return `
    <div class="bracket-col">
      <div class="bracket-col-title">${roundTitles[rName]}</div>
      ${matchCards}
    </div>`;
  }).join('');

  // 3er puesto como columna extra si SF ya jugado
  const thirdMatch = partyState.bracket.third && partyState.bracket.third[0];
  if(thirdMatch && (thirdMatch.home || thirdMatch.winner)){
    container.innerHTML += `
    <div class="bracket-col">
      <div class="bracket-col-title">3.er PUESTO</div>
      ${_partyBracketMatchHTML(thirdMatch)}
    </div>`;
  }
}

function _partyBracketMatchHTML(m){
  const isPlayerMatch = (m.home && m.home.isPlayer) || (m.away && m.away.isPlayer);
  const cls = isPlayerMatch ? 'bm bm-player-match' : 'bm';

  const homeWon = m.winner && m.home && m.winner.name === m.home.name;
  const awayWon = m.winner && m.away && m.winner.name === m.away.name;

  const teamHTML = (team, isWinner, score) => {
    if(!team) return `<div class="bm-team bm-tbd">Por definir</div>`;
    let tcls = 'bm-team';
    if(team.isPlayer) tcls += ' bm-player-team';
    if(isWinner)      tcls += ' bm-winner';
    const scoreStr = m.winner !== null && score !== undefined
      ? `<span style="margin-left:4px;font-size:9px;opacity:.8">${score}</span>` : '';
    return `<div class="${tcls}">${team.flag} ${team.name}${scoreStr}</div>`;
  };

  const vsText = m.winner ? '' : 'vs';

  return `
  <div class="${cls}">
    ${teamHTML(m.home, homeWon, m.homeKilled)}
    <div class="bm-vs">${vsText}</div>
    ${teamHTML(m.away, awayWon, m.awayKilled)}
  </div>`;
}

function _partyBracketMatchHTML(m){
  const isPlayerMatch = (m.home && m.home.isPlayer) || (m.away && m.away.isPlayer);
  const cls = isPlayerMatch ? 'bm bm-player-match' : 'bm';

  const homeWon = m.winner && m.home && m.winner.name === m.home.name;
  const awayWon = m.winner && m.away && m.winner.name === m.away.name;

  const teamHTML = (team, isWinner, score) => {
    if(!team) return `<div class="bm-team bm-tbd">Por definir</div>`;
    let tcls = 'bm-team';
    if(team.isPlayer) tcls += ' bm-player-team';
    if(isWinner)      tcls += ' bm-winner';
    const scoreStr = m.winner !== null && score !== undefined
      ? `<span style="margin-left:4px;font-size:9px;opacity:.8">${score}</span>` : '';
    return `<div class="${tcls}">${team.flag} ${team.name}${scoreStr}</div>`;
  };

  const vsText = m.winner ? '' : 'vs';

  return `
  <div class="${cls}">
    ${teamHTML(m.home, homeWon, m.homeKilled)}
    <div class="bm-vs">${vsText}</div>
    ${teamHTML(m.away, awayWon, m.awayKilled)}
  </div>`;
}

// ─── Pantallas finales ───
function _partyBuildJourney(){
  if(!partyState) return '';
  const lines = [];

  // Fase de grupos
  const pg = partyState.groups[partyState.playerGroupIdx];
  if(pg){
    const ps = pg.standings.find(s=>s.isPlayer);
    if(ps) lines.push(`📋 Grupos — ${ps.pts} pts · ${ps.g}V ${ps.e}E ${ps.p}D · ${ps.killed} KO`);
  }

  // Rondas eliminatorias jugadas (partidos del jugador)
  const roundLabels = { r32:'Ronda de 32', r16:'Octavos', qf:'Cuartos', sf:'Semis', third:'3.er Puesto', final:'Final' };
  (partyState.knockoutLog || []).forEach(e => {
    const label  = roundLabels[e.round] || e.round;
    const result = e.won ? '✅' : '❌';
    lines.push(`${result} ${label} — ${e.myKills}–${e.oppKills} vs ${e.oppFlag} ${e.oppName}`);
  });

  // Mostrar quién ganó el torneo (si ya está simulado)
  const finalM = partyState.bracket && partyState.bracket.final && partyState.bracket.final[0];
  if(finalM && finalM.winner && !partyState.knockoutLog.some(e=>e.round==='final')){
    lines.push(`🏆 Campeón: ${finalM.winner.flag||''} ${finalM.winner.name}`);
  }

  return lines.join('<br>');
}

function _partyShowElimination(phase){
  const phaseNames = {
    groups:    'la Fase de Grupos',
    r32:       'la Ronda de 32',
    r16:       'Octavos de Final',
    qf:        'Cuartos de Final',
    sf:        'Semifinales',
    final:     'la Gran Final',
    third:     'el Partido por 3.er Puesto',
    third_win: 'el Partido por 3.er Puesto',
  };
  const trophies  = { groups:'😔', r32:'😔', r16:'🏅', qf:'🏅', sf:'🥈', final:'🥈', third:'🏅', third_win:'🥉' };
  const positions = {
    groups: 'ELIMINADO EN GRUPOS', r32: 'ELIMINADO EN RONDA 32', r16: 'ELIMINADO EN OCTAVOS',
    qf: 'ELIMINADO EN CUARTOS', sf: 'ELIMINADO EN SEMIS', final: 'SUBCAMPEÓN',
    third: '4.° PUESTO', third_win: '3.er PUESTO',
  };
  const country = partyState.playerCountry;
  const flag    = (PARTY_COUNTRIES.find(c=>c.name===country)||{}).flag || '';

  document.getElementById('partyElimTrophy').textContent = trophies[phase] || '❌';
  document.getElementById('partyElimTitle').textContent  = positions[phase] || 'ELIMINADO';

  if(phase === 'third_win'){
    document.getElementById('partyElimSub').innerHTML =
      `${flag} <b>${country}</b><br>` +
      `ganó el partido por el <b>tercer puesto</b>. 🥉<br><br>` +
      `¡Gracias por participar en el Mundial Nexus 2026!`;
  } else if(phase === 'third'){
    document.getElementById('partyElimSub').innerHTML =
      `${flag} <b>${country}</b><br>` +
      `terminó en <b>cuarto lugar</b>.<br><br>` +
      `¡Gracias por participar en el Mundial Nexus 2026!`;
  } else {
    document.getElementById('partyElimSub').innerHTML =
      `${flag} <b>${country}</b><br>` +
      `quedó eliminado en <b>${phaseNames[phase]||phase}</b>.<br><br>` +
      `¡Gracias por participar en el Mundial Nexus 2026!`;
  }
  document.getElementById('partyElimRoute').innerHTML = _partyBuildJourney();

  // NO nulleamos partyState aquí: se necesita para historial y bracket
  _clearTourneyProgress();
  var _mChamp = partyState.bracket && partyState.bracket.final && partyState.bracket.final[0] && partyState.bracket.final[0].winner;
  var _bestPhase = (phase === 'third_win' || phase === 'third') ? 'sf' : phase;
  _trackMatch({ isTournamentOnly:true, mundialEnd:true, mundialBest:_bestPhase, mundialWon:false, champName:_mChamp ? (_mChamp.flag||'')+' '+_mChamp.name : '—' });
  showScreen('partyElimScreen');
}

function _partyGoToMenu(){
  partyState = null;
  _clearTourneyProgress();
  showScreen('titleScreen');
}

function _partyShowBracketFromElim(returnScreen){
  if(!partyState || !partyState.bracket){ return; }
  var back = returnScreen || 'partyElimScreen';
  renderPartyBracket();
  document.getElementById('partyBracketNextBtn').style.display = 'none';
  var quitBtn = document.querySelector('#partyBracketScreen .btn-sm');
  if(quitBtn) quitBtn.style.display = 'none';
  var backBtn = document.getElementById('partyBracketBackBtn');
  if(!backBtn){
    var actDiv = document.getElementById('partyBracketNextBtn').parentElement;
    var b = document.createElement('button');
    b.className = 'btn'; b.id = 'partyBracketBackBtn';
    b.textContent = '← Volver';
    b.onclick = function(){ _partyRestoreBracketBtns(); showScreen(back); };
    actDiv.appendChild(b);
  } else {
    backBtn.style.display = '';
    backBtn.onclick = function(){ _partyRestoreBracketBtns(); showScreen(back); };
  }
  showScreen('partyBracketScreen');
}

function _partyRestoreBracketBtns(){
  var nb = document.getElementById('partyBracketNextBtn');
  if(nb) nb.style.display = '';
  var quitBtn = document.querySelector('#partyBracketScreen .btn-sm');
  if(quitBtn) quitBtn.style.display = '';
  var backBtn = document.getElementById('partyBracketBackBtn');
  if(backBtn) backBtn.style.display = 'none';
}

function _partyShowHist(returnScreen){
  var back = returnScreen || 'partyElimScreen';
  var list = document.getElementById('partyHistList');
  if(!list){ showScreen('partyHistScreen'); return; }
  list.innerHTML = '';
  var backBtn = document.getElementById('partyHistBackBtn');
  if(backBtn) backBtn.onclick = function(){ showScreen(back); };

  var html = '';
  var jornLog = (partyState && partyState.jornLog) || [];
  jornLog.forEach(function(entry){
    html += '<div style="font-weight:700;margin-top:.6rem;font-size:10px;letter-spacing:1px;color:var(--purple)">'
          + '— JORNADA ' + entry.md + ' —</div>';
    (entry.lines || []).forEach(function(line){
      html += '<div style="padding:2px 6px;border-radius:3px;font-size:11px">' + line + '</div>';
    });
  });

  // Rondas eliminatorias: mostrar TODOS los partidos del bracket
  var bracketRounds = ['r32','r16','qf','sf','third','final'];
  var roundLabels   = { r32:'RONDA DE 32', r16:'OCTAVOS DE FINAL', qf:'CUARTOS DE FINAL',
                        sf:'SEMIFINALES', third:'TERCER PUESTO', final:'GRAN FINAL' };
  var bracket = partyState && partyState.bracket;
  if(bracket){
    // Mapear knockoutLog por ronda para saber cuál fue el partido del jugador
    var playerMatchByRound = {};
    (partyState.knockoutLog || []).forEach(function(e){ playerMatchByRound[e.round] = e; });

    bracketRounds.forEach(function(rName){
      var rMatches = bracket[rName];
      if(!rMatches || !rMatches.length) return;
      // Solo mostrar rondas que ya se jugaron
      var hasResults = rMatches.some(function(m){ return m && m.winner; });
      if(!hasResults) return;

      var lbl = roundLabels[rName] || rName.toUpperCase();
      html += '<div style="font-weight:700;margin-top:.6rem;font-size:10px;letter-spacing:1px;color:#c9a84c">'
            + '— ' + lbl + ' —</div>';

      rMatches.forEach(function(m){
        if(!m || !m.home || !m.away) return;
        var homeIsPlayer = m.home && m.home.isPlayer;
        var awayIsPlayer = m.away && m.away.isPlayer;
        var isPlayerMatch = homeIsPlayer || awayIsPlayer;
        var homeWon = m.winner && m.winner === m.home;
        var hFlag = (m.home.flag||''); var aFlag = (m.away.flag||'');
        var hName = m.home.name; var aName = m.away.name;
        var hK = m.homeKilled||0; var aK = m.awayKilled||0;

        var hStyle = homeWon ? 'font-weight:bold;color:#6bcb77' : '';
        var aStyle = !homeWon && m.winner ? 'font-weight:bold;color:#6bcb77' : '';
        if(isPlayerMatch){
          var icon = (homeIsPlayer ? homeWon : !homeWon) ? '✅' : '❌';
          html += '<div style="padding:2px 6px;border-radius:3px;font-size:11px;background:rgba(255,255,255,.04)">'
                + icon + ' '
                + '<span style="' + (homeIsPlayer?'font-weight:bold':'') + '">' + hFlag + ' ' + hName + '</span>'
                + ' <b>' + hK + '</b> — <b>' + aK + '</b> '
                + '<span style="' + (awayIsPlayer?'font-weight:bold':'') + '">' + aFlag + ' ' + aName + '</span>'
                + '</div>';
        } else {
          html += '<div style="padding:2px 6px;border-radius:3px;font-size:11px;color:var(--text-muted)">'
                + '<span style="' + hStyle + '">' + hFlag + ' ' + hName + ' <b>' + hK + '</b></span>'
                + ' — '
                + '<span style="' + aStyle + '"><b>' + aK + '</b> ' + aFlag + ' ' + aName + '</span>'
                + '</div>';
        }
      });
    });
  }

  if(!html){
    html = '<div style="color:var(--text-dim);text-align:center;padding:1rem;font-size:11px">Sin resultados aún.</div>';
  }
  list.innerHTML = html;
  showScreen('partyHistScreen');
}

function _partyShowChampion(){
  const country = partyState.playerCountry;
  const flag    = (PARTY_COUNTRIES.find(c=>c.name===country)||{}).flag || '';
  document.getElementById('partyChampSub').innerHTML =
    `${flag} <b>${country}</b><br>` +
    `<span style="font-size:11px;color:var(--text-muted)">${partyState.playerName} conquistó el Mundial Nexus 2026.</span>`;
  document.getElementById('partyChampRoute').innerHTML = _partyBuildJourney();
  // NO nulleamos partyState: se necesita para historial y bracket
  var _pCountryObj = PARTY_COUNTRIES.find(function(c){ return c.name === partyState.playerCountry; }) || {};
  var _pChampName = (_pCountryObj.flag ? _pCountryObj.flag+' ' : '') + (partyState.playerCountry || partyState.playerName || '—');
  _trackMatch({ isTournamentOnly:true, mundialEnd:true, mundialWon:true, champName:_pChampName });
  showScreen('partyChampScreen');
}

/* ─── Quit torneo ─── */
function partyQuitTournament(){
  if(!confirm('¿Abandonar el torneo? Perderás todo el progreso.')) return;
  partyState = null;
  _clearTourneyProgress();
  showScreen('titleScreen');
}

/* ── Overlay de conexión perdida ── */
function showConnLost(){
  const el = document.getElementById('connLostOverlay');
  if(el){ el.style.display='flex'; }
}
function hideConnLost(){
  const el = document.getElementById('connLostOverlay');
  if(el){ el.style.display='none'; }
}

/* ── Banner "Reconectando..." ── */
var _reconnDotsTimer = null;
var _fbConnectedListener = null;

function _showReconnecting(){
  var b = document.getElementById('reconnectingBanner');
  if(!b || b.style.display !== 'none') return;
  b.style.display = 'block';
  var dots = ['⟳ ', '⟳⟳ ', '⟳⟳⟳'];
  var i = 0;
  _reconnDotsTimer = setInterval(function(){
    var el = document.getElementById('reconnectingDots');
    if(el){ el.textContent = dots[i % dots.length]; i++; }
  }, 500);
}
function _hideReconnecting(){
  var b = document.getElementById('reconnectingBanner');
  if(b) b.style.display = 'none';
  if(_reconnDotsTimer){ clearInterval(_reconnDotsTimer); _reconnDotsTimer = null; }
}
function _startConnListener(){
  _stopConnListener();
  // Detección instantánea por el navegador
  window.addEventListener('offline', _onNetOffline);
  window.addEventListener('online',  _onNetOnline);
  // Detección Firebase como respaldo (más lenta, ~60s)
  if(firebase && firebase.database){
    var connRef = firebase.database().ref('.info/connected');
    _fbConnectedListener = connRef.on('value', function(snap){
      if(snap.val() === false) _showReconnecting();
      else _hideReconnecting();
    });
  }
}
function _onNetOffline(){ if(isOnline) _showReconnecting(); }
function _onNetOnline(){  _hideReconnecting(); }
function _stopConnListener(){
  window.removeEventListener('offline', _onNetOffline);
  window.removeEventListener('online',  _onNetOnline);
  if(_fbConnectedListener !== null){
    try{ firebase.database().ref('.info/connected').off('value', _fbConnectedListener); }catch(e){}
    _fbConnectedListener = null;
  }
  _hideReconnecting();
}
/* ═══════════════════════════════════════════════
   DEV PANEL — activar escribiendo "nexusdev"
═══════════════════════════════════════════════ */
function toggleDevPanel(){
  let panel = document.getElementById('_devPanel');
  if(!panel){
    panel = document.createElement('div');
    panel.id = '_devPanel';
    panel.style.cssText = 'position:fixed;bottom:0;left:0;right:0;z-index:99999;background:#0d0d1aee;border-top:1px solid #7c3aed;border-radius:14px 14px 0 0;padding:12px 16px 20px;font-family:monospace;font-size:11px;color:#c4b0ff;box-shadow:0 0 30px #7c3aed44;max-height:55vh;overflow-y:auto;';
    panel.innerHTML = '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px"><span style="color:#a78bfa;font-weight:700;letter-spacing:.1em">⬡ NEXUS DEV</span><button onclick="document.getElementById(\'_devPanel\').remove()" style="background:none;border:none;color:#7c3aed;cursor:pointer;font-size:14px">✕</button></div><div id="_devPanelBody">Cargando…</div>';
    document.body.appendChild(panel);
    _devRefresh();
    panel._interval = setInterval(_devRefresh, 2000);
  } else {
    clearInterval(panel._interval);
    panel.remove();
  }
}

function _devRefresh(){
  const body = document.getElementById('_devPanelBody');
  if(!body) return;
  body.innerHTML = '<span style="color:#7c3aed">Buscando salas…</span>';
  _fbDb.ref('rooms').once('value', snap => {
    const body2 = document.getElementById('_devPanelBody');
    if(!body2) return;
    const rooms = snap.val();
    if(!rooms || !Object.keys(rooms).length){
      body2.innerHTML = '<div style="color:var(--text-dim)">Sin salas abiertas</div>';
      return;
    }
    const lines = [];
    Object.entries(rooms).forEach(([code, data]) => {
      const presence = data.presence ? Object.entries(data.presence).map(([k,v]) =>
        '<span style="color:'+(v==='online'?'#64dc78':'#ff6b6b')+'">'+k+'</span>'
      ).join(' ') : '<span style="color:#555">—</span>';
      const msgs = data.messages ? Object.keys(data.messages).length : 0;
      const age = data.created ? Math.floor((Date.now()-data.created)/1000)+'s' : '?';
      lines.push(
        '<div style="border-top:1px solid #2a1a4a;margin-top:6px;padding-top:6px">' +
        '<span style="color:#a78bfa;font-weight:700">'+code+'</span>' +
        ' <span style="color:#555;font-size:10px">('+age+')</span><br>' +
        'Jugadores: <b>'+( data.playerCount||'?')+'</b> &nbsp;'+presence+'<br>'+
        'Mensajes: <b>'+msgs+'</b>' +
        '</div>'
      );
    });
    lines.unshift('<div style="color:#7c3aed;margin-bottom:4px">'+Object.keys(rooms).length+' sala(s) abiertas</div>');
    body2.innerHTML = lines.join('');
  });
}

function connLostGoMenu(){
  hideConnLost();
  if(myPlayerNum !== 1 && _fbRoomRef) _fbSend({type:'player_left', playerNum: myPlayerNum});
  isOnline=false;
  _fbDisconnect();
  _stopResync();
  showScreen('titleScreen');
}

// Limpiar sala al cerrar/refrescar la página
window.addEventListener('beforeunload', ()=>{
  if(_fbRoomRef){
    if(myPlayerNum === 1){
      _fbRoomRef.remove();
    } else {
      _fbRoomRef.child('presence/p' + myPlayerNum).remove();
    }
  }
});

