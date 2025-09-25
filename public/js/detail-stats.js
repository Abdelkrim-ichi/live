
(function (w, d) {
  "use strict";

  function ready(fn){ if(w.jQuery){ fn(w.jQuery); } else { setTimeout(()=>ready(fn),50); } }

  ready(($)=>{
    const CFG = w.CSLF_DETAIL || {};
    if (!CFG || !CFG.ajaxurl || !CFG.nonce) {
    }

    var Common = w.CSLF && w.CSLF.DetailCommon;

    function renderStatsTable(inst, stats){
      var box = inst.byId('-statsTable');
      if(!box) return;
      if(!stats || stats.length<2){ box.innerHTML="<div class='muted'>Stats indisponibles</div>"; return; }
      var A=stats[0], B=stats[1], map={};
      (A.statistics||[]).forEach(function(s){ map[s.type]=[s.value,null]; });
      (B.statistics||[]).forEach(function(s){ (map[s.type]||=[null,null])[1]=s.value; });

      var rows = Object.keys(map).map(function(k){
        var v=map[k];
        return '<div class="krow">'+
                 '<span class="pillL">'+Common.esc(v[0]??'—')+'</span>'+
                 '<span class="klabel">'+Common.esc(k)+'</span>'+
                 '<span class="pillR">'+Common.esc(v[1]??'—')+'</span>'+
               '</div>';
      }).join('');
      box.innerHTML = rows;
    }

    d.addEventListener('DOMContentLoaded', function(){
      var nodes = d.querySelectorAll('.cslf-detail[id], .cslf-detail[data-instance]');
      nodes.forEach(function(root){
        var inst = Common.fromNode(root);
        Common.on(inst, 'stats', function(e){ renderStatsTable(inst, e.detail||[]); });
        Common.on(inst, 'tab:stats:show', function(){ /* no-op; core re-emits stats */ });
      });
    });
  });
})(window, document);
