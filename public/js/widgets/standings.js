;(function (w, d) {
    if (!w || !d) return
    const core = w.CSLF_WIDGET_CORE || {}
    const ajaxurl = core.ajaxurl || (w.ajaxurl ? w.ajaxurl : '')
    const nonce = core.nonce || ''
  
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
      const payload = new FormData()
      payload.append('action', 'cslf_league_api')
      payload.append('tab', 'widget_standings')
      payload.append('league_id', config.league_id)
      if (config.season) payload.append('season', config.season)
      payload.append('limit', config.limit || 10)
      if (nonce) payload.append('_wpnonce', nonce)
  
      fetch(ajaxurl, {
        method: 'POST',
        credentials: 'same-origin',
        body: payload,
      })
        .then((res) => res.json())
        .then((json) => {
          if (!json || !json.success) {
            throw new Error(json?.data?.message || core.i18n?.error || 'Erreur')
          }
          render(root, json.data || {}, config)
        })
        .catch((err) => showError(root, err.message || core.i18n?.error || 'Erreur'))
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