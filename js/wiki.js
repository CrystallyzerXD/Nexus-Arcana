/* ═══════════════════════════════════════════════
   WIKI DE CARTAS
═══════════════════════════════════════════════ */
var _wikiFilter = 'Todos';
var _wikiSelectedId = null;
var _wikiPage = 0;
var _WIKI_PAGE_SIZE = 10;

// Colores por rareza (mirror del generador de cartas)
var _WIKI_RARITIES = [
  null,
  {name:"Normal",   hp:50,   border:"#4a90d9", star:"#4a90d9",  bg:"#060d1a", frame:"#1a3a5c", badge:{bg:"#0a1830",fg:"#7ec8ff"}},
  {name:"Normal",   hp:100,  border:"#4a90d9", star:"#4a90d9",  bg:"#060d1a", frame:"#1a3a5c", badge:{bg:"#0a1830",fg:"#7ec8ff"}},
  {name:"Raro",     hp:150,  border:"#4ac97a", star:"#4ac97a",  bg:"#060f0a", frame:"#1a4a2a", badge:{bg:"#0a2018",fg:"#7affa8"}},
  {name:"Raro",     hp:200,  border:"#4ac97a", star:"#4ac97a",  bg:"#060f0a", frame:"#1a4a2a", badge:{bg:"#0a2018",fg:"#7affa8"}},
  {name:"Épico",    hp:250,  border:"#EF9F27", star:"#EF9F27",  bg:"#0f0a04", frame:"#4a2a00", badge:{bg:"#2a1800",fg:"#ffcc66"}},
  {name:"Épico",    hp:300,  border:"#EF9F27", star:"#EF9F27",  bg:"#0f0a04", frame:"#4a2a00", badge:{bg:"#2a1800",fg:"#ffcc66"}},
  {name:"Mítico",   hp:350,  border:"#9b59f7", star:"#9b59f7",  bg:"#0a060f", frame:"#2a0a4a", badge:{bg:"#180a30",fg:"#cc99ff"}},
  {name:"Mítico",   hp:400,  border:"#9b59f7", star:"#9b59f7",  bg:"#0a060f", frame:"#2a0a4a", badge:{bg:"#180a30",fg:"#cc99ff"}},
  {name:"Especial", hp:500,  border:"#f76eb2", star:"#f76eb2",  bg:"#0f060a", frame:"#4a0a2a", badge:{bg:"#300818",fg:"#ff99cc"}},
  {name:"Legendario",hp:1000,border:"#ff4444", star:"#ff6644",  bg:"#0f0606", frame:"#4a0000", badge:{bg:"#300000",fg:"#ff9988"}},
];

function _wikiRarityData(stars){
  return _WIKI_RARITIES[stars] || _WIKI_RARITIES[1];
}

// Versión wiki de los jefes (con imagen cargada desde img/)
var _WIKI_BOSS_IDS = {0:100, '-1':200, '-2':300};
var _WIKI_BOSSES = BOSSES.map(function(b){
  return Object.assign({}, b, {
    image: 'img/'+b.name.toLowerCase()+'.png',
    id: _WIKI_BOSS_IDS[String(b.id)]
  });
});

function _wikiAllCards(){
  return CARD_POOL.concat(_WIKI_BOSSES);
}

function openWiki(){
  showScreen('wikiScreen');
  // Asegurar que la pestaña activa sea Guía al abrir
  var cw = document.getElementById('wikiContentWrap');
  var aw = document.getElementById('atlasContentWrap');
  if(cw) cw.style.display='flex';
  if(aw) aw.style.display='none';
  document.querySelectorAll('.wiki-tab').forEach(function(b){ b.classList.remove('active'); });
  var tg = document.getElementById('tabGuia');
  if(tg) tg.classList.add('active');
  wikiRenderList();
  if(_wikiSelectedId) wikiSelectCard(_wikiSelectedId);
}

function wikiSwitchTab(tab){
  var cw = document.getElementById('wikiContentWrap');
  var aw = document.getElementById('atlasContentWrap');
  if(cw) cw.style.display = tab==='guia' ? 'flex' : 'none';
  if(aw) aw.style.display = tab==='atlas' ? 'flex' : 'none';
  document.querySelectorAll('.wiki-tab').forEach(function(b){ b.classList.remove('active'); });
  var active = document.getElementById(tab==='guia' ? 'tabGuia' : 'tabAtlas');
  if(active) active.classList.add('active');
  if(tab==='atlas' && typeof openAtlas === 'function') openAtlas();
}

function wikiSetFilter(btn){
  _wikiFilter = btn.dataset.rarity;
  _wikiPage = 0;
  document.querySelectorAll('.wiki-filter').forEach(function(b){ b.classList.remove('active'); });
  btn.classList.add('active');
  wikiRenderList();
}

function wikiChangePage(delta){
  _wikiPage += delta;
  wikiRenderList();
}

function wikiRenderList(){
  var query = (document.getElementById('wikiSearch').value||'').toLowerCase();
  var list = document.getElementById('wikiList');
  if(!list) return;

  var filtered = _wikiAllCards().filter(function(c){
    var matchRarity = _wikiFilter==='Todos' || c.rarity===_wikiFilter;
    var matchQuery = !query || c.name.toLowerCase().indexOf(query)>=0;
    return matchRarity && matchQuery;
  }).sort(function(a,b){
    var sd = (a.stars||1)-(b.stars||1);
    if(sd) return sd;
    if(a.id>=100 && b.id>=100) return a.id-b.id;
    return a.name.localeCompare(b.name);
  });

  var totalPages = Math.max(1, Math.ceil(filtered.length / _WIKI_PAGE_SIZE));
  _wikiPage = Math.max(0, Math.min(_wikiPage, totalPages - 1));

  var start = _wikiPage * _WIKI_PAGE_SIZE;
  var pageItems = filtered.slice(start, start + _WIKI_PAGE_SIZE);

  list.innerHTML = '';
  pageItems.forEach(function(c){
    var r = _wikiRarityData(c.stars||1);
    var unlocked = _isCardUnlocked(c.id);
    var div = document.createElement('div');
    div.className = 'wiki-card-item' + (c.id===_wikiSelectedId?' selected':'') + (unlocked?'':' wiki-locked');
    div.dataset.id = c.id;
    if(unlocked){
      div.innerHTML =
        '<div class="wiki-item-dot" style="background:'+r.border+'"></div>'+
        '<span class="wiki-item-name">'+c.name+'</span>'+
        '<span class="wiki-item-stars" style="color:'+r.star+'">'+('★'.repeat(c.stars||1))+'</span>';
      div.onclick = function(){ wikiSelectCard(c.id); };
    } else {
      var isStore = _STORE_CARD_IDS.indexOf(c.id) !== -1;
      div.innerHTML =
        '<div class="wiki-item-dot" style="background:#444"></div>'+
        '<span class="wiki-item-name" style="color:var(--text-dim)">🔒 '+c.name+'</span>'+
        '<span class="wiki-item-stars" style="color:#555">'+('★'.repeat(c.stars||1))+'</span>';
      div.title = isStore ? 'Desbloquea esta carta en la Tienda' : 'Desbloquea esta carta con logros';
      div.style.cursor = 'default';
    }
    list.appendChild(div);
  });

  // Actualizar controles de paginación
  var label = document.getElementById('wikiPageLabel');
  var prev  = document.getElementById('wikiPrevBtn');
  var next  = document.getElementById('wikiNextBtn');
  if(label) label.textContent = (_wikiPage+1) + ' / ' + totalPages;
  if(prev)  prev.disabled  = (_wikiPage === 0);
  if(next)  next.disabled  = (_wikiPage >= totalPages - 1);
}

function wikiSelectCard(cardId){
  _wikiSelectedId = cardId;
  // Actualizar selección visual en la lista
  document.querySelectorAll('.wiki-card-item').forEach(function(el){
    el.classList.toggle('selected', parseInt(el.dataset.id)===cardId);
  });
  var card = _wikiAllCards().find(function(c){ return c.id===cardId; });
  if(!card) return;

  var right = document.getElementById('wikiRight');
  right.innerHTML =
    '<div class="wiki-canvas-wrap"><canvas id="wikiCanvas" width="520" height="760"></canvas></div>'+
    '<div class="wiki-detail" id="wikiDetail"></div>';

  // Dibujar carta en canvas
  wikiDrawCard(card);
  // Rellenar detalle textual
  wikiRenderDetail(card);
}

function wikiDrawCard(card){
  var canvas = document.getElementById('wikiCanvas');
  if(!canvas) return;
  var ctx = canvas.getContext('2d');
  var W=520, H=760;
  var r = _wikiRarityData(card.stars||1);
  var isLeg = (card.stars||1)===10;

  ctx.clearRect(0,0,W,H);

  // Fondo
  ctx.fillStyle = r.bg;
  _wikiRoundRect(ctx,0,0,W,H,28); ctx.fill();

  // Borde exterior
  ctx.strokeStyle = r.border;
  ctx.lineWidth = isLeg?6:4;
  _wikiRoundRect(ctx,5,5,W-10,H-10,24); ctx.stroke();

  // Borde interior
  ctx.strokeStyle = r.border+'44';
  ctx.lineWidth=1;
  _wikiRoundRect(ctx,13,13,W-26,H-26,20); ctx.stroke();
  if(isLeg){
    ctx.strokeStyle=r.border+'22'; ctx.lineWidth=1;
    _wikiRoundRect(ctx,20,20,W-40,H-40,16); ctx.stroke();
  }

  // Header
  ctx.fillStyle = r.frame+'cc';
  ctx.beginPath();
  ctx.moveTo(33,13); ctx.lineTo(W-33,13);
  ctx.quadraticCurveTo(W-13,13,W-13,33);
  ctx.lineTo(W-13,70); ctx.lineTo(13,70);
  ctx.lineTo(13,33); ctx.quadraticCurveTo(13,13,33,13);
  ctx.closePath(); ctx.fill();

  ctx.font="bold 26px 'Cinzel',serif"; ctx.fillStyle='#f0e8c8'; ctx.textAlign='left';
  ctx.fillText(card.name, 28, 52);
  ctx.font="bold 20px 'Cinzel',serif"; ctx.fillStyle=r.border; ctx.textAlign='right';
  ctx.fillText(card.hp+' hp', W-26, 52);

  // Imagen
  var imgY=72, imgH=280;
  if(card.image){
    var img=new Image();
    img.onload=function(){
      var iw=img.naturalWidth, ih=img.naturalHeight;
      var scale=Math.max((W-26)/iw, imgH/ih);
      var dw=iw*scale, dh=ih*scale;
      var dx=13+((W-26)-dw)/2, dy=imgY+(imgH-dh)/2;
      ctx.save();
      _wikiRoundRect(ctx,13,imgY,W-26,imgH,0); ctx.clip();
      ctx.drawImage(img,dx,dy,dw,dh);
      ctx.restore();
      ctx.fillStyle='rgba(0,0,0,0.22)';
      _wikiRoundRect(ctx,13,imgY,W-26,imgH,0); ctx.fill();
      ctx.strokeStyle=r.border+'66'; ctx.lineWidth=1;
      ctx.strokeRect(13,imgY,W-26,imgH);
      _wikiDrawCardBottom(ctx,W,H,card,r,isLeg,imgY,imgH);
    };
    img.onerror=function(){ _wikiDrawImgPlaceholder(ctx,W,imgY,imgH,r); _wikiDrawCardBottom(ctx,W,H,card,r,isLeg,imgY,imgH); };
    img.src=card.image;
  } else {
    _wikiDrawImgPlaceholder(ctx,W,imgY,imgH,r);
    _wikiDrawCardBottom(ctx,W,H,card,r,isLeg,imgY,imgH);
  }
}

function _wikiDrawImgPlaceholder(ctx,W,imgY,imgH,r){
  ctx.fillStyle=r.frame+'55'; _wikiRoundRect(ctx,13,imgY,W-26,imgH,0); ctx.fill();
  ctx.font='72px serif'; ctx.fillStyle=r.border+'33'; ctx.textAlign='center';
  ctx.fillText('?',W/2,imgY+imgH/2+24);
  ctx.strokeStyle=r.border+'66'; ctx.lineWidth=1; ctx.strokeRect(13,imgY,W-26,imgH);
}

function _wikiDrawCardBottom(ctx,W,H,card,r,isLeg,imgY,imgH){
  var stars=card.stars||1;
  // ID badge
  var idStr='#'+String(card.id).padStart(3,'0');
  ctx.font="bold 13px 'Cinzel',serif"; ctx.textAlign='left';
  var idW=ctx.measureText(idStr).width+16;
  ctx.fillStyle='#000000bb'; _wikiRoundRect(ctx,13,imgY,idW,24,0); ctx.fill();
  ctx.fillStyle=r.border; ctx.fillText(idStr,22,imgY+16);

  // Estrellas
  var starY=imgY+imgH+24;
  var starSize=isLeg?20:22, starGap=isLeg?22:24;
  var totalW=stars*starGap-(starGap-starSize);
  var sx=(W-totalW)/2;
  ctx.font=starSize+'px serif'; ctx.textAlign='left'; ctx.fillStyle=r.star;
  for(var i=0;i<stars;i++){ ctx.fillText('★',sx,starY); sx+=starGap; }

  // Badge rareza
  var badgeY=starY+10;
  ctx.font="bold 13px 'Cinzel',serif"; ctx.textAlign='center';
  var bw=ctx.measureText(r.name).width+28, bx=(W-bw)/2;
  ctx.fillStyle=r.badge.bg; _wikiRoundRect(ctx,bx,badgeY,bw,26,13); ctx.fill();
  ctx.strokeStyle=r.border+'88'; ctx.lineWidth=0.5; _wikiRoundRect(ctx,bx,badgeY,bw,26,13); ctx.stroke();
  ctx.fillStyle=r.badge.fg; ctx.fillText(r.name,W/2,badgeY+17);

  // Divider
  var divY=badgeY+42;
  ctx.strokeStyle=r.border+'33'; ctx.lineWidth=1;
  ctx.beginPath(); ctx.moveTo(28,divY); ctx.lineTo(W-28,divY); ctx.stroke();

  // Ataques
  var atkY=divY+22; ctx.textAlign='left';
  var atks=(card.attacks||[]).filter(function(a){return a&&a.name;});
  atks.forEach(function(a,idx){
    if(idx>0){
      ctx.strokeStyle=r.border+'22'; ctx.lineWidth=0.5;
      ctx.beginPath(); ctx.moveTo(28,atkY-2); ctx.lineTo(W-28,atkY-2); ctx.stroke();
      atkY+=10;
    }
    ctx.font="bold 15px 'Cinzel',serif"; ctx.fillStyle=r.border; ctx.fillText('▸',26,atkY);
    ctx.font="14px 'Crimson Pro',serif"; ctx.fillStyle='#d0c8b0';
    var line=_wikiAtkLine(a);
    atkY=_wikiWrapText(ctx,line,44,atkY,W-70,19)+6;
  });

  // Descripción / flavor
  if(card.description){
    ctx.strokeStyle=r.border+'22'; ctx.lineWidth=0.5;
    ctx.beginPath(); ctx.moveTo(28,atkY+8); ctx.lineTo(W-28,atkY+8); ctx.stroke();
    ctx.font="italic 13px 'Crimson Pro',serif"; ctx.fillStyle=r.border+'aa'; ctx.textAlign='center';
    _wikiWrapText(ctx,'“'+card.description+'”',W/2-(W-80)/2+(W-80)/2,atkY+26,W-80,18);
  }
}

function _wikiAtkLine(a){
  var dur=function(t){ return t===0||t===-1?'∞':'×'+(t||3); };
  switch(a.type){
    case 'direct':{
      var s=a.name+' (-'+a.value+' hp)';
      if(a.selfDmg>0) s+=' / -'+(a.selfDmgType==='pct_max'?a.selfDmg+'% HP máx':a.selfDmgType==='pct'?a.selfDmg+'% HP actual':a.selfDmg+' hp')+' propio';
      if(a.selfHeal>0) s+=' / +'+a.selfHeal+' hp absorción';
      if(a.lifeSteal>0) s+=' / +'+a.lifeSteal+'% robo de vida';
      return s;
    }
    case 'dot':       return a.name+': -'+a.value+' hp/turno ('+dur(a.turns)+')';
    case 'regen':     return a.name+': +'+a.value+' hp/turno ('+dur(a.turns)+')';
    case 'cumulative':return a.name+': -'+a.value+' hp acum.';
    case 'shield':    return a.name+': -'+a.value+'% daño ('+(a.turns===0||a.turns===-1?'∞':a.turns+' turnos')+')';
    case 'prob':      return a.name+' ('+a.prob+'%): -'+a.value+' hp'+(a.consequence>0?' / falla: -'+a.consequence+' propio':'');
    default:          return a.name;
  }
}

function _wikiWrapText(ctx,text,x,y,maxW,lineH){
  var words=text.split(' '), line='', cy=y;
  for(var i=0;i<words.length;i++){
    var w=words[i];
    var test=line?line+' '+w:w;
    if(ctx.measureText(test).width>maxW&&line){ ctx.fillText(line,x,cy); line=w; cy+=lineH; }
    else line=test;
  }
  if(line) ctx.fillText(line,x,cy);
  return cy+lineH;
}

function _wikiRoundRect(ctx,x,y,w,h,r){
  ctx.beginPath();
  ctx.moveTo(x+r,y); ctx.lineTo(x+w-r,y);
  ctx.quadraticCurveTo(x+w,y,x+w,y+r);
  ctx.lineTo(x+w,y+h-r); ctx.quadraticCurveTo(x+w,y+h,x+w-r,y+h);
  ctx.lineTo(x+r,y+h); ctx.quadraticCurveTo(x,y+h,x,y+h-r);
  ctx.lineTo(x,y+r); ctx.quadraticCurveTo(x,y,x+r,y);
  ctx.closePath();
}

function wikiRenderDetail(card){
  var detail = document.getElementById('wikiDetail');
  if(!detail) return;
  var r = _wikiRarityData(card.stars||1);
  var starsStr = ('★').repeat(card.stars||1);
  var atks = (card.attacks||[]).filter(function(a){ return a&&a.name; });

  function atkValLabel(a){
    var dur=function(t){ return t===0||t===-1?'∞':(t||3)+' turnos'; };
    switch(a.type){
      case 'direct':{
        var s='-'+a.value+' HP';
        if(a.selfDmg>0) s+=' / -'+(a.selfDmgType==='pct_max'?a.selfDmg+'% HP máx':a.selfDmg+' HP')+' propio';
        if(a.selfHeal>0) s+=' / +'+a.selfHeal+' HP absorción';
        if(a.lifeSteal>0) s+=' / +'+a.lifeSteal+'% robo de vida';
        return s;
      }
      case 'dot':       return '-'+a.value+' HP/turno · '+dur(a.turns);
      case 'regen':     return '+'+a.value+' HP/turno · '+dur(a.turns);
      case 'cumulative':return '-'+a.value+' HP acum.';
      case 'shield':    return '-'+a.value+'% daño · '+dur(a.turns);
      case 'prob':      return a.prob+'%: -'+a.value+' HP'+(a.consequence>0?' / falla: -'+a.consequence:'');
      default:          return '';
    }
  }

  var atksHtml = atks.map(function(a){
    return '<div class="wiki-atk">'
      +'<div class="wiki-atk-name"><span>'+a.name+'</span>'
      +'<span class="wiki-atk-val" style="color:'+r.border+'">'+atkValLabel(a)+'</span></div>'
      +(a.description?'<div class="wiki-atk-desc">'+a.description+'</div>':'')
      +'</div>';
  }).join('');

  // ── Maestría & stats por carta (no aplica a Legendarios de 10★) ──
  if(card.stars >= 10) {
    detail.innerHTML =
      '<div class="wiki-detail-name" style="color:'+r.border+'">'+card.name+'</div>'+
      '<div class="wiki-detail-meta"><span style="color:'+r.star+'">'+starsStr+'</span> &nbsp;·&nbsp; '+r.name+' &nbsp;·&nbsp; '+card.hp+' HP</div>'+
      (card.description?'<div class="wiki-detail-desc">«'+card.description+'»</div>':'')+
      '<div style="font-family:var(--font-title);font-size:9px;letter-spacing:.1em;color:var(--text-dim);margin-top:.2rem">ATAQUES</div>'+
      '<div class="wiki-atk-list">'+atksHtml+'</div>';
    return;
  }
  var _cs  = (typeof _loadCardStats === 'function') ? _loadCardStats() : {};
  var _cst = _cs[String(card.id)] || { wins:0, losses:0, kos:0, matchesPlayed:0 };
  var _mxp = (typeof _masteryXP === 'function') ? _masteryXP(_cst) : 0;
  var _mlv = (typeof _masteryLevel === 'function') ? _masteryLevel(_mxp) : 1;
  var _isMaxMastery = _mlv >= (typeof _MASTERY_MAX_LEVEL !== 'undefined' ? _MASTERY_MAX_LEVEL : 10);
  var _min = (!_isMaxMastery && typeof _masteryXPInLevel === 'function') ? _masteryXPInLevel(_mxp) : 0;
  var _mnt = (!_isMaxMastery && typeof _masteryXPToNext === 'function') ? _masteryXPToNext(_mlv) : 100;
  var _pct = _isMaxMastery ? 100 : Math.min(100, Math.round(_min / _mnt * 100));
  var _masteryHtml =
    '<div class="wiki-mastery-block">'+
      '<div class="wiki-mastery-header">'+
        '<span style="font-family:var(--font-title);font-size:9px;letter-spacing:.1em;color:var(--text-dim)">MAESTRÍA</span>'+
        '<span class="wiki-mastery-lvl" style="color:'+r.border+'">Nv '+_mlv+(_isMaxMastery?' ★':'')+'</span>'+
      '</div>'+
      '<div class="wiki-mastery-bar-wrap">'+
        '<div class="wiki-mastery-bar" style="width:'+_pct+'%;background:'+r.border+'"></div>'+
      '</div>'+
      '<div class="wiki-mastery-xpline">'+(_isMaxMastery ? 'Nivel máximo' : _min+' / '+_mnt+' XP')+'</div>'+
      '<div class="wiki-card-stats">'+
        '<span>🏆 '+_cst.wins+'</span>'+
        '<span>💀 '+_cst.losses+'</span>'+
        '<span>⚔️ '+_cst.kos+' KOs</span>'+
        '<span>🎮 '+_cst.matchesPlayed+' partidas</span>'+
      '</div>'+
    '</div>';

  detail.innerHTML =
    '<div class="wiki-detail-name" style="color:'+r.border+'">'+card.name+'</div>'+
    '<div class="wiki-detail-meta"><span style="color:'+r.star+'">'+starsStr+'</span> &nbsp;·&nbsp; '+r.name+' &nbsp;·&nbsp; '+card.hp+' HP</div>'+
    (card.description?'<div class="wiki-detail-desc">«'+card.description+'»</div>':'')+
    _masteryHtml+
    '<div style="font-family:var(--font-title);font-size:9px;letter-spacing:.1em;color:var(--text-dim);margin-top:.6rem">ATAQUES</div>'+
    '<div class="wiki-atk-list">'+atksHtml+'</div>';
}

