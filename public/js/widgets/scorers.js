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
    document
      .querySelectorAll('.cslf-widget-scorers[data-config]')
      .forEach(initWidget)
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

    toggleLoading(true)
    requestWidgetData('widget_scorers', {
      league_id: config.league_id,
      season: config.season || '',
      limit: config.limit || 10,
    })
      .then((data) => {
        render(root, data || {}, config)
      })
      .catch((err) => {
        showError(root, err?.message || core.i18n?.error || 'Erreur')
      })
      .finally(() => toggleLoading(false))

    function toggleLoading(state) {
      if (shell) shell.classList.toggle('is-loading', !!state)
    }

    function render(rootEl, data, cfg) {
      if (!body) return
      body.innerHTML = ''
      if (errorEl) errorEl.style.display = 'none'

      const header = rootEl.querySelector('.cslf-widget-header')
      if (header) {
        header.innerHTML = ''
        const league = document.createElement('div')
        league.className = 'cslf-widget-league'
        league.innerHTML = `
          ${data?.league?.logo ? `<img src="${data.league.logo}" alt="${escapeHtml(data.league.name || '')}">` : ''}
          <div>
            <span class="name">${escapeHtml(data?.league?.name || '')}</span>
            <span class="country">Buteurs</span>
          </div>
        `
        header.appendChild(league)
      }

      const players = Array.isArray(data?.players) ? data.players : []
      if (!players.length) {
        body.innerHTML = `<div class="cslf-widget-empty">${core.i18n?.empty || 'Aucune donnée disponible.'}</div>`
        return
      }

      players.forEach((entry, idx) => {
        const row = d.createElement('div')
        row.className = 'cslf-widget-scorer'
        row.innerHTML = `
          <span class="position">${idx + 1}</span>
          <span class="player">
            <span class="avatar-wrap">
              ${entry.photo ? `<img src="${entry.photo}" alt="${escapeHtml(entry.name || '')}">` : '<span class="avatar-placeholder"></span>'}
              <span class="name">${escapeHtml(formatPlayerName(entry.name || ''))}</span>
            </span>
            <span class="club">
              ${entry.team?.logo ? `<img src="${entry.team.logo}" alt="${escapeHtml(entry.team?.name || '')}">` : ''}
              <span>${escapeHtml(entry.team?.name || '')}</span>
            </span>
          </span>
          <span class="stats">
            <span class="goals">${entry.goals ?? 0}</span>
          </span>
        `
        body.appendChild(row)
      })
    }
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

  function formatPlayerName(fullName) {
    if (!fullName) return ''
    const parts = String(fullName).trim().split(/\s+/)
    return parts.length ? parts[parts.length - 1] : fullName
  }
})(window, document)

