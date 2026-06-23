/* ═══════════════════════════════════════════════
   MISIONES DIARIAS
═══════════════════════════════════════════════ */
var _DAILY_KEY = 'nx_dailies_v2';

var _MISSION_POOL = [
  { id:'win3',       label:'Gana 3 partidas',                      goal:3,  track:'wins',        reward:15 },
  { id:'win2',       label:'Gana 2 partidas',                      goal:2,  track:'wins',        reward:10 },
  { id:'kos15',      label:'Inflige 15 KOs',                       goal:15, track:'kos',         reward:12 },
  { id:'kos8',       label:'Inflige 8 KOs',                        goal:8,  track:'kos',         reward:8  },
  { id:'ffa1',       label:'Juega una partida FFA',                goal:1,  track:'ffa',         reward:12 },
  { id:'std2',       label:'Gana 2 partidas Estándar',             goal:2,  track:'stdwins',     reward:12 },
  { id:'endless5',   label:'Supera la oleada 5 en Endless',        goal:5,  track:'endless',     reward:15 },
  { id:'streak2',    label:'Encadena 2 victorias seguidas',        goal:2,  track:'streak',      reward:20 },
  { id:'play3',      label:'Juega 3 partidas',                     goal:3,  track:'played',      reward:8  },
  { id:'play2',      label:'Juega 2 partidas',                     goal:2,  track:'played',      reward:6  },
  { id:'endless10',  label:'Supera la oleada 10 en Endless',       goal:10, track:'endless',     reward:25 },
  { id:'bj2',        label:'Gana 2 partidas de Blackjack Arcano',  goal:2,  track:'bjwin',       reward:12, category:'casino' },
  { id:'bj3',        label:'Gana 3 partidas de Blackjack Arcano',  goal:3,  track:'bjwin',       reward:18, category:'casino' },
  { id:'duelo2',     label:'Gana 2 Duelos de Cartas',              goal:2,  track:'duelowin',    reward:12, category:'casino' },
  { id:'duelo3',     label:'Gana 3 Duelos de Cartas',              goal:3,  track:'duelowin',    reward:18, category:'casino' },
  { id:'poi1',       label:'Gana 1 ronda de Par o Impar',          goal:1,  track:'poiwin',      reward:8,  category:'casino' },
  { id:'casino3',    label:'Juega 3 juegos de casino',             goal:3,  track:'casinoplayed',reward:8,  category:'casino' },
  { id:'casinowin2', label:'Gana 2 veces en el casino',            goal:2,  track:'casinowin',   reward:15, category:'casino' },
  { id:'casinowin3', label:'Gana 3 veces en el casino',            goal:3,  track:'casinowin',   reward:22, category:'casino' },
  { id:'disco2',     label:'Gana 2 veces en Disco Nexus',          goal:2,  track:'discowin',    reward:14, category:'casino' },
  { id:'disco3',     label:'Gana 3 veces en Disco Nexus',          goal:3,  track:'discowin',    reward:20, category:'casino' },
  { id:'triada2',    label:'Gana 2 veces en Tríada Arcana',        goal:2,  track:'triadawin',   reward:14, category:'casino' },
  { id:'triada3',    label:'Gana 3 veces en Tríada Arcana',        goal:3,  track:'triadawin',   reward:20, category:'casino' },
  { id:'caos1',      label:'Gana una partida de Caos',             goal:1,  track:'caoswin',     reward:14 },
  { id:'espejo1',    label:'Gana una partida Espejo',              goal:1,  track:'espejowin',   reward:14 },
  { id:'liga1',      label:'Juega una Liga',                       goal:1,  track:'ligaplayed',  reward:18 },
  { id:'mundial1',   label:'Juega un Mundial',                     goal:1,  track:'mundialplayed',reward:18 },
];

function _dailyDateStr(){
  var d = new Date();
  return d.getFullYear()+'-'+(d.getMonth()+1)+'-'+d.getDate();
}

function _pickDailyMissions(dateStr){
  var seed = 0;
  for(var i=0;i<dateStr.length;i++) seed = (Math.imul(31,seed)+dateStr.charCodeAt(i))|0;
  seed = Math.abs(seed);

  // ~40% de los días puede aparecer una misión de casino
  var casinoRoll = Math.abs((Math.imul(seed,1664525)+1013904223)|0) % 100;
  var allowCasino = casinoRoll < 40;

  var pool = _MISSION_POOL.filter(function(m){
    return allowCasino || m.category !== 'casino';
  });

  var picked = [];
  var usedTracks = [];
  var casinoCount = 0;
  var attempts = 0;
  while(picked.length < 3 && pool.length > 0 && attempts < 50){
    attempts++;
    var idx = seed % pool.length;
    seed = Math.abs((Math.imul(seed,1664525)+1013904223)|0);
    var m = pool[idx];
    if(usedTracks.indexOf(m.track) !== -1){ pool.splice(idx,1); continue; }
    if(m.category === 'casino' && casinoCount >= 1){ pool.splice(idx,1); continue; }
    pool.splice(idx,1);
    usedTracks.push(m.track);
    if(m.category === 'casino') casinoCount++;
    picked.push({ id:m.id, label:m.label, goal:m.goal, track:m.track, reward:m.reward, progress:0, completed:false });
  }
  return picked;
}

function _loadDailies(){
  try{
    var d = JSON.parse(localStorage.getItem(_DAILY_KEY)||'null');
    var today = _dailyDateStr();
    if(!d || d.date !== today){
      d = { date:today, missions:_pickDailyMissions(today) };
      localStorage.setItem(_DAILY_KEY, JSON.stringify(d));
    }
    return d;
  }catch(e){
    var today = _dailyDateStr();
    return { date:today, missions:_pickDailyMissions(today) };
  }
}

function _saveDailies(d){ try{ localStorage.setItem(_DAILY_KEY, JSON.stringify(d)); }catch(e){} }

function _updateDailyProgress(track, value){
  var d = _loadDailies();
  var rewarded = false;
  d.missions.forEach(function(m){
    if(m.completed || m.track !== track) return;
    if(track==='endless' || track==='streak'){
      if(value > m.progress) m.progress = value;
    } else {
      m.progress = (m.progress||0) + value;
    }
    if(m.progress >= m.goal){
      m.completed = true;
      m.progress = m.goal;
      var s = _loadStats();
      s.coins = (s.coins||0) + m.reward;
      var _lvlBefore = _xpToLevel(s.xp||0);
      s.xp = (s.xp||0) + 25;
      var _lvlAfter = _xpToLevel(s.xp);
      _saveStats(s);
      if(typeof _addFragments === 'function') _addFragments(1);
      if(_lvlAfter > _lvlBefore) setTimeout(function(){ _showLevelUpPopup(_lvlAfter, _lvlBefore); }, rewarded ? 1800 : 600);
      setTimeout(function(){ _showCoinToast(m.reward, 0); }, rewarded ? 1200 : 0);
      rewarded = true;
    }
  });
  _saveDailies(d);
}

/* ═══════════════════════════════════════════════
   TUTORIAL IN-GAME
═══════════════════════════════════════════════ */
var tutGameMode = false;      // controla overlay/bloqueo de botones
var _tutGameSession = false;  // toda la sesión es tutorial — sin stats aunque el overlay se cierre
var _tutGStep = 0;
var _tutGameOnP1Turn = null;

// IDs de cartas reales del CARD_POOL usadas en el tutorial
// Jugador: Frostling(2) + October(3) + Thornveil(4)
// Oponente: Luminos(1) + Whisperion(9)
var _TUT_P1_IDS = [2, 3, 4];
var _TUT_P2_IDS = [1, 9];
var _TUT_GAME_STEPS = []; // se rellena dinámicamente en startInGameTutorial

function startInGameTutorial(){
  // Buscar cartas reales en CARD_POOL
  var _find = function(id){ return CARD_POOL.find(function(c){ return c.id === id; }); };
  var _p1raw = _TUT_P1_IDS.map(_find);
  var _p2raw = _TUT_P2_IDS.map(_find);
  if(_p1raw.some(function(c){return !c;}) || _p2raw.some(function(c){return !c;})){
    alert('No se encontraron las cartas del tutorial en el pool. Verificá cartas.json.');
    return;
  }

  tutGameMode = true; _tutGameSession = true; _tutGStep = 0; _tutGameOnP1Turn = null;
  botMode = true; isOnline = false; bossLocal2v1 = false;
  gameMode = 'standard'; _caosActive = false; _caosEffect = null;
  turnNumber = 1; attackUsed = false; logEntries = [];
  document.getElementById('logWrap').innerHTML = '';

  var p1cards = _p1raw.map(function(c){ return makeCard(c); });
  var p2cards = _p2raw.map(function(c){ return makeCard(c); });
  p1 = { num:1, name:'Tú', active:p1cards.shift(), pile:p1cards, kills:0 };
  p2 = { num:2, name:'Oponente', active:p2cards.shift(), pile:p2cards, kills:0 };
  currentPlayer = 1;

  // Construir pasos con los nombres reales de la carta activa del jugador
  var _ac = p1.active;
  var _atk0 = _ac.attacks[0] || {};
  var _atk1 = _ac.attacks[1] || _atk0;
  var _typeLabel = function(atk){
    switch(atk.type){
      case 'direct':     return 'daño directo de '+atk.value+' HP';
      case 'dot':        return 'daño continuo de '+atk.value+' HP/turno × '+(atk.turns||3)+' turnos';
      case 'regen':      return 'regeneración de +'+atk.value+' HP/turno × '+(atk.turns||3)+' turnos';
      case 'shield':     return 'escudo que reduce el daño recibido un '+atk.value+'% × '+(atk.turns||2)+' turnos';
      case 'cumulative': return 'daño acumulativo que crece con cada uso';
      case 'prob':       return atk.prob+'% de probabilidad de '+atk.value+' HP (puede fallar)';
      default: return atk.type;
    }
  };

  _TUT_GAME_STEPS = [
    { target:null,          title:'¡Tutorial interactivo!',
      body:'Vas a jugar una partida real con guía paso a paso. Las señales indican dónde hacer clic. ¡Sin presión!',
      action:'next' },
    { target:'p1card',      title:'Tu carta activa: '+_ac.name,
      body:_ac.name+' ('+_ac.stars+'★ '+_ac.rarity+', '+_ac.hp+' HP). Observa la barra de vida y el borde de color que indica su rareza.',
      action:'next' },
    { target:'p1pile',      title:'Tu pila de cartas',
      body:'Tienes '+p1.pile.length+' cartas más en reserva. Cuando '+_ac.name+' llegue a 0 HP, la siguiente entra automáticamente.',
      action:'next' },
    { target:'p2zone',      title:'El oponente',
      body:'El oponente empieza con '+p2.active.name+' ('+p2.active.stars+'★, '+p2.active.hp+' HP) y '+p2.pile.length+' carta más en pila. Actúa solo.',
      action:'next' },
    { target:'attackPanel', title:'Panel de ataques',
      body:'Cada turno se elige UN ataque. Lee el efecto de cada uno antes de decidir.',
      action:'next' },
    { target:'atk-tut-0',   title:'Ataque 1: '+_atk0.name,
      body:'Haz clic en "'+_atk0.name+'" — aplica '+_typeLabel(_atk0)+' al oponente.',
      action:'attack', atkHint:0 },
    { target:'logWrap',     title:'Registro de combate',
      body:'Aquí aparece todo lo que ocurrió: daños, efectos, cambios de turno. Léelo para entender la situación.',
      action:'next' },
    { target:'atk-tut-1',   title:'Ataque 2: '+_atk1.name,
      body:'Ahora usa "'+_atk1.name+'" — aplica '+_typeLabel(_atk1)+'.',
      action:'attack', atkHint:1 },
    { target:null,           title:'¡Tutorial completado!',
      body:'Ya conoces lo esencial. Puedes seguir jugando esta partida o explorar los otros modos desde el menú.',
      action:'exit' }
  ];

  buildGameUI_Standard();
  showScreen('gameScreen');
  renderGame();
  _tutGTagAtkBtns();
  setTimeout(function(){ _tutGRender(); }, 350);
}

function _tutGTagAtkBtns(){
  var row = document.getElementById('attacksRow');
  if(!row) return;
  row.querySelectorAll('.atk-btn').forEach(function(b, i){ b.id = 'atk-tut-'+i; });
}

function _tutGRender(){
  if(!tutGameMode) return;
  var step = _TUT_GAME_STEPS[_tutGStep];
  if(!step){ _tutGHide(); return; }

  var overlay  = document.getElementById('tutGameOverlay');
  var spotlight= document.getElementById('tutGameSpotlight');
  var tooltip  = document.getElementById('tutGameTooltip');
  var arrowEl  = document.getElementById('tutGameArrow');
  var stepLbl  = document.getElementById('tutGStep');
  var titleEl  = document.getElementById('tutGTitle');
  var bodyEl   = document.getElementById('tutGBody');
  var actEl    = document.getElementById('tutGActions');

  overlay.style.display = 'block';
  stepLbl.textContent = 'PASO ' + (_tutGStep + 1) + ' / ' + _TUT_GAME_STEPS.length;
  titleEl.textContent = step.title;
  bodyEl.textContent  = step.body;

  // Spotlight
  var targetEl = step.target ? document.getElementById(step.target) : null;
  if(targetEl){
    // Si el elemento está fuera del viewport, hacer scroll hacia él primero
    var _r0 = targetEl.getBoundingClientRect();
    if(_r0.bottom > window.innerHeight || _r0.top < 0){
      targetEl.scrollIntoView({block:'center', behavior:'instant'});
    }
    var rect = targetEl.getBoundingClientRect();
    var pad = 7;
    spotlight.style.display = 'block';
    spotlight.style.left   = (rect.left - pad) + 'px';
    spotlight.style.top    = (rect.top  - pad) + 'px';
    spotlight.style.width  = (rect.width  + pad*2) + 'px';
    spotlight.style.height = (rect.height + pad*2) + 'px';
    spotlight.className    = step.action === 'attack' ? 'tutg-pulse' : '';

    arrowEl.style.display = 'none';

    // Tooltip: try to fit it — prefer right side, then left, then below
    var tw = 240, th = 160;
    var vw = window.innerWidth, vh = window.innerHeight;
    var tx, ty;
    if(rect.right + tw + 12 <= vw){
      tx = rect.right + 12; ty = Math.max(8, rect.top);
    } else if(rect.left - tw - 12 >= 0){
      tx = rect.left - tw - 12; ty = Math.max(8, rect.top);
    } else {
      tx = Math.max(8, Math.min(rect.left, vw - tw - 8));
      ty = rect.bottom + pad + 36;
      if(ty + th > vh) ty = rect.top - th - 12;
    }
    ty = Math.max(8, Math.min(ty, vh - th - 8));
    tooltip.style.left      = tx + 'px';
    tooltip.style.top       = ty + 'px';
    tooltip.style.transform = '';
  } else {
    spotlight.style.display = 'none';
    arrowEl.style.display   = 'none';
    tooltip.style.left      = '50%';
    tooltip.style.top       = '50%';
    tooltip.style.transform = 'translate(-50%,-50%)';
  }

  // Actions
  actEl.innerHTML = '';
  function mkBtn(txt, cls, fn){
    var b = document.createElement('button');
    b.textContent = txt; b.className = cls; b.onclick = fn;
    return b;
  }
  if(step.action === 'next'){
    var lbl = _tutGStep === _TUT_GAME_STEPS.length-1 ? 'Finalizar ✓' : 'Siguiente →';
    actEl.appendChild(mkBtn(lbl, 'tutg-btn-next', function(){
      _tutGStep++;
      var nextStep = _TUT_GAME_STEPS[_tutGStep];
      if(nextStep && nextStep.action === 'attack') renderStdAttacks();
      _tutGTagAtkBtns(); _tutGRender();
    }));
  } else if(step.action === 'attack'){
    var hint = document.createElement('div');
    hint.className = 'tutg-hint';
    hint.textContent = 'Haz clic en el ataque resaltado';
    actEl.appendChild(hint);
  } else if(step.action === 'exit'){
    actEl.appendChild(mkBtn('Finalizar →', 'tutg-btn-next', function(){
      tutGameMode = false; _tutGHide(); renderStdAttacks();
    }));
  }
}

function _tutGHide(){
  var ov = document.getElementById('tutGameOverlay');
  if(ov) ov.style.display = 'none';
}

function _tutSaveName(){
  var inp = document.getElementById('tutNameInput');
  var name = inp ? inp.value.trim() : '';
  if(name) {
    _saveP1Name(name);
    var disp = document.getElementById('profileNameDisplay');
    if(disp) disp.textContent = name;
  }
  showScreen('titleScreen');
}

function exitInGameTutorial(){
  localStorage.setItem(_TUT_LAUNCH_KEY,'1');
  tutGameMode = false; _tutGameSession = false; _tutGameOnP1Turn = null;
  _tutGHide();
  // Reset estado de juego y volver al menú sin modal
  if(_botTimer){ clearTimeout(_botTimer); _botTimer = null; }
  p1={}; p2={}; attackUsed=false; isOnline=false; botMode=false;
  showScreen('titleScreen');
}

function openMissionsScreen(){
  renderMissionsScreen();
  var lbl = document.getElementById('solWinsLabel');
  if(lbl) lbl.textContent = 'Completados: ' + (_loadStats().solWins||0);
  showScreen('missionsScreen');
}

function renderMissionsScreen(){
  var d = _loadDailies();
  var grid = document.getElementById('missionsGrid');
  if(!grid) return;
  grid.innerHTML = d.missions.map(function(m){
    var pct = Math.min(100, Math.round((m.progress||0)/m.goal*100));
    return '<div class="mission-card'+(m.completed?' done':'')+'">'
      +'<div class="mission-top">'
      +'<span class="mission-label">'+(m.completed?'✓ ':'')+m.label+'</span>'
      +'<span class="mission-reward">🪙 +'+m.reward+' <span style="color:#9b59f7;margin-left:.2rem">🔮 +1</span></span>'
      +'</div>'
      +(m.completed
        ? '<div class="mission-sub">COMPLETADA</div>'
        : '<div class="mission-track"><div class="mission-bar" style="width:'+pct+'%"></div></div>'
          +'<div class="mission-sub">'+(m.progress||0)+' / '+m.goal+'</div>'
      )
      +'</div>';
  }).join('');
  var el = document.getElementById('missionsResetLabel');
  if(el){
    var now = new Date();
    var tomorrow = new Date(now.getFullYear(),now.getMonth(),now.getDate()+1);
    var diff = tomorrow - now;
    var h = Math.floor(diff/3600000);
    var min = Math.floor((diff%3600000)/60000);
    el.textContent = 'Se reinician en '+h+'h '+String(min).padStart(2,'0')+'m';
  }
}

