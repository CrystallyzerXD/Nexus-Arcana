/* ═══════════════════════════════════════════════
   RELIQUIAS — MODO ENDLESS
   Se activan cada 5 oleadas. Máximo 1 por elección.
═══════════════════════════════════════════════ */

var _RELIC_POOL = [
  // ── OFENSIVAS ──
  { id:'filo_arcano',       name:'Filo Arcano',       cat:'ofensiva',
    desc:'+8 de daño a todos los ataques directos.',
    icon:'⚔️' },
  { id:'veneno_espeso',     name:'Veneno Espeso',      cat:'ofensiva',
    desc:'+3 daño/turno a todos los ataques de veneno (DoT).',
    icon:'☠️' },
  { id:'carga_amplificada', name:'Carga Amplificada',  cat:'ofensiva',
    desc:'+5 a todos los ataques acumulativos.',
    icon:'📈' },
  { id:'punteria',          name:'Puntería',           cat:'ofensiva',
    desc:'+12% de probabilidad en todos los ataques probabilísticos.',
    icon:'🎯' },
  { id:'presion_constante', name:'Presión Constante',  cat:'ofensiva',
    desc:'Las consecuencias de ataques fallidos se eliminan.',
    icon:'💢' },
  // ── DEFENSIVAS ──
  { id:'armadura_arcana',   name:'Armadura Arcana',    cat:'defensiva',
    desc:'+25 HP a todas las cartas del mazo.',
    icon:'🛡️' },
  { id:'escudo_reforzado',  name:'Escudo Reforzado',   cat:'defensiva',
    desc:'+15% de efectividad en ataques de escudo.',
    icon:'🔰' },
  { id:'vitalidad',         name:'Vitalidad',          cat:'defensiva',
    desc:'+8 HP adicional en todas las curaciones.',
    icon:'💚' },
  // ── ARRIESGADAS ──
  { id:'berserker',         name:'Berserker',          cat:'arriesgada',
    desc:'+20 daño directo. Todas las cartas pierden 20 HP máximo.',
    icon:'🔥', tradeoff:true },
  { id:'pacto_sangre',      name:'Pacto de Sangre',    cat:'arriesgada',
    desc:'+35 daño directo. La carta activa pierde 4 HP por turno.',
    icon:'🩸', tradeoff:true },
  { id:'filo_doble',        name:'Filo Doble',         cat:'arriesgada',
    desc:'+25 daño directo. Cada ataque también inflige 8 de autodaño.',
    icon:'⚡', tradeoff:true },
  { id:'resonancia_toxica', name:'Resonancia Tóxica',  cat:'arriesgada',
    desc:'Los DoT duran 2 turnos más. Los efectos de regen duran 2 turnos menos.',
    icon:'🌀', tradeoff:true },
  { id:'obsesion',          name:'Obsesión',           cat:'arriesgada',
    desc:'+20% de probabilidad en ataques prob. Si falla, la consecuencia se duplica.',
    icon:'😈', tradeoff:true },
  { id:'maldicion_carmesi', name:'Maldición Carmesí',  cat:'arriesgada',
    desc:'Todas las cartas pierden 15 HP máximo. +50 monedas al terminar la run.',
    icon:'💀', tradeoff:true },
  { id:'niebla_arcana',     name:'Niebla Arcana',      cat:'arriesgada',
    desc:'No puedes ver los HP del enemigo. +15 daño a todos los ataques.',
    icon:'🌫️', tradeoff:true },
  // ── ESPECIALES ──
  { id:'vampirismo',        name:'Vampirismo',         cat:'especial',
    desc:'Cada KO restaura 50 HP a tu carta activa.',
    icon:'🧛' },
  { id:'resurreccion',      name:'Resurrección',        cat:'especial',
    desc:'Elige una carta caída. Regresará como último recurso cuando todas tus cartas caigan.',
    icon:'✨', onlyOnce:true, needsDeadCards:true, notAtStart:true },
];

// Reliquias activas en la run actual
var _activeRelics = [];
// Carta revivida por Resurrección (entra solo cuando el pile queda vacío)
var _relicRevivedCard = null;
// Cartas del jugador que han caído en la run
var _endlessDeadP1Cards = [];

function _relicActive(id){ return _activeRelics.indexOf(id) !== -1; }

// ── Aplicar efectos inmediatos al elegir una reliquia ──
function _applyRelicImmediate(id){
  _activeRelics.push(id);
  switch(id){
    case 'armadura_arcana':
      _relicModAllCards(function(c){ c.hp = Math.min(c.hp + 25, c.maxHp + 25); c.maxHp += 25; });
      addLog('🛡️ <b>Armadura Arcana</b>: todas las cartas ganan +25 HP máximo.','log-heal');
      break;
    case 'berserker':
      _relicModAllCards(function(c){ var loss=Math.min(20,c.hp-1); c.hp=Math.max(1,c.hp-loss); c.maxHp=Math.max(1,c.maxHp-20); });
      addLog('🔥 <b>Berserker</b>: −20 HP máximo a todas las cartas.','log-dmg');
      break;
    case 'maldicion_carmesi':
      _relicModAllCards(function(c){ var loss=Math.min(15,c.hp-1); c.hp=Math.max(1,c.hp-loss); c.maxHp=Math.max(1,c.maxHp-15); });
      addLog('💀 <b>Maldición Carmesí</b>: −15 HP máximo a todas las cartas.','log-dmg');
      break;
    default:
      addLog('✨ <b>'+(_RELIC_POOL.find(function(r){return r.id===id;})||{}).name+'</b> obtenida.','log-sys');
  }
  _relicUpdateHUD();
}

// Modificar todas las cartas del jugador (activa + pila)
function _relicModAllCards(fn){
  if(p1.active) fn(p1.active);
  (p1.pile||[]).forEach(function(c){ fn(c); });
}

// ── Modificadores en tiempo real (llamados desde resolveAtk_Standard) ──
function _relicModifyAtk(atk, attacker){
  if(attacker !== p1 || gameMode !== 'endless') return atk;
  var a = Object.assign({}, atk);
  // Daño directo
  var directBonus = 0;
  if(_relicActive('filo_arcano'))   directBonus += 8;
  if(_relicActive('berserker'))     directBonus += 20;
  if(_relicActive('pacto_sangre'))  directBonus += 35;
  if(_relicActive('filo_doble'))    directBonus += 25;
  if(_relicActive('niebla_arcana')) directBonus += 15;
  if(a.type === 'direct') a.value = (a.value||0) + directBonus;
  // DoT
  if(a.type === 'dot' && _relicActive('veneno_espeso')) a.value = (a.value||0) + 3;
  // Acumulativo
  if(a.type === 'cumulative' && _relicActive('carga_amplificada')) a.value = (a.value||0) + 5;
  // Escudo
  if(a.type === 'shield' && _relicActive('escudo_reforzado')) a.value = Math.min(95, Math.round((a.value||0) * 1.15));
  // Regen
  if(a.type === 'regen' && _relicActive('vitalidad')) a.value = (a.value||0) + 8;
  // Probabilístico
  if(a.type === 'prob'){
    if(_relicActive('punteria'))  a.prob = Math.min(99, (a.prob||0) + 12);
    if(_relicActive('obsesion'))  a.prob = Math.min(99, (a.prob||0) + 20);
    if(_relicActive('presion_constante')) a.consequence = 0;
    if(_relicActive('obsesion') && !a._obsesionDone) a._obsesionConseq = (a.consequence||0) * 2;
  }
  // Turnos DoT/Regen
  if(a.type === 'dot'   && _relicActive('resonancia_toxica') && (a.turns||0) > 0) a.turns = (a.turns||3) + 2;
  if(a.type === 'regen' && _relicActive('resonancia_toxica') && (a.turns||0) > 0) a.turns = Math.max(1,(a.turns||3) - 2);
  return a;
}

// Autodaño de Filo Doble y Pacto de Sangre (llamado después de aplicar ataque)
function _relicPostAtk(atk, attacker){
  if(attacker !== p1 || gameMode !== 'endless' || !p1.active) return;
  if(atk.type === 'direct'){
    if(_relicActive('filo_doble')){
      var dmg = 8;
      p1.active.hp = Math.max(0, p1.active.hp - dmg);
      addLog('⚡ <b>Filo Doble</b>: '+p1.active.name+' recibe '+dmg+' de autodaño.','log-dmg');
      _floatDmg('p1card', dmg, false);
    }
  }
  // Obsesión: consecuencia x2 en fallo
  if(atk.type === 'prob' && _relicActive('obsesion') && atk._obsesionConseq > 0 && atk._wasFail){
    var extra = atk._obsesionConseq - (atk.consequence||0);
    if(extra > 0){
      p1.active.hp = Math.max(0, p1.active.hp - extra);
      addLog('😈 <b>Obsesión</b>: consecuencia adicional de '+extra+' HP.','log-dmg');
      _floatDmg('p1card', extra, false);
    }
  }
}

// Drenaje de Pacto de Sangre al inicio del turno de p1
function _relicOnP1TurnStart(){
  if(gameMode !== 'endless' || !_relicActive('pacto_sangre') || !p1 || !p1.active) return;
  var dmg = 4;
  p1.active.hp = Math.max(0, p1.active.hp - dmg);
  addLog('🩸 <b>Pacto de Sangre</b>: '+p1.active.name+' pierde '+dmg+' HP.','log-dmg');
  _floatDmg('p1card', dmg, false);
  if(p1.active.hp <= 0 && typeof checkDeath_Standard === 'function'){
    checkDeath_Standard(p2, p1);
  }
}

// Vampirismo: al hacer KO
function _relicOnP1KO(){
  if(gameMode !== 'endless' || !_relicActive('vampirismo') || !p1 || !p1.active) return;
  var heal = Math.min(50, p1.active.maxHp - p1.active.hp);
  if(heal > 0){
    p1.active.hp += heal;
    addLog('🧛 <b>Vampirismo</b>: '+p1.active.name+' absorbe +'+heal+' HP.','log-heal');
    _floatDmg('p1card', heal, true);
  }
}

// Maldición Carmesí: monedas al terminar la run
function _relicOnEndlessEnd(){
  if(!_relicActive('maldicion_carmesi')) return 0;
  return 50;
}

// Niebla Arcana: ocultar HP del enemigo
function _relicHideEnemyHP(){
  return gameMode === 'endless' && _relicActive('niebla_arcana');
}

// ── HUD de reliquias activas ──
function _relicUpdateHUD(){
  var hud = document.getElementById('endlessRelicHUD');
  if(!hud) return;
  if(!_activeRelics.length){ hud.innerHTML=''; return; }
  hud.innerHTML = _activeRelics.map(function(id){
    var r = _RELIC_POOL.find(function(x){ return x.id===id; });
    if(!r) return '';
    return '<span class="relic-chip '+(r.tradeoff?'relic-risk':'')+'" title="'+r.name+': '+r.desc+'">'+r.icon+'</span>';
  }).join('');
}

// ── Pantalla de elección ──
var _relicIsFirstPick = true;
function _relicShowPicker(){
  var isFirst = _relicIsFirstPick;
  _relicIsFirstPick = false;
  var available = _RELIC_POOL.filter(function(r){
    if(_activeRelics.indexOf(r.id) !== -1) return false;
    if(r.onlyOnce && _relicRevivedCard) return false;
    if(r.notAtStart && isFirst) return false;
    if(r.needsDeadCards && _endlessDeadP1Cards.length === 0) return false;
    return true;
  });
  // Mezclar y tomar 3
  for(var i=available.length-1;i>0;i--){ var j=Math.floor(Math.random()*(i+1)); var t=available[i]; available[i]=available[j]; available[j]=t; }
  var opts = available.slice(0,3);
  var ov = document.getElementById('relicPickerOverlay');
  var list = document.getElementById('relicPickerList');
  if(!ov||!list) return;
  list.innerHTML = opts.map(function(r){
    var catLabel = r.cat==='ofensiva'?'Ofensiva':r.cat==='defensiva'?'Defensiva':r.cat==='arriesgada'?'Arriesgada':'Especial';
    var _cls = r.tradeoff ? 'relic-option-risk' : r.cat==='especial' ? 'relic-option-special' : '';
    return '<div class="relic-option '+_cls+'" onclick="_relicChoose(\''+r.id+'\')">'
      +'<div class="relic-opt-icon">'+r.icon+'</div>'
      +'<div class="relic-opt-body">'
        +'<div class="relic-opt-cat">'+catLabel+'</div>'
        +'<div class="relic-opt-name">'+r.name+'</div>'
        +'<div class="relic-opt-desc">'+r.desc+'</div>'
      +'</div>'
    +'</div>';
  }).join('');
  ov.style.display = 'flex';
}

function _relicChoose(id){
  var ov = document.getElementById('relicPickerOverlay');
  if(ov) ov.style.display = 'none';
  if(id === 'resurreccion'){
    _activeRelics.push(id);
    _relicShowRevivePicker();
    return;
  }
  _applyRelicImmediate(id);
  renderGame();
  maybeTriggerBot();
}

// Resetear al iniciar nueva run
function _relicReset(){
  _activeRelics = [];
  _relicRevivedCard = null;
  _endlessDeadP1Cards = [];
  _relicIsFirstPick = true;
  _relicUpdateHUD();
}

// Registrar carta del jugador que murió (llamado desde game-engine)
function _relicTrackP1Death(card){
  if(!card) return;
  // Guardar copia con HP restaurado al 60%
  var copy = Object.assign({}, card);
  copy.hp = Math.max(1, Math.round(copy.maxHp * 0.6));
  copy.effects = [];
  copy.cumulativeUses = {};
  _endlessDeadP1Cards.push(copy);
}

// Verificar si hay carta revivida disponible cuando el pile queda vacío
function _relicCheckRevived(){
  if(!_relicRevivedCard) return false;
  var c = _relicRevivedCard;
  _relicRevivedCard = null;
  p1.active = c;
  playSfxCarta();
  addLog('✨ <b>Resurrección</b>: <b>'+c.name+'</b> regresa como último recurso con '+c.hp+' HP.','log-heal');
  renderGame();
  return true;
}

// Mostrar sub-picker para elegir la carta a revivir
function _relicShowRevivePicker(){
  var dead = _endlessDeadP1Cards;
  if(!dead.length) return;
  var ov = document.getElementById('relicPickerOverlay');
  var list = document.getElementById('relicPickerList');
  if(!ov||!list) return;
  list.innerHTML = '<div class="relic-picker-sub" style="margin-bottom:.6rem;color:var(--text-muted);font-size:11px">Elige la carta que regresará como último recurso</div>'
    + dead.map(function(c,i){
      return '<div class="relic-option relic-option-special" onclick="_relicConfirmRevive('+i+')">'
        +'<div class="relic-opt-icon" style="font-size:16px;min-width:28px;text-align:center">✨</div>'
        +'<div class="relic-opt-body">'
          +'<div class="relic-opt-name">'+c.name+'</div>'
          +'<div class="relic-opt-desc">Regresa con '+c.hp+' / '+c.maxHp+' HP</div>'
        +'</div>'
      +'</div>';
    }).join('');
  ov.style.display = 'flex';
}

function _relicConfirmRevive(idx){
  var c = _endlessDeadP1Cards[idx];
  if(!c) return;
  _relicRevivedCard = c;
  document.getElementById('relicPickerOverlay').style.display = 'none';
  addLog('✨ <b>Resurrección</b>: <b>'+c.name+'</b> aguarda como último recurso.','log-sys');
  _relicUpdateHUD();
  renderGame();
  maybeTriggerBot();
}
