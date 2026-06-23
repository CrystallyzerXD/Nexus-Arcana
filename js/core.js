/* ═══════════════════════════════════════════════
   STARFIELD
═══════════════════════════════════════════════ */
(function(){
  const c = document.getElementById('stars-canvas');
  const ctx = c.getContext('2d');
  let stars = [];
  const COLORS = [
    [200,190,255], // lila
    [255,255,255], // blanca
    [200,230,255], // azul fría
    [255,230,180], // dorada cálida
  ];
  function mkStar(W,H){
    const col = COLORS[Math.floor(Math.random()*COLORS.length)];
    return {
      x: Math.random()*W, y: Math.random()*H,
      r: Math.random()*1.3+.15,
      a: Math.random()*Math.PI*2,
      speed: Math.random()*.25+.05,
      dx: (Math.random()-.5)*.12,
      dy: (Math.random()-.5)*.06,
      col: col
    };
  }
  function resize(){
    c.width=innerWidth; c.height=innerHeight;
    stars=[];
    for(let i=0;i<200;i++) stars.push(mkStar(c.width,c.height));
  }
  resize(); window.addEventListener('resize',resize);
  function tick(){
    ctx.clearRect(0,0,c.width,c.height);
    stars.forEach(s=>{
      s.a += s.speed*.022;
      s.x += s.dx; s.y += s.dy;
      if(s.x<-2) s.x=c.width+2;
      if(s.x>c.width+2) s.x=-2;
      if(s.y<-2) s.y=c.height+2;
      if(s.y>c.height+2) s.y=-2;
      const op = .25+Math.sin(s.a)*.3+.15;
      ctx.beginPath(); ctx.arc(s.x,s.y,s.r,0,Math.PI*2);
      ctx.fillStyle='rgba('+s.col[0]+','+s.col[1]+','+s.col[2]+','+op.toFixed(2)+')';
      ctx.fill();
    });
    requestAnimationFrame(tick);
  }
  tick();
})();

/* ═══════════════════════════════════════════════
   CARGA DE CARTAS DESDE cartas.json
═══════════════════════════════════════════════ */
/* ═══════════════════════════════════════════════
   SPLASH SCREEN
═══════════════════════════════════════════════ */
var _SPLASH_TIPS = [
  'Las cartas Míticas tienen ataques poderosos, pero son difíciles de conseguir.',
  'En Mano de 3, puedes elegir qué carta jugar cada turno — la estrategia importa más.',
  'Derrotar a un jefe legendario desbloquea su carta en la Guía de Cartas.',
  'Completa logros para ganar monedas y desbloquear cartas exclusivas.',
  'En FFA tres jugadores compiten a la vez — a veces conviene dejar que los otros se eliminen.',
  'El modo Caos cambia las reglas cada turno. ¡Adáptate rápido!',
  'Las cartas Especiales solo puedes tener una en tu mazo.',
  'En Supervivencia Endless, tu mazo no se reinicia entre oleadas. ¡Adminístralo bien!',
  'Ganar el Mundial Nexus con diferentes mazos es todo un reto.',
  'El modo Espejo: ambos jugadores usan las mismas cartas. El orden de cartas es importante.',
  'Las cartas con daño propio pueden ser trampas… o armas secretas.',
  'En modo Rápido, las partidas duran menos. ¡Sin dudar!',
  'Puedes guardar tu progreso del Torneo o Liga y retomarlo después.',
  'Las cartas Épicas tienen buen balance entre poder y disponibilidad.',
  'Un mazo variado con cartas de distintas rarezas suele superar a uno con puras raras.',
];

var _SPLASH_CARD_SLOTS = [
  { left:'5%',  top:'9%',  rot:'-11deg', delay:.05 },  // arriba izq
  { left:'69%', top:'8%',  rot:'9deg',   delay:.18 },  // arriba der
  { left:'5%',  top:'55%', rot:'-8deg',  delay:.28 },  // centro izq
  { left:'74%', top:'51%', rot:'12deg',  delay:.20 },  // centro der
  { left:'40%', top:'6%',  rot:'4deg',   delay:.38 },  // arriba centro
];

function _splashDrawMiniCard(canvas, card){
  // Mismas proporciones que la wiki (520×760) escaladas al 50%
  var W=260, H=380;
  canvas.width=W; canvas.height=H;
  var ctx=canvas.getContext('2d');
  // Escalar fuentes y medidas a la mitad usando transform
  ctx.scale(0.5, 0.5);
  // Redibujar con las mismas dimensiones que wikiDrawCard (520×760)
  var WW=520, HH=760;
  var r=_wikiRarityData(card.stars||1);
  var isLeg=(card.stars||1)===10;

  ctx.fillStyle=r.bg;
  _wikiRoundRect(ctx,0,0,WW,HH,28); ctx.fill();

  ctx.strokeStyle=r.border; ctx.lineWidth=isLeg?6:4;
  _wikiRoundRect(ctx,5,5,WW-10,HH-10,24); ctx.stroke();
  ctx.strokeStyle=r.border+'44'; ctx.lineWidth=1;
  _wikiRoundRect(ctx,13,13,WW-26,HH-26,20); ctx.stroke();
  if(isLeg){
    ctx.strokeStyle=r.border+'22'; ctx.lineWidth=1;
    _wikiRoundRect(ctx,20,20,WW-40,HH-40,16); ctx.stroke();
  }

  // Header
  ctx.fillStyle=r.frame+'cc';
  ctx.beginPath();
  ctx.moveTo(33,13); ctx.lineTo(WW-33,13);
  ctx.quadraticCurveTo(WW-13,13,WW-13,33);
  ctx.lineTo(WW-13,70); ctx.lineTo(13,70);
  ctx.lineTo(13,33); ctx.quadraticCurveTo(13,13,33,13);
  ctx.closePath(); ctx.fill();

  ctx.font="bold 26px 'Cinzel',serif"; ctx.fillStyle='#f0e8c8'; ctx.textAlign='left';
  ctx.fillText(card.name,28,52);
  ctx.font="bold 20px 'Cinzel',serif"; ctx.fillStyle=r.border; ctx.textAlign='right';
  ctx.fillText(card.hp+' hp',WW-26,52);

  // Imagen
  var imgY=72, imgH=280;
  var drawBottom=function(){
    _wikiDrawCardBottom(ctx,WW,HH,card,r,isLeg,imgY,imgH);
  };
  if(card.image){
    var img=new Image();
    img.onload=function(){
      var iw=img.naturalWidth,ih=img.naturalHeight;
      var scale=Math.max((WW-26)/iw,imgH/ih);
      var dw=iw*scale,dh=ih*scale;
      var dx=13+((WW-26)-dw)/2, dy=imgY+(imgH-dh)/2;
      ctx.save();
      _wikiRoundRect(ctx,13,imgY,WW-26,imgH,0); ctx.clip();
      ctx.drawImage(img,dx,dy,dw,dh);
      ctx.restore();
      ctx.fillStyle='rgba(0,0,0,0.22)';
      _wikiRoundRect(ctx,13,imgY,WW-26,imgH,0); ctx.fill();
      ctx.strokeStyle=r.border+'66'; ctx.lineWidth=1;
      ctx.strokeRect(13,imgY,WW-26,imgH);
      drawBottom();
    };
    img.onerror=function(){ _wikiDrawImgPlaceholder(ctx,WW,imgY,imgH,r); drawBottom(); };
    img.src=card.image;
  } else {
    _wikiDrawImgPlaceholder(ctx,WW,imgY,imgH,r);
    drawBottom();
  }
}

function _initSplashCards(){
  // Cartas flotantes — elegir aleatorias del pool base (sin boss)
  var area=document.getElementById('splashCardsArea');
  area.innerHTML='';
  var pool=CARD_POOL.filter(function(c){ return c.stars>=1 && c.stars<=8 && c.id>0; });
  var picked=[];
  while(picked.length<_SPLASH_CARD_SLOTS.length && pool.length){
    var idx=Math.floor(Math.random()*pool.length);
    picked.push(pool.splice(idx,1)[0]);
  }
  picked.forEach(function(card,i){
    var slot=_SPLASH_CARD_SLOTS[i];
    var wrap=document.createElement('div');
    wrap.className='splash-float-card';
    wrap.style.cssText='left:'+slot.left+';top:'+slot.top+
      ';--rot:'+slot.rot+
      ';--delay:'+slot.delay+'s';
    var cv=document.createElement('canvas');
    cv.style.cssText='width:100%;height:auto;display:block;';
    wrap.appendChild(cv);
    area.appendChild(wrap);
    _splashDrawMiniCard(cv,card);
  });
}

function _dismissSplash(){
  var el=document.getElementById('splashScreen');
  if(!el) return;
  el.classList.add('hiding');
  setTimeout(function(){ el.style.display='none'; },750);
}

async function initApp(){
  var _splashStart = Date.now();
  var MIN_SPLASH = 3500;
  var loaderBar = document.getElementById('splashLoaderBar');

  // Tip aleatorio antes de cargar (CARD_POOL vacío aún)
  var tip = _SPLASH_TIPS[Math.floor(Math.random()*_SPLASH_TIPS.length)];
  document.getElementById('splashTipText').textContent = tip;

  try {
    const resp = await fetch('cartas.json');
    if(!resp.ok) throw new Error('HTTP '+resp.status);
    const raw = await resp.json();
    CARD_POOL = raw.map(c=>({
      ...c,
      image: c.image ? 'img/'+c.image : null,
      maxHp: c.hp
    }));
  } catch(e){
    console.error('[Nexus Arcana] No se pudo cargar cartas.json:', e);
    document.body.insertAdjacentHTML('beforeend',
      '<div style="position:fixed;inset:0;z-index:9999;display:flex;align-items:center;justify-content:center;background:#04040c;color:#e08080;font-family:serif;font-size:1.1rem;text-align:center;padding:2rem">' +
      '⚠ No se pudo cargar <b>cartas.json</b>.<br>Verifica que el archivo exista junto a index.html.</div>');
    return;
  }


  // Cartas flotantes con el pool ya cargado
  _initSplashCards();

  // Esperar el mínimo de tiempo desde que arrancó el splash, luego mostrar botón
  var waited = Date.now() - _splashStart;
  setTimeout(function(){
    var btn = document.getElementById('splashStartBtn');
    if(btn) btn.style.display = '';
  }, Math.max(0, MIN_SPLASH - waited));
}
var _TUT_LAUNCH_KEY = 'nx_first_launch';

/* ═══════════════════════════════════════════════
   COSMÉTICOS
═══════════════════════════════════════════════ */
var _COSM_KEY = 'nx_cosmetics_v1';

var _COSM_AVATARS = [
  {id:0, name:'Arcano',   src:'img/avatar000.png', lv:1},
  {id:1, name:'Guerrero', src:'img/avatar001.png', lv:10},
  {id:2, name:'Calavera', src:'img/avatar002.png', lv:20},
  {id:3, name:'Dragón',   src:'img/avatar003.png', lv:30},
  {id:4, name:'Sombra',   src:'img/avatar004.png', lv:40},
  {id:5, name:'Corona',   src:'img/avatar005.png', lv:50},
  {id:6, name:'Llama',    src:'img/avatar006.png', lv:75},
  {id:7, name:'Espectro', src:'img/avatar007.png', lv:100},
];

var _COSM_AVBGS = [
  {id:0, name:'Oscuro',   color:'#0d0d14', lv:1},
  {id:1, name:'Púrpura',  color:'#2a1a4a', lv:1},
  {id:2, name:'Azul',     color:'#0d1e3a', lv:10},
  {id:3, name:'Verde',    color:'#0d2e1a', lv:20},
  {id:4, name:'Rojo',     color:'#2e0d0d', lv:30},
  {id:5, name:'Dorado',   color:'#2a1e00', lv:40},
  {id:6, name:'Cian',     color:'#0d2a2a', lv:50},
  {id:7, name:'Rosa',     color:'#2e0d22', lv:60},
];

var _COSM_FRAMES = [
  {id:0, name:'Ninguno',   cls:'',              lv:1,  color:'transparent'},
  {id:1, name:'Plateado',  cls:'frame-silver',  lv:10, color:'#b0b8c4'},
  {id:2, name:'Dorado',    cls:'frame-gold',    lv:30, color:'#e8c46a'},
  {id:3, name:'Púrpura',   cls:'frame-purple',  lv:60, color:'#8b5fd4'},
  {id:4, name:'Espectral', cls:'frame-spectral',lv:90, color:'#a0e0ff'},
];

var _COSM_THEMES = [
  {id:0, name:'Arcano',    cls:'',               lv:1,   color:'#8b5fd4', bg:'#04040c'},
  {id:1, name:'Océano',    cls:'theme-ocean',    lv:20,  color:'#2a8fd4', bg:'#030c14'},
  {id:2, name:'Sangre',    cls:'theme-sangre',   lv:40,  color:'#c43a3a', bg:'#0d0404'},
  {id:3, name:'Dorado',    cls:'theme-dorado',   lv:60,  color:'#c9a84c', bg:'#080700'},
  {id:4, name:'Tinieblas', cls:'theme-tinieblas',lv:80,  color:'#5a5a8a', bg:'#010106'},
  {id:5, name:'Nexus',     cls:'theme-nexus',    lv:100, color:'#d460f0', bg:'#04020e'},
];

var _COSM_TITLES = [
  {id:0, name:'Aprendiz',     color:'#7a7a9e', bg:'rgba(122,122,158,.18)', lv:1},
  {id:1, name:'Combatiente',  color:'#4ac9f6', bg:'rgba(74,201,246,.15)',  lv:10},
  {id:2, name:'Guerrero',     color:'#4ac97a', bg:'rgba(74,201,122,.15)',  lv:20},
  {id:3, name:'Veterano',     color:'#ef9f27', bg:'rgba(239,159,39,.15)',  lv:30},
  {id:4, name:'Experto',      color:'#9b59f7', bg:'rgba(155,89,247,.15)',  lv:40},
  {id:5, name:'Élite',        color:'#f76eb2', bg:'rgba(247,110,178,.15)', lv:50},
  {id:6, name:'Maestro',      color:'#8b5fd4', bg:'rgba(139,95,212,.2)',   lv:60},
  {id:7, name:'Gran Maestro', color:'#e8c46a', bg:'rgba(232,196,106,.2)',  lv:75},
  {id:8, name:'Leyenda',      color:'#ff4444', bg:'rgba(255,68,68,.15)',   lv:90},
  {id:9, name:'Nexus Master', color:'#d460f0', bg:'rgba(212,96,240,.2)',   lv:100},
];

var _COSM_ROULETTES = [
  {id:0, name:'Arcano',     lv:1,  colors:['#1a3d70','#6e1a1a','#311468'],         rim:'#3a3a65', pointer:'#e8c46a', center:'#04040c'},
  {id:1, name:'Inferno',    lv:15, colors:['#8b1a1a','#c45000','#5a0000'],          rim:'#ff6a00', pointer:'#ff4444', center:'#1a0400'},
  {id:2, name:'Abismo',     lv:30, colors:['#0d1e3a','#0a2a1a','#1a0a3a'],          rim:'#4ac9f6', pointer:'#4ac9f6', center:'#020814'},
  {id:3, name:'Dorado',     lv:50, colors:['#3a2800','#5a1a00','#2a1a00'],          rim:'#e8c46a', pointer:'#ffe08a', center:'#1a1000'},
  {id:4, name:'Espectral',  lv:75, colors:['#1a0a3a','#0d2e2e','#2a0a2a'],          rim:'#a0e0ff', pointer:'#a0e0ff', center:'#080414'},
  {id:5, name:'Nexus',      lv:100,colors:['#2a0a3a','#0a1a3a','#1a2a0a'],          rim:'#d460f0', pointer:'#d460f0', center:'#08020e'},
];

function _loadCosmetics(){
  try{ return Object.assign({avatar:0,frame:0,theme:0,title:0,avbg:0,roulette:0},JSON.parse(localStorage.getItem(_COSM_KEY)||'{}')); }
  catch(e){ return {avatar:0,frame:0,theme:0,title:0,avbg:0,roulette:0}; }
}

// Aplicar tema visual apenas carga la página (sin esperar el splash)
(function(){
  try{
    var c = JSON.parse(localStorage.getItem(_COSM_KEY)||'{}');
    var th = _COSM_THEMES[c.theme||0]||_COSM_THEMES[0];
    if(th && th.cls) document.body.classList.add(th.cls);
  }catch(e){}
})();
function _saveCosmetics(c){ try{ localStorage.setItem(_COSM_KEY,JSON.stringify(c)); }catch(e){} }

function _applyCosmetics(){
  var c = _loadCosmetics();
  var av = _COSM_AVATARS[c.avatar]||_COSM_AVATARS[0];
  var fr = _COSM_FRAMES[c.frame]||_COSM_FRAMES[0];
  var th = _COSM_THEMES[c.theme]||_COSM_THEMES[0];
  var ti = _COSM_TITLES[c.title]||_COSM_TITLES[0];
  var bg = _COSM_AVBGS[c.avbg]||_COSM_AVBGS[0];

  // Tema
  document.body.className = document.body.className.replace(/theme-\S+/g,'').trim();
  if(th.cls) document.body.classList.add(th.cls);

  // Avatar en perfil
  var paEl = document.getElementById('profileAvatar');
  if(paEl){
    paEl.style.background = bg.color;
    var img = paEl.querySelector('img');
    if(!img){ img = document.createElement('img'); paEl.innerHTML=''; paEl.appendChild(img); }
    img.src = av.src; img.alt = av.name;
    img.style.cssText = 'width:100%;height:100%;object-fit:contain;image-rendering:pixelated;border-radius:50%;position:relative;z-index:1';
    var frEl = paEl.querySelector('.profile-avatar-frame');
    if(!frEl){ frEl = document.createElement('div'); paEl.appendChild(frEl); }
    frEl.className = 'profile-avatar-frame'+(fr.cls?' '+fr.cls:'');
  }

  // Título cosmético en el badge de rango
  var rk = document.getElementById('profileRank');
  if(rk){ rk.textContent=ti.name.toUpperCase(); rk.style.color=ti.color; }
}

function openCosmeticsScreen(){
  var m = document.getElementById('cosmeticsModal');
  m.style.display = 'flex';
  _renderCosmetics();
}
function closeCosmeticsModal(){
  document.getElementById('cosmeticsModal').style.display = 'none';
  renderProfile();
}

function switchCosmTab(id,el){
  document.querySelectorAll('.cosm-tab').forEach(function(t){t.classList.remove('active');});
  document.querySelectorAll('.cosm-panel').forEach(function(p){p.classList.remove('active');});
  el.classList.add('active');
  document.getElementById('cp-'+id).classList.add('active');
}

function _selCosm(type,id){
  var c = _loadCosmetics();
  c[type] = id;
  _saveCosmetics(c);
  _applyCosmetics();
  _renderCosmetics();
}

function _renderCosmetics(){
  var c = _loadCosmetics();
  var lv = _xpToLevel((_loadStats().xp)||0);
  var av = _COSM_AVATARS[c.avatar]||_COSM_AVATARS[0];
  var fr = _COSM_FRAMES[c.frame]||_COSM_FRAMES[0];
  var ti = _COSM_TITLES[c.title]||_COSM_TITLES[0];
  var bg = _COSM_AVBGS[c.avbg]||_COSM_AVBGS[0];

  // Preview
  var img = document.getElementById('cosmPrevAvImg');
  var fb  = document.getElementById('cosmPrevAvFb');
  if(img){ img.src=av.src; img.style.display='block'; }
  if(fb)  fb.style.display='none';
  var pav = document.getElementById('cosmPrevAv');
  if(pav) pav.style.background = bg.color;
  var pf = document.getElementById('cosmPrevFrame');
  if(pf) pf.className='profile-avatar-frame'+(fr.cls?' '+fr.cls:'');
  var pn = document.getElementById('cosmPrevName');
  if(pn) pn.textContent = _loadP1Name()||'Jugador';
  var pt = document.getElementById('cosmPrevTitle');
  if(pt){ pt.textContent=ti.name; pt.style.background=ti.bg; pt.style.color=ti.color; }

  // Avatares + fondos
  document.getElementById('cp-avatares').innerHTML = '<div class="cosm-grid">'+
    _COSM_AVATARS.map(function(a){
      var locked=lv<a.lv, sel=c.avatar===a.id;
      return '<div class="cosm-item'+(sel?' selected':'')+(locked?' locked':'')+'"'
        +(!locked?' onclick="_selCosm(\'avatar\','+a.id+')"':'')+' title="'+a.name+(locked?' · Nv '+a.lv:'')+'">'
        +'<img src="'+a.src+'" alt="'+a.name+'" style="background:'+bg.color+'">'
        +'<div class="cosm-item-name">'+a.name.toUpperCase()+'</div>'
        +'<div class="cosm-item-lv">'+(a.lv===1?'Base':'Nv '+a.lv)+(locked?' 🔒':'')+'</div>'
        +'<div class="cosm-sel-dot"></div></div>';
    }).join('')+'</div>'
    +'<div style="font-size:9px;letter-spacing:.12em;color:var(--text-muted);margin:.6rem 0 .3rem;font-family:var(--font-title)">FONDO</div>'
    +'<div style="display:flex;gap:.4rem;flex-wrap:wrap">'
    +_COSM_AVBGS.map(function(b){
      var locked=lv<b.lv, sel=c.avbg===b.id;
      return '<div title="'+b.name+(locked?' · Nv '+b.lv:'')+'" style="display:flex;flex-direction:column;align-items:center;gap:2px">'
        +'<div '
        +(!locked?' onclick="_selCosm(\'avbg\','+b.id+')"':'')
        +' style="width:28px;height:28px;border-radius:50%;background:'+b.color+';cursor:'+(locked?'not-allowed':'pointer')
        +';border:2px solid '+(sel?'var(--purple)':'var(--border)')+';opacity:'+(locked?.45:1)
        +';box-shadow:'+(sel?'0 0 0 2px var(--purple)':'none')+'"></div>'
        +'<div style="font-size:8px;color:'+(locked?'var(--text-muted)':'var(--text-dim)')+';font-family:var(--font-title);letter-spacing:.04em;line-height:1">'+(b.lv===1?'Base':'Nv '+b.lv)+(locked?' 🔒':'')+'</div>'
        +'</div>';
    }).join('')+'</div>';

  // Marcos
  document.getElementById('cp-marcos').innerHTML = '<div class="cosm-grid">'+
    _COSM_FRAMES.map(function(f){
      var locked=lv<f.lv, sel=c.frame===f.id;
      return '<div class="cosm-item'+(sel?' selected':'')+(locked?' locked':'')+'"'
        +(!locked?' onclick="_selCosm(\'frame\','+f.id+')"':'')+' title="'+f.name+(locked?' · Nv '+f.lv:'')+'">'
        +'<div class="cosm-frame-prev '+(f.cls||'')+'" style="border:3px solid '+(f.color||'transparent')+'"></div>'
        +'<div class="cosm-item-name">'+f.name.toUpperCase()+'</div>'
        +'<div class="cosm-item-lv">'+(f.lv===1?'Base':'Nv '+f.lv)+(locked?' 🔒':'')+'</div>'
        +'<div class="cosm-sel-dot"></div></div>';
    }).join('')+'</div>';

  // Temas
  document.getElementById('cp-temas').innerHTML = '<div class="cosm-grid">'+
    _COSM_THEMES.map(function(t){
      var locked=lv<t.lv, sel=c.theme===t.id;
      return '<div class="cosm-item'+(sel?' selected':'')+(locked?' locked':'')+'"'
        +(!locked?' onclick="_selCosm(\'theme\','+t.id+')"':'')+' title="'+t.name+(locked?' · Nv '+t.lv:'')+'">'
        +'<div class="cosm-theme-swatch" style="background:'+t.bg+';border:2px solid '+t.color+'">'
        +'<div style="width:16px;height:16px;border-radius:50%;background:'+t.color+'"></div></div>'
        +'<div class="cosm-item-name">'+t.name.toUpperCase()+'</div>'
        +'<div class="cosm-item-lv">'+(t.lv===1?'Base':'Nv '+t.lv)+(locked?' 🔒':'')+'</div>'
        +'<div class="cosm-sel-dot"></div></div>';
    }).join('')+'</div>';

  // Títulos
  document.getElementById('cp-titulos').innerHTML = '<div class="cosm-titles-list">'+
    _COSM_TITLES.map(function(t){
      var locked=lv<t.lv, sel=c.title===t.id;
      return '<div class="cosm-title-item'+(sel?' selected':'')+(locked?' locked':'')+'"'
        +(!locked?' onclick="_selCosm(\'title\','+t.id+')"':'')+' >'
        +'<span style="font-size:12px;color:var(--text);flex:1">'+t.name+'</span>'
        +'<span style="font-size:10px;padding:2px 8px;border-radius:20px;background:'+t.bg+';color:'+t.color+'">'+t.name+'</span>'
        +'<span style="font-size:10px;color:var(--text-muted);min-width:42px;text-align:right">'+(t.lv===1?'Base':'Nv '+t.lv)+(locked?' 🔒':'')+'</span>'
        +'</div>';
    }).join('')+'</div>';

  // Ruleta
  document.getElementById('cp-ruleta').innerHTML =
    '<div style="font-size:9px;color:var(--text-muted);letter-spacing:.12em;margin-bottom:.6rem">SKIN DE RULETA</div>'+
    _COSM_ROULETTES.map(function(r){
      var locked=lv<r.lv, sel=c.roulette===r.id;
      // Mini preview: 3 sectores de color
      var mini='<svg width="44" height="44" viewBox="0 0 44 44" style="flex-shrink:0;border-radius:50%;overflow:hidden">';
      var n=r.colors.length, cx=22, cy=22, rad=20;
      r.colors.forEach(function(col,i){
        var a0=-Math.PI/2+i*(Math.PI*2/n), a1=a0+(Math.PI*2/n);
        var x1=cx+Math.cos(a0)*rad, y1=cy+Math.sin(a0)*rad;
        var x2=cx+Math.cos(a1)*rad, y2=cy+Math.sin(a1)*rad;
        var laf=(a1-a0)>Math.PI?1:0;
        mini+='<path d="M '+cx+' '+cy+' L '+x1+' '+y1+' A '+rad+' '+rad+' 0 '+laf+' 1 '+x2+' '+y2+' Z" fill="'+col+'"/>';
      });
      mini+='<circle cx="'+cx+'" cy="'+cy+'" r="6" fill="'+r.center+'"/>';
      mini+='<circle cx="'+cx+'" cy="'+cy+'" r="20" fill="none" stroke="'+r.rim+'" stroke-width="2.5"/>';
      mini+='</svg>';
      return '<div class="cosm-title-item'+(sel?' selected':'')+(locked?' locked':'')+'"'
        +(!locked?' onclick="_selCosm(\'roulette\','+r.id+')"':'')+' style="gap:.6rem">'
        +mini
        +'<span style="font-size:12px;color:var(--text);flex:1">'+r.name+'</span>'
        +'<span style="font-size:10px;color:var(--text-muted);min-width:42px;text-align:right">'+(r.lv===1?'Base':'Nv '+r.lv)+(locked?' 🔒':'')+'</span>'
        +'</div>';
    }).join('');
}

initApp();

/* ═══════════════════════════════════════════════
   AUDIO
═══════════════════════════════════════════════ */
const bgm = document.getElementById('bgm');
let audioPlaying = false, muted = false;
bgm.volume = 0.4;

function splashStart(){
  _applyCosmetics();
  _loadAudioPrefs();
  _getMainBgm().play().then(function(){
    audioPlaying = true;
    _bgmActive = _getMainBgm();
    var btn = document.getElementById('audioToggle');
    if(btn) btn.textContent = '⏸';
  }).catch(function(){});
  _dismissSplash();
  document.getElementById('audio-widget').classList.add('visible');
  setTimeout(function(){
    renderStats();
    if(!localStorage.getItem(_TUT_LAUNCH_KEY)){
      startInGameTutorial();
    } else {
      showScreen('titleScreen');
    }
  }, 400);
}

// ── SFX ──
var _sfxCarta    = new Audio('sfx_carta.wav');      _sfxCarta.volume     = 0.6;
var _sfxBoton    = new Audio('sfx_boton.wav');      _sfxBoton.volume     = 0.5;
var _sfxSpinWheel= new Audio('sfx_spin_wheel.wav'); _sfxSpinWheel.volume = 0.7;
var _sfxVictoria = new Audio('sfx_victoria.wav');   _sfxVictoria.volume  = 0.8;
var _sfxDerrota  = new Audio('sfx_derrota.wav');    _sfxDerrota.volume   = 0.8;
var _sfxCompra   = new Audio('sfx_compra.wav');     _sfxCompra.volume    = 0.7;
var _sfxDenied      = new Audio('sfx_denied.wav');       _sfxDenied.volume      = 0.7;
var _sfxSpinWheel   = new Audio('sfx_spin_wheel.wav');   _sfxSpinWheel.volume   = 0.8;
var _sfxCompra      = new Audio('sfx_compra.wav');       _sfxCompra.volume      = 0.8;
var _sfxAttack      = new Audio('sfx_attack.wav');       _sfxAttack.volume      = 0.65;
var _sfxPlayerTurn  = new Audio('sfx_player_turn.wav');  _sfxPlayerTurn.volume  = 0.75;
var _sfxVol = 1, _sfxMuted = false;
function _playSfx(sfx){
  if(_sfxMuted) return;
  try{
    if(sfx._base == null) sfx._base = sfx.volume;     // captura el volumen base una vez
    sfx.volume = Math.max(0, Math.min(1, sfx._base * _sfxVol));
    sfx.currentTime = 0; sfx.play().catch(function(){});
  }catch(e){}
}
function setSfxVolume(v){ _sfxVol = Math.max(0, Math.min(1, parseFloat(v)||0)); _saveAudioPrefs(); }
function toggleSfxMute(){ _sfxMuted = !_sfxMuted; _saveAudioPrefs(); }
function playSfxCarta()      { _playSfx(_sfxCarta);      }
function playSfxBoton()      { _playSfx(_sfxBoton);      }
function playSfxSpinWheel()  { _playSfx(_sfxSpinWheel);  }
function playSfxVictoria()   { _playSfx(_sfxVictoria);   }
function playSfxDerrota()    { _playSfx(_sfxDerrota);    }
function playSfxCompra()     { _playSfx(_sfxCompra);     }
function playSfxDenied()     { _playSfx(_sfxDenied);     }
function playSfxAttack()     { _playSfx(_sfxAttack);     }
function playSfxPlayerTurn() { _playSfx(_sfxPlayerTurn); }

// ── BGM contextual (normal / liga / mundial) ──
var _bgmLeague      = new Audio('bgm_league.mp3');      _bgmLeague.loop      = true; _bgmLeague.volume      = 0.4;
var _bgmWorldcup    = new Audio('bgm_worldcup.mp3');    _bgmWorldcup.loop    = true; _bgmWorldcup.volume    = 0.4;
var _bgmBossBattle  = new Audio('bgm_bossbattle.mp3');  _bgmBossBattle.loop  = true; _bgmBossBattle.volume  = 0.4;
// ── Temas principales alternativos ──
var _bgmAlt2 = new Audio('bgm2.mp3'); _bgmAlt2.loop = true; _bgmAlt2.volume = 0.4;
var _bgmAlt3 = new Audio('bgm3.mp3'); _bgmAlt3.loop = true; _bgmAlt3.volume = 0.4;
var _MAIN_THEMES = [
  { id: 'bgm1', name: 'Eternal Nexus',  audio: null,     unlockAt: 0  },
  { id: 'bgm2', name: 'Abyssal Echoes', audio: _bgmAlt2, unlockAt: 15 },
  { id: 'bgm3', name: 'Arcane Dawn',    audio: _bgmAlt3, unlockAt: 30 },
];
_MAIN_THEMES[0].audio = bgm;
var _selectedMainTheme = 'bgm1';
var _MUSIC_UNLOCK_KEY = 'nx_music_unlocks_v1';

function _loadMusicUnlocks(){
  try{ return JSON.parse(localStorage.getItem(_MUSIC_UNLOCK_KEY)||'[]'); }catch(e){ return []; }
}
function _saveMusicUnlocks(list){
  try{ localStorage.setItem(_MUSIC_UNLOCK_KEY, JSON.stringify(list)); }catch(e){}
}
function _isMusicUnlocked(id){
  if(id === 'bgm1') return true;
  return _loadMusicUnlocks().indexOf(id) !== -1;
}
function checkMusicUnlocks(){
  var ach = [];
  try{ ach = JSON.parse(localStorage.getItem('nx_ach_v2')||'[]'); }catch(e){}
  var count = ach.length;
  var unlocked = _loadMusicUnlocks();
  var changed = false;
  _MAIN_THEMES.forEach(function(t){
    if(t.unlockAt > 0 && count >= t.unlockAt && unlocked.indexOf(t.id) === -1){
      unlocked.push(t.id);
      changed = true;
    }
  });
  if(changed){ _saveMusicUnlocks(unlocked); _renderThemeSelector(); }
}
function _getMainBgm(){ return (_MAIN_THEMES.find(function(t){ return t.id===_selectedMainTheme; })||_MAIN_THEMES[0]).audio; }
function selectMainTheme(id){
  if(!_isMusicUnlocked(id)) return;
  var prev = _getMainBgm();
  _selectedMainTheme = id;
  var next = _getMainBgm();
  if(_bgmActive === prev) _switchBgm(next);
  _saveAudioPrefs();
  _renderThemeSelector();
}
function _renderThemeSelector(){
  var wrap = document.getElementById('themeSelectorWrap');
  if(!wrap) return;
  wrap.innerHTML = _MAIN_THEMES.map(function(t){
    var active   = t.id === _selectedMainTheme;
    var unlocked = _isMusicUnlocked(t.id);
    if(unlocked){
      return '<button class="theme-btn'+(active?' theme-btn-active':'')+'" onclick="selectMainTheme(\''+t.id+'\')">'+(active?'♪ ':'')+t.name+'</button>';
    } else {
      return '<button class="theme-btn theme-btn-locked" disabled title="Desbloquea '+t.unlockAt+' logros para obtener esta canción">🔒 '+t.name+' <span style="font-size:9px;opacity:.6">'+t.unlockAt+' logros</span></button>';
    }
  }).join('');
}
var _bgmActive = bgm; // referencia al BGM actualmente reproduciéndose

function _switchBgm(next){
  if(_bgmActive === next) return;
  var prev = _bgmActive;
  prev.pause(); prev.currentTime = 0;
  _bgmActive = next;
  if(audioPlaying) next.play().catch(function(){});
}

var _MUNDIAL_SCREENS = ['partyCountryScreen','partyGroupsScreen','partyBracketScreen','partyElimScreen','partyChampScreen'];
var _LIGA_SCREENS    = ['ligaNameScreen','ligaTableScreen','ligaElimScreen','ligaChampScreen','ligaLogScreen','ligaBracketScreen'];

function _updateBgm(screenId){
  // Los BGMs de liga/mundial se activan desde la intro, no al navegar pantallas.
  // Solo restauramos el BGM normal al salir hacia pantallas que no sean de torneo.
  var isTourney = _MUNDIAL_SCREENS.indexOf(screenId) !== -1 || screenId.startsWith('party')
               || _LIGA_SCREENS.indexOf(screenId)    !== -1 || screenId.startsWith('liga')
               || screenId === 'gameScreen';
  if(!isTourney) _switchBgm(_getMainBgm());
}

let _audioPanelOpen = false;
function toggleAudioPanel(){
  _audioPanelOpen = !_audioPanelOpen;
  const panel = document.getElementById('audio-panel');
  const btn   = document.getElementById('audio-toggle-btn');
  panel.classList.toggle('open', _audioPanelOpen);
  btn.style.borderColor = _audioPanelOpen ? 'var(--purple)' : '';
  btn.style.color       = _audioPanelOpen ? 'var(--text)'   : '';
  // Cerrar al hacer click fuera
  if(_audioPanelOpen){
    setTimeout(()=>{ document.addEventListener('click', _audioOutsideClick, {once:true, capture:true}); }, 50);
  }
}
function _audioOutsideClick(e){
  const widget = document.getElementById('audio-widget');
  if(widget && !widget.contains(e.target)){
    _audioPanelOpen = false;
    document.getElementById('audio-panel').classList.remove('open');
    const btn = document.getElementById('audio-toggle-btn');
    btn.style.borderColor = ''; btn.style.color = '';
  } else if(_audioPanelOpen) {
    // El click fue dentro del widget, volver a escuchar
    setTimeout(()=>{ document.addEventListener('click', _audioOutsideClick, {once:true, capture:true}); }, 50);
  }
}
var _allBgms = function(){ return [bgm, _bgmAlt2, _bgmAlt3, _bgmLeague, _bgmWorldcup, _bgmBossBattle]; };
var _AUDIO_KEY = 'nx_audio_v1';
function _saveAudioPrefs(){
  try{ localStorage.setItem(_AUDIO_KEY, JSON.stringify({ vol: bgm.volume, muted: muted, sfxVol: _sfxVol, sfxMuted: _sfxMuted, mainTheme: _selectedMainTheme })); }catch(e){}
}
function _loadAudioPrefs(){
  try{
    var p = JSON.parse(localStorage.getItem(_AUDIO_KEY)||'{}');
    if(p.vol !== undefined){
      _allBgms().forEach(function(b){ b.volume = p.vol; });
      var sl = document.getElementById('volSlider');
      if(sl) sl.value = p.vol;
    }
    if(p.muted){
      muted = true;
      _allBgms().forEach(function(b){ b.muted = true; });
      var mb = document.getElementById('muteBtn');
      if(mb) mb.textContent = '🔇';
    }
    if(p.sfxVol !== undefined) _sfxVol = p.sfxVol;
    if(p.sfxMuted) _sfxMuted = true;
    if(p.mainTheme && _isMusicUnlocked(p.mainTheme)) _selectedMainTheme = p.mainTheme;
  }catch(e){}
  // Verificar desbloqueos por logros al cargar
  checkMusicUnlocks();
}
function _bgmHandleHide(){ if(audioPlaying) _bgmActive.pause(); }
function _bgmHandleShow(){ if(audioPlaying) _bgmActive.play().catch(function(){}); }

// Navegador
document.addEventListener('visibilitychange', function(){
  if(document.hidden) _bgmHandleHide(); else _bgmHandleShow();
});
// Capacitor / Cordova Android
document.addEventListener('pause',  _bgmHandleHide, false);
document.addEventListener('resume', _bgmHandleShow, false);
// window blur/focus como último recurso
window.addEventListener('blur',  _bgmHandleHide);
window.addEventListener('focus', _bgmHandleShow);

function toggleAudio(){
  if(audioPlaying){
    _bgmActive.pause(); audioPlaying=false;
    document.getElementById('audioToggle').textContent='▶';
  } else {
    audioPlaying=true;
    _bgmActive.play().then(function(){ document.getElementById('audioToggle').textContent='⏸'; }).catch(function(){ audioPlaying=false; });
  }
}
function setVolume(v){
  var vol=parseFloat(v);
  _allBgms().forEach(function(b){ b.volume=vol; });
  if(muted&&vol>0){ muted=false; document.getElementById('muteBtn').textContent='🔊'; }
  _saveAudioPrefs();
}
function toggleMute(){
  muted=!muted;
  _allBgms().forEach(function(b){ b.muted=muted; });
  document.getElementById('muteBtn').textContent=muted?'🔇':'🔊';
  _saveAudioPrefs();
}

/* ═══════════════════════════════════════════════
   CARD DATA
═══════════════════════════════════════════════ */
const CARD_BACK = 'img/card_back.png';

const RARITIES = [
  null,
  {name:"Normal",   border:"#5a90d9"},
  {name:"Normal",   border:"#5a90d9"},
  {name:"Raro",     border:"#4ac97a"},
  {name:"Raro",     border:"#4ac97a"},
  {name:"Épico",    border:"#EF9F27"},
  {name:"Épico",    border:"#EF9F27"},
  {name:"Mítico",   border:"#9b59f7"},
  {name:"Mítico",   border:"#9b59f7"},
  {name:"Especial", border:"#f76eb2"},
  {name:"Legendario",border:"#ff4444"},
];

const RARITY_LIMITS = {
  "Normal":Infinity,"Raro":3,"Épico":2,"Mítico":2,"Especial":1,"Legendario":0
};

// CARD_POOL se carga de forma asíncrona desde cartas.json
let CARD_POOL = [];

const BOSSES = [
  {
    id:0, name:"Vorathyn", stars:10, rarity:"Legendario",
    hp:1000, maxHp:1000, image:null,
    title:"El Devorador de Planos",
    flavor:"Una entidad sin forma que consume realidades enteras.",
    description:"El devorador de planos. Una entidad sin forma definida que consume realidades enteras.",
    effects:[], cumulativeUses:{}, shieldTurns:0, shieldPct:0,
    attacks:[
      {name:"Garra del vacío",     type:"direct", value:190,                          description:"Un zarpazo que desgarra la realidad."},
      {name:"Corrupción eterna",   type:"dot",    value:95,  turns:3,                 description:"Un veneno que corroe el alma."},
      {name:"Drenaje abismal",     type:"regen",  value:120, turns:5,                 description:"Absorbe la esencia vital del objetivo."},
      {name:"Colapso dimensional", type:"prob",   value:520, prob:45, consequence:100, description:"Rasga el tejido del plano. Puede fallar catastróficamente."}
    ]
  },
  {
    id:-1, name:"Seraveth", stars:10, rarity:"Legendario",
    hp:1000, maxHp:1000, image:null,
    title:"La Tejedora de Escarcha",
    flavor:"No mata de un golpe. Te congela por dentro, turno a turno, hasta que no queda nada.",
    description:"La tejedora de escarcha. Señora del hielo que desgasta lentamente mientras se protege.",
    effects:[], cumulativeUses:{}, shieldTurns:0, shieldPct:0,
    attacks:[
      {name:"Lanza glacial",     type:"direct",  value:210,                           description:"Un proyectil de hielo. Menos fuerza, más precisión."},
      {name:"Permafrost",        type:"dot",     value:130, turns:3,                  description:"Congela la sangre. El daño persiste y se acumula."},
      {name:"Velo de escarcha",  type:"shield",  value:80,  turns:5,                  description:"Se cubre con hielo: reduce el daño recibido un 80%."},
      {name:"Tormenta polar",    type:"prob",    value:580, prob:50, consequence:90,  description:"Desata el invierno absoluto. Baja probabilidad y peligroso si falla."}
    ]
  },
  {
    id:-2, name:"Morvak", stars:10, rarity:"Legendario",
    hp:1000, maxHp:1000, image:null,
    title:"El Coloso Eterno",
    flavor:"Cada golpe que encaja lo hace más peligroso. Cuanto más dura la pelea, más pierde el retador.",
    description:"El coloso eterno. Su fuerza escala con cada uso acumulado y se regenera con fuerza.",
    effects:[], cumulativeUses:{}, shieldTurns:0, shieldPct:0,
    attacks:[
      {name:"Martillazo brutal", type:"direct",     value:230,                          description:"Un impacto aplastante y sin adornos."},
      {name:"Ira creciente",     type:"cumulative", value:90,                           description:"Cada uso suma más daño, sin importar si se intercalan otros ataques. No tiene techo."},
      {name:"Pulso vital",       type:"regen",      value:150, turns:5,                 description:"Se regenera con fuerza del campo de batalla."},
      {name:"Impacto absoluto",  type:"prob",       value:700, prob:55, consequence:80, description:"Concentra toda su fuerza. Mayor techo de daño, pero deja fisuras si falla."}
    ]
  }
];
let BOSS_CARD = BOSSES[0];

/* ═══════════════════════════════════════════════
   STATE
═══════════════════════════════════════════════ */
let botMode = false;        // true = jugador vs IA
let bossLocal2v1 = false;  // true = modo jefe cooperativo 2 jugadores mismo dispositivo
let selectedBossIdx = 0;   // índice en BOSSES[]
let gameMode = 'standard'; // 'standard' | 'hand3' | 'boss' | 'triple' | 'endless'
var draftMode = false;
var _draftSkipRoulette = false;
var _endlessWave = 0;
var _endlessPool = [];
var _caosActive = false;
var _caosEffect = null;
var _caosShieldDefender = null;
var _CAOS_POOL = ['normal','normal','normal','normal','double','double','shield','shield','chaos','chaos','reverse','heal'];
function _rollCaosEffect(){ _caosEffect = _CAOS_POOL[Math.floor(Math.random()*_CAOS_POOL.length)]; _renderCaosBanner(); if(_caosEffect==='chaos'){ attackUsed=true; setTimeout(_triggerCaosRayo,2000); } }
function _triggerCaosRayo(){
  if(!_caosActive||_caosEffect!=='chaos') return;
  // Solo el cliente que hizo endTurn() tiene este setTimeout activo (el del jugador que atacó).
  // El invitado nunca llama endTurn() en el turno del host, así que nunca llega aquí.
  const atk=currentPlayer===1?p1:p2, def=currentPlayer===1?p2:p1;
  if(!atk.active||!def.active) return;
  const d1=Math.ceil(Math.random()*100), d2=Math.ceil(Math.random()*100);
  addLog('⚡ ¡El rayo cae! <b>'+atk.active.name+'</b> recibe -'+d1+' HP · <b>'+def.active.name+'</b> recibe -'+d2+' HP.','log-dmg');
  dealDmg_Standard(atk,d1,'Rayo del caos');
  dealDmg_Standard(def,d2,'Rayo del caos');
  renderGame();
  const dd=checkDeath_Standard(def,atk), da=checkDeath_Standard(atk,def);
  if(!dd&&!da) endTurn();
}
function _caosEffectLabel(e){ return {normal:'Sin efecto especial',double:'⚡ Daño doble',shield:'🛡 Escudo gratis (defensor)',chaos:'🎲 Rayo del caos (daño aleatorio a ambos)',reverse:'🔄 Daño invertido (recae en el atacante)',heal:'💚 Curación (el atacante recupera HP)'}[e]||''; }
function _caosEffectStyle(e){ return {normal:'border-color:#444;color:var(--text-muted);background:rgba(255,255,255,.03)',double:'border-color:#ffa94d;color:#ffa94d;background:rgba(255,169,77,.08)',shield:'border-color:#4dc9f6;color:#4dc9f6;background:rgba(77,201,246,.08)',chaos:'border-color:#c77dff;color:#c77dff;background:rgba(199,125,255,.1)',reverse:'border-color:#f76e6e;color:#f76e6e;background:rgba(247,110,110,.08)',heal:'border-color:#4ac97a;color:#4ac97a;background:rgba(74,201,122,.08)'}[e]||''; }
function _renderCaosBanner(){ var b=document.getElementById('caosEffectBanner'); if(!b) return; if(!_caosActive){b.className='';b.style='';b.textContent='';return;} b.className='active'; b.style=_caosEffectStyle(_caosEffect); b.textContent='🎲 EFECTO: '+_caosEffectLabel(_caosEffect); }
function _endlessNextEnemy(){ if(_endlessPool.length===0) _endlessPool=shuffle(CARD_POOL.map(c=>makeCard(c))); return _endlessPool.shift(); }
function _launchEndlessSetup(){ botMode=true; bossLocal2v1=false; _launchSetup('endless'); }
function _updateEndlessWaveHud(){ var chip=document.getElementById('modeChip'); if(chip) chip.textContent='🏴 OLEADA '+_endlessWave; }
let p1 = {}, p2 = {}, p3 = {}, boss = {}, challenger = {};
let pendingTarget = 0;     // objetivo seleccionado en modo triple (0 = ninguno)
let currentPlayer = 1;   // 1 or 2 for standard/hand3; 'challenger'|'boss' for boss mode
let turnNumber = 1;
let attackUsed = false;
let _humanWon = false; // true solo cuando el jugador humano (P1 o challenger) gana
let p1sel = [], p2sel = [], p3sel = [], chalSel = [];

/* ── Firebase config ── */
const _FB_CONFIG = {
  apiKey: "AIzaSyDJeJqDa1kZzlp8uPUW8i3sg_X1xvP66hw",
  authDomain: "nexus-arcana-ebb68.firebaseapp.com",
  databaseURL: "https://nexus-arcana-ebb68-default-rtdb.firebaseio.com",
  projectId: "nexus-arcana-ebb68",
  storageBucket: "nexus-arcana-ebb68.firebasestorage.app",
  messagingSenderId: "460858338576",
  appId: "1:460858338576:web:6d925e805164a740d18995"
};
if (!firebase.apps.length) firebase.initializeApp(_FB_CONFIG);
const _fbDb = firebase.database();

/* ── Online multiplayer state ── */
let isOnline        = false;
let myPlayerNum     = 0;        // 1 = host, 2 = guest
let ws              = null;     // legacy alias — no longer used
let roomCode        = '';
let opponentConfigs = {};       // { playerNum: config }
let onlinePlayerCount = 2;      // 2 o 3
let iSentReady      = false;
let mySel           = [];       // deck selection for online setup
let logEntries      = [];       // {cls, html} — synced between clients
let onlineGameMode  = 'standard';
let _fbRoomRef      = null;     // referencia Firebase a la sala activa
let _fbMsgListener  = null;     // listener de mensajes entrantes
let _fbLastMsgKey   = null;     // evita procesar mensajes propios
let _stateSeq       = 0;        // contador de secuencia de game_state (evita revertir con mensajes viejos)
var _rouletteActive = false;    // true mientras la animación de la ruleta está en curso

/* ═══════════════════════════════════════════════
   SCREEN NAVIGATION
═══════════════════════════════════════════════ */
// Pantallas raíz: el back no debe navegar (se manejará contextualmente)
var _NO_BACK_SCREENS = ['endScreen', 'endlessScreen'];

// Pantallas de combate: back abre confirmación de abandono
var _COMBAT_SCREENS = ['gameScreen'];

// Pantallas de Mundial/Torneo: back abre modal de salida de torneo
var _MUNDIAL_SCREENS = ['partyCountryScreen','partyGroupsScreen','partyBracketScreen','partyElimScreen','partyHistScreen','partyChampScreen'];

// Pantallas de Liga: back abre modal de salida de liga
var _LIGA_SCREENS = ['ligaNameScreen','ligaTableScreen','ligaBracketScreen','ligaLogScreen','ligaElimScreen','ligaChampScreen'];

var _currentScreen = 'titleScreen';

function _setNavActive(btn){
  document.querySelectorAll('.title-nav-btn').forEach(function(b){ b.classList.remove('nav-active'); });
  btn.classList.add('nav-active');
}

function showScreen(id){
  document.querySelectorAll('.screen').forEach(s=>{s.classList.remove('active');});
  const el = document.getElementById(id);
  el.classList.add('active','fade-in');
  setTimeout(()=>el.classList.remove('fade-in'),400);
  _currentScreen = id;
  document.body.classList.toggle('title-active', id==='titleScreen');
  _updateBgm(id);
  if(typeof _syncMainNav === 'function') _syncMainNav(id);
  // Resetear selección de modificador al volver a pantallas de modo
  if((id==='botModeScreen'||id==='singlePlayerScreen') && typeof _resetModSelection==='function'){
    _resetModSelection();
  }
}

function _doBack(){
  history.pushState(null, '');
  // Bloquear back mientras ruleta activa
  if(_rouletteActive) return;
  // Bloquear back mientras draft overlay abierto
  var _dov = document.getElementById('draftOverlay');
  if(_dov && _dov.style.display === 'flex') return;

  // Solitario modal abierto
  var solOverlay = document.getElementById('solOverlay');
  if(solOverlay && solOverlay.classList.contains('active')){ closeSolitario(); return; }

  // Casino modal abierto
  var casinoOverlay = document.getElementById('casinoOverlay');
  if(casinoOverlay && casinoOverlay.classList.contains('active')){
    var bjVisible = document.getElementById('casino-bj').style.display !== 'none';
    var dueloVisible = document.getElementById('casino-duelo').style.display !== 'none';
    var poiVisible = document.getElementById('casino-poi').style.display !== 'none';
    var discoVisible = document.getElementById('casino-disco').style.display !== 'none';
    var triadaVisible = document.getElementById('casino-triada').style.display !== 'none';
    if(bjVisible || dueloVisible || poiVisible || discoVisible || triadaVisible){ casinoBack(); }
    else { closeCasino(); }
    return;
  }

  if(_currentScreen === 'titleScreen'){
    _showExitAppModal();
    return;
  }
  if(_NO_BACK_SCREENS.indexOf(_currentScreen) !== -1){
    return; // ignorar back en estas pantallas
  }
  if(_COMBAT_SCREENS.indexOf(_currentScreen) !== -1){
    confirmAbandon();
    return;
  }
  if(_MUNDIAL_SCREENS.indexOf(_currentScreen) !== -1){
    _showTourneyExitModal('mundial');
    return;
  }
  if(_LIGA_SCREENS.indexOf(_currentScreen) !== -1){
    _showTourneyExitModal('liga');
    return;
  }
  // Pantallas normales: volver al menú principal
  showScreen('titleScreen');
}

var _backLock = false;
function _doBackOnce(){
  if(_backLock) return;
  _backLock = true;
  setTimeout(function(){ _backLock = false; }, 400);
  _doBack();
}

// Web (Chrome/browser)
window.addEventListener('popstate', function(){
  history.pushState(null, '');
  _doBackOnce();
});
history.pushState(null, '');

// Capacitor (Android APK)
document.addEventListener('ionBackButton', function(e){
  e.detail.register(10, function(){ _doBackOnce(); });
});
if(window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.App){
  window.Capacitor.Plugins.App.addListener('backButton', function(){ _doBackOnce(); });
}

/* ─── Notificación diaria ─── */
window.addEventListener('load', function(){
  var LN = window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.LocalNotifications;
  if(!LN) return;

  LN.requestPermissions().then(function(res){
    if(res.display !== 'granted') return;

    var createChannel = LN.createChannel ? LN.createChannel({
      id: 'nx_daily',
      name: 'Recordatorios diarios',
      importance: 3,
      visibility: 1,
      vibration: true
    }) : Promise.resolve();

    createChannel.then(function(){
      // Calcular próxima 18:45 (hoy si aún no pasó, si no mañana)
      var now = new Date();
      var fireAt = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
      if(fireAt <= now) fireAt.setDate(fireAt.getDate() + 1);
      return LN.schedule({ notifications: [{
        id: 1001,
        title: '⚔️ Nexus Arcana',
        body: 'Las misiones diarias ya llegaron. ¿Tienes lo que se necesita para completarlas?',
        schedule: { at: fireAt },
        channelId: 'nx_daily',
        smallIcon: 'ic_launcher',
        iconColor: '#7b5fd4'
      }]});
    }).catch(function(){});
  }).catch(function(){});
});

/* ─── Modal: salida de torneo/liga con opción de guardar ─── */
function _showTourneyExitModal(mode){
  var m = document.getElementById('tourneyExitModal');
  if(!m) return;
  document.getElementById('tourneyExitTitle').textContent =
    mode === 'liga' ? 'Salir de la Liga' : 'Salir del Torneo';
  m.dataset.mode = mode;
  m.style.display = 'flex';
}
function _hideTourneyExitModal(){
  var m = document.getElementById('tourneyExitModal');
  if(m) m.style.display = 'none';
}
function _tourneyExitAbandon(){
  var mode = document.getElementById('tourneyExitModal').dataset.mode;
  _hideTourneyExitModal();
  if(mode === 'liga'){
    _ligaGoToMenu();
  } else {
    partyState = null;
    _clearTourneyProgress();
    showScreen('titleScreen');
  }
}
function _tourneyExitSave(){
  _hideTourneyExitModal();
  showScreen('titleScreen');
}

/* ═══════════════════════════════════════════════
   RULETA DE INICIO
═══════════════════════════════════════════════ */
// Colores de sector para hasta 3 jugadores
const ROUL_COLORS = ['#1a3d70','#6e1a1a','#311468'];

function showRoulette(players, onFinish){
  if(_draftSkipRoulette){
    _draftSkipRoulette = false;
    onFinish(currentPlayer);
    return;
  }
  _rouletteActive = true;
  const overlay = document.getElementById('rouletteOverlay');
  overlay.style.display = 'flex';

  const canvas  = document.getElementById('rouletteCanvas');
  const resEl   = document.getElementById('rouletteResult');
  const btn     = document.getElementById('rouletteBtn');
  const ctx     = canvas.getContext('2d');
  const W=canvas.width, H=canvas.height, cx=W/2, cy=H/2, R=W/2-6;
  const n=players.length;
  const sectorRad=(Math.PI*2)/n;
  const sectorDeg=360/n;

  // Aplicar skin de ruleta
  const _rc = _loadCosmetics();
  const _rs = _COSM_ROULETTES[_rc.roulette] || _COSM_ROULETTES[0];
  // Sobreescribir colores de sector con los del skin
  players = players.map(function(p, i){ return Object.assign({}, p, {color: _rs.colors[i % _rs.colors.length]}); });

  // Actualizar color del puntero (triángulo CSS)
  var ptrEl = document.getElementById('roulettePointer');
  if(ptrEl) ptrEl.style.borderTopColor = _rs.pointer;

  // Reset canvas rotation antes de dibujar
  canvas.style.transition='none';
  canvas.style.transform='rotate(0deg)';
  resEl.style.display='none';
  resEl.innerHTML='';
  btn.style.display='none';

  // Dibujar la rueda estática
  ctx.clearRect(0,0,W,H);
  players.forEach((p,i)=>{
    const startA=-Math.PI/2+i*sectorRad;
    const endA=startA+sectorRad;
    const midA=startA+sectorRad/2;

    // Sector
    ctx.beginPath();
    ctx.moveTo(cx,cy);
    ctx.arc(cx,cy,R,startA,endA);
    ctx.closePath();
    ctx.fillStyle=p.color;
    ctx.fill();
    ctx.strokeStyle='#04040c';
    ctx.lineWidth=3;
    ctx.stroke();

    // Nombre del jugador sobre el sector
    const tx=cx+Math.cos(midA)*R*0.62;
    const ty=cy+Math.sin(midA)*R*0.62;
    ctx.save();
    ctx.translate(tx,ty);
    ctx.textAlign='center';
    ctx.textBaseline='middle';
    ctx.fillStyle='#ede5d8';
    ctx.font='bold 11px Cinzel,serif';
    ctx.shadowColor='#000000aa';
    ctx.shadowBlur=5;
    // Máx. 9 chars para que quepa en cualquier sector
    ctx.fillText(p.name.slice(0,9),0,0);
    ctx.restore();
  });

  // Borde exterior
  ctx.beginPath();
  ctx.arc(cx,cy,R,0,Math.PI*2);
  ctx.strokeStyle=_rs.rim;
  ctx.lineWidth=4;
  ctx.stroke();

  // Círculo central decorativo
  ctx.beginPath();
  ctx.arc(cx,cy,16,0,Math.PI*2);
  ctx.fillStyle=_rs.center;
  ctx.fill();
  ctx.strokeStyle=_rs.rim;
  ctx.lineWidth=2;
  ctx.stroke();

  // Determinar ganador y ángulo final
  const winnerIdx = Math.floor(Math.random()*n);
  const landOff   = 0.25+Math.random()*0.5;        // 25–75% dentro del sector
  const spins     = 6+Math.floor(Math.random()*3);  // 6–8 vueltas completas
  const finalDeg  = spins*360+(360-winnerIdx*sectorDeg-sectorDeg*landOff);

  // Aplicar animación CSS en el siguiente frame (para que el reset surta efecto)
  requestAnimationFrame(()=>requestAnimationFrame(()=>{
    canvas.style.transition='transform 4.5s cubic-bezier(0.15,0.5,0.1,1)';
    canvas.style.transform=`rotate(${finalDeg}deg)`;
    playSfxSpinWheel();

    canvas.addEventListener('transitionend',()=>{
      _rouletteActive = false;
      const winner=players[winnerIdx];
      playSfxPlayerTurn();
      resEl.innerHTML=
        '<div style="font-size:.75rem;color:var(--text-muted);letter-spacing:.12em;margin-bottom:.3rem">COMIENZA</div>'+
        '<div style="color:var(--gold);text-shadow:0 0 22px #e8c46a99;font-size:clamp(1rem,4vw,1.3rem)">'+
        winner.name+'</div>';
      resEl.style.display='block';
      setTimeout(()=>{
        btn.style.display='inline-block';
        btn.onclick=()=>{
          _rouletteActive = false;
          overlay.style.display='none';
          canvas.style.transition='none';
          canvas.style.transform='rotate(0deg)';
          onFinish(winner.num);
        };
      }, 500);
    },{once:true});
  }));
}

function _cancelRoulette(){
  _rouletteActive = false;
  const overlay = document.getElementById('rouletteOverlay');
  if(overlay) overlay.style.display = 'none';
  const canvas = document.getElementById('rouletteCanvas');
  if(canvas){ canvas.style.transition = 'none'; canvas.style.transform = 'rotate(0deg)'; }
}

