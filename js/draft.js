/* ═══════════════════════════════════════════════
   MODO DRAFT
   Modificador de Estándar: alternancia de picks,
   la carta no elegida va al rival.
   Compatible con Bot, Local 2P y Online.
═══════════════════════════════════════════════ */

var _draftPool        = [];  // IDs disponibles
var _draftP1          = [];  // IDs acumulados P1
var _draftP2          = [];  // IDs acumulados P2
var _draftSize        = 6;   // cartas por jugador
var _draftPick        = 0;   // picks completados
var _draftPair        = [];  // par actual [id, id]
var _draftFirstPicker = 1;   // quién elige primero (determinado por ruleta)

// ── Entrada ──────────────────────────────────

function _startDraft(){
  var sizeEl = document.getElementById('p1size') || document.getElementById('p2size');
  _draftSize = parseInt((sizeEl||{}).value||6);
  _draftP1=[]; _draftP2=[]; _draftPick=0; _draftPair=[]; _draftFirstPicker=1;

  // Pool: solo cartas desbloqueadas
  var unlocked = (typeof _loadUnlockedCards==='function') ? _loadUnlockedCards() : CARD_POOL.map(function(c){ return c.id; });
  _draftPool = unlocked.filter(function(id){ return CARD_POOL.some(function(c){ return c.id===id; }); });

  // Ruleta para determinar quién elige primero
  var n1 = _draftGetName(1);
  var n2 = botMode ? 'Bot' : _draftGetName(2);
  if(isOnline && myPlayerNum===1){
    _fbSend({type:'roulette_start'}); // guest muestra overlay de espera mientras anfitrión gira
  }
  showRoulette([
    {num:1, name:n1, color:'#7affaa'},
    {num:2, name:n2, color:'#f7c59f'}
  ], function(winner){
    _draftFirstPicker = winner;
    if(isOnline && myPlayerNum===1){
      _fbSend({type:'draft_start', deckSize:_draftSize, pool:_draftPool, firstPicker:winner});
    }
    _draftBegin();
  });
}

function _draftBegin(){
  // Inicializar game screen con jugadores vacíos como fondo
  var n1 = _draftGetName(1);
  var n2 = _draftGetName(2);
  p1 = {num:1, name:n1, active:null, pile:[]};
  p2 = {num:2, name:n2, active:null, pile:[]};
  buildGameUI_Standard();
  showScreen('gameScreen');
  // Mostrar overlay de draft encima
  var ov = document.getElementById('draftOverlay');
  if(ov){ ov.style.display='flex'; }
  _draftRender();
  // Mostrar botones de control online para el anfitrión
  if(isOnline && myPlayerNum===1){
    var _rlb=document.getElementById('resetLobbyBtn');
    var _rsb=document.getElementById('resyncBtn');
    if(_rlb) _rlb.style.display='';
    if(_rsb) _rsb.style.display='';
  }
  if(!isOnline || myPlayerNum===1) _draftNextPick();
}

// ── Turno actual ─────────────────────────────

function _draftActivePicker(){
  var base = (_draftPick % 2 === 0) ? _draftFirstPicker : (3 - _draftFirstPicker);
  return base;
}

function _draftGetName(num){
  if(isOnline){
    if(num===1) return (p1&&p1.name) || _loadP1Name() || 'Jugador 1';
    return (p2&&p2.name) || _loadP2Name() || 'Jugador 2';
  }
  if(num===1) return (document.getElementById('p1name')||{}).value || _loadP1Name() || 'Jugador 1';
  if(botMode) return 'Bot';
  return (document.getElementById('p2name')||{}).value || _loadP2Name() || 'Jugador 2';
}

// ── Generación del par ────────────────────────

function _draftValidRarities(deck){
  // Rarezas disponibles en el pool que el picker todavía puede recibir
  var inPool = {};
  _draftPool.forEach(function(id){
    var c = CARD_POOL.find(function(c){ return c.id===id; });
    if(c) inPool[c.rarity] = (inPool[c.rarity]||0) + 1;
  });
  return Object.keys(inPool).filter(function(r){
    if(inPool[r] < 2) return false; // necesitamos al menos 2 cartas del mismo tipo
    var limit = (RARITY_LIMITS[r]!=null) ? RARITY_LIMITS[r] : Infinity;
    if(limit===0) return false;
    var count = deck.filter(function(id){
      var c = CARD_POOL.find(function(c){ return c.id===id; });
      return c && c.rarity===r;
    }).length;
    return count < limit;
  });
}

function _draftNextPick(){
  if(_draftPick >= _draftSize){ _draftFinish(); return; }

  var picker    = _draftActivePicker();
  var pickerDeck = picker===1 ? _draftP1 : _draftP2;
  var valid     = _draftValidRarities(pickerDeck);

  if(!valid.length){
    // Sin rareza válida — usar cualquier rareza con ≥2 cartas en pool
    var fallback = {};
    _draftPool.forEach(function(id){
      var c = CARD_POOL.find(function(c){ return c.id===id; });
      if(c) fallback[c.rarity] = (fallback[c.rarity]||0)+1;
    });
    valid = Object.keys(fallback).filter(function(r){ return fallback[r]>=2; });
    if(!valid.length){ _draftPick++; _draftNextPick(); return; }
  }

  var rarity = valid[Math.floor(Math.random()*valid.length)];
  var cands  = _draftPool.filter(function(id){
    var c = CARD_POOL.find(function(c){ return c.id===id; });
    return c && c.rarity===rarity;
  });
  cands = cands.sort(function(){ return Math.random()-.5; });
  _draftPair = [cands[0], cands[1]];

  // Quitar par del pool
  _draftPool = _draftPool.filter(function(id){ return _draftPair.indexOf(id)===-1; });

  _draftRender();

  if(isOnline && myPlayerNum===1){
    if(picker===1){
      // Mi turno como host: el guest ve el par pero no puede elegir
      _fbSend({type:'draft_waiting', picker:1, pair:_draftPair, p1Deck:_draftP1, p2Deck:_draftP2, picksDone:_draftPick});
    } else {
      // Turno del guest: enviarle el par
      _fbSend({type:'draft_pair', pair:_draftPair, picker:2, p1Deck:_draftP1, p2Deck:_draftP2, picksDone:_draftPick});
    }
    return;
  }

  // Bot auto-elige
  if(botMode && picker===2){
    setTimeout(function(){ _draftChoose(_draftPair[Math.floor(Math.random()*2)]); }, 850);
  }
}

// ── Selección ────────────────────────────────

function _draftChoose(chosenId){
  if(_draftPair.indexOf(chosenId) === -1) return; // par ya consumido
  var rejectedId = (_draftPair[0]===chosenId) ? _draftPair[1] : _draftPair[0];
  var picker = _draftActivePicker();

  if(picker===1){ _draftP1.push(chosenId); _draftP2.push(rejectedId); }
  else           { _draftP2.push(chosenId); _draftP1.push(rejectedId); }

  _draftPair = []; // consumir par para evitar doble-click
  _draftPick++;

  if(isOnline){
    if(myPlayerNum===1 && picker===1){
      _fbSend({type:'draft_pick_result', chosenId:chosenId, p1Deck:_draftP1, p2Deck:_draftP2, picksDone:_draftPick});
    }
    if(myPlayerNum!==1 && picker===2){
      _fbSend({type:'draft_pick', chosenId:chosenId});
      return;
    }
    _draftNextPick();
    return;
  }

  _draftNextPick();
}

// ── Fin de draft ──────────────────────────────

function _draftFinish(){
  // Ocultar overlay de draft
  var ov = document.getElementById('draftOverlay');
  if(ov) ov.style.display='none';

  if(isOnline){
    // Solo el anfitrión construye el estado autoritativo y lo envía al invitado.
    if(myPlayerNum===1){
      _draftStartOnlineGame(shuffle(_draftP1.slice()), shuffle(_draftP2.slice()));
    }
    return;
  }

  // Local / Bot: mezclar el orden de las cartas
  p1sel = shuffle(_draftP1.slice());
  p2sel = shuffle(_draftP2.slice());
  // El ganador de la ruleta inicial es quien comienza la partida — no repetir ruleta
  currentPlayer = _draftFirstPicker;
  _draftSkipRoulette = true;
  draftMode = false;
  startGame();
}

// Anfitrión: arranca la partida online de draft con los mazos ya mezclados
function _draftStartOnlineGame(p1ids, p2ids){
  isOnline = true; draftMode = false; gameMode = 'standard'; _caosActive = false;
  turnNumber = 1; attackUsed = false; logEntries = []; _stateSeq = 0;
  document.getElementById('logWrap').innerHTML = '';

  var mk = function(num, ids, name){
    var cards = ids.map(function(id){ return makeCard(CARD_POOL.find(function(c){ return c.id===id; })); });
    return {num:num, name:name, active:cards.shift(), pile:cards};
  };
  p1 = mk(1, p1ids, _draftGetName(1));
  p2 = mk(2, p2ids, _draftGetName(2));
  currentPlayer = _draftFirstPicker;

  buildGameUI_Standard();
  showScreen('gameScreen');
  addLog('¡Partida online Draft! '+p1.name+' vs '+p2.name+'.','log-sys');
  addLog('— Turno 1: '+(currentPlayer===1?p1:p2).name+' comienza —','log-sys');

  // Botones de control del anfitrión
  document.getElementById('resetLobbyBtn').style.display='';
  document.getElementById('skipCycleBtn').style.display='';
  document.getElementById('resyncBtn').style.display='';

  if(typeof _startConnListener==='function') _startConnListener();
  renderGame();
  sendGameState();
}

// ── Render ────────────────────────────────────

function _draftRarityColor(rarity){
  var r = RARITIES.find(function(r){ return r && r.name===rarity; });
  return r ? r.border : '#888';
}

function _draftRender(){
  var picker = _draftActivePicker();
  var isMyTurn = !isOnline || picker===myPlayerNum;
  var canPick  = isMyTurn && (!botMode || picker===1);

  // Header
  var labelEl = document.getElementById('draftPickerLabel');
  var progEl  = document.getElementById('draftProgress');
  if(labelEl){
    if(isOnline && !isMyTurn){
      labelEl.textContent = _draftGetName(picker) + ' elige…';
    } else if(botMode && picker===2){
      labelEl.textContent = 'Bot eligiendo…';
    } else {
      labelEl.textContent = _draftGetName(picker) + ' elige';
    }
  }
  if(progEl) progEl.textContent = 'Pick '+(_draftPick+1)+' / '+_draftSize;

  var body = document.getElementById('draftBody');
  if(!body) return;

  // Mini-mazos
  var p1Mini = _draftMiniDeck(_draftP1, 1);
  var p2Mini = _draftMiniDeck(_draftP2, 2);

  // Par de cartas
  var pairHtml = '';
  if(_draftPair.length===2){
    _draftPair.forEach(function(id){
      var card = CARD_POOL.find(function(c){ return c.id===id; });
      if(!card) return;
      var col  = _draftRarityColor(card.rarity);
      var click = canPick ? 'onclick="_draftChoose('+id+')" tabindex="0"' : '';
      var extra = canPick ? ' draft-card-pickable' : '';
      pairHtml +=
        '<div class="draft-card'+extra+'" '+click+' style="border-color:'+col+'">'+
          (card.image
            ? '<img src="'+card.image+'" alt="'+card.name+'" class="draft-card-img" onerror="this.style.display=\'none\'">'
            : '<div class="draft-card-img-placeholder" style="color:'+col+'">'+card.name.slice(0,8).toUpperCase()+'</div>')+
          '<div class="draft-card-name">'+card.name+'</div>'+
          '<div class="draft-card-rarity" style="color:'+col+'">'+card.rarity+'</div>'+
          '<div class="draft-card-stars" style="color:'+col+'">'+'★'.repeat(card.stars)+'</div>'+
        '</div>';
    });
  } else {
    pairHtml = '<div class="draft-waiting-msg">Esperando…</div>';
  }

  body.innerHTML =
    '<div class="draft-decks-row">'+p1Mini+p2Mini+'</div>'+
    '<div class="draft-pair">'+pairHtml+'</div>';
}

function _draftMiniDeck(deck, num){
  var name = _draftGetName(num);
  var label = (num===1?'🟣 ':'🔵 ')+name+' <span class="draft-mini-count">'+deck.length+'/'+_draftSize+'</span>';
  var thumbs = '';
  for(var i=0; i<_draftSize; i++){
    if(i < deck.length){
      var card = CARD_POOL.find(function(c){ return c.id===deck[i]; });
      var col  = card ? _draftRarityColor(card.rarity) : '#888';
      thumbs += '<div class="draft-mini-thumb" style="border-color:'+col+'">'+
        (card && card.image
          ? '<img src="'+card.image+'" style="width:100%;height:100%;object-fit:cover;border-radius:3px" onerror="this.style.display=\'none\'">'
          : '')+
        '</div>';
    } else {
      thumbs += '<div class="draft-mini-thumb draft-mini-empty"></div>';
    }
  }
  return '<div class="draft-mini-block"><div class="draft-mini-label">'+label+'</div><div class="draft-mini-thumbs">'+thumbs+'</div></div>';
}

// ── Relay online (llamado desde handleRelayMsg) ──

function _draftHandleRelay(data){
  switch(data.type){
    case 'draft_start':
      // Guest recibe inicio de draft — cerrar overlay de ruleta si quedó abierto
      (function(){ var ro=document.getElementById('rouletteOverlay'); if(ro) ro.style.display='none'; })();
      if(typeof _rouletteActive !== 'undefined') _rouletteActive = false;
      isOnline = true;
      botMode  = false;
      _draftFirstPicker = data.firstPicker || 1;
      _draftPool = data.pool || [];
      _draftSize = data.deckSize || 6;
      _draftP1=[]; _draftP2=[]; _draftPick=0; _draftPair=[];
      p1 = {num:1, name:_draftGetName(1), active:null, pile:[]};
      p2 = {num:2, name:_draftGetName(2), active:null, pile:[]};
      buildGameUI_Standard();
      showScreen('gameScreen');
      var _ov = document.getElementById('draftOverlay');
      if(_ov) _ov.style.display='flex';
      _draftRender();
      break;

    case 'draft_waiting':
      // Guest: el host está eligiendo — ve el par pero no puede tocarlo
      _draftPick    = data.picksDone || 0;
      _draftP1      = data.p1Deck   || [];
      _draftP2      = data.p2Deck   || [];
      _draftPair    = data.pair     || [];
      _draftRender();
      break;

    case 'draft_pair':
      // Guest: su turno de elegir
      _draftPick = data.picksDone || 0;
      _draftP1   = data.p1Deck   || [];
      _draftP2   = data.p2Deck   || [];
      _draftPair = data.pair     || [];
      _draftRender();
      break;

    case 'draft_pick':
      // Host recibe el pick del guest
      if(myPlayerNum===1) _draftChoose(data.chosenId);
      break;

    case 'draft_pick_result':
      // Guest: el host eligió, actualizar estado
      _draftPick = data.picksDone || 0;
      _draftP1   = data.p1Deck   || [];
      _draftP2   = data.p2Deck   || [];
      _draftPair = [];
      _draftRender();
      break;

    case 'draft_done':
      // Guest: draft terminado. NO construir la partida localmente —
      // el anfitrión envía el estado autoritativo vía game_state.
      var _dov = document.getElementById('draftOverlay');
      if(_dov) _dov.style.display='none';
      draftMode = false;
      break;
  }
}
