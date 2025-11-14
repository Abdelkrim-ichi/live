(function (w) {
  const ns = (w.CSLF_LEAGUE_TAB_HANDLERS =
    w.CSLF_LEAGUE_TAB_HANDLERS || {})

  ns.overview = function ({ panel, data, root }) {
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

    const upcomingSection = renderScheduleSection('À venir', next, {
      ascending: true,
      isPast: false,
    })
    const recentSection = renderScheduleSection('Résultats récents', last, {
      ascending: false,
      isPast: true,
    })

    if (upcomingSection) append(wrap, upcomingSection)
    if (recentSection) append(wrap, recentSection)

    if ((data?.standings || []).length) {
      append(
        wrap,
        renderStandings(
          data.standings,
          data?.standings_full || data?.standings,
          root
        )
      )
    }
    append(panelEl, wrap)
  }

  function renderScheduleSection(title, fixtures, options = {}) {
    const groups = groupFixturesByDay(
      fixtures,
      options.ascending !== undefined ? options.ascending : true
    )
    if (!groups.length) return null

    const section = document.createElement('div')
    section.className = 'cslf-schedule-section'

    const header = document.createElement('div')
    header.className = 'cslf-schedule-header'

    const titleEl = document.createElement('h3')
    titleEl.textContent = title
    header.appendChild(titleEl)

    const nav = document.createElement('div')
    nav.className = 'cslf-schedule-nav'

    const prev = document.createElement('button')
    prev.type = 'button'
    prev.className = 'cslf-schedule-nav-btn'
    prev.innerHTML = '&#x276E;'

    const label = document.createElement('span')
    label.className = 'cslf-schedule-day'

    const next = document.createElement('button')
    next.type = 'button'
    next.className = 'cslf-schedule-nav-btn'
    next.innerHTML = '&#x276F;'

    nav.append(prev, label, next)
    header.appendChild(nav)
    section.appendChild(header)

    const body = document.createElement('div')
    body.className = 'cslf-schedule-body'
    section.appendChild(body)

    const state = { index: 0 }

    function update() {
      const group = groups[state.index]
      label.textContent = group?.label || '--'
      prev.disabled = state.index <= 0
      next.disabled = state.index >= groups.length - 1
      body.innerHTML = ''

      if (!group) {
        body.innerHTML =
          '<div class="cslf-league-empty">Aucune rencontre disponible.</div>'
        return
      }

      const dayLabel = document.createElement('div')
      dayLabel.className = 'cslf-schedule-date'
      dayLabel.textContent = group.label
      body.appendChild(dayLabel)

      group.fixtures.forEach((fx) => {
        body.appendChild(renderScheduleRow(fx, options.isPast))
      })
    }

    prev.addEventListener('click', () => {
      if (state.index > 0) {
        state.index -= 1
        update()
      }
    })

    next.addEventListener('click', () => {
      if (state.index < groups.length - 1) {
        state.index += 1
        update()
      }
    })

    update()
    return section
  }

  function renderScheduleRow(fx, isPast) {
    const home = fx?.teams?.home || {}
    const away = fx?.teams?.away || {}
    const goals = fx?.goals || {}
    const status = fx?.fixture?.status || {}
    const meta = fx?.league || {}
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

    const row = document.createElement('div')
    row.className = 'cslf-schedule-row'

    const left = document.createElement('div')
    left.className = 'cslf-schedule-left'
    left.innerHTML = `
      <span class="round">${formatRound(meta?.round)}</span>
      <span class="time">${formatTime(fx?.fixture?.date)}</span>
    `

    const center = document.createElement('div')
    center.className = 'cslf-schedule-center'
    const homeClass = homeLoser ? 'cslf-schedule-team--loser' : ''
    const awayClass = awayLoser ? 'cslf-schedule-team--loser' : ''
    center.innerHTML = `
      ${isFinishedWithPenalties ? '<span class="cslf-schedule-pen">Pen</span>' : ''}
      <span class="team ${homeClass}">
        ${logo(home)}
        <span>${cleanName(home?.name)}</span>
      </span>
      <span class="score">${score(goals?.home)} <span class="dash">-</span> ${score(
      goals?.away
    )}</span>
      <span class="team is-away ${awayClass}">
        ${logo(away)}
        <span>${cleanName(away?.name)}</span>
      </span>
    `

    const right = document.createElement('div')
    right.className = 'cslf-schedule-right'
    const statusText = statusLabel(status) || (isPast ? 'Terminé' : 'À venir')
    right.innerHTML = `
      <span class="status ${status?.short || ''}">${statusText}</span>
      <span class="venue">${fx?.fixture?.venue?.name || ''}</span>
    `

    row.appendChild(left)
    row.appendChild(center)
    row.appendChild(right)
    return row
  }

  function cleanName(name) {
    if (!name) return ''
    return name.replace(/\bU\s*-\s*\d+\b|\bU\d+\b/gi, '').trim()
  }

  function logo(team) {
    if (!team?.logo) return ''
    return `<img src="${team.logo}" alt="${team.name}" width="18" height="18">`
  }

  function formatTime(date) {
    if (!date) return ''
    try {
      const d = new Date(date)
      const today = new Date()
      const isToday = d.toDateString() === today.toDateString()
      const timeStr = d.toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      })
      return isToday ? `Aujourd'hui ${timeStr}` : timeStr
    } catch (e) {
      return ''
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

  function renderStandings(rows, fullStandings, root) {
    const box = document.createElement('div')
    box.className = 'cslf-overview-standings'
    const heading = document.createElement('h3')
    heading.textContent = 'Classement'
    box.appendChild(heading)
    const link = document.createElement('button')
    link.type = 'button'
    link.className = 'cslf-view-full'
    link.textContent = 'Voir le classement complet'
    link.addEventListener('click', (evt) => {
      evt.preventDefault()
      navigateToStandingsTab(root)
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

  function groupFixturesByDay(fixtures, ascending = true) {
    if (!Array.isArray(fixtures)) return []
    const map = new Map()
    fixtures.forEach((fx) => {
      const when = fx?.fixture?.date
      if (!when) return
      const key = normalizeDayKey(when)
      if (!map.has(key)) map.set(key, [])
      map.get(key).push(fx)
    })

    const sorted = Array.from(map.entries()).sort((a, b) => {
      return ascending
        ? a[0].localeCompare(b[0])
        : b[0].localeCompare(a[0])
    })

    return sorted.map(([key, list]) => ({
      key,
      label: formatDayLabel(key),
      fixtures: list.sort((a, b) =>
        ascending
          ? new Date(a?.fixture?.date || 0) - new Date(b?.fixture?.date || 0)
          : new Date(b?.fixture?.date || 0) - new Date(a?.fixture?.date || 0)
      ),
    }))
  }

  function normalizeDayKey(date) {
    try {
      const d = new Date(date)
      d.setHours(0, 0, 0, 0)
      const year = d.getFullYear()
      const month = String(d.getMonth() + 1).padStart(2, '0')
      const day = String(d.getDate()).padStart(2, '0')
      return `${year}-${month}-${day}`
    } catch (e) {
      return ''
    }
  }

  function formatDayLabel(key) {
    if (!key) return ''
    try {
      const parts = key.split('-')
      const d = new Date(
        Number(parts[0]),
        Number(parts[1]) - 1,
        Number(parts[2])
      )
      return d.toLocaleDateString('fr-FR', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    } catch (e) {
      return key
    }
  }

  function navigateToStandingsTab(root) {
    const rootEl = root?.jquery ? root.get(0) : root
    if (!rootEl) return
    const tab = rootEl.querySelector('.cslf-league-tab[data-tab="standings"]')
    if (tab) {
      tab.click()
      tab.focus?.()
    }
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

