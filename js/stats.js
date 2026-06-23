/* ═══════════════════════════════════════════════
   ESTADÍSTICAS & LOGROS
═══════════════════════════════════════════════ */
var _STATS_KEY   = 'nx_stats_v2';
var _ACH_KEY     = 'nx_ach_v2';
var _NAME_KEY    = 'nx_p1name';
var _NAME2_KEY   = 'nx_p2name';
var _TOURNEY_KEY_MUNDIAL = 'nx_tourney_mundial';
var _TOURNEY_KEY_LIGA    = 'nx_tourney_liga';

var _DEFAULT_STATS = {
  matches:0, wins:0, losses:0, draws:0,
  kos:0, maxKosMatch:0,
  winsStandard:0, bossWins:{}, winsFFA:0,
  mundialPlayed:0, mundialWins:0, mundialBest:null, mundialHistory:[],
  ligaPlayed:0,   ligaWins:0,   ligaBest:null,   ligaHistory:[],
  coins:0,
  casinoWinsBJ:0, casinoWinsDuelo:0, casinoWinsPoi:0, casinoWinsDisco:0, casinoWinsTriada:0,
  casinoPlayedBJ:0, casinoPlayedDuelo:0, casinoPlayedPoi:0, casinoPlayedDisco:0, casinoPlayedTriada:0,
  solWins:0,
  wins8to0:0, davidVsGoliath:0, mundialDejaVu:0, ligaDejaVu:0,
  crystallyzer:0, lastOneStanding:0,
  xp:0, winStreak:0, bestWinStreak:0,
  cardUsage:{},
};

var _XP_PER_LEVEL = 500;
function _xpToLevel(xp){ return Math.min(100, Math.floor((xp||0)/_XP_PER_LEVEL)+1); }
function _xpInLevel(xp){ return (xp||0) % _XP_PER_LEVEL; }
var _RANKS = [
  {min:1,  label:'Aprendiz'},
  {min:10, label:'Combatiente'},
  {min:20, label:'Guerrero'},
  {min:30, label:'Veterano'},
  {min:40, label:'Experto'},
  {min:50, label:'Élite'},
  {min:60, label:'Maestro'},
  {min:75, label:'Gran Maestro'},
  {min:90, label:'Leyenda'},
  {min:100,label:'Nexus Master'},
];
function _levelToRank(lvl){
  var r = _RANKS[0];
  for(var i=0;i<_RANKS.length;i++){ if(lvl>=_RANKS[i].min) r=_RANKS[i]; }
  return r.label;
}

function _loadStats(){
  try{ return Object.assign({},_DEFAULT_STATS,JSON.parse(localStorage.getItem(_STATS_KEY)||'{}')); }
  catch(e){ return Object.assign({},_DEFAULT_STATS); }
}
function _saveStats(s){
  try{ localStorage.setItem(_STATS_KEY,JSON.stringify(s)); }catch(e){}
  var c = s.coins || 0;
  ['store-coins-display','casino-lobby-coins','bj-coins','duelo-coins',
   'poi-lobby-coins','disco-coins','triada-coins'].forEach(function(id){
    var el = document.getElementById(id); if(el) el.textContent = c;
  });
}
function _loadAch(){
  try{ return JSON.parse(localStorage.getItem(_ACH_KEY)||'[]'); }
  catch(e){ return []; }
}
function _saveAch(a){ try{ localStorage.setItem(_ACH_KEY,JSON.stringify(a)); }catch(e){} }
function _loadP1Name(){ try{ return localStorage.getItem(_NAME_KEY)||''; }catch(e){ return ''; } }
function _saveP1Name(n){ try{ localStorage.setItem(_NAME_KEY,n); }catch(e){} }
function _loadP2Name(){ try{ return localStorage.getItem(_NAME2_KEY)||''; }catch(e){ return ''; } }
function _saveP2Name(n){ try{ localStorage.setItem(_NAME2_KEY,n); }catch(e){} }

// ── Migración de cuenta ──
var _ACCOUNT_KEYS = [
  'nx_stats_v2', 'nx_ach_v2', 'nx_p1name', 'nx_p2name',
  'nx_first_launch', 'nx_dailies_v2', 'nx_unlocked_cards_v1', 'nx_redeemed_codes_v1',
  'nx_tourney_mundial', 'nx_tourney_liga', 'nx_cosmetics_v1', 'nx_sol_v1',
  'nx_decks_v1', 'nx_card_stats_v1', 'nx_music_unlocks_v1',
  'nx_fragments_v1', 'nx_gallery_v1'
];

// Clave maestra dividida para dificultar búsqueda directa
var _NXA_K = ['4e','65','78','75','73','41','72','63','61','6e','61',
               '5f','53','61','76','65','21','76','32','5f','4b','65',
               '79','21','23','71','57','37','52','74','39','5a'];
function _nxaKey(){ return _NXA_K.map(function(h){ return String.fromCharCode(parseInt(h,16)); }).join(''); }

async function _nxaGetKeys(){
  var raw = new TextEncoder().encode(_nxaKey());
  var base = await crypto.subtle.importKey('raw', raw, 'HKDF', false, ['deriveKey','deriveBits']);
  var encKey = await crypto.subtle.deriveKey(
    { name:'HKDF', hash:'SHA-256', salt:new TextEncoder().encode('NxEnc'), info:new TextEncoder().encode('enc') },
    base, { name:'AES-GCM', length:256 }, false, ['encrypt','decrypt']
  );
  var macBits = await crypto.subtle.deriveBits(
    { name:'HKDF', hash:'SHA-256', salt:new TextEncoder().encode('NxMac'), info:new TextEncoder().encode('mac') },
    base, 256
  );
  var macKey = await crypto.subtle.importKey('raw', macBits, { name:'HMAC', hash:'SHA-256' }, false, ['sign','verify']);
  return { encKey:encKey, macKey:macKey };
}

async function exportAccount(){
  try{
    var data = {};
    _ACCOUNT_KEYS.forEach(function(k){
      var v = localStorage.getItem(k);
      if(v !== null) data[k] = v;
    });
    var plain = new TextEncoder().encode(JSON.stringify(data));
    var keys = await _nxaGetKeys();
    var iv = crypto.getRandomValues(new Uint8Array(12));
    var cipherBuf = await crypto.subtle.encrypt({ name:'AES-GCM', iv:iv }, keys.encKey, plain);
    var cipher = new Uint8Array(cipherBuf);
    var toSign = new Uint8Array(iv.length + cipher.length);
    toSign.set(iv); toSign.set(cipher, iv.length);
    var sigBuf = await crypto.subtle.sign('HMAC', keys.macKey, toSign);
    var sig = new Uint8Array(sigBuf);
    var ts = Math.floor(Date.now()/1000);
    var header = new Uint8Array(8);
    header[0]=0x4e; header[1]=0x58; header[2]=0x41; header[3]=0x02;
    header[4]=(ts>>>24)&0xff; header[5]=(ts>>>16)&0xff; header[6]=(ts>>>8)&0xff; header[7]=ts&0xff;
    var out = new Uint8Array(header.length + sig.length + iv.length + cipher.length);
    var off=0;
    out.set(header,off); off+=header.length;
    out.set(sig,off);    off+=sig.length;
    out.set(iv,off);     off+=iv.length;
    out.set(cipher,off);
    var b64 = btoa(String.fromCharCode.apply(null, out));
    var _plugins = window.Capacitor && window.Capacitor.Plugins;
    var _share   = _plugins && _plugins.Share;
    var _fs      = _plugins && _plugins.Filesystem;
    // Capacitor Android: escribir archivo en cache y compartirlo como fichero
    if(_share && _fs){
      try{
        var filename = (localStorage.getItem(_NAME_KEY)||'cuenta').replace(/[^a-zA-Z0-9_\-]/g,'_') + '_nexus.nxa';
        var writeResult = await _fs.writeFile({
          path: filename,
          data: b64,
          directory: 'CACHE',
          encoding: 'utf8'
        });
        await _share.share({ title: 'Nexus Arcana — cuenta', files: [writeResult.uri], dialogTitle: 'Guardar cuenta' });
        _migrateMsg('Guarda el archivo en Archivos, Drive o envíatelo a ti mismo.', true);
        return;
      }catch(e){
        if(e && (e.name === 'AbortError' || (e.message && e.message.includes('cancel')))){
          _migrateMsg('Exportación cancelada.', false); return;
        }
      }
    }
    // Web: descargar como archivo
    var filename = (localStorage.getItem(_NAME_KEY)||'cuenta').replace(/[^a-zA-Z0-9_\-]/g,'_') + '_nexus.nxa';
    var blob = new Blob([b64], { type:'text/plain' });
    if(navigator.share){
      try{
        var shareFile = new File([blob], filename, { type:'text/plain' });
        await navigator.share({ files:[shareFile], title:'Nexus Arcana — cuenta' });
        _migrateMsg('Archivo compartido.', true);
        return;
      }catch(e){
        if(e && e.name === 'AbortError'){ _migrateMsg('Exportación cancelada.', false); return; }
      }
    }
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url; a.download = filename;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    setTimeout(function(){ URL.revokeObjectURL(url); }, 1000);
    _migrateMsg('Archivo generado: ' + filename, true);
  }catch(e){ _migrateMsg('Error al exportar.', false); }
}

async function importAccountFromText(){
  var text = (document.getElementById('importPasteBox').value||'').trim();
  if(!text){ _migrateMsg('Pega el código antes de importar.', false); return; }
  var fakeFile = new Blob([text], { type:'text/plain' });
  fakeFile.text = function(){ return Promise.resolve(text); };
  await importAccount(fakeFile);
  document.getElementById('importPasteBox').value = '';
}

async function importAccount(file){
  try{
    var b64 = (await file.text()).trim();
    var bytes = Uint8Array.from(atob(b64), function(c){ return c.charCodeAt(0); });
    if(bytes.length < 8+32+12+1){ _migrateMsg('Archivo inválido o corrupto.', false); return; }
    var off=0;
    var magic = bytes.slice(0,4); off+=4;
    if(magic[0]!==0x4e||magic[1]!==0x58||magic[2]!==0x41||magic[3]!==0x02){
      _migrateMsg('Formato no reconocido.', false); return;
    }
    off+=4;
    var sig   = bytes.slice(off, off+32); off+=32;
    var iv    = bytes.slice(off, off+12); off+=12;
    var cipher= bytes.slice(off);
    var toVerify = new Uint8Array(iv.length + cipher.length);
    toVerify.set(iv); toVerify.set(cipher, iv.length);
    var keys = await _nxaGetKeys();
    var ok = await crypto.subtle.verify('HMAC', keys.macKey, sig, toVerify);
    if(!ok){ _migrateMsg('Archivo modificado — importación rechazada.', false); return; }
    var plainBuf = await crypto.subtle.decrypt({ name:'AES-GCM', iv:iv }, keys.encKey, cipher);
    var data = JSON.parse(new TextDecoder().decode(plainBuf));
    var _today = _solTodayKey();
    var _localSolBefore = _loadSolData();
    var _localDailiesBefore = _loadDailies();
    Object.keys(data).forEach(function(k){
      if(_ACCOUNT_KEYS.indexOf(k) !== -1) localStorage.setItem(k, data[k]);
    });
    // Solitario: conservar done=true si ya estaba completado hoy en local o en el importado
    var _importedSol = _loadSolData();
    var _localDoneToday = _localSolBefore.done && _localSolBefore.date === _today;
    var _importedDoneToday = _importedSol.done && _importedSol.date === _today;
    if(_localDoneToday && !_importedDoneToday){
      _saveSolData({date:_today, done:true, rewarded:true});
    }
    // Misiones: conservar el progreso más avanzado por misión para el día de hoy
    var _importedDailies = _loadDailies();
    if(_localDailiesBefore.date === _today && _importedDailies.date === _today){
      _importedDailies.missions = _importedDailies.missions.map(function(im){
        var local = _localDailiesBefore.missions.find(function(lm){ return lm.id === im.id; });
        if(local && (local.done || local.progress > (im.progress||0))){
          return local.done ? local : Object.assign({}, im, {progress: local.progress});
        }
        return im;
      });
      _saveDailies(_importedDailies);
    } else if(_localDailiesBefore.date === _today && _importedDailies.date !== _today){
      _saveDailies(_localDailiesBefore);
    }
    localStorage.setItem('nx_casino_lock_until', Date.now() + 24*60*60*1000);
    _applyCosmetics();
    _migrateMsg('Cuenta importada correctamente.', true);
    setTimeout(function(){ renderStats(); renderProfile(); }, 400);
  }catch(e){ _migrateMsg('Error al leer el archivo.', false); }
}

function _migrateMsg(msg, ok){
  var el = document.getElementById('migrate-msg');
  if(!el) return;
  el.textContent = msg;
  el.style.color = ok ? '#4ac97a' : '#ff6b6b';
  el.style.display = 'block';
  clearTimeout(el._t);
  el._t = setTimeout(function(){ el.style.display = 'none'; }, 4500);
}

// ── Guardado de torneo en progreso ──
function _serializePlayer(pl){
  if(!pl) return null;
  return {
    num: pl.num, name: pl.name, kills: pl.kills||0,
    needsToPlay: pl.needsToPlay||false,
    active: pl.active ? JSON.parse(JSON.stringify(pl.active)) : null,
    pile:  (pl.pile||[]).map(c=>JSON.parse(JSON.stringify(c))),
    hand:  (pl.hand||[]).map(c=>JSON.parse(JSON.stringify(c))),
  };
}
function _saveTourneyProgress(){
  if(!partyState && !ligaState) return;
  const isMundial = !!partyState;
  const key = isMundial ? _TOURNEY_KEY_MUNDIAL : _TOURNEY_KEY_LIGA;
  const inMatch = (partyState && (partyState._pendingGroupMatch!=null||partyState._pendingKnockout!=null))
                ||(ligaState  && (ligaState._pendingLeagueMatch!=null||ligaState._pendingKnockout!=null));
  try{
    localStorage.setItem(key, JSON.stringify({
      mode: isMundial ? 'mundial' : 'liga',
      partyState: partyState ? JSON.parse(JSON.stringify(partyState)) : null,
      ligaState:  ligaState  ? JSON.parse(JSON.stringify(ligaState))  : null,
      inMatch,
      game: inMatch ? {
        p1: _serializePlayer(p1), p2: _serializePlayer(p2),
        currentPlayer, turnNumber, attackUsed, gameMode,
        _caosActive, _caosEffect,
      } : null,
    }));
  }catch(e){}
}
function _loadTourneyProgress(mode){
  try{
    const key = mode === 'mundial' ? _TOURNEY_KEY_MUNDIAL : _TOURNEY_KEY_LIGA;
    const raw = localStorage.getItem(key);
    if(!raw) return null;
    return JSON.parse(raw);
  }catch(e){ return null; }
}
function _clearTourneyProgress(){
  if(partyState)  try{ localStorage.removeItem(_TOURNEY_KEY_MUNDIAL); }catch(e){}
  if(ligaState)   try{ localStorage.removeItem(_TOURNEY_KEY_LIGA); }catch(e){}
  // Si ambos son null (ej: tras quit), limpiar ambas keys por seguridad
  if(!partyState && !ligaState){
    try{ localStorage.removeItem(_TOURNEY_KEY_MUNDIAL); }catch(e){}
    try{ localStorage.removeItem(_TOURNEY_KEY_LIGA); }catch(e){}
  }
}
function _restoreTourneyProgress(saved){
  botMode = true;
  if(saved.mode === 'mundial') _switchBgm(_bgmWorldcup);
  else                         _switchBgm(_bgmLeague);
  if(saved.mode === 'mundial'){
    partyState = saved.partyState; ligaState = null;
    // afterMatch es una función — no sobrevive JSON, hay que reattacharla
    if(partyState._pendingGroupMatch){
      // Tras JSON round-trip, group es una copia — re-linkar al objeto real en partyState.groups
      partyState._pendingGroupMatch.group = partyState.groups[partyState.playerGroupIdx];
      partyState._pendingGroupMatch.afterMatch = function(){ partyShowGroupsScreen(); };
    }
  } else {
    ligaState = saved.ligaState; partyState = null;
  }

  if(saved.inMatch && saved.game){
    const g = saved.game;
    p1 = g.p1; p2 = g.p2;
    currentPlayer = g.currentPlayer;
    turnNumber    = g.turnNumber;
    attackUsed    = g.attackUsed;
    gameMode      = g.gameMode;
    isOnline      = false;
    logEntries    = [];
    _caosActive   = g._caosActive  || false;
    _caosEffect   = g._caosEffect  || null;
    buildGameUI_Standard();
    document.getElementById('logWrap').innerHTML = '';
    renderGame();
    if(_caosActive) _renderCaosBanner();
    showScreen('gameScreen');
    maybeTriggerBot();
  } else {
    if(saved.mode === 'mundial'){
      if(partyState.bracket){
        renderPartyBracket();
        showScreen('partyBracketScreen');
      } else {
        document.getElementById('partyGroupsGrid').innerHTML =
          partyState.groups.map(g => _partyRenderGroupCard(g)).join('');
        const b3el = document.getElementById('partyBest3rdGrid');
        if(b3el) b3el.innerHTML = _partyRenderBest3rd();
        showScreen('partyGroupsScreen');
      }
    } else {
      if(ligaState.phase === 'knockout'){
        // Detectar la ronda actual: la más avanzada que aún no esté completa (algún tie sin winner)
        const _r16done = !ligaState.r16 || ligaState.r16.every(t=>t.winner);
        const _qfdone  = !ligaState.qf  || ligaState.qf.every(t=>t.winner);
        const _sfdone  = !ligaState.sf  || ligaState.sf.every(t=>t.winner);
        const _findone = !ligaState.final || ligaState.final.winner;
        const round = (!_r16done) ? 'r16'
          : (!_qfdone) ? 'qf'
          : (!_sfdone) ? 'sf'
          : 'final';
        _ligaShowBracket(round);
        // Detectar si el jugador está a mitad de eliminatoria (leg1 jugada, falta leg2)
        const _roundTies = round === 'final' ? null : ligaState[round];
        const _playerTie = _roundTies
          ? _roundTies.find(t => t.home && (t.home.isPlayer || (t.away && t.away.isPlayer)))
          : null;
        const _pTieIdx = _roundTies ? _roundTies.indexOf(_playerTie) : -1;
        if(round === 'final'){
          // Final es una sola pierna
          document.getElementById('ligaBracketActions').innerHTML =
            `<button class="btn" style="margin-right:.5rem" onclick="_ligaShowTableFromBracket('final')">📊 Tabla</button>`
            +`<button class="btn" style="margin-right:.5rem" onclick="_ligaShowLog('ligaBracketScreen')">📋 Historial</button>`
            +`<button class="btn btn-primary" onclick="_ligaStartKnockoutRound('final')">Iniciar Gran Final ▶</button>`;
        } else if(_playerTie && _playerTie.played1 && !_playerTie.winner){
          // Leg 1 jugada, falta vuelta
          const _diff = _playerTie.kills1H - _playerTie.kills1A;
          const _aggTxt = _diff > 0 ? `(+${_diff} ventaja)` : _diff < 0 ? `(${_diff} desventaja)` : '(igualados)';
          document.getElementById('ligaBracketActions').innerHTML =
            `<button class="btn" style="margin-right:.5rem" onclick="_ligaShowLog('ligaBracketScreen')">📋 Historial</button>`
            +`<button class="btn btn-primary" onclick="_ligaRunTieLeg('${round}',${_pTieIdx},2)">Vuelta ${_aggTxt} ▶</button>`;
        } else {
          // Ronda entera por iniciar
          document.getElementById('ligaBracketActions').innerHTML =
            `<button class="btn" style="margin-right:.5rem" onclick="_ligaShowTableFromBracket('${round}')">📊 Tabla</button>`
            +`<button class="btn" style="margin-right:.5rem" onclick="_ligaShowLog('ligaBracketScreen')">📋 Historial</button>`
            +`<button class="btn btn-primary" onclick="_ligaStartKnockoutRound('${round}')">Iniciar ${_ligaRoundLabel(round)} ▶</button>`;
        }
      } else {
        _ligaAfterJornada();
      }
    }
  }
}
function _showTourneyResumeModal(saved, onResume, onNew){
  const existing = document.getElementById('_tourneyResumeModal');
  if(existing) existing.remove();
  const mode = saved.mode === 'mundial' ? '🌍 Mundial Nexus' : '🏆 Nexus League';
  const detail = saved.inMatch
    ? 'Había una partida en curso (turno ' + (saved.game.turnNumber||1) + ').'
    : 'El torneo estaba en progreso.';
  const el = document.createElement('div');
  el.id = '_tourneyResumeModal';
  el.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.82);display:flex;align-items:center;justify-content:center;z-index:9999;';
  el.innerHTML = `
    <div style="background:#0d0d1a;border:.5px solid #4a4a7a;border-radius:14px;padding:2rem 1.6rem;max-width:340px;width:90%;text-align:center;position:relative;">
      <button id="_tourneyResumeClose" style="position:absolute;top:.6rem;right:.8rem;background:none;border:none;color:var(--text-muted);font-size:16px;cursor:pointer;line-height:1">✕</button>
      <div style="font-size:22px;margin-bottom:.5rem">⚠️</div>
      <div style="font-family:var(--font-title);font-size:13px;letter-spacing:.1em;color:#c4b0ff;margin-bottom:.5rem">${mode}</div>
      <div style="font-size:13px;color:var(--text-main);margin-bottom:.3rem">Hay un torneo guardado.</div>
      <div style="font-size:11px;color:var(--text-muted);margin-bottom:1.4rem">${detail}</div>
      <div style="display:flex;gap:.8rem;justify-content:center;">
        <button class="btn btn-primary" style="flex:1" id="_tourneyResumeContinue">▶ Continuar</button>
        <button class="btn" style="flex:1;border-color:#f76e6e;color:#f76e6e" id="_tourneyResumeNew">✕ Nuevo torneo</button>
      </div>
    </div>`;
  document.body.appendChild(el);
  document.getElementById('_tourneyResumeContinue').addEventListener('click', function(){
    el.remove(); onResume();
  });
  document.getElementById('_tourneyResumeNew').addEventListener('click', function(){
    el.remove(); onNew();
  });
  document.getElementById('_tourneyResumeClose').addEventListener('click', function(){
    el.remove();
  });
}

var _MUNDIAL_ORDER = ['groups','r32','r16','qf','sf','final','champion'];
var _LIGA_ORDER    = ['liga','playoffs','r16','qf','sf','final','champion'];

function _betterRound(current, candidate, arr){
  var ci = arr.indexOf(current);
  var ni = arr.indexOf(candidate);
  return (ni > ci) ? candidate : (current || candidate);
}

function _trackMatch(opts){
  if(tutGameMode || _tutGameSession) return; // no guardar stats en tutorial
  var s = _loadStats();
  if(!s.bossWins) s.bossWins = {};
  if(!opts.isTournamentOnly){
    if(opts.mode !== 'boss'){
      s.matches++;
      if(opts.won)   s.wins++;
      if(opts.lost)  s.losses++;
      if(opts.drawn) s.draws++;
      var kos = opts.myKOs || 0;
      s.kos += kos;
      if(kos > (s.maxKosMatch||0)) s.maxKosMatch = kos;
      if(opts.won && (opts.mode==='standard'||opts.mode==='hand3')) s.winsStandard++;
      if(opts.won && opts.mode==='ffa') s.winsFFA++;
      if(opts.won && kos >= 8 && (opts.oppKOs||0) === 0) s.wins8to0 = (s.wins8to0||0) + 1;
    }
    if(opts.mode === 'boss'){
      var bk = 'b'+(opts.bossId !== undefined ? opts.bossId : 0);
      if(opts.won) s.bossWins[bk] = (s.bossWins[bk]||0) + 1;
    }
  }
  // ── Calcular monedas ganadas ──
  var _coinsGained = 0;
  if(!opts.isTournamentOnly && opts.won && opts.mode !== 'boss') _coinsGained += 5;
  if(opts.mundialEnd){
    s.mundialPlayed++;
    if(opts.mundialWon){
      s.mundialWins++; s.mundialBest='champion'; _coinsGained += 25;
    } else {
      s.mundialBest = _betterRound(s.mundialBest, opts.mundialBest||'groups', _MUNDIAL_ORDER);
      if(opts.mundialBest === 'final') _coinsGained += 10;
    }
    s.mundialHistory = s.mundialHistory||[];
    s.mundialHistory.push({ ed:s.mundialPlayed, name:opts.champName||'—', won:!!opts.mundialWon, date:_dailyDateStr() });
    _updateDailyProgress('mundialplayed', 1);
  }
  if(opts.ligaEnd){
    s.ligaPlayed++;
    if(opts.ligaWon){
      s.ligaWins++; s.ligaBest='champion'; _coinsGained += 50;
    } else {
      s.ligaBest = _betterRound(s.ligaBest, opts.ligaBest||'liga', _LIGA_ORDER);
      if(opts.ligaBest === 'final') _coinsGained += 25;
    }
    s.ligaHistory = s.ligaHistory||[];
    s.ligaHistory.push({ ed:s.ligaPlayed, name:opts.champName||'—', won:!!opts.ligaWon, date:_dailyDateStr() });
    _updateDailyProgress('ligaplayed', 1);
  }
  if(_coinsGained > 0) s.coins = (s.coins||0) + _coinsGained;

  // ── XP y racha ──
  var _xpGained = 0;
  if(!opts.isTournamentOnly){
    if(opts.won)        _xpGained += opts.mode==='boss' ? 75 : opts.mode==='ffa' ? 40 : 30;
    else if(opts.drawn) _xpGained += 15;
    else if(opts.lost)  _xpGained += 10;
    var _streakMode = opts.mode==='boss' || opts.mode==='quick' || opts.mode==='endless';
    if(!_streakMode){
      if(opts.won){ s.winStreak=(s.winStreak||0)+1; if(s.winStreak>(s.bestWinStreak||0)) s.bestWinStreak=s.winStreak; }
      else if(opts.lost||opts.drawn){ s.winStreak=0; }
    }
  }
  if(opts.mundialEnd){ _xpGained += opts.mundialWon ? 150 : opts.mundialBest==='final' ? 75 : 30; }
  if(opts.ligaEnd)   { _xpGained += opts.ligaWon   ? 200 : opts.ligaBest==='final'    ? 100 : 40; }

  var _levelBefore = _xpToLevel(s.xp||0);
  s.xp = (s.xp||0) + _xpGained;
  var _levelAfter  = _xpToLevel(s.xp);

  _saveStats(s);
  var _newAchCount = _checkAchievements(s);
  if(typeof checkMusicUnlocks === 'function') checkMusicUnlocks();
  if(_coinsGained > 0) _showCoinToast(_coinsGained, _newAchCount * 4200);
  if(_levelAfter > _levelBefore) _showLevelUpPopup(_levelAfter, _levelBefore);

  // ── Misiones diarias ──
  if(!opts.isTournamentOnly){
    if(opts.mode === 'boss'){
      if(opts.won) _updateDailyProgress('boss', 1);
    } else {
      _updateDailyProgress('played', 1);
      if(opts.won) _updateDailyProgress('wins', 1);
      if(opts.myKOs) _updateDailyProgress('kos', opts.myKOs);
      if(opts.mode === 'ffa') _updateDailyProgress('ffa', 1);
      if(opts.won && (opts.mode==='standard'||opts.mode==='hand3'||opts.mode==='espejo'||opts.mode==='caos'))
        _updateDailyProgress('stdwins', 1);
      if(opts.won && opts.mode==='caos')   _updateDailyProgress('caoswin', 1);
      if(opts.won && opts.mode==='espejo') _updateDailyProgress('espejowin', 1);
      if(!_streakMode) _updateDailyProgress('streak', s.winStreak||0);
    }
  }

  renderStats();
}

var ACHIEVEMENTS = [
  // Victorias (7)
  { id:'w1',    icon:'⚔️',  name:'Primera Sangre',      desc:'Gana tu primera partida.' },
  { id:'w10',   icon:'🔥',  name:'En Racha',             desc:'Gana 10 partidas.' },
  { id:'w50',   icon:'💀',  name:'Veterano',             desc:'Gana 50 partidas.' },
  { id:'w100',  icon:'🗡️',  name:'Combatiente',          desc:'Gana 100 partidas.' },
  { id:'w250',  icon:'🛡️',  name:'Guerrero Arcano',      desc:'Gana 250 partidas.' },
  { id:'w500',  icon:'🌟',  name:'Élite',                desc:'Gana 500 partidas.' },
  { id:'w1000', icon:'💎',  name:'Leyenda',              desc:'Gana 1000 partidas.' },
  // KOs (7)
  { id:'k25',    icon:'💥',  name:'Destructor',           desc:'Inflige 25 KOs en total.' },
  { id:'k100',   icon:'☠️',  name:'Exterminador',         desc:'Inflige 100 KOs en total.' },
  { id:'k500',   icon:'🔱',  name:'Aniquilador',          desc:'Inflige 500 KOs en total.' },
  { id:'k1000',  icon:'💣',  name:'Masacre',              desc:'Inflige 1000 KOs en total.' },
  { id:'k2500',  icon:'🌪️',  name:'Carnicero',            desc:'Inflige 2500 KOs en total.' },
  { id:'k5000',  icon:'🌑',  name:'Vacío',                desc:'Inflige 5000 KOs en total.' },
  { id:'k10000', icon:'🔮',  name:'Dios de la Batalla',   desc:'Inflige 10000 KOs en total.' },
  // Especiales
  { id:'draw',          icon:'🤝',  name:'Empate Honroso',       desc:'Termina una partida en empate.',                                                         hidden:true },
  { id:'draw10',        icon:'⚖️',  name:'Equilibrio Eterno',    desc:'Empata 10 partidas.',                                                                    hidden:true },
  { id:'max_ko',        icon:'⚡',  name:'Dominador',            desc:'Gana una partida 8 a 0.',                                                                hidden:true },
  { id:'david_goliath', icon:'🪨',  name:'David vs Goliat',      desc:'Elimina una carta de 9★ con una carta de 1★.',                                           hidden:true },
  { id:'mundial_dejavu',icon:'🔁',  name:'Déjà Vu (Mundial)',    desc:'Vence al mismo país en grupos y en eliminación directa del Mundial.',                     hidden:true },
  { id:'liga_dejavu',   icon:'🔁',  name:'Déjà Vu (Liga)',       desc:'Vence al mismo equipo en la fase de liga y en los Playoffs.',                            hidden:true },
  { id:'mundial_sf',     icon:'🥈',  name:'Semifinalista Mundial',  desc:'Llega a Semis en el Mundial Nexus.' },
  { id:'liga_sf',        icon:'🥈',  name:'Semifinalista de Liga',  desc:'Llega a Semis en la Nexus League.' },
  { id:'mundial_barely', icon:'😅',  name:'Por Poco (Mundial)',     desc:'Clasifica a los brackets del Mundial como el 8.° mejor tercero.',                      hidden:true },
  { id:'liga_barely',    icon:'😅',  name:'Por Poco (Liga)',        desc:'Clasifica a los Playoffs de Liga en el puesto 24.',                                     hidden:true },
  // Jefes (1 por jefe + todos)
  { id:'boss_vor',  icon:'🌀',  name:'Caída de Vorathyn',   desc:'Derrota al Devorador de Planos (Un jugador).' },
  { id:'boss_ser',  icon:'❄️',  name:'Caída de Seraveth',   desc:'Derrota a la Tejedora de Escarcha (Un jugador).' },
  { id:'boss_mor',  icon:'🪨',  name:'Caída de Morvak',     desc:'Derrota al Coloso Eterno (Un jugador).' },
  { id:'boss_all',  icon:'👁',  name:'Conquistador de Jefes', desc:'Derrota a los 3 jefes al menos una vez (Un jugador).' },
  // FFA (3)
  { id:'ffa1',   icon:'👑',  name:'Rey del Caos',         desc:'Gana tu primer FFA vs bots.' },
  { id:'ffa10',  icon:'🔰',  name:'Caos Controlado',      desc:'Gana 10 FFA vs bots.' },
  { id:'ffa50',  icon:'🎯',  name:'Maestro del Caos',     desc:'Gana 50 FFA vs bots.' },
  // Mundial ganado (5)
  { id:'mw1',    icon:'🏆',  name:'Campeón del Mundo',    desc:'Gana el Mundial Nexus.' },
  { id:'mw3',    icon:'🌍',  name:'Tricampeón Mundial',   desc:'Gana 3 Mundiales Nexus.' },
  { id:'mw5',    icon:'🎖️',  name:'Dinastía Mundial',     desc:'Gana 5 Mundiales Nexus.' },
  { id:'mw10',   icon:'🌐',  name:'Imperio Nexus',        desc:'Gana 10 Mundiales Nexus.' },
  { id:'mw50',   icon:'🔱',  name:'Dios del Mundial',     desc:'Gana 50 Mundiales Nexus.' },
  // Liga ganada (5)
  { id:'liga_perfect', icon:'💠', name:'Invicto de Liga', desc:'Gana los 8 partidos de fase de grupos y todos los playoffs: campeona sin perder.', hidden:true },
  { id:'lw1',    icon:'🥇',  name:'Rey de la Liga',       desc:'Gana la Nexus League.' },
  { id:'lw3',    icon:'🎪',  name:'Tricampeón de Liga',   desc:'Gana 3 Ligas Arcana.' },
  { id:'lw5',    icon:'🏰',  name:'Dinastía de Liga',     desc:'Gana 5 Ligas Arcana.' },
  { id:'lw10',   icon:'🌠',  name:'Imperio Arcano',       desc:'Gana 10 Ligas Arcana.' },
  { id:'lw50',   icon:'♾️',  name:'Eterno de la Liga',    desc:'Gana 50 Ligas Arcana.' },
  // Supervivencia Endless (5)
  { id:'el10',  icon:'🏴',  name:'Primer Bastión',       desc:'Llega a la oleada 10 en Supervivencia.' },
  { id:'el15',  icon:'⚔️',  name:'Sin Rendirse',         desc:'Llega a la oleada 15 en Supervivencia.' },
  { id:'el20',  icon:'🔥',  name:'Corriente de Batalla', desc:'Llega a la oleada 20 en Supervivencia.' },
  { id:'el25',  icon:'💀',  name:'Imparable',            desc:'Llega a la oleada 25 en Supervivencia.' },
  { id:'el30',  icon:'♾️',  name:'Endless True',         desc:'Llega a la oleada 30 en Supervivencia.' },
  // Especiales adicionales
  { id:'last_one_standing', icon:'🐱', name:'Último en Pie', desc:'Gana con tu última carta viva siendo Normal (1★ o 2★).', hidden:true },
  { id:'crystallyzer',      icon:'💎', name:'Crystallyzer',  desc:'Ingresa el código del creador en la tienda.',            hidden:true },
  // Maestro
  { id:'all_ach', icon:'🌌', name:'Nexus Completo', desc:'Desbloquea todos los demás logros.', hidden:true },
];

function _checkAchievements(s){
  var unlocked = _loadAch();
  var toUnlock = [];
  var bw = s.bossWins || {};
  function check(id, condition){
    if(condition && unlocked.indexOf(id)===-1){ unlocked.push(id); toUnlock.push(id); }
  }
  // Victorias
  check('w1',    s.wins >= 1);
  check('w10',   s.wins >= 10);
  check('w50',   s.wins >= 50);
  check('w100',  s.wins >= 100);
  check('w250',  s.wins >= 250);
  check('w500',  s.wins >= 500);
  check('w1000', s.wins >= 1000);
  // KOs
  check('k25',    s.kos >= 25);
  check('k100',   s.kos >= 100);
  check('k500',   s.kos >= 500);
  check('k1000',  s.kos >= 1000);
  check('k2500',  s.kos >= 2500);
  check('k5000',  s.kos >= 5000);
  check('k10000', s.kos >= 10000);
  // Especiales
  check('draw',           s.draws >= 1);
  check('draw10',         s.draws >= 10);
  check('max_ko',         (s.wins8to0||0) >= 1);
  check('david_goliath',  (s.davidVsGoliath||0) >= 1);
  check('mundial_dejavu', (s.mundialDejaVu||0) >= 1);
  check('liga_dejavu',    (s.ligaDejaVu||0) >= 1);
  check('mundial_sf',     _MUNDIAL_ORDER.indexOf(s.mundialBest) >= _MUNDIAL_ORDER.indexOf('sf'));
  check('liga_sf',        _LIGA_ORDER.indexOf(s.ligaBest)    >= _LIGA_ORDER.indexOf('sf'));
  check('mundial_barely', (s.mundialBarely||0) >= 1);
  check('liga_barely',    (s.ligaBarely||0)    >= 1);
  // Jefes (id:0=Vorathyn, id:-1=Seraveth, id:-2=Morvak)
  check('boss_vor', (bw['b0']  ||0) >= 1);
  check('boss_ser', (bw['b-1'] ||0) >= 1);
  check('boss_mor', (bw['b-2'] ||0) >= 1);
  check('boss_all', (bw['b0']||0)>=1 && (bw['b-1']||0)>=1 && (bw['b-2']||0)>=1);
  // FFA
  check('ffa1',  s.winsFFA >= 1);
  check('ffa10', s.winsFFA >= 10);
  check('ffa50', s.winsFFA >= 50);
  // Mundial ganado
  check('mw1',  s.mundialWins >= 1);
  check('mw3',  s.mundialWins >= 3);
  check('mw5',  s.mundialWins >= 5);
  check('mw10', s.mundialWins >= 10);
  check('mw50', s.mundialWins >= 50);
  // Liga ganada
  check('liga_perfect', (s.ligaPerfectGroups||0) >= 1);
  check('lw1',  s.ligaWins >= 1);
  check('lw3',  s.ligaWins >= 3);
  check('lw5',  s.ligaWins >= 5);
  check('lw10', s.ligaWins >= 10);
  check('lw50', s.ligaWins >= 50);
  // Supervivencia Endless
  check('el10', (s.endlessBest||0) >= 10);
  check('el15', (s.endlessBest||0) >= 15);
  check('el20', (s.endlessBest||0) >= 20);
  check('el25', (s.endlessBest||0) >= 25);
  check('el30', (s.endlessBest||0) >= 30);
  // Especiales adicionales
  check('crystallyzer',      (s.crystallyzer||0) >= 1);
  check('last_one_standing', (s.lastOneStanding||0) >= 1);
  // Maestro: todos los demás logros desbloqueados
  check('all_ach', unlocked.filter(id=>id!=='all_ach').length >= ACHIEVEMENTS.length - 1);

  if(toUnlock.length){
    _saveAch(unlocked);
    // Desbloquear cartas asociadas
    var _BOSS_WIKI_UNLOCK = {'boss_vor':100, 'boss_ser':200, 'boss_mor':300};
    toUnlock.forEach(function(achId){
      var cardId = _ACH_CARD_MAP[achId];
      if(cardId) _unlockCard(cardId);
      var bossWikiId = _BOSS_WIKI_UNLOCK[achId];
      if(bossWikiId) _unlockCard(bossWikiId);
    });
    // Mostrar toasts encadenados
    (function showNext(i){
      if(i>=toUnlock.length) return;
      var achId = toUnlock[i];
      _showAchToast(achId);
      var cardId = _ACH_CARD_MAP[achId];
      if(cardId) _showCardUnlockToast(cardId, 1800); // aparece mientras el logro está visible
      setTimeout(function(){ showNext(i+1); }, 4200);
    })(0);
  }
  return toUnlock.length; // cuántos logros se desbloquearon ahora
}

var _coinToastTimer = null;
function _showCoinToast(amount, delayMs){
  _playSfx(_sfxCompra);
  setTimeout(function(){
    var toast = document.getElementById('coin-toast');
    if(!toast) return;
    document.getElementById('coin-toast-amount').textContent = '+'+amount;
    toast.style.top = '1rem';
    clearTimeout(_coinToastTimer);
    _coinToastTimer = setTimeout(function(){ toast.style.top='-70px'; }, 3000);
  }, delayMs||0);
}

var _RARITY_COLORS = {
  'Normal':  '#a0a8c0',
  'Raro':    '#5b9bd5',
  'Épico':   '#b06adf',
  'Mítico':  '#f08030',
  'Especial':'#c9a84c',
};

var _cardToastTimer = null;
function _showCardUnlockToast(cardId, delayMs){
  setTimeout(function(){
    var card = CARD_POOL.find(function(c){ return c.id === cardId; });
    if(!card) return;
    var toast = document.getElementById('card-unlock-toast');
    if(!toast) return;
    var color = _RARITY_COLORS[card.rarity] || '#c9a84c';
    var stars = '★'.repeat(card.stars);
    document.getElementById('cut-card-name').textContent = card.name;
    var starsEl = document.getElementById('cut-card-stars');
    starsEl.textContent = stars;
    starsEl.style.color = color;
    toast.style.borderColor = color + '88';
    toast.style.top = '5.8rem';
    clearTimeout(_cardToastTimer);
    _cardToastTimer = setTimeout(function(){ toast.style.top = '-90px'; }, 3200);
  }, delayMs || 0);
}

var _achToastTimer = null;
function _showAchToast(id){
  var ach = null;
  for(var i=0;i<ACHIEVEMENTS.length;i++){ if(ACHIEVEMENTS[i].id===id){ ach=ACHIEVEMENTS[i]; break; } }
  if(!ach) return;
  var toast = document.getElementById('ach-toast');
  if(!toast) return;
  document.getElementById('ach-toast-icon').textContent = ach.icon;
  document.getElementById('ach-toast-name').textContent = ach.name;
  toast.style.top = '1rem';
  clearTimeout(_achToastTimer);
  _achToastTimer = setTimeout(function(){ toast.style.top='-90px'; }, 3600);
}

function openProfileScreen(){
  showScreen('profileScreen');
  renderProfile();
}

function renderProfile(){
  var s   = _loadStats();
  var name = _loadP1Name() || 'Jugador';
  var lvl  = _xpToLevel(s.xp||0);
  var xpIn = _xpInLevel(s.xp||0);
  var rank = _levelToRank(lvl);
  var wr   = s.matches>0 ? Math.round(s.wins/s.matches*100) : 0;

  // Avatar cosmético
  (function(){
    var c = _loadCosmetics();
    var av = _COSM_AVATARS[c.avatar]||_COSM_AVATARS[0];
    var fr = _COSM_FRAMES[c.frame]||_COSM_FRAMES[0];
    var bg = _COSM_AVBGS[c.avbg]||_COSM_AVBGS[0];
    var paEl = document.getElementById('profileAvatar');
    if(paEl){
      paEl.style.background = bg.color;
      var img = paEl.querySelector('img');
      if(!img){ img = document.createElement('img'); paEl.textContent=''; paEl.appendChild(img); }
      img.src=av.src; img.alt=av.name;
      img.style.cssText='width:100%;height:100%;object-fit:contain;image-rendering:pixelated;border-radius:50%;position:relative;z-index:1';
      var frEl = paEl.querySelector('.profile-avatar-frame');
      if(!frEl){ frEl = document.createElement('div'); paEl.appendChild(frEl); }
      frEl.className='profile-avatar-frame'+(fr.cls?' '+fr.cls:'');
    }
    var ti = _COSM_TITLES[c.title]||_COSM_TITLES[0];
    var rankEl = document.getElementById('profileRank');
    var _TITLE_CLASS = {'Aprendiz':'rank-aprendiz','Combatiente':'rank-combatiente','Guerrero':'rank-guerrero',
      'Veterano':'rank-veterano','Experto':'rank-experto','Élite':'rank-elite','Maestro':'rank-maestro',
      'Gran Maestro':'rank-gran-maestro','Leyenda':'rank-leyenda','Nexus Master':'rank-nexus-master'};
    var rankClass = _TITLE_CLASS[ti.name]||'rank-aprendiz';
    if(rankEl){ rankEl.textContent=ti.name.toUpperCase(); rankEl.className='profile-rank '+rankClass; rankEl.style.color=''; }
  })();
  document.getElementById('profileNameDisplay').textContent   = name;
  document.getElementById('profileLvl').textContent           = lvl;
  document.getElementById('profileXPLabel').textContent       = xpIn + ' / ' + _XP_PER_LEVEL + ' XP';
  document.getElementById('profileXPPct').textContent         = (xpIn/_XP_PER_LEVEL*100).toFixed(0)+'%';
  document.getElementById('profileXPBar').style.width         = (xpIn/_XP_PER_LEVEL*100).toFixed(1)+'%';
  document.getElementById('profileStreak').textContent        = s.winStreak||0;
  document.getElementById('profileBestStreak').textContent    = s.bestWinStreak||0;
  var pcEl = document.getElementById('profileCoins'); if(pcEl) pcEl.textContent = s.coins||0;
  var scEl = document.getElementById('st-coins'); if(scEl) scEl.textContent = s.coins||0;
  if(typeof _renderFragmentBadges === 'function') _renderFragmentBadges();

  var usage = s.cardUsage||{};
  var favKey = Object.keys(usage).sort((a,b)=>usage[b]-usage[a])[0];
  var favEl  = document.getElementById('profileFavCard');
  if(favKey && usage[favKey]>0){
    var favId   = parseInt(favKey.slice(1));
    var favCard = (typeof CARD_POOL!=='undefined'&&CARD_POOL) ? CARD_POOL.find(c=>c.id===favId) : null;
    document.getElementById('profileFavName').textContent = favCard ? favCard.name : '#'+favId;
    document.getElementById('profileFavSub').textContent  = 'Usada '+usage[favKey]+' veces como carta activa';
    favEl.style.display = '';
  } else {
    favEl.style.display = 'none';
  }

  var bossWins = s.bossWins||{};
  var bossGrid = document.getElementById('profileBossesGrid');
  if(bossGrid){
    bossGrid.innerHTML = BOSSES.map(function(b){
      var won = (bossWins['b'+b.id]||0) > 0;
      return '<div class="profile-boss-cell '+(won?'defeated':'pending')+'">'
        +'<div class="profile-boss-name">'+b.name+'</div>'
        +'<div class="profile-boss-status">'+(won?'✓ DERROTADO':'PENDIENTE')+'</div>'
        +'</div>';
    }).join('');
  }
}

function _profileStartEdit(){
  var inp = document.getElementById('profileNameInput');
  var disp = document.getElementById('profileNameDisplay');
  inp.value = _loadP1Name() || '';
  inp.style.display = 'block';
  disp.style.display = 'none';
  document.getElementById('profileEditBtn').style.display = 'none';
  inp.focus();
}

function _profileSaveName(){
  var inp  = document.getElementById('profileNameInput');
  var name = inp.value.trim() || 'Jugador';
  _saveP1Name(name);
  inp.style.display = 'none';
  document.getElementById('profileNameDisplay').style.display = '';
  document.getElementById('profileEditBtn').style.display = '';
  renderProfile();
}

function _showLevelUpPopup(newLevel, oldLevel){
  var overlay = document.getElementById('levelUpOverlay');
  if(!overlay) return;
  var s = _loadStats();
  var rankBefore = _levelToRank(oldLevel);
  var rankAfter  = _levelToRank(newLevel);
  document.getElementById('levelUpNum').textContent  = newLevel;
  document.getElementById('levelUpXP').textContent   = '+XP obtenida en la última partida';
  var rankEl = document.getElementById('levelUpRank');
  if(rankAfter !== rankBefore){
    rankEl.textContent = '¡Nuevo rango: ' + rankAfter.toUpperCase() + '!';
    rankEl.style.color = '#a78bfa';
  } else {
    rankEl.textContent = rankAfter.toUpperCase();
    rankEl.style.color = '';
  }
  overlay.style.display = 'flex';
}

