/* ═══════════════════════════════════════════════
   FONDO ANIMADO — titleScreen
   A. Cartas flotantes fantasma
   B. Constelaciones (puntos + líneas)
   C. Estrellas fugaces
═══════════════════════════════════════════════ */

(function(){
  var _tbInited = false;
  var _tbCanvas, _tbCtx, _tbRaf;
  var _tbW = 0, _tbH = 0;
  var _tbCards = [];
  var _tbStars = [];          // puntos de la constelación
  var _tbEdges = [];          // pares conectados
  var _tbShoots = [];         // estrellas fugaces activas
  var _tbShootTimer = 0;
  var _tbNextShoot = 0;
  var _tbLastT = 0;

  // ─── Paleta ───────────────────────────────
  var _PURPLE  = 'rgba(123,95,212,';
  var _GOLD    = 'rgba(232,196,106,';
  var _WHITE   = 'rgba(200,185,255,';

  // ─── Inicializar una vez ──────────────────
  function _tbInit(){
    if(_tbInited) return;
    _tbInited = true;

    // Canvas
    _tbCanvas = document.getElementById('titleBgCanvas');
    if(!_tbCanvas) return;
    _tbCtx = _tbCanvas.getContext('2d');

    // Constelación
    _tbBuildConstellation();

    // Primer disparo de estrella fugaz
    _tbNextShoot = 3000 + Math.random() * 3000;

    _tbResize();
    window.addEventListener('resize', _tbResize);
  }

  // ─── Resize ───────────────────────────────
  function _tbResize(){
    if(!_tbCanvas) return;
    _tbW = _tbCanvas.offsetWidth;
    _tbH = _tbCanvas.offsetHeight;
    _tbCanvas.width  = _tbW;
    _tbCanvas.height = _tbH;
    _tbBuildConstellation();
  }


  // ─── Constelación ─────────────────────────
  function _tbBuildConstellation(){
    if(!_tbW || !_tbH) return;
    _tbStars = [];
    _tbEdges = [];
    var n = 18;
    for(var i = 0; i < n; i++){
      _tbStars.push({
        x: Math.random() * _tbW,
        y: Math.random() * _tbH,
        r: .6 + Math.random() * 1.2,
        phase: Math.random() * Math.PI * 2,
        speed: .3 + Math.random() * .5
      });
    }
    // Conectar pares cercanos (máximo 2 conexiones por nodo)
    var maxDist = Math.min(_tbW, _tbH) * .32;
    var conns = new Array(n).fill(0);
    for(var a = 0; a < n; a++){
      for(var b = a + 1; b < n; b++){
        if(conns[a] >= 2 || conns[b] >= 2) continue;
        var dx = _tbStars[a].x - _tbStars[b].x;
        var dy = _tbStars[a].y - _tbStars[b].y;
        var d  = Math.sqrt(dx*dx + dy*dy);
        if(d < maxDist){
          _tbEdges.push({ a:a, b:b, d:d, maxDist:maxDist, phase: Math.random()*Math.PI*2 });
          conns[a]++; conns[b]++;
        }
      }
    }
  }

  // ─── Estrella fugaz ───────────────────────
  function _tbSpawnShoot(){
    var fromRight = Math.random() < .4;
    var sy = Math.random() * _tbH * .55;
    _tbShoots.push({
      x:  fromRight ? _tbW + 20 : -20,
      y:  sy,
      vx: fromRight ? -(280 + Math.random()*160) : (280 + Math.random()*160),
      vy: 55 + Math.random() * 80,
      len: 60 + Math.random() * 80,
      life: 1.0,
      decay: .9 + Math.random() * .5
    });
  }

  // ─── Loop de animación ────────────────────
  function _tbTick(t){
    if(!_tbCtx || !_tbCanvas) return;
    var dt = Math.min((t - _tbLastT) / 1000, .05);
    _tbLastT = t;

    _tbCtx.clearRect(0, 0, _tbW, _tbH);
    _tbDrawConstellation(t);
    _tbUpdateShoots(dt, t);

    // Programar siguiente fugaz
    _tbShootTimer += dt * 1000;
    if(_tbShootTimer >= _tbNextShoot){
      _tbShootTimer = 0;
      _tbNextShoot  = 4000 + Math.random() * 5000;
      _tbSpawnShoot();
    }

    _tbRaf = requestAnimationFrame(_tbTick);
  }

  // ─── Dibujar constelación ─────────────────
  function _tbDrawConstellation(t){
    var ts = t * .001;
    // Líneas
    for(var i = 0; i < _tbEdges.length; i++){
      var e  = _tbEdges[i];
      var sa = _tbStars[e.a], sb = _tbStars[e.b];
      var fade = (1 - e.d / e.maxDist);
      var pulse = .4 + .6 * (.5 + .5 * Math.sin(ts * .35 + e.phase));
      var alpha = fade * pulse * .13;
      _tbCtx.beginPath();
      _tbCtx.moveTo(sa.x, sa.y);
      _tbCtx.lineTo(sb.x, sb.y);
      _tbCtx.strokeStyle = _PURPLE + alpha + ')';
      _tbCtx.lineWidth   = .6;
      _tbCtx.stroke();
    }
    // Nodos
    for(var j = 0; j < _tbStars.length; j++){
      var s  = _tbStars[j];
      var bp = .5 + .5 * Math.sin(ts * s.speed + s.phase);
      var ba = .15 + bp * .3;
      _tbCtx.beginPath();
      _tbCtx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      _tbCtx.fillStyle = _WHITE + ba + ')';
      _tbCtx.fill();
    }
  }

  // ─── Dibujar estrellas fugaces ────────────
  function _tbUpdateShoots(dt){
    for(var i = _tbShoots.length - 1; i >= 0; i--){
      var sh = _tbShoots[i];
      sh.x += sh.vx * dt;
      sh.y += sh.vy * dt;
      sh.life -= sh.decay * dt;
      if(sh.life <= 0 || sh.x < -200 || sh.x > _tbW + 200){
        _tbShoots.splice(i, 1); continue;
      }
      var nx = sh.x - (sh.vx / Math.abs(sh.vx)) * sh.len;
      var ny = sh.y - (sh.vy / Math.abs(sh.vx)) * sh.len;
      var grad = _tbCtx.createLinearGradient(nx, ny, sh.x, sh.y);
      grad.addColorStop(0, _WHITE + '0)');
      grad.addColorStop(1, _GOLD  + (sh.life * .55) + ')');
      _tbCtx.beginPath();
      _tbCtx.moveTo(nx, ny);
      _tbCtx.lineTo(sh.x, sh.y);
      _tbCtx.strokeStyle = grad;
      _tbCtx.lineWidth   = .8 + sh.life * .5;
      _tbCtx.stroke();
      // Destello en la punta
      _tbCtx.beginPath();
      _tbCtx.arc(sh.x, sh.y, 1.5, 0, Math.PI * 2);
      _tbCtx.fillStyle = _WHITE + (sh.life * .7) + ')';
      _tbCtx.fill();
    }
  }

  // Arrancar siempre al cargar
  window.addEventListener('load', function(){
    _tbInit();
    _tbLastT = performance.now();
    _tbRaf = requestAnimationFrame(_tbTick);
  });
})();
