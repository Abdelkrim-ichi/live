(function (w) {
  const ns = (w.CSLF_LEAGUE_TAB_HANDLERS =
    w.CSLF_LEAGUE_TAB_HANDLERS || {})

  ns.team = function ({ panel, data }) {
    const panelEl = panel && panel.jquery ? panel.get(0) : panel
    if (!panelEl) return
    clear(panelEl)
    
    const players = data?.players || []
    if (!players.length) {
      setHTML(
        panelEl,
        '<div class="cslf-league-empty">Équipe de la semaine indisponible pour le moment.</div>'
      )
      return
    }

    const wrap = document.createElement('div')
    wrap.className = 'cslf-league-team'

    const card = document.createElement('div')
    card.className = 'cslf-league-team-card'

    const header = document.createElement('div')
    header.className = 'cslf-league-team-header'
    const fixture = data?.fixture?.teams || {}
    if (fixture?.home || fixture?.away) {
      header.innerHTML = `
        <div class="cslf-league-team-match">
          ${fixture?.home?.logo ? `<img src="${fixture.home.logo}" alt="${fixture.home.name || ''}" width="24" height="24">` : ''}
          <span class="cslf-league-team-vs">${fixture?.home?.name || ''} vs ${fixture?.away?.name || ''}</span>
          ${fixture?.away?.logo ? `<img src="${fixture.away.logo}" alt="${fixture.away.name || ''}" width="24" height="24">` : ''}
        </div>
        <div class="cslf-league-team-date">${formatDate(data?.fixture?.fixture?.date)}</div>
      `
    } else {
      header.innerHTML = `
        <div class="cslf-league-team-title">Équipe de la semaine</div>
        <div class="cslf-league-team-date">${formatDate(data?.fixture?.fixture?.date)}</div>
      `
    }
    card.appendChild(header)

    const list = document.createElement('div')
    list.className = 'cslf-league-team-list'
    list.innerHTML = renderPlayers(players)
    card.appendChild(list)
    wrap.appendChild(card)

    append(panelEl, wrap)
  }

  function renderPlayers(players) {
    if (!players.length) {
      return '<div class="cslf-league-empty">Aucun joueur listé.</div>'
    }

    function getInitials(name) {
      if (!name) return '?'
      const parts = name.trim().split(/\s+/)
      if (parts.length >= 2) {
        return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
      }
      return name.substring(0, 2).toUpperCase()
    }

    return players
      .map((player) => {
        const info = player?.player || player || {}
        const stats = player?.stats || {}
        const team = player?.team || stats?.team || {}
        const rating = parseFloat(player?.rating ?? stats?.games?.rating ?? 0)
        const playerName = info?.name || ''
        const playerPhoto = info?.photo || ''
        const initials = getInitials(playerName)
        
        const photoHtml = playerPhoto 
          ? `<img src="${playerPhoto}" alt="${playerName}" width="40" height="40">`
          : `<div class="cslf-league-player-placeholder">${initials}</div>`
        
        return `
          <div class="cslf-league-player">
            ${photoHtml}
            <span>
              <span class="name-stack">
                <span>${playerName}</span>
                <span class="club">${team?.name || ''}</span>
              </span>
            </span>
            <span class="meta">
              ${team?.logo ? `<img src="${team.logo}" alt="${team.name || ''}" width="18" height="18">` : ''}
              ${stats?.games?.position || ''}
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

