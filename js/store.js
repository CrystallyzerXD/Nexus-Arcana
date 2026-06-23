/* ═══════════════════════════════════════════════
   CARTAS DESBLOQUEADAS
═══════════════════════════════════════════════ */
var _UNLOCKED_CARDS_KEY = 'nx_unlocked_cards_v1';
// IDs que están disponibles por defecto (1-20, excepto los especiales bloqueados)
// IDs 2 (Semiaza) y 20 (Nexus) son 9★ especiales, se desbloquean por logro
// IDs 21-22 (Lucat, Boom) son de tienda
// IDs 23-54 se desbloquean por logro
var _DEFAULT_UNLOCKED_CARDS = [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16];

/* ── Mapa logro → carta desbloqueada ── */
var _ACH_CARD_MAP = {
  // ── 1★ ──
  'w1':               17,  // Primera Sangre    → Myren
  'k25':              25,  // Destructor        → Kindrel
  'el10':             33,  // Primer Bastión    → Pitik
  'ffa1':             41,  // Rey del Caos      → Vesprel
  'draw':             49,  // Empate Honroso    → Glibbet
  'crystallyzer':     57,  // Crystallyzer      → Trikka
  // ── 2★ ──
  'w10':              18,  // En Racha          → Carapax
  'k100':             26,  // Exterminador      → Vyrith
  'el15':             34,  // Sin Rendirse      → Torchik
  'ffa10':            42,  // Caos Controlado   → Mirrak
  'mundial_barely':   50,  // Por Poco (Mundial)→ Moswick
  'liga_barely':      58,  // Por Poco (Liga)   → Drizzik
  // ── 3★ ──
  'w50':              19,  // Veterano          → Ferrox
  'k500':             35,  // Aniquilador       → Quillax
  'last_one_standing':27,  // Último en Pie     → Sylvari
  'liga_sf':          43,  // Semifinalista Liga→ Dawnspire
  'draw10':           59,  // Equilibrio Eterno → Lunaris
  'mundial_sf':       51,  // Semifinalista Mund→ Plagax
  // ── 4★ ──
  'w100':             20,  // Combatiente       → Mordecai
  'k1000':            44,  // Masacre           → Darkscale
  'el20':             28,  // Corriente Batalla → Gaethor
  'ffa50':            36,  // Maestro del Caos  → Vaelith
  'lw1':              60,  // Rey de la Liga    → Emberveil
  'mw1':              52,  // Campeón del Mundo → Stonark
  // ── 5★ ──
  'w250':             21,  // Guerrero Arcano   → Crystallis
  'k2500':            37,  // Carnicero         → Ashveil
  'boss_vor':         29,  // Caída Vorathyn    → Zypheria
  'boss_ser':         45,  // Caída Seraveth    → Vorith
  'lw3':              53,  // Tricampeón Liga   → Valdris
  'mw3':              61,  // Tricampeón Mundial→ Thornyx
  // ── 6★ ──
  'w500':             22,  // Élite             → Nethrix
  'boss_mor':         46,  // Caída Morvak      → Synthex
  'el25':             38,  // Imparable         → Malveth
  'liga_dejavu':      30,  // Déjà Vu (Liga)    → Kraxon
  'lw5':              54,  // Dinastía de Liga  → Siphrix
  'mw5':              62,  // Dinastía Mundial  → Vorthen
  // ── 7★ ──
  'w1000':            23,  // Leyenda           → Xyrath
  'k5000':            47,  // Vacío             → Venomyr
  'mundial_dejavu':   31,  // Déjà Vu (Mundial) → Mirael
  'david_goliath':    39,  // David vs Goliat   → Aetherion
  'lw10':             55,  // Imperio Arcano    → Chronath
  'mw10':             63,  // Imperio Nexus     → Astralyx
  // ── 8★ ──
  'k10000':           24,  // Dios de la Batalla→ Aelion
  'el30':             48,  // Endless True      → Morvael
  'max_ko':           32,  // Dominador         → Serath
  'liga_perfect':     40,  // Invicto de Liga   → Oblivion
  'lw50':             56,  // Eterno de la Liga → Dualvex
  'mw50':             64,  // Dios del Mundial  → Nullvore
  // ── 9★ especiales ──
  'boss_all':         98,  // Conquistador Jefes→ Semiaza
  'all_ach':          99,  // Nexus Completo    → Nexus
};

function _loadUnlockedCards(){
  try{
    var stored = JSON.parse(localStorage.getItem(_UNLOCKED_CARDS_KEY)||'null');
    if(!stored){ return _DEFAULT_UNLOCKED_CARDS.slice(); }
    return stored;
  }catch(e){ return _DEFAULT_UNLOCKED_CARDS.slice(); }
}
function _saveUnlockedCards(arr){ try{ localStorage.setItem(_UNLOCKED_CARDS_KEY,JSON.stringify(arr)); }catch(e){} }
function _isCardUnlocked(cardId){ return _loadUnlockedCards().indexOf(cardId) !== -1; }
function _unlockCard(cardId){
  var arr = _loadUnlockedCards();
  if(arr.indexOf(cardId)===-1){ arr.push(cardId); _saveUnlockedCards(arr); }
}

/* ═══════════════════════════════════════════════
   TIENDA
═══════════════════════════════════════════════ */
var _STAR_PRICES = {1:100, 2:200, 3:300, 4:400, 5:500, 6:750, 7:1000, 8:1500};

// Cartas disponibles en la tienda (id de cartas.json)
var _STORE_CARD_IDS = [65, 66, 67, 68, 69, 70, 71, 72, 73, 74, 75, 76, 77, 78, 79, 80]; // Guo, Lucat, Norax, Kronix, Lumis, Gorvak, Umbrak, Tianxu, Ler, Boom, Flinger, Hedinx, Fargret, Algor, Wormix, Pekitiel

function openStoreScreen(){
  renderStoreScreen();
  showScreen('storeScreen');
  if(typeof _renderFragmentBadges === 'function') _renderFragmentBadges();
}

function renderStoreScreen(){
  var s = _loadStats();
  var coinsEl = document.getElementById('store-coins-display');
  if(coinsEl) coinsEl.textContent = s.coins || 0;

  var grid = document.getElementById('storeGrid');
  if(!grid) return;

  // Cargar cartas del JSON global (allCards cargado al inicio)
  var storeCards = _STORE_CARD_IDS.map(function(cid){ return (CARD_POOL||[]).find(function(c){ return c.id===cid; }); }).filter(Boolean);
  storeCards.sort(function(a,b){ return a.stars!==b.stars ? a.stars-b.stars : a.id-b.id; });
  var html = '';
  for(var i=0;i<storeCards.length;i++){
    var card = storeCards[i];
    var cid = card.id;
    var owned = _isCardUnlocked(cid);
    var price = _STAR_PRICES[card.stars] || 999;
    var stars = '★'.repeat(card.stars);
    html += '<div class="store-card'+(owned?' owned':'')+'">'
          + '<div class="store-card-img-wrap"><img src="'+card.image+'" alt="'+card.name+'" onerror="this.style.display=\'none\'"></div>'
          + '<div class="store-card-body">'
          + '<div class="store-card-stars">'+stars+'</div>'
          + '<div class="store-card-name">'+card.name+'</div>'
          + '<div class="store-card-rarity">'+card.rarity+'</div>'
          + '<div class="store-card-price">'+( owned ? '✔ Obtenido' : '🪙 '+price+' monedas' )+'</div>'
          + (owned
              ? '<button class="store-buy-btn owned-btn" disabled>Ya lo tienes</button>'
              : '<button class="store-buy-btn" onclick="buyStoreCard('+cid+','+price+')">Comprar</button>')
          + '</div>'
          + '</div>';
  }
  grid.innerHTML = html || '<div style="color:var(--text-dim);font-size:12px">No hay cartas disponibles.</div>';
}

function buyStoreCard(cardId, price){
  var s = _loadStats();
  var coins = s.coins || 0;
  if(_isCardUnlocked(cardId)){
    _storeMsg('Ya tienes esta carta.', '#64dc78'); return;
  }
  if(coins < price){
    playSfxDenied(); _storeMsg('No tienes suficientes monedas. ('+coins+' / '+price+' 🪙)', '#ff6b6b'); return;
  }
  s.coins = coins - price;
  _saveStats(s);
  _unlockCard(cardId);
  renderStoreScreen();
  renderStats();
  playSfxCompra();
  var card = (CARD_POOL||[]).find(function(c){ return c.id===cardId; });
  _storeMsg('¡' + (card?card.name:'Carta') + ' desbloqueado! 🎉', '#64dc78');
}

var _redeemedCodes = [];
var _REDEEMED_KEY = 'nx_redeemed_codes_v1';
function _loadRedeemedCodes(){
  try{ return JSON.parse(localStorage.getItem(_REDEEMED_KEY)||'[]'); }catch(e){ return []; }
}
function _saveRedeemedCodes(arr){ try{ localStorage.setItem(_REDEEMED_KEY,JSON.stringify(arr)); }catch(e){} }

// Códigos válidos: { code, reward: 'card'|'coins', value: id|amount, once: true }
var _STORE_CODES = [
  { code:'CRYSTALLYZER',    reward:'none',  value:null, desc:'código del creador', statKey:'crystallyzer' },
  { code:'NICONICOTICOTICO', reward:'coins', value:50,   desc:'+50 monedas 🪙' },
];

function redeemStoreCode(){
  var input = document.getElementById('storeCodeInput');
  if(!input) return;
  var raw = (input.value||'').trim().toUpperCase();
  if(!raw){ playSfxDenied(); _storeMsg('Escribe un código primero.', '#ff6b6b'); return; }

  // Código secreto dev panel
  if(raw === 'NEXUSDEV'){
    input.value = '';
    toggleDevPanel();
    _storeMsg(document.getElementById('_devPanel') ? '⬡ Dev panel activado.' : '⬡ Dev panel cerrado.', '#a78bfa');
    return;
  }

  var redeemed = _loadRedeemedCodes();
  if(redeemed.indexOf(raw)!==-1){
    _storeMsg('Este código ya fue canjeado.', '#ff6b6b'); return;
  }

  var found = null;
  for(var i=0;i<_STORE_CODES.length;i++){
    if(_STORE_CODES[i].code === raw){ found=_STORE_CODES[i]; break; }
  }
  if(!found){ playSfxDenied(); _storeMsg('Código inválido.', '#ff6b6b'); return; }

  // Canjear
  redeemed.push(raw);
  _saveRedeemedCodes(redeemed);
  input.value = '';

  var st = _loadStats();
  if(found.statKey){
    st[found.statKey] = (st[found.statKey]||0) + 1;
  }
  if(found.reward === 'coins' && found.value){
    st.coins = (st.coins||0) + found.value;
    renderStats();
    _showCoinToast(found.value, 300);
  }
  _saveStats(st);
  _checkAchievements(st);

  if(found.reward === 'card' && found.value){
    _unlockCard(found.value);
    renderStoreScreen();
  } else {
    renderStoreScreen();
  }

  _storeMsg('¡Código canjeado! 🎉 ' + (found.desc||''), '#64dc78');
}

function _storeMsg(text, color){
  var el = document.getElementById('storeCodeMsg');
  if(el){ el.textContent = text; el.style.color = color||'var(--text-muted)'; }
}

function _roundDisplayLabel(round){
  var labels = {
    groups:'Fase de Grupos', r32:'Ronda de 32', r16:'Octavos de Final',
    qf:'Cuartos de Final', sf:'Semifinales', final:'Gran Final',
    champion:'¡Campeón! 🏆', liga:'Fase de Liga', playoffs:'Playoffs',
  };
  return labels[round] || '—';
}

var _achPage = 0;
var _ACH_PER_PAGE = 10; // 5 filas × 2 columnas

function renderAchievements(){
  _achPage = 0;
  _renderAchPage();
}

function achChangePage(delta){
  var total = Math.ceil(ACHIEVEMENTS.length / _ACH_PER_PAGE);
  _achPage = Math.max(0, Math.min(_achPage + delta, total - 1));
  _renderAchPage();
}

function _renderAchPage(){
  var unlocked = _loadAch();
  var grid = document.getElementById('achGrid');
  if(!grid) return;
  var total = Math.ceil(ACHIEVEMENTS.length / _ACH_PER_PAGE);
  var start = _achPage * _ACH_PER_PAGE;
  var end   = Math.min(start + _ACH_PER_PAGE, ACHIEVEMENTS.length);
  var html = '';
  for(var i=start;i<end;i++){
    var a = ACHIEVEMENTS[i];
    var isUnlocked = unlocked.indexOf(a.id)!==-1;
    var showDesc = isUnlocked || !a.hidden;
    html += '<div class="ach-card '+(isUnlocked?'unlocked':'locked')+'">'
          + '<div class="ach-icon">'+a.icon+'</div>'
          + '<div><div class="ach-name">'+a.name+'</div>'
          + '<div class="ach-desc">'+(showDesc?a.desc:'???')+'</div></div>'
          + '</div>';
  }
  grid.innerHTML = html || '';
  var countEl = document.getElementById('ach-count');
  if(countEl) countEl.textContent = unlocked.length+' / '+ACHIEVEMENTS.length+' desbloqueados';
  var label = document.getElementById('achPageLabel');
  if(label) label.textContent = (_achPage+1)+' / '+total;
  var prev = document.getElementById('achPrevBtn');
  var next = document.getElementById('achNextBtn');
  if(prev) prev.disabled = (_achPage === 0);
  if(next) next.disabled = (_achPage >= total-1);
}

function confirmResetStats(){
  document.getElementById('resetStatsModal').style.display = 'flex';
}

function doResetStats(){
  document.getElementById('resetStatsModal').style.display = 'none';
  try{
    localStorage.removeItem(_STATS_KEY);
    localStorage.removeItem(_ACH_KEY);
    localStorage.removeItem(_DAILY_KEY);
    localStorage.removeItem(_NAME_KEY);
    localStorage.removeItem(_TOURNEY_KEY_MUNDIAL);
    localStorage.removeItem(_TOURNEY_KEY_LIGA);
    localStorage.removeItem(_REDEEMED_KEY);
    localStorage.removeItem(_COSM_KEY);
    localStorage.removeItem(_SOL_KEY);
    localStorage.removeItem('nx_music_unlocks_v1');
    localStorage.removeItem('nx_fragments_v1');
    localStorage.removeItem('nx_gallery_v1');
    _saveUnlockedCards(_DEFAULT_UNLOCKED_CARDS.slice());
    if(typeof _selectedMainTheme !== 'undefined') _selectedMainTheme = 'bgm1';
    if(typeof _getMainBgm === 'function' && typeof _switchBgm === 'function') _switchBgm(_getMainBgm());
  }catch(e){}
  _applyCosmetics();
  var nameDisp = document.getElementById('profileNameDisplay');
  if(nameDisp) nameDisp.textContent = 'Jugador';
  var nameInp = document.getElementById('profileNameInput');
  if(nameInp) nameInp.value = '';
  renderStats();
  renderAchievements();
}

// ══════════════════════════════════════════════
//  CASINO
// ══════════════════════════════════════════════
var _CASINO_BETS = [1, 3, 5, 10, 15, 25, 50];

function _casinoBetRow(containerId, stateKey){
  var row = document.getElementById(containerId);
  row.innerHTML = '';
  var coins = (_loadStats().coins||0);
  _CASINO_BETS.forEach(function(b){
    var btn = document.createElement('button');
    btn.className = 'casino-bet-btn' + (window[stateKey]===b ? ' selected' : '');
    btn.textContent = '🪙'+b;
    btn.disabled = coins < b;
    btn.onclick = function(){
      window[stateKey] = b;
      _casinoBetRow(containerId, stateKey);
      if(stateKey==='_dueloBet') _dueloUpdateConfirm();
    };
    row.appendChild(btn);
  });
}

function openCasino(){
  var lock = parseInt(localStorage.getItem('nx_casino_lock_until')||'0');
  if(lock > Date.now()){
    var hoursLeft = Math.ceil((lock - Date.now()) / 3600000);
    document.getElementById('infoModalIcon').textContent  = '🔒';
    document.getElementById('infoModalTitle').textContent = 'Casino bloqueado';
    document.getElementById('infoModalDesc').textContent  = 'El casino estará disponible en ' + hoursLeft + ' hora' + (hoursLeft !== 1 ? 's' : '') + ' tras importar tu cuenta.';
    document.getElementById('infoModal').style.display    = 'flex';
    return;
  }
  document.getElementById('casino-lobby').style.display = '';
  document.getElementById('casino-bj').style.display = 'none';
  document.getElementById('casino-duelo').style.display = 'none';
  document.getElementById('casino-poi').style.display = 'none';
  document.getElementById('casino-disco').style.display = 'none';
  document.getElementById('casino-triada').style.display = 'none';
  document.getElementById('casino-lobby-coins').textContent = (_loadStats().coins||0);
  document.getElementById('casinoOverlay').classList.add('active');
}
function casinoBack(){
  document.getElementById('casino-bj').style.display = 'none';
  document.getElementById('casino-duelo').style.display = 'none';
  document.getElementById('casino-poi').style.display = 'none';
  document.getElementById('casino-disco').style.display = 'none';
  document.getElementById('casino-triada').style.display = 'none';
  document.getElementById('casino-lobby').style.display = '';
  document.getElementById('casino-lobby-coins').textContent = (_loadStats().coins||0);
}
function closeCasino(){
  document.getElementById('casinoOverlay').classList.remove('active');
}

