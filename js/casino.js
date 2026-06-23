// ── Blackjack Arcano ──
var _bjBet = 1;
var _bjPlayerCards = [];
var _bjDealerCards = [];
var _bjPlaying = false;

function openBlackjack(){
  document.getElementById('casino-lobby').style.display = 'none';
  document.getElementById('casino-duelo').style.display = 'none';
  document.getElementById('casino-bj').style.display = 'flex';
  _bjBet = 1;
  _bjPlaying = false;
  document.getElementById('bj-result').textContent = '';
  document.getElementById('bj-result').className = 'casino-result';
  document.getElementById('bj-play-actions').style.display = 'none';
  document.getElementById('bj-dealer-total').textContent = '?';
  document.getElementById('bj-player-total').textContent = '?';
  // Crupier: una carta boca abajo
  var dc = document.getElementById('bj-dealer-cards');
  dc.innerHTML = '';
  var backWrap = document.createElement('div'); backWrap.className = 'bj-card-wrap';
  var backCv = document.createElement('canvas'); backCv.width=52; backCv.height=68; backCv.className='bj-card';
  _dueloDrawBack(backCv);
  var backLbl = document.createElement('div'); backLbl.className='bj-card-stars'; backLbl.textContent='?';
  backWrap.appendChild(backCv); backWrap.appendChild(backLbl);
  dc.appendChild(backWrap);
  // Jugador: placeholder con ?
  var pc = document.getElementById('bj-player-cards');
  pc.innerHTML = '';
  var phWrap = document.createElement('div'); phWrap.className = 'bj-card-wrap';
  var phCv = document.createElement('canvas'); phCv.width=52; phCv.height=68; phCv.className='bj-card';
  var phCtx = phCv.getContext('2d');
  phCtx.fillStyle='#12102a'; _wikiRoundRectPath(phCtx,0,0,52,68,7); phCtx.fill();
  phCtx.strokeStyle='rgba(123,95,212,.3)'; phCtx.lineWidth=1; _wikiRoundRectPath(phCtx,0,0,52,68,7); phCtx.stroke();
  phCtx.font='bold 20px serif'; phCtx.fillStyle='rgba(123,95,212,.4)'; phCtx.textAlign='center'; phCtx.textBaseline='middle'; phCtx.fillText('?',26,34);
  var phLbl = document.createElement('div'); phLbl.className='bj-card-stars'; phLbl.textContent='?';
  phWrap.appendChild(phCv); phWrap.appendChild(phLbl);
  pc.appendChild(phWrap);
  var wrap = document.getElementById('bj-bet-actions');
  wrap.innerHTML = '';
  wrap.style.display = 'flex';
  var dealBtn = document.createElement('button');
  dealBtn.className = 'btn btn-primary';
  dealBtn.style.fontSize = '12px';
  dealBtn.textContent = 'Repartir ▶';
  dealBtn.onclick = bjDeal;
  wrap.appendChild(dealBtn);
  _bjRefreshCoins();
  _casinoBetRow('bj-bet-row', '_bjBet');
  document.getElementById('casino-bj').style.display = 'flex';
}

function _bjRefreshCoins(){
  document.getElementById('bj-coins').textContent = (_loadStats().coins||0);
}

function _bjTotal(cards){ return cards.reduce(function(s,c){ return s + c.stars; }, 0); }

function _bjCardWrap(card, hidden, animate){
  var wrap = document.createElement('div');
  wrap.className = 'bj-card-wrap' + (animate ? ' bj-card-anim' : '');
  var cv = document.createElement('canvas');
  cv.width = 52; cv.height = 68;
  cv.className = 'bj-card';
  if(hidden){ _dueloDrawBack(cv); }
  else { _dueloDrawMini(cv, card); }
  wrap.appendChild(cv);
  var lbl = document.createElement('div');
  lbl.className = 'bj-card-stars';
  lbl.textContent = hidden ? '?' : card.stars+'★';
  wrap.appendChild(lbl);
  return wrap;
}

function _bjRenderHands(hideDealer){
  var pc = document.getElementById('bj-player-cards');
  var dc = document.getElementById('bj-dealer-cards');
  pc.innerHTML = ''; dc.innerHTML = '';
  _bjPlayerCards.forEach(function(c){ pc.appendChild(_bjCardWrap(c, false, false)); });
  _bjDealerCards.forEach(function(c,i){ dc.appendChild(_bjCardWrap(c, hideDealer && i===1, false)); });
  document.getElementById('bj-player-total').textContent = _bjTotal(_bjPlayerCards);
  document.getElementById('bj-dealer-total').textContent = hideDealer ? '?' : _bjTotal(_bjDealerCards);
}

function _bjAnimateDealerReveal(callback){
  var dc = document.getElementById('bj-dealer-cards');
  dc.innerHTML = '';
  // Primero la carta visible (ya estaba)
  var first = _bjCardWrap(_bjDealerCards[0], false, true);
  dc.appendChild(first);
  document.getElementById('bj-dealer-total').textContent = '?';
  var delay = 350;
  _bjDealerCards.forEach(function(c, i){
    if(i === 0) return; // ya añadida
    setTimeout(function(){
      var wrap = _bjCardWrap(c, false, true);
      dc.appendChild(wrap);
      document.getElementById('bj-dealer-total').textContent = _bjTotal(_bjDealerCards.slice(0, i+1));
      if(i === _bjDealerCards.length - 1 && callback) setTimeout(callback, 300);
    }, delay * i);
  });
}

function _bjDrawCard(){
  var pool = CARD_POOL || [];
  return pool[Math.floor(Math.random()*pool.length)] || { stars:1, name:'?', hp:1 };
}

function bjDeal(){
  var s = _loadStats();
  if((s.coins||0) < _bjBet){ document.getElementById('bj-result').textContent='No tienes suficientes monedas.'; return; }
  s.coins = (s.coins||0) - _bjBet;
  _saveStats(s);
  playSfxCarta();
  _bjPlayerCards = [_bjDrawCard(), _bjDrawCard()];
  _bjDealerCards = [_bjDrawCard(), _bjDrawCard()];
  _bjPlaying = true;
  document.getElementById('bj-result').textContent = '';
  document.getElementById('bj-result').className = 'casino-result';
  document.querySelectorAll('#bj-bet-row .casino-bet-btn').forEach(function(b){ b.disabled = true; });
  document.getElementById('bj-bet-actions').style.display = 'none';
  document.getElementById('bj-play-actions').style.display = 'flex';
  document.getElementById('bj-dealer-area').style.display = '';
  document.getElementById('bj-player-area').style.display = '';
  _bjRefreshCoins();
  _bjRenderHands(true);
  if(_bjTotal(_bjPlayerCards) === 21){ bjStand(); }
}

function bjHit(){
  if(!_bjPlaying) return;
  playSfxCarta();
  _bjPlayerCards.push(_bjDrawCard());
  _bjRenderHands(true);
  if(_bjTotal(_bjPlayerCards) > 21){ _bjEndGame('bust'); }
}

function bjStand(){
  if(!_bjPlaying) return;
  _bjPlaying = false;
  document.getElementById('bj-play-actions').style.display = 'none';
  // Crupier juega hasta 17+
  while(_bjTotal(_bjDealerCards) < 17){ _bjDealerCards.push(_bjDrawCard()); }
  _bjAnimateDealerReveal(function(){
    var pt = _bjTotal(_bjPlayerCards), dt = _bjTotal(_bjDealerCards);
    if(dt > 21)       _bjEndGame('dealer-bust');
    else if(pt > dt)  _bjEndGame('win');
    else if(pt === dt)_bjEndGame('draw');
    else              _bjEndGame('lose');
  });
}

function _bjEndGame(outcome){
  _bjPlaying = false;
  document.getElementById('bj-play-actions').style.display = 'none';
  var resEl = document.getElementById('bj-result');
  var s = _loadStats();
  s.casinoPlayedBJ = (s.casinoPlayedBJ||0)+1; _saveStats(s); s = _loadStats();
  if(outcome==='bust'){
    resEl.textContent = '¡Te pasaste! Perdiste 🪙'+_bjBet;
    resEl.className = 'casino-result lose';
    _updateDailyProgress('casinoplayed', 1);
  } else if(outcome==='dealer-bust' || outcome==='win'){
    s.coins = (s.coins||0) + _bjBet*2;
    _saveStats(s);
    resEl.textContent = '¡Ganaste! +🪙'+_bjBet;
    resEl.className = 'casino-result win';
    _showCoinToast(_bjBet, 0);
    var _ssBJ=_loadStats(); _ssBJ.casinoWinsBJ=(_ssBJ.casinoWinsBJ||0)+1; _saveStats(_ssBJ);
    _updateDailyProgress('bjwin', 1);
    _updateDailyProgress('casinowin', 1);
    _updateDailyProgress('casinoplayed', 1);
  } else if(outcome==='draw'){
    s.coins = (s.coins||0) + _bjBet;
    _saveStats(s);
    resEl.textContent = 'Empate — se devuelve la apuesta.';
    resEl.className = 'casino-result draw';
    _updateDailyProgress('casinoplayed', 1);
  } else {
    resEl.textContent = 'El crupier gana. Perdiste 🪙'+_bjBet;
    resEl.className = 'casino-result lose';
    _updateDailyProgress('casinoplayed', 1);
  }
  _bjRefreshCoins();
  // Mostrar botón para jugar de nuevo
  var btn = document.createElement('button');
  btn.className = 'btn btn-primary';
  btn.style.fontSize = '12px';
  btn.style.marginTop = '.3rem';
  btn.textContent = 'Jugar de nuevo';
  btn.onclick = openBlackjack;
  var wrap = document.getElementById('bj-bet-actions');
  wrap.innerHTML = '';
  wrap.appendChild(btn);
  wrap.style.display = 'flex';
}

// ── Duelo de Cartas ──
var _dueloBet = 1;
var _dueloLeftCard = null;
var _dueloRightCard = null;
var _dueloChoice = null;

function openDuelo(){
  document.getElementById('casino-lobby').style.display = 'none';
  document.getElementById('casino-bj').style.display = 'none';
  document.getElementById('casino-duelo').style.display = 'flex';
  _dueloBet = 1;
  _dueloChoice = null;
  document.getElementById('duelo-result').textContent = '';
  document.getElementById('duelo-result').className = 'casino-result';
  document.getElementById('duelo-confirm-btn').style.display = '';
  document.getElementById('duelo-confirm-btn').disabled = false;
  document.getElementById('duelo-next-btn').style.display = 'none';
  document.getElementById('duelo-coins').textContent = (_loadStats().coins||0);
  _casinoBetRow('duelo-bet-row', '_dueloBet');
  _dueloResetCards();
}

function _dueloDrawBack(canvas){
  var ctx = canvas.getContext('2d');
  var W = canvas.width, H = canvas.height;
  ctx.clearRect(0,0,W,H);
  var img = new Image();
  img.onload = function(){
    ctx.save();
    _wikiRoundRectPath(ctx,0,0,W,H,8);
    ctx.clip();
    ctx.drawImage(img,0,0,W,H);
    ctx.restore();
  };
  img.onerror = function(){
    ctx.fillStyle='#1a1235';
    _wikiRoundRectPath(ctx,0,0,W,H,8); ctx.fill();
    ctx.fillStyle='rgba(123,95,212,.3)';
    ctx.font='bold 22px serif'; ctx.textAlign='center'; ctx.textBaseline='middle';
    ctx.fillText('?',W/2,H/2);
  };
  img.src = CARD_BACK;
}

function _wikiRoundRectPath(ctx,x,y,w,h,r){
  ctx.beginPath();
  ctx.moveTo(x+r,y);
  ctx.lineTo(x+w-r,y); ctx.quadraticCurveTo(x+w,y,x+w,y+r);
  ctx.lineTo(x+w,y+h-r); ctx.quadraticCurveTo(x+w,y+h,x+w-r,y+h);
  ctx.lineTo(x+r,y+h); ctx.quadraticCurveTo(x,y+h,x,y+h-r);
  ctx.lineTo(x,y+r); ctx.quadraticCurveTo(x,y,x+r,y);
  ctx.closePath();
}

function _dueloDrawMini(canvas, card){
  // Dibuja directamente al canvas destino escalado, respetando el flujo async de imágenes
  var W = canvas.width, H = canvas.height;
  canvas.width = W; canvas.height = H;
  var ctx = canvas.getContext('2d');
  var scaleX = W / 520, scaleY = H / 760;
  var r = _wikiRarityData(card.stars||1);
  var isLeg = (card.stars||1) === 10;

  function _draw(cardImg){
    ctx.clearRect(0,0,W,H);
    ctx.save(); ctx.scale(scaleX, scaleY);
    var WW=520, HH=760;
    ctx.fillStyle=r.bg;
    _wikiRoundRect(ctx,0,0,WW,HH,28); ctx.fill();
    ctx.strokeStyle=r.border; ctx.lineWidth=isLeg?6:4;
    _wikiRoundRect(ctx,5,5,WW-10,HH-10,24); ctx.stroke();
    ctx.strokeStyle=r.border+'44'; ctx.lineWidth=1;
    _wikiRoundRect(ctx,13,13,WW-26,HH-26,20); ctx.stroke();
    // Header
    ctx.fillStyle=r.frame+'cc';
    ctx.beginPath(); ctx.moveTo(33,13); ctx.lineTo(WW-33,13);
    ctx.quadraticCurveTo(WW-13,13,WW-13,33); ctx.lineTo(WW-13,70); ctx.lineTo(13,70);
    ctx.lineTo(13,33); ctx.quadraticCurveTo(13,13,33,13); ctx.closePath(); ctx.fill();
    ctx.font="bold 26px 'Cinzel',serif"; ctx.fillStyle='#f0e8c8'; ctx.textAlign='left';
    ctx.fillText(card.name,28,52);
    ctx.font="bold 20px 'Cinzel',serif"; ctx.fillStyle=r.border; ctx.textAlign='right';
    ctx.fillText(card.hp+' hp',WW-26,52);
    // Imagen
    var imgY=72, imgH=280;
    if(cardImg){
      var iw=cardImg.naturalWidth, ih=cardImg.naturalHeight;
      var scale=Math.max((WW-26)/iw, imgH/ih);
      var dw=iw*scale, dh=ih*scale;
      var dx=13+((WW-26)-dw)/2, dy=imgY+(imgH-dh)/2;
      ctx.save(); _wikiRoundRect(ctx,13,imgY,WW-26,imgH,0); ctx.clip();
      ctx.drawImage(cardImg,dx,dy,dw,dh); ctx.restore();
      ctx.fillStyle='rgba(0,0,0,.22)'; _wikiRoundRect(ctx,13,imgY,WW-26,imgH,0); ctx.fill();
    } else {
      _wikiDrawImgPlaceholder(ctx,WW,imgY,imgH,r);
    }
    _wikiDrawCardBottom(ctx,WW,HH,card,r,isLeg,imgY,imgH);
    ctx.restore();
  }

  if(card.image){
    var img = new Image();
    img.onload = function(){ _draw(img); };
    img.onerror = function(){ _draw(null); };
    img.src = card.image;
  } else {
    _draw(null);
  }
}

function _dueloResetCards(){
  var pool = CARD_POOL || [];
  var shuffled = pool.slice().sort(function(){ return Math.random()-.5; });
  _dueloLeftCard  = shuffled[0] || { name:'?', stars:1 };
  _dueloRightCard = shuffled[1] || { name:'?', stars:2 };
  _dueloChoice = null;

  var left  = document.getElementById('duelo-left');
  var right = document.getElementById('duelo-right');
  left.className  = 'duelo-card-face selectable';
  right.className = 'duelo-card-face selectable';
  document.getElementById('duelo-tie-btn').className = 'duelo-tie-btn';
  document.getElementById('duelo-left-name').style.display  = 'none';
  document.getElementById('duelo-right-name').style.display = 'none';
  _dueloDrawBack(left);
  _dueloDrawBack(right);
}

function dueloSelect(side){
  var res = document.getElementById('duelo-result');
  if(document.getElementById('duelo-next-btn').style.display !== 'none') return; // ya se resolvió
  res.textContent = ''; res.className = 'casino-result';
  _dueloChoice = side;
  document.getElementById('duelo-left').className  = 'duelo-card-face selectable' + (side==='left' ?' selected':'');
  document.getElementById('duelo-right').className = 'duelo-card-face selectable' + (side==='right'?' selected':'');
  document.getElementById('duelo-tie-btn').className = 'duelo-tie-btn' + (side==='tie'?' selected':'');
  _dueloUpdateConfirm();
}

function _dueloUpdateConfirm(){}

function dueloConfirm(){
  if(!_dueloChoice){
    var r = document.getElementById('duelo-result');
    r.textContent = 'Elige una carta o "Empate" antes de confirmar.';
    r.className = 'casino-result draw';
    return;
  }
  var s = _loadStats();
  if((s.coins||0) < _dueloBet){ document.getElementById('duelo-result').textContent='No tienes suficientes monedas.'; return; }
  s.coins = (s.coins||0) - _dueloBet;
  _saveStats(s);
  document.querySelectorAll('#duelo-bet-row .casino-bet-btn').forEach(function(b){ b.disabled = true; });

  // Revelar cartas
  playSfxCarta();
  var lEl = document.getElementById('duelo-left');
  var rEl = document.getElementById('duelo-right');
  lEl.className = 'duelo-card-face revealed' + (_dueloChoice==='left'?' selected':'');
  rEl.className = 'duelo-card-face revealed' + (_dueloChoice==='right'?' selected':'');
  _dueloDrawMini(lEl, _dueloLeftCard);
  _dueloDrawMini(rEl, _dueloRightCard);
  document.getElementById('duelo-left-name').textContent  = _dueloLeftCard.name  + ' · ' + _dueloLeftCard.stars  + '★';
  document.getElementById('duelo-right-name').textContent = _dueloRightCard.name + ' · ' + _dueloRightCard.stars + '★';
  document.getElementById('duelo-left-name').style.display  = '';
  document.getElementById('duelo-right-name').style.display = '';

  var ls = _dueloLeftCard.stars, rs = _dueloRightCard.stars;
  var real = ls > rs ? 'left' : rs > ls ? 'right' : 'tie';
  var resEl = document.getElementById('duelo-result');
  s = _loadStats();
  s.casinoPlayedDuelo = (s.casinoPlayedDuelo||0)+1; _saveStats(s); s = _loadStats();

  if(_dueloChoice === real){
    s.coins = (s.coins||0) + _dueloBet*2;
    _saveStats(s);
    resEl.textContent = '¡Correcto! +🪙'+_dueloBet;
    resEl.className = 'casino-result win';
    _showCoinToast(_dueloBet, 0);
    var _ssDuelo=_loadStats(); _ssDuelo.casinoWinsDuelo=(_ssDuelo.casinoWinsDuelo||0)+1; _saveStats(_ssDuelo);
    _updateDailyProgress('duelowin', 1);
    _updateDailyProgress('casinowin', 1);
    _updateDailyProgress('casinoplayed', 1);
  } else {
    resEl.textContent = 'Incorrecto. Perdiste 🪙'+_dueloBet;
    resEl.className = 'casino-result lose';
    _updateDailyProgress('casinoplayed', 1);
  }

  document.getElementById('duelo-coins').textContent = (_loadStats().coins||0);
  document.getElementById('duelo-confirm-btn').style.display = 'none';
  document.getElementById('duelo-next-btn').style.display = '';
}

function dueloNext(){
  document.getElementById('duelo-result').textContent = '';
  document.getElementById('duelo-result').className = 'casino-result';
  document.getElementById('duelo-confirm-btn').style.display = '';
  document.getElementById('duelo-confirm-btn').disabled = false;
  document.getElementById('duelo-next-btn').style.display = 'none';
  _casinoBetRow('duelo-bet-row', '_dueloBet');
  _dueloResetCards();
}

// ── Par o Impar ──
var _poiPlayerChips = 10;
var _poiBotChips    = 10;
var _poiPlayerHand  = [];
var _poiBotHand     = [];
var _poiRound       = 1;
var _poiTurn        = 'player'; // 'player' | 'bot'
var _poiBotShownCard = null;

function _poiGetBet(){
  var bet = _poiRound;
  bet = Math.min(bet, _poiPlayerChips);
  bet = Math.min(bet, _poiBotChips);
  return Math.max(1, bet);
}

function _poiUpdateHeader(){
  document.getElementById('poi-player-chips').textContent = _poiPlayerChips;
  document.getElementById('poi-bot-chips').textContent    = _poiBotChips;
  document.getElementById('poi-round').textContent        = _poiRound;
  document.getElementById('poi-bet').textContent          = _poiGetBet();
}

function openParOImpar(){
  document.getElementById('casino-lobby').style.display   = 'none';
  document.getElementById('casino-bj').style.display      = 'none';
  document.getElementById('casino-duelo').style.display   = 'none';
  document.getElementById('casino-poi').style.display     = 'flex';
  _poiShowLobby();
}

function _poiShowLobby(){
  var s    = _loadStats();
  var have = s.coins || 0;
  var canPlay = have >= 20;

  document.getElementById('poi-stats-bar').style.display  = 'flex';
  document.getElementById('poi-player-chips').textContent = '—';
  document.getElementById('poi-bot-chips').textContent    = '—';
  document.getElementById('poi-round').textContent        = '—';
  document.getElementById('poi-bet').textContent          = '20🪙';
  document.getElementById('poi-center').style.display     = 'none';
  document.getElementById('poi-rival-guess').style.display= 'none';
  document.getElementById('poi-result').textContent       = '';
  document.getElementById('poi-result').className         = 'casino-result';
  document.getElementById('poi-hand-area').style.display  = 'none';
  document.getElementById('poi-guess-btns').style.display = 'none';
  document.getElementById('poi-next-wrap').style.display  = 'none';
  document.getElementById('poi-turn-label').textContent   = '';
  document.getElementById('poi-shown-card').style.display = 'none';
  document.getElementById('poi-shown-stars').style.display= 'none';

  var nextBtn = document.getElementById('poi-next-btn');
  nextBtn.textContent  = 'Jugar (20🪙)';
  nextBtn.disabled     = !canPlay;
  nextBtn.style.opacity= canPlay ? '1' : '.45';
  nextBtn.onclick      = _poiStartGame;
  document.getElementById('poi-next-wrap').style.display = '';

  if(!canPlay){
    document.getElementById('poi-result').textContent = 'Necesitas al menos 20🪙 para jugar.';
    document.getElementById('poi-result').className   = 'casino-result lose';
  }
}

function _poiStartGame(){
  var s = _loadStats();
  if((s.coins||0) < 20){
    _poiShowLobby();
    return;
  }
  s.coins = (s.coins||0) - 20;
  _saveStats(s);

  document.getElementById('poi-stats-bar').style.display = 'flex';
  document.getElementById('poi-center').style.display    = 'flex';

  _poiPlayerChips  = 10;
  _poiBotChips     = 10;
  _poiRound        = 1;
  _poiTurn         = 'player';
  _poiBotShownCard = null;

  var pool = (CARD_POOL || []).slice().sort(function(){ return Math.random() - .5; });
  _poiPlayerHand = pool.slice(0, 12);
  _poiBotHand    = pool.slice(12, 24);

  _poiRenderState();
}

function _poiRenderState(){
  document.getElementById('poi-result').textContent  = '';
  document.getElementById('poi-result').className    = 'casino-result';
  document.getElementById('poi-rival-guess').style.display = 'none';
  document.getElementById('poi-shown-card').style.display  = 'none';
  document.getElementById('poi-shown-stars').style.display = 'none';
  document.getElementById('poi-hand-area').style.display   = 'none';
  document.getElementById('poi-guess-btns').style.display  = 'none';
  document.getElementById('poi-next-wrap').style.display   = 'none';
  _poiUpdateHeader();

  if(_poiTurn === 'player'){
    document.getElementById('poi-turn-label').textContent = 'TU TURNO — Elige una carta';
    document.getElementById('poi-hand-area').style.display = 'flex';
    _poiRenderHand();
  } else {
    document.getElementById('poi-turn-label').textContent = 'TURNO DEL RIVAL — ¿Par o Impar?';
    _poiBotShownCard = _poiBotHand.splice(Math.floor(Math.random() * _poiBotHand.length), 1)[0];
    var cv = document.getElementById('poi-shown-card');
    cv.style.display = '';
    _dueloDrawBack(cv);
    document.getElementById('poi-guess-btns').style.display = 'flex';
  }
}

function _poiRenderHand(){
  var container = document.getElementById('poi-hand-cards');
  container.innerHTML = '';
  _poiPlayerHand.forEach(function(card){
    var wrap = document.createElement('div');
    wrap.style.cssText = 'display:flex;flex-direction:column;align-items:center;gap:2px;cursor:pointer;';
    var cv = document.createElement('canvas');
    cv.width = 42; cv.height = 56;
    cv.style.cssText = 'border-radius:5px;display:block;';
    _dueloDrawMini(cv, card);
    wrap.appendChild(cv);
    var lbl = document.createElement('div');
    lbl.style.cssText = 'font-size:9px;color:#c9a84c;font-weight:700;';
    lbl.textContent = card.stars + '★';
    wrap.appendChild(lbl);
    wrap.onclick = (function(c){ return function(){ _poiPlayerPick(c); }; })(card);
    container.appendChild(wrap);
  });
}

function _poiPlayerPick(card){
  _poiPlayerHand = _poiPlayerHand.filter(function(c){ return c !== card; });

  document.getElementById('poi-hand-area').style.display = 'none';
  var cv = document.getElementById('poi-shown-card');
  cv.style.display = '';
  cv.width = 70; cv.height = 90;
  _dueloDrawMini(cv, card);
  document.getElementById('poi-shown-stars').textContent = card.stars + '★';
  document.getElementById('poi-shown-stars').style.display = '';

  var botGuess  = Math.random() < .5 ? 'par' : 'impar';
  var isEven    = card.stars % 2 === 0;
  var botRight  = (botGuess === 'par') === isEven;

  var guessEl = document.getElementById('poi-rival-guess');
  guessEl.textContent = 'El rival dice: ' + (botGuess === 'par' ? 'PAR' : 'IMPAR');
  guessEl.style.display = '';

  setTimeout(function(){ _poiResolve(botRight ? 'bot' : 'player', 'bot'); }, 800);
}

function poiGuess(guess){
  document.getElementById('poi-guess-btns').style.display = 'none';
  playSfxCarta();
  var cv = document.getElementById('poi-shown-card');
  _dueloDrawMini(cv, _poiBotShownCard);
  document.getElementById('poi-shown-stars').textContent = _poiBotShownCard.stars + '★';
  document.getElementById('poi-shown-stars').style.display = '';

  var isEven  = _poiBotShownCard.stars % 2 === 0;
  var correct = (guess === 'par') === isEven;
  _poiResolve(correct ? 'player' : 'bot', 'player');
}

function _poiResolve(winner, guesser){
  var bet   = _poiGetBet();
  var resEl = document.getElementById('poi-result');
  // Nota: el tracking de misiones/stats (poiwin, casinowin, casinoplayed, casinoWinsPoi,
  // casinoPlayedPoi) se hace en _poiEndGame, al terminar la PARTIDA completa — no por ronda.
  if(winner === 'player'){
    _poiPlayerChips += bet;
    _poiBotChips    -= bet;
    if(_poiBotChips < 0) _poiBotChips = 0;
    // guesser='bot' → bot se equivocó → bueno para el jugador → verde
    // guesser='player' → jugador acertó → verde
    resEl.textContent = (guesser === 'bot' ? 'Incorrecto.' : '¡Correcto!') + ' +' + bet + ' ficha' + (bet!==1?'s':'');
    resEl.className   = 'casino-result win';
  } else {
    _poiBotChips    += bet;
    _poiPlayerChips -= bet;
    if(_poiPlayerChips < 0) _poiPlayerChips = 0;
    // guesser='bot' → bot acertó → malo para el jugador → rojo
    // guesser='player' → jugador se equivocó → rojo
    resEl.textContent = (guesser === 'bot' ? 'Correcto.' : 'Incorrecto.') + ' -' + bet + ' ficha' + (bet!==1?'s':'');
    resEl.className   = 'casino-result lose';
  }
  _poiUpdateHeader();

  var handsEmpty = _poiPlayerHand.length === 0 && _poiBotHand.length === 0;
  if(_poiPlayerChips <= 0 || _poiBotChips <= 0 || handsEmpty){
    setTimeout(function(){ _poiEndGame(); }, 700);
    return;
  }

  var nextBtn = document.getElementById('poi-next-btn');
  nextBtn.textContent = 'Siguiente ronda ▶';
  nextBtn.onclick = poiNext;
  document.getElementById('poi-next-wrap').style.display = '';
}

function poiNext(){
  _poiRound++;
  _poiTurn        = (_poiTurn === 'player') ? 'bot' : 'player';
  _poiBotShownCard = null;
  _poiRenderState();
}

function _poiEndGame(){
  var won;
  if(_poiPlayerChips <= 0)      won = false;
  else if(_poiBotChips <= 0)    won = true;
  else                          won = _poiPlayerChips > _poiBotChips;

  var s     = _loadStats();
  var resEl = document.getElementById('poi-result');
  // Tracking por PARTIDA completa (una partida de Par o Impar = varias rondas)
  s.casinoPlayedPoi = (s.casinoPlayedPoi||0) + 1;
  _updateDailyProgress('casinoplayed', 1);
  if(won){
    s.coins = (s.coins||0) + 40;
    s.casinoWinsPoi = (s.casinoWinsPoi||0) + 1;
    _saveStats(s);
    resEl.textContent = '¡Ganaste! +🪙40';
    resEl.className   = 'casino-result win';
    _showCoinToast(20, 0);
    _updateDailyProgress('poiwin', 1);
    _updateDailyProgress('casinowin', 1);
  } else {
    _saveStats(s);
    resEl.textContent = 'Perdiste. ¡Mejor suerte la próxima!';
    resEl.className   = 'casino-result lose';
  }

  var nextBtn = document.getElementById('poi-next-btn');
  nextBtn.textContent  = 'Jugar de nuevo';
  nextBtn.disabled     = false;
  nextBtn.style.opacity= '1';
  nextBtn.onclick      = _poiShowLobby;
  document.getElementById('poi-next-wrap').style.display = '';
}

// ── Disco Nexus ──
var _discoSectors = [
  { num:1, rarity:'Normal',  color:'#5a90d9' },
  { num:2, rarity:'Normal',  color:'#5a90d9' },
  { num:3, rarity:'Raro',    color:'#4ac97a' },
  { num:4, rarity:'Raro',    color:'#4ac97a' },
  { num:5, rarity:'Épico',   color:'#EF9F27' },
  { num:6, rarity:'Épico',   color:'#EF9F27' },
  { num:7, rarity:'Mítico',  color:'#9b59f7' },
  { num:8, rarity:'Mítico',  color:'#9b59f7' },
  { num:9, rarity:'Especial',color:'#f76eb2' },
];
var _discoBetType = null; // 'color' | 'num'
var _discoBetVal  = null;
var _discoBet     = 1;
var _discoSpinning = false;
var _discoAngle   = 0;

var _DISCO_BETS = [1, 3, 5];
function _discoBetRow(){
  var row = document.getElementById('disco-bet-row');
  row.innerHTML = '';
  var coins = (_loadStats().coins||0);
  _DISCO_BETS.forEach(function(b){
    var btn = document.createElement('button');
    btn.className = 'casino-bet-btn' + (_discoBet===b ? ' selected' : '');
    btn.textContent = '🪙'+b;
    btn.disabled = coins < b;
    btn.onclick = function(){ _discoBet = b; _discoBetRow(); };
    row.appendChild(btn);
  });
}

function openDiscoNexus(){
  document.getElementById('casino-lobby').style.display   = 'none';
  document.getElementById('casino-disco').style.display   = 'flex';
  _discoBetType = null; _discoBetVal = null;
  document.getElementById('disco-result').textContent = '';
  document.getElementById('disco-result').className   = 'casino-result';
  document.getElementById('disco-spin-btn').disabled  = true;
  document.getElementById('disco-coins').textContent  = (_loadStats().coins||0);
  _discoBetRow();
  _discoDrawWheel(_discoAngle, -1);
}

function _discoDrawWheel(angle, highlightIdx){
  var canvas = document.getElementById('disco-canvas');
  var ctx = canvas.getContext('2d');
  var cx = 100, cy = 100, r = 95;
  var n = _discoSectors.length;
  var slice = (2 * Math.PI) / n;
  ctx.clearRect(0, 0, 200, 200);
  _discoSectors.forEach(function(s, i){
    var start = angle + i * slice - Math.PI/2;
    var end   = start + slice;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, r, start, end);
    ctx.closePath();
    ctx.fillStyle = s.color + (highlightIdx === i ? 'ff' : '99');
    ctx.fill();
    ctx.strokeStyle = '#0a0a18';
    ctx.lineWidth = 2;
    ctx.stroke();
    // número
    var mid = start + slice / 2;
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 13px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(s.num, cx + Math.cos(mid) * 68, cy + Math.sin(mid) * 68);
  });
  // puntero
  ctx.beginPath();
  ctx.moveTo(cx, cy - r - 2);
  ctx.lineTo(cx - 7, cy - r + 12);
  ctx.lineTo(cx + 7, cy - r + 12);
  ctx.closePath();
  ctx.fillStyle = '#fff';
  ctx.fill();
}

function discoSelectBet(type, val){
  _discoBetType = type; _discoBetVal = val;
  document.querySelectorAll('#disco-bet-type .casino-bet-btn').forEach(function(b){
    b.classList.toggle('selected', b.dataset.dval === val);
  });
  document.getElementById('disco-spin-btn').disabled = false;
}

function discoSpin(){
  if(_discoSpinning || !_discoBetType) return;
  var s = _loadStats();
  if((s.coins||0) < _discoBet){
    playSfxDenied();
    var r = document.getElementById('disco-result');
    r.textContent = 'No tienes suficientes monedas.';
    r.className = 'casino-result lose';
    return;
  }
  s.coins = (s.coins||0) - _discoBet;
  _saveStats(s);
  _discoSpinning = true;
  _playSfx(_sfxSpinWheel);
  document.getElementById('disco-spin-btn').disabled = true;
  document.getElementById('disco-result').textContent = '';
  document.querySelectorAll('#disco-bet-type .casino-bet-btn, #disco-bet-row .casino-bet-btn').forEach(function(b){ b.disabled=true; });

  var result = Math.floor(Math.random() * _discoSectors.length);
  var totalRot = (Math.PI * 2 * (5 + Math.random()*3));
  var targetAngle = _discoAngle + totalRot;
  // ajustar para que el sector result quede en el puntero (top)
  var slice = (2 * Math.PI) / _discoSectors.length;
  var sectorMid = result * slice;
  targetAngle = Math.ceil(targetAngle / (Math.PI*2)) * (Math.PI*2) - sectorMid;

  var start = performance.now();
  var duration = 3000;
  var startAngle = _discoAngle;

  function animate(now){
    var t = Math.min((now - start) / duration, 1);
    var ease = 1 - Math.pow(1 - t, 4);
    var cur = startAngle + (targetAngle - startAngle) * ease;
    _discoAngle = cur;
    _discoDrawWheel(cur, t === 1 ? result : -1);
    if(t < 1){ requestAnimationFrame(animate); }
    else { _discoEndSpin(result); }
  }
  requestAnimationFrame(animate);
}

function _discoEndSpin(idx){
  _discoSpinning = false;
  _discoBetRow();
  document.querySelectorAll('#disco-bet-type .casino-bet-btn').forEach(function(b){ b.disabled=false; });
  var sec = _discoSectors[idx];
  var resEl = document.getElementById('disco-result');
  var won = false, mult = 0;

  if(_discoBetVal === sec.rarity){
    won = true;
    mult = sec.rarity === 'Especial' ? 7 : 3.5;
  }

  var s = _loadStats();
  s.casinoPlayedDisco = (s.casinoPlayedDisco||0)+1; _saveStats(s); s = _loadStats();
  if(won){
    var gain = Math.ceil(_discoBet * mult);
    s.coins = (s.coins||0) + gain;
    _saveStats(s);
    resEl.textContent = '¡' + sec.rarity + ' ' + sec.num + '! Ganaste 🪙' + (gain - _discoBet) + ' (×' + mult + ')';
    resEl.className = 'casino-result win';
    _showCoinToast(gain - _discoBet, 0);
    var _ssDisco=_loadStats(); _ssDisco.casinoWinsDisco=(_ssDisco.casinoWinsDisco||0)+1; _saveStats(_ssDisco);
    _updateDailyProgress('discowin', 1);
    _updateDailyProgress('casinowin', 1);
    _updateDailyProgress('casinoplayed', 1);
  } else {
    resEl.textContent = 'Salió ' + sec.rarity + ' ' + sec.num + '. Suerte la próxima.';
    resEl.className = 'casino-result lose';
    _updateDailyProgress('casinoplayed', 1);
  }
  document.getElementById('disco-spin-btn').disabled = false;
}

// ── Tríada Arcana ──
var _triadaRarities = [
  { name:'Normal',    color:'#5a90d9', mult:1.5 },
  { name:'Raro',      color:'#4ac97a', mult:3   },
  { name:'Épico',     color:'#EF9F27', mult:6   },
  { name:'Mítico',    color:'#9b59f7', mult:12  },
  { name:'Especial',  color:'#f76eb2', mult:25  },
  { name:'Legendario',color:'#f76e6e', mult:50  },
];
var _triadaBet = 1;
var _triadaSpinning = false;

function openTriadaArcana(){
  document.getElementById('casino-lobby').style.display   = 'none';
  document.getElementById('casino-triada').style.display  = 'flex';
  document.getElementById('triada-result').textContent = '';
  document.getElementById('triada-result').className   = 'casino-result';
  [0,1,2].forEach(function(i){
    document.getElementById('triada-n'+i).textContent = '?';
    document.getElementById('triada-v'+i).textContent = '';
    document.getElementById('triada-v'+i).style.color = '';
    var r = document.getElementById('triada-r'+i);
    r.style.background = ''; r.style.borderColor = '';
  });
  document.getElementById('triada-coins').textContent = (_loadStats().coins||0);
  _triadaBetRow();
}

var _TRIADA_BETS = [1, 3, 5];
function _triadaBetRow(){
  var row = document.getElementById('triada-bet-row');
  row.innerHTML = '';
  var coins = (_loadStats().coins||0);
  _TRIADA_BETS.forEach(function(b){
    var btn = document.createElement('button');
    btn.className = 'casino-bet-btn' + (_triadaBet===b ? ' selected' : '');
    btn.textContent = '🪙'+b;
    btn.disabled = coins < b;
    btn.onclick = function(){ _triadaBet = b; _triadaBetRow(); };
    row.appendChild(btn);
  });
}

function _triadaPickCard(){
  // Selecciona una carta aleatoria ponderada por rareza
  var weights = { 'Normal':40,'Raro':25,'Épico':15,'Mítico':10,'Especial':6,'Legendario':4 };
  var pool = (CARD_POOL||[]).filter(function(c){ return weights[c.rarity]; });
  if(!pool.length) return null;
  var total = pool.reduce(function(a,c){ return a+(weights[c.rarity]||0); }, 0);
  var r = Math.random()*total, acc=0;
  for(var i=0;i<pool.length;i++){
    acc+=weights[pool[i].rarity]||0;
    if(r<acc) return pool[i];
  }
  return pool[pool.length-1];
}

function triadaSpin(){
  if(_triadaSpinning) return;
  var s = _loadStats();
  if((s.coins||0) < _triadaBet){
    playSfxDenied();
    var r = document.getElementById('triada-result');
    r.textContent = 'No tienes suficientes monedas.';
    r.className = 'casino-result lose';
    return;
  }
  s.coins = (s.coins||0) - _triadaBet;
  _saveStats(s);
  _triadaSpinning = true;
  document.getElementById('triada-spin-btn').disabled = true;
  document.getElementById('triada-result').textContent = '';
  document.querySelectorAll('#triada-bet-row .casino-bet-btn').forEach(function(b){ b.disabled=true; });

  var finalCards = [_triadaPickCard(), _triadaPickCard(), _triadaPickCard()];
  var ticks = [0,0,0];
  var maxTicks = [18, 22, 26];
  var intervals = [null,null,null];

  finalCards.forEach(function(finalCard, ri){
    intervals[ri] = setInterval(function(){
      var show = _triadaPickCard();
      if(!show) return;
      var rar = _triadaRarities.find(function(x){ return x.name===show.rarity; }) || _triadaRarities[0];
      document.getElementById('triada-n'+ri).textContent = show.name;
      document.getElementById('triada-v'+ri).textContent = show.rarity;
      document.getElementById('triada-v'+ri).style.color = rar.color;
      document.getElementById('triada-r'+ri).style.borderColor = rar.color+'88';
      ticks[ri]++;
      if(ticks[ri] >= maxTicks[ri]){
        clearInterval(intervals[ri]);
        var frar = _triadaRarities.find(function(x){ return x.name===finalCard.rarity; }) || _triadaRarities[0];
        document.getElementById('triada-n'+ri).textContent = finalCard.name;
        document.getElementById('triada-v'+ri).textContent = finalCard.rarity;
        document.getElementById('triada-v'+ri).style.color = frar.color;
        document.getElementById('triada-r'+ri).style.borderColor = frar.color;
        document.getElementById('triada-r'+ri).style.background  = frar.color+'22';
        if(ticks[0]>=maxTicks[0] && ticks[1]>=maxTicks[1] && ticks[2]>=maxTicks[2]){
          setTimeout(function(){ _triadaEnd(finalCards); }, 300);
        }
      }
    }, 80 + ri*20);
  });
}

function _triadaEnd(cards){
  _triadaSpinning = false;
  document.getElementById('triada-spin-btn').disabled = false;
  _triadaBetRow();
  var resEl = document.getElementById('triada-result');
  var s = _loadStats();
  s.casinoPlayedTriada = (s.casinoPlayedTriada||0)+1; _saveStats(s); s = _loadStats();
  var r0=cards[0].rarity, r1=cards[1].rarity, r2=cards[2].rarity;

  if(r0===r1 && r1===r2){
    var rar = _triadaRarities.find(function(x){ return x.name===r0; }) || _triadaRarities[0];
    var gain = Math.ceil(_triadaBet * rar.mult);
    s.coins = (s.coins||0) + gain;
    _saveStats(s);
    resEl.textContent = '¡Tríada ' + rar.name + '! +🪙' + (gain - _triadaBet) + ' (×' + rar.mult + ')';
    resEl.className = 'casino-result win';
    _showCoinToast(gain - _triadaBet, 0);
    var _ssTriada=_loadStats(); _ssTriada.casinoWinsTriada=(_ssTriada.casinoWinsTriada||0)+1; _saveStats(_ssTriada);
    _updateDailyProgress('triadawin', 1);
    _updateDailyProgress('casinowin', 1);
    _updateDailyProgress('casinoplayed', 1);
  } else if(r0===r1 || r1===r2 || r0===r2){
    s.coins = (s.coins||0) + _triadaBet;
    _saveStats(s);
    resEl.textContent = 'Par encontrado — se devuelve la apuesta.';
    resEl.className = 'casino-result draw';
    _updateDailyProgress('casinoplayed', 1);
  } else {
    resEl.textContent = 'Sin combinación. Mejor suerte.';
    resEl.className = 'casino-result lose';
    _updateDailyProgress('casinoplayed', 1);
  }
}

// ── SFX global de botones ──
document.addEventListener('click', function(e){
  var t = e.target;
  if(!t) return;
  var el = t.tagName==='BUTTON' ? t : t.closest('button');
  if(!el) el = t.hasAttribute('onclick') ? t : t.closest('[onclick]');
  if(el) playSfxBoton();
}, true);
