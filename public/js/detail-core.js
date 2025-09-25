;((w, d, $) => {
  var C = w.CSLF && w.CSLF.DetailCommon

  $(() => {
    console.log('[CSLF] Detail core script loaded');
    var nodes = d.querySelectorAll(".cslf-detail[id], .cslf-detail[data-instance]")
    console.log('[CSLF] Found detail nodes:', nodes.length);
    if (!nodes.length) return
    nodes.forEach((node) => {
      console.log('[CSLF] Booting detail node:', node.id);
      boot(node)
    })
  })

  function boot(node) {
    var inst = C.fromNode(node)
    var cache = { fx: null, events: null, stats: null, lineups: null, info: null }
    var byId = inst.byId

    // Tabs routing + "tab:*:show" events
    var tabsRoot = inst.root.querySelector(".cslf-tabs")
    if (tabsRoot) {
      tabsRoot.addEventListener("click", (e) => {
        var btn = e.target.closest(".tablink")
        if (!btn) return
        tabsRoot.querySelectorAll(".tablink").forEach((b) => {
          b.classList.remove("active", "is-active")
        })
        btn.classList.add("active", "is-active")
        var t = btn.getAttribute("data-tab")
        inst.root.querySelectorAll(".cslf-pane").forEach((pane) => {
          pane.classList.remove("active", "is-active")
        })
        var activePane = inst.root.querySelector(`[data-pane="${t}"]`)
        if (activePane) activePane.classList.add("active", "is-active")
        
        C.emit(inst, "tab:" + t + ":show", {})
        if (t === "stats" && cache.stats) C.emit(inst, "stats", cache.stats)
        if (t === "resume") {
          if (cache.events) C.emit(inst, "events", cache.events)
          if (cache.stats) C.emit(inst, "stats", cache.stats)
        }
        if (t === "classement" && cache.info) C.emit(inst, "fixture", cache.info)
        if (t === "h2h" && cache.info) C.emit(inst, "fixture", cache.info)
        if (t === "compos" && cache.lineups) C.emit(inst, "lineups", cache.lineups)
      })
    }

    // Core fetch (fixtures + events + stats + lineups)
    var refreshTimer = null
    var lastIntervalSec = 60
    function loadCore() {
      clearTimeout(refreshTimer)
      var fixtureId = new URLSearchParams(w.location.search).get("fixture")
      console.log('[CSLF] Loading core data for fixture:', fixtureId);
      if (!fixtureId) {
        console.error('[CSLF] No fixture ID found in URL');
        return;
      }
      var qFxBase = "id=" + encodeURIComponent(fixtureId)
      var qFBase = "fixture=" + encodeURIComponent(fixtureId)
      var qFx = qFxBase
      var qF = qFBase

      console.log('[CSLF] Making AJAX requests:', { qFx, qF });
      var reqFx = C.getList(inst, "fixtures", qFx)
      var reqEv = C.getList(inst, "fixtures/events", qF)
      var reqSt = C.getList(inst, "fixtures/statistics", qF)
      var reqLu = C.getList(inst, "fixtures/lineups", qF)
      var reqPl = C.getList(inst, "fixtures/players", qF)

      $.when(reqFx, reqEv, reqSt, reqLu, reqPl).done((FX, EV, ST, LU, PL) => {
        console.log('[CSLF] Data loaded:', { FX: FX?.length, EV: EV?.length, ST: ST?.length, LU: LU?.length, PL: PL?.length });
        cache.fx = FX
        cache.events = EV
        cache.stats = ST
        cache.lineups = LU
        cache.players = PL

        // Header render
        console.log('[CSLF] Rendering header with fixture data');
        renderHeader(inst, cache.fx)

        // Share essentials for other tabs
        var m = (FX && FX[0]) || null
        if (m) {
          cache.info = {
            leagueId: m.league.id,
            season: m.league.season,
            homeId: m.teams.home.id,
            awayId: m.teams.away.id,
          }
          C.emit(inst, "fixture", cache.info)
        }

        // Emit for subscribers
        console.log('[CSLF] Emitting events to subscribers');
        if (EV) {
          console.log('[CSLF] Emitting events:', EV.length, 'events');
          C.emit(inst, "events", EV)
        }
        if (ST) {
          console.log('[CSLF] Emitting stats:', ST.length, 'stat sets');
          C.emit(inst, "stats", ST)
        }
        if (LU) {
          console.log('[CSLF] Emitting lineups:', LU.length, 'lineups');
          C.emit(inst, "lineups", LU)
        }
        if (PL) {
          console.log('[CSLF] Emitting players:', PL.length, 'players');
          C.emit(inst, "players", PL)
        }
        
        // Force re-render of current tab
        var activeTab = inst.root.querySelector('.cslf-tabs .is-active, .cslf-tabs .active')
        if (activeTab) {
          var tabName = activeTab.getAttribute('data-tab')
          if (tabName === 'resume') {
            if (EV) C.emit(inst, "events", EV)
            if (ST) C.emit(inst, "stats", ST)
          }
          if (tabName === 'stats' && ST) C.emit(inst, "stats", ST)
        }

        // Live refresh
        var short = m?.fixture?.status?.short || ""
        if (C.isLive(short)) refreshTimer = setTimeout(loadCore, 60000)
      }).fail((xhr, status, error) => {
        console.error('[CSLF] AJAX request failed:', { xhr, status, error });
        console.error('[CSLF] Response:', xhr.responseText);
      })
    }

    function renderHeader(inst, FX) {
      console.log('[CSLF] renderHeader called with:', FX);
      var e = {
        hdrTitle: inst.root.querySelector("#hdrTitle-" + inst.id),
        lastUpd: inst.root.querySelector("#lastUpdate-" + inst.id),
        homeHead: inst.root.querySelector("#" + inst.id + "-homeHead"),
        awayHead: inst.root.querySelector("#" + inst.id + "-awayHead"),
        score: inst.root.querySelector("#score-" + inst.id),
        matchInfo: inst.root.querySelector("#matchInfo-" + inst.id),
      }
      console.log('[CSLF] Found elements:', e);
      if (!FX || !FX[0]) {
        console.log('[CSLF] No fixture data to render');
        return;
      }

      var m = FX[0],
        home = m.teams.home,
        away = m.teams.away,
        st = m.fixture.status
      
      console.log('[CSLF] Processing match data:', { home: home.name, away: away.name, goals: m.goals, status: st });
      
      var liveBadge =
        st.short && st.short !== "NS" && st.short !== "FT"
          ? '<span class="badge-live">LIVE ' + (st.elapsed != null ? st.elapsed + "'" : "") + "</span> "
          : ""

      var titleHtml = liveBadge +
        '<span class="vs">' +
        C.esc(home.name) +
        "</span> " +
        "<span>" +
        (C.val(m.goals.home, "-") + " – " + C.val(m.goals.away, "-")) +
        "</span> " +
        '<span class="vs">' +
        C.esc(away.name) +
        "</span> " +
        '<span class="chip">' +
        C.esc(m.league.name) +
        "</span> " +
        (m.league.round ? '<span class="chip">' + C.esc(m.league.round) + "</span> " : "") +
        '<span class="chip">' +
        C.fmtDate(m.fixture.date, inst.tz) +
        " · " +
        C.fmtTime(m.fixture.date, inst.tz) +
        "</span>"
      
      console.log('[CSLF] Setting title HTML:', titleHtml);
      if (e.hdrTitle) {
        e.hdrTitle.innerHTML = titleHtml;
        console.log('[CSLF] Title element updated');
      } else {
        console.error('[CSLF] Title element not found!');
      }

      if (e.homeHead) {
        e.homeHead.innerHTML =
          (home.logo
            ? '<div class="team-logo"><img src="' + C.esc(home.logo) + '" alt=""></div>'
            : '<div class="team-logo"></div>') +
          '<div class="team-name">' +
          C.esc(home.name) +
          "</div>"
      }
      if (e.awayHead) {
        e.awayHead.innerHTML =
          (away.logo
            ? '<div class="team-logo"><img src="' + C.esc(away.logo) + '" alt=""></div>'
            : '<div class="team-logo"></div>') +
          '<div class="team-name">' +
          C.esc(away.name) +
          "</div>"
      }
      if (e.score) {
        e.score.textContent = C.val(m.goals.home, "-") + " - " + C.val(m.goals.away, "-")
      }

      if (e.matchInfo) {
        e.matchInfo.innerHTML = [
          m.league.country ? '<div class="chip">' + C.esc(m.league.country) + "</div>" : "",
          m.fixture.venue?.name ? '<div class="chip">' + C.esc(m.fixture.venue.name) + "</div>" : "",
          '<div class="chip">' + C.liveTxt(st.short) + "</div>",
        ].join("")
      }

      if (e.lastUpd)
        e.lastUpd.textContent = "Dernière MAJ : " + new Date().toLocaleTimeString([], { timeZone: inst.tz })
    }

    // Kick it off
    loadCore()
  }
})(window, document, window.jQuery)
