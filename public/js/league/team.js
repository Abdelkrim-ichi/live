(function (w) {
  const ns = (w.CSLF_LEAGUE_TAB_HANDLERS =
    w.CSLF_LEAGUE_TAB_HANDLERS || {})

  ns.team = function ({ panel, data }) {
    clear(panel)
    const players = data?.players || []
    if (!players.length) {
      setHTML(
        panel,
        '<div class="cslf-league-empty">Équipe de la semaine indisponible pour le moment.</div>'
      )
      return
    }

    const wrap = document.createElement('div')
    wrap.className = 'cslf-league-team'

    const card = document.createElement('div')
    card.className = 'cslf-league-card'

    const header = document.createElement('div')
    header.className = 'meta'
    const fixture = data?.fixture?.teams || {}
    header.innerHTML = `
      <span>${fixture?.home?.name || ''} vs ${fixture?.away?.name || ''}</span>
      <span>${formatDate(data?.fixture?.fixture?.date)}</span>
    `
    card.appendChild(header)

    const list = document.createElement('div')
    list.className = 'cslf-league-team-list'
    list.innerHTML = renderPlayers(players)
    card.appendChild(list)
    wrap.appendChild(card)

    append(panel, wrap)
  }

  function renderPlayers(players) {
    if (!players.length) {
      return '<div class="cslf-league-empty">Aucun joueur listé.</div>'
    }

    return players
      .map((player) => {
        const info = player?.player || player || {}
        const stats = player?.stats || {}
        const team = player?.team || stats?.team || {}
        const rating = parseFloat(player?.rating ?? stats?.games?.rating ?? 0)
        return `
          <div class="cslf-league-player">
            <span>
              ${info?.photo ? `<img src="${info.photo}" alt="${info?.name || ''}" width="32" height="32">` : ''}
              <span class="name-stack">
                <span>${info?.name || ''}</span>
                <span class="club">${team?.name || ''}</span>
              </span>
            </span>
            <span class="meta">
              ${team?.logo ? `<img src="${team.logo}" alt="${team.name || ''}" width="18" height="18">` : ''}
              ${stats?.games?.position || ''}
              ${rating ? ` • ${rating.toFixed(2)}` : ''}
            </span>
            ${rating ? `<span class="rating">${rating.toFixed(2)}</span>` : ''}
          </div>
        `
      })
      .join('')
  }

  function formatDate(date) {
    if (!date) return ''
    try {
      return new Date(date).toLocaleDateString([], {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
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
})(window)

