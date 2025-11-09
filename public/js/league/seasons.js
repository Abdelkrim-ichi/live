(function (w) {
  const ns = (w.CSLF_LEAGUE_TAB_HANDLERS =
    w.CSLF_LEAGUE_TAB_HANDLERS || {})

  ns.seasons = function ({ panel, data }) {
    clear(panel)
    const seasons = data?.seasons || []
    if (!seasons.length) {
      setHTML(
        panel,
        '<div class="cslf-league-empty">Historique des saisons indisponible.</div>'
      )
      return
    }

    const list = document.createElement('div')
    list.className = 'cslf-league-seasons'
    seasons.forEach((season) => {
      const item = document.createElement('div')
      item.className = 'cslf-league-season'
      item.innerHTML = `
        <div class="season-header">
          <strong>${formatSeason(season?.year)}</strong>
          ${season?.current ? '<span class="badge">En cours</span>' : ''}
        </div>
        <div class="meta">
          <span>${formatDate(season?.start)}</span>
          <span>${formatDate(season?.end)}</span>
        </div>
        <div class="season-champions">
          ${renderTeam(season?.champion, 'Champion')}
          ${renderTeam(season?.runner_up, 'Vice-champion')}
        </div>
      `
      list.appendChild(item)
    })

    append(panel, list)
  }

  function clear(target) {
    if (!target) return
    if (target.jquery) target.empty()
    else if (target instanceof HTMLElement) target.innerHTML = ''
  }

  function setHTML(target, html) {
    if (!target) return
    if (target.jquery) target.html(html)
    else if (target instanceof HTMLElement) target.innerHTML = html
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

  function createFragment(content) {
    if (content instanceof HTMLElement || content instanceof Node) return content
    const wrap = document.createElement('div')
    wrap.innerHTML = content
    const frag = document.createDocumentFragment()
    Array.from(wrap.childNodes).forEach((node) => frag.appendChild(node))
    return frag
  }

  function formatSeason(year) {
    const y = parseInt(year, 10)
    if (!y) return year
    return `${y}/${String((y + 1) % 100).padStart(2, '0')}`
  }

  function formatDate(date) {
    if (!date) return ''
    try {
      return new Date(date).toLocaleDateString()
    } catch (e) {
      return date || ''
    }
  }

  function renderTeam(team, label) {
    if (!team || !team.name) {
      return `<div class="season-team">${label}: —</div>`
    }
    return `
      <div class="season-team">
        <span class="season-team-label">${label}</span>
        <span class="season-team-info">
          ${team.logo ? `<img src="${team.logo}" alt="${team.name}">` : ''}
          ${team.name}
        </span>
      </div>
    `
  }
})(window)

