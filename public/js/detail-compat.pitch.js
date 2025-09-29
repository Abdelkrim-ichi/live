(function(w, d){
  "use strict";
  // ==========start composition  (stadium) ====
  // NOTE: Do not change any IDs/classes used by the DOM; this file only organizes code.
  w.CSLF = w.CSLF || {};
  w.CSLF.DetailCompat = w.CSLF.DetailCompat || {};
  var Common = w.CSLF.DetailCommon;
  if(!Common){ return; }

  // -------- helpers --------
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
      return { id: p.id, name: p.name, number: p.number,
        pos: (p.pos||"").toUpperCase(), row: g.row, col: g.col };
    });
    if (!XI.length) return [];

    var teamMinCol = Math.min.apply(Math, XI.map(function(p){ return p.col; }));
    var teamMaxCol = Math.max.apply(Math, XI.map(function(p){ return p.col; }));
    var rows = Array.from(new Set(XI.map(function(p){ return p.row; }))).sort(function(a,b){ return a-b; });
    var byRow = new Map(rows.map(function(r){
      return [r, XI.filter(function(p){ return p.row===r; }).sort(function(a,b){ return a.col-b.col; })];
    }));

    var padX=6, padY=10, inner=8;
    var xLeftMin=padX, xLeftMax=50-inner, xRightMin=50+inner, xRightMax=100-padX;
    var lerp=function(a,b,t){ return a+(b-a)*t; };
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

  // -------- mobile rotation control --------
  function isMobile(){ return w.innerWidth < 768; }

  // Find the outer "stadium frame" (green rounded card) to rotate on mobile
  function getFieldFrameEl(pitch){
    var guess = pitch.closest('.cslf-stadium, .stadium, .pitch-frame, .pitch-wrap, .pitch-container');
    return guess || pitch;
  }

  function applyFrameRotation(pitch){
    var frame = getFieldFrameEl(pitch);
    if (isMobile()){
      frame.style.transformOrigin = '50% 50%';
      frame.style.transform = 'rotate(90deg)';
      var cs = w.getComputedStyle(frame);
      if ((cs.position||'') === 'static') frame.style.position = 'relative';
    } else {
      frame.style.transform = 'none';
    }
  }

  function applyPlayersCounterRotation(pitch){
    // Ensure players stay upright (counter-rotate) or normal on desktop
    var rotatePlayer = isMobile();
    var els = pitch.querySelectorAll('.player');
    els.forEach(function(el){
      // keep the translate; toggle rotate part only
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
      var nowMobile = isMobile();
      applyFrameRotation(pitch);
      applyPlayersCounterRotation(pitch);

      // If we crossed the mobile/desktop threshold, force a full re-render
      if (nowMobile !== pitch.__cslfWasMobile){
        pitch.__cslfWasMobile = nowMobile;
        if (w.CSLF && w.CSLF.DetailCompat && typeof w.CSLF.DetailCompat.renderFormation === 'function'){
          w.CSLF.DetailCompat.renderFormation();
        }
      }
    });
  }

  // -------- rendering --------
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
    // transform will be finalized by applyPlayersCounterRotation (to handle resize)
    el.style.transform='translate(-50%, -50%)';
    el.style.display='flex';
    el.style.flexDirection='column';
    el.style.alignItems='center';
    el.style.cursor='pointer';

    var wrap = d.createElement('div');
    wrap.style.position='relative';

    var badge = d.createElement('div');
    badge.style.width='42px'; badge.style.height='42px';
    badge.style.borderRadius='50%';
    badge.style.background='#ffd166';
    badge.style.border='2px solid #111827';
    badge.style.position='relative';
    badge.style.overflow='visible'; // allow rating chip to peek outside

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
      chip.textContent = (isFinite(ratingNum)?ratingNum.toFixed(1):playerRating);
      chip.style.fontSize='10px'; chip.style.padding='2px 6px';
      chip.style.borderRadius='10px'; chip.style.color='#fff'; chip.style.fontWeight='800';
      chip.style.position='absolute'; chip.style.top='0'; chip.style.right='0';
      chip.style.transform='translate(35%,-35%)';
      if (ratingNum<5) chip.style.background='#dc3545';
      else if (ratingNum<7) chip.style.background='#fd7e14';
      else if (ratingNum<8.5) chip.style.background='#28a745';
      else chip.style.background='#007bff';
      badge.appendChild(chip);
    }

    // cards (top-left)
    if ((playerCards.yellow||0)>0 || (playerCards.red||0)>0){
      var tagsTL=d.createElement('div');
      tagsTL.style.position='absolute'; tagsTL.style.display='flex'; tagsTL.style.gap='3px';
      tagsTL.style.top='-6px'; tagsTL.style.left='-6px'; tagsTL.style.flexDirection='column'; tagsTL.style.alignItems='flex-start';
      if ((playerCards.yellow||0)>0){
        for(var i=0;i<playerCards.yellow;i++){
          var y1=d.createElement('div');
          y1.style.width='12px'; y1.style.height='16px'; y1.style.border='1px solid #111827';
          y1.style.borderRadius='2px'; y1.style.background='#facc15'; tagsTL.appendChild(y1);
        }
      }
      if ((playerCards.red||0)>0){
        for(var r=0;r<playerCards.red;r++){
          var r1=d.createElement('div');
          r1.style.width='12px'; r1.style.height='16px'; r1.style.border='1px solid #111827';
          r1.style.borderRadius='2px'; r1.style.background='#ef4444'; tagsTL.appendChild(r1);
        }
      }
      badge.appendChild(tagsTL);
    }

    // goals/assists (bottom corners)
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

    // name under avatar — slightly smaller
    var name = d.createElement('div');
    name.style.fontSize='11px'; name.style.marginTop='4px';
    name.style.maxWidth='160px'; name.style.textAlign='center';
    name.style.color='#e5e7eb'; name.style.whiteSpace='nowrap';
    name.style.overflow='hidden'; name.style.textOverflow='ellipsis';
    name.style.fontWeight='bold';
    var last=(String(playerName).trim().split(/\s+/).slice(-1)[0]||'');
    name.textContent=(playerNumber||'')+' '+last;

    el.appendChild(wrap); el.appendChild(name);

    // click -> modal
    el.addEventListener('click', function(e){
      e.preventDefault(); e.stopPropagation();
      var detailed = w.CSLF.DetailCompat.utils.findDetailedPlayerDataCompat(playerData);
      if (w.showPlayerModalCompat) { w.showPlayerModalCompat(detailed, inst); }
    });

    pitch.appendChild(el);
  }

  function positionPlayersByFormation(pitch, players, formation, isHome, bestPlayer, inst){
    // 1) Rotate the outer frame (green card) for current viewport
    applyFrameRotation(pitch);

    // 2) Compute normal (desktop) coords — DO NOT rotate coords
    var lineup={ startXI: players };
    var coords=computeCoordsFromGrid(lineup, isHome ? 'home':'away');

    // 3) Render players
    coords.forEach(function(coord, idx){
      if (idx<players.length){
        var isMVP=(players[idx]===bestPlayer);
        addPlayerAtPosition(pitch, players[idx], isHome, coord.x, coord.y, idx, isMVP, inst);
      }
    });

    // 4) Ensure players are counter-rotated for current viewport & keep in sync on resize
    applyPlayersCounterRotation(pitch);
    bindResizeSync(pitch);
  }

  // Expose
  w.CSLF.DetailCompat.pitch = {
    parseGrid, laneBandForCount, computeCoordsFromGrid,
    positionPlayersByFormation, addPlayerAtPosition
  };
  // ============end composition ==========
})(window, document);
