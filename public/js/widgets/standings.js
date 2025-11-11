;(function (w, d) {
    if (!w || !d) return
  const core = w.CSLF_WIDGET_CORE || {}
  const nonce = core.nonce || ''
  const widgetCache = (w.CSLF_WIDGET_CACHE = w.CSLF_WIDGET_CACHE || new Map())
  const widgetFetch = (w.CSLF_WIDGET_REQUEST = w.CSLF_WIDGET_REQUEST || {})
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

  if (typeof widgetFetch.get !== 'function') {
    widgetFetch.get = function getWidgetData(coreOptions, tab, params = {}) {
      const url =
        coreOptions?.ajaxurl || w.CSLF_WIDGET_CORE?.ajaxurl || w.ajaxurl || ''
      if (!url) {
        return Promise.reject(new Error('ajaxurl manquant'))
      }
      const key = JSON.stringify({
        tab,
        params,
      })

      if (!widgetCache.has(key)) {
        const perform = (attempt = 0) => {
          const nonceValue =
            coreOptions?.nonce || w.CSLF_WIDGET_CORE?.nonce || nonce || ''
          const payload = new FormData()
          payload.append('action', 'cslf_league_api')
          payload.append('tab', tab)
          Object.entries(params || {}).forEach(([k, v]) => {
            if (v !== undefined && v !== null && v !== '') {
              payload.append(k, v)
            }
          })
          if (nonceValue) payload.append('_wpnonce', nonceValue)

          return fetch(url, {
            method: 'POST',
            credentials: 'same-origin',
            body: payload,
          })
            .then((res) => {
              if (res.status === 403 && attempt === 0) {
                return refreshNonce(url).then((fresh) => {
                  if (fresh) {
                    coreOptions.nonce = fresh
                    if (w.CSLF_WIDGET_CORE) w.CSLF_WIDGET_CORE.nonce = fresh
                    return perform(attempt + 1)
                  }
                  const error = new Error('HTTP 403')
                  error.status = 403
                  throw error
                })
              }
              if (!res.ok) {
                const error = new Error(`HTTP ${res.status}`)
                error.status = res.status
                throw error
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
        }

        const request = perform().catch((err) => {
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
        .querySelectorAll('.cslf-widget-standings[data-config]')
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
    requestWidgetData('widget_standings', {
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
              ${data?.league?.country ? `<span class="country">${escapeHtml(data.league.country)}</span>` : ''}
            </div>
          `
          header.appendChild(league)
        }
  
        const rows = Array.isArray(data?.rows) ? data.rows : []
        if (!rows.length) {
          body.innerHTML = `<div class="cslf-widget-empty">${core.i18n?.empty || 'Aucune donnée disponible.'}</div>`
          return
        }
  
    const table = d.createElement('div')
    table.className = 'cslf-widget-standings-table'
    table.appendChild(renderHeader())

    rows.forEach((row) => {
      const item = document.createElement('div')
      item.className = 'cslf-widget-standing'

      const rank = document.createElement('span')
      rank.className = 'rank'
      rank.textContent = row.rank ?? ''
      item.appendChild(rank)

      const team = document.createElement('span')
      team.className = 'team'
      if (row.team?.logo) {
        const logo = document.createElement('img')
        logo.src = row.team.logo
        logo.alt = escapeHtml(row.team.name || '')
        team.appendChild(logo)
      }
      const label = document.createElement('span')
      label.className = 'label'
      label.textContent = row.team?.name || ''
      team.appendChild(label)
      item.appendChild(team)

      const played = document.createElement('span')
      played.className = 'played'
      played.textContent = `${row.played ?? 0}`
      item.appendChild(played)

      const diff = document.createElement('span')
      diff.className = 'diff'
      const diffVal = Number(row.diff ?? 0)
      diff.textContent = diffVal > 0 ? `+${diffVal}` : `${diffVal}`
      item.appendChild(diff)

      const points = document.createElement('span')
      points.className = 'points'
      points.textContent = row.points ?? 0
      item.appendChild(points)

      table.appendChild(item)
    })
  
        body.appendChild(table)
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

  function renderHeader() {
    const head = d.createElement('div')
    head.className = 'cslf-widget-standing cslf-widget-standing--head'
    head.innerHTML = `
      <span class="rank">#</span>
      <span class="team"></span>
      <span class="played">J</span>
      <span class="diff">DB</span>
      <span class="points">PTS</span>
    `
    return head
  }
})(window, document)