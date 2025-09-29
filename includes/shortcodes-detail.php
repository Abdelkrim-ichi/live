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
    // wp_enqueue_style('cslf-detail-css', CSLF_URL . 'public/css/detail.css', [], CSLF_VERSION);
    wp_enqueue_style('cslf-detail', CSLF_URL . 'public/css/cslf-detail.css', [], CSLF_VERSION);
    wp_enqueue_style('cslf-composition', CSLF_URL . 'public/css/cslf-composition.css', [], CSLF_VERSION);
    


    $id = uniqid('cslf_det_');

    // Split modules (order matters via dependencies)
    wp_enqueue_script('cslf-detail-common',     CSLF_URL . 'public/js/detail-common.js', ['jquery'],            CSLF_VERSION, true);
    // wp_enqueue_script('cslf-detail-compat', CSLF_URL . 'public/js/detail-compat.js', ['cslf-detail-common'], CSLF_VERSION, true);
    // ==== detail-compat split scripts ====
    wp_enqueue_script(
      'cslf-detail-utils',
      CSLF_URL . 'public/js/detail-compat.utils.js',
      ['cslf-detail-core'], // depends on your main core base
      CSLF_VERSION,
      true
    );

    wp_enqueue_script(
      'cslf-detail-header',
      CSLF_URL . 'public/js/detail-compat.header.js',
      ['cslf-detail-utils'],
      CSLF_VERSION,
      true
    );

    wp_enqueue_script(
      'cslf-detail-pitch',
      CSLF_URL . 'public/js/detail-compat.pitch.js',
      ['cslf-detail-header'],
      CSLF_VERSION,
      true
    );

    wp_enqueue_script(
      'cslf-detail-coach-subs',
      CSLF_URL . 'public/js/detail-compat.coach-subs.js',
      ['cslf-detail-pitch'],
      CSLF_VERSION,
      true
    );

    wp_enqueue_script(
      'cslf-detail-compat-core',
      CSLF_URL . 'public/js/detail-compat.core.js',
      ['cslf-detail-coach-subs'],
      CSLF_VERSION,
      true
    );
    wp_enqueue_script('cslf-detail-core',       CSLF_URL . 'public/js/detail-core.js',   ['cslf-detail-common'],CSLF_VERSION, true);
    wp_enqueue_script('cslf-detail-resume',     CSLF_URL . 'public/js/detail-resume.js', ['cslf-detail-core'],  CSLF_VERSION, true);
    wp_enqueue_script('cslf-detail-stats',      CSLF_URL . 'public/js/detail-stats.js',  ['cslf-detail-core'],  CSLF_VERSION, true);
    wp_enqueue_script('cslf-detail-standings',  CSLF_URL . 'public/js/detail-standings.js',['cslf-detail-core'],CSLF_VERSION, true);
    wp_enqueue_script('cslf-detail-h2h',        CSLF_URL . 'public/js/detail-h2h.js',    ['cslf-detail-core'],  CSLF_VERSION, true);

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

        <!-- Match Header with Scoreboard Style -->
        <div class="cslf-match-header">
          <div class="cslf-match-info" id="matchInfo-<?php echo esc_attr($id); ?>">
            <!-- Match info chips will be populated here -->
          </div>
          <div class="cslf-last-update" id="lastUpdate-<?php echo esc_attr($id); ?>"></div>
          
          <div class="cslf-scoreboard">
            <div class="cslf-team home" id="homeTeam-<?php echo esc_attr($id); ?>">
              <img class="cslf-team-logo" id="homeLogo-<?php echo esc_attr($id); ?>" src="" alt="">
              <div class="cslf-team-name" id="homeName-<?php echo esc_attr($id); ?>">—</div>
            </div>
            
            <div class="cslf-score-section">
              <div class="cslf-score" id="score-<?php echo esc_attr($id); ?>">0 - 0</div>
              <div class="cslf-match-time" id="matchTime-<?php echo esc_attr($id); ?>">18:52</div>
            </div>
            
            <div class="cslf-team away" id="awayTeam-<?php echo esc_attr($id); ?>">
              <img class="cslf-team-logo" id="awayLogo-<?php echo esc_attr($id); ?>" src="" alt="">
              <div class="cslf-team-name" id="awayName-<?php echo esc_attr($id); ?>">—</div>
            </div>

            <div class="cslf-scorers">
              <div class="cslf-scorers-home" id="scorersHome-<?php echo esc_attr($id); ?>"></div>
              <div class="cslf-scorers-away" id="scorersAway-<?php echo esc_attr($id); ?>"></div>
            </div>
          </div>

        </div>

        <div class="cslf-tabs">
          <button class="tablink is-active" data-tab="resume">Résumé</button>
          <button class="tablink" data-tab="timeline">Fil du match</button>
          <button class="tablink" data-tab="compos">Compositions</button>
          <button class="tablink" data-tab="classement">Classement</button>
          <button class="tablink" data-tab="stats">Statistiques</button>
          <button class="tablink" data-tab="h2h">Face à face</button>
        </div>

        <div class="cslf-pane is-active" data-pane="resume">
          <div class="cslf-grid">
            <div>
              <div class="cslf-section">Top stats</div>
              <div class="cslf-topstats">
                <div class="cslf-poswrap">
                  <div class="cslf-pos-home" id="<?php echo $id; ?>-posHome">50%</div>
                  <div class="cslf-pos-away" id="<?php echo $id; ?>-posAway">50%</div>
                  <div class="cslf-pos-bar" id="<?php echo $id; ?>-posBarHome" style="width:50%"></div>
                </div>
                <div class="cslf-kpis">
                  <div class="cslf-krow"><span id="<?php echo $id; ?>-xgHome" class="pillL">0.00</span><span>Expected goals (xG)</span><span id="<?php echo $id; ?>-xgAway" class="pillR">0.00</span></div>
                  <div class="cslf-krow"><span id="<?php echo $id; ?>-shotsHome" class="pillL">0</span><span>Tirs totaux</span><span id="<?php echo $id; ?>-shotsAway" class="pillR">0</span></div>
                  <div class="cslf-krow"><span id="<?php echo $id; ?>-bcHome" class="pillL">0</span><span>Grosses occasions</span><span id="<?php echo $id; ?>-bcAway" class="pillR">0</span></div>
                </div>
              </div>
              <div class="cslf-section" style="margin-top:14px">Derniers événements</div>
              <div id="<?php echo $id; ?>-eventsMini"></div>
            </div>
            <div>
              <div class="cslf-section">Stade (XI)</div>
              <div class="cslf-pitch-mini" id="pitch-mini-<?php echo $id; ?>"></div>
              <div class="cslf-section" style="margin-top:10px">Changements</div>
              <div id="<?php echo $id; ?>-subs" class="muted">—</div>
            </div>
          </div>
        </div>

        <div class="cslf-pane" data-pane="timeline"><div class="cslf-card"><div class="cslf-section">Fil du match</div><div id="<?php echo $id; ?>-events"></div></div></div>

        <div class="cslf-pane" data-pane="compos">
          <div class="cslf-card">
            <div class="cslf-teams-head">
              <div id="<?php echo $id; ?>-homeHead"></div>
              <div id="<?php echo $id; ?>-awayHead"></div>
            </div>
            <div id="<?php echo $id; ?>-forms" class="muted" style="margin-bottom:8px"></div>
            <div class="cslf-pitch" id="<?php echo $id; ?>-pitch"><div class="line center-line"></div><div class="circle"></div><div class="goal-area goal-left"></div><div class="goal-area goal-right"></div></div>
          </div>
        </div>

        <div class="cslf-pane" data-pane="classement">
          <div class="cslf-card">
            <div class="cslf-section">Classement</div>
            <div class="cslf-stand-filters">
              <button class="pill is-active" id="<?php echo $id; ?>-standAll" data-stand="all">Tous</button>
              <button class="pill" id="<?php echo $id; ?>-standHome" data-stand="home">Domicile</button>
              <button class="pill" id="<?php echo $id; ?>-standAway" data-stand="away">Extérieur</button>
            </div>
            <div class="cslf-league-head"><img id="<?php echo $id; ?>-lgLogo" alt=""><div id="<?php echo $id; ?>-lgName"></div></div>
            <div id="<?php echo $id; ?>-standings"></div>
          </div>
        </div>

        <div class="cslf-pane" data-pane="stats"><div class="cslf-card"><div class="cslf-section">Statistiques détaillées</div><div id="<?php echo $id; ?>-statsTable"></div></div></div>

        <div class="cslf-pane" data-pane="h2h">
          <div class="cslf-card">
            <div class="cslf-section">Face à face</div>
            <div class="cslf-h2h-head">
              <div class="h2h-box"><div class="h2h-num home" id="<?php echo $id; ?>-h2hHome">0</div><div>Victoires</div></div>
              <div class="h2h-box"><div class="h2h-num" id="<?php echo $id; ?>-h2hDraws">0</div><div>Nuls</div></div>
              <div class="h2h-box"><div class="h2h-num away" id="<?php echo $id; ?>-h2hAway">0</div><div>Victoires</div></div>
            </div>
            <div class="cslf-h2h-filters">
              <button class="pill" id="<?php echo $id; ?>-h2hHomeOnly">Domicile</button>
              <button class="pill" id="<?php echo $id; ?>-h2hSameComp">Cette compétition</button>
            </div>
            <div id="<?php echo $id; ?>-h2h"></div>
          </div>
        </div>

        <div class="cslf-bad" id="err-<?php echo $id; ?>" style="display:none;"></div>
      </div>
    </div>
    <?php
    return ob_get_clean();
  }
}
