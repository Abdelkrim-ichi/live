;((w, d, $) => {
  function ready(fn) {
    if ($) fn()
    else setTimeout(() => ready(fn), 50)
  }
  ready(() => {
    const C = w.CSLF_RESULTS || {}
    if (!C.instanceId) {
      return
    }

    const root = $("#" + C.instanceId)
    if (!root.length) {
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
        placeholder: "Tous",
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

    // Ajouter aussi les compétitions par nom pour la Supercoupe du Maroc et les grandes compétitions internationales
    const ALLOWED_LEAGUE_NAMES = [
      "supercoupe du maroc", "super coupe maroc"
    ]
    const WORLD_CUP_KEYWORDS = [
      "world cup", "fifa world cup", "coupe du monde", "world cup - women",
      "world cup qualification", "world cup qualifiers", "world cup - qualification",
      "world cup u17", "world cup u-17", "u17 world cup", "u-17 world cup",
      "world cup u20", "world cup u-20", "u20 world cup", "u-20 world cup",
      "women world cup", "fifa women world cup"
    ]
    const AFRICA_CUP_KEYWORDS = [
      "africa cup", "african cup", "africa cup of nations", "africa cup qualification",
      "coupe d'afrique", "coupe d afrique", "afcon", "caf africa cup",
      "africa cup u17", "africa cup u-17", "africa cup u20", "africa cup u-20",
      "africa cup of nations u17", "africa cup of nations u20"
    ]
    const YOUTH_KEYWORDS = ["u17", "u-17", "u20", "u-20", "u23", "u-23"]
    const COUNTRY_TRANSLATIONS = {
      "Morocco": "Maroc",
      "Spain": "Espagne",
      "France": "France",
      "Germany": "Allemagne",
      "England": "Angleterre",
      "United Kingdom": "Royaume-Uni",
      "Portugal": "Portugal",
      "Italy": "Italie",
      "Belgium": "Belgique",
      "Netherlands": "Pays-Bas",
      "United States": "États-Unis",
      "USA": "États-Unis",
      "Brazil": "Brésil",
      "Argentina": "Argentine",
      "Mexico": "Mexique",
      "Uruguay": "Uruguay",
      "Chile": "Chili",
      "Colombia": "Colombie",
      "Peru": "Pérou",
      "Paraguay": "Paraguay",
      "Bolivia": "Bolivie",
      "Ecuador": "Équateur",
      "Venezuela": "Venezuela",
      "Canada": "Canada",
      "Croatia": "Croatie",
      "Serbia": "Serbie",
      "Sweden": "Suède",
      "Norway": "Norvège",
      "Denmark": "Danemark",
      "Finland": "Finlande",
      "Iceland": "Islande",
      "Poland": "Pologne",
      "Czech Republic": "Tchéquie",
      "Austria": "Autriche",
      "Switzerland": "Suisse",
      "Greece": "Grèce",
      "Turkey": "Turquie",
      "Russia": "Russie",
      "Ukraine": "Ukraine",
      "Romania": "Roumanie",
      "Hungary": "Hongrie",
      "Bulgaria": "Bulgarie",
      "Slovakia": "Slovaquie",
      "Slovenia": "Slovénie",
      "Bosnia and Herzegovina": "Bosnie-Herzégovine",
      "Albania": "Albanie",
      "Montenegro": "Monténégro",
      "North Macedonia": "Macédoine du Nord",
      "Ireland": "Irlande",
      "Scotland": "Écosse",
      "Wales": "Pays de Galles",
      "Northern Ireland": "Irlande du Nord",
      "Saudi Arabia": "Arabie saoudite",
      "Qatar": "Qatar",
      "United Arab Emirates": "Émirats arabes unis",
      "Oman": "Oman",
      "Bahrain": "Bahreïn",
      "Kuwait": "Koweït",
      "Jordan": "Jordanie",
      "Lebanon": "Liban",
      "Syria": "Syrie",
      "Iraq": "Irak",
      "Iran": "Iran",
      "Israel": "Israël",
      "Egypt": "Égypte",
      "Tunisia": "Tunisie",
      "Algeria": "Algérie",
      "Libya": "Libye",
      "Sudan": "Soudan",
      "South Sudan": "Soudan du Sud",
      "Nigeria": "Nigéria",
      "Ghana": "Ghana",
      "Senegal": "Sénégal",
      "Ivory Coast": "Côte d'Ivoire",
      "Côte d'Ivoire": "Côte d'Ivoire",
      "Cameroon": "Cameroun",
      "Mali": "Mali",
      "Burkina Faso": "Burkina Faso",
      "Guinea": "Guinée",
      "Guinea-Bissau": "Guinée-Bissau",
      "Cape Verde": "Cap-Vert",
      "South Africa": "Afrique du Sud",
      "Zimbabwe": "Zimbabwe",
      "Zambia": "Zambie",
      "Tanzania": "Tanzanie",
      "Kenya": "Kenya",
      "Uganda": "Ouganda",
      "Rwanda": "Rwanda",
      "Burundi": "Burundi",
      "Ethiopia": "Éthiopie",
      "Somalia": "Somalie",
      "Democratic Republic of Congo": "RDC",
      "Congo": "Congo",
      "Central African Republic": "République centrafricaine",
      "Botswana": "Botswana",
      "Namibia": "Namibie",
      "Madagascar": "Madagascar",
      "Mauritius": "Maurice",
      "Comoros": "Comores",
      "Seychelles": "Seychelles",
      "New Caledonia": "Nouvelle-Calédonie",
      "Australia": "Australie",
      "New Zealand": "Nouvelle-Zélande",
      "Japan": "Japon",
      "China PR": "Chine",
      "China": "Chine",
      "South Korea": "Corée du Sud",
      "Korea Republic": "Corée du Sud",
      "North Korea": "Corée du Nord",
      "Thailand": "Thaïlande",
      "Vietnam": "Vietnam",
      "Laos": "Laos",
      "Cambodia": "Cambodge",
      "Malaysia": "Malaisie",
      "Singapore": "Singapour",
      "Indonesia": "Indonésie",
      "Philippines": "Philippines",
      "India": "Inde",
      "Pakistan": "Pakistan",
      "Bangladesh": "Bangladesh",
      "Sri Lanka": "Sri Lanka",
      "Nepal": "Népal"
    }
    const COUNTRY_ENTRIES = Object.entries(COUNTRY_TRANSLATIONS).sort((a, b) => b[0].length - a[0].length)

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
      
      const lname = league.name || ""

      // Vérifier par nom (Supercoupe, World Cups, Africa Cups)
      if (
        (lname && hasTxt(lname, ALLOWED_LEAGUE_NAMES)) ||
        hasTxt(lname, WORLD_CUP_KEYWORDS) ||
        hasTxt(lname, AFRICA_CUP_KEYWORDS)
      ) {
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

      // World Cups (fallback par nom)
      if (hasTxt(leagueName, WORLD_CUP_KEYWORDS)) {
        const isYouth = hasTxt(leagueName, YOUTH_KEYWORDS)
        return [3, isYouth ? 1 : 0]
      }

      // Africa Cups (fallback par nom)
      if (hasTxt(leagueName, AFRICA_CUP_KEYWORDS)) {
        const isYouth = hasTxt(leagueName, YOUTH_KEYWORDS)
        return [7, isYouth ? 1 : 0]
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
        const isWorldCup = hasTxt(name, WORLD_CUP_KEYWORDS)
        const isAfricaCup = hasTxt(name, AFRICA_CUP_KEYWORDS)
        const base = getCompetitionPriority(id, name)
        let secondary = 0
        if (isWorldCup) secondary = -20
        else if (isAfricaCup) secondary = -15
        else secondary = -10
        return [-1, secondary]
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

    function groupLeagues(list) {
      const by = {}
      list.forEach((m) => {
        const L = m.league
        if (!L) return
        const country = translateCountry(L.country)
        ;(by[L.id] ??= { id: L.id, name: L.name, country, m: [] }).m.push(m)
      })
      return Object.values(by).sort((a, b) => {
        const [ka, ia] = leaguePriority({ league: a }),
          [kb, ib] = leaguePriority({ league: b })
        return ka !== kb ? ka - kb : ia !== ib ? ia - ib : (a.name || "").localeCompare(b.name || "")
      })
    }

    function translateCountry(name) {
      if (!name) return ""
      const norm = COUNTRY_TRANSLATIONS[name.trim()]
      if (norm) return norm
      const lowered = nrm(name)
      const match = Object.entries(COUNTRY_TRANSLATIONS).find(([key]) => nrm(key) === lowered)
      return match ? match[1] : name
    }

    function translateTeamName(name) {
      if (!name) return ["", null]
      let trimmed = name.trim()
      const lower = trimmed.toLowerCase()
      for (const [en, fr] of COUNTRY_ENTRIES) {
        if (lower.startsWith(en.toLowerCase())) {
          trimmed = `${fr}${trimmed.slice(en.length)}`
          break
        }
      }
      const label = trimmed
        .replace(/\bU\s*-\s*\d+\b|\bU\d+\b/gi, "")
        .replace(/\s+/g, " ")
        .trim()
      return [label, null]
    }

    const requestCache = new Map()
    const refreshNonce =
      (w.CSLF_REFRESH_NONCE =
        w.CSLF_REFRESH_NONCE ||
        (() => {
          const pending = new Map()
          return function refreshNonce(baseUrl) {
            const ajax =
              baseUrl ||
              (w.CSLF_LEAGUE_CORE && w.CSLF_LEAGUE_CORE.ajaxurl) ||
              (w.CSLF_WIDGET_CORE && w.CSLF_WIDGET_CORE.ajaxurl) ||
              w.ajaxurl ||
              ''
            if (!ajax) return Promise.resolve(null)
            const url =
              ajax.indexOf('?') === -1
                ? `${ajax}?action=lf_get_nonce`
                : `${ajax}&action=lf_get_nonce`
            if (pending.has(url)) return pending.get(url)
            const promise = fetch(url, { credentials: 'same-origin' })
              .then((res) => (res.ok ? res.json() : null))
              .then((json) => (json && json.nonce ? json.nonce : null))
              .catch(() => null)
              .finally(() => pending.delete(url))
            pending.set(url, promise)
            return promise
          }
        })())

    function api(path, query) {
      const key = `${path}|${query || ''}`
      if (requestCache.has(key)) {
        return requestCache.get(key)
      }

      const deferred = $.Deferred()
      const perform = (attempt = 0) => {
        $.ajax({
          url: C.ajaxurl,
          method: "POST",
          dataType: "json",
          timeout: 15000,
          data: { action: "cslf_api", endpoint: "proxy", _wpnonce: C.nonce, path, query },
        })
          .done((resp) => deferred.resolve(resp))
          .fail((xhr, status, errorText) => {
            if (xhr?.status === 403 && attempt === 0) {
              refreshNonce(C.ajaxurl)
                .then((fresh) => {
                  if (fresh) {
                    C.nonce = fresh
                    perform(attempt + 1)
                  } else {
                    deferred.reject(xhr, status, errorText)
                  }
                })
                .catch(() => deferred.reject(xhr, status, errorText))
              return
            }
            deferred.reject(xhr, status, errorText)
          })
      }

      perform()

      const promise = deferred.promise()
      promise.always(() => requestCache.delete(key))
      requestCache.set(key, promise)
      return promise
    }

    let LAST = []
    let hasInitialData = false
    function populateSelect(list) {
      // FILTRE: seulement les compétitions autorisées
      const allowedList = filterAllowedMatches(list)
      const leagues = groupLeagues(allowedList)

      if (!sel.length) {
        return
      }

      const prevVal = sel.val() || "all"
      sel.empty().append('<option value="all">Toutes</option>')
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
      const label = map[st] || st || ""
      if (st === "HT") {
        return `<span class="cslf-halftime">${label}</span>`
      }
      const translated = st === "NS" ? "À venir" : label
      return `<span class="sub">${translated}</span>`
    }

    function renderRail(list) {
      if (!rail) return
      
      // FILTRE: seulement les compétitions autorisées
      const allowedList = filterAllowedMatches(list)
      const grouped = groupLeagues(allowedList)
      const current = sel.length ? sel.val() || "all" : "all"
      const visibleGroups = current === "all"
        ? grouped
        : grouped.filter((g) => String(g.id) === String(current))

      const totalMatches = visibleGroups.reduce((sum, g) => sum + g.m.length, 0)
      empty.toggle(totalMatches === 0)
      rail.innerHTML = ""
      if (!totalMatches) {
        updateNav()
        return
      }

      const frag = d.createDocumentFragment()
      visibleGroups.forEach((G) => {
        const leagueBox = d.createElement("div")
        leagueBox.className = "cslf-league-block"
        leagueBox.innerHTML = `
  <div class="cslf-league-header">
    <a class="cslf-league-title" href="${buildLeagueUrl(G)}">
      ${G.name}
    </a>
    <span class="cslf-league-country">${G.country || ""}</span>
  </div>
`
        const listEl = d.createElement("div")
        listEl.className = "cslf-match-list"

        const matches = [...G.m].sort((a, b) => {
          const da = new Date(a.fixture?.date || 0).getTime()
          const db = new Date(b.fixture?.date || 0).getTime()
          return da - db
        })

        matches.forEach((m) => {
          const h = m.teams.home || {}
          const a = m.teams.away || {}
          const st = m.fixture?.status || {}
          const gh = m.goals?.home ?? "-"
          const ga = m.goals?.away ?? "-"
          const round = m.league?.round || ""
          const venue = m.fixture?.venue?.name || ""
          const [homeName] = translateTeamName(h.name || "")
          const [awayName] = translateTeamName(a.name || "")

          const row = d.createElement("div")
          row.className = "cslf-match-row"
          row.innerHTML = `
    <div class="cslf-match-line">
      <div class="team home">
        ${h.logo ? `<img src="${h.logo}" alt="${homeName || h.name || ""}">` : ""}
        <span>${homeName}</span>
      </div>
      <div class="score">${gh}&nbsp;-&nbsp;${ga}</div>
      <div class="team away">
        ${a.logo ? `<img src="${a.logo}" alt="${awayName || a.name || ""}">` : ""}
        <span>${awayName}</span>
      </div>
    </div>
    <div class="meta">
      ${badge(st)}
      <span class="time">${fmtTime(m.fixture?.date)}</span>
      <span class="extra">${round || venue}</span>
    </div>
  `
          listEl.appendChild(row)
        })

        leagueBox.appendChild(listEl)
        frag.appendChild(leagueBox)
      })

      rail.appendChild(frag)
      updateNav()
    }

    function showRailSkeleton() {
      if (!rail) return
      root.addClass('is-loading')
      rail.classList.add('is-loading')
      empty.hide()
      errorB.hide()
      rail.innerHTML = ''
      const frag = d.createDocumentFragment()
      const count = Math.max(3, Math.ceil((rail.clientWidth || 600) / 220))
      for (let i = 0; i < count; i++) {
        const block = d.createElement('div')
        block.className = 'cslf-league-block cslf-skeleton-placeholder'
        block.innerHTML = `
          <div class="cslf-skeleton-line is-lg"></div>
          <div class="cslf-skeleton-line is-sm"></div>
          <div class="cslf-skeleton-card">
            <div class="cslf-skeleton-line"></div>
            <div class="cslf-skeleton-line"></div>
            <div class="cslf-skeleton-line is-sm"></div>
          </div>
        `
        frag.appendChild(block)
      }
      rail.appendChild(frag)
      updateNav()
    }

    function hideRailSkeleton() {
      if (!rail) return
      root.removeClass('is-loading')
      rail.classList.remove('is-loading')
    }

    function buildLeagueUrl(group) {
      const base = (C.leagueUrl || "").trim()
      if (!base) return "#"
      const url = new URL(base, w.location.origin)
      if (group?.id) url.searchParams.set("league_id", group.id)

      const season =
        group?.season ||
        (Array.isArray(group?.m) && group.m.length
          ? group.m[0]?.league?.season
          : null)
      if (season) url.searchParams.set("season", season)
      return url.toString()
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
      const card = rail.querySelector(".cslf-league-block")
      const step = card ? (card.getBoundingClientRect().width + 16) * 2 : rail.clientWidth * 0.8
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
      if (!hasInitialData) {
        showRailSkeleton()
      }
      api("fixtures", q)
        .done((p) => {
          if (!p || !p.success) {
            hideRailSkeleton()
            errorB.show().text("Erreur API")
            return
          }
          const arr = Array.isArray(p.data?.response) ? p.data.response : []
          
          // FILTRE APPLIQUÉ ICI : seulement les compétitions autorisées
          LAST = arr
          hideRailSkeleton()
          hasInitialData = true
          populateSelect(LAST)
          renderRail(LAST)
          const next = calcNextInterval(filterAllowedMatches(LAST))
          if (POLL) POLL._lastInterval = next
          scheduleNext(next)
        })
        .fail((xhr, s, e) => {
          hideRailSkeleton()
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
