(function (w, d) {
  "use strict";
  var C = w.CSLF && w.CSLF.DetailCommon;

  function renderTopStats(inst, stats){
    console.log('[CSLF] renderTopStats called with:', stats);
    var posHome=inst.byId('-posHome'), posAway=inst.byId('-posAway'), posBar=inst.byId('-posBarHome');
    var xgHome=inst.byId('-xgHome'),  xgAway=inst.byId('-xgAway');
    var shHome=inst.byId('-shotsHome'),shAway=inst.byId('-shotsAway');
    var bcHome=inst.byId('-bcHome'),  bcAway=inst.byId('-bcAway');
    
    console.log('[CSLF] Found stats elements:', {
      posHome: !!posHome, posAway: !!posAway, posBar: !!posBar,
      xgHome: !!xgHome, xgAway: !!xgAway,
      shHome: !!shHome, shAway: !!shAway,
      bcHome: !!bcHome, bcAway: !!bcAway
    });

    if(!stats || stats.length<2){
      if(posHome) posHome.textContent='50%';
      if(posAway) posAway.textContent='50%';
      if(posBar)  posBar.style.width='50%';
      if(xgHome)  xgHome.textContent='0.00';
      if(xgAway)  xgAway.textContent='0.00';
      if(shHome)  shHome.textContent='0';
      if(shAway)  shAway.textContent='0';
      if(bcHome)  bcHome.textContent='0';
      if(bcAway)  bcAway.textContent='0';
      return;
    }
    var A=stats[0], B=stats[1];
    var pA=C.toNum(find(A,['Ball Possession','Possession'])); var pB=C.toNum(find(B,['Ball Possession','Possession'])) || (100-pA);
    if(posHome) posHome.textContent=pA+'%';
    if(posAway) posAway.textContent=pB+'%';
    if(posBar)  posBar.style.width=pA+'%';

    var xA=C.toNum(find(A,['Expected Goals (xG)','Expected goals (xG)','xG']));
    var xB=C.toNum(find(B,['Expected Goals (xG)','Expected goals (xG)','xG']));
    if(xgHome) xgHome.textContent = (isFinite(xA)? xA.toFixed(2) : '0.00');
    if(xgAway) xgAway.textContent = (isFinite(xB)? xB.toFixed(2) : '0.00');

    var shA=C.toNum(find(A,['Total Shots','Total shots'])), shB=C.toNum(find(B,['Total Shots','Total shots']));
    if(shHome) shHome.textContent=shA; if(shAway) shAway.textContent=shB;

    var bcA=C.toNum(find(A,['Big Chances','Big chances'])), bcB=C.toNum(find(B,['Big Chances','Big chances']));
    if(bcHome) bcHome.textContent=bcA; if(bcAway) bcAway.textContent=bcB;

    function find(block, keys){
      if(!block||!block.statistics) return null;
      for (var i=0;i<block.statistics.length;i++){
        var t=(block.statistics[i].type||'').toLowerCase();
        for (var j=0;j<keys.length;j++){
          if (t===String(keys[j]).toLowerCase()) return block.statistics[i].value;
        }
      }
      return null;
    }
  }

  function renderEvents(inst, ev){
    var box = inst.byId('-events');
    if(!box) return;
    if(!ev || ev.length===0){ box.innerHTML="<div class='muted'>Aucun événement</div>"; return; }
    box.innerHTML = ev.map(function(e){
      var t = (e.time && e.time.elapsed!=null) ? (e.time.elapsed+"'") : '';
      var type = [e.type, e.detail].filter(Boolean).join(' • ');
      return '<div class="event">'+
               '<div class="min">'+C.esc(t)+'</div>'+
               '<div><div style="font-weight:700">'+C.esc(type)+'</div>'+
               '<div class="muted">'+C.esc(e.team?.name||'')+' — '+C.esc(e.player?.name||'')+'</div></div>'+
             '</div>';
    }).join('');
  }

  function renderEventsMini(inst, ev){
    var box = inst.byId('-eventsMini');
    if(!box) return;
    if(!ev || ev.length===0){ box.innerHTML="<div class='muted'>—</div>"; return; }
    var last5 = ev.slice(-5).reverse().map(function(e){
      var t = (e.time && e.time.elapsed!=null) ? (e.time.elapsed+"'") : '';
      var type = [e.type, e.detail].filter(Boolean).join(' • ');
      return '<div class="event"><div class="min">'+C.esc(t)+'</div><div>'+C.esc(type)+' <span class="muted">— '+C.esc(e.team?.name||'')+'</span></div></div>';
    }).join('');
    box.innerHTML = last5;
  }

  function renderSubsMini(inst, ev){
    var box = inst.byId('-subs');
    if(!box) return;
    if(!ev || ev.length===0){ box.innerHTML='—'; return; }
    var subs = ev.filter(function(e){
      var t=(e.type||'').toLowerCase(), d=(e.detail||'').toLowerCase();
      return t==='subst' || d.indexOf('subst')>=0;
    });
    if(subs.length===0){ box.innerHTML='—'; return; }
    box.innerHTML = subs.slice().reverse().map(function(s){
      var t=(s.time && s.time.elapsed!=null) ? (s.time.elapsed+"'") : '';
      return '<div class="event"><div class="min">'+C.esc(t)+'</div>'+
             '<div>Changement <span class="muted">('+C.esc(s.team?.name||'')+')</span> — <b>'+C.esc(s.assist?.name||'')+
             '</b> IN / <b>'+C.esc(s.player?.name||'')+'</b> OUT</div></div>';
    }).join('');
  }

  // Subscribe
  document.addEventListener('DOMContentLoaded', function(){
    var nodes = document.querySelectorAll('.cslf-detail[id], .cslf-detail[data-instance]');
    nodes.forEach(function(root){
      var inst = C.fromNode(root);
      C.on(inst, 'stats',   function(e){ 
        console.log('[CSLF] Resume module received stats:', e.detail);
        renderTopStats(inst, e.detail || []); 
      });
      C.on(inst, 'events',  function(e){ 
        console.log('[CSLF] Resume module received events:', e.detail);
        renderEvents(inst, e.detail || []); 
        renderEventsMini(inst, e.detail || []); 
        renderSubsMini(inst, e.detail || []); 
      });
      C.on(inst, 'lineups', function(e){ 
        console.log('[CSLF] Resume module received lineups:', e.detail);
      });
      C.on(inst, 'tab:resume:show', function(){
        // Re-draw on tab open if cache was emitted earlier
        // (core will also re-emit on switch, but this is harmless)
      });
    });
  });
})(window, document);
