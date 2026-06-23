/* ═══════════════════════════════════════════════
   GALERÍA DE FRAGMENTOS
═══════════════════════════════════════════════ */

var _FRAG_KEY    = 'nx_fragments_v1';
var _GALLERY_KEY = 'nx_gallery_v1';

var _GALLERY_IMAGES = [
  {
    id: 'galeria1', src: 'img/galeria1.png',
    emoji: '⚔️', title: 'El Choque de los Titanes Primordiales',
    desc: 'Desde el amanecer del mundo, dos fuerzas ancestrales han permanecido enfrentadas. Glacior, coloso nacido del hielo eterno, avanza envuelto en tormentas árticas capaces de congelar océanos enteros. Frente a él se alza Terravex, titán de piedra viva cuya furia sacude montañas y eleva continentes con cada paso.\n\nCuando el frío absoluto y la fuerza de la tierra colisionan, el mundo entero contiene la respiración. Los glaciares se resquebrajan, las montañas se elevan hacia el cielo y el horizonte se parte en dos bajo el peso de su batalla. Ninguno lucha por conquistar; ambos representan el equilibrio primordial de la naturaleza, una guerra tan antigua que incluso las estrellas han olvidado cómo comenzó.'
  },
  {
    id: 'galeria2', src: 'img/galeria2.png',
    emoji: '🌟', title: 'Un Día Tranquilo',
    desc: 'Lejos de las guerras entre reinos, los conflictos dimensionales y las batallas de los grandes campeones, la vida continúa para los habitantes más pequeños de Nexus.\n\nEn un rincón olvidado del mundo, Luminos, Torchik, Ler, Pitik y Whisperion comparten un momento de calma entre ruinas cubiertas por la naturaleza. Sin preocuparse por el destino de los reinos ni por las luchas de seres legendarios, juegan, exploran y disfrutan de un día cualquiera.\n\nDespués de todo, incluso en un mundo lleno de titanes, dragones y entidades capaces de alterar la realidad, siempre hay espacio para las pequeñas historias.'
  },
  {
    id: 'galeria3', src: 'img/galeria3.png',
    emoji: '🌟', title: 'Cuando los Cielos Descendieron',
    desc: 'Guo había recorrido senderos, bosques y montañas durante gran parte de su vida, escuchando historias sobre criaturas imposibles que habitaban más allá del horizonte. Leyendas de seres tan poderosos que podían iluminar la noche con solo desplegar sus alas.\n\nAquella mañana, mientras observaba el amanecer desde una cumbre solitaria, comprendió que las historias eran ciertas.\n\nA lo lejos, entre nubes doradas y montañas infinitas, apareció Pekitiel, el gran guardián celestial. Su silueta cubría el cielo como una constelación viviente, y cada movimiento de sus alas parecía hacer vibrar el propio mundo.\n\nGuo no dijo una palabra. Simplemente observó.\n\nY durante un breve instante, el pequeño viajero y el coloso de los cielos compartieron el mismo horizonte.'
  },
  {
    id: 'galeria4', src: 'img/galeria4.png',
    emoji: '🌌', title: 'El Devorador de Galaxias',
    desc: 'Cuando los primeros reinos apenas comenzaban a surgir, ya existían entidades cuya sola presencia escapaba a toda comprensión. Entre ellas se encontraba Morvak, una manifestación del vacío tan antigua que ni los sabios del Dominio Astral pueden determinar su origen.\n\nLas leyendas afirman que Morvak no conquistaba mundos ni buscaba gobernarlos. Su paso era mucho más devastador. Allí donde aparecía, sistemas enteros desaparecían y galaxias completas eran reducidas a fragmentos errantes en el océano cósmico. Civilizaciones que tardaron millones de años en florecer se extinguían en un instante, consumidas por una oscuridad imposible de detener.\n\nSe dice que incluso las entidades más poderosas evitan pronunciar su nombre, pues Morvak no representa la guerra, la ambición o la corrupción.\n\nRepresenta el final.'
  },
  {
    id: 'galeria5', src: 'img/galeria5.png',
    emoji: '🌍', title: 'El Mundo de Nexus',
    desc: 'Mucho antes de las guerras, los torneos y las leyendas que hoy recorren los reinos, el mundo de Nexus ya existía como un delicado equilibrio entre fuerzas opuestas.\n\nEn lo más alto se alza el Dominio Astral, donde las estrellas, el destino y las entidades celestiales observan el curso de la realidad. Bajo él prosperan los grandes territorios del mundo conocido: los bosques ancestrales del Reino Salvaje, las tierras elementales del Imperio Primordial, las fortalezas mecánicas de la Forja Arcana y las indómitas fronteras donde habitan bestias legendarias.\n\nPero bajo todos ellos se extiende una oscuridad mucho más antigua. El Abismo Eterno, un reino de vacío, corrupción y entidades capaces de alterar la propia existencia.\n\nCada criatura, desde el más humilde Luminos hasta los poderosos Nexus y Semiaza, forma parte de este vasto mundo. Un mundo donde la luz y la oscuridad, la naturaleza y la tecnología, el orden y el caos permanecen unidos por un equilibrio tan frágil como eterno.'
  },
];

var _GALLERY_TOTAL_PIECES = _GALLERY_IMAGES.length * 9; // 36
var _galleryPage = 0;

function _loadFragments(){ try{ return parseInt(localStorage.getItem(_FRAG_KEY)||'0',10)||0; }catch(e){ return 0; } }
function _saveFragments(n){ try{ localStorage.setItem(_FRAG_KEY, String(Math.max(0,n))); }catch(e){} }
function _addFragments(n){ _saveFragments(_loadFragments()+n); _renderFragmentBadges(); }

function _loadGalleryPieces(){ try{ return JSON.parse(localStorage.getItem(_GALLERY_KEY)||'[]'); }catch(e){ return []; } }
function _saveGalleryPieces(arr){ try{ localStorage.setItem(_GALLERY_KEY, JSON.stringify(arr)); }catch(e){} }

function _galleryAllComplete(){
  var pieces = _loadGalleryPieces();
  return pieces.length >= _GALLERY_TOTAL_PIECES;
}

// Abre un cofre: cuesta 5 fragmentos, da pieza aleatoria no obtenida
function openGalleryChest(){
  var frags = _loadFragments();
  if(frags < 5){ _showGalleryMsg('No tienes suficientes Fragmentos Arcanos. Necesitas 5.', false); return; }

  var pieces = _loadGalleryPieces();

  // Si todo está completo, da 25 monedas
  if(pieces.length >= _GALLERY_TOTAL_PIECES){
    _saveFragments(frags - 5);
    var s = _loadStats(); s.coins = (s.coins||0) + 25; _saveStats(s);
    _renderFragmentBadges();
    renderGallery();
    _showCompleteModal();
    return;
  }

  // Buscar pieza no obtenida aleatoria
  var available = [];
  for(var i = 0; i < _GALLERY_TOTAL_PIECES; i++){
    if(pieces.indexOf(i) === -1) available.push(i);
  }
  var newPiece = available[Math.floor(Math.random() * available.length)];
  pieces.push(newPiece);
  _saveGalleryPieces(pieces);
  _saveFragments(frags - 5);
  _renderFragmentBadges();

  var imgIdx  = Math.floor(newPiece / 9);
  var pieceIdx = newPiece % 9;
  var row = Math.floor(pieceIdx / 3);
  var col = pieceIdx % 3;
  var img = _GALLERY_IMAGES[imgIdx];
  var posLabels = [['Superior izquierda','Superior central','Superior derecha'],
                   ['Central izquierda','Centro','Central derecha'],
                   ['Inferior izquierda','Inferior central','Inferior derecha']];

  // Verificar si completó la imagen
  var newPieces = _loadGalleryPieces();
  var imgComplete = true;
  for(var p = 0; p < 9; p++){
    if(newPieces.indexOf(imgIdx*9+p) === -1){ imgComplete = false; break; }
  }

  _showPieceModal(img, pieceIdx, posLabels[row][col], imgComplete);
  renderGallery();
}

function _showPieceModal(img, pieceIdx, posLabel, imgComplete){
  var existing = document.getElementById('pieceUnlockModal');
  if(existing) existing.remove();

  var row = Math.floor(pieceIdx / 3);
  var col = pieceIdx % 3;
  var pct_x = col === 0 ? '0%' : col === 1 ? '50%' : '100%';
  var pct_y = row === 0 ? '0%' : row === 1 ? '50%' : '100%';

  var modal = document.createElement('div');
  modal.id = 'pieceUnlockModal';
  modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.75);display:flex;align-items:center;justify-content:center;z-index:9999;backdrop-filter:blur(4px);animation:fadeIn .2s ease';

  var completeExtra = imgComplete
    ? '<div style="margin-top:.7rem;padding:.45rem .8rem;background:rgba(232,196,106,.12);border:.5px solid rgba(232,196,106,.4);border-radius:8px;font-size:11px;color:#e8c46a;text-align:center">✨ ¡Imagen completa desbloqueada!</div>'
    : '';

  modal.innerHTML = '<div style="background:var(--surface,#1a1a2e);border:.5px solid rgba(123,95,212,.4);border-radius:16px;padding:1.4rem 1.6rem;max-width:280px;width:90%;text-align:center;box-shadow:0 0 40px rgba(123,95,212,.25)">'
    + '<div style="font-size:11px;letter-spacing:.12em;color:#9b59f7;font-family:var(--font-title,serif);margin-bottom:.8rem">¡PIEZA DESBLOQUEADA!</div>'
    + '<div style="width:130px;height:130px;margin:0 auto .9rem;border-radius:10px;overflow:hidden;box-shadow:0 0 20px rgba(155,89,247,.3);background-image:url(\''+img.src+'\');background-size:300% 300%;background-position:'+pct_x+' '+pct_y+';background-repeat:no-repeat"></div>'
    + '<div style="font-size:13px;color:var(--text,#e0e0e0);font-family:var(--font-title,serif);margin-bottom:.3rem">'+img.emoji+' '+img.title+'</div>'
    + '<div style="font-size:10px;color:var(--text-muted,#888);margin-bottom:.2rem">'+posLabel+'</div>'
    + completeExtra
    + '<button onclick="_closePieceModal()" style="margin-top:1rem;background:rgba(123,95,212,.25);border:.5px solid #7b5fd4;border-radius:8px;color:#c4b0ff;font-size:12px;padding:.45rem 1.4rem;cursor:pointer;font-family:var(--font-title,serif);letter-spacing:.06em">Continuar</button>'
    + '</div>';

  document.body.appendChild(modal);
  modal.addEventListener('click', function(e){ if(e.target===modal) _closePieceModal(); });

  history.pushState({ pieceModal: true }, '');
  window.addEventListener('popstate', _onPieceModalBack);
}

function _showCompleteModal(){
  var existing = document.getElementById('pieceUnlockModal');
  if(existing) existing.remove();

  var modal = document.createElement('div');
  modal.id = 'pieceUnlockModal';
  modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.75);display:flex;align-items:center;justify-content:center;z-index:9999;backdrop-filter:blur(4px)';

  modal.innerHTML = '<div style="background:var(--surface,#1a1a2e);border:.5px solid rgba(232,196,106,.4);border-radius:16px;padding:1.4rem 1.6rem;max-width:280px;width:90%;text-align:center;box-shadow:0 0 40px rgba(232,196,106,.18)">'
    + '<div style="font-size:2rem;margin-bottom:.6rem">🎉</div>'
    + '<div style="font-size:11px;letter-spacing:.12em;color:#e8c46a;font-family:var(--font-title,serif);margin-bottom:.6rem">¡GALERÍA COMPLETA!</div>'
    + '<div style="font-size:13px;color:var(--text,#e0e0e0);margin-bottom:.3rem">Has desbloqueado todas las piezas.</div>'
    + '<div style="font-size:12px;color:#c9a84c;margin:.7rem 0;padding:.45rem .8rem;background:rgba(232,196,106,.1);border:.5px solid rgba(232,196,106,.3);border-radius:8px">🪙 +25 monedas</div>'
    + '<button onclick="_closePieceModal()" style="margin-top:.6rem;background:rgba(232,196,106,.2);border:.5px solid #c9a84c;border-radius:8px;color:#e8c46a;font-size:12px;padding:.45rem 1.4rem;cursor:pointer;font-family:var(--font-title,serif);letter-spacing:.06em">Continuar</button>'
    + '</div>';

  document.body.appendChild(modal);
  modal.addEventListener('click', function(e){ if(e.target===modal) _closePieceModal(); });
  history.pushState({ pieceModal: true }, '');
  window.addEventListener('popstate', _onPieceModalBack);
}

function _closePieceModal(){
  var modal = document.getElementById('pieceUnlockModal');
  if(modal) modal.remove();
  window.removeEventListener('popstate', _onPieceModalBack);
}

function _onPieceModalBack(){
  _closePieceModal();
}

// Comprar 1 fragmento por 50 monedas
function buyFragment(){
  var s = _loadStats();
  if((s.coins||0) < 50){ _showGalleryMsg('Necesitas 50 monedas para comprar un Fragmento Arcano.', false); return; }
  s.coins -= 50; _saveStats(s);
  _addFragments(1);
  _showGalleryMsg('Compraste 1 Fragmento Arcano.', true);
  var cd = document.getElementById('store-coins-display');
  if(cd) cd.textContent = s.coins;
}

function _showGalleryMsg(msg, ok){
  var el = document.getElementById('galleryMsg');
  if(!el) return;
  el.textContent = msg;
  el.style.color = ok ? '#4ac97a' : '#ff6b6b';
  el.style.display = 'block';
  clearTimeout(el._t);
  el._t = setTimeout(function(){ el.style.display='none'; }, 4000);
}

// Actualiza los badges de fragmentos en store y galería
function _renderFragmentBadges(){
  var n = _loadFragments();
  document.querySelectorAll('.frag-count').forEach(function(el){ el.textContent = n; });
}

// Renderiza la galería (una imagen por página)
function renderGallery(){
  var wrap = document.getElementById('galleryBody');
  if(!wrap) return;
  var pieces = _loadGalleryPieces();
  var frags  = _loadFragments();
  var total  = _GALLERY_IMAGES.length;
  _galleryPage = Math.max(0, Math.min(total - 1, _galleryPage));
  var img = _GALLERY_IMAGES[_galleryPage];
  var imgIdx = _galleryPage;

  var imgPieces = [];
  for(var p = 0; p < 9; p++) imgPieces.push(pieces.indexOf(imgIdx*9+p) !== -1);
  var unlockedCount = imgPieces.filter(Boolean).length;
  var complete = unlockedCount === 9;

  var html = '';
  html += '<div class="gallery-frags-bar">🔮 <span class="frag-count">'+frags+'</span> Fragmentos Arcanos</div>';
  html += '<div id="galleryMsg" style="display:none;font-size:11px;text-align:center;padding:.3rem .5rem;border-radius:6px;margin-bottom:.6rem"></div>';

  // Paginación superior
  html += '<div class="gallery-pagination">';
  html += '<button class="gallery-page-btn" onclick="galleryChangePage(-1)"'+(imgIdx===0?' disabled':'')+'>‹</button>';
  html += '<span class="gallery-page-label">'+(imgIdx+1)+' / '+total+'</span>';
  html += '<button class="gallery-page-btn" onclick="galleryChangePage(1)"'+(imgIdx===total-1?' disabled':'')+'>›</button>';
  html += '</div>';

  // Álbum
  html += '<div class="gallery-album'+(complete?' gallery-album-complete':'')+'">';
  html += '<div class="gallery-puzzle-grid">';
  for(var p = 0; p < 9; p++){
    var r = Math.floor(p/3), c = p%3;
    var pct_x = c === 0 ? '0%' : c === 1 ? '50%' : '100%';
    var pct_y = r === 0 ? '0%' : r === 1 ? '50%' : '100%';
    if(imgPieces[p]){
      html += '<div class="gallery-piece gallery-piece-unlocked" style="background-image:url(\''+img.src+'\');background-size:300% 300%;background-position:'+pct_x+' '+pct_y+'"></div>';
    } else {
      html += '<div class="gallery-piece gallery-piece-locked"><span class="gallery-piece-lock">🔮</span></div>';
    }
  }
  html += '</div>';
  html += '<div class="gallery-album-info">';
  html += '<div class="gallery-album-title">'+img.emoji+' '+img.title+'</div>';
  html += '<div class="gallery-album-progress">';
  html += '<div class="gallery-prog-bar-wrap"><div class="gallery-prog-bar" style="width:'+Math.round(unlockedCount/9*100)+'%"></div></div>';
  html += '<span class="gallery-prog-label">'+unlockedCount+' / 9 piezas</span>';
  html += '</div>';
  if(complete){
    html += '<div class="gallery-album-desc">'+img.desc.replace(/\n\n/g,'</p><p>').replace(/^/,'<p>').replace(/$/,'</p>')+'</div>';
  }
  html += '</div>';
  html += '</div>';

  wrap.innerHTML = html;
  _renderFragmentBadges();
}

function galleryChangePage(delta){
  _galleryPage = Math.max(0, Math.min(_GALLERY_IMAGES.length - 1, _galleryPage + delta));
  renderGallery();
}

// Tab switcher en pantalla de logros
function achSwitchTab(tab){
  var aw = document.getElementById('achContentWrap');
  var gw = document.getElementById('galleryContentWrap');
  if(aw) aw.style.display = tab==='logros' ? '' : 'none';
  if(gw) gw.style.display = tab==='galeria' ? '' : 'none';
  document.querySelectorAll('.ach-tab').forEach(function(b){ b.classList.remove('active'); });
  var btn = document.getElementById(tab==='logros' ? 'tabLogros' : 'tabGaleria');
  if(btn) btn.classList.add('active');
  if(tab==='galeria') renderGallery();
}
