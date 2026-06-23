/* ═══════════════════════════════════════════════
   ATLAS NEXUS
═══════════════════════════════════════════════ */

var _ATLAS_KINGDOMS = [
  {
    id: 'astral',
    name: 'Dominio Astral',
    emoji: '🌞',
    description: 'Reino de la luz, las estrellas, el destino y las entidades celestiales.',
    ruler: 'Nexus',
    cards: ['Luminos','Lunaris','Lumis','Solkarn','Dawnspire','Mirael','Chronath','Astralyx','Aetherion','Aelion','Tianxu','Pekitiel','Nexus'],
    gradient: 'linear-gradient(135deg,rgba(10,14,50,0.97) 0%,rgba(22,10,55,0.97) 100%)',
    accent: '#e8c46a',
    accentSoft: 'rgba(232,196,106,0.12)',
    border: 'rgba(232,196,106,0.3)',
    banner: 'img/dominio_astral.png',
  },
  {
    id: 'abismo',
    name: 'Abismo Eterno',
    emoji: '🌑',
    description: 'Un reino de corrupción, vacío, sombras y entidades capaces de alterar la realidad.',
    ruler: 'Semiaza',
    cards: ['Umbrath','Umbrak','Mordecai','Xyrath','Skarnoth','Ashveil','Malveth','Nullvore','Oblivion','Semiaza'],
    gradient: 'linear-gradient(135deg,rgba(6,3,18,0.97) 0%,rgba(18,3,28,0.97) 100%)',
    accent: '#9b59f7',
    accentSoft: 'rgba(155,89,247,0.12)',
    border: 'rgba(155,89,247,0.3)',
    banner: 'img/abismo_eterno.png',
  },
  {
    id: 'salvaje',
    name: 'Reino Salvaje',
    emoji: '🌿',
    description: 'Bosques ancestrales, espíritus naturales y criaturas que viven en armonía con la vida.',
    ruler: 'Thornyx',
    cards: ['Myren','Moswick','Thornveil','Sylvari','Thornyx','Guo','Lucat','Carapax','Norax','Trikka'],
    gradient: 'linear-gradient(135deg,rgba(3,14,6,0.97) 0%,rgba(6,20,10,0.97) 100%)',
    accent: '#4ac97a',
    accentSoft: 'rgba(74,201,122,0.12)',
    border: 'rgba(74,201,122,0.3)',
    banner: 'img/reino_salvaje.png',
  },
  {
    id: 'primordial',
    name: 'Imperio Primordial',
    emoji: '❄️',
    description: 'Tierra de volcanes, glaciares, tormentas y fuerzas elementales indomables.',
    ruler: 'Glacior',
    cards: ['Frostling','Glacior','Pyraxis','Emberveil','Terravex','Torchik','Ler','Drizzik','Vyrith','Zypheria'],
    gradient: 'linear-gradient(135deg,rgba(3,10,22,0.97) 0%,rgba(3,18,26,0.97) 100%)',
    accent: '#4ac9c9',
    accentSoft: 'rgba(74,201,201,0.12)',
    border: 'rgba(74,201,201,0.3)',
    banner: 'img/imperio_primordial.png',
  },
  {
    id: 'forja',
    name: 'Forja Arcana',
    emoji: '⚙️',
    description: 'Ciudadela de constructos, máquinas, cristales y tecnología arcana.',
    ruler: 'Kronix',
    cards: ['Ferrox','Kronix','Synthex','Crystallis','Stonark'],
    gradient: 'linear-gradient(135deg,rgba(6,10,18,0.97) 0%,rgba(14,18,26,0.97) 100%)',
    accent: '#7ab8d4',
    accentSoft: 'rgba(122,184,212,0.12)',
    border: 'rgba(122,184,212,0.3)',
    banner: 'img/forja_arcana.png',
  },
  {
    id: 'indomitas',
    name: 'Tierras Indómitas',
    emoji: '🐉',
    description: 'Región de bestias legendarias, dragones, titanes y criaturas ancestrales.',
    ruler: 'Wormix',
    cards: ['Gorvak','Drakvel','Wormix','Algor','Vorith','Corvaxis','Nethrix','Kraxon','Vexara','Gaethor'],
    gradient: 'linear-gradient(135deg,rgba(18,5,3,0.97) 0%,rgba(26,8,3,0.97) 100%)',
    accent: '#d44a4a',
    accentSoft: 'rgba(212,74,74,0.12)',
    border: 'rgba(212,74,74,0.3)',
    banner: 'img/tierras_indomitas.png',
  },
];

var _atlasSelectedKingdom = null;

function _atlasCardByName(name){
  var all = (typeof _wikiAllCards === 'function') ? _wikiAllCards() : (window.CARD_POOL || []);
  for(var i=0; i<all.length; i++){
    if(all[i].name === name) return all[i];
  }
  return null;
}

function openAtlas(){
  _atlasSelectedKingdom = null;
  var backBtn = document.getElementById('atlasBackBtn');
  if(backBtn) backBtn.style.display = 'none';
  _atlasRenderKingdoms();
}

function _atlasRenderKingdoms(){
  var body = document.getElementById('atlasBody');
  if(!body) return;

  var html = '<div class="atlas-kingdoms-grid">';
  _ATLAS_KINGDOMS.forEach(function(k){
    html += '<div class="atlas-kingdom-card" onclick="_atlasShowKingdom(\''+k.id+'\')" style="border-color:'+k.border+';background:'+k.gradient+'">';
    html += '<div class="atlas-kingdom-banner" style="border-color:'+k.border+'">';
    if(k.banner){
      html += '<img class="atlas-ruler-img" src="'+k.banner+'" alt="'+k.name+'" onerror="this.style.display=\'none\'">';
      html += '<div class="atlas-banner-overlay" style="background:linear-gradient(to top,rgba(0,0,0,.75) 0%,transparent 65%)"></div>';
    }
    html += '<div class="atlas-kingdom-emoji">'+k.emoji+'</div>';
    html += '</div>';
    var unlocked = k.cards.filter(function(n){ var c=_atlasCardByName(n); return c&&(typeof _isCardUnlocked==='function'?_isCardUnlocked(c.id):true); }).length;
    var total = k.cards.length;
    var pct = Math.round(unlocked/total*100);
    html += '<div class="atlas-kingdom-info">';
    html += '<div class="atlas-kingdom-name" style="color:'+k.accent+'">'+k.name+'</div>';
    html += '<div class="atlas-kingdom-desc">'+k.description+'</div>';
    html += '<div class="atlas-kingdom-meta">';
    html += '<span style="color:'+k.accent+'">👑 '+k.ruler+'</span>';
    html += '<span style="color:var(--text-dim)">'+unlocked+' / '+total+'</span>';
    html += '</div>';
    html += '<div class="atlas-progress-wrap">';
    html += '<div class="atlas-progress-bar" style="width:'+pct+'%;background:'+k.accent+'"></div>';
    html += '</div>';
    html += '<div class="atlas-progress-label" style="color:'+k.accent+'">'+pct+'% descubierto</div>';
    html += '</div>';
    html += '</div>';
  });
  html += '</div>';
  body.innerHTML = html;
}

function _atlasShowKingdom(id){
  var k = null;
  for(var i=0; i<_ATLAS_KINGDOMS.length; i++){
    if(_ATLAS_KINGDOMS[i].id === id){ k = _ATLAS_KINGDOMS[i]; break; }
  }
  if(!k) return;
  _atlasSelectedKingdom = id;

  var backBtn = document.getElementById('atlasBackBtn');
  if(backBtn) backBtn.style.display = 'block';

  var body = document.getElementById('atlasBody');
  if(!body) return;

  var html = '<div class="atlas-detail-view">';

  // Header con imagen del reino
  html += '<div class="atlas-detail-header" style="border-color:'+k.border+';background:'+k.gradient+'">';
  if(k.banner){
    html += '<img class="atlas-detail-ruler-img" src="'+k.banner+'" alt="'+k.name+'" onerror="this.style.display=\'none\'">';
  }
  html += '<div class="atlas-detail-header-info">';
  html += '<div class="atlas-detail-emoji">'+k.emoji+'</div>';
  html += '<div class="atlas-detail-name" style="color:'+k.accent+'">'+k.name+'</div>';
  html += '<div class="atlas-detail-desc">'+k.description+'</div>';
  html += '<div class="atlas-detail-ruler"><span style="color:'+k.accent+'">👑 Gobernante:</span> <span style="color:var(--text)">'+k.ruler+'</span></div>';
  html += '<div class="atlas-detail-count">'+k.cards.length+' habitantes</div>';
  html += '</div>';
  html += '</div>';

  // Cuadrícula de cartas
  var unlockedCount = k.cards.filter(function(n){ var c=_atlasCardByName(n); return c&&(typeof _isCardUnlocked==='function'?_isCardUnlocked(c.id):true); }).length;
  var totalCount = k.cards.length;
  var detailPct = Math.round(unlockedCount/totalCount*100);

  html += '<div class="atlas-cards-section">';
  html += '<div class="atlas-detail-progress">';
  html += '<div class="atlas-detail-progress-top">';
  html += '<span class="atlas-cards-label" style="color:var(--text-dim)">HABITANTES</span>';
  html += '<span style="font-family:var(--font-title);font-size:9px;color:'+k.accent+'">'+unlockedCount+' / '+totalCount+' · '+detailPct+'%</span>';
  html += '</div>';
  html += '<div class="atlas-progress-wrap">';
  html += '<div class="atlas-progress-bar" style="width:'+detailPct+'%;background:'+k.accent+'"></div>';
  html += '</div>';
  html += '</div>';
  html += '<div class="atlas-cards-grid">';
  var sortedCards = k.cards.slice().sort(function(a,b){
    var ca = _atlasCardByName(a), cb = _atlasCardByName(b);
    return (ca?ca.stars||1:1)-(cb?cb.stars||1:1);
  });
  sortedCards.forEach(function(name){
    var card = _atlasCardByName(name);
    var r = card ? _wikiRarityData(card.stars||1) : {border:'#555',star:'#555',bg:'#0a0a0a'};
    var img = card && card.image ? card.image : '';
    var unlocked = card ? (typeof _isCardUnlocked === 'function' ? _isCardUnlocked(card.id) : true) : false;
    var isRuler = (name === k.ruler);
    var thumbBorder = isRuler ? k.accent : (r.border+'55');
    html += '<div class="atlas-card-thumb'+(isRuler?' atlas-card-ruler':'')+'" style="border-color:'+thumbBorder+';background:'+r.bg+'">';
    if(img){
      html += '<img class="atlas-card-img" src="'+img+'" alt="'+name+'"'+(unlocked?'':' style="filter:brightness(.25) saturate(0)"')+' onerror="this.style.display=\'none\'">';
    } else {
      html += '<div class="atlas-card-no-img">?</div>';
    }
    if(isRuler){
      html += '<div class="atlas-ruler-crown" style="color:'+k.accent+'">👑</div>';
    }
    if(!unlocked){
      html += '<div class="atlas-card-thumb-lock">🔒</div>';
    }
    html += '<div class="atlas-card-thumb-name" style="color:'+(unlocked?r.star:'var(--text-dim)')+'">'+name+'</div>';
    html += '</div>';
  });
  html += '</div>';
  html += '</div>';

  html += '</div>'; // atlas-detail-view
  body.innerHTML = html;
  body.scrollTop = 0;
}

function atlasGoBack(){
  _atlasSelectedKingdom = null;
  var backBtn = document.getElementById('atlasBackBtn');
  if(backBtn) backBtn.style.display = 'none';
  _atlasRenderKingdoms();
}
