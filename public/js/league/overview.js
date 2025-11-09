(function (w) {
  const ns = (w.CSLF_LEAGUE_TAB_HANDLERS =
    w.CSLF_LEAGUE_TAB_HANDLERS || {})

  ns.overview = function ({ panel, data }) {
    const panelEl = panel && panel.jquery ? panel.get(0) : panel
    clear(panel)

    const next = data?.next_fixtures || []
    const last = data?.last_fixtures || []

    if (!next.length && !last.length) {
      setHTML(
        panelEl,
        '<div class="cslf-league-empty">Aucune rencontre disponible pour l’instant.</div>'
      )
      return
    }

    const wrap = document.createElement('div')
    wrap.className = 'cslf-league-overview'

    const nextBlock = createSection()
    const lastBlock = createSection()

    if (next.length) {
      append(nextBlock, '<h3>À venir</h3>')
      append(nextBlock, renderFixtures(next))
    }

    if (last.length) {
      append(lastBlock, '<h3>Résultats récents</h3>')
      append(lastBlock, renderFixtures(last))
    }

    append(wrap, nextBlock)
    append(wrap, lastBlock)

    if ((data?.standings || []).length) {
      append(
        wrap,
        renderStandings(
          data.standings,
          data?.standings_full || data?.standings
        )
      )
    }
    append(panelEl, wrap)
  }

  function renderFixtures(list) {
    const grid = document.createElement('div')
    grid.className = 'cslf-league-overview-grid'
    list.forEach((fx) => {
      const home = fx?.teams?.home || {}
      const away = fx?.teams?.away || {}
      const goals = fx?.goals || {}
      const status = fx?.fixture?.status || {}
      const meta = fx?.league || {}

      const card = document.createElement('div')
      card.className = 'cslf-league-card'

      const header = document.createElement('div')
      header.className = 'meta'
      header.innerHTML = `<span>${formatRound(meta?.round)}</span><span>${formatDate(
        fx?.fixture?.date
      )}</span>`

      const scoreboard = document.createElement('div')
      scoreboard.className = 'scoreboard'
      scoreboard.innerHTML = `
        <div class="team">
          ${logo(home)}
          <span>${cleanName(home?.name)}</span>
        </div>
        <div class="score">${score(goals?.home)} – ${score(goals?.away)}</div>
        <div class="team" style="justify-content:flex-end;">
          <span>${cleanName(away?.name)}</span>
          ${logo(away)}
        </div>
      `

      const footer = document.createElement('div')
      footer.className = 'meta'
      footer.innerHTML = `<span>${statusLabel(status)}</span>`
      if (fx?.fixture?.venue?.name) {
        footer.innerHTML += `<span>${fx.fixture.venue.name}</span>`
      }

      append(card, header)
      append(card, scoreboard)
      append(card, footer)
      append(grid, card)
    })
    return grid
  }

  function cleanName(name) {
    if (!name) return ''
    return name.replace(/\bU\s*-\s*\d+\b|\bU\d+\b/gi, '').trim()
  }

  function logo(team) {
    if (!team?.logo) return ''
    return `<img src="${team.logo}" alt="${team.name}" width="18" height="18">`
  }

  function formatDate(date) {
    if (!date) return ''
    try {
      const d = new Date(date)
      return d.toLocaleString([], {
        day: '2-digit',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
      })
    } catch (e) {
      return date
    }
  }

  function formatRound(round) {
    if (!round) return ''
    return round.replace(/_/g, ' ')
  }

  function score(value) {
    if (value === null || typeof value === 'undefined') return '-'
    return value
  }

  function statusLabel(status) {
    if (!status) return ''
    const map = {
      NS: 'À venir',
      FT: 'Terminé',
      HT: 'Mi-temps',
      '1H': '1re',
      '2H': '2e',
    }
    const label = map[status?.short] || status?.long || ''
    return label
  }

  function renderStandings(rows, fullStandings) {
    const box = document.createElement('div')
    box.className = 'cslf-overview-standings'
    const heading = document.createElement('h3')
    heading.textContent = 'Classement'
    box.appendChild(heading)
    const link = document.createElement('button')
    link.type = 'button'
    link.className = 'cslf-view-full'
    link.textContent = 'Voir le classement complet'
    link.addEventListener('click', () => {
      if (!fullStandings) return
      renderFullStandings(fullStandings)
    })
    box.appendChild(link)

    const table = document.createElement('table')
    table.className =
      'cslf-league-standings-table cslf-league-standings-table--mini'
    table.innerHTML = `
      <thead>
        <tr>
          <th>#</th>
          <th>Équipe</th>
          <th>J</th>
          <th>G</th>
          <th>N</th>
          <th>P</th>
          <th>+/-</th>
          <th>Pts</th>
          <th>Forme</th>
        </tr>
      </thead>
      <tbody></tbody>
    `
    const body = table.querySelector('tbody')
    rows.forEach((row) => {
      const tr = document.createElement('tr')
      tr.innerHTML = `
        <td>${row.rank ?? '-'}</td>
        <td>
          <div class="team">
            ${row.team?.logo ? `<img src="${row.team.logo}" alt="${row.team.name}" width="16" height="16">` : ''}
            <span>${row.team?.name || ''}</span>
          </div>
        </td>
        <td>${row.all?.played ?? '-'}</td>
        <td>${row.all?.win ?? '-'}</td>
        <td>${row.all?.draw ?? '-'}</td>
        <td>${row.all?.lose ?? '-'}</td>
        <td>${row.goalsDiff ?? '-'}</td>
        <td>${row.points ?? '-'}</td>
        <td>${renderForm(row.form)}</td>
      `
      body.appendChild(tr)
    })
    box.appendChild(table)
    return box
  }

  function renderFullStandings(fullStandings) {
    const modal = document.createElement('div')
    modal.className = 'cslf-modal-overlay standings'
    modal.innerHTML = `
      <div class="cslf-modal-content standings">
        <button class="cslf-modal-close" aria-label="Fermer">×</button>
        <h3>Classement complet</h3>
        <div class="cslf-modal-body"></div>
      </div>
    `
    const body = modal.querySelector('.cslf-modal-body')
    const table = document.createElement('table')
    table.className = 'cslf-league-standings-table'
    table.innerHTML = `
      <thead>
        <tr>
          <th>#</th>
          <th>Équipe</th>
          <th>J</th>
          <th>G</th>
          <th>N</th>
          <th>P</th>
          <th>+/-</th>
          <th>Pts</th>
          <th>Forme</th>
        </tr>
      </thead>
      <tbody></tbody>
    `
    const tbody = table.querySelector('tbody')
    fullStandings.forEach((row) => {
      const tr = document.createElement('tr')
      tr.innerHTML = `
        <td>${row.rank ?? '-'}</td>
        <td>
          <div class="team">
            ${row.team?.logo ? `<img src="${row.team.logo}" alt="${row.team.name}" width="16" height="16">` : ''}
            <span>${row.team?.name || ''}</span>
          </div>
        </td>
        <td>${row.points ?? '-'}</td>
        <td>${row.all?.played ?? '-'}</td>
        <td>${row.all?.win ?? '-'}</td>
        <td>${row.all?.draw ?? '-'}</td>
        <td>${row.all?.lose ?? '-'}</td>
        <td>${row.goalsDiff ?? '-'}</td>
        <td>${row.points ?? '-'}</td>
        <td>${renderForm(row.form)}</td>
      `
      tbody.appendChild(tr)
    })
    body.appendChild(table)

    modal.querySelector('.cslf-modal-close').addEventListener('click', () => {
      modal.remove()
    })
    modal.addEventListener('click', (evt) => {
      if (evt.target === modal) modal.remove()
    })
    document.body.appendChild(modal)
  }

  function renderForm(formString) {
    if (!formString) return ''
    return formString
      .split('')
      .map((char) => {
        const classes = ['cslf-form-badge']
        if (char === 'W') classes.push('is-win')
        else if (char === 'L') classes.push('is-loss')
        else classes.push('is-draw')
        return `<span class="${classes.join(' ')}">${translateForm(char)}</span>`
      })
      .join('')
  }

  function translateForm(char) {
    switch (char) {
      case 'W':
        return 'G'
      case 'L':
        return 'P'
      case 'D':
        return 'N'
      default:
        return char
    }
  }

  function createSection() {
    const div = document.createElement('div')
    div.className = 'cslf-league-overview-section'
    return div
  }

  function append(parent, child) {
    if (!child) return
    if (parent && parent.jquery) {
      parent.append(child)
    } else if (parent instanceof HTMLElement) {
      parent.append(
        child instanceof HTMLElement || child instanceof Node ? child : createFragment(child)
      )
    }
  }

  function createFragment(content) {
    if (content instanceof HTMLElement || content instanceof Node) return content
    const frag = document.createElement('div')
    frag.innerHTML = content
    const wrapper = document.createDocumentFragment()
    Array.from(frag.childNodes).forEach((node) => wrapper.appendChild(node))
    return wrapper
  }

  function clear(target) {
    if (!target) return
    if (target.jquery) {
      target.empty()
    } else if (target instanceof HTMLElement) {
      target.innerHTML = ''
    }
  }

  function setHTML(target, html) {
    if (!target) return
    if (target.jquery) {
      target.html(html)
    } else if (target instanceof HTMLElement) {
      target.innerHTML = html
    }
  }
})(window)

