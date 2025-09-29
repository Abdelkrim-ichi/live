(function(w, d){
  "use strict";
  // ==========start utils (helpers shared) ==========
  // NOTE: Do not change any IDs/classes used by the DOM; this file only organizes code.
  w.CSLF = w.CSLF || {}
  w.CSLF.DetailCompat = w.CSLF.DetailCompat || {}
  var Common = w.CSLF.DetailCommon;
  if(!Common){ return; }

// Keep a small shared state for cross-file usage
w.CSLF.DetailCompat.state = w.CSLF.DetailCompat.state || {
  playersDataCompat: null
};

// Helper to escape (use Common.esc when possible)
function esc(s){ try{ return Common && Common.esc ? Common.esc(s) : String(s||''); }catch(e){ return String(s||''); } }

// ---- Compatibility / data helpers ----
// Keep as-is names to avoid breaking other calls

// ======start extractSubstitutionData (events -> subst) ======
function extractSubstitutionData(events) {
  var substitutions = {};
  if (!events) return substitutions;
  events.forEach(function(event) {
    if (event.type && event.type.name === 'subst') {
      var playerId = event.player && event.player.id;
      var minute = event.time && event.time.elapsed;
      if (playerId && minute!=null) {
        substitutions[playerId] = substitutions[playerId] || {};
        if (event.detail && event.detail.includes('Substitution')) {
          substitutions[playerId].subOut = minute;
        } else {
          substitutions[playerId].subIn = minute;
        }
      }
    }
  });
  return substitutions;
}
// ======end extractSubstitutionData ======

// ======start mergePlayersWithLineups ======
function mergePlayersWithLineups(lineups, players, events) {
  if (!players || !lineups) return lineups;
  var substitutionData = extractSubstitutionData(events);
  var playersMap = {};
  players.forEach(function(teamData) {
    if (teamData.players) {
      teamData.players.forEach(function(playerData) {
        if (playerData.player && playerData.player.id) {
          var stats = (playerData.statistics && playerData.statistics[0]) ? playerData.statistics[0] : {};
          var pid = playerData.player.id;
          playersMap[pid] = {
            id: playerData.player.id,
            name: playerData.player.name,
            photo: playerData.player.photo,
            minutes: stats.games ? stats.games.minutes : null,
            number:  stats.games ? stats.games.number  : null,
            position:stats.games ? stats.games.position: null,
            rating:  stats.games ? stats.games.rating  : null,
            captain: stats.games ? stats.games.captain : false,
            substitute: stats.games ? stats.games.substitute : false,
            subOut: null,
            subIn: null,
            goals:   stats.goals   ? { total: stats.goals.total, conceded: stats.goals.conceded, assists: stats.goals.assists, saves: stats.goals.saves } : null,
            cards:   stats.cards   ? { yellow: stats.cards.yellow, red: stats.cards.red } : null,
            passes:  stats.passes  ? { total: stats.passes.total, key: stats.passes.key, accuracy: stats.passes.accuracy } : null,
            shots:   stats.shots   ? { total: stats.shots.total, on: stats.shots.on } : null,
            tackles: stats.tackles ? { total: stats.tackles.total, blocks: stats.tackles.blocks, interceptions: stats.tackles.interceptions } : null,
            duels:   stats.duels   ? { total: stats.duels.total, won: stats.duels.won } : null,
            dribbles:stats.dribbles? { attempts: stats.dribbles.attempts, success: stats.dribbles.success, past: stats.dribbles.past } : null,
            fouls:   stats.fouls   ? { drawn: stats.fouls.drawn, committed: stats.fouls.committed } : null,
            offsides:stats.offsides,
            penalty: stats.penalty ? { won: stats.penalty.won, committed: stats.penalty.committed, scored: stats.penalty.scored, missed: stats.penalty.missed, saved: stats.penalty.saved } : null
          };
        }
      });
    }
  });
  Object.keys(substitutionData).forEach(function(pid) {
    if (playersMap[pid]) {
      playersMap[pid].subOut = substitutionData[pid].subOut;
      playersMap[pid].subIn  = substitutionData[pid].subIn;
    }
  });
  lineups.forEach(function(lineup) {
    if (lineup.startXI) {
      lineup.startXI.forEach(function(p) {
        if (p.player && p.player.id && playersMap[p.player.id]) {
          Object.assign(p.player, playersMap[p.player.id]);
        }
      });
    }
    if (lineup.substitutes) {
      lineup.substitutes.forEach(function(p) {
        if (p.player && p.player.id && playersMap[p.player.id]) {
          Object.assign(p.player, playersMap[p.player.id]);
        }
      });
    }
  });
  return lineups;
}
// ======end mergePlayersWithLineups ======

// ======start findDetailedPlayerDataCompat ======
function findDetailedPlayerDataCompat(basicPlayerData) {
  var playersDataCompat = w.CSLF.DetailCompat.state.playersDataCompat;
  if (playersDataCompat) {
    for (var i=0;i<playersDataCompat.length;i++){
      var team = playersDataCompat[i];
      if (!team.players) continue;
      for (var j=0;j<team.players.length;j++){
        var player = team.players[j];
        if (player.player && (
          (basicPlayerData.id && player.player.id === basicPlayerData.id) ||
          (basicPlayerData.name && player.player.name === basicPlayerData.name)
        )){
          return player;
        }
      }
    }
  }
  return basicPlayerData;
}
// ======end findDetailedPlayerDataCompat ======

// ======start small helpers ======
function getFirstName(fullName) {
  if (!fullName || fullName === 'N/A') return 'N/A';
  var parts = String(fullName).trim().split(/\s+/);
  return parts[0] || fullName;
}
function getPositionName(pos) {
  var map = { 'G':'Gardien','D':'Défenseur','M':'Milieu de terrain','F':'Attaquant' };
  return map[(pos||'').toUpperCase()] || 'Attaquant';
}
function getPlayerDetails(player) {
  return {
    name: player.player?.name || player.name || '',
    number: player.player?.number || player.number || '',
    photo: player.player?.photo || player.photo || '',
    position: getPositionName(player.player?.pos || player.pos || ''),
    age: player.player?.age || player.age || '',
    country: player.player?.country || player.country || '',
    flag: player.player?.flag || player.flag || '',
    grid: player.player?.grid || player.grid || null
  };
}
// Expose on namespace

// ======start player modal (compat) ======

// ======start player modal (compat) ======
function showPlayerModalCompat(player, inst){
  try {
    // Accept either a merged player (with flat fields) or raw API object { player, statistics: [...] }
    var flat = player.player ? player.player : player;
    var stats0 = (player.statistics && player.statistics[0]) ? player.statistics[0] : null;

    function pick(pathFlat, pathStats){
      var v = pathFlat ? pathFlat(flat) : null;
      if (v!=null && v!=='') return v;
      if (stats0 && pathStats){
        var vs = pathStats(stats0);
        if (vs!=null && vs!=='') return vs;
      }
      return null;
    }

    var data = {
      id: pick(f=>f.id),
      name: pick(f=>f.name),
      number: pick(f=>f.number, s=> (s.games && s.games.number)),
      position: pick(f=>f.position || f.pos, s=> (s.games && s.games.position)),
      photo: pick(f=>f.photo),
      minutes: pick(f=>f.minutes, s=> (s.games && s.games.minutes)),
      rating: pick(f=>f.rating, s=> (s.games && s.games.rating)),
      goals_total: pick(f=> (f.goals && f.goals.total), s=> (s.goals && s.goals.total)),
      goals_assists: pick(f=> (f.goals && f.goals.assists), s=> (s.goals && s.goals.assists)),
      cards_yellow: pick(f=> (f.cards && f.cards.yellow), s=> (s.cards && s.cards.yellow)),
      cards_red: pick(f=> (f.cards && f.cards.red), s=> (s.cards && s.cards.red)),
      passes_total: pick(f=> (f.passes && f.passes.total), s=> (s.passes && s.passes.total)),
      passes_key: pick(f=> (f.passes && f.passes.key), s=> (s.passes && s.passes.key)),
      passes_accuracy: pick(f=> (f.passes && f.passes.accuracy), s=> (s.passes && s.passes.accuracy)),
      shots_total: pick(f=> (f.shots && f.shots.total), s=> (s.shots && s.shots.total)),
      shots_on: pick(f=> (f.shots && f.shots.on), s=> (s.shots && s.shots.on)),
      tackles_total: pick(f=> (f.tackles && f.tackles.total), s=> (s.tackles && s.tackles.total)),
      duels_total: pick(f=> (f.duels && f.duels.total), s=> (s.duels && s.duels.total)),
      duels_won: pick(f=> (f.duels && f.duels.won), s=> (s.duels && s.duels.won)),
      dribbles_attempts: pick(f=> (f.dribbles && f.dribbles.attempts), s=> (s.dribbles && s.dribbles.attempts)),
      dribbles_success: pick(f=> (f.dribbles && f.dribbles.success), s=> (s.dribbles && s.dribbles.success)),
      fouls_drawn: pick(f=> (f.fouls && f.fouls.drawn), s=> (s.fouls && s.fouls.drawn)),
      fouls_committed: pick(f=> (f.fouls && f.fouls.committed), s=> (s.fouls && s.fouls.committed)),
      subIn: pick(f=> f.subIn),
      subOut: pick(f=> f.subOut),
      captain: pick(f=> f.captain, s=> (s.games && s.games.captain)),
      substitute: pick(f=> f.substitute, s=> (s.games && s.games.substitute)),
    };

    var modalId = "cslf-player-modal";
    var existing = d.getElementById(modalId);
    if (existing) existing.remove();

    var overlay = d.createElement('div');
    overlay.id = modalId;
    overlay.style.position = 'fixed';
    overlay.style.inset = '0';
    overlay.style.background = 'rgba(0,0,0,0.5)';
    overlay.style.display = 'flex';
    overlay.style.alignItems = 'center';
    overlay.style.justifyContent = 'center';
    overlay.style.zIndex = '99999';

    var card = d.createElement('div');
    card.style.background = '#111827';
    card.style.color = '#e5e7eb';
    card.style.width = 'min(560px, 94vw)';
    card.style.borderRadius = '12px';
    card.style.boxShadow = '0 10px 30px rgba(0,0,0,0.35)';
    card.style.overflow = 'hidden';
    card.style.fontFamily = 'system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial';

    var head = d.createElement('div');
    head.style.display = 'flex';
    head.style.alignItems = 'center';
    head.style.gap = '12px';
    head.style.padding = '14px 16px';
    head.style.borderBottom = '1px solid #1f2937';

    var imgWrap = d.createElement('div');
    imgWrap.style.width = '48px';
    imgWrap.style.height = '48px';
    imgWrap.style.borderRadius = '50%';
    imgWrap.style.overflow = 'hidden';
    imgWrap.style.border = '2px solid #374151';
    imgWrap.style.position = 'relative'; // keep clipping for the image

// Rating badge (small circle inside, not clipped)
imgWrap.style.position = 'relative';
imgWrap.style.overflow = 'visible'; // allow badge to extend outside

var ratingNum = parseFloat(data.rating);
if (!isNaN(ratingNum)) {
  var badgeColor = '#28a745';
  if (ratingNum < 5)      badgeColor = '#dc3545';
  else if (ratingNum < 7) badgeColor = '#fd7e14';
  else if (ratingNum < 8.5) badgeColor = '#28a745';
  else badgeColor = '#007bff';

  var rateBadge = d.createElement('div');
  rateBadge.textContent = ratingNum.toFixed(1);

  rateBadge.style.position = 'absolute';
  rateBadge.style.top = '0';
  rateBadge.style.right = '0';
  rateBadge.style.transform = 'translate(25%,-25%)'; // pushes it outside
  rateBadge.style.width = '22px';
  rateBadge.style.height = '22px';
  rateBadge.style.borderRadius = '50%';
  rateBadge.style.display = 'flex';
  rateBadge.style.alignItems = 'center';
  rateBadge.style.justifyContent = 'center';

  rateBadge.style.background = badgeColor;
  rateBadge.style.color = '#fff';
  rateBadge.style.fontSize = '11px';
  rateBadge.style.fontWeight = '700';

  // no border, as you requested
  // rateBadge.style.border = '2px solid #111827';

  imgWrap.appendChild(rateBadge);
}

    if (data.photo){
      var img = new Image();
      img.src = data.photo;
      img.alt = data.name || '';
      img.style.width = '100%';
      img.style.height = '100%';
      img.style.borderRadius = '50%';
      img.style.objectFit = 'cover';
      imgWrap.appendChild(img);
    } else {
      imgWrap.style.display = 'flex';
      imgWrap.style.alignItems = 'center';
      imgWrap.style.justifyContent = 'center';
      imgWrap.textContent = (data.number || '') || '👤';
      imgWrap.style.background = '#374151';
      imgWrap.style.color = '#fff';
      imgWrap.style.fontWeight = '700';
      imgWrap.style.borderRadius = '50%';
    }

    var title = d.createElement('div');
    title.style.flex = '1';
    var pos = data.position || '';
    title.innerHTML = '<div style="font-size:16px;font-weight:700;line-height:1.2;">'+esc(data.name||"")+'</div>' +
                      '<div style="font-size:12px;color:#9ca3af;margin-top:2px;">#'+(data.number||'')+(pos?' · '+pos:'')+'</div>';

    // (Removed the X button to match your request)

    head.appendChild(imgWrap);
    head.appendChild(title);

    var body = d.createElement('div');
    body.style.padding = '14px 16px';
    body.style.display = 'grid';
    body.style.gridTemplateColumns = '1fr 1fr';
    body.style.gap = '10px';

    function addRow(label, value){
      var div = d.createElement('div');
      div.style.display = 'flex';
      div.style.flexDirection = 'column';
      div.style.gap = '4px';
      var l = d.createElement('div'); l.textContent = label; l.style.fontSize = '11px'; l.style.color = '#9ca3af';
      var v = d.createElement('div'); v.textContent = (value==null || value==='') ? '—' : value; v.style.fontSize = '14px'; v.style.fontWeight = '700';
      div.appendChild(l); div.appendChild(v);
      body.appendChild(div);
    }

    addRow('Minutes', data.minutes);
    addRow('Note', data.rating);
    addRow('Buts', data.goals_total);
    addRow('Passes décisives', data.goals_assists);
    addRow('Cartons jaunes', data.cards_yellow);
    addRow('Cartons rouges', data.cards_red);
    addRow('Tirs (total)', data.shots_total);
    addRow('Tirs cadrés', data.shots_on);
    addRow('Passes (total)', data.passes_total);
    addRow('Passes clés', data.passes_key);
    addRow('Précision passes', data.passes_accuracy);
    addRow('Tacles', data.tackles_total);
    addRow('Duels (total)', data.duels_total);
    addRow('Duels gagnés', data.duels_won);
    addRow('Dribbles (tentés)', data.dribbles_attempts);
    addRow('Dribbles réussis', data.dribbles_success);
    addRow('Fautes subies', data.fouls_drawn);
    addRow('Fautes commises', data.fouls_committed);
    if (data.subIn!=null) addRow('Entré à', data.subIn+"'");
    if (data.subOut!=null) addRow('Sorti à', data.subOut+"'");
    addRow('Capitaine', data.captain ? 'Oui' : 'Non');
    addRow('Remplaçant', data.substitute ? 'Oui' : 'Non');

    var foot = d.createElement('div');
    foot.style.padding = '10px 16px';
    foot.style.borderTop = '1px solid #1f2937';
    foot.style.textAlign = 'right';

    // "Fermer" as a small link (no underline)
    var ok = d.createElement('a');
    ok.textContent = 'Fermer';
    ok.href = 'javascript:void(0)';
    ok.style.color = '#9ca3af';
    ok.style.fontSize = '13px';
    ok.style.cursor = 'pointer';
    ok.style.textDecoration = 'none';
    ok.onclick = function(e){ e.preventDefault(); overlay.remove(); };

    foot.appendChild(ok);

    card.appendChild(head);
    card.appendChild(body);
    card.appendChild(foot);
    overlay.appendChild(card);

    // Click outside to close
    overlay.addEventListener('click', function(ev){
      if (ev.target === overlay) overlay.remove();
    });

    d.body.appendChild(overlay);
  } catch(e){
    console.error("[CSLF][modal] failed:", e);
  }
}
// expose
w.showPlayerModalCompat = showPlayerModalCompat;
// ======end player modal (compat) ======

// expose
w.showPlayerModalCompat = showPlayerModalCompat;
// ======end player modal (compat) ======


      w.CSLF.DetailCompat.utils = {
  extractSubstitutionData,
  mergePlayersWithLineups,
  findDetailedPlayerDataCompat,
  getFirstName,
  getPositionName,
  getPlayerDetails,
  esc
};
})(window, document);
