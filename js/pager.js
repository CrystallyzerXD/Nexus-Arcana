/* ═══════════════════════════════════════════════
   NAVEGACIÓN PRINCIPAL — pager lateral + swipe
   5 pantallas: Tienda · Misiones · INICIO · Logros · Stats
   Inicio al centro (índice 2). Al cambiar, la entrante se
   desliza desde el costado según la dirección. Swipe izq/der
   navega a la vecina. Bajo riesgo: reusa showScreen/display.
═══════════════════════════════════════════════ */
var _MAIN_SCREENS = ['storeScreen','missionsScreen','titleScreen','achievementsScreen','statsScreen'];

function _openMainScreen(id){
  switch(id){
    case 'storeScreen':        openStoreScreen(); break;
    case 'missionsScreen':     openMissionsScreen(); break;
    case 'achievementsScreen': showScreen('achievementsScreen'); if(typeof renderAchievements==='function') renderAchievements(); if(typeof achSwitchTab==='function') achSwitchTab('logros'); break;
    case 'statsScreen':        showScreen('statsScreen'); if(typeof renderStats==='function') renderStats(); break;
    default:                   showScreen('titleScreen');
  }
}

function _navMain(target){
  if(target < 0 || target >= _MAIN_SCREENS.length) return;
  var id = _MAIN_SCREENS[target];
  if(id === _currentScreen) return;
  var cur = _MAIN_SCREENS.indexOf(_currentScreen);
  var dir = (cur === -1) ? 0 : (target > cur ? 1 : -1);
  _openMainScreen(id);                 // navega + renderiza (+ sincroniza nav vía showScreen)
  var el = document.getElementById(id);
  if(el && dir !== 0){
    el.classList.remove('fade-in','slide-from-left','slide-from-right');
    void el.offsetWidth;               // reflow para reiniciar la animación
    el.classList.add(dir > 0 ? 'slide-from-right' : 'slide-from-left');
  }
}

// Sincroniza visibilidad + resaltado de la barra. Llamado desde showScreen().
function _syncMainNav(id){
  var nav = document.getElementById('mainNav');
  if(!nav) return;
  var idx = _MAIN_SCREENS.indexOf(id);
  document.body.classList.toggle('main-nav-on', idx !== -1);
  if(idx === -1){ nav.classList.remove('show'); return; }
  nav.classList.add('show');
  Array.prototype.forEach.call(nav.querySelectorAll('.mainnav-btn'), function(b, i){
    b.classList.toggle('active', i === idx);
  });
  if(id === 'titleScreen') _renderHomeHeader();
}

// ── Header de Inicio (avatar + nivel + XP + monedas) → tappable a Perfil ──
function _renderHomeHeader(){
  var s = (typeof _loadStats === 'function') ? _loadStats() : {};
  var name = (typeof _loadP1Name === 'function' ? _loadP1Name() : '') || 'Jugador';
  var lvl  = (typeof _xpToLevel === 'function') ? _xpToLevel(s.xp||0) : 1;
  var xpIn = (typeof _xpInLevel === 'function') ? _xpInLevel(s.xp||0) : 0;
  var per  = (typeof _XP_PER_LEVEL !== 'undefined') ? _XP_PER_LEVEL : 500;
  var set = function(id, v){ var e = document.getElementById(id); if(e) e.textContent = v; };
  set('homeHdrName', name);
  set('homeHdrLvl', 'Nv ' + lvl);
  set('homeHdrCoins', s.coins || 0);
  var bar = document.getElementById('homeHdrXP');
  if(bar) bar.style.width = Math.round(xpIn / per * 100) + '%';
  var avEl = document.getElementById('homeHdrAvatar');
  if(avEl){
    var c  = (typeof _loadCosmetics === 'function') ? _loadCosmetics() : {};
    var av = (_COSM_AVATARS[c.avatar] || _COSM_AVATARS[0]);
    var bg = (_COSM_AVBGS[c.avbg] || _COSM_AVBGS[0]);
    if(bg) avEl.style.background = bg.color;
    avEl.innerHTML = '<img src="'+av.src+'" alt="'+av.name+'" style="width:100%;height:100%;object-fit:contain;image-rendering:pixelated;border-radius:50%">';
  }
}

// ── Swipe horizontal en las pantallas principales ──
(function(){
  var sx = 0, sy = 0, active = false;
  function down(x, y){
    if(_MAIN_SCREENS.indexOf(_currentScreen) === -1){ active = false; return; }
    sx = x; sy = y; active = true;
  }
  function up(x, y){
    if(!active) return; active = false;
    var dx = x - sx, dy = y - sy;
    if(Math.abs(dx) > 55 && Math.abs(dx) > Math.abs(dy) * 1.4){
      var cur = _MAIN_SCREENS.indexOf(_currentScreen);
      if(cur !== -1) _navMain(cur + (dx < 0 ? 1 : -1));
    }
  }
  document.addEventListener('touchstart', function(e){ var t = e.touches[0]; down(t.clientX, t.clientY); }, {passive:true});
  document.addEventListener('touchend',   function(e){ var t = e.changedTouches[0]; up(t.clientX, t.clientY); }, {passive:true});
  // Ratón (escritorio): pointer no-touch para no duplicar con touch
  document.addEventListener('pointerdown', function(e){ if(e.pointerType !== 'touch') down(e.clientX, e.clientY); });
  document.addEventListener('pointerup',   function(e){ if(e.pointerType !== 'touch') up(e.clientX, e.clientY); });
})();

// ── Ajustes (modal del engranaje) ──
function openSettings(audioOnly){
  var ov = document.getElementById('settingsOverlay');
  if(!ov) return;
  var cuenta = document.getElementById('settingsCuenta');
  if(cuenta) cuenta.style.display = audioOnly ? 'none' : '';
  _syncSettingsAudio();
  ov.classList.add('show');
}
function closeSettings(){
  var ov = document.getElementById('settingsOverlay');
  if(ov) ov.classList.remove('show');
}
function _syncSettingsAudio(){
  var sv = document.getElementById('setVol');
  if(sv && typeof bgm !== 'undefined') sv.value = bgm.volume;
  var sm = document.getElementById('setMute');
  if(sm) sm.textContent = (typeof muted !== 'undefined' && muted) ? '🔇' : '🔊';
  var sp = document.getElementById('setPlay');
  if(sp) sp.textContent = (typeof audioPlaying !== 'undefined' && audioPlaying) ? '⏸ Pausar' : '▶ Reproducir';
  var sfv = document.getElementById('setSfxVol');
  if(sfv && typeof _sfxVol !== 'undefined') sfv.value = _sfxVol;
  var sfm = document.getElementById('setSfxMute');
  if(sfm) sfm.textContent = (typeof _sfxMuted !== 'undefined' && _sfxMuted) ? '🔇' : '🔊';
  if(typeof _renderThemeSelector === 'function') _renderThemeSelector();
}
