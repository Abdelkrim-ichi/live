
(function (w, d) {
  "use strict";

  function ready(fn){ if(w.jQuery){ fn(w.jQuery); } else { setTimeout(()=>ready(fn),50); } }

  ready(($)=>{
    const CFG = w.CSLF_DETAIL || {};
    if(!CFG || !CFG.ajaxurl || !CFG.nonce){
    }

    var Common = w.CSLF && w.CSLF.DetailCommon;

    function computeH2H(list, homeId, awayId){
      var homeW=0, awayW=0, draws=0;
      (list||[]).forEach(function(m){
        var gh=m.goals?.home, ga=m.goals?.away, played=(m.fixture.status?.short==='FT');
        if(!played) return;
        if(gh===ga) draws++;
        else if(gh>ga){ if(m.teams.home.id===homeId) homeW++; else awayW++; }
        else { if(m.teams.home.id===homeId) awayW++; else homeW++; }
      });
      return {homeW, draws, awayW};
    }

    function renderH2H(inst, list, info, opts){
      var h2hBox = { home:inst.byId('-h2hHome'), draws:inst.byId('-h2hDraws'), away:inst.byId('-h2hAway'), list:inst.byId('-h2h') };
      var arr = (list||[]).slice();
      if (opts.homeOnly) arr = arr.filter(function(m){ return m.teams.home.id===info.homeId; });
      if (opts.sameComp) arr = arr.filter(function(m){ return m.league.id===info.leagueId; });

      arr.sort(function(a,b){
        var aF=(a.fixture.status?.short==='NS'), bF=(b.fixture.status?.short==='NS');
        if(aF && !bF) return -1;
        if(!aF && bF) return 1;
        return new Date(b.fixture.date) - new Date(a.fixture.date);
      });

      var sum = computeH2H(list, info.homeId, info.awayId);
      if (h2hBox.home)  h2hBox.home.textContent  = sum.homeW;
      if (h2hBox.draws) h2hBox.draws.textContent = sum.draws;
      if (h2hBox.away)  h2hBox.away.textContent  = sum.awayW;

      if (h2hBox.list) {
        h2hBox.list.innerHTML = arr.map(function(m){
          var d = new Date(m.fixture.date);
          var score = (m.fixture.status?.short==='NS')
            ? d.toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'})
            : ((m.goals?.home ?? '-') + ' - ' + (m.goals?.away ?? '-'));
          return '<div class="row">'+
                   '<div class="left">'+
                     '<span class="muted" style="width:105px">'+d.toLocaleDateString()+'</span>'+
                     '<span>'+Common.esc(m.teams.home.name)+'</span>'+
                     '<span class="tag">'+Common.esc(score)+'</span>'+
                     '<span>'+Common.esc(m.teams.away.name)+'</span>'+
                   '</div>'+
                   '<div class="muted">'+Common.esc(m.league?.name||'')+'</div>'+
                 '</div>';
        }).join('');
      }
    }

    d.addEventListener('DOMContentLoaded', function(){
      var nodes = d.querySelectorAll('.cslf-detail[id], .cslf-detail[data-instance]');
      nodes.forEach(function(root){
        var inst = Common.fromNode(root);
        var cache = { list:null, info:null, homeOnly:false, sameComp:false };

        var btnHome = inst.byId('-h2hHomeOnly');
        var btnComp = inst.byId('-h2hSameComp');
        if (btnHome) btnHome.addEventListener('click', function(){
          this.classList.toggle('active'); cache.homeOnly = this.classList.contains('active');
          if(cache.list && cache.info) renderH2H(inst, cache.list, cache.info, cache);
        });
        if (btnComp) btnComp.addEventListener('click', function(){
          this.classList.toggle('active'); cache.sameComp = this.classList.contains('active');
          if(cache.list && cache.info) renderH2H(inst, cache.list, cache.info, cache);
        });

        Common.on(inst, 'fixture', function(e){ cache.info = e.detail; });

        Common.on(inst, 'tab:h2h:show', function(){
          if(!cache.info) return;
          if(cache.list){ renderH2H(inst, cache.list, cache.info, cache); return; }
          var q = 'h2h='+encodeURIComponent(cache.info.homeId+'-'+cache.info.awayId);
          Common.getList(inst, 'fixtures/headtohead', q).done(function(d){
            cache.list = d;
            renderH2H(inst, d, cache.info, cache);
          }).fail(function(){ /* retry handled inside Common.proxy if nonce */ });
        });
      });
    });
  });
})(window, document);
