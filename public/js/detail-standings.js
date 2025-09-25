
(function (w, d) {
  "use strict";

  function ready(fn){ if(w.jQuery){ fn(w.jQuery); } else { setTimeout(()=>ready(fn),50); } }

  ready(($)=>{
    const CFG = w.CSLF_DETAIL || {};
    if(!CFG || !CFG.ajaxurl || !CFG.nonce){
    }

    var Common = w.CSLF && w.CSLF.DetailCommon;

    function formBadges(str){
      if(!str) return '';
      return '<div class="form">'+
        str.slice(-5).split('').map(function(ch){
          var x = ch.toUpperCase(); return '<span class="f '+x+'">'+x+'</span>';
        }).join('') + '</div>';
    }

    function renderStandings(inst, raw, filter){
      var wrap = inst.byId('-standings');
      if(!wrap) return;
      if(!raw || !raw[0] || !raw[0].league || !raw[0].league.standings){
        wrap.innerHTML = "<div class='muted'>Classement indisponible</div>"; return;
      }
      var lg = raw[0].league;
      var table = Array.isArray(lg.standings[0]) ? lg.standings[0] : (lg.standings||[]);
      var rows = table.map(function(r){
        var played=r.all?.played, won=r.all?.win, draw=r.all?.draw, lost=r.all?.lose, gf=r.all?.goals?.for, ga=r.all?.goals?.against;
        if(filter==='home' && r.home){ played=r.home.played; won=r.home.win; draw=r.home.draw; lost=r.home.lose; gf=r.home.goals.for; ga=r.home.goals.against; }
        if(filter==='away' && r.away){ played=r.away.played; won=r.away.win; draw=r.away.draw; lost=r.away.lose; gf=r.away.goals.for; ga=r.away.goals.against; }
        var diff = (isFinite(gf-ga)? (gf-ga) : null);
        return '<tr>'+
          '<td>'+Common.esc(r.rank??'')+'</td>'+
          '<td style="display:flex;align-items:center;gap:8px"><img src="'+Common.esc(r.team?.logo||'')+'" width="18" height="18" alt=""> '+Common.esc(r.team?.name||'')+'</td>'+
          '<td>'+Common.esc(played??'-')+'</td>'+
          '<td>'+Common.esc(won??'-')+'</td>'+
          '<td>'+Common.esc(draw??'-')+'</td>'+
          '<td>'+Common.esc(lost??'-')+'</td>'+
          '<td>'+Common.esc((gf??'-')+'-'+(ga??'-'))+'</td>'+
          '<td>'+Common.esc(diff!=null?(diff>0?('+'+diff):String(diff)):'-')+'</td>'+
          '<td><b>'+Common.esc(r.points??'-')+'</b></td>'+
          '<td>'+formBadges(r.form||'')+'</td>'+
        '</tr>';
      }).join('');
      wrap.innerHTML =
        '<table class="tbl">'+
          '<thead><tr>'+
            '<th>#</th><th>Équipe</th><th>J</th><th>G</th><th>N</th><th>P</th>'+
            '<th>BP-BC</th><th>+/-</th><th>PTS</th><th>Forme</th>'+
          '</tr></thead>'+
          '<tbody>'+rows+'</tbody>'+
        '</table>';
    }

    d.addEventListener('DOMContentLoaded', function(){
      var nodes = d.querySelectorAll('.cslf-detail[id], .cslf-detail[data-instance]');
      nodes.forEach(function(root){
        var inst = Common.fromNode(root);
        var cache = { data:null, filter:'all', leagueId:null, season:null };

        var all  = inst.byId('-standAll'), home = inst.byId('-standHome'), away = inst.byId('-standAway');
        function setFilter(f){
          cache.filter=f;
          [all,home,away].forEach(function(x){ if(x) x.classList.remove('active'); });
          if (f==='home' && home) home.classList.add('active');
          else if (f==='away' && away) away.classList.add('active');
          else if (all) all.classList.add('active');
          if(cache.data) renderStandings(inst, cache.data, cache.filter);
        }
        if (all)  all.addEventListener('click',  function(){ setFilter('all');  });
        if (home) home.addEventListener('click', function(){ setFilter('home'); });
        if (away) away.addEventListener('click', function(){ setFilter('away'); });

        Common.on(inst, 'fixture', function(e){
          cache.leagueId = e.detail.leagueId;
          cache.season   = e.detail.season;
        });

        Common.on(inst, 'tab:classement:show', function(){
          if (!cache.leagueId || !cache.season) return;
          if (cache.data){ renderStandings(inst, cache.data, cache.filter); return; }
          var q = 'league='+encodeURIComponent(cache.leagueId)+'&season='+encodeURIComponent(cache.season);
          Common.getList(inst, 'standings', q).done(function(d){
            cache.data = d;
            renderStandings(inst, d, cache.filter);
          }).fail(function(){ /* retry is inside Common.proxy (nonce) */ });
        });
      });
    });
  });
})(window, document);
