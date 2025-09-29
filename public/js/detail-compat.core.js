(function(w, d){
  "use strict";
  // Core wiring + event bus
  // NOTE: Do not change any IDs/classes used by the DOM; this file only organizes code.
  w.CSLF = w.CSLF || {}
  w.CSLF.DetailCompat = w.CSLF.DetailCompat || {}
  var Common = w.CSLF.DetailCommon;
  if(!Common){ return; }

function ready(fn){ if(w.jQuery){ fn(w.jQuery); } else { setTimeout(()=>ready(fn),50); } }

ready(($)=>{
  var compat = w.CSLF.DetailCompat;
  var utils  = compat.utils;
  var pitch  = compat.pitch;

  var playersDataCompat = null;

  d.addEventListener('DOMContentLoaded', function(){
    var nodes = d.querySelectorAll('.cslf-detail[id], .cslf-detail[data-instance]');
    nodes.forEach(function(root){
      var inst = Common.fromNode(root);
      var fixtureData=null, playersData=null, eventsData=null;

      Common.on(inst, 'fixture', function(e){ fixtureData = e.detail; });
      Common.on(inst, 'players', function(e){
        playersData = e.detail || [];
        playersDataCompat = playersData;
        w.CSLF.DetailCompat.state.playersDataCompat = playersData;
      });
      Common.on(inst, 'events', function(e){ eventsData = e.detail || []; });

      Common.on(inst, 'lineups', function(e){
        var lineups = e.detail || [];
        if (!lineups.length) return;
        if (!fixtureData) return;

        var enriched = lineups;
        if (playersData && playersData.length>0){
          enriched = utils.mergePlayersWithLineups(lineups, playersData, eventsData);
        }

        // Header block
        if (w.CSLF.DetailCompat.renderFormations){
          w.CSLF.DetailCompat.renderFormations(inst, enriched, fixtureData);
        }

        // Pitch block
        var pitchEl = inst.byId('-pitch');
        if (pitchEl){
          // clear
          pitchEl.querySelectorAll('.player').forEach(p=>p.remove());
          pitchEl.classList.add('cslf-pitch');
          // responsive helpers (quick reuse)
          function applyMobilePlayerLayout(){
            if (w.innerWidth <= 768){
              pitchEl.querySelectorAll('.player').forEach(function(player){
                player.style.display='flex'; player.style.flexDirection='column'; player.style.alignItems='center'; player.style.textAlign='center';
                var dot=player.querySelector('.dot'); var name=player.querySelector('.name'); var tags=player.querySelector('.tags');
                if (dot){ dot.style.order='1'; dot.style.marginBottom='6px'; dot.style.marginRight='0'; dot.style.marginTop='0'; dot.style.width='32px'; dot.style.height='32px'; dot.style.fontSize='10px'; }
                if (name){ name.style.order='2'; name.style.marginTop='0'; name.style.marginBottom='0'; name.style.fontSize='11px'; name.style.fontWeight='bold'; name.style.color='white'; name.style.textAlign='center'; name.style.lineHeight='1.2'; }
                if (tags){ tags.style.order='3'; tags.style.marginTop='4px'; tags.style.display='flex'; tags.style.justifyContent='center'; }
                player.style.minWidth='50px'; player.style.maxWidth='70px';
              });
            } else {
              pitchEl.querySelectorAll('.player').forEach(function(player){
                player.style.display=''; player.style.flexDirection=''; player.style.alignItems=''; player.style.textAlign=''; player.style.minWidth=''; player.style.maxWidth='';
                var dot=player.querySelector('.dot'); var name=player.querySelector('.name'); var tags=player.querySelector('.tags');
                if (dot){ dot.style.order=''; dot.style.marginBottom=''; dot.style.marginRight=''; dot.style.marginTop=''; dot.style.width=''; dot.style.height=''; dot.style.fontSize=''; }
                if (name){ name.style.order=''; name.style.marginTop='3px'; name.style.marginBottom=''; name.style.fontSize=''; name.style.fontWeight=''; name.style.color=''; name.style.textAlign=''; name.style.lineHeight=''; name.style.fontSize='13px'; }
                if (tags){ tags.style.order=''; tags.style.marginTop=''; tags.style.display=''; tags.style.justifyContent=''; }
              });
            }
          }
          setTimeout(applyMobilePlayerLayout, 200);
          w.addEventListener('resize', function(){ setTimeout(applyMobilePlayerLayout, 100); });

          // MVP calc
          var bestPlayer=null, bestRating=-1, allPlayers=[];
          var home = enriched[0], away = enriched[1];
          if (home && home.startXI) allPlayers=allPlayers.concat(home.startXI);
          if (away && away.startXI) allPlayers=allPlayers.concat(away.startXI);
          allPlayers.forEach(function(pl){ var data=pl.player||pl; var r=parseFloat(data.rating||0); if (r>bestRating){ bestRating=r; bestPlayer=pl; } });

          if (home && home.startXI && home.startXI.length){
            pitch.positionPlayersByFormation(pitchEl, home.startXI, home.formation, true, bestPlayer, inst);
          }
          if (away && away.startXI && away.startXI.length){
            pitch.positionPlayersByFormation(pitchEl, away.startXI, away.formation, false, bestPlayer, inst);
          }
        }

        // Coach + Substitutes
        if (w.CSLF.DetailCompat.renderSubstitutesAndCoach){
          var homeTeam = enriched.find(x=>x.team && x.team.id);
          var awayTeam = enriched.find(x=>x.team && x.team.id && (!homeTeam || x.team.id!==homeTeam.team.id));
          w.CSLF.DetailCompat.renderSubstitutesAndCoach(inst, homeTeam || enriched[0], awayTeam || enriched[1] || enriched[0]);
        }
      });
    });
  });
});
})(window, document);
