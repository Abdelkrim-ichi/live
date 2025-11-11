;(function (w, d) {
  if (!w || !d) return
  const core = w.CSLF_WIDGET_CORE || {}
  const nonce = core.nonce || ''
  const widgetCache = (w.CSLF_WIDGET_CACHE = w.CSLF_WIDGET_CACHE || new Map())
  const widgetFetch = (w.CSLF_WIDGET_REQUEST = w.CSLF_WIDGET_REQUEST || {})

  if (typeof widgetFetch.get !== 'function') {
    widgetFetch.get = function getWidgetData(coreOptions, tab, params = {}) {
      const url =
        coreOptions?.ajaxurl || w.CSLF_WIDGET_CORE?.ajaxurl || w.ajaxurl || ''
      if (!url) {
        return Promise.reject(new Error('ajaxurl manquant'))
      }
      const nonceValue =
        coreOptions?.nonce || w.CSLF_WIDGET_CORE?.nonce || nonce || ''
      const key = JSON.stringify({
        tab,
        params,
      })

      if (!widgetCache.has(key)) {
        const payload = new FormData()
        payload.append('action', 'cslf_league_api')
        payload.append('tab', tab)
        Object.entries(params || {}).forEach(([k, v]) => {
          if (v !== undefined && v !== null && v !== '') {
            payload.append(k, v)
          }
        })
        if (nonceValue) payload.append('_wpnonce', nonceValue)

        const request = fetch(url, {
          method: 'POST',
          credentials: 'same-origin',
          body: payload,
        })
          .then((res) => {
            if (!res.ok) {
              throw new Error(`HTTP ${res.status}`)
            }
            return res.json()
          })
          .then((json) => {
            if (!json || !json.success) {
              const message =
                json?.data?.message ||
                json?.message ||
                coreOptions?.i18n?.error ||
                'Erreur'
              throw new Error(message)
            }
            return json.data || {}
          })
          .catch((err) => {
            widgetCache.delete(key)
            throw err
          })

        widgetCache.set(key, request)
      }

      return widgetCache.get(key)
    }
  }

  const requestWidgetData = widgetFetch.get.bind(null, core)

  function ready(fn) {
    if (d.readyState !== 'loading') fn()
    else d.addEventListener('DOMContentLoaded', fn)
  }

  ready(() => {
    const widgets = d.querySelectorAll('.cslf-widget-matches[data-config]')
    widgets.forEach(initWidget)
  })

  function initWidget(root) {
    let config = {}
    try {
      config = JSON.parse(root.getAttribute('data-config') || '{}')
    } catch (e) {
      config = {}
    }

    if (!config.league_id) {
      showError(root, core.i18n?.error || 'Erreur')
      return
    }

    const shell = root.querySelector('.cslf-widget-shell')
    const body = root.querySelector('.cslf-widget-body')
    const errorEl = root.querySelector('.cslf-widget-error')

    requestData(config)

    function requestData(cfg) {
      toggleLoading(true)
      requestWidgetData('widget_matches', {
        league_id: cfg.league_id,
        season: cfg.season || '',
        limit: cfg.limit || 10,
      })
        .then((data) => {
          render(root, data || {}, cfg)
        })
        .catch((err) => {
          showError(root, err?.message || core.i18n?.error || 'Erreur')
        })
        .finally(() => toggleLoading(false))
    }

    function toggleLoading(state) {
      if (shell) {
        shell.classList.toggle('is-loading', !!state)
      }
    }

    function render(rootEl, data, cfg) {
      if (!body) return
      body.innerHTML = ''
      if (errorEl) errorEl.style.display = 'none'

      const header = rootEl.querySelector('.cslf-widget-header')
      if (header) {
        header.innerHTML = ''
        header.appendChild(renderLeagueHeader(data?.league))
      }

      const ordered = orderMatches(Array.isArray(data?.matches) ? data.matches : [])
      const matches = ordered
      if (!matches.length) {
        body.innerHTML = `<div class="cslf-widget-empty">${core.i18n?.empty || 'Aucune donnée disponible.'}</div>`
        return
      }

      const groups = groupByDay(matches)
      groups.forEach((group) => {
        const section = d.createElement('div')
        section.className = 'cslf-widget-group'
        section.innerHTML = `
          <div class="cslf-widget-group-header">
            <span>${escapeHtml(group.label)}</span>
            ${group.round ? `<span class="round">${escapeHtml(group.round)}</span>` : ''}
          </div>
        `

        const list = d.createElement('div')
        list.className = 'cslf-widget-matchlist'

        group.fixtures.forEach((fx) => {
          const row = d.createElement('div')
          row.className = 'cslf-widget-match'
          row.innerHTML = `
            <div class="teams">
              <span class="team">
                ${fx.home.logo ? `<img src="${fx.home.logo}" alt="${escapeHtml(fx.home.name)}">` : ''}
                <span>${escapeHtml(fx.home.name)}</span>
              </span>
              <span class="score">${formatScore(fx)}</span>
              <span class="team is-away">
                ${fx.away.logo ? `<img src="${fx.away.logo}" alt="${escapeHtml(fx.away.name)}">` : ''}
                <span>${escapeHtml(fx.away.name)}</span>
              </span>
            </div>
            <div class="meta">
              <span class="time">${fx.time}</span>
              ${fx.venue ? `<span class="venue">${escapeHtml(fx.venue)}</span>` : ''}
            </div>
          `
          list.appendChild(row)
        })

        section.appendChild(list)
        body.appendChild(section)
      })
    }
  }

  function groupByDay(list) {
    const groups = {}
    list.forEach((fx) => {
      const key = fx.date ? fx.date.slice(0, 10) : 'unknown'
      if (!groups[key]) {
        groups[key] = {
          label: formatDay(fx.date),
          round: shortLabel(fx.round || ''),
          fixtures: [],
        }
      }
      groups[key].fixtures.push({
        home: fx.home,
        away: fx.away,
        venue: fx.venue || '',
        time: formatTime(fx.date),
        status: fx.status,
        goals: fx.goals,
      })
    })

    return Object.keys(groups)
      .sort()
      .map((key) => {
        const group = groups[key]
        group.fixtures.sort((a, b) => (a.time || '').localeCompare(b.time || ''))
        return group
      })
  }

  function orderMatches(list) {
    const copy = Array.isArray(list) ? list.slice() : []
    const now = Date.now()
    copy.sort((a, b) => {
      const priorityA = statusPriority(a.status?.short)
      const priorityB = statusPriority(b.status?.short)
      if (priorityA !== priorityB) return priorityA - priorityB
      const timeA = parseTimestamp(a) || now
      const timeB = parseTimestamp(b) || now
      return timeA - timeB
    })

    const filtered = copy.filter((item) => {
      const short = String(item.status?.short || '').toUpperCase()
      if (isLiveStatus(short)) return true
      if (short === 'NS') return true
      const ts = parseTimestamp(item)
      if (!ts) return false
      return ts >= startOfToday()
    })

    return filtered.length ? filtered : copy
  }

  function statusPriority(code) {
    const short = String(code || '').toUpperCase()
    if (isLiveStatus(short)) return 0
    if (short === 'NS') return 1
    return 2
  }

  function parseTimestamp(entry) {
    if (entry?.timestamp) {
      return Number(entry.timestamp) * 1000
    }
    if (entry?.date) {
      const time = Date.parse(entry.date)
      if (!Number.isNaN(time)) return time
    }
    return null
  }

  function isLiveStatus(code) {
    const short = String(code || '').toUpperCase()
    return ['1H', 'HT', '2H', 'ET', 'BT', 'LIVE', 'P', 'INT'].includes(short)
  }

  function startOfToday() {
    const now = new Date()
    now.setHours(0, 0, 0, 0)
    return now.getTime()
  }

  function formatScore(fx) {
    const home = fx.goals?.home
    const away = fx.goals?.away
    if (home == null || away == null) {
      return fx.time || '-'
    }
    return `${home} - ${away}`
  }

  function formatTime(dateIso) {
    if (!dateIso) return ''
    try {
      const date = new Date(dateIso)
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    } catch (e) {
      return ''
    }
  }

  function shortLabel(label) {
    if (!label) return ''
    const match = String(label).match(/(\d+)/)
    return match ? `J${match[1]}` : ''
  }

  function formatDay(dateIso) {
    if (!dateIso) return ''
    try {
      const date = new Date(dateIso)
      const formatted = date.toLocaleDateString('fr-FR', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
      })
      return capitalize(formatted.replace(/\s+/g, ' '))
    } catch (e) {
      return dateIso
    }
  }

  function renderLeagueHeader(league) {
    const box = document.createElement('div')
    box.className = 'cslf-widget-league'

    if (league?.logo) {
      const logo = document.createElement('img')
      logo.src = league.logo
      logo.alt = league.name || ''
      box.appendChild(logo)
    } else if (league?.flag) {
      const flag = document.createElement('img')
      flag.src = league.flag
      flag.alt = league.country || ''
      flag.className = 'is-flag'
      box.appendChild(flag)
    }

    const nameEl = document.createElement('span')
    nameEl.className = 'name'
    nameEl.textContent = league?.name || ''
    box.appendChild(nameEl)

    return box
  }

  function capitalize(str) {
    if (!str) return ''
    return str.charAt(0).toUpperCase() + str.slice(1)
  }

  function showError(root, message) {
    const errorEl = root.querySelector('.cslf-widget-error')
    if (errorEl) {
      errorEl.textContent = message || core.i18n?.error || 'Erreur'
      errorEl.style.display = 'block'
    }
    const shell = root.querySelector('.cslf-widget-shell')
    if (shell) shell.classList.remove('is-loading')
  }

  function escapeHtml(str) {
    if (str == null) return ''
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;')
  }
})(window, document)

