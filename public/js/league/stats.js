(function (w) {
  const ns = (w.CSLF_LEAGUE_TAB_HANDLERS =
    w.CSLF_LEAGUE_TAB_HANDLERS || {})

  ns.stats = function ({ panel, data }) {
    clear(panel)

    const scorers = data?.top_scorers || []
    const assists = data?.top_assists || []
    const cards = data?.top_cards || []

    if (!scorers.length && !assists.length && !cards.length) {
      setHTML(
        panel,
        '<div class="cslf-league-empty">Statistiques indisponibles pour le moment.</div>'
      )
      return
    }

    const wrap = document.createElement('div')
    wrap.className = 'cslf-league-stats'
    wrap.append(renderList('Buteurs', scorers, extractGoals))
    wrap.append(renderList('Passeurs', assists, extractAssists))
    wrap.append(renderList('Cartons', cards, extractCards))
    append(panel, wrap)
  }

  function renderList(title, list, accessor) {
    const block = document.createElement('div')
    block.className = 'cslf-league-card cslf-league-card--stats'
    const heading = document.createElement('h3')
    heading.textContent = title
    block.appendChild(heading)
    if (!list.length) {
      const empty = document.createElement('div')
      empty.className = 'cslf-league-empty'
      empty.textContent = 'Aucune donnée.'
      block.appendChild(empty)
      return block
    }

    const ul = document.createElement('ul')
    ul.className = 'cslf-league-list'
    list.slice(0, 10).forEach((entry) => {
      const stats = entry?.statistics?.[0] || entry || {}
      const player = entry?.player || stats.player || {}
      const team = stats?.team || {}
      const value = accessor(stats)
      const displayValue =
        typeof value === 'number'
          ? value
          : parseFloat(value || 0) || 0
      const li = document.createElement('li')
      li.innerHTML = `
        <span class="name">
          ${player?.photo ? `<img src="${player.photo}" alt="${player?.name || ''}">` : ''}
          <span class="name-stack">
            <span>${player?.name || ''}</span>
            <span class="club">${team?.name || ''}</span>
          </span>
        </span>
        <span class="value">${displayValue}</span>
      `
      ul.appendChild(li)
    })
    block.appendChild(ul)
    return block
  }

  function extractGoals(stats) {
    return stats?.goals?.total ?? stats?.goals ?? 0
  }

  function extractAssists(stats) {
    return (
      stats?.goals?.assists ??
      stats?.assists?.total ??
      stats?.assists ??
      stats?.passes?.goal_assists ??
      0
    )
  }

  function extractCards(stats) {
    const yellow = stats?.cards?.yellow ?? 0
    const red = stats?.cards?.red ?? 0
    return yellow + red
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

