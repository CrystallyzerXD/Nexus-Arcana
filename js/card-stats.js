/* ═══════════════════════════════════════════════
   ESTADÍSTICAS POR CARTA & MAESTRÍA
   Clave: nx_card_stats_v1
   Estructura: { [cardId]: { wins, losses, kos, matchesPlayed } }
═══════════════════════════════════════════════ */

var _CARD_STATS_KEY = 'nx_card_stats_v1';

function _loadCardStats(){
  try{ return JSON.parse(localStorage.getItem(_CARD_STATS_KEY)||'{}'); }
  catch(e){ return {}; }
}
function _saveCardStats(cs){
  try{ localStorage.setItem(_CARD_STATS_KEY, JSON.stringify(cs)); }catch(e){}
}

// Devuelve el objeto de stats de una carta (inicializado si no existe)
function _getCardStat(cs, id){
  var k = String(id);
  if(!cs[k]) cs[k] = { wins:0, losses:0, kos:0, matchesPlayed:0 };
  return cs[k];
}

// ── Maestría ──────────────────────────────────
// XP por nivel: 1→2=100, 2→3=150, 3→4=200, … (aumenta 50 por nivel)
// Fórmula: XP_acumulada(n) = (n-1)*(100 + 25*(n-2))  para n>=2
function _masteryXPForLevel(n){
  if(n <= 1) return 0;
  return (n - 1) * (100 + 25 * (n - 2));
}

// XP necesaria para ir del nivel n al n+1
function _masteryXPToNext(n){
  return _masteryXPForLevel(n + 1) - _masteryXPForLevel(n);
}

var _MASTERY_MAX_LEVEL = 10;

// Nivel de maestría a partir de XP total
function _masteryLevel(xp){
  xp = xp || 0;
  var lvl = 1;
  while(lvl < _MASTERY_MAX_LEVEL && _masteryXPForLevel(lvl + 1) <= xp) lvl++;
  return lvl;
}

// XP dentro del nivel actual (para la barra de progreso)
function _masteryXPInLevel(xp){
  xp = xp || 0;
  var lvl = _masteryLevel(xp);
  return xp - _masteryXPForLevel(lvl);
}

// Calcula XP total de maestría de una carta a partir de sus stats
function _masteryXP(stat){
  return (stat.matchesPlayed || 0) * 5
       + (stat.wins          || 0) * 10
       + (stat.kos           || 0) * 2;
}

// ── Actualizar stats al terminar una partida ──
// deckIds: array de IDs de cartas del mazo del jugador
// won: boolean, lost: boolean, cardKOs: { [cardId]: count }
function _updateCardStats(deckIds, won, lost, cardKOs){
  if(!deckIds || !deckIds.length) return;
  var cs = _loadCardStats();
  cardKOs = cardKOs || {};
  deckIds.forEach(function(id){
    var st = _getCardStat(cs, id);
    st.matchesPlayed++;
    if(won)  st.wins++;
    if(lost) st.losses++;
    var kk = String(id);
    if(cardKOs[kk]) st.kos += cardKOs[kk];
  });
  _saveCardStats(cs);
}
