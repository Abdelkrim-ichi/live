<?php
if (!defined('ABSPATH')) exit;

if (!function_exists('cslf_live_foot_detail_shortcode')) {
  add_shortcode('live_foot_detail', 'cslf_live_foot_detail_shortcode');

  function cslf_live_foot_detail_shortcode($atts) {
    $opts = cslf_get_options();
    if (empty($opts['api_key'])) return '';

    $a = shortcode_atts([
      'back_url' => '/',
      'timezone' => $opts['timezone'] ?: 'UTC',
    ], $atts, 'live_foot_detail');

    wp_enqueue_script('jquery');
    wp_enqueue_style('cslf-detail-css');
    wp_enqueue_script('cslf-tabs-js', CSLF_URL . 'public/js/tabs.js', ['jquery'], CSLF_VERSION, true);
    wp_enqueue_style('cslf-detail-css', CSLF_URL . 'public/css/detail.css', [], CSLF_VERSION);
    // wp_enqueue_script('cslf-detail-js', CSLF_URL . 'public/js/detail.js', ['jquery'], CSLF_VERSION, true);


    // Split modules (order matters via dependencies)
    wp_enqueue_script('cslf-detail-common',     CSLF_URL . 'public/js/detail-common.js', ['jquery'],            CSLF_VERSION, true);
    wp_enqueue_script('cslf-detail-compat', CSLF_URL . 'public/js/detail-compat.js', ['cslf-detail-common'], CSLF_VERSION, true);
    wp_enqueue_script('cslf-detail-core',       CSLF_URL . 'public/js/detail-core.js',   ['cslf-detail-common'],CSLF_VERSION, true);
    wp_enqueue_script('cslf-detail-resume',     CSLF_URL . 'public/js/detail-resume.js', ['cslf-detail-core'],  CSLF_VERSION, true);
    wp_enqueue_script('cslf-detail-stats',      CSLF_URL . 'public/js/detail-stats.js',  ['cslf-detail-core'],  CSLF_VERSION, true);
    wp_enqueue_script('cslf-detail-standings',  CSLF_URL . 'public/js/detail-standings.js',['cslf-detail-core'],CSLF_VERSION, true);
    wp_enqueue_script('cslf-detail-h2h',        CSLF_URL . 'public/js/detail-h2h.js',    ['cslf-detail-core'],  CSLF_VERSION, true);


    $id = uniqid('cslf_det_');
    wp_localize_script('cslf-detail-core', 'CSLF_DETAIL_BOOT', [
    ]);

    wp_localize_script('cslf-detail-common', 'CSLF_DETAIL', [
      'instanceId' => $id,
      'ajaxurl'    => admin_url('admin-ajax.php'),
      'nonce'      => wp_create_nonce('cslf_nonce'),
      'timezone'   => $a['timezone'],
      'backUrl'    => $a['back_url'],
    ]);

    ob_start(); ?>
    <div class="cslf-detail cslf-center" id="<?php echo esc_attr($id); ?>" data-instance="<?php echo esc_attr($id); ?>">
      <div class="cslf-container">
        <div class="cslf-headbar">
          <a class="cslf-back" href="<?php echo esc_url($a['back_url']); ?>">← Retour à la liste</a>
          <div class="cslf-last" id="last-<?php echo esc_attr($id); ?>"></div>
        </div>

        <div class="cslf-header"><div class="cslf-title" id="title-<?php echo esc_attr($id); ?>"></div></div>

        <div class="cslf-tabs">
          <button class="is-active" data-tab="resume">Résumé</button>
          <button data-tab="timeline">Fil du match</button>
          <button data-tab="compos">Compositions</button>
          <button data-tab="classement">Classement</button>
          <button data-tab="stats">Statistiques</button>
          <button data-tab="h2h">Face à face</button>
        </div>

        <div class="cslf-pane is-active" data-pane="resume">
          <div class="cslf-grid">
            <div>
              <div class="cslf-section">Top stats</div>
              <div class="cslf-topstats">
                <div class="cslf-poswrap">
                  <div class="cslf-pos-home" id="posH-<?php echo $id; ?>">50%</div>
                  <div class="cslf-pos-away" id="posA-<?php echo $id; ?>">50%</div>
                </div>
                <div class="cslf-kpis">
                  <div class="cslf-krow"><span id="xgH-<?php echo $id; ?>" class="pillL">0.00</span><span>Expected goals (xG)</span><span id="xgA-<?php echo $id; ?>" class="pillR">0.00</span></div>
                  <div class="cslf-krow"><span id="shH-<?php echo $id; ?>" class="pillL">0</span><span>Tirs totaux</span><span id="shA-<?php echo $id; ?>" class="pillR">0</span></div>
                  <div class="cslf-krow"><span id="bcH-<?php echo $id; ?>" class="pillL">0</span><span>Grosses occasions</span><span id="bcA-<?php echo $id; ?>" class="pillR">0</span></div>
                </div>
              </div>
              <div class="cslf-section" style="margin-top:14px">Derniers événements</div>
              <div id="mini-<?php echo $id; ?>"></div>
            </div>
            <div>
              <div class="cslf-section">Stade (XI)</div>
              <div class="cslf-pitch-mini" id="pitch-mini-<?php echo $id; ?>"></div>
              <div class="cslf-section" style="margin-top:10px">Changements</div>
              <div id="subs-<?php echo $id; ?>" class="muted">—</div>
            </div>
          </div>
        </div>

        <div class="cslf-pane" data-pane="timeline"><div class="cslf-card"><div class="cslf-section">Fil du match</div><div id="events-<?php echo $id; ?>"></div></div></div>

        <div class="cslf-pane" data-pane="compos">
          <div class="cslf-card">
            <div class="cslf-section">Stade & Formations</div>
            <div class="cslf-teams-head"><div id="hh-<?php echo $id; ?>"></div><div id="ah-<?php echo $id; ?>"></div></div>
            <div id="forms-<?php echo $id; ?>" class="muted" style="margin-bottom:8px"></div>
            <div class="cslf-pitch" id="pitch-<?php echo $id; ?>"><div class="line center-line"></div><div class="circle"></div><div class="goal-area goal-left"></div><div class="goal-area goal-right"></div></div>
          </div>
        </div>

        <div class="cslf-pane" data-pane="classement">
          <div class="cslf-card">
            <div class="cslf-section">Classement</div>
            <div class="cslf-stand-filters">
              <button class="pill is-active" data-stand="all">Tous</button>
              <button class="pill" data-stand="home">Domicile</button>
              <button class="pill" data-stand="away">Extérieur</button>
            </div>
            <div class="cslf-league-head"><img id="lgLogo-<?php echo $id; ?>" alt=""><div id="lgName-<?php echo $id; ?>"></div></div>
            <div id="stand-<?php echo $id; ?>"></div>
          </div>
        </div>

        <div class="cslf-pane" data-pane="stats"><div class="cslf-card"><div class="cslf-section">Statistiques détaillées</div><div id="stats-<?php echo $id; ?>"></div></div></div>

        <div class="cslf-pane" data-pane="h2h">
          <div class="cslf-card">
            <div class="cslf-section">Face à face</div>
            <div class="cslf-h2h-head" id="h2h-head-<?php echo $id; ?>"></div>
            <div class="cslf-h2h-filters">
              <button class="pill" data-h2h="home">Domicile</button>
              <button class="pill" data-h2h="comp">Cette compétition</button>
            </div>
            <div id="h2h-<?php echo $id; ?>"></div>
          </div>
        </div>

        <div class="cslf-bad" id="err-<?php echo $id; ?>" style="display:none;"></div>
      </div>
    </div>
    <?php
    return ob_get_clean();
  }
}
