;((w, d, $) => {
  var C = w.CSLF && w.CSLF.DetailCommon

  $(() => {
    var nodes = d.querySelectorAll(".cslf-detail[id], .cslf-detail[data-instance]")
    if (!nodes.length) return
    nodes.forEach((node) => {
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
        var url = new URL(window.location);
        url.searchParams.set('tab', t);
        window.history.replaceState({}, '', url);

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
      if (!fixtureId) {
        return;
      }
      var qFxBase = "id=" + encodeURIComponent(fixtureId)
      var qFBase = "fixture=" + encodeURIComponent(fixtureId)
      var qFx = qFxBase
      var qF = qFBase

      var reqFx = C.getList(inst, "fixtures", qFx)
      var reqEv = C.getList(inst, "fixtures/events", qF)
      var reqSt = C.getList(inst, "fixtures/statistics", qF)
      var reqLu = C.getList(inst, "fixtures/lineups", qF)
      var reqPl = C.getList(inst, "fixtures/players", qF)

      $.when(reqFx, reqEv, reqSt, reqLu, reqPl).done((FX, EV, ST, LU, PL) => {
        cache.fx = FX
        cache.events = EV
        cache.stats = ST
        cache.lineups = LU
        cache.players = PL

        // Header render
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
        if (EV) {
          C.emit(inst, "events", EV)
        }
        if (ST) {
          C.emit(inst, "stats", ST)
        }
        if (LU) {
          C.emit(inst, "lineups", LU)
        }
        if (PL) {
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

        // Set initial tab from URL parameter after data is loaded
        var urlParams = new URLSearchParams(window.location.search);
        var initialTab = urlParams.get('tab') || 'resume';
        var validTabs = ['resume', 'compos', 'stats', 'classement', 'h2h'];
        var tabToShow = validTabs.includes(initialTab) ? initialTab : 'resume';

        // Activate the initial tab
        if (tabsRoot) {
          tabsRoot.querySelectorAll(".tablink").forEach((b) => {
            b.classList.remove("active", "is-active");
          });
          var initialBtn = tabsRoot.querySelector(`[data-tab="${tabToShow}"]`);
          if (initialBtn) {
            initialBtn.classList.add("active", "is-active");
          }
          
          inst.root.querySelectorAll(".cslf-pane").forEach((pane) => {
            pane.classList.remove("active", "is-active");
          });
          
          var initialPane = inst.root.querySelector(`[data-pane="${tabToShow}"]`);
          if (initialPane) {
            initialPane.classList.add("active", "is-active");
          }
          
          // Trigger the same events that would be triggered by clicking the tab
          C.emit(inst, "tab:" + tabToShow + ":show", {});
          if (tabToShow === "stats" && cache.stats) C.emit(inst, "stats", cache.stats);
          if (tabToShow === "resume") {
            if (cache.events) C.emit(inst, "events", cache.events);
            if (cache.stats) C.emit(inst, "stats", cache.stats);
          }
          if (tabToShow === "classement" && cache.info) C.emit(inst, "fixture", cache.info);
          if (tabToShow === "h2h" && cache.info) C.emit(inst, "fixture", cache.info);
          if (tabToShow === "compos" && cache.lineups) C.emit(inst, "lineups", cache.lineups);
        }

        // Live refresh
        var short = m?.fixture?.status?.short || ""
        if (C.isLive(short)) refreshTimer = setTimeout(loadCore, 60000)
      }).fail((xhr, status, error) => {
      })
    }

    function renderHeader(inst, FX) {
      var e = {
        hdrTitle: inst.root.querySelector("#hdrTitle-" + inst.id),
        lastUpd: inst.root.querySelector("#lastUpdate-" + inst.id),
        homeHead: inst.root.querySelector("#" + inst.id + "-homeHead"),
        awayHead: inst.root.querySelector("#" + inst.id + "-awayHead"),
        score: inst.root.querySelector("#score-" + inst.id),
        matchInfo: inst.root.querySelector("#matchInfo-" + inst.id),
        // New scoreboard elements
        homeName: inst.root.querySelector("#homeName-" + inst.id),
        awayName: inst.root.querySelector("#awayName-" + inst.id),
        homeLogo: inst.root.querySelector("#homeLogo-" + inst.id),
        awayLogo: inst.root.querySelector("#awayLogo-" + inst.id),
        matchTime: inst.root.querySelector("#matchTime-" + inst.id),
        locationInfo: inst.root.querySelector("#locationInfo-" + inst.id),
      }
      if (!FX || !FX[0]) {
        return;
      }

      var m = FX[0],
        home = m.teams.home,
        away = m.teams.away,
        st = m.fixture.status
      
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
      
      if (e.hdrTitle) {
        e.hdrTitle.innerHTML = titleHtml;
      }

      // Populate new scoreboard elements
      if (e.homeName) {
        e.homeName.textContent = C.esc(home.name);
      }
      if (e.awayName) {
        e.awayName.textContent = C.esc(away.name);
      }
      if (e.homeLogo && home.logo) {
        e.homeLogo.src = home.logo;
        e.homeLogo.alt = C.esc(home.name);
      }
      if (e.awayLogo && away.logo) {
        e.awayLogo.src = away.logo;
        e.awayLogo.alt = C.esc(away.name);
      }
      if (e.score) {
        e.score.textContent = C.val(m.goals.home, "-") + " - " + C.val(m.goals.away, "-")
      }
      if (e.matchTime) {
        var timeText = "";
        if (st.short && st.short !== "NS" && st.short !== "FT" && st.elapsed != null) {
          timeText = st.elapsed + "'";
        } else if (st.short === "FT") {
          timeText = "FT";
        } else {
          timeText = C.fmtTime(m.fixture.date, inst.tz);
        }
        e.matchTime.textContent = timeText;
      }

      if (e.matchInfo) {
        e.matchInfo.innerHTML = [
          '<div class="chip">' + C.esc(m.league.name) + "</div>",
          (m.league.round ? '<div class="chip">' + C.esc(m.league.round) + "</div>" : ""),
          '<div class="chip">' + C.fmtDate(m.fixture.date, inst.tz) + "</div>",
        ].join("")
      }

      if (e.locationInfo) {
        e.locationInfo.innerHTML = [
          m.league.country ? '<div>' + C.esc(m.league.country) + "</div>" : "",
          m.fixture.venue?.name ? '<div>' + C.esc(m.fixture.venue.name) + "</div>" : "",
          '<div>' + C.liveTxt(st.short) + "</div>",
        ].join("")
      }

      if (e.lastUpd)
        e.lastUpd.textContent = "Dernière MAJ : " + new Date().toLocaleTimeString([], { timeZone: inst.tz })
    }

    // Kick it off
    loadCore()
  }
})(window, document, window.jQuery)
