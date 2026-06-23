/* ═══════════════════════════════════════════════
   SOLITARIO NEXUS — Reto del Día
═══════════════════════════════════════════════ */
var _SOL_KEY = 'nx_sol_v1';
var _solState = null;
var _solSel = null; // {source:'col'|'waste'|'foundation', colIdx, cardIdx, suit}
var _solHistory = [];
var _solDragData = null;

var _SOL_SUITS = [
  {id:'normal', name:'Normal', color:'#5aabff', opp:'epico'},
  {id:'raro',   name:'Raro',   color:'#4adb6e', opp:'mitico'},
  {id:'epico',  name:'Épico',  color:'#ff8c42', opp:'normal'},
  {id:'mitico', name:'Mítico', color:'#b06ffc', opp:'raro'},
];

function _solRngFn(seed){
  var s = seed >>> 0;
  // Mezclar el seed (hash entero) para que días/seeds consecutivos
  // produzcan barajados COMPLETAMENTE distintos. Sin esto, un LCG con
  // seeds que difieren en 1 genera juegos casi idénticos día tras día.
  s = Math.imul(s ^ (s >>> 16), 0x45d9f3b) >>> 0;
  s = Math.imul(s ^ (s >>> 16), 0x45d9f3b) >>> 0;
  s = (s ^ (s >>> 16)) >>> 0;
  return function(){
    s = (Math.imul(1664525, s) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}
function _solSeedVal(){
  var d = new Date();
  return d.getFullYear()*10000+(d.getMonth()+1)*100+d.getDate();
}
function _solTodayKey(){
  var d = new Date();
  return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
}
function _loadSolData(){
  try{ return Object.assign({date:'',done:false,rewarded:false},JSON.parse(localStorage.getItem(_SOL_KEY)||'{}')); }
  catch(e){ return {date:'',done:false,rewarded:false}; }
}
function _saveSolData(d){ try{ localStorage.setItem(_SOL_KEY,JSON.stringify(d)); }catch(e){} }

function _solShuffle(arr, rng){
  var a = arr.slice();
  for(var i=a.length-1;i>0;i--){ var j=Math.floor(rng()*(i+1)), t=a[i]; a[i]=a[j]; a[j]=t; }
  return a;
}

function _solBuildDeck(rng){
  var deck = [];
  _SOL_SUITS.forEach(function(suit){
    var pool = (CARD_POOL||[]).filter(function(c){ return c.rarity===suit.name && c.image; });
    var chosen = _solShuffle(pool, rng).slice(0,8);
    chosen.forEach(function(card, idx){
      deck.push({cardId:card.id, name:card.name, image:card.image, suit:suit.id, value:idx+1, faceUp:false});
    });
  });
  return _solShuffle(deck, rng);
}

// Greedy solver: returns true if the deck appears solvable
function _solTryGreedy(initDeck){
  var OPP=[2,3,0,1]; // normal↔epico, raro↔mitico
  var SI={normal:0,raro:1,epico:2,mitico:3};
  function cs(id){return id>>3;} function cv(id){return (id&7)+1;}
  function cid(d){return SI[d.suit]*8+d.value-1;}
  var tab=[[],[],[],[],[]],di=0;
  for(var c=0;c<5;c++) for(var r=0;r<=c;r++,di++) tab[c].push({id:cid(initDeck[di]),up:r===c});
  var stk=initDeck.slice(di).map(function(d){return cid(d);}).reverse();
  var wst=[],fn=[0,0,0,0],cyc=0;
  for(var t=0;t<1500;t++){
    if(fn[0]===8&&fn[1]===8&&fn[2]===8&&fn[3]===8) return true;
    var moved=false;
    // Foundation from waste
    if(wst.length){var w=wst[wst.length-1];if(cv(w)===fn[cs(w)]+1){fn[cs(w)]++;wst.pop();moved=true;}}
    // Foundation from tableau tops
    if(!moved) for(var ci=0;ci<5&&!moved;ci++){
      if(!tab[ci].length) continue;
      var tp=tab[ci][tab[ci].length-1];
      if(tp.up&&cv(tp.id)===fn[cs(tp.id)]+1){fn[cs(tp.id)]++;tab[ci].pop();if(tab[ci].length&&!tab[ci][tab[ci].length-1].up)tab[ci][tab[ci].length-1].up=true;moved=true;}
    }
    if(moved) continue;
    // Tab→tab: prioritize revealing face-down cards
    for(var s=0;s<5&&!moved;s++){
      var sc=tab[s],fu=-1;
      for(var k=0;k<sc.length;k++) if(sc[k].up){fu=k;break;}
      if(fu<1) continue;
      for(var d=0;d<5&&!moved;d++){
        if(d===s) continue; var dc=tab[d]; if(!dc.length) continue;
        var dt=dc[dc.length-1],bi=sc[fu];
        if(dt.up&&cv(bi.id)===cv(dt.id)-1&&OPP[cs(bi.id)]===cs(dt.id)){var mv=sc.splice(fu);sc.length&&!sc[sc.length-1].up&&(sc[sc.length-1].up=true);tab[d]=dc.concat(mv);moved=true;}
      }
    }
    // Tab→tab: any valid move
    for(var s2=0;s2<5&&!moved;s2++){
      var sc2=tab[s2],fu2=-1;
      for(var k2=0;k2<sc2.length;k2++) if(sc2[k2].up){fu2=k2;break;}
      if(fu2===-1) continue;
      for(var st2=fu2;st2<sc2.length&&!moved;st2++){
        for(var d2=0;d2<5&&!moved;d2++){
          if(d2===s2) continue; var dc2=tab[d2],bi2=sc2[st2];
          var ok=!dc2.length&&st2>0;
          if(!ok&&dc2.length){var dt2=dc2[dc2.length-1];ok=dt2.up&&cv(bi2.id)===cv(dt2.id)-1&&OPP[cs(bi2.id)]===cs(dt2.id);}
          if(ok){var mv2=sc2.splice(st2);sc2.length&&!sc2[sc2.length-1].up&&(sc2[sc2.length-1].up=true);tab[d2]=dc2.concat(mv2);moved=true;}
        }
      }
    }
    // Waste→tab
    if(!moved&&wst.length){
      var wi=wst[wst.length-1],wv=cv(wi),ws=cs(wi);
      for(var d3=0;d3<5&&!moved;d3++){
        var dc3=tab[d3];
        if(!dc3.length){wst.pop();tab[d3].push({id:wi,up:true});moved=true;}
        else{var dt3=dc3[dc3.length-1];if(dt3.up&&wv===cv(dt3.id)-1&&OPP[ws]===cs(dt3.id)){wst.pop();tab[d3].push({id:wi,up:true});moved=true;}}
      }
    }
    if(moved) continue;
    if(stk.length){wst.push(stk.pop());continue;}
    if(cyc<2&&wst.length){stk=wst.slice().reverse();wst=[];cyc++;continue;}
    break;
  }
  return fn[0]===8&&fn[1]===8&&fn[2]===8&&fn[3]===8;
}

var _solGoodSeed=null, _solGoodSeedDay='';
function _solGetSeed(){
  var today=_solTodayKey();
  if(_solGoodSeedDay===today&&_solGoodSeed!==null) return _solGoodSeed;
  var base=_solSeedVal();
  for(var off=0;off<30;off++){
    var seed=base+off;
    var rng=_solRngFn(seed);
    var deck=_solBuildDeck(rng);
    if(_solTryGreedy(deck)){_solGoodSeed=seed;_solGoodSeedDay=today;return seed;}
  }
  _solGoodSeed=base; _solGoodSeedDay=today; return base;
}

function _solNewGame(){
  var seed=_solGetSeed();
  var rng = _solRngFn(seed);
  var deck = _solBuildDeck(rng);
  var tableau = [[],[],[],[],[]];
  var di = 0;
  for(var c=0;c<5;c++){
    for(var r=0;r<=c;r++){
      var card = Object.assign({}, deck[di++]);
      card.faceUp = (r===c);
      tableau[c].push(card);
    }
  }
  var stock = deck.slice(di).map(function(c){ return Object.assign({},c,{faceUp:false}); });
  _solState = {tableau:tableau, foundations:{normal:[],raro:[],epico:[],mitico:[]}, stock:stock, waste:[], completed:false};
  _solSel = null;
  _solHistory = [];
  var btn=document.getElementById('solUndoBtn');
  if(btn) btn.disabled=true;
}

function _solColor(suit){ var s=_SOL_SUITS.find(function(x){return x.id===suit;}); return s?s.color:'#888'; }
function _solOpp(suit){ var s=_SOL_SUITS.find(function(x){return x.id===suit;}); return s?s.opp:null; }

function _solCardHTML(card, isSel){
  var sel = isSel ? ' sol-sel' : '';
  if(!card.faceUp) return '<div class="sol-card face-down'+sel+'"><img src="'+CARD_BACK+'" style="width:100%;height:100%;object-fit:cover;border-radius:5px"></div>';
  var color = _solColor(card.suit);
  return '<div class="sol-card face-up'+sel+'" style="border-color:'+color+'">'
    +'<img src="'+card.image+'" alt="" onerror="this.style.display=\'none\'">'
    +'<div class="sol-cv">'+card.value+'</div>'
    +'<div class="sol-cs" style="background:'+color+'"></div>'
    +'</div>';
}

function _solRender(){
  var body = document.getElementById('solBody');
  if(!body || !_solState) return;
  var s = _solState;
  var SD=15, SU=24; // step face-down / face-up

  // Top row: stock, waste, spacer, 4 foundations
  var html = '<div class="sol-top-row">';
  // Stock
  if(s.stock.length){
    html += '<div onclick="_solClickStock()" style="position:relative"><div class="sol-card face-down" style="cursor:pointer"><img src="'+CARD_BACK+'" style="width:100%;height:100%;object-fit:cover;border-radius:5px"></div><div style="position:absolute;bottom:3px;right:4px;font-size:9px;font-weight:700;color:rgba(255,255,255,.7);text-shadow:0 1px 3px #000;pointer-events:none">'+s.stock.length+'</div></div>';
  } else {
    html += '<div class="sol-empty" onclick="_solClickStock()" style="font-size:20px;color:rgba(255,255,255,.2);cursor:pointer">↺</div>';
  }
  // Waste
  if(s.waste.length){
    var wcard = s.waste[s.waste.length-1];
    html += '<div onclick="_solClickWaste()">'+_solCardHTML(Object.assign({},wcard,{faceUp:true}), !!(_solSel&&_solSel.source==='waste'))+'</div>';
  } else {
    html += '<div class="sol-empty"></div>';
  }
  html += '<div style="flex:1"></div>';
  // Foundations
  _SOL_SUITS.forEach(function(suit){
    var f = s.foundations[suit.id];
    var isFSel = !!(_solSel&&_solSel.source==='foundation'&&_solSel.suit===suit.id);
    if(f.length){
      html += '<div data-sol-drop="found" data-sol-suit="'+suit.id+'" onclick="_solClickFoundation(\''+suit.id+'\')">'+_solCardHTML(Object.assign({},f[f.length-1],{faceUp:true}),isFSel)+'</div>';
    } else {
      html += '<div class="sol-empty" data-sol-drop="found" data-sol-suit="'+suit.id+'" onclick="_solClickFoundation(\''+suit.id+'\')" style="border-color:'+suit.color+'44">'
        +'<span style="font-size:7px;color:'+suit.color+'88;font-weight:700">'+suit.name[0]+'</span></div>';
    }
  });
  html += '</div>';

  // Tableau
  html += '<div class="sol-tableau">';
  for(var ci=0;ci<5;ci++){
    var col = s.tableau[ci];
    var colH = 68;
    if(col.length){
      var topPx = 0;
      for(var i=0;i<col.length-1;i++) topPx += col[i].faceUp ? SU : SD;
      colH = topPx + 68;
    }
    html += '<div class="sol-col" data-sol-drop="col" data-sol-ci="'+ci+'" style="height:'+colH+'px" onclick="_solClickCol('+ci+')">';
    if(!col.length){
      html += '<div class="sol-empty" style="position:absolute;top:0;left:0"></div>';
    } else {
      var t=0;
      for(var j=0;j<col.length;j++){
        var isSel = !!(_solSel&&_solSel.source==='col'&&_solSel.colIdx===ci&&j>=_solSel.cardIdx);
        html += '<div style="position:absolute;top:'+t+'px;left:0;z-index:'+(j+1)+'" onclick="event.stopPropagation();_solClickCard('+ci+','+j+')">'
          +_solCardHTML(col[j],isSel)+'</div>';
        t += col[j].faceUp ? SU : SD;
      }
    }
    html += '</div>';
  }
  html += '</div>';

  html += '<div class="sol-hint">Toca una carta para seleccionarla, luego toca el destino</div>';

  if(s.completed) html += '<div class="sol-win">🎉 ¡COMPLETADO!</div>';
  var sd = _loadSolData();
  if(sd.done && sd.date===_solTodayKey()){
    html += '<div class="sol-done-badge">✔ Recompensa reclamada · +30 monedas · +30 XP</div>';
  }

  body.innerHTML = html;
}

function _solClickStock(){
  if(!_solState) return;
  _solSel = null;
  var s = _solState;
  if(s.stock.length){
    var c = s.stock.pop(); c.faceUp=true; s.waste.push(c);
    playSfxCarta();
  } else if(s.waste.length){
    s.stock = s.waste.slice().reverse().map(function(c){ return Object.assign({},c,{faceUp:false}); });
    s.waste = [];
  }
  _solRender();
}

function _solClickWaste(){
  if(!_solState||!_solState.waste.length) return;
  _solSel = (_solSel&&_solSel.source==='waste') ? null : {source:'waste'};
  _solRender();
}

function _solClickCard(ci, ji){
  if(!_solState) return;
  var col = _solState.tableau[ci];
  var card = col[ji];
  if(!card.faceUp){
    if(ji===col.length-1){ card.faceUp=true; _solSel=null; _solRender(); }
    return;
  }
  if(_solSel&&_solSel.source==='col'&&_solSel.colIdx===ci&&_solSel.cardIdx===ji){
    _solSel=null; _solRender(); return;
  }
  if(_solSel){ if(!_solTryMoveToCol(ci)){ _solSel={source:'col',colIdx:ci,cardIdx:ji}; } _solRender(); return; }
  _solSel={source:'col',colIdx:ci,cardIdx:ji};
  _solRender();
}

function _solClickCol(ci){
  if(!_solState||!_solSel) return;
  _solTryMoveToCol(ci);
  _solRender();
}

function _solGetSelCards(){
  if(!_solSel||!_solState) return null;
  var s=_solState;
  if(_solSel.source==='waste') return s.waste.length?[s.waste[s.waste.length-1]]:null;
  if(_solSel.source==='col') return s.tableau[_solSel.colIdx].slice(_solSel.cardIdx);
  if(_solSel.source==='foundation'){ var f=s.foundations[_solSel.suit]; return f.length?[f[f.length-1]]:null; }
  return null;
}

function _solTryMoveToCol(destCi){
  var cards = _solGetSelCards();
  if(!cards||!cards.length) return false;
  var destCol = _solState.tableau[destCi];
  var bottom = cards[0];
  if(!destCol.length){
    _solDoMoveToCol(destCi, cards); return true;
  }
  var topDest = destCol[destCol.length-1];
  if(bottom.faceUp && bottom.value===topDest.value-1 && _solOpp(bottom.suit)===topDest.suit){
    _solDoMoveToCol(destCi, cards); return true;
  }
  return false;
}

function _solDoMoveToCol(destCi, cards){
  _solSaveHistory();
  var s=_solState, sel=_solSel;
  if(sel.source==='waste'){ s.waste.pop(); }
  else if(sel.source==='foundation'){ s.foundations[sel.suit].pop(); }
  else {
    s.tableau[sel.colIdx]=s.tableau[sel.colIdx].slice(0,sel.cardIdx);
    var src=s.tableau[sel.colIdx];
    if(src.length&&!src[src.length-1].faceUp){ src[src.length-1].faceUp=true; playSfxCarta(); }
  }
  s.tableau[destCi]=s.tableau[destCi].concat(cards);
  _solSel=null;
}

function _solClickFoundation(suit){
  if(!_solState) return;
  var found=_solState.foundations[suit];
  // No selection: select top foundation card to move back
  if(!_solSel){
    if(found.length){ _solSel={source:'foundation',suit:suit}; _solRender(); }
    return;
  }
  // Already selected this foundation card: deselect
  if(_solSel.source==='foundation'&&_solSel.suit===suit){ _solSel=null; _solRender(); return; }
  // Try to move selected card onto this foundation
  var cards=_solGetSelCards();
  if(!cards||cards.length!==1){ _solSel=null; _solRender(); return; }
  var card=cards[0];
  if(card.suit===suit){
    var expected=found.length?found[found.length-1].value+1:1;
    if(card.value===expected){
      _solSaveHistory();
      if(_solSel.source==='waste'){ _solState.waste.pop(); }
      else if(_solSel.source==='foundation'){ _solState.foundations[_solSel.suit].pop(); }
      else {
        _solState.tableau[_solSel.colIdx].splice(_solSel.cardIdx,1);
        var src2=_solState.tableau[_solSel.colIdx];
        if(src2.length&&!src2[src2.length-1].faceUp){ src2[src2.length-1].faceUp=true; playSfxCarta(); }
      }
      found.push(card);
      _solSel=null;
      _solCheckWin();
      _solRender();
      return;
    }
  }
  _solSel=null; _solRender();
}

function _solCheckWin(){
  if(!_solState) return;
  var total=_SOL_SUITS.reduce(function(acc,suit){ return acc+_solState.foundations[suit.id].length; },0);
  if(total===32){
    _solState.completed=true;
    if(typeof playSfxVictoria==='function') playSfxVictoria();
    var today=_solTodayKey(), sd=_loadSolData();
    if(!sd.rewarded||sd.date!==today){
      var st=_loadStats(); st.coins=(st.coins||0)+30; st.xp=(st.xp||0)+30; st.solWins=(st.solWins||0)+1; _saveStats(st);
      var lbl=document.getElementById('solWinsLabel'); if(lbl) lbl.textContent='Completados: '+st.solWins;
      _saveSolData({date:today,done:true,rewarded:true});
      _solShowRewardToast();
    }
  }
}

function _solSaveHistory(){
  _solHistory.push(JSON.stringify(_solState));
  if(_solHistory.length>20) _solHistory.shift();
  var btn=document.getElementById('solUndoBtn');
  if(btn) btn.disabled=false;
}
function _solUndo(){
  if(!_solHistory.length||!_solState) return;
  _solState=JSON.parse(_solHistory.pop());
  _solSel=null;
  var btn=document.getElementById('solUndoBtn');
  if(btn) btn.disabled=!_solHistory.length;
  _solRender();
}


function _solShowRewardToast(){
  var overlay = document.getElementById('solOverlay');
  if(!overlay) return;
  var toast = document.createElement('div');
  toast.style.cssText='position:absolute;top:80px;left:50%;transform:translateX(-50%);background:#1a1228;border:1px solid rgba(232,196,106,.6);border-radius:12px;padding:.6rem 1.2rem;font-family:var(--font-title);font-size:13px;color:#e8c46a;letter-spacing:.08em;z-index:10;white-space:nowrap;box-shadow:0 4px 24px rgba(232,196,106,.25);animation:_sol-toast .3s ease;pointer-events:none;';
  toast.textContent='🎉 +30 🪙  +30 XP';
  overlay.querySelector('.sol-modal').appendChild(toast);
  setTimeout(function(){ toast.style.transition='opacity .5s'; toast.style.opacity='0'; setTimeout(function(){ toast.remove(); },500); }, 2500);
}

function _solRenderDone(){
  var body=document.getElementById('solBody'); if(!body) return;
  function getCountdown(){
    var now=new Date(), tom=new Date(now.getFullYear(),now.getMonth(),now.getDate()+1);
    var diff=tom-now, h=Math.floor(diff/3600000), m=Math.floor((diff%3600000)/60000), s=Math.floor((diff%60000)/1000);
    return String(h).padStart(2,'0')+':'+String(m).padStart(2,'0')+':'+String(s).padStart(2,'0');
  }
  body.innerHTML='<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;flex:1;gap:1rem;padding:1.5rem;text-align:center">'
    +'<div style="font-size:48px">✅</div>'
    +'<div class="tutg-title">¡Reto completado!</div>'
    +'<div class="tutg-body">Ya reclamaste tu recompensa de hoy.<br>Vuelve mañana para el siguiente reto.</div>'
    +'<div style="background:var(--surface2);border:.5px solid var(--border);border-radius:12px;padding:.7rem 1.4rem">'
    +'<div style="font-size:9px;color:var(--text-muted);letter-spacing:.1em;margin-bottom:.3rem">NUEVO RETO EN</div>'
    +'<div id="solCountdownEl" style="font-family:var(--font-title);font-size:22px;color:var(--purple);letter-spacing:.12em">'+getCountdown()+'</div>'
    +'</div>'
    +'<div class="sol-done-badge">+30 🪙  +30 XP obtenidos</div>'
    +'</div>';
  if(_solCountdownTimer) clearInterval(_solCountdownTimer);
  _solCountdownTimer=setInterval(function(){
    var el=document.getElementById('solCountdownEl');
    if(!el){ clearInterval(_solCountdownTimer); return; }
    el.textContent=getCountdown();
  },1000);
}

function openSolitario(){
  var sd=_loadSolData(), today=_solTodayKey();
  _solHelpOpen=false;
  if(_solCountdownTimer){ clearInterval(_solCountdownTimer); _solCountdownTimer=null; }
  var lbl=document.getElementById('solDateLbl');
  if(lbl){
    var d=new Date();
    var meses=['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'];
    lbl.textContent='Reto del '+d.getDate()+' de '+meses[d.getMonth()];
  }
  document.getElementById('solOverlay').classList.add('active');
  if(sd.done&&sd.date===today){
    _solState=null;
    _solRenderDone();
  } else {
    _solNewGame();
    _solRender();
  }
}

function closeSolitario(){
  document.getElementById('solOverlay').classList.remove('active');
  _solState=null; _solSel=null; _solHelpOpen=false;
  if(_solCountdownTimer){ clearInterval(_solCountdownTimer); _solCountdownTimer=null; }
}

var _solHelpSlide = 0;
var _solHelpOpen = false;
var _solCountdownTimer = null;
var _SOL_SLIDES = [
  {
    icon: '🎯',
    title: 'OBJETIVO',
    body: 'Llena las <b>4 fundaciones</b> de la esquina superior derecha con todas las cartas de su rareza, del <b>1 al 8</b>.<br>¡Llénalas todas y ganas!'
  },
  {
    icon: '🎨',
    title: 'LOS COLORES',
    body: 'Hay 4 rarezas que actúan como palos. Son opuestas de a pares:',
    colors: [
      {label:'Normal', color:'#5aabff', opp:'Épico', oppColor:'#ff8c42'},
      {label:'Raro',   color:'#4adb6e', opp:'Mítico', oppColor:'#b06ffc'},
    ]
  },
  {
    icon: '📋',
    title: 'APILAR EN COLUMNAS',
    body: 'Puedes colocar una carta sobre otra si tiene <b>1 valor menos</b> y es de <b>color opuesto</b>.<br><br>Ejemplo: un <b style="color:#ff8c42">4 Épico</b> va sobre un <b style="color:#5aabff">5 Normal</b>.'
  },
  {
    icon: '🂠',
    title: 'STOCK Y DESCARTE',
    body: 'Toca el <b>mazo morado</b> (arriba izquierda) para voltear una carta al descarte.<br><br>Si el mazo se vacía, tócalo de nuevo para <b>reciclar</b> el descarte. Puedes hacerlo <b>sin límite</b> de veces.<br><br>Las cartas boca abajo en columnas se <b>voltean solas</b> cuando quedan en la cima.'
  },
  {
    icon: '🏆',
    title: 'RECOMPENSA',
    body: 'Completa el solitario del día para ganar <b>+30 monedas</b> y <b>+30 XP</b>.<br><br>El reto cambia cada día con un mazo diferente. ¡Vuelve mañana!'
  }
];

function _solShowHelp(){
  if(_solHelpOpen){ _solHelpOpen=false; _solRender(); return; }
  _solHelpOpen=true; _solHelpSlide=0; _solRenderHelp();
}

function _solCloseHelp(){
  _solHelpOpen=false; _solRender();
}

function _solHelpNav(dir){
  _solHelpSlide = Math.max(0, Math.min(_SOL_SLIDES.length-1, _solHelpSlide + dir));
  _solRenderHelp();
}

function _solRenderHelp(){
  var el = document.getElementById('solBody');
  if(!el) return;
  var s = _SOL_SLIDES[_solHelpSlide];
  var isLast = _solHelpSlide === _SOL_SLIDES.length-1;
  var total = _SOL_SLIDES.length;

  var extrasHtml = '';
  if(s.colors){
    extrasHtml += '<div style="display:flex;flex-direction:column;gap:.5rem;margin:.2rem 0">';
    s.colors.forEach(function(c){
      extrasHtml += '<div style="display:flex;align-items:center;gap:.5rem">'
        +'<span style="flex:1;padding:.3rem .7rem;border-radius:8px;background:'+c.color+'18;color:'+c.color+';border:.5px solid '+c.color+'44;font-size:11px;font-weight:700;text-align:center">'+c.label+'</span>'
        +'<span style="font-size:13px;color:var(--text-muted)">↔</span>'
        +'<span style="flex:1;padding:.3rem .7rem;border-radius:8px;background:'+c.oppColor+'18;color:'+c.oppColor+';border:.5px solid '+c.oppColor+'44;font-size:11px;font-weight:700;text-align:center">'+c.opp+'</span>'
        +'</div>';
    });
    extrasHtml += '</div>';
  }

  el.innerHTML =
    '<div style="display:flex;flex-direction:column;gap:.8rem;padding:.4rem .2rem;flex:1">'
    +'<div class="tutg-step">PASO '+(_solHelpSlide+1)+' DE '+total+'</div>'
    +'<div class="tutg-title">'+s.icon+' '+s.title+'</div>'
    +'<div class="tutg-body" style="font-size:12px;line-height:1.65">'+s.body+'</div>'
    +extrasHtml
    +'</div>'
    +'<div style="display:flex;flex-direction:column;gap:.5rem;padding-top:.4rem">'
    +'<button class="tutg-btn-next" onclick="'+(isLast?'_solCloseHelp()':'_solHelpNav(1)')+'">'+(isLast?'¡Entendido!':'Siguiente →')+'</button>'
    +(_solHelpSlide>0
      ? '<button class="tutg-btn-exit" onclick="_solHelpNav(-1)">← Paso anterior</button>'
      : '<button class="tutg-btn-exit" onclick="_solCloseHelp()">Saltar guía</button>')
    +'</div>';
}

function renderStats(){
  var s = _loadStats();
  function set(id,val){ var el=document.getElementById(id); if(el) el.textContent=val; }
  set('st-coins',   s.coins||0);
  set('st-matches', s.matches);
  set('st-wins',    s.wins);
  set('st-losses',  s.losses);
  set('st-draws',   s.draws);
  set('st-kos',  s.kos);
  set('st-std',  s.winsStandard);
  var bw = s.bossWins||{};
  var totalBossWins = (bw['b0']||0)+(bw['b-1']||0)+(bw['b-2']||0);
  set('st-boss', totalBossWins);
  var bossGrid = document.getElementById('st-bosses-grid');
  if(bossGrid){
    bossGrid.innerHTML = BOSSES.map(function(b){
      var won = (bw['b'+b.id]||0) > 0;
      return '<div class="profile-boss-cell '+(won?'defeated':'pending')+'">'
        +'<div class="profile-boss-name">'+b.name+'</div>'
        +'<div class="profile-boss-status">'+(won?'✓ DERROTADO':'PENDIENTE')+'</div>'
        +'</div>';
    }).join('');
  }
  set('st-ffa',     s.winsFFA);
  set('st-epl',     s.endlessPlayed||0);
  set('st-ekl',     s.endlessKills||0);
  set('st-ebst',    s.endlessBest ? s.endlessBest+' oleadas' : '—');
  set('st-mplayed', s.mundialPlayed);
  set('st-mwins',   s.mundialWins);
  set('st-mbest',   _roundDisplayLabel(s.mundialBest,'mundial'));
  set('st-cbj',     s.casinoWinsBJ||0);
  set('st-cduelo',  s.casinoWinsDuelo||0);
  set('st-cpoi',    s.casinoWinsPoi||0);
  set('st-cdisco',  s.casinoWinsDisco||0);
  set('st-ctriada', s.casinoWinsTriada||0);
  set('st-pbj',     s.casinoPlayedBJ||0);
  set('st-pduelo',  s.casinoPlayedDuelo||0);
  set('st-ppoi',    s.casinoPlayedPoi||0);
  set('st-pdisco',  s.casinoPlayedDisco||0);
  set('st-ptriada', s.casinoPlayedTriada||0);
  set('st-casino-total', (s.casinoPlayedBJ||0)+(s.casinoPlayedDuelo||0)+(s.casinoPlayedPoi||0)+(s.casinoPlayedDisco||0)+(s.casinoPlayedTriada||0));
  set('st-lplayed', s.ligaPlayed);
  set('st-lwins',   s.ligaWins);
  set('st-lbest',   _roundDisplayLabel(s.ligaBest,'liga'));
  _renderChampHistory('m', s.mundialHistory||[], 'Mundial');
  _renderChampHistory('l', s.ligaHistory||[], 'Liga');
}

var _champHistPage = { m:0, l:0 };
var _CHAMP_PAGE_SIZE = 5;

function _renderChampHistory(key, hist, label){
  var wrap = document.getElementById('st-'+key+'hist-wrap');
  var list = document.getElementById('st-'+key+'hist-list');
  var nav  = document.getElementById('st-'+key+'hist-nav');
  if(!wrap || !list || !nav) return;
  if(!hist || hist.length === 0){ wrap.style.display='none'; return; }
  wrap.style.display = '';
  var page = _champHistPage[key]||0;
  var pages = Math.ceil(hist.length/_CHAMP_PAGE_SIZE);
  if(page >= pages) page = pages-1;
  _champHistPage[key] = page;
  var start = page*_CHAMP_PAGE_SIZE;
  var slice = hist.slice().reverse().slice(start, start+_CHAMP_PAGE_SIZE);
  list.innerHTML = slice.map(function(e){
    var icon = e.won ? '🏆' : '👑';
    var nameColor = e.won ? 'color:#f0c040;font-weight:700' : 'color:var(--text);font-weight:600';
    return '<div style="display:flex;align-items:center;justify-content:space-between;padding:.25rem .5rem;background:var(--surface);border:.5px solid var(--border);border-radius:7px;margin-bottom:.2rem;font-size:11px">'
      +'<span style="color:var(--text-dim);min-width:36px">Ed. '+e.ed+'</span>'
      +'<span style="'+nameColor+';flex:1;text-align:center">'+icon+' '+e.name+'</span>'
      +'<span style="color:var(--text-dim)">'+e.date+'</span>'
      +'</div>';
  }).join('');
  nav.innerHTML = '';
  if(pages > 1){
    if(page > 0){
      var pb = document.createElement('button');
      pb.className='btn'; pb.style.fontSize='11px'; pb.style.padding='3px 10px';
      pb.textContent='◀'; pb.onclick=(function(k){ return function(){ _champHistPage[k]--; renderStats(); }; })(key);
      nav.appendChild(pb);
    }
    var pg = document.createElement('span');
    pg.style.cssText='font-size:10px;color:var(--text-dim);align-self:center';
    pg.textContent=(page+1)+'/'+pages;
    nav.appendChild(pg);
    if(page < pages-1){
      var nb = document.createElement('button');
      nb.className='btn'; nb.style.fontSize='11px'; nb.style.padding='3px 10px';
      nb.textContent='▶'; nb.onclick=(function(k){ return function(){ _champHistPage[k]++; renderStats(); }; })(key);
      nav.appendChild(nb);
    }
  }
}

