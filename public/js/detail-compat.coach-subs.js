(function(w, d){
  "use strict";
  // ===========start entraineur and changement=======
  // NOTE: Do not change any IDs/classes used by the DOM; this file only organizes code.
  w.CSLF = w.CSLF || {}
  w.CSLF.DetailCompat = w.CSLF.DetailCompat || {}
  var Common = w.CSLF.DetailCommon;
  if(!Common){ return; }

// ======start entraineur ==========
// ======start changement======
// ======end changement ============
// ======end entraineur et chagment ==========
// ======start ramplacant ====
// =======end ramplacant ==========

function renderSubstitutesAndCoach(inst, H, A){
  var utils=w.CSLF.DetailCompat.utils;
  var subsContainer = inst.root.querySelector('#subs-' + inst.id);
  if (!subsContainer) {
    var composPane = inst.root.querySelector('[data-pane="compos"]');
    if (composPane) {
      var subsSection = d.createElement('div');
      subsSection.className = 'cslf-section';
      subsSection.style.marginTop = '20px';
      subsSection.innerHTML = '<div class="cslf-section">Remplaçants & Entraîneurs</div><div id="subs-' + inst.id + '"></div>';
      composPane.appendChild(subsSection);
      subsContainer = d.getElementById('subs-' + inst.id);
    }
  }
  if (!subsContainer) return;

  var html='';
  // ---- Coaches (entraîneur) ----
  html += '<div style="background:#2c2c2c;color:#fff;padding:20px;border-radius:8px;">';
  html += '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:30px;padding:15px;background:rgba(255,255,255,0.1);border-radius:8px;">';

  // Home coach
  html += '<div style="display:flex;align-items:center;gap:12px;">';
  var hc = H.coach?.photo || H.coachPhoto;
  if (hc){ html += '<img src="'+Common.esc(hc)+'" alt="Coach" style="width:50px;height:50px;border-radius:50%;object-fit:cover;">'; }
  else { html += '<div style="width:50px;height:50px;border-radius:50%;background:#666;display:flex;align-items:center;justify-content:center;font-size:16px;">👨‍💼</div>'; }
  html += '<div><div style="font-weight:bold;font-size:16px;">'+Common.esc(utils.getFirstName(H.coach?.name || H.coachName || "N/A"))+'</div><div style="color:#ccc;font-size:12px;">Entraîneur</div></div>';
  html += '</div>';

  // Away coach
  html += '<div style="display:flex;align-items:center;gap:12px;justify-content:flex-end;">';
  var ac = A.coach?.photo || A.coachPhoto;
  if (ac){ html += '<img src="'+Common.esc(ac)+'" alt="Coach" style="width:50px;height:50px;border-radius:50%;object-fit:cover;">'; }
  else { html += '<div style="width:50px;height:50px;border-radius:50%;background:#666;display:flex;align-items:center;justify-content:center;font-size:16px;">👨‍💼</div>'; }
  html += '<div><div style="font-weight:bold;font-size:16px;">'+Common.esc(utils.getFirstName(A.coach?.name || A.coachName || "N/A"))+'</div><div style="color:#ccc;font-size:12px;">Entraîneur</div></div>';
  html += '</div>';

  html += '</div>'; // end coaches

  // ---- Changements (who actually played) ----
  html += '<div class="changements-section" style="margin-bottom:30px;">';
  html += '<h4 style="color:#fff;margin-bottom:20px;font-size:20px;font-weight:bold;">Changements</h4>';
  html += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;">';

  function renderChangeList(team){
    var out='';
    if (team.substitutes && team.substitutes.length>0){
      team.substitutes.filter(function(sub){
        var m=sub.player?.minutes||''; var r=sub.player?.rating||''; return m || r;
      }).forEach(function(sub){
        var playerName=sub.player?.name || sub.name || '';
        var playerNumber=sub.player?.number || sub.number || '';
        var playerPhoto=sub.player?.photo || sub.photo || '';
        var playerPosition=utils.getPositionName(sub.player?.position || sub.player?.pos || sub.pos || '');
        var playerRating=sub.player?.rating || '';
        var playerMinutes=sub.player?.minutes || '';
        var playerCards=sub.player?.cards || {};
        var playerGoals=sub.player?.goals || {};
        out+='<div class="player-entry" style="display:flex;align-items:center;gap:15px;margin-bottom:15px;padding:12px;background:rgba(255,255,255,0.1);border-radius:8px;cursor:pointer;transition:background-color .2s ease;" data-player-id="'+(sub.player?.id || '')+'" data-player-name="'+Common.esc(playerName)+'">';
        if (playerPhoto){ out+='<img src="'+Common.esc(playerPhoto)+'" alt="'+Common.esc(playerName)+'" style="width:50px;height:50px;border-radius:50%;object-fit:cover;">'; }
        else { out+='<div style="width:50px;height:50px;border-radius:50%;background:#666;display:flex;align-items:center;justify-content:center;color:#fff;font-weight:bold;font-size:16px;">'+playerNumber+'</div>'; }
        out+='<div style="flex:1;">';
        if (playerRating){ var rn=parseFloat(playerRating); var color='#28a745'; var icon=''; if (rn>=8.5){ color='#007bff'; icon=' ⭐'; } else if (rn<6.5){ color='#fd7e14'; } out+='<span style="background:'+color+';color:#fff;padding:2px 6px;border-radius:10px;font-size:12px;font-weight:bold;margin-left:8px;">'+playerRating+icon+'</span>'; }
        var subIn=sub.player?.subIn || ''; var subOut=sub.player?.subOut || '';
        var subInfo=''; if (subIn){ subInfo='<span style="background:#28a745;color:#fff;padding:2px 6px;border-radius:10px;font-size:10px;">IN '+subIn+"'</span>"; }
        else if (subOut){ subInfo='<span style="background:#dc3545;color:#fff;padding:2px 6px;border-radius:10px;font-size:10px;">OUT '+subOut+"'</span>"; }
        var perf=''; if (playerGoals){ if (playerGoals.total>0){ perf+='<span style="font-size:10px;line-height:1;padding:2px 6px;border-radius:6px;background:#6c757d;border:1px solid #6c757d;color:#fff;font-weight:800;margin-left:8px;">⚽'+(playerGoals.total>1?'×'+playerGoals.total:'')+'</span>'; } if (playerGoals.assists>0){ perf+='<span style="font-size:10px;line-height:1;padding:2px 6px;border-radius:6px;background:#1f2937;border:1px solid #374151;color:#fff;font-weight:800;margin-left:8px;">🦶×'+playerGoals.assists+'</span>'; } }
        var cards=''; if (playerCards){ if (playerCards.yellow>0) cards+='<span style="color:#ffc107;font-size:12px;margin-left:8px;">🟨 '+playerCards.yellow+'</span>'; if (playerCards.red>0) cards+='<span style="color:#dc3545;font-size:12px;margin-left:8px;">🟥 '+playerCards.red+'</span>'; }
        out+='<div style="color:#fff;font-weight:bold;font-size:16px;">'+playerNumber+' '+Common.esc(utils.getFirstName(playerName))+'</div>';
        out+='<div style="color:#ccc;font-size:14px;">'+Common.esc(playerPosition)+'</div>';
        out+='<div class="substitution-time">'+subInfo+'</div>';
        out+='<div class="performance-stats">'+perf+'</div>';
        out+='<div class="cards-info">'+cards+'</div>';
        out+='</div></div>';
      });
    }
    return out;
  }

  html += '<div class="changements-column">'+renderChangeList(H)+'</div>';
  html += '<div class="changements-column">'+renderChangeList(A)+'</div>';
  html += '</div></div>'; // end changements

  // ---- Remplaçants (never played) ----
  html += '<div class="remplacants-section">';
  html += '<h4 style="color:#fff;margin-bottom:20px;font-size:20px;font-weight:bold;">Remplaçants</h4>';
  html += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;">';

  function renderBench(team){
    var out='';
    if (team.substitutes && team.substitutes.length>0){
      team.substitutes.filter(function(sub){ var m=sub.player?.minutes||''; var r=sub.player?.rating||''; return !(m||r); }).forEach(function(sub){
        var playerName=sub.player?.name || sub.name || '';
        var playerNumber=sub.player?.number || sub.number || '';
        var playerPhoto=sub.player?.photo || sub.photo || '';
        var playerPosition=utils.getPositionName(sub.player?.position || sub.player?.pos || sub.pos || '');
        out+='<div class="player-entry" style="display:flex;align-items:center;gap:15px;margin-bottom:15px;padding:12px;background:rgba(255,255,255,0.1);border-radius:8px;">';
        if (playerPhoto){ out+='<img src="'+Common.esc(playerPhoto)+'" alt="'+Common.esc(playerName)+'" style="width:50px;height:50px;border-radius:50%;object-fit:cover;">'; }
        else { out+='<div style="width:50px;height:50px;border-radius:50%;background:#666;display:flex;align-items:center;justify-content:center;color:#fff;font-weight:bold;font-size:16px;">'+playerNumber+'</div>'; }
        out+='<div style="flex:1;">';
        out+='<div style="color:#fff;font-weight:bold;font-size:16px;">'+playerNumber+' '+Common.esc(utils.getFirstName(playerName))+'</div>';
        out+='<div style="color:#ccc;font-size:14px;">'+Common.esc(playerPosition)+'</div>';
        out+='</div></div>';
      });
    }
    return out;
  }

  html += '<div class="remplacants-column">'+renderBench(H)+'</div>';
  html += '<div class="remplacants-column">'+renderBench(A)+'</div>';
  html += '</div></div>'; // end remplaçants

  html += '</div>'; // end outer box

  subsContainer.innerHTML = html;

        
// Delegate clicks to open modal for subs/bench
subsContainer.addEventListener('click', function(e){
  var el = e.target.closest('.player-entry');
  if (!el) return;
  var pid = el.getAttribute('data-player-id');
  var pname = el.getAttribute('data-player-name');
  var playersDataCompat = (w.CSLF && w.CSLF.DetailCompat && w.CSLF.DetailCompat.state && w.CSLF.DetailCompat.state.playersDataCompat) || null;
  var found = null;
  if (playersDataCompat){
    for (var i=0;i<playersDataCompat.length;i++){
      var team = playersDataCompat[i];
      if (!team.players) continue;
      for (var j=0;j<team.players.length;j++){
        var p = team.players[j];
        if (p.player && ((pid && String(p.player.id)===String(pid)) || (pname && p.player.name===pname))){
          found = p; break;
        }
      }
      if (found) break;
    }
  }
  if (!found) { found = { player: { id: pid, name: pname } }; }
  if (w.showPlayerModalCompat) { w.showPlayerModalCompat(found, inst); }
});

}

w.CSLF.DetailCompat.renderSubstitutesAndCoach = renderSubstitutesAndCoach;
})(window, document);
