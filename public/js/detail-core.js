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
    var tabsRoot = byId("-tabs")
    if (tabsRoot) {
      tabsRoot.addEventListener("click", (e) => {
        var btn = e.target.closest(".tablink")
        if (!btn) return
        tabsRoot.querySelectorAll(".tablink").forEach((b) => {
          b.classList.remove("active")
        })
        btn.classList.add("active")
        var t = btn.getAttribute("data-tab")
        ;["resume", "compos", "stats", "classement", "h2h"].forEach((name) => {
          var pane = byId("-pane-" + name)
          if (pane) pane.classList.toggle("active", name === t)
        })
        C.emit(inst, "tab:" + t + ":show", {})
        if (t === "stats" && cache.stats) C.emit(inst, "stats", cache.stats)
        if (t === "resume") {
          if (cache.events) C.emit(inst, "events", cache.events)
          if (cache.stats) C.emit(inst, "stats", cache.stats)
        }
        if (t === "classement" && cache.info) C.emit(inst, "fixture", cache.info)
        if (t === "h2h" && cache.info) C.emit(inst, "fixture", cache.info)
      })
    }

    // Core fetch (fixtures + events + stats + lineups)
    var refreshTimer = null
    var lastIntervalSec = 60
    function loadCore() {
      clearTimeout(refreshTimer)
      var qFxBase = "id=" + encodeURIComponent(new URLSearchParams(w.location.search).get("fixture") || "")
      var qFBase = "fixture=" + encodeURIComponent(new URLSearchParams(w.location.search).get("fixture") || "")
      var qFx = qFxBase
      var qF = qFBase

      var reqFx = C.getList(inst, "fixtures", qFx)
      var reqEv = C.getList(inst, "fixtures/events", qF)
      var reqSt = C.getList(inst, "fixtures/statistics", qF)
      var reqLu = C.getList(inst, "fixtures/lineups", qF)

      $.when(reqFx, reqEv, reqSt, reqLu).done((FX, EV, ST, LU) => {
        cache.fx = FX
        cache.events = EV
        cache.stats = ST
        cache.lineups = LU

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
        if (EV) C.emit(inst, "events", EV)
        if (ST) C.emit(inst, "stats", ST)
        if (LU) C.emit(inst, "lineups", LU)

        // Live refresh
        var short = m?.fixture?.status?.short || ""
        if (C.isLive(short)) refreshTimer = setTimeout(loadCore, 60000)
      })
    }

    function renderHeader(inst, FX) {
      var e = {
        hdrTitle: byId("-hdrTitle"),
        lastUpd: byId("-lastUpdate"),
        homeHead: byId("-homeHead"),
        awayHead: byId("-awayHead"),
        score: byId("-score"),
        matchInfo: byId("-matchInfo"),
      }
      if (!FX || !FX[0]) return

      var m = FX[0],
        home = m.teams.home,
        away = m.teams.away,
        st = m.fixture.status
      var liveBadge =
        st.short && st.short !== "NS" && st.short !== "FT"
          ? '<span class="badge-live">LIVE ' + (st.elapsed != null ? st.elapsed + "'" : "") + "</span> "
          : ""

      e.hdrTitle.innerHTML =
        liveBadge +
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

      e.homeHead.innerHTML =
        (home.logo
          ? '<div class="team-logo"><img src="' + C.esc(home.logo) + '" alt=""></div>'
          : '<div class="team-logo"></div>') +
        '<div class="team-name">' +
        C.esc(home.name) +
        "</div>"
      e.awayHead.innerHTML =
        (away.logo
          ? '<div class="team-logo"><img src="' + C.esc(away.logo) + '" alt=""></div>'
          : '<div class="team-logo"></div>') +
        '<div class="team-name">' +
        C.esc(away.name) +
        "</div>"
      e.score.textContent = C.val(m.goals.home, "-") + " - " + C.val(m.goals.away, "-")

      e.matchInfo.innerHTML = [
        m.league.country ? '<div class="chip">' + C.esc(m.league.country) + "</div>" : "",
        m.fixture.venue?.name ? '<div class="chip">' + C.esc(m.fixture.venue.name) + "</div>" : "",
        '<div class="chip">' + C.liveTxt(st.short) + "</div>",
      ].join("")

      if (e.lastUpd)
        e.lastUpd.textContent = "Dernière MAJ : " + new Date().toLocaleTimeString([], { timeZone: inst.tz })
    }

    // Kick it off
    loadCore()
  }
})(window, document, window.jQuery)
