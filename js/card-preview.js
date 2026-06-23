/* ═══════════════════════════════════════════════
   PREVISUALIZACIÓN DE CARTAS (deck builder)
   - openCardPreview(id, player): ficha de UNA carta (arte + ataques + descripción)
   - openDeckReview(player): lista las cartas SELECCIONADAS con sus ataques
   Es puramente aditivo: no altera el toque-para-seleccionar del picker.
═══════════════════════════════════════════════ */
function _cpEsc(s){ return String(s == null ? '' : s).replace(/[&<>"']/g, function(c){
  return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]; }); }

function _cpAtkIcon(type){
  return ({ direct:'⚔', dot:'☠', regen:'💚', cumulative:'📈', shield:'🛡', prob:'🎲' })[type] || '•';
}

// Texto del efecto del ataque (mismo criterio que los botones en combate)
function _cpAtkMeta(a){
  switch(a.type){
    case 'direct':{
      var m = '-'+a.value+' hp directo';
      if(a.selfDmg>0){
        m += ', '+(a.selfDmgType==='pct_max' ? a.selfDmg+'% HP máx propio'
                 : a.selfDmgType==='pct'     ? a.selfDmg+'% HP actual propio'
                 : '-'+a.selfDmg+' hp propio');
      }
      if(a.selfHeal>0)  m += ', +'+a.selfHeal+' hp absorción';
      if(a.lifeSteal>0) m += ', +'+a.lifeSteal+'% robo de vida';
      return m;
    }
    case 'dot':       return '-'+a.value+' hp/turno ('+(a.turns===0||a.turns===-1?'∞':'×'+(a.turns||3))+')';
    case 'regen':     return '+'+a.value+' hp/turno ('+(a.turns===0||a.turns===-1?'∞':'×'+(a.turns||3))+')';
    case 'cumulative':return '-'+a.value+' hp (+'+a.value+' por uso acumulado)';
    case 'shield':    return '-'+a.value+'% daño ('+(a.turns===0||a.turns===-1?'∞':(a.turns||2)+' turnos')+')';
    case 'prob':      return a.prob+'%: -'+a.value+' hp'+(a.consequence>0?' / falla: -'+a.consequence+' propio':'');
    default:          return '';
  }
}

function _cpRarity(card){
  var r = (typeof RARITIES !== 'undefined' && RARITIES[card.stars]) ? RARITIES[card.stars]
        : (typeof RARITIES !== 'undefined' ? RARITIES[1] : { name:card.rarity||'', border:'#888' });
  return r;
}

function _cpAtksHtml(card){
  var atks = (card.attacks||[]).filter(function(a){ return a && a.name; });
  if(!atks.length) return '<div class="cp-atk-empty">Sin ataques.</div>';
  return atks.map(function(a){
    return '<div class="cp-atk">'
      + '<div class="cp-atk-top">'
      +   '<span class="cp-atk-ico">'+_cpAtkIcon(a.type)+'</span>'
      +   '<span class="cp-atk-name">'+_cpEsc(a.name)+'</span>'
      +   '<span class="cp-atk-val">'+_cpEsc(_cpAtkMeta(a))+'</span>'
      + '</div>'
      + (a.description ? '<div class="cp-atk-desc">'+_cpEsc(a.description)+'</div>' : '')
      + '</div>';
  }).join('');
}

function _cpEnsureOverlay(){
  var ov = document.getElementById('cardPreviewOverlay');
  if(!ov){
    ov = document.createElement('div');
    ov.id = 'cardPreviewOverlay';
    ov.className = 'cp-overlay';
    ov.onclick = function(e){ if(e.target === ov) closeCardPreview(); };
    ov.innerHTML = '<div class="cp-modal" id="cardPreviewModal"></div>';
    document.body.appendChild(ov);
  }
  return ov;
}

function closeCardPreview(){
  var ov = document.getElementById('cardPreviewOverlay');
  if(ov) ov.classList.remove('show');
}

// ── Ficha de UNA carta ──
function openCardPreview(cardId, player){
  var card = (CARD_POOL||[]).find(function(c){ return c.id === cardId; });
  if(!card) return;
  var ov = _cpEnsureOverlay();
  var modal = document.getElementById('cardPreviewModal');
  var r = _cpRarity(card);
  var idStr = '#'+String(card.id).padStart(3,'0');
  var artInner = card.image
    ? '<img src="'+_cpEsc(card.image)+'" alt="'+_cpEsc(card.name)+'">'
    : '<div class="cp-art-ph">'+_cpEsc(card.name.slice(0,8).toUpperCase())+'</div>';

  // Botón de selección (solo si hay player y la carta está desbloqueada)
  var actionHtml = '';
  if(player != null && (typeof _isCardUnlocked !== 'function' || _isCardUnlocked(card.id))){
    var sel = (typeof getSel === 'function') ? getSel(player) : [];
    var inDeck = sel.indexOf(card.id) !== -1;
    actionHtml = '<button class="btn '+(inDeck?'cp-remove':'btn-primary')+'" id="cpActionBtn" '
      + 'onclick="_cpToggleFromPreview('+JSON.stringify(player)+','+card.id+')">'
      + (inDeck ? '✕ Quitar del mazo' : '✓ Agregar al mazo') + '</button>';
  }

  modal.innerHTML =
    '<button class="cp-close" onclick="closeCardPreview()">✕</button>'
    + '<div class="cp-art" style="border-bottom:3px solid '+r.border+'">'+artInner
    +   '<div class="cp-id" style="color:'+r.border+'">'+idStr+'</div>'
    + '</div>'
    + '<div class="cp-head">'
    +   '<div class="cp-name">'+_cpEsc(card.name)+'</div>'
    +   '<div class="cp-meta"><span style="color:'+r.border+'">'+('★').repeat(card.stars||1)+'</span> · '
    +     card.hp+' HP · <span style="color:'+r.border+'">'+_cpEsc(r.name||card.rarity||'')+'</span></div>'
    + '</div>'
    + (card.description ? '<div class="cp-flavor">'+_cpEsc(card.description)+'</div>' : '')
    + '<div class="cp-atks">'+_cpAtksHtml(card)+'</div>'
    + (actionHtml ? '<div class="cp-actions">'+actionHtml+'</div>' : '');

  ov.classList.add('show');
}

// Agregar/quitar desde la ficha → reusa la lógica del picker (límites incluidos)
function _cpToggleFromPreview(player, cardId){
  var grid = document.getElementById(
    player===1?'p1deck':player===2?'p2deck':player===3?'p3deck':player==='chal'?'chalDeck':'onlineMyDeck');
  var el = grid ? grid.querySelector('.mini-card[data-id="'+cardId+'"]') : null;
  if(typeof toggleCard === 'function' && el){
    toggleCard(player, cardId, el);
  } else if(typeof _onlineToggleCard === 'function'){
    _onlineToggleCard(cardId);
  }
  // Refrescar el botón de la ficha
  openCardPreview(cardId, player);
}

// ── Revisión del MAZO seleccionado (todas las cartas elegidas) ──
function openDeckReview(player){
  var sel = (typeof getSel === 'function') ? getSel(player) : [];
  var ov = _cpEnsureOverlay();
  var modal = document.getElementById('cardPreviewModal');

  var rows;
  if(!sel.length){
    rows = '<div class="cp-empty">Aún no has seleccionado cartas.</div>';
  } else {
    rows = sel.map(function(id){
      var card = (CARD_POOL||[]).find(function(c){ return c.id === id; });
      if(!card) return '';
      var r = _cpRarity(card);
      var atks = (card.attacks||[]).filter(function(a){ return a && a.name; })
        .map(function(a){ return '<div class="cp-row-atk">'+_cpAtkIcon(a.type)+' <b>'+_cpEsc(a.name)+'</b> — '+_cpEsc(_cpAtkMeta(a))+'</div>'; })
        .join('');
      var thumb = card.image ? '<img src="'+_cpEsc(card.image)+'" alt="">' : '<span>?</span>';
      return '<div class="cp-row">'
        + '<div class="cp-row-thumb" style="border-color:'+r.border+'" onclick="openCardPreview('+card.id+','+JSON.stringify(player)+')">'+thumb+'</div>'
        + '<div class="cp-row-body">'
        +   '<div class="cp-row-name">'+_cpEsc(card.name)+' <span style="color:'+r.border+'">'+('★').repeat(card.stars||1)+'</span> <span class="cp-row-hp">'+card.hp+' HP</span></div>'
        +   atks
        + '</div>'
        + '<button class="cp-row-del" title="Quitar" onclick="_cpRemoveFromReview('+JSON.stringify(player)+','+card.id+')">✕</button>'
        + '</div>';
    }).join('');
  }

  modal.innerHTML =
    '<button class="cp-close" onclick="closeCardPreview()">✕</button>'
    + '<div class="cp-review-title">TU MAZO · '+sel.length+' carta'+(sel.length!==1?'s':'')+'</div>'
    + '<div class="cp-review-list">'+rows+'</div>';

  ov.classList.add('show');
}

function _cpRemoveFromReview(player, cardId){
  var grid = document.getElementById(
    player===1?'p1deck':player===2?'p2deck':player===3?'p3deck':player==='chal'?'chalDeck':'onlineMyDeck');
  var el = grid ? grid.querySelector('.mini-card[data-id="'+cardId+'"]') : null;
  if(typeof toggleCard === 'function' && el) toggleCard(player, cardId, el);
  openDeckReview(player); // refrescar lista
}
