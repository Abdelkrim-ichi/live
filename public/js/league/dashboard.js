(function (w, d, $) {
  const globalCache = (w.CSLF_LEAGUE_HTTP_CACHE =
    w.CSLF_LEAGUE_HTTP_CACHE || new Map())
  const globalFetch = (w.CSLF_LEAGUE_FETCH = w.CSLF_LEAGUE_FETCH || {})
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

  if (typeof globalFetch.getTabData !== 'function') {
    globalFetch.getTabData = function getTabData(cfg, tab, extra = {}) {
      const core = w.CSLF_LEAGUE_CORE || {}
      const leagueId = cfg?.league_id
      if (!leagueId) {
        return Promise.reject(new Error('league_id requis'))
      }
      const season = cfg?.season
      const ajaxurl = cfg?.ajaxurl || core.ajaxurl
      const key = JSON.stringify({
        league: leagueId,
        season: season || '',
        tab,
        extra,
      })
      const buildError = (source) => {
        if (source instanceof Error) return source
        const message =
          source?.responseJSON?.data?.message ||
          source?.responseJSON?.message ||
          source?.statusText ||
          core?.i18n?.error ||
          'Erreur'
        const error = new Error(message)
        if (source && typeof source.status === 'number') {
          error.status = source.status
        }
        return error
      }

      if (!globalCache.has(key)) {
        const perform = (attempt = 0) =>
          new Promise((resolve, reject) => {
            const nonceValue =
              cfg?._wpnonce ||
              cfg?.nonce ||
              core.nonce ||
              core?._wpnonce ||
              ''
            const payload = Object.assign(
              {
                action: 'cslf_league_api',
                tab,
                league_id: leagueId,
                season,
                _wpnonce: nonceValue,
              },
              extra || {}
            )

            $.ajax({
              url: ajaxurl,
              method: 'POST',
              dataType: 'json',
              data: payload,
            })
              .done((resp) => {
                if (resp && resp.success) {
                  resolve(resp.data)
                  return
                }
                reject(
                  new Error(
                    resp?.data?.message ||
                      resp?.message ||
                      core?.i18n?.error ||
                      'Erreur'
                  )
                )
              })
              .fail((xhr) => {
                if (xhr?.status === 403 && attempt === 0) {
                  refreshNonce(ajaxurl)
                    .then((fresh) => {
                      if (fresh) {
                        cfg._wpnonce = fresh
                        if (core) core.nonce = fresh
                        perform(attempt + 1).then(resolve).catch(reject)
                      } else {
                        reject(buildError(xhr))
                      }
                    })
                    .catch(() => reject(buildError(xhr)))
                  return
                }
                reject(buildError(xhr))
              })
          })

        const request = perform().catch((err) => {
          globalCache.delete(key)
          throw err
        })

        globalCache.set(key, request)
      }

      return globalCache.get(key)
    }
  }

  const getTabData = globalFetch.getTabData

  function ready(fn) {
    if ($ && typeof $ === 'function') {
      $(fn)
    } else {
      d.addEventListener('DOMContentLoaded', fn)
    }
  }

  ready(function () {
    const dashboards = $('.cslf-league-dashboard')
    if (!dashboards.length) {
      return
    }

    dashboards.each(function () {
      const $root = $(this)
      let config = {}
      try {
        config = JSON.parse($root.data('config') || '{}')
      } catch (e) {
        config = {}
      }

      if (!config.league_id) {
        const url = new URL(w.location.href)
        const paramId = parseInt(url.searchParams.get('league_id') || '0', 10)
        const paramSeason = url.searchParams.get('season') || ''
        if (paramId > 0) {
          config.league_id = paramId
        } else {
          $root.find('.cslf-league-content').removeClass('is-loading')
          $root.find('.cslf-league-error')
            .addClass('is-visible')
            .text('Configuration manquante.')
          return
        }
        if (!config.season && paramSeason) {
          config.season = paramSeason
        }
      }

      const getStorageKeyFor = (season) =>
        'cslf_league_tab_' + config.league_id + '_' + (season || '')
      const getStorageKey = () => getStorageKeyFor(config.season)

      const $tabs = $root.find('.cslf-league-tab')
      const $content = $root.find('.cslf-league-content')
      const panels = {}
      
      // S'assurer que tous les tabs sont visibles par défaut
      $tabs.show()

      $root.find('.cslf-league-panel').each(function () {
        const $panel = $(this)
        panels[$panel.data('panel')] = $panel
      })

      const state = {
        active: null,
        cache: {},
        isLoading: false,
      }

      ensureDashboardSkeleton($content)

      const seasons = normalizeSeasons(config)
      initSeasonSelector($root, seasons, config, state, () => {
        state.cache = {}
        state.active = null
        updateSeasonBadge($root, config.season)
        try {
          localStorage.setItem(
            'cslf_league_season_' + config.league_id,
            config.season
          )
        } catch (e) {}
        const currentTab =
          state.active ||
          $tabs.filter('.is-active').data('tab') ||
          $tabs.first().data('tab')
        if (currentTab) {
          setActive(currentTab, state)
        }
      })

      function setLoading(isLoading) {
        state.isLoading = !!isLoading
        $content.toggleClass('is-loading', state.isLoading)
      }

      function renderError(message) {
        setLoading(false)
        Object.values(panels).forEach(($p) => $p.removeClass('is-visible'))
        if (panels.error) {
          panels.error
            .addClass('is-visible')
            .text(message || CSLF_LEAGUE_CORE?.i18n?.error || 'Erreur')
        }
      }

      function getPanel(tab) {
        return panels[tab] || null
      }

      function render(tab, payload) {
        setLoading(false)
        Object.entries(panels).forEach(([key, $panel]) => {
          $panel.toggleClass('is-visible', key === tab)
        })
        const handler =
          w.CSLF_LEAGUE_TAB_HANDLERS &&
          typeof w.CSLF_LEAGUE_TAB_HANDLERS[tab] === 'function'
            ? w.CSLF_LEAGUE_TAB_HANDLERS[tab]
            : null

        const panel = getPanel(tab)
        if (!panel) {
          return
        }

        if (!handler) {
          panel.html(
            `<div class="cslf-league-empty">Module "${tab}" en préparation…</div>`
          )
          checkAndHideEmptyTab(tab, panel)
          return
        }

        handler({
          root: $root,
          panel,
          config,
          data: payload,
        })
        
        // Vérifier si le panel est vide après le rendu
        setTimeout(() => {
          checkAndHideEmptyTab(tab, panel)
        }, 100)
      }

      function checkAndHideEmptyTab(tab, $panel) {
        if (!$panel || !$panel.length) return
        
        // Ne pas vérifier si le tab n'a pas encore été chargé (pas dans le cache)
        if (!state.cache[tab]) {
          return
        }
        
        // Vérifier si le panel est vide ou ne contient que des messages d'erreur/vide
        const html = $panel.html().trim()
        const hasEmptyClass = $panel.find('.cslf-league-empty').length > 0
        const hasContent = $panel.find('*').length > 0 && html.length > 50
        const isJustLoading = html === 'Chargement…' || html === ''
        
        // Le panel est vide seulement s'il a la classe empty OU s'il n'a pas de contenu significatif
        const isEmpty = hasEmptyClass || (isJustLoading && !hasContent)
        
        if (isEmpty) {
          const $tab = $tabs.filter(`[data-tab="${tab}"]`)
          if ($tab.length) {
            $tab.hide()
            // Si c'est le tab actif et qu'il est vide, activer le premier tab visible
            if ($tab.hasClass('is-active')) {
              const $firstVisible = $tabs.filter(':visible').first()
              if ($firstVisible.length) {
                setActive($firstVisible.data('tab'))
              }
            }
          }
        } else {
          // S'assurer que le tab est visible s'il a du contenu
          const $tab = $tabs.filter(`[data-tab="${tab}"]`)
          if ($tab.length) {
            $tab.show()
          }
        }
      }

      function fetchTab(tab, extra = {}) {
        setLoading(true)
        getTabData(config, tab, extra)
          .then((payload) => {
            state.cache[tab] = payload
            render(tab, payload)
          })
          .catch((err) => {
            renderError(
              err?.message ||
                CSLF_LEAGUE_CORE?.i18n?.error ||
                CSLF_LEAGUE_CORE?.error ||
                'Erreur'
            )
          })
      }

      function setActive(tab, st = state) {
        if (st.active === tab) return
        st.active = tab
        $tabs.removeClass('is-active')
        $tabs
          .filter(`[data-tab="${tab}"]`)
          .addClass('is-active')

        if (st.cache[tab]) {
          render(tab, st.cache[tab])
        } else {
          fetchTab(tab)
        }

        try {
          localStorage.setItem(getStorageKey(), tab)
        } catch (e) {}
      }

      $tabs.on('click', function (evt) {
        evt.preventDefault()
        const tab = $(this).data('tab')
        if (!tab) return
        setActive(tab)
      })

      const defaultTab =
        localStorage.getItem(getStorageKey()) ||
        $tabs.filter('.is-active').data('tab') ||
        $tabs.filter(':visible').first().data('tab') ||
        $tabs.first().data('tab')

      if (defaultTab) {
        setActive(defaultTab)
      } else {
        renderError('Aucun onglet configuré.')
      }
      
      // Vérifier tous les tabs après un délai pour cacher ceux qui sont vides
      // On attend que le tab par défaut soit chargé
      setTimeout(() => {
        $tabs.each(function() {
          const tabId = $(this).data('tab')
          const $panel = panels[tabId]
          if ($panel && state.cache[tabId]) {
            checkAndHideEmptyTab(tabId, $panel)
          }
        })
      }, 1500)
    })
  })
})(window, document, window.jQuery)

function normalizeSeasons(config) {
  const PRESET = [
    2025, 2024, 2023, 2022, 2021, 2020,
    2019, 2018, 2017, 2016, 2015,
    2014, 2013, 2012, 2011, 2010,
  ]

  const items = Array.isArray(config.seasons) ? config.seasons.slice() : []
  const byYear = new Map()
  items.forEach((entry) => {
    const rawYear = parseInt(entry.year || 0, 10)
    if (!rawYear) return
    byYear.set(rawYear, {
      year: String(rawYear),
      current: !!entry.current,
      start: entry.start || '',
      end: entry.end || '',
    })
  })

  const out = []
  PRESET.forEach((year) => {
    const source = byYear.get(year) || {}
    out.push({
      year: String(year),
      current: !!source.current && year === PRESET[0],
      start: source.start || '',
      end: source.end || '',
    })
  })

  const seen = new Set(out.map((s) => s.year))

  if (config.season && !seen.has(String(config.season))) {
    out.unshift({
      year: String(config.season),
      current: false,
      start: '',
      end: '',
    })
    seen.add(String(config.season))
  }
  config.seasons = out
  if (!config.season && out.length) {
    const current = out.find((s) => s.current)
    config.season = (current || out[0]).year
  }
  return out
}

function initSeasonSelector($root, seasons, config, state, onSeasonChange) {
  const select = find($root, '.cslf-season-switch')
  if (!select) return

  const wrapper = select.closest('.cslf-season-select')
  if (!seasons.length) {
    if (wrapper) wrapper.classList.add('is-hidden')
    return
  }
  if (wrapper) wrapper.classList.remove('is-hidden')

  select.innerHTML = seasons
    .map((season) => {
      const selected =
        String(season.year) === String(config.season) ? 'selected' : ''
      return `<option value="${season.year}" ${selected}>${formatSeasonLabel(
        season.year
      )}</option>`
    })
    .join('')

  updateSeasonBadge($root, config.season)

  select.addEventListener('change', function (evt) {
    const nextSeason = evt.target.value
    if (!nextSeason || String(nextSeason) === String(config.season)) return
    const previousSeason = config.season
    config.season = nextSeason
    try {
      localStorage.removeItem(
        'cslf_league_tab_' + config.league_id + '_' + (previousSeason || '')
      )
    } catch (e) {}

    const url = new URL(window.location.href)
    if (config.league_id) {
      url.searchParams.set('league_id', config.league_id)
    }
    url.searchParams.set('season', nextSeason)
    if (typeof history.replaceState === 'function') {
      history.replaceState(null, '', url.toString())
    } else {
      window.location.href = url.toString()
      return
    }

    if (typeof onSeasonChange === 'function') {
      onSeasonChange(nextSeason, previousSeason, state)
    }
  })
}

function find(root, selector) {
  if (!root) return null
  if (root.jquery) {
    const found = root.find(selector)
    return found.length ? found.get(0) : null
  }
  return root.querySelector(selector)
}

function ensureDashboardSkeleton($content) {
  if (!$content) return
  const container =
    $content.jquery && $content.length ? $content.get(0) : $content
  if (!container) return
  if (container.querySelector('.cslf-dashboard-skeleton')) return
  container.insertBefore(buildDashboardSkeleton(), container.firstChild)
}

function buildDashboardSkeleton() {
  const container = document.createElement('div')
  container.className = 'cslf-dashboard-skeleton'
  container.setAttribute('aria-hidden', 'true')

  for (let i = 0; i < 3; i++) {
    const section = document.createElement('section')
    section.className = 'cslf-skeleton-section'

    const title = document.createElement('div')
    title.className = 'cslf-skeleton-line is-lg'
    section.appendChild(title)

    section.appendChild(createSkeletonCard())
    section.appendChild(createSkeletonCard())

    container.appendChild(section)
  }

  return container
}

function createSkeletonCard() {
  const card = document.createElement('div')
  card.className = 'cslf-skeleton-card'

  const row = document.createElement('div')
  row.className = 'cslf-skeleton-row'
  const left = document.createElement('div')
  left.className = 'cslf-skeleton-line is-sm'
  const right = document.createElement('div')
  right.className = 'cslf-skeleton-line is-sm'
  row.appendChild(left)
  row.appendChild(right)
  card.appendChild(row)

  for (let i = 0; i < 2; i++) {
    const line = document.createElement('div')
    line.className = 'cslf-skeleton-line'
    card.appendChild(line)
  }

  return card
}

function updateSeasonBadge($root, season) {
  $root
    .find('.cslf-current-season')
    .text(`Saison ${formatSeasonLabel(season)}`)
}

function formatSeasonLabel(year) {
  const y = parseInt(year, 10)
  if (!y) return year
  return `${y}/${String((y + 1) % 100).padStart(2, '0')}`
}

