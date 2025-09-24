;((w, d, $) => {
  function ready(fn) {
    if ($) fn()
    else setTimeout(() => ready(fn), 50)
  }
  ready(() => {
    const C = w.CSLF_RESULTS || {}
    if (!C.instanceId) {
      console.error("[CSLF] missing instanceId")
      return
    }

    const root = $("#" + C.instanceId)
    if (!root.length) {
      console.error("[CSLF] root container not found:", C.instanceId)
      return
    }
    const rail = root.find(".cslf-rail")[0]
    const sel = root.find(".cslf-league-select")
    const prev = root.find(".cslf-prev")
    const next = root.find(".cslf-next")
    const empty = root.find(".cslf-empty")
    const errorB = root.find(".cslf-error")

    const TODAY = new Date().toLocaleDateString("en-CA", { timeZone: C.timezone || "UTC" })

    function initSelect2() {
      if (!$.fn.select2 || !sel.length) return
      if (sel.hasClass("select2-hidden-accessible")) sel.select2("destroy")
      sel.select2({
        width: "100%",
        placeholder: "Tous (aujourd'hui)",
        allowClear: true,
        dropdownParent: sel.parent(),
        language: { noResults: () => "Aucun résultat", searching: () => "Recherche…" },
      })
    }

    // === CONFIGURATION DES PRIORITÉS ===
    const PRIORITY_CONFIG = {
      rules: {
        morocco_first_when_international: true,
        laliga_barca_real_over_premier_league: true
      },
      priority: [
        {
          group: "Maroc - Sélections (priorité absolue)",
          note: "La sélection du Maroc (H/F) est prioritaire dans TOUTE compétition ci-dessous",
          competitions: [
            { id: 6,   name: "Coupe d'Afrique des Nations (CAN)" },
            { id: 19,  name: "CHAN (Championnat d'Afrique des Nations)" },
            { id: 29,  name: "World Cup - Qualification Africa" },
            { id: 1,   name: "FIFA World Cup" }
          ]
        },
        {
          group: "Maroc - Compétitions locales",
          competitions: [
            { id: 200, name: "Botola Pro" },
            { id: 822, name: "Coupe du Trône" },
            { id: null, name: "Supercoupe du Maroc" }
          ]
        },
        {
          group: "Monde - Sélections (FIFA & JO)",
          competitions: [
            { id: 1,   name: "FIFA World Cup" },
            { id: 15,  name: "FIFA Club World Cup" },
            { id: 37,  name: "World Cup - Qualification Intercontinental Play-offs" },
            { id: 29,  name: "World Cup - Qualification Africa" },
            { id: 30,  name: "World Cup - Qualification Asia" },
            { id: 31,  name: "World Cup - Qualification CONCACAF" },
            { id: 32,  name: "World Cup - Qualification Europe" },
            { id: 33,  name: "World Cup - Qualification Oceania" },
            { id: 34,  name: "World Cup - Qualification South America" },
            { id: 480, name: "Olympics Men" },
            { id: 524, name: "Olympics Women" },
            { id: 881, name: "Olympics Men - Qualification Concacaf" },
            { id: 882, name: "Olympics Women - Qualification Asia" },
            { id: 1047, name: "Olympics Women - Qualification CAF" },
            { id: 880, name: "World Cup - Women - Qualification Europe" },
            { id: 927, name: "World Cup - Women - Qualification CONCACAF" }
          ]
        },
        {
          group: "Europe (UEFA) - Sélections",
          competitions: [
            { id: 4,   name: "Euro (Championnat d'Europe)" },
            { id: 5,   name: "UEFA Nations League" }
          ]
        },
        {
          group: "Europe (UEFA) - Clubs",
          competitions: [
            { id: 2,   name: "UEFA Champions League" },
            { id: 3,   name: "UEFA Europa League" },
            { id: 848, name: "UEFA Europa Conference League" },
            { id: 531, name: "UEFA Super Cup" },
            { id: 525, name: "UEFA Champions League Women" },
            { id: 743, name: "UEFA Championship - Women (Euro Féminin)" },
            { id: 1040, name: "UEFA Nations League - Women" }
          ]
        },
        {
          group: "Big Five (Liga > PL pour Barça/Real)",
          competitions: [
            { id: 140, name: "La Liga (Espagne)" },
            { id: 39,  name: "Premier League (Angleterre)" },
            { id: 135, name: "Serie A (Italie)" },
            { id: 78,  name: "Bundesliga (Allemagne)" },
            { id: 61,  name: "Ligue 1 (France)" }
          ]
        },
        {
          group: "Afrique (CAF) - Sélections",
          competitions: [
            { id: 6,   name: "Coupe d'Afrique des Nations (CAN)" },
            { id: 19,  name: "CHAN (Championnat d'Afrique des Nations)" },
            { id: 1163, name: "African Nations Championship - Qualification" }
          ]
        },
        {
          group: "Afrique (CAF) - Clubs",
          competitions: [
            { id: 12,  name: "CAF Champions League" },
            { id: 20,  name: "CAF Confederation Cup" },
            { id: 533, name: "CAF Super Cup" },
            { id: 1043, name: "African Football League" },
            { id: 1164, name: "CAF Women's Champions League" }
          ]
        },
        {
          group: "Compétitions arabes (clubs) — priorité clubs marocains",
          competitions: [
            { id: 768, name: "Arab Club Champions Cup" },
            { id: 860, name: "Arab Cup (sélections)" }
          ]
        },
        {
          group: "Arabie saoudite",
          competitions: [
            { id: 307, name: "Saudi Pro League (Roshn)" }
          ]
        },
        {
          group: "Amérique du Sud (CONMEBOL)",
          competitions: [
            { id: 9,   name: "Copa América" },
            { id: 13,  name: "CONMEBOL Libertadores" },
            { id: 11,  name: "CONMEBOL Sudamericana" }
          ]
        },
        {
          group: "Asie (AFC)",
          competitions: [
            { id: 7,   name: "Asian Cup" },
            { id: 35,  name: "Asian Cup - Qualification" },
            { id: 18,  name: "AFC Cup" }
          ]
        },
        {
          group: "CONCACAF",
          competitions: [
            { id: 22,  name: "Gold Cup" },
            { id: 16,  name: "CONCACAF Champions League" },
            { id: 536, name: "Nations League CONCACAF" }
          ]
        },
        {
          group: "Océanie (OFC)",
          competitions: [
            { id: 27,  name: "OFC Champions League" }
          ]
        }
      ]
    }

    // === LISTE BLANCHE DES IDS AUTORISÉS ===
    const ALLOWED_LEAGUE_IDS = new Set()
    
    // Remplir la liste blanche avec tous les IDs de votre configuration
    PRIORITY_CONFIG.priority.forEach(group => {
      group.competitions.forEach(comp => {
        if (comp.id !== null) {
          ALLOWED_LEAGUE_IDS.add(comp.id)
        }
      })
    })

    // Ajouter aussi les compétitions par nom pour la Supercoupe du Maroc
    const ALLOWED_LEAGUE_NAMES = [
      "supercoupe du maroc", "super coupe maroc"
    ]

    // === FONCTIONS DE FILTRAGE ===
    function nrm(s) {
      return (s || "").toString().normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim()
    }

    function hasTxt(txt, arr) {
      txt = nrm(txt)
      return arr.some(t => txt.includes(nrm(t)))
    }

    function isAllowedCompetition(league) {
      if (!league) return false
      
      // Vérifier par ID
      if (ALLOWED_LEAGUE_IDS.has(league.id)) {
        return true
      }
      
      // Vérifier par nom (pour la Supercoupe du Maroc)
      if (league.name && hasTxt(league.name, ALLOWED_LEAGUE_NAMES)) {
        return true
      }
      
      return false
    }

    function filterAllowedMatches(list) {
      if (!Array.isArray(list)) return []
      return list.filter(m => isAllowedCompetition(m.league))
    }

    function isMoroccoTeam(n) {
      return hasTxt(n, ["morocco", "maroc", "المغرب"])
    }

    function involvesBarcaOrReal(h, a) {
      h = nrm(h), a = nrm(a)
      return h.includes("barcelona") || h.includes("fc barcelona") || h.includes("barca") || 
             h.includes("real madrid") || a.includes("barcelona") || 
             a.includes("fc barcelona") || a.includes("barca") || a.includes("real madrid")
    }

    function getCompetitionPriority(leagueId, leagueName) {
      const name = nrm(leagueName || "")
      
      // Parcourir tous les groupes de priorité
      for (let priorityLevel = 0; priorityLevel < PRIORITY_CONFIG.priority.length; priorityLevel++) {
        const group = PRIORITY_CONFIG.priority[priorityLevel]
        
        // Vérifier si la compétition est dans ce groupe par ID
        const competitionById = group.competitions.find(comp => comp.id === leagueId)
        if (competitionById) {
          return [priorityLevel + 1, 0]
        }
        
        // Vérifier par nom (pour la Supercoupe du Maroc)
        const competitionByName = group.competitions.find(comp => 
          comp.name && hasTxt(leagueName, [comp.name])
        )
        if (competitionByName) {
          return [priorityLevel + 1, 0]
        }
      }
      
      return [99, 0] // Non trouvé -> priorité basse (ne devrait pas arriver avec le filtre)
    }

    function leaguePriority(m) {
      const L = m?.league || {}
      const id = Number(L.id || 0)
      const name = L.name || ""
      const home = m?.teams?.home?.name || ""
      const away = m?.teams?.away?.name || ""

      // RÈGLE 1: Maroc prioritaire dans toutes les compétitions internationales
      if (PRIORITY_CONFIG.rules.morocco_first_when_international && 
          (isMoroccoTeam(home) || isMoroccoTeam(away))) {
        return [0, 0] // Priorité absolue
      }

      // Obtenir la priorité de base de la compétition
      const basePriority = getCompetitionPriority(id, name)

      // RÈGLE 2: LaLiga avec Barça/Real avant Premier League
      if (PRIORITY_CONFIG.rules.laliga_barca_real_over_premier_league && 
          id === 140 && involvesBarcaOrReal(home, away)) {
        // Si c'est LaLiga avec Barça/Real, on donne une sous-priorité élevée
        return [basePriority[0], 0]
      }

      // Pour Big Five, ajuster les sous-priorités
      if (basePriority[0] === 6) { // Groupe Big Five
        const big5Order = [140, 39, 135, 78, 61] // LaLiga, PL, Serie A, Bundes, L1
        const subPriority = big5Order.indexOf(id)
        return [6, subPriority >= 0 ? subPriority : 5]
      }

      return basePriority
    }

    function sortByPriority(list) {
      if (!Array.isArray(list)) return
      list.sort((a, b) => {
        const pa = leaguePriority(a), pb = leaguePriority(b)
        if (pa[0] !== pb[0]) return pa[0] - pb[0]
        if (pa[1] !== pb[1]) return pa[1] - pb[1]
        const na = nrm(a.league?.name), nb = nrm(b.league?.name)
        if (na !== nb) return na < nb ? -1 : 1
        return (new Date(a.fixture?.date || 0)) - (new Date(b.fixture?.date || 0))
      })
    }

    function groupLeagues(list) {
      const by = {}
      list.forEach((m) => {
        const L = m.league
        if (!L) return
        ;(by[L.id] ??= { id: L.id, name: L.name, country: L.country, m: [] }).m.push(m)
      })
      return Object.values(by).sort((a, b) => {
        const [ka, ia] = leaguePriority({ league: a }),
          [kb, ib] = leaguePriority({ league: b })
        return ka !== kb ? ka - kb : ia !== ib ? ia - ib : (a.name || "").localeCompare(b.name || "")
      })
    }

    function api(path, query) {
      return $.ajax({
        url: C.ajaxurl,
        method: "POST",
        dataType: "json",
        timeout: 15000,
        data: { action: "cslf_api", endpoint: "proxy", _wpnonce: C.nonce, path, query },
      })
    }

    let LAST = []
    function populateSelect(list) {
      // FILTRE: seulement les compétitions autorisées
      const allowedList = filterAllowedMatches(list)
      const leagues = groupLeagues(allowedList)

      if (!sel.length) {
        console.warn("[CSLF] league select not found; skipping populate")
        return
      }

      const prevVal = sel.val() || "all"
      sel.empty().append('<option value="all">Tous (aujourd\'hui)</option>')
      leagues.forEach((L) => sel.append(`<option value="${L.id}">${L.name}</option>`))

      const opts = sel[0]?.options ? Array.from(sel[0].options) : []
      if (opts.some((o) => String(o.value) === String(prevVal))) {
        sel.val(prevVal)
      }

      initSelect2()
    }

    function fmtTime(iso) {
      try {
        return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
      } catch (e) {
        return ""
      }
    }

    function badge(status) {
      if (!status) return `<span class="sub"></span>`
      const st = status.short
      const elapsed = Number(status.elapsed) || 0
      const map = { "1H": "1re", "2H": "2e", HT: "Mi-temps", ET: "Prol.", P: "Tab", FT: "Fin", NS: "À venir" }
      const isLive = st && st !== "NS" && st !== "FT" && st !== "HT"
      if (isLive) {
        const minute = elapsed > 0 ? `${elapsed}'` : "LIVE"
        return `<span class="cslf-live">${minute}</span>`
      }
      return `<span class="sub">${map[st] || st || ""}</span>`
    }

    function filterByLeague(list) {
      const v = sel.val() || "all"
      if (v === "all") return list
      const id = Number.parseInt(v, 10)
      return list.filter((m) => m.league && m.league.id === id)
    }

    function renderRail(list) {
      if (!rail) return
      
      // FILTRE: seulement les compétitions autorisées
      const allowedList = filterAllowedMatches(list)
      const out = filterByLeague(allowedList)
      
      empty.toggle(out.length === 0)
      rail.innerHTML = ""
      if (!out.length) {
        updateNav()
        return
      }

      sortByPriority(out)
      const grouped = groupLeagues(out)
      const frag = d.createDocumentFragment()
      grouped.forEach((G) => {
        G.m.forEach((m) => {
          const h = m.teams.home,
            a = m.teams.away,
            st = m.fixture.status
          const gh = m.goals.home ?? "-",
            ga = m.goals.away ?? "-"
          const sub = m.league?.round || m.fixture?.venue?.name || ""
          const el = d.createElement("a")
          el.className = "cslf-card"
          el.href = (C.detailUrl || "#") + "?fixture=" + m.fixture.id
          el.innerHTML = `
  <div class="head">
    <div>
      <div class="league">${G.name}</div>
      <div class="sub">${sub}</div>
    </div>
    ${badge(st)}
  </div>

  <div class="grid">
    <div class="team home">
      ${h.logo ? `<img src="${h.logo}" alt="${h.name}">` : ""}
      <span>${h.name}</span>
    </div>
    <div class="score home">${gh}</div>

    <div class="team away">
      ${a.logo ? `<img src="${a.logo}" alt="${a.name}">` : ""}
      <span>${a.name}</span>
    </div>
    <div class="score away">${ga}</div>
  </div>

  <div class="meta">
    <span>${fmtTime(m.fixture.date)}</span>
    <span>${m.league.country || ""}</span>
  </div>
`
          frag.appendChild(el)
        })
      })
      rail.appendChild(frag)
      updateNav()
    }

    function updateNav() {
      if (!rail) return
      const atStart = rail.scrollLeft <= 0
      const atEnd = Math.ceil(rail.scrollLeft + rail.clientWidth) >= rail.scrollWidth
      prev.toggleClass("is-disabled", atStart)
      next.toggleClass("is-disabled", atEnd)
    }

    function scrollBy(dir) {
      if (!rail) return
      const card = rail.querySelector(".cslf-card")
      const step = card ? (card.getBoundingClientRect().width + 10) * 2 : rail.clientWidth * 0.8
      rail.scrollBy({ left: dir * step, behavior: "smooth" })
      setTimeout(updateNav, 300)
    }

    let POLL = null
    function isLiveShort(s) {
      s = String(s || "").toUpperCase()
      return ["1H", "HT", "2H", "ET", "BT", "P", "LIVE"].includes(s)
    }

    function calcNextInterval(list) {
      if (!Array.isArray(list) || list.length === 0) return 10 * 60 * 1000
      const shorts = list.map((m) => m?.fixture?.status?.short || "")
      if (shorts.some(isLiveShort)) return 20 * 1000
      if (shorts.some((s) => String(s).toUpperCase() === "NS")) return 120 * 1000
      if (shorts.every((s) => ["FT", "AET", "PEN", "ABD", "CANC", "PST", "SUSP", "INT"].includes(String(s).toUpperCase())))
        return 10 * 60 * 1000
      return 3 * 60 * 1000
    }

    function scheduleNext(ms) {
      if (POLL) clearTimeout(POLL)
      POLL = setTimeout(fetchToday, ms)
    }

    function fetchToday() {
      const baseQ = `date=${encodeURIComponent(TODAY)}&timezone=${encodeURIComponent(C.timezone || "UTC")}`
      const q = baseQ
      api("fixtures", q)
        .done((p) => {
          if (!p || !p.success) {
            errorB.show().text("Erreur API")
            return
          }
          const arr = Array.isArray(p.data?.response) ? p.data.response : []
          
          // FILTRE APPLIQUÉ ICI : seulement les compétitions autorisées
          LAST = filterAllowedMatches(arr)
          populateSelect(LAST)
          renderRail(LAST)
          const next = calcNextInterval(LAST)
          if (POLL) POLL._lastInterval = next
          scheduleNext(next)
        })
        .fail((xhr, s, e) => {
          errorB.show().text(`Erreur API: ${xhr.status} ${e || s}`)
          scheduleNext(3 * 60 * 1000)
        })
    }

    // events
    sel.on("change", () => renderRail(LAST))
    $(rail).on("scroll", updateNav)
    prev.on("click", () => scrollBy(-1))
    next.on("click", () => scrollBy(1))

    // init
    fetchToday()
  })
})(window, document, window.jQuery)