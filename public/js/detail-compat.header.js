(function(w, d){
  "use strict";
  // ====start  rate team formation flag name =====
  // NOTE: Do not change any IDs/classes used by the DOM; this file only organizes code.
  w.CSLF = w.CSLF || {}
  w.CSLF.DetailCompat = w.CSLF.DetailCompat || {}
  var Common = w.CSLF.DetailCommon;
  if(!Common){ return; }

// Renders team ratings + logos + names + formations into #forms
function renderFormations(inst, lineups, fx) {
  var homeTeamId=null, awayTeamId=null;
  if (fx && fx.length>0) {
    var fixture = fx[0];
    homeTeamId = fixture.teams && fixture.teams.home && fixture.teams.home.id;
    awayTeamId = fixture.teams && fixture.teams.away && fixture.teams.away.id;
  }
  var H=null, A=null;
  if (homeTeamId && awayTeamId) {
    H = lineups.find(x=>x.team && x.team.id===homeTeamId);
    A = lineups.find(x=>x.team && x.team.id===awayTeamId);
  } else {
    H = lineups.find(x=>x.team && x.team.id);
    A = lineups.find(x=>x.team && x.team.id && (!H || x.team.id!==H.team.id));
  }
  var forms = inst.byId('-forms');
  if (!H || !A) { if(forms) forms.innerHTML="Compositions indisponibles"; return; }
  if (!forms) return;
  var homeRating = H.team?.rating || H.rating || 'N/A';
  var awayRating = A.team?.rating || A.rating || 'N/A';
  var homeLogo = H.team?.logo || H.logo || '';
  var awayLogo = A.team?.logo || A.logo || '';

  var formationHtml = '<div style="display:flex;align-items:center;justify-content:space-between;padding:15px;background:#f8f9fa;border-radius:8px;margin-bottom:15px;">';

  formationHtml += '<div style="display:flex;align-items:center;gap:12px;">';
  formationHtml += '<div style="background:#28a745;color:#fff;padding:6px 10px;border-radius:15px;font-size:13px;font-weight:bold;">'+homeRating+'</div>';
  if (homeLogo) { formationHtml += '<img src="'+Common.esc(homeLogo)+'" alt="Home Logo" style="width:30px;height:30px;border-radius:50%;object-fit:cover;">'; }
  formationHtml += '<div style="font-weight:bold;color:#333;font-size:16px;">'+Common.esc(H.team?.name || 'Home')+'</div>';
  formationHtml += '<div style="background:#007bff;color:#fff;padding:4px 8px;border-radius:6px;font-size:12px;font-weight:bold;">'+(H.formation||'N/A')+'</div>';
  formationHtml += '</div>';

  formationHtml += '<div style="display:flex;align-items:center;gap:12px;">';
  formationHtml += '<div style="background:#007bff;color:#fff;padding:4px 8px;border-radius:6px;font-size:12px;font-weight:bold;">'+(A.formation||'N/A')+'</div>';
  formationHtml += '<div style="font-weight:bold;color:#333;font-size:16px;">'+Common.esc(A.team?.name || 'Away')+'</div>';
  if (awayLogo) { formationHtml += '<img src="'+Common.esc(awayLogo)+'" alt="Away Logo" style="width:30px;height:30px;border-radius:50%;object-fit:cover;">'; }
  formationHtml += '<div style="background:#fd7e14;color:#fff;padding:6px 10px;border-radius:15px;font-size:13px;font-weight:bold;">'+awayRating+'</div>';
  formationHtml += '</div>';

  formationHtml += '</div>';
  forms.innerHTML = formationHtml;
}
// ========end  rate team formation flag name  =======
w.CSLF.DetailCompat.renderFormations = renderFormations;
})(window, document);
