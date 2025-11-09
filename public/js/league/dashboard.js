(function (w, d, $) {
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

      $root.find('.cslf-league-panel').each(function () {
        const $panel = $(this)
        panels[$panel.data('panel')] = $panel
      })

      const state = {
        active: null,
        cache: {},
        isLoading: false,
      }

      const seasons = normalizeSeasons(config)
      initSeasonSelector($root, seasons, config)

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
          return
        }

        handler({
          root: $root,
          panel,
          config,
          data: payload,
        })
      }

      function fetchTab(tab) {
        setLoading(true)
        $.ajax({
          url: CSLF_LEAGUE_CORE.ajaxurl,
          method: 'POST',
          dataType: 'json',
          data: {
            action: 'cslf_league_api',
            tab,
            league_id: config.league_id,
            season: config.season,
            _wpnonce: CSLF_LEAGUE_CORE.nonce,
          },
        })
          .done((resp) => {
            if (resp && resp.success) {
              state.cache[tab] = resp.data
              render(tab, resp.data)
            } else {
              renderError(resp?.data?.message || resp?.message)
            }
          })
          .fail((xhr) => {
            renderError(
              xhr?.responseJSON?.data?.message ||
                CSLF_LEAGUE_CORE?.i18n?.error ||
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
        $tabs.first().data('tab')

      if (defaultTab) {
        setActive(defaultTab)
      } else {
        renderError('Aucun onglet configuré.')
      }
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

function initSeasonSelector($root, seasons, config) {
  const select = $root.find('.cslf-season-switch')
  if (!select.length) return

  if (!seasons.length) {
    select.closest('.cslf-season-select').hide()
    return
  } else {
    select.closest('.cslf-season-select').show()
  }

  select.empty()
  seasons.forEach((season) => {
    select.append(
      `<option value="${season.year}" ${
        String(season.year) === String(config.season) ? 'selected' : ''
      }>${formatSeasonLabel(season.year)}</option>`
    )
  })

  updateSeasonBadge($root, config.season)

  select.on('change', function () {
    const nextSeason = $(this).val()
    if (!nextSeason || String(nextSeason) === String(config.season)) return
    const url = new URL(window.location.href)
    url.searchParams.set('season', nextSeason)
    if (config.league_id) {
      url.searchParams.set('league_id', config.league_id)
    }
    window.location.href = url.toString()
  })
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

