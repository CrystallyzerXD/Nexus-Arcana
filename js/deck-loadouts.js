/* ═══════════════════════════════════════════════
   MAZOS GUARDADOS (LOADOUTS) — solo Jugador 1
   Un mazo = { name, size, ids:[...] }. Se guardan en
   localStorage (nx_decks_v1) y viajan con export/import.
═══════════════════════════════════════════════ */
var _DECKS_KEY = 'nx_decks_v1';
var _DECKS_MAX = 1;
var _loadoutToastTimer = null;

function _loadDecks(){
  try{ var a = JSON.parse(localStorage.getItem(_DECKS_KEY)||'[]'); return Array.isArray(a)?a:[]; }
  catch(e){ return []; }
}
function _saveDecks(arr){ try{ localStorage.setItem(_DECKS_KEY, JSON.stringify(arr)); }catch(e){} }

function _loadoutEsc(s){ return String(s).replace(/[&<>"']/g, function(c){
  return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]; }); }

function _p1Size(){ return parseInt((document.getElementById('p1size')||{}).value||6); }

// ── Construir/refrescar la barra "MIS MAZOS" encima de la grilla de P1 ──
function _renderDeckLoadouts(){
  var grid = document.getElementById('p1deck');
  if(!grid) return;                       // boss-chal u otros pickers: sin loadouts
  var bar = document.getElementById('p1loadoutBar');
  if(!bar){
    bar = document.createElement('div');
    bar.id = 'p1loadoutBar';
    bar.className = 'loadout-bar';
    grid.parentNode.insertBefore(bar, grid);
  }
  var decks = _loadDecks();
  var html = '<div class="loadout-row1">'
    + '<span class="loadout-label">MIS MAZOS <span class="loadout-count">'+decks.length+'/'+_DECKS_MAX+'</span></span>'
    + '<div class="loadout-chips" id="p1loadoutChips">';
  if(!decks.length){
    html += '<span class="loadout-empty">— ninguno guardado —</span>';
  } else {
    decks.forEach(function(d, i){
      html += '<span class="loadout-chip" onclick="_applyDeckLoadout('+i+')" title="Cargar este mazo">'
        + '<span class="loadout-chip-name">★ '+_loadoutEsc(d.name)+'</span>'
        + '<span class="loadout-chip-size">'+d.size+'</span>'
        + '<button class="loadout-chip-btn" onclick="event.stopPropagation();_renameDeckLoadout('+i+')" title="Renombrar">✎</button>'
        + '<button class="loadout-chip-btn" onclick="event.stopPropagation();_deleteDeckLoadout('+i+')" title="Borrar">✕</button>'
        + '</span>';
    });
  }
  html += '</div></div>';
  html += '<div class="loadout-row2">'
    + '<button class="btn btn-sm loadout-review" id="p1deckReviewBtn" onclick="openDeckReview(1)" title="Ver las cartas seleccionadas y sus ataques">👁 Ver mazo (<span id="p1deckReviewN">0</span>)</button>'
    + '<button class="btn btn-sm loadout-save" id="p1loadoutSave" onclick="_saveCurrentDeck()">💾 Guardar</button>'
    + '</div>';
  bar.innerHTML = html;
  _updateLoadoutSaveBtn();
}

function _updateLoadoutSaveBtn(){
  var n = (typeof p1sel !== 'undefined') ? p1sel.length : 0;
  var rev = document.getElementById('p1deckReviewN');
  if(rev) rev.textContent = n;
  var revBtn = document.getElementById('p1deckReviewBtn');
  if(revBtn) revBtn.disabled = (n === 0);
  var btn = document.getElementById('p1loadoutSave');
  if(!btn) return;
  var complete = (typeof p1sel !== 'undefined') && p1sel.length === _p1Size() && p1sel.length > 0;
  btn.disabled = !complete;
  btn.title = !complete ? 'Completa tu mazo para guardarlo'
            : (_loadDecks().length >= _DECKS_MAX ? 'Máximo '+_DECKS_MAX+' mazo'+(_DECKS_MAX!==1?'s':'')+': borra '+(_DECKS_MAX!==1?'uno':'el actual')+' para guardar otro' : 'Guardar el mazo actual');
}

function _saveCurrentDeck(){
  if(typeof p1sel === 'undefined' || p1sel.length !== _p1Size() || !p1sel.length) return;
  var decks = _loadDecks();
  if(decks.length >= _DECKS_MAX){
    _loadoutToast('Máximo '+_DECKS_MAX+' mazo'+(_DECKS_MAX!==1?'s':'')+' guardado'+(_DECKS_MAX!==1?'s':'')+'. Borra '+(_DECKS_MAX!==1?'uno':'el actual')+' para guardar otro.');
    return;
  }
  var n = 1; while(decks.some(function(d){ return d.name === 'Mazo '+n; })) n++;
  decks.push({ name:'Mazo '+n, size:p1sel.length, ids:p1sel.slice() });
  _saveDecks(decks);
  _renderDeckLoadouts();
  _loadoutToast('Mazo guardado');
}

function _applyDeckLoadout(idx){
  var d = _loadDecks()[idx];
  if(!d) return;
  // Ajustar el tamaño de pila al del mazo guardado
  var sizeEl = document.getElementById('p1size');
  if(sizeEl){ sizeEl.value = d.size; if(typeof updateDeckSize === 'function') updateDeckSize(1); }
  // Reset selección
  p1sel = [];
  var grid = document.getElementById('p1deck');
  if(grid) grid.querySelectorAll('.mini-card.selected').forEach(function(el){ el.classList.remove('selected'); });
  var skipped = 0;
  d.ids.forEach(function(id){
    if(typeof _isCardUnlocked === 'function' && !_isCardUnlocked(id)){ skipped++; return; }
    var card = (CARD_POOL||[]).find(function(c){ return c.id === id; });
    if(!card){ skipped++; return; }
    var limit = (typeof RARITY_LIMITS !== 'undefined' && RARITY_LIMITS[card.rarity] != null) ? RARITY_LIMITS[card.rarity] : Infinity;
    if(getRarityCount(p1sel, card.rarity) >= limit){ skipped++; return; }
    if(p1sel.length >= d.size) return;
    p1sel.push(id);
    if(grid){ var el = grid.querySelector('.mini-card[data-id="'+id+'"]'); if(el) el.classList.add('selected'); }
  });
  if(typeof updateDeckCount === 'function') updateDeckCount(1);
  _updateLoadoutSaveBtn();
  if(skipped > 0) _loadoutToast(skipped+' carta'+(skipped>1?'s':'')+' no disponible'+(skipped>1?'s':'')+' (omitida'+(skipped>1?'s':'')+')');
  else _loadoutToast('Mazo «'+d.name+'» cargado');
}

function _deleteDeckLoadout(idx){
  var decks = _loadDecks();
  if(idx < 0 || idx >= decks.length) return;
  decks.splice(idx, 1);
  _saveDecks(decks);
  _renderDeckLoadouts();
}

// Renombrar inline: reemplaza el chip por un input que confirma con Enter/blur
function _renameDeckLoadout(idx){
  var d = _loadDecks()[idx];
  if(!d) return;
  var chips = document.getElementById('p1loadoutChips');
  if(!chips || !chips.children[idx]) return;
  var chip = chips.children[idx];
  var input = document.createElement('input');
  input.className = 'loadout-rename-input';
  input.value = d.name;
  input.maxLength = 16;
  input.onclick = function(e){ e.stopPropagation(); };
  var done = false;
  function commit(){
    if(done) return; done = true;
    var v = (input.value || '').trim().slice(0, 16) || d.name;
    var ds = _loadDecks();
    if(ds[idx]){ ds[idx].name = v; _saveDecks(ds); }
    _renderDeckLoadouts();
  }
  input.onkeydown = function(e){
    if(e.key === 'Enter'){ e.preventDefault(); commit(); }
    else if(e.key === 'Escape'){ done = true; _renderDeckLoadouts(); }
  };
  input.onblur = commit;
  chip.innerHTML = '';
  chip.appendChild(input);
  input.focus(); input.select();
}

function _loadoutToast(msg){
  var t = document.getElementById('loadoutToast');
  if(!t){ t = document.createElement('div'); t.id = 'loadoutToast'; t.className = 'loadout-toast'; document.body.appendChild(t); }
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(_loadoutToastTimer);
  _loadoutToastTimer = setTimeout(function(){ t.classList.remove('show'); }, 1800);
}
