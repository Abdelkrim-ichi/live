(function (w) {
  const ns = (w.CSLF_LEAGUE_TAB_HANDLERS =
    w.CSLF_LEAGUE_TAB_HANDLERS || {})

  ns.standings = function ({ panel, data }) {
    clear(panel)

    const tables = data?.standings || []
    if (!tables.length || !tables[0]?.length) {
      setHTML(
        panel,
        '<div class="cslf-league-empty">Classement indisponible pour le moment.</div>'
      )
      return
    }

    tables.forEach((group, index) => {
      if (tables.length > 1) {
        append(
          panel,
          `<h3 class="cslf-standings-group">Groupe ${String.fromCharCode(
            65 + index
          )}</h3>`
        )
      }
      append(panel, renderTable(group))
    })
  }

  function renderTable(rows) {
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

    const body = table.querySelector('tbody')
    rows.forEach((row) => {
      const form = renderForm(row?.form)
      const tr = document.createElement('tr')
      tr.innerHTML = `
          <td>${row.rank ?? '-'}</td>
          <td>
            <div style="display:flex;align-items:center;gap:8px;">
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
          <td>${form}</td>
        `

      body.appendChild(tr)
    })

    return table
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

  function clear(target) {
    if (!target) return
    if (target.jquery) target.empty()
    else if (target instanceof HTMLElement) target.innerHTML = ''
  }

  function append(target, child) {
    if (!target) return
    if (target.jquery) {
      target.append(child)
    } else if (target instanceof HTMLElement) {
      target.appendChild(
        child instanceof HTMLElement || child instanceof Node
          ? child
          : createFragment(child)
      )
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

  function createFragment(content) {
    if (content instanceof HTMLElement || content instanceof Node) return content
    const wrap = document.createElement('div')
    wrap.innerHTML = content
    const frag = document.createDocumentFragment()
    Array.from(wrap.childNodes).forEach((node) => frag.appendChild(node))
    return frag
  }
})(window)

