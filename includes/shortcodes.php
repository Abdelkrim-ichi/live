<?php
if (!defined('ABSPATH')) exit;

/**
 * Shortcode: [live_foot_results]
 * - Renders nothing if API key is missing in plugin settings.
 * - Uses Select2 for searchable select.
 * - Calls server proxy endpoint action=cslf_api&endpoint=proxy with whitelisted paths.
 */
add_shortcode('live_foot_results', 'live_foot_results_shortcode');

function live_foot_results_shortcode($atts) {
    $opts = cslf_get_options();
    if (empty($opts['api_key'])) {
        return ''; // No API key -> render nothing
    }

    // jQuery + Select2 for searchable selects
    wp_enqueue_script('jquery');
    wp_enqueue_style(
        'lf-select2-css',
        'https://cdn.jsdelivr.net/npm/select2@4.1.0-rc.0/dist/css/select2.min.css',
        [],
        null
    );
    wp_enqueue_script(
        'lf-select2-js',
        'https://cdn.jsdelivr.net/npm/select2@4.1.0-rc.0/dist/js/select2.min.js',
        ['jquery'],
        null,
        true
    );

    $atts = shortcode_atts([
        'refresh_ms' => '30000',
        'detail_url' => '#'
    ], $atts, 'live_foot_results');

    $id      = uniqid();
    $nonce   = wp_create_nonce('cslf_nonce');
    $ajaxurl = admin_url('admin-ajax.php');

    ob_start(); ?>
    <style>
        .live-foot-container-<?php echo $id; ?>{
            --bg:#f5f6f8; --card:#fff; --muted:#9097a1; --border:#e6e8ec; --live:#e63946; --shadow:0 1px 2px rgba(0,0,0,.06);
            font-family:system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;
            background:var(--bg); margin:0; padding:16px; color:#111; display:flex; gap:20px;
            max-width:100%; box-sizing:border-box;
        }
        .live-foot-container-<?php echo $id; ?> .filters{flex:0 0 260px}
        .live-foot-container-<?php echo $id; ?> .filters .field{margin-bottom:14px}
        .live-foot-container-<?php echo $id; ?> .results{flex:1; min-width:0;}
        .live-foot-container-<?php echo $id; ?> .toolbar{display:flex;align-items:center;gap:12px;margin:0 8px 12px}
        .live-foot-container-<?php echo $id; ?> .toolbar h1{font-size:18px;margin:0;font-weight:700}
        .live-foot-container-<?php echo $id; ?> label{display:block;font-weight:600;margin:0 0 6px}
        .live-foot-container-<?php echo $id; ?> select{
            width:100%; padding:10px 12px; border:1px solid var(--border); border-radius:10px; background:#fff; outline:none;
        }

        .live-foot-container-<?php echo $id; ?> .select2-container{width:100%!important}
        .live-foot-container-<?php echo $id; ?> .select2-selection--single{
            height:42px; border:1px solid var(--border)!important; border-radius:10px!important;
        }
        .live-foot-container-<?php echo $id; ?> .select2-selection__rendered{line-height:40px!important; padding-left:10px!important}
        .live-foot-container-<?php echo $id; ?> .select2-selection__arrow{height:40px!important; right:8px!important}
        .live-foot-container-<?php echo $id; ?> .select2-dropdown{border:1px solid var(--border)!important; border-radius:10px!important}
        .live-foot-container-<?php echo $id; ?> .select2-results__option{padding:8px 10px}

        .live-foot-container-<?php echo $id; ?> .rail-outer{
            display:grid;
            grid-template-columns: 40px 1fr 40px;
            align-items:center;
            gap:8px;
            width:100%;
        }
        .live-foot-container-<?php echo $id; ?> .rail{
            display:flex; flex-wrap:nowrap; gap:10px;
            overflow-x:auto; overflow-y:hidden;
            padding:8px 0;
            scroll-snap-type:x mandatory; scroll-behavior:smooth;
            width:100%; box-sizing:border-box;
        }
        .live-foot-container-<?php echo $id; ?> .rail::-webkit-scrollbar{height:8px}
        .live-foot-container-<?php echo $id; ?> .rail::-webkit-scrollbar-thumb{background:#d0d3d8;border-radius:8px}

        .live-foot-container-<?php echo $id; ?> .card{
            flex:0 0 320px; max-width:320px;
            scroll-snap-align:start; background:var(--card);
            border:1px solid var(--border); border-radius:12px;
            padding:12px; box-shadow:var(--shadow); cursor:pointer
        }
        .live-foot-container-<?php echo $id; ?> .card:hover{box-shadow:0 4px 12px rgba(0,0,0,.08)}
        .live-foot-container-<?php echo $id; ?> .card-header{display:flex;align-items:center;justify-content:space-between;margin-bottom:8px}
        .live-foot-container-<?php echo $id; ?> .league{font-weight:800}
        .live-foot-container-<?php echo $id; ?> .broadcaster{font-size:12px;color:#9097a1}
        .live-foot-container-<?php echo $id; ?> .match{display:grid;grid-template-columns:1fr auto 1fr;gap:6px;align-items:center}
        .live-foot-container-<?php echo $id; ?> .team{display:flex;align-items:center;gap:8px;font-weight:600}
        .live-foot-container-<?php echo $id; ?> .team img{width:20px;height:20px;object-fit:contain}
        .live-foot-container-<?php echo $id; ?> .score{font-size:18px;font-weight:800;min-width:42px;text-align:center}
        .live-foot-container-<?php echo $id; ?> .meta{display:flex;justify-content:space-between;align-items:center;margin-top:8px;font-size:12px;color:#9097a1}
        .live-foot-container-<?php echo $id; ?> .kickoff{font-weight:700}
        .live-foot-container-<?php echo $id; ?> .live{color:#fff;background:var(--live);border-radius:999px;padding:2px 8px;font-size:11px;font-weight:800;letter-spacing:.3px}

        .live-foot-container-<?php echo $id; ?> .nav-btn{
            position:static;
            width:34px; height:34px; border:none; border-radius:999px; background:#fff;
            box-shadow:var(--shadow);
            display:flex; align-items:center; justify-content:center; cursor:pointer;
        }
        .live-foot-container-<?php echo $id; ?> .nav-btn.is-disabled{opacity:.35; pointer-events:none}
        .live-foot-container-<?php echo $id; ?> .chev{font-size:16px; line-height:1}

        .live-foot-container-<?php echo $id; ?> .empty{color:var(--muted); margin:8px}
        .live-foot-container-<?php echo $id; ?> .bad{color:#b00020; margin:8px}

        @media (max-width:768px){
            .live-foot-container-<?php echo $id; ?>{flex-direction:column}
            .live-foot-container-<?php echo $id; ?> .filters{flex:1;width:100%}
            .live-foot-container-<?php echo $id; ?> .card{flex-basis:280px; max-width:280px}
            .live-foot-container-<?php echo $id; ?> .rail-outer{grid-template-columns: 30px 1fr 30px}
        }
    </style>

    <div class="live-foot-container-<?php echo $id; ?>">
        <div class="filters">
            <div class="field">
                <label for="lf-leagueSelect-<?php echo $id; ?>">Championnat</label>
                <select id="lf-leagueSelect-<?php echo $id; ?>" class="lf-select">
                    <option value="all">Tous (aujourd’hui)</option>
                </select>
            </div>
            <div class="field">
                <label for="lf-searchSelect-<?php echo $id; ?>">Recherche (ligue/équipe)</label>
                <select id="lf-searchSelect-<?php echo $id; ?>" class="lf-select">
                    <option value="all">Toutes</option>
                </select>
            </div>
        </div>

        <div class="results">
            <div class="toolbar"><h1>Résultats d’aujourd’hui</h1></div>

            <div class="rail-outer">
              <button class="nav-btn nav-prev" id="prevBtn-<?php echo $id; ?>" aria-label="Précédent"><span class="chev">◀</span></button>
              <div id="rail-<?php echo $id; ?>" class="rail"></div>
              <button class="nav-btn nav-next" id="nextBtn-<?php echo $id; ?>" aria-label="Suivant"><span class="chev">▶</span></button>
            </div>

            <div id="empty-<?php echo $id; ?>" class="empty" style="display:none;">Aucun match pour aujourd’hui.</div>
            <div id="error-<?php echo $id; ?>" class="bad" style="display:none;"></div>
        </div>
    </div>

    <script>
(function(w,d){
  function runWhenReady(fn, limit, step){
    var tries=0, max=(limit||5000)/(step||50), delay=step||50;
    (function tick(){
      if (w.jQuery && typeof w.jQuery === "function") { fn(w.jQuery); return; }
      if (tries++ >= max) { console.error("[LF] jQuery never became available"); return; }
      setTimeout(tick, delay);
    })();
  }

  runWhenReady(function($){
    const instanceId = '<?php echo esc_js($id); ?>';
    const AJAX_URL   = "<?php echo esc_url($ajaxurl); ?>";
    const NONCE      = "<?php echo esc_js($nonce); ?>";
    const REFRESH_MS = <?php echo intval($atts['refresh_ms']); ?>;
    const DETAIL_URL = "<?php echo esc_js($atts['detail_url']); ?>";

    const TIMEZONE = "Africa/Casablanca";
    const TODAY    = new Date().toLocaleDateString("en-CA", { timeZone: TIMEZONE }); // YYYY-MM-DD

    let lastData = [];

    function fmtTime(iso){ try{return new Date(iso).toLocaleTimeString([], {hour:"2-digit",minute:"2-digit"});}catch(e){return "";} }
    function liveBadgeText(s){ const map={ "1H":"1re","2H":"2e","HT":"Mi-temps","ET":"Prol.","P":"Tab","FT":"Fin","NS":"À venir" }; return map[s]||s||""; }

    const BIG5_ORDER = [140, 39, 135, 78, 61];
    const ID_BOTOLA  = 253;

    const CL_KEYS = {
      CAF:     ["caf champions league"],
      UEFA:    ["uefa champions league"],
      CONMEBOL:["copa libertadores","libertadores"],
      AFC:     ["afc champions league"]
    };

    const CT = {
      europe: ["England","Spain","France","Germany","Italy","Portugal","Netherlands","Belgium","Turkey","Scotland","Switzerland","Austria","Denmark","Norway","Sweden","Poland","Czech Republic","Greece","Croatia","Serbia","Ukraine","Russia","Romania","Hungary","Ireland"],
      latam:  ["Argentina","Brazil","Uruguay","Paraguay","Bolivia","Peru","Chile","Colombia","Ecuador","Venezuela","Mexico","Costa Rica","Panama","Honduras","Guatemala","El Salvador","Nicaragua","Dominican Republic"],
      asia:   ["Japan","Korea Republic","South Korea","Saudi Arabia","Qatar","United Arab Emirates","China PR","China","India","Iran","Iraq","Vietnam","Thailand","Indonesia","Malaysia","Uzbekistan"],
      africa: ["Morocco","Maroc","Algeria","Algérie","Tunisia","Tunisie","Egypt","Égypte","Senegal","Sénégal","Ivory Coast","Côte d'Ivoire","Nigeria","Nigéria","South Africa","Afrique du Sud","Cameroon","Ghana","Burkina Faso","Mali"]
    };

    function getContinent(country){
      if(!country) return "other";
      if(CT.africa.includes(country)) return "africa";
      if(CT.europe.includes(country)) return "europe";
      if(CT.latam.includes(country))  return "latam";
      if(CT.asia.includes(country))   return "asia";
      if(country.includes("Europe"))  return "europe";
      if(country.includes("America")) return "latam";
      if(country.includes("Asia"))    return "asia";
      if(country.includes("Africa"))  return "africa";
      return "other";
    }

    function isChampionsLeague(name){
      if(!name) return null;
      const n = name.toLowerCase();
      if (CL_KEYS.CAF.some(k=>n.includes(k)))      return "CAF";
      if (CL_KEYS.UEFA.some(k=>n.includes(k)))     return "UEFA";
      if (CL_KEYS.CONMEBOL.some(k=>n.includes(k))) return "CONMEBOL";
      if (CL_KEYS.AFC.some(k=>n.includes(k)))      return "AFC";
      return null;
    }

    function isNationalTeamsCompetition(name){
      if(!name) return false;
      const n = name.toLowerCase();
      return (
        n.includes("friendly international") ||
        n.includes("uefa euro") || n.includes("european championship") || n.includes("nations league") ||
        n.includes("world cup") || n.includes("qualification") ||
        n.includes("africa cup") || n.includes("afcon") || n.includes("caf ")
      );
    }

    function hasMoroccoTeam(m){
      const hn = (m?.teams?.home?.name || "").toLowerCase();
      const an = (m?.teams?.away?.name || "").toLowerCase();
      return (hn==="morocco" || an==="morocco");
    }

    function leaguePriorityTuple(L, sampleMatch){
      const id   = L?.id;
      const name = (L?.name||"");
      const country = (L?.country||"");
      const cl = isChampionsLeague(name);
      if (cl){
        const map = { CAF:1, UEFA:2, CONMEBOL:3, AFC:4 };
        return [10 + (map[cl] || 9), 0];
      }
      if (isNationalTeamsCompetition(name)){
        if (sampleMatch && hasMoroccoTeam(sampleMatch)) return [20, 0];
        const cont = getContinent(country);
        const map = { africa:21, europe:22, latam:23, asia:24, other:25 };
        return [map[cont] || 25, 0];
      }
      if (country==="Morocco" || country==="Maroc" || id===ID_BOTOLA || (name.toLowerCase().includes("botola"))) {
        return [1, 0];
      }
      const idx = BIG5_ORDER.indexOf(id);
      if (idx >= 0) return [2, idx];
      const cont = getContinent(country);
      const map = { europe:3, latam:4, asia:5, other:6, africa:7 };
      return [map[cont] || 6, 0];
    }

    function groupByLeague(arr){
      const by = {};
      for(const m of arr){
        const L = m.league; if(!L) continue;
        (by[L.id] ??= { id:L.id, name:L.name, country:L.country, m:[], sample:m }).m.push(m);
      }
      return Object.values(by).sort((a,b)=>{
        const [ga, ia] = leaguePriorityTuple(a, a.sample);
        const [gb, ib] = leaguePriorityTuple(b, b.sample);
        if (ga !== gb) return ga - gb;
        if (ia !== ib) return ia - ib;
        return (a.name||"").localeCompare(b.name||"");
      });
    }

    function initSelect2($el, placeholder){
      if (!$.fn.select2) return;
      if ($el.hasClass('select2-hidden-accessible')) $el.select2('destroy');
      $el.select2({
        width: '100%',
        placeholder: placeholder || '',
        allowClear: true,
        dropdownParent: $el.parent(),
        language: {
          noResults: function(){ return "Aucun résultat"; },
          searching: function(){ return "Recherche…"; }
        }
      });
    }

    function populateLeagueSelect(matches){
      const $sel = $(`#lf-leagueSelect-${instanceId}`);
      const prev = $sel.val() || "all";
      const leagues = groupByLeague(matches);
      $sel.empty().append('<option value="all">Tous (aujourd’hui)</option>');
      for(const L of leagues){ $sel.append(`<option value="${L.id}">${L.name}</option>`); }
      if ([...$sel.find("option")].some(o=>o.value===prev)) $sel.val(prev);
      initSelect2($sel, 'Tous (aujourd’hui)');
    }

    function populateSearchSelect(matches){
      const leaguesMap = new Map();
      const teamsSet   = new Set();
      for (const m of matches){
        if (m.league?.id && m.league?.name){
          leaguesMap.set(m.league.id, m.league.name);
        }
        if (m.teams?.home?.name) teamsSet.add(m.teams.home.name);
        if (m.teams?.away?.name) teamsSet.add(m.teams.away.name);
      }

      const $sel = $(`#lf-searchSelect-${instanceId}`);
      const prev = $sel.val() || "all";
      $sel.empty().append('<option value="all">Toutes</option>');

      if (leaguesMap.size){
        const leagues = Array.from(leaguesMap.entries()).sort((a,b)=>a[1].localeCompare(b[1]));
        const $og = $('<optgroup label="Ligues"></optgroup>');
        for (const [id, name] of leagues){ $og.append(`<option value="league:${id}">${name}</option>`); }
        $sel.append($og);
      }
      if (teamsSet.size){
        const teams = Array.from(teamsSet).sort((a,b)=>a.localeCompare(b));
        const $og2 = $('<optgroup label="Équipes"></optgroup>');
        for (const t of teams){ $og2.append(`<option value="team:${t.replace(/"/g,'&quot;')}">${t}</option>`); }
        $sel.append($og2);
      }

      if ([...$sel.find("option")].some(o=>o.value===prev)) $sel.val(prev);
      initSelect2($sel, 'Toutes');
    }

    function filterBySelection(matches){
      const selLeague = $(`#lf-leagueSelect-${instanceId}`).val() || "all";
      let out = selLeague==="all" ? matches : matches.filter(m => m.league && m.league.id === parseInt(selLeague,10));
      const selSearch = $(`#lf-searchSelect-${instanceId}`).val() || "all";
      if (selSearch !== "all"){
        if (selSearch.startsWith("league:")){
          const lid = parseInt(selSearch.split(":")[1],10);
          out = out.filter(m => m.league && m.league.id === lid);
        } else if (selSearch.startsWith("team:")){
          const team = selSearch.slice(5);
          out = out.filter(m => (m.teams?.home?.name===team) || (m.teams?.away?.name===team));
        }
      }
      return out;
    }

    function updateNavButtons(){
      const rail = document.getElementById(`rail-${instanceId}`);
      if(!rail) return;
      const atStart = rail.scrollLeft <= 0;
      const atEnd   = Math.ceil(rail.scrollLeft + rail.clientWidth) >= rail.scrollWidth;
      $(`#prevBtn-${instanceId}`).toggleClass('is-disabled', atStart);
      $(`#nextBtn-${instanceId}`).toggleClass('is-disabled', atEnd);
    }

    function scrollByCards(dir=1){
      const rail = document.getElementById(`rail-${instanceId}`);
      if(!rail) return;
      const card = rail.querySelector(".card");
      const step = card ? (card.getBoundingClientRect().width + 10) * 2 : rail.clientWidth * 0.8;
      rail.scrollBy({ left: dir*step, behavior:"smooth" });
      setTimeout(updateNavButtons, 300);
    }

    function renderRail(matches){
      const filtered = filterBySelection(matches);
      const railEl = document.getElementById(`rail-${instanceId}`);
      railEl.innerHTML = '';
      $(`#empty-${instanceId}`).toggle(filtered.length === 0);
      if (!filtered.length){ updateNavButtons(); return; }

      const grouped = groupByLeague(filtered);
      const frag = document.createDocumentFragment();

      for (const G of grouped){
        for (const m of G.m){
          const home = m.teams.home, away = m.teams.away;
          const gh = (m.goals.home ?? "-"), ga = (m.goals.away ?? "-");
          const st = m.fixture.status;
          const elapsed = (st.elapsed != null) ? `${st.elapsed}'` : "";
          const isLive  = st.short && st.short!=="NS" && st.short!=="FT";
          const badge   = isLive ? `<span class="live">LIVE ${elapsed}</span>` : `<span class="broadcaster">${(st.short||"")}</span>`;
          const sub     = m.league?.round || m.fixture?.venue?.name || "";
          const fixtureId = m.fixture.id;

          const a = document.createElement('a');
          a.className = 'card';
          a.href = `${DETAIL_URL}?fixture=${fixtureId}`;
          a.innerHTML = `
            <div class="card-header">
              <div>
                <div class="league">${G.name}</div>
                <div class="broadcaster">${sub || ""}</div>
              </div>
              ${badge}
            </div>
            <div class="match">
              <div class="team">${home.logo?`<img src="${home.logo}" alt="${home.name}">`:""}<span>${home.name}</span></div>
              <div class="score">${gh}–${ga}</div>
              <div class="team" style="justify-content:end;"><span>${away.name}</span>${away.logo?`<img src="${away.logo}" alt="${away.name}">`:""}</div>
            </div>
            <div class="meta"><span class="kickoff">${fmtTime(m.fixture.date)}</span><span>${m.league.country||""}</span></div>
          `;
          frag.appendChild(a);
        }
      }

      railEl.appendChild(frag);
      updateNavButtons();
    }

    function apiProxy(path, query) {
      return $.ajax({
        url: AJAX_URL,
        method: "POST",
        dataType: "json",
        data: { action:'cslf_api', _wpnonce:NONCE, endpoint:'proxy', path, query },
        timeout: 12000
      });
    }

    function fetchToday(){
      const q = `date=${encodeURIComponent(TODAY)}&timezone=${encodeURIComponent(TIMEZONE)}`;
      apiProxy('fixtures', q)
        .done(function(payload){
          if(!payload || !payload.success){
            const msg = payload?.data?.message || 'Réponse invalide';
            $(`#error-${instanceId}`).show().text("Erreur API: " + msg);
            return;
          }
          const arr = Array.isArray(payload.data?.response) ? payload.data.response : [];
          lastData = arr;
          populateLeagueSelect(arr);
          populateSearchSelect(arr);
          renderRail(arr);
        })
        .fail(function(xhr, status, error){
          let msg = "Erreur API: " + xhr.status + " " + (error || status);
          if (xhr.responseJSON && xhr.responseJSON.data && xhr.responseJSON.data.message) {
            msg += " (" + xhr.responseJSON.data.message + ")";
          }
          $(`#error-${instanceId}`).show().text(msg);
          document.getElementById(`rail-${instanceId}`).innerHTML = '<div style="padding:20px;text-align:center;color:#b00020;">Erreur de chargement</div>';
        });
    }

    fetchToday();

    $(document).on('change', `#lf-leagueSelect-${instanceId}, #lf-searchSelect-${instanceId}`, function(){
      renderRail(lastData);
    });

    $(`#prevBtn-${instanceId}`).on("click", ()=>scrollByCards(-1));
    $(`#nextBtn-${instanceId}`).on("click", ()=>scrollByCards(1));
    $(`#rail-${instanceId}`).on("scroll", updateNavButtons);

    // Optional auto-refresh
    // setInterval(fetchToday, REFRESH_MS);
  });
})(window, document);
    </script>
    <?php
    return ob_get_clean();
}

/**********************************************************
 * Shortcode: [live_foot_detail]
 * - Renders nothing if API key is missing in plugin settings.
 * - Détail du match: résumé, fil, compos, classement, stats, H2H
 **********************************************************/
add_shortcode('live_foot_detail', 'cslf_live_foot_results_shortcode');

function cslf_live_foot_results_shortcode($atts){
    $opts = cslf_get_options();
    if (empty($opts['api_key'])) {
        return ''; // No API key -> render nothing
    }

    // jQuery
    wp_enqueue_script('jquery');

    $a = shortcode_atts([
        'refresh_ms' => '30000',
        'back_url'   => '/',
        'timezone'   => 'Africa/Casablanca',
    ], $atts, 'live_foot_detail');

    $id      = uniqid('lfd_');
    $nonce   = wp_create_nonce('cslf_nonce');
    $ajaxurl = admin_url('admin-ajax.php');

    ob_start(); ?>
    <style>
      .lfd-wrap-<?php echo $id; ?>{--border:#e6e8ec;--muted:#8a90a0;--pill:#f5f6f8;font-family:system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif}
      .lfd-wrap-<?php echo $id; ?> .topbar{display:flex;align-items:center;gap:12px;margin-bottom:12px}
      .lfd-wrap-<?php echo $id; ?> .back{display:inline-flex;align-items:center;gap:6px;padding:8px 12px;border:1px solid var(--border);border-radius:10px;text-decoration:none;color:#111;background:#fff}
      .lfd-wrap-<?php echo $id; ?> .fixture{border:1px solid var(--border);border-radius:12px;padding:12px;background:#fff;margin-bottom:12px}
      .lfd-wrap-<?php echo $id; ?> .teams{display:grid;grid-template-columns:1fr auto 1fr;gap:10px;align-items:center}
      .lfd-wrap-<?php echo $id; ?> .team{display:flex;gap:8px;align-items:center;font-weight:700}
      .lfd-wrap-<?php echo $id; ?> .team img{width:26px;height:26px;object-fit:contain}
      .lfd-wrap-<?php echo $id; ?> .score{font-size:26px;font-weight:900}
      .lfd-wrap-<?php echo $id; ?> .meta{display:flex;gap:10px;color:var(--muted);font-size:12px;margin-top:6px}
      .lfd-wrap-<?php echo $id; ?> .tabs{display:flex;gap:8px;flex-wrap:wrap;margin:10px 0}
      .lfd-wrap-<?php echo $id; ?> .tab{padding:8px 12px;border:1px solid var(--border);border-radius:999px;background:var(--pill);cursor:pointer;font-weight:600}
      .lfd-wrap-<?php echo $id; ?> .tab.active{background:#111;color:#fff;border-color:#111}
      .lfd-wrap-<?php echo $id; ?> .panel{display:none;border:1px solid var(--border);border-radius:12px;padding:12px;background:#fff}
      .lfd-wrap-<?php echo $id; ?> .panel.active{display:block}
      .lfd-wrap-<?php echo $id; ?> .grid2{display:grid;grid-template-columns:1fr 1fr;gap:10px}
      .lfd-wrap-<?php echo $id; ?> .events{display:grid;gap:8px}
      .lfd-wrap-<?php echo $id; ?> .event{display:flex;gap:8px;align-items:center;border-bottom:1px dashed #eee;padding:6px 0}
      .lfd-wrap-<?php echo $id; ?> .lineups{display:grid;gap:12px}
      .lfd-wrap-<?php echo $id; ?> .coach{font-size:12px;color:var(--muted)}
      .lfd-wrap-<?php echo $id; ?> .pitch{position:relative;background:#0b8f35;color:#fff;border-radius:12px;height:380px;overflow:hidden}
      .lfd-wrap-<?php echo $id; ?> .pitch .zone{position:absolute;inset:0;display:grid;grid-template-rows:repeat(5,1fr);grid-template-columns:repeat(5,1fr);padding:10px;gap:6px}
      .lfd-wrap-<?php echo $id; ?> .player{display:flex;align-items:center;justify-content:center;background:rgba(255,255,255,.2);border-radius:999px;font-size:11px;padding:4px 6px}
      .lfd-wrap-<?php echo $id; ?> .stats{display:grid;gap:8px}
      .lfd-wrap-<?php echo $id; ?> .stat-row{display:flex;justify-content:space-between;border-bottom:1px solid #f0f0f0;padding:6px 0}
      .lfd-wrap-<?php echo $id; ?> .standings{overflow:auto}
      .lfd-wrap-<?php echo $id; ?> table{border-collapse:collapse;width:100%}
      .lfd-wrap-<?php echo $id; ?> th,.lfd-wrap-<?php echo $id; ?> td{border:1px solid #eee;padding:6px 8px;font-size:13px}
      @media(max-width:760px){.lfd-wrap-<?php echo $id; ?> .grid2{grid-template-columns:1fr}}
    </style>

    <div class="lfd-wrap-<?php echo $id; ?>">
      <div class="topbar">
        <a class="back" href="<?php echo esc_url($a['back_url']); ?>">◀ Retour</a>
        <div id="title-<?php echo $id; ?>"></div>
      </div>

      <div class="fixture">
        <div class="teams">
          <div class="team" id="home-<?php echo $id; ?>"></div>
          <div class="score" id="score-<?php echo $id; ?>">-</div>
          <div class="team" id="away-<?php echo $id; ?>" style="justify-content:end;"></div>
        </div>
        <div class="meta" id="meta-<?php echo $id; ?>"></div>
      </div>

      <div class="tabs">
        <div class="tab active" data-tab="resume-<?php echo $id; ?>">Résumé</div>
        <div class="tab" data-tab="fil-<?php echo $id; ?>">Fil du match</div>
        <div class="tab" data-tab="compos-<?php echo $id; ?>">Compositions</div>
        <div class="tab" data-tab="classement-<?php echo $id; ?>">Classement</div>
        <div class="tab" data-tab="stats-<?php echo $id; ?>">Statistiques</div>
        <div class="tab" data-tab="h2h-<?php echo $id; ?>">Face à face</div>
      </div>

      <div class="panel active" id="resume-<?php echo $id; ?>">
        <div class="grid2">
          <div>
            <h3>Informations</h3>
            <div id="info-<?php echo $id; ?>"></div>
          </div>
          <div>
            <h3>Derniers événements</h3>
            <div class="events" id="last-events-<?php echo $id; ?>"></div>
          </div>
        </div>
      </div>

      <div class="panel" id="fil-<?php echo $id; ?>">
        <div class="events" id="events-<?php echo $id; ?>"></div>
      </div>

      <div class="panel" id="compos-<?php echo $id; ?>">
        <div class="lineups">
          <div>
            <h3 id="home-coach-<?php echo $id; ?>"></h3>
            <div class="pitch"><div class="zone" id="home-pitch-<?php echo $id; ?>"></div></div>
          </div>
          <div>
            <h3 id="away-coach-<?php echo $id; ?>"></h3>
            <div class="pitch"><div class="zone" id="away-pitch-<?php echo $id; ?>"></div></div>
          </div>
        </div>
      </div>

      <div class="panel" id="classement-<?php echo $id; ?>">
        <div class="standings" id="standings-<?php echo $id; ?>"></div>
      </div>

      <div class="panel" id="stats-<?php echo $id; ?>">
        <div class="stats" id="stats-body-<?php echo $id; ?>"></div>
      </div>

      <div class="panel" id="h2h-<?php echo $id; ?>">
        <div class="events" id="h2h-body-<?php echo $id; ?>"></div>
      </div>
    </div>

    <script>
(function(w,d){
  function ready(fn){ if (w.jQuery) fn(w.jQuery); else setTimeout(()=>ready(fn),50); }
  ready(function($){
    const AJAX_URL = "<?php echo esc_url($ajaxurl); ?>";
    const NONCE    = "<?php echo esc_js($nonce); ?>";
    const TZ       = "<?php echo esc_js($a['timezone']); ?>";

    const qs = new URLSearchParams(w.location.search);
    const FIXTURE_ID = parseInt(qs.get("fixture"),10);
    if (!FIXTURE_ID){ $('.lfd-wrap-<?php echo $id; ?>').html('<div style="padding:20px;color:#b00020;">Aucun match spécifié.</div>'); return; }

    // Tabs
    $(document).on('click', '.lfd-wrap-<?php echo $id; ?> .tab', function(){
      const t = $(this).data('tab');
      $('.lfd-wrap-<?php echo $id; ?> .tab').removeClass('active');
      $(this).addClass('active');
      $('.lfd-wrap-<?php echo $id; ?> .panel').removeClass('active');
      $('#'+t).addClass('active');
    });

    function apiProxy(path, query){
      return $.ajax({
        url: AJAX_URL, method: 'POST', dataType: 'json', timeout: 15000,
        data: { action:'cslf_api', endpoint:'proxy', _wpnonce:NONCE, path, query }
      });
    }

    function pill(txt){ return '<span style="background:#f5f6f8;border:1px solid #e6e8ec;border-radius:999px;padding:2px 8px;font-weight:700;font-size:11px">'+txt+'</span>'; }
    function timeFmt(iso){ try{ return new Date(iso).toLocaleString([], {hour:'2-digit',minute:'2-digit'}); }catch(e){ return ''; } }

    // 1) Base fixture
    apiProxy('fixtures', 'id='+encodeURIComponent(FIXTURE_ID))
      .done(function(p){
        const fx = p?.data?.response?.[0];
        if(!fx){ $('.lfd-wrap-<?php echo $id; ?>').append('<div style="color:#b00020">Match introuvable</div>'); return; }

        // header
        $('#title-<?php echo $id; ?>').text((fx.league?.name||'') + (fx.league?.round? ' · '+fx.league.round : ''));
        $('#home-<?php echo $id; ?>').html((fx.teams?.home?.logo?'<img src="'+fx.teams.home.logo+'">':'')+' '+(fx.teams?.home?.name||''));
        $('#away-<?php echo $id; ?>').html((fx.teams?.away?.name||'')+' '+(fx.teams?.away?.logo?'<img src="'+fx.teams.away.logo+'">':''));
        $('#score-<?php echo $id; ?>').text((fx.goals?.home??'-')+'–'+(fx.goals?.away??'-'));
        $('#meta-<?php echo $id; ?>').html([
          pill(fx.fixture?.status?.short || ''),
          fx.fixture?.venue?.name || '',
          timeFmt(fx.fixture?.date || '')
        ].filter(Boolean).join(' · '));

        // résumé info
        $('#info-<?php echo $id; ?>').html([
          '<div><strong>Pays:</strong> '+(fx.league?.country||'')+'</div>',
          '<div><strong>Saison:</strong> '+(fx.league?.season||'')+'</div>'
        ].join(''));

        // 2) Events (for résumé + fil)
        apiProxy('fixtures/events', 'fixture='+FIXTURE_ID)
          .done(function(ep){
            const evs = ep?.data?.response || [];
            const $last = $('#last-events-<?php echo $id; ?>').empty();
            const $all  = $('#events-<?php echo $id; ?>').empty();
            evs.slice(-5).reverse().forEach(e=>{
              $last.append(`<div class="event"><strong>${e.time?.elapsed||''}'</strong> ${e.team?.name||''} — ${e.type||''} ${e.detail?('('+e.detail+')'):''} ${e.player?.name?('· '+e.player.name):''}</div>`);
            });
            evs.forEach(e=>{
              $all.append(`<div class="event"><strong>${e.time?.elapsed||''}'</strong> ${e.team?.name||''} — ${e.type||''} ${e.detail?('('+e.detail+')'):''} ${e.player?.name?('· '+e.player.name):''}</div>`);
            });
          });

        // 3) Lineups (and basic pitch placement using grid positions)
        apiProxy('fixtures/lineups', 'fixture='+FIXTURE_ID)
          .done(function(lp){
            const L = lp?.data?.response || [];
            const H = L.find(x=>x.team?.id === fx.teams?.home?.id);
            const A = L.find(x=>x.team?.id === fx.teams?.away?.id);

            if(H){
              $('#home-coach-<?php echo $id; ?>').text((fx.teams?.home?.name||'')+' — '+(H.coach?.name||'')+' · '+(H.formation||''));
              const $z = $('#home-pitch-<?php echo $id; ?>').empty();
              (H.startXI||[]).forEach(p=>{
                const it = p.player||{};
                const d = document.createElement('div');
                d.className = 'player'; d.textContent = (it.number||'')+' '+(it.name||'');
                $z.append(d);
              });
            }
            if(A){
              $('#away-coach-<?php echo $id; ?>').text((fx.teams?.away?.name||'')+' — '+(A.coach?.name||'')+' · '+(A.formation||''));
              const $z = $('#away-pitch-<?php echo $id; ?>').empty();
              (A.startXI||[]).forEach(p=>{
                const it = p.player||{};
                const d = document.createElement('div');
                d.className = 'player'; d.textContent = (it.number||'')+' '+(it.name||'');
                $z.append(d);
              });
            }
          });

        // 4) Stats
        apiProxy('fixtures/statistics', 'fixture='+FIXTURE_ID).done(function(sp){
          const arr = sp?.data?.response || [];
          const byTeam = new Map();
          arr.forEach(x=>byTeam.set(x.team?.id, x.statistics||[]));
          const h = byTeam.get(fx.teams?.home?.id)||[];
          const a = byTeam.get(fx.teams?.away?.id)||[];
          const $stats = $('#stats-body-<?php echo $id; ?>').empty();
          h.forEach((s,idx)=>{
            const left = (s.value==null?'-':s.value);
            const right = (a[idx]?.value==null?'-':a[idx].value);
            $stats.append(`<div class="stat-row"><span>${s.type||''}</span><span>${left} — ${right}</span></div>`);
          });
        });

        // 5) Standings (league + season from fixture)
        if (fx.league?.id && fx.league?.season) {
          apiProxy('standings', 'league='+fx.league.id+'&season='+fx.league.season)
            .done(function(st){
              const T = st?.data?.response?.[0]?.league?.standings?.[0] || [];
              const $wrap = $('#standings-<?php echo $id; ?>').empty();
              if (!T.length){ $wrap.html('<div style="color:#999">Aucun classement</div>'); return; }
              const rows = T.map(r=>`<tr><td>${r.rank}</td><td>${r.team?.name||''}</td><td>${r.all?.played||''}</td><td>${r.all?.win||''}</td><td>${r.all?.draw||''}</td><td>${r.all?.lose||''}</td><td>${r.goalsDiff||''}</td><td>${r.points||''}</td></tr>`).join('');
              $wrap.html(`<table><thead><tr><th>#</th><th>Équipe</th><th>J</th><th>G</th><th>N</th><th>P</th><th>+/-</th><th>Pts</th></tr></thead><tbody>${rows}</tbody></table>`);
            });
        }

        // 6) H2H
        const hid = fx.teams?.home?.id, aid = fx.teams?.away?.id;
        if (hid && aid){
          apiProxy('fixtures/headtohead', 'h2h='+hid+'-'+aid+'&last=10')
            .done(function(h){
              const arr = h?.data?.response || [];
              const $h2h = $('#h2h-body-<?php echo $id; ?>').empty();
              if (!arr.length){ $h2h.html('<div style="color:#999">Aucun historique</div>'); return; }
              arr.sort((a,b)=> new Date(b.fixture.date) - new Date(a.fixture.date));
              arr.slice(0,10).forEach(m=>{
                $h2h.append(`<div class="event">${new Date(m.fixture.date).toLocaleDateString()} — ${m.teams.home.name} ${m.goals.home}–${m.goals.away} ${m.teams.away.name}</div>`);
              });
            });
        }
      })
      .fail(function(xhr){
        $('.lfd-wrap-<?php echo $id; ?>').append('<div style="color:#b00020">Erreur de chargement ('+xhr.status+')</div>');
      });
  });
})(window, document);
    </script>
    <?php
    return ob_get_clean();
}
