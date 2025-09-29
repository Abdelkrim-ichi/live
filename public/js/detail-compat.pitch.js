(function(w, d){
  "use strict";
  w.CSLF = w.CSLF || {};
  w.CSLF.DetailCompat = w.CSLF.DetailCompat || {};
  var Common = w.CSLF.DetailCommon;
  if(!Common){ return; }

  // ---------- helpers ----------
  function parseGrid(grid){
    var m = String(grid||"").match(/^(\d+):(\d+)$/);
    return m ? {row:+m[1], col:+m[2]} : {row:1, col:1};
  }
  function laneBandForCount(n, padY){
    var W = 100 - 2*padY, f = 1.0;
    if (n===1) f = 0.00;
    else if (n===2) f = 0.50;
    else if (n===3) f = 0.70;
    var start = padY + (W*(1-f)/2);
    var end   = 100 - padY - (W*(1-f)/2);
    return {start:start, end:end};
  }
  function computeCoordsFromGrid(lineup, side){
    var XI = (lineup.startXI||[]).map(function(x){
      var p = x.player || x;
      var g = parseGrid(p.grid);
      return { id:p.id, name:p.name, number:p.number, pos:(p.pos||"").toUpperCase(), row:g.row, col:g.col };
    });
    if (!XI.length) return [];
    var teamMinCol = Math.min.apply(Math, XI.map(p=>p.col));
    var teamMaxCol = Math.max.apply(Math, XI.map(p=>p.col));
    var rows = Array.from(new Set(XI.map(p=>p.row))).sort((a,b)=>a-b);
    var byRow = new Map(rows.map(r=>[r, XI.filter(p=>p.row===r).sort((a,b)=>a.col-b.col)]));

    var padX=6, padY=10, inner=8;
    var xLeftMin=padX, xLeftMax=50-inner, xRightMin=50+inner, xRightMax=100-padX;
    var lerp=(a,b,t)=>a+(b-a)*t;
    var rowMin=rows[0], rowMax=rows[rows.length-1];

    var coords=[];
    rows.forEach(function(r){
      var arr = byRow.get(r)||[], n = arr.length;
      var tRow = (rowMax===rowMin)?0:(r-rowMin)/(rowMax-rowMin);
      var x = (side==='home') ? lerp(xLeftMin,xLeftMax,tRow) : lerp(xRightMax,xRightMin,tRow);
      var band = laneBandForCount(n, side==='away'?padY-3:padY);

      arr.forEach(function(p, idx){
        var yAbs;
        if (teamMaxCol===teamMinCol){ yAbs=50; }
        else {
          var tCol=(p.col-teamMinCol)/(teamMaxCol-teamMinCol);
          yAbs=padY+tCol*(100-2*padY);
        }
        var tSym=(n===1)?0.5:idx/(n-1);
        var ySym=band.start+(band.end-band.start)*tSym;
        var alpha=(n===1)?1.0:(n===2)?1.0:(n===3?0.75:0.0);
        var y=yAbs*(1-alpha)+ySym*alpha;
        if(n>1){ var spacing=(band.end-band.start)/(n-1); y=band.start+idx*spacing; }
        y=100-y; if(side==='away') y=100-y;
        coords.push({x:x,y:y,p:p});
      });
    });
    return coords;
  }

  // ---------- mobile rotation ----------
  function isMobile(){ return w.innerWidth < 768; }

  // Rotate the pitch and scale to fit its parent after width/height swap
  function applyFrameRotation(pitch){
    if (!pitch) return;
    var parent = pitch.parentElement || pitch;

    if (isMobile()){
      var pw = parent.clientWidth || parent.offsetWidth || 0;
      var ph = parent.clientHeight || parent.offsetHeight || 0;
      if (!ph){
        ph = Math.min(w.innerHeight * 0.85, w.innerWidth * 1.1);
        parent.style.minHeight = ph + "px";
      }
      var rect = pitch.getBoundingClientRect();
      var w0 = rect.width  || pitch.offsetWidth  || 1;
      var h0 = rect.height || pitch.offsetHeight || 1;

      // After rotate(90deg): width' = h0, height' = w0
      var sx = pw / h0;
      var sy = ph / w0;
      var s  = Math.min(sx, sy, 1); // avoid over-zoom

      pitch.style.transformOrigin = '50% 50%';
      pitch.style.transform = 'rotate(90deg) scale('+ s +')';
      pitch.classList.add('is-rotated');
    } else {
      pitch.style.transformOrigin = '';
      pitch.style.transform = 'none';
      pitch.classList.remove('is-rotated');
    }
  }

  // Keep players upright on mobile
  function applyPlayersCounterRotation(pitch){
    var rotatePlayer = isMobile();
    pitch.querySelectorAll('.player').forEach(function(el){
      el.style.transform = rotatePlayer
        ? 'translate(-50%, -50%) rotate(-90deg)'
        : 'translate(-50%, -50%)';
    });
  }

  function bindResizeSync(pitch){
    if (pitch.__cslfResizeBound) return;
    pitch.__cslfResizeBound = true;
    pitch.__cslfWasMobile = isMobile();
    w.addEventListener('resize', function(){
      applyFrameRotation(pitch);
      applyPlayersCounterRotation(pitch);
      var nowMobile = isMobile();
      if (nowMobile !== pitch.__cslfWasMobile){
        pitch.__cslfWasMobile = nowMobile;
        if (w.CSLF && w.CSLF.DetailCompat && typeof w.CSLF.DetailCompat.renderFormation === 'function'){
          w.CSLF.DetailCompat.renderFormation();
        }
      }
    });
  }

  // ---------- rendering ----------
  function addPlayerAtPosition(pitch, player, isHome, x, y, idx, isMVP, inst){
    if (!pitch || !player) return;
    var playerData = player.player || player;

    var playerName   = playerData.name || '';
    var playerNumber = playerData.number || '';
    var playerId     = playerData.id;
    var playerPhoto  = playerData.photo || '';
    var playerRating = playerData.rating;
    var playerCards  = playerData.cards || {};
    var playerGoals  = playerData.goals || {};

    var el = d.createElement('div');
    el.className='player';
    el.setAttribute('data-player-id', String(playerId||''));
    el.style.left = x+'%';
    el.style.top  = y+'%';
    el.style.position='absolute';
    el.style.transform='translate(-50%, -50%)';
    el.style.display='flex';
    el.style.flexDirection='column';
    el.style.alignItems='center';
    el.style.cursor='pointer';
    el.style.pointerEvents='auto';
    el.style.zIndex='3';

    var wrap = d.createElement('div');
    wrap.style.position='relative';

    var badge = d.createElement('div');
    badge.style.width='42px'; badge.style.height='42px';
    badge.style.borderRadius='50%';
    badge.style.background='#ffd166';
    badge.style.border='2px solid #111827';
    badge.style.position='relative';
    badge.style.overflow='visible';

    if (playerPhoto){
      var img=new Image(); img.src=playerPhoto; img.alt=playerName||'';
      img.style.position='absolute'; img.style.inset='0';
      img.style.width='100%'; img.style.height='100%';
      img.style.objectFit='cover'; img.style.borderRadius='50%';
      badge.appendChild(img);
    }

    if (playerRating!=null){
      var chip=d.createElement('div');
      var ratingNum=parseFloat(playerRating||0);
      chip.textContent = (isFinite(ratingNum)?ratingNum.toFixed(1):playerRating) + (isMVP ? ' ⭐' : '');
      chip.title = isMVP ? 'Joueur du match' : 'Note';
      chip.style.fontSize='10px'; chip.style.padding='2px 6px';
      chip.style.borderRadius='10px'; chip.style.color='#fff'; chip.style.fontWeight='800';
      chip.style.position='absolute'; chip.style.top='0'; chip.style.right='0';
      chip.style.transform='translate(35%,-35%)';
      if (ratingNum<5)        chip.style.background='#dc3545';
      else if (ratingNum<7)   chip.style.background='#fd7e14';
      else if (ratingNum<8.5) chip.style.background='#28a745';
      else                    chip.style.background='#007bff';
      badge.appendChild(chip);
    }

    // cards
    if ((playerCards.yellow||0)>0 || (playerCards.red||0)>0){
      var tagsTL=d.createElement('div');
      tagsTL.style.position='absolute'; tagsTL.style.display='flex'; tagsTL.style.gap='3px';
      tagsTL.style.top='-6px'; tagsTL.style.left='-6px'; tagsTL.style.flexDirection='column'; tagsTL.style.alignItems='flex-start';
      for(var i=0;i<(playerCards.yellow||0);i++){
        var y1=d.createElement('div');
        y1.style.width='12px'; y1.style.height='16px'; y1.style.border='1px solid #111827';
        y1.style.borderRadius='2px'; y1.style.background='#facc15'; tagsTL.appendChild(y1);
      }
      for(var r=0;r<(playerCards.red||0);r++){
        var r1=d.createElement('div');
        r1.style.width='12px'; r1.style.height='16px'; r1.style.border='1px solid #111827';
        r1.style.borderRadius='2px'; r1.style.background='#ef4444'; tagsTL.appendChild(r1);
      }
      badge.appendChild(tagsTL);
    }

    // goals & assists
    if ((playerGoals.total||0)>0){
      var g=d.createElement('div');
      g.textContent='⚽'+(playerGoals.total>1?'×'+playerGoals.total:'');
      g.style.fontSize='10px'; g.style.padding='2px 6px';
      g.style.borderRadius='6px'; g.style.background='#6c757d';
      g.style.border='1px solid #6c757d'; g.style.color='#fff'; g.style.fontWeight='800';
      g.style.position='absolute'; g.style.bottom='-6px'; g.style.right='-6px';
      badge.appendChild(g);
    }
    if ((playerGoals.assists||0)>0){
      var a=d.createElement('div');
      a.textContent='🦶×'+playerGoals.assists;
      a.style.fontSize='10px'; a.style.padding='2px 6px';
      a.style.borderRadius='6px'; a.style.background='#1f2937';
      a.style.border='1px solid #374151'; a.style.color='#fff'; a.style.fontWeight='800';
      a.style.position='absolute'; a.style.bottom='-6px'; a.style.left='-6px';
      badge.appendChild(a);
    }

    wrap.appendChild(badge);

    var name = d.createElement('div');
    name.style.fontSize='11px'; name.style.marginTop='4px';
    name.style.maxWidth='160px'; name.style.textAlign='center';
    name.style.color='#e5e7eb'; name.style.whiteSpace='nowrap';
    name.style.overflow='hidden'; name.style.textOverflow='ellipsis';
    name.style.fontWeight='bold';
    var last=(String(playerName).trim().split(/\s+/).slice(-1)[0]||'');
    name.textContent=(playerNumber||'')+' '+last;

    el.appendChild(wrap); el.appendChild(name);

    el.addEventListener('click', function(e){
      e.preventDefault(); e.stopPropagation();
      var detailed = w.CSLF.DetailCompat.utils.findDetailedPlayerDataCompat(playerData);
      if (w.showPlayerModalCompat) { w.showPlayerModalCompat(detailed, inst); }
    });

    pitch.appendChild(el);
  }

  function positionPlayersByFormation(pitch, players, formation, isHome, bestPlayer, inst){
    applyFrameRotation(pitch);
    var lineup={ startXI: players };
    var coords=computeCoordsFromGrid(lineup, isHome ? 'home':'away');

    coords.forEach(function(coord, idx){
      if (idx<players.length){
        var pid = (players[idx].player ? players[idx].player.id : players[idx].id);
        var bestId = bestPlayer ? (bestPlayer.player ? bestPlayer.player.id : bestPlayer.id) : null;
        var isMVP = !!(bestId && pid === bestId);
        addPlayerAtPosition(pitch, players[idx], isHome, coord.x, coord.y, idx, isMVP, inst);
      }
    });

    applyPlayersCounterRotation(pitch);
    bindResizeSync(pitch);
  }

  w.CSLF.DetailCompat.pitch = {
    parseGrid, laneBandForCount, computeCoordsFromGrid,
    positionPlayersByFormation, addPlayerAtPosition
  };
})(window, document);
