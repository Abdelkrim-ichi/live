;(($) => {
  // Declare the CSLF variable to avoid undeclared variable errors
  const CSLF = window.CSLF
  if (!CSLF) return
  const LIVE_MS = Number.parseInt(CSLF.ttl_live_ms || 20000, 10)
  const DET_MS = Number.parseInt(CSLF.ttl_det_ms || 60000, 10)
  let lastBundleAt = 0
  let liveIds = []
  let errorCount = 0
  const maxErrors = 5

  function showError($root, msg) {
    $root.find(".cslf-live-summary").text(msg || "Erreur de chargement.")
    $root.addClass("cslf-error-state")
  }

  function api(endpoint, data) {
    return $.ajax({
      url: CSLF.ajaxurl,
      method: "POST",
      data: Object.assign({ action: "cslf_api", endpoint, _wpnonce: CSLF.nonce }, data || {}),
      dataType: "json",
      timeout: 15000, // Add timeout
    })
  }

  function renderLive($root, list) {
    if (!list) {
      showError($root, "Aucune donnée.")
      return
    }
    if (list.ok === false || list.success === false || list.error) {
      showError($root, list.message || list.error || "Erreur API.")
      return
    }
    if (!list.response) {
      $root.find(".cslf-live-summary").text("Aucun match en direct.")
      $root.removeClass("cslf-error-state") // Remove error state
      return
    }
    const items = list.response
    liveIds = items.map((x) => x.fixture?.id).filter(Boolean)

    $root
      .find(".cslf-live-summary")
      .text(items.length ? items.length + " match(s) en direct" : "Aucun match en direct.")
    $root.removeClass("cslf-error-state") // Remove error state on success

    const $list = $root.find(".cslf-fixture-list").empty()
    items.forEach((fx) => {
      const id = fx.fixture?.id
      const home = fx.teams?.home
      const away = fx.teams?.away
      const goalsH = fx.goals && fx.goals.home != null ? fx.goals.home : "-"
      const goalsA = fx.goals && fx.goals.away != null ? fx.goals.away : "-"
      const time = fx.fixture?.status?.elapsed ? fx.fixture.status.elapsed + "'" : fx.fixture?.status?.short || ""

      const homeImg = home?.logo
        ? `<img src="${home.logo}" alt="" width="18" height="18" onerror="this.style.display='none'">`
        : ""
      const awayImg = away?.logo
        ? `<img src="${away.logo}" alt="" width="18" height="18" onerror="this.style.display='none'">`
        : ""

      const row = $(
        [
          '<div class="cslf-item" data-fid="' + id + '">',
          '<div class="cslf-line">',
          '<span class="cslf-time">' + time + "</span>",
          '<span class="cslf-home">' + homeImg + " " + (home?.name || "") + "</span>",
          '<span class="cslf-score">' + goalsH + " - " + goalsA + "</span>",
          '<span class="cslf-away">' + (away?.name || "") + " " + awayImg + "</span>",
          "</div>",
          '<div class="cslf-details">Détails en cours…</div>',
          "</div>",
        ].join(""),
      )
      $list.append(row)
    })
  }

  function tick($root) {
    api("live")
      .done((res) => {
        errorCount = 0

        renderLive($root, res)
        const now = Date.now()
        if (now - lastBundleAt >= DET_MS && liveIds.length) {
          lastBundleAt = now
          const limitedIds = liveIds.slice(0, 3)
          api("fixture_bundle", { "fixture_ids[]": limitedIds })
            .done((b) => {
              if (b && b.ok && b.bundle) {
                $root.find(".cslf-item").each(function () {
                  const fid = $(this).data("fid")
                  const pack = b.bundle[fid]
                  const $details = $(this).find(".cslf-details")
                  if (!pack) {
                    $details.text("Aucun détail.")
                    return
                  }

                  const statsTeam = pack.stats?.response?.[0]?.statistics || []
                  const possHome = (statsTeam.find((s) => s.type === "Ball Possession") || {}).value || "-"
                  const shots = (statsTeam.find((s) => s.type === "Total Shots") || {}).value || "-"

                  const lineupsCount = (pack.lineups?.response || []).length
                  const eventsCount = (pack.events?.response || []).length

                  $details.html(
                    [
                      '<div class="cslf-detail-grid">',
                      "<div><strong>Possession:</strong> " + possHome + "</div>",
                      "<div><strong>Tirs totaux:</strong> " + shots + "</div>",
                      "<div><strong>Compos:</strong> " + lineupsCount + "</div>",
                      "<div><strong>Événements:</strong> " + eventsCount + "</div>",
                      "</div>",
                    ].join(""),
                  )
                })
              } else if (b && b.message) {
                $root.find(".cslf-details").text("Erreur détails: " + b.message)
              }
            })
            .fail((xhr) => {
              $root.find(".cslf-details").text("Erreur détails (" + xhr.status + ").")
            })
        }
      })
      .fail((xhr) => {
        errorCount++
        let errorMsg = "Erreur (" + xhr.status + ")."

        if (xhr.status === 429) {
          errorMsg = "Limite de taux atteinte. Réessai dans quelques minutes."
        } else if (xhr.status === 0) {
          errorMsg = "Problème de connexion réseau."
        } else if (errorCount >= maxErrors) {
          errorMsg = "Trop d'erreurs. Vérifiez la configuration."
        }

        showError($root, errorMsg)
      })
  }

  // Use the jQuery variable directly without declaring it again
  $(() => {
    $(".cslf-live-widget").each(function () {
      const $root = $(this)
      tick($root)

      const getInterval = () => {
        if (errorCount >= maxErrors) return LIVE_MS * 5 // Slow down on repeated errors
        if (errorCount > 0) return LIVE_MS * 2 // Slow down on errors
        return LIVE_MS
      }

      const scheduleNext = () => {
        setTimeout(() => {
          tick($root)
          scheduleNext()
        }, getInterval())
      }

      scheduleNext()
    })
  })
})(window.jQuery)
