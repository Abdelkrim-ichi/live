(function (w) {
  const globalCache = (w.CSLF_LEAGUE_HTTP_CACHE =
    w.CSLF_LEAGUE_HTTP_CACHE || new Map())
  const globalFetch = (w.CSLF_LEAGUE_FETCH = w.CSLF_LEAGUE_FETCH || {})

  if (typeof globalFetch.getTabData !== 'function') {
    globalFetch.getTabData = function getTabData(cfg, tab, extra = {}) {
      const core = w.CSLF_LEAGUE_CORE || {}
      const leagueId = cfg?.league_id
      if (!leagueId) {
        return Promise.reject(new Error('league_id requis'))
      }
      const season = cfg?.season
      const ajaxurl = cfg?.ajaxurl || core.ajaxurl
      const nonce =
        cfg?._wpnonce || cfg?.nonce || core.nonce || core?._wpnonce || ''
      const key = JSON.stringify({
        league: leagueId,
        season: season || '',
        tab,
        extra,
      })
      if (!globalCache.has(key)) {
        const payload = Object.assign(
          {
            action: 'cslf_league_api',
            tab,
            league_id: leagueId,
            season,
            _wpnonce: nonce,
          },
          extra || {}
        )
        const request = w.jQuery
          .ajax({
            url: ajaxurl,
            method: 'POST',
            dataType: 'json',
            data: payload,
          })
          .then((resp) => {
            if (resp && resp.success) {
              return resp.data
            }
            const message =
              resp?.data?.message ||
              resp?.message ||
              core?.i18n?.error ||
              'Erreur'
            throw new Error(message)
          })
          .catch((err) => {
            globalCache.delete(key)
            throw err instanceof Error ? err : new Error(String(err || 'Erreur'))
          })

        globalCache.set(key, request)
      }

      return globalCache.get(key)
    }
  }

  const getTabData = globalFetch.getTabData

  const ns = (w.CSLF_LEAGUE_TAB_HANDLERS =
    w.CSLF_LEAGUE_TAB_HANDLERS || {})

  ns.matches = function ({ panel, data, config }) {
    const state = {
      fixtures: data?.fixtures || [],
      round: data?.round || '',
      rounds: data?.rounds || [],
      season: data?.season || config?.season,
      phase: 'all',
      loading: false,
    }

    clear(panel)

    const container = document.createElement('div')
    container.className = 'cslf-league-matches'

    const controls = renderControls(container, state, config)
    container.appendChild(controls)

    const body = document.createElement('div')
    body.className = 'cslf-league-matches-body'
    container.appendChild(body)

    renderBody(body, state)

    append(panel, container)
  }

  function renderControls(container, state, config) {
    const wrap = document.createElement('div')
    wrap.className = 'cslf-matches-controls'

    const roundWrapper = document.createElement('label')
    roundWrapper.className = 'cslf-round-select'
    roundWrapper.innerHTML = '<span>Journée</span>'

    const roundSelect = document.createElement('select')
    roundSelect.className = 'cslf-round-switch'
    populateRounds(roundSelect, state)
    if (!(state.rounds || []).length) {
      roundWrapper.style.display = 'none'
    }
    roundSelect.addEventListener('change', () => {
      const value = roundSelect.value
      if (!value || value === state.round) return
      fetchRound(container, state, config, value)
    })
    roundWrapper.appendChild(roundSelect)
    wrap.appendChild(roundWrapper)

    const phases = document.createElement('div')
    phases.className = 'cslf-phase-switch'
    ;[
      { key: 'all', label: 'Tous' },
      { key: 'playing', label: 'En cours' },
      { key: 'upcoming', label: 'À venir' },
      { key: 'played', label: 'Joués' },
    ].forEach((item) => {
      const btn = document.createElement('button')
      btn.type = 'button'
      btn.className =
        'cslf-phase-btn' + (state.phase === item.key ? ' is-active' : '')
      btn.textContent = item.label
      btn.addEventListener('click', () => {
        if (state.phase === item.key) return
        state.phase = item.key
        wrap
          .querySelectorAll('.cslf-phase-btn')
          .forEach((el) => el.classList.remove('is-active'))
        btn.classList.add('is-active')
        const body = container.querySelector('.cslf-league-matches-body')
        if (body) renderBody(body, state)
      })
      phases.appendChild(btn)
    })
    wrap.appendChild(phases)

    return wrap
  }

  function populateRounds(select, state) {
    clear(select)
    ;(state.rounds || []).forEach((round) => {
      const opt = document.createElement('option')
      opt.value = round
      opt.textContent = formatRoundLabel(round)
      if (round === state.round) opt.selected = true
      select.appendChild(opt)
    })

    if (state.round && !(state.rounds || []).includes(state.round)) {
      select.value = state.round
    }

    if (!select.value && select.options.length) {
      select.value = select.options[select.options.length - 1].value
    }
  }

  function fetchRound(container, state, config, round) {
    const $ = w.jQuery
    if (!config?.league_id || !config?.season || !$ || state.loading) return
    state.loading = true
    const body = container.querySelector('.cslf-league-matches-body')
    if (body) {
      setHTML(body, '<div class="cslf-league-empty">Chargement…</div>')
    }

    getTabData(config, 'matches', { round })
      .then((payload = {}) => {
        state.round = payload.round || round
        state.rounds = payload.rounds || state.rounds
        state.fixtures = payload.fixtures || []
        state.season = payload.season || state.season
        const select = container.querySelector('.cslf-round-switch')
        if (select) populateRounds(select, state)
        renderBody(container.querySelector('.cslf-league-matches-body'), state)
      })
      .catch(() => {
        if (body) {
          setHTML(
            body,
            '<div class="cslf-league-empty">Impossible de charger cette journée.</div>'
          )
        }
      })
      .finally(() => {
        state.loading = false
      })
  }

  function renderBody(target, state) {
    clear(target)
    const fixtures = filterByPhase(state.fixtures, state.phase)
    if (!fixtures.length) {
      setHTML(
        target,
        '<div class="cslf-league-empty">Aucun match pour cette sélection.</div>'
      )
      return
    }

    const list = document.createElement('div')
    list.className = 'cslf-league-matchlist'
    fixtures.forEach((fx) => list.appendChild(renderFixture(fx)))
    target.appendChild(list)
  }

  function renderFixture(fx) {
    const home = fx?.teams?.home || {}
    const away = fx?.teams?.away || {}
    const goals = fx?.goals || {}
    const status = fx?.fixture?.status || {}
    const venue = fx?.fixture?.venue?.name || ''
    const round = fx?.league?.round || ''
    const penaltyHome = fx?.score?.penalty?.home
    const penaltyAway = fx?.score?.penalty?.away
    
    // Détecter si le match est terminé avec pénalties
    const statusShort = String(status?.short || '').toUpperCase()
    const hasFinalPenalties = (penaltyHome !== null && penaltyHome !== undefined && 
                               penaltyAway !== null && penaltyAway !== undefined)
    const isFinishedWithPenalties = (['FT', 'AET', 'PEN', 'P'].includes(statusShort) && hasFinalPenalties)
    
    // Déterminer quelle équipe a perdu aux pénalties
    let homeLoser = false
    let awayLoser = false
    if (isFinishedWithPenalties) {
      if (penaltyHome < penaltyAway) {
        homeLoser = true
      } else if (penaltyAway < penaltyHome) {
        awayLoser = true
      }
    }
    
    // Vérifier si c'est une qualification (pour ne pas barrer l'équipe perdante)
    const isQualification = (round || '').toLowerCase().includes('qualif') || 
                           (round || '').toLowerCase().includes('playoff') ||
                           (round || '').toLowerCase().includes('play-off')
    
    const homeClass = (homeLoser && !isQualification) ? 'cslf-match-team--loser' : ''
    const awayClass = (awayLoser && !isQualification) ? 'cslf-match-team--loser' : ''
    
    // Afficher les pénalties si le match est terminé avec pénalties
    let penaltyDisplay = ''
    if (isFinishedWithPenalties) {
      penaltyDisplay = `<div class="cslf-match-penalties">Pen: ${penaltyHome}-${penaltyAway}</div>`
    }

    const row = document.createElement('div')
    row.className = 'cslf-league-matchrow'
    row.innerHTML = `
      <div class="line">
        ${isFinishedWithPenalties ? '<span class="cslf-match-pen-label">Pen</span>' : ''}
        <span class="team ${homeClass}">
          ${home?.logo ? `<img class="team-badge" src="${home.logo}" alt="${home?.name || ''}">` : ''}
          <span>${clean(home?.name)}</span>
        </span>
        <span class="score">
          ${score(goals?.home)} – ${score(goals?.away)}
          ${penaltyDisplay}
        </span>
        <span class="team ${awayClass}" style="justify-content:flex-end;">
          <span>${clean(away?.name)}</span>
          ${away?.logo ? `<img class="team-badge" src="${away.logo}" alt="${away?.name || ''}">` : ''}
        </span>
      </div>
      <div class="meta">
        <span>${formatPhase(status)}</span>
        <span>${formatDate(fx?.fixture?.date)}</span>
      </div>
      <div class="submeta">
        <span>${round.replace(/_/g, ' ')}</span>
        <span>${venue}</span>
      </div>
    `
    return row
  }

  function formatRoundLabel(round) {
    if (!round) return ''
    const match = String(round).match(/(\d+)/)
    if (match) {
      return `J ${match[1]}`
    }
    return round.replace(/_/g, ' ')
  }

  function filterByPhase(fixtures, phase) {
    if (!phase || phase === 'all') return fixtures
    return fixtures.filter((fx) => {
      const status = String(fx?.fixture?.status?.short || '').toUpperCase()
      return phaseOf(status) === phase
    })
  }

  function phaseOf(statusShort) {
    const liveCodes = ['1H', '2H', 'ET', 'BT', 'LIVE', 'HT', 'P', 'INT']
    const playedCodes = ['FT', 'AET', 'PEN', 'AWD', 'WO']
    if (liveCodes.includes(statusShort)) return 'playing'
    if (playedCodes.includes(statusShort)) return 'played'
    return 'upcoming'
  }

  function clean(name) {
    if (!name) return ''
    return name.replace(/\bU\s*-\s*\d+\b|\bU\d+\b/gi, '').trim()
  }

  function score(value) {
    if (value === null || typeof value === 'undefined') return '-'
    return value
  }

  function formatPhase(status) {
    if (!status) return ''
    const short = String(status.short || '').toUpperCase()
    const map = {
      NS: 'À venir',
      FT: 'Terminé',
      HT: 'Mi-temps',
      PST: 'Reporté',
    }
    if (map[short]) return map[short]
    if (phaseOf(short) === 'playing') {
      return status.elapsed ? `${status.elapsed}'` : 'En cours'
    }
    return status.long || short || ''
  }

  function formatDate(date) {
    if (!date) return ''
    try {
      return new Date(date).toLocaleString([], {
        day: '2-digit',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
      })
    } catch (e) {
      return date
    }
  }

  function clear(target) {
    if (!target) return
    if (target.jquery) target.empty()
    else if (target instanceof HTMLElement) target.innerHTML = ''
  }

  function append(target, child) {
    if (!target) return
    if (target.jquery) target.append(child)
    else if (target instanceof HTMLElement)
      target.appendChild(
        child instanceof HTMLElement || child instanceof Node
          ? child
          : createFragment(child)
      )
  }

  function setHTML(target, html) {
    if (!target) return
    if (target.jquery) target.html(html)
    else if (target instanceof HTMLElement) target.innerHTML = html
  }

  function createFragment(content) {
    if (content instanceof HTMLElement || content instanceof Node) return content
    const wrap = document.createElement('div')
    wrap.innerHTML = content
    const frag = document.createDocumentFragment()
    Array.from(wrap.childNodes).forEach((node) => frag.appendChild(node))
    return frag
  }
})(window)

