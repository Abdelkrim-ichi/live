(function(w, d){
  "use strict";
  // ====start  rate team formation flag name =====
  w.CSLF = w.CSLF || {}
  w.CSLF.DetailCompat = w.CSLF.DetailCompat || {}
  var Common = w.CSLF.DetailCommon;
  if(!Common){ return; }

  function isMobile(){ return w.innerWidth < 768; }

  // Cache last args for resize re-render
  w.CSLF.DetailCompat._renderFormsCache = w.CSLF.DetailCompat._renderFormsCache || {
    inst:null, lineups:null, fx:null
  };

  // Try to find the stadium/pitch container to place the away block after it
  function findPitchContainer(inst){
    // Prefer something near your composition container
    var el = inst.byId && (inst.byId('-pitch') || inst.byId('-stadium'));
    if (el) return el;
    // Fallback: look for common pitch containers in the same section
    var root = (inst.rootEl) ? inst.rootEl : d;
    return root.querySelector('.cslf-stadium, .stadium, .pitch-frame, .pitch-wrap, .pitch-container, .pitch, .cslf-pitch') || null;
    // If still null, we’ll insert after #forms as a last resort.
  }

  function buildRow(options){
    var rating = options.rating, logo = options.logo, name = options.name, formation = options.formation, ratingBg = options.ratingBg;
    var html = '<div style="display:flex;align-items:center;justify-content:space-between;gap:12px;padding:10px 14px;background:#f8f9fa;border-radius:8px;">';
    html +=   '<div style="display:flex;align-items:center;gap:10px;min-width:0;">';
    html +=     '<div style="background:'+ratingBg+';color:#fff;padding:6px 10px;border-radius:15px;font-size:13px;font-weight:bold;">'+Common.esc(String(rating||"N/A"))+'</div>';
    if (logo) html += '<img src="'+Common.esc(logo)+'" alt="'+Common.esc(name)+'" style="width:30px;height:30px;border-radius:50%;object-fit:cover;">';
    html +=     '<div style="font-weight:bold;color:#333;font-size:16px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">'+Common.esc(name||"")+'</div>';
    html +=   '</div>';
    html +=   '<div style="background:#007bff;color:#fff;padding:4px 8px;border-radius:6px;font-size:12px;font-weight:bold;">'+Common.esc(String(formation||"N/A"))+'</div>';
    html += '</div>';
    return html;
  }

  // Your public renderer
  function renderFormations(inst, lineups, fx) {
    // cache args for resize
    w.CSLF.DetailCompat._renderFormsCache = { inst:inst, lineups:lineups, fx:fx };

    var homeTeamId=null, awayTeamId=null;
    if (fx && fx.length>0) {
      var fixture = fx[0];
      homeTeamId = fixture.teams && fixture.teams.home && fixture.teams.home.id;
      awayTeamId = fixture.teams && fixture.teams.away && fixture.teams.away.id;
    }
    var H=null, A=null;
    if (homeTeamId && awayTeamId) {
      H = lineups.find(function(x){ return x.team && x.team.id===homeTeamId; });
      A = lineups.find(function(x){ return x.team && x.team.id===awayTeamId; });
    } else {
      H = lineups.find(function(x){ return x.team && x.team.id; });
      A = lineups.find(function(x){ return x.team && x.team.id && (!H || x.team.id!==H.team.id); });
    }
    var forms = inst.byId('-forms');
    if (!H || !A) { if(forms) forms.innerHTML="Compositions indisponibles"; return; }
    if (!forms) return;

    var homeRating = H.team?.rating || H.rating || 'N/A';
    var awayRating = A.team?.rating || A.rating || 'N/A';
    var homeLogo = H.team?.logo || H.logo || '';
    var awayLogo = A.team?.logo || A.logo || '';
    var homeName = H.team?.name || 'Home';
    var awayName = A.team?.name || 'Away';
    var homeForm = H.formation || 'N/A';
    var awayForm = A.formation || 'N/A';

    // Build both rows
    var homeRow = buildRow({ rating:homeRating, logo:homeLogo, name:homeName, formation:homeForm, ratingBg:'#28a745' });
    var awayRow = buildRow({ rating:awayRating, logo:awayLogo, name:awayName, formation:awayForm, ratingBg:'#fd7e14' });

    // Clean any previous away container we created
    var existingAway = d.getElementById('cslf-forms-away');

    if (!isMobile()){
      // Desktop: original single bar with both sides (your previous behavior)
      var desktopHtml = '<div style="display:flex;align-items:center;justify-content:space-between;padding:15px;background:#f8f9fa;border-radius:8px;margin-bottom:15px;">';

      desktopHtml += '<div style="display:flex;align-items:center;gap:12px;min-width:0;">'
                   + '<div style="background:#28a745;color:#fff;padding:6px 10px;border-radius:15px;font-size:13px;font-weight:bold;">'+Common.esc(String(homeRating))+'</div>'
                   + (homeLogo? '<img src="'+Common.esc(homeLogo)+'" alt="Home Logo" style="width:30px;height:30px;border-radius:50%;object-fit:cover;">':'')
                   + '<div style="font-weight:bold;color:#333;font-size:16px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">'+Common.esc(homeName)+'</div>'
                   + '<div style="background:#007bff;color:#fff;padding:4px 8px;border-radius:6px;font-size:12px;font-weight:bold;">'+Common.esc(String(homeForm))+'</div>'
                   + '</div>';

      desktopHtml += '<div style="display:flex;align-items:center;gap:12px;min-width:0;">'
                   + '<div style="background:#007bff;color:#fff;padding:4px 8px;border-radius:6px;font-size:12px;font-weight:bold;">'+Common.esc(String(awayForm))+'</div>'
                   + '<div style="font-weight:bold;color:#333;font-size:16px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">'+Common.esc(awayName)+'</div>'
                   + (awayLogo? '<img src="'+Common.esc(awayLogo)+'" alt="Away Logo" style="width:30px;height:30px;border-radius:50%;object-fit:cover;">':'')
                   + '<div style="background:#fd7e14;color:#fff;padding:6px 10px;border-radius:15px;font-size:13px;font-weight:bold;">'+Common.esc(String(awayRating))+'</div>'
                   + '</div>';

      desktopHtml += '</div>';

      forms.innerHTML = desktopHtml;

      if (existingAway) existingAway.remove(); // ensure no extra block on desktop
      return;
    }

    // MOBILE: split — Home above (in #forms), Away below (after pitch)
    forms.innerHTML = '<div class="cslf-forms-home" style="margin-bottom:12px;">'+homeRow+'</div>';

    var pitchEl = findPitchContainer(inst) || forms; // last resort: after #forms
    // Ensure/insert away container AFTER the pitch
    var awayContainer = d.getElementById('cslf-forms-away');
    if (!awayContainer){
      awayContainer = d.createElement('div');
      awayContainer.id = 'cslf-forms-away';
      awayContainer.style.marginTop = '12px';
      pitchEl.insertAdjacentElement('afterend', awayContainer);
    }
    awayContainer.innerHTML = '<div class="cslf-forms-away-row">'+awayRow+'</div>';
  }

  // Re-render on viewport change so blocks move correctly
  (function bindHeaderResize(){
    if (w.CSLF.DetailCompat.__formsResizeBound) return;
    w.CSLF.DetailCompat.__formsResizeBound = true;
    var last = isMobile();
    w.addEventListener('resize', function(){
      var now = isMobile();
      if (now !== last){
        last = now;
        var c = w.CSLF.DetailCompat._renderFormsCache;
        if (c.inst && c.lineups) renderFormations(c.inst, c.lineups, c.fx || []);
      }
    });
  })();

  // ========end  rate team formation flag name  =======
  w.CSLF.DetailCompat.renderFormations = renderFormations;
})(window, document);
