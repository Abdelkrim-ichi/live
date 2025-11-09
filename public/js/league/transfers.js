(function (w) {
  const ns = (w.CSLF_LEAGUE_TAB_HANDLERS =
    w.CSLF_LEAGUE_TAB_HANDLERS || {})

  ns.transfers = function ({ panel, data }) {
    clear(panel)

    const transfers = data?.transfers || []
    if (!transfers.length) {
      setHTML(
        panel,
        '<div class="cslf-league-empty">Aucun transfert enregistré pour cette période.</div>'
      )
      return
    }

    const list = document.createElement('div')
    list.className = 'cslf-league-transfers'
    transfers.slice(0, 25).forEach((entry) => {
      const player = entry?.player || {}
      ;(entry?.transfers || []).forEach((move) => {
        const row = document.createElement('div')
        row.className = 'cslf-league-matchrow'
        row.innerHTML = `
          <div class="line">
            <span class="team">${player?.name || ''}</span>
            <span class="score">→</span>
            <span class="team">${move?.teams?.in?.name || ''}</span>
          </div>
          <div class="meta">
            <span>${move?.date || ''}</span>
            <span>${move?.type || ''}</span>
          </div>
        `
        list.appendChild(row)
      })
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
})(window)

