<?php
if (!defined('ABSPATH')) exit;

/**
 * Shortcode: [live_foot_detail]
 * - Tabs shell (Résumé, Compositions, Statistiques, Classement, Confrontations)
 * - Loads your existing Compositions assets unchanged
 * - Other tabs are split into their own JS/CSS
 */
/* disabled duplicate */
// add_shortcode('live_foot_detail', function($atts){
  if (!function_exists('cslf_get_options')) return '';
  $opts = cslf_get_options();
  if (empty($opts['api_key'])) return '';

  $a = shortcode_atts([
    'back_url' => '',
  ], $atts, 'live_foot_detail');

  // Core deps
  wp_enqueue_script('jquery');

  // Shell (tabs) styles + scripts
  wp_enqueue_style ('cslf-center-css',  CSLF_URL.'public/css/center.css', [], CSLF_VERSION);
  wp_enqueue_script('cslf-tabs-js',     CSLF_URL.'public/js/tabs.js',     ['jquery'], CSLF_VERSION, true);

  // Per-pane modules (independent files)
  wp_enqueue_script('cslf-resume-js',     CSLF_URL.'public/js/resume.js',     ['jquery'], CSLF_VERSION, true);
  wp_enqueue_script('cslf-stats-js',      CSLF_URL.'public/js/stats.js',      ['jquery'], CSLF_VERSION, true);
  wp_enqueue_script('cslf-standings-js',  CSLF_URL.'public/js/standings.js',  ['jquery'], CSLF_VERSION, true);
  wp_enqueue_script('cslf-h2h-js',        CSLF_URL.'public/js/h2h.js',        ['jquery'], CSLF_VERSION, true);

  // >>> Your existing Compositions assets (unchanged) <<<
  wp_enqueue_style ('cslf-detail-css', CSLF_URL.'public/css/detail.css', [], CSLF_VERSION);
  wp_enqueue_script('cslf-detail-js',  CSLF_URL.'public/js/detail.js',  ['jquery'], CSLF_VERSION, true);

  // Pass shared config once for all modules
  $instance = 'cslf_mc_'.wp_generate_uuid4();
  wp_localize_script('cslf-tabs-js', 'CSLF_CENTER_'.$instance, [
    'instanceId' => $instance,
    'ajaxurl'    => admin_url('admin-ajax.php'),
    'nonce'      => wp_create_nonce('cslf_nonce'),
    'timezone'   => $opts['timezone'] ?: 'UTC',
    'backUrl'    => $a['back_url'],
  ]);

  ob_start(); ?>
  <div class="cslf-center" id="<?php echo esc_attr($instance); ?>"
       data-instance="<?php echo esc_attr($instance); ?>"
       data-ajaxurl="<?php echo esc_url(admin_url('admin-ajax.php')); ?>"
       data-nonce="<?php echo esc_attr(wp_create_nonce('cslf_nonce')); ?>"
       data-tz="<?php echo esc_attr($opts['timezone'] ?: 'UTC'); ?>"
       data-back="<?php echo esc_url($a['back_url']); ?>">

    <!-- Header (Résumé fills this) -->
    <header class="cslf-hdr">
      <div class="hdr-top">
        <div class="hdr-title" id="<?php echo $instance; ?>-hdrTitle">Chargement…</div>
        <div class="hdr-upd"   id="<?php echo $instance; ?>-lastUpdate"></div>
      </div>
      <div class="hdr-teams">
        <div class="team" id="<?php echo $instance; ?>-homeHead"></div>
        <div class="score" id="<?php echo $instance; ?>-score">- -</div>
        <div class="team" id="<?php echo $instance; ?>-awayHead"></div>
      </div>
      <div class="hdr-meta" id="<?php echo $instance; ?>-matchInfo"><span class="chip">…</span></div>
    </header>

    <!-- Tabs -->
    <div class="cslf-tabs" id="<?php echo $instance; ?>-tabs">
      <button class="tablink active" data-tab="resume">Résumé</button>
      <button class="tablink" data-tab="compos">Compositions</button>
      <button class="tablink" data-tab="stats">Statistiques</button>
      <button class="tablink" data-tab="classement">Classement</button>
      <button class="tablink" data-tab="h2h">Confrontations</button>
    </div>

    <!-- Pane: Résumé -->
    <section id="<?php echo $instance; ?>-pane-resume" class="tabpane active">
      <div class="resume-grid">
        <div class="mini-kpis" id="<?php echo $instance; ?>-resumeKpis">Chargement…</div>
        <div>
          <h4>Événements récents</h4>
          <div id="<?php echo $instance; ?>-eventsMini" class="muted">—</div>
          <h4>Derniers changements</h4>
          <div id="<?php echo $instance; ?>-subs" class="muted">—</div>
        </div>
        <div>
          <h4>Tous les événements</h4>
          <div id="<?php echo $instance; ?>-events" class="muted">—</div>
        </div>
      </div>
    </section>

    <!-- Pane: Compositions (YOUR MODULE UNCHANGED) -->
    <section id="<?php echo $instance; ?>-pane-compos" class="tabpane">
      <div
        class="cslf-detail"
        id="<?php echo $instance; ?>-compo"
        data-instance="<?php echo $instance; ?>-compo"
        data-ajaxurl="<?php echo esc_url(admin_url('admin-ajax.php')); ?>"
        data-nonce="<?php echo esc_attr(wp_create_nonce('cslf_nonce')); ?>"
        data-tz="<?php echo esc_attr($opts['timezone'] ?: 'UTC'); ?>">
        <!-- paste your exact Compositions HTML here (unchanged): -->
        <div class="wrap">
          <div class="card">
            <div class="hdr">
              <div class="side" id="<?php echo $instance; ?>-compo-homeHead">—</div>
              <div class="side right" id="<?php echo $instance; ?>-compo-awayHead">—</div>
            </div>
            <div id="<?php echo $instance; ?>-compo-pitch" class="pitch">
              <div class="vline"></div><div class="cc"></div>
              <div class="ga left"></div><div class="ga right"></div>
            </div>
            <div class="coaches">
              <div class="coach" id="<?php echo $instance; ?>-compo-coachHome"></div>
              <div class="coach right" id="<?php echo $instance; ?>-compo-coachAway"></div>
            </div>
            <div class="blk-title">Remplaçants entrés</div>
            <div class="grid2">
              <div class="list-card"><div id="<?php echo $instance; ?>-compo-subsHome"></div></div>
              <div class="list-card"><div id="<?php echo $instance; ?>-compo-subsAway"></div></div>
            </div>
            <div class="blk-title">Remplaçants (n’ont pas joué)</div>
            <div class="grid2">
              <div class="list-card"><div id="<?php echo $instance; ?>-compo-unusedHome" class="muted">—</div></div>
              <div class="list-card"><div id="<?php echo $instance; ?>-compo-unusedAway" class="muted">—</div></div>
            </div>
            <div class="blk-title">Blessés</div>
            <div class="grid2">
              <div class="list-card"><div id="<?php echo $instance; ?>-compo-injHome" class="muted">—</div></div>
              <div class="list-card"><div id="<?php echo $instance; ?>-compo-injAway" class="muted">—</div></div>
            </div>
            <div id="<?php echo $instance; ?>-compo-err" class="error" style="margin-top:8px;display:none"></div>
          </div>
        </div>
      </div>
    </section>

    <!-- Pane: Statistiques -->
    <section id="<?php echo $instance; ?>-pane-stats" class="tabpane">
      <div id="<?php echo $instance; ?>-statsTable" class="muted">Chargement…</div>
    </section>

    <!-- Pane: Classement -->
    <section id="<?php echo $instance; ?>-pane-classement" class="tabpane">
      <div class="filters">
        <button class="pill active" data-stand="all">Général</button>
        <button class="pill" data-stand="home">Domicile</button>
        <button class="pill" data-stand="away">Extérieur</button>
      </div>
      <div id="<?php echo $instance; ?>-standings" class="muted">Chargement…</div>
    </section>

    <!-- Pane: Confrontations -->
    <section id="<?php echo $instance; ?>-pane-h2h" class="tabpane">
      <div class="h2h-counters">
        <div><div class="h2h-num home" id="<?php echo $instance; ?>-h2hHome">0</div><div>Victoires</div></div>
        <div><div class="h2h-num"       id="<?php echo $instance; ?>-h2hDraws">0</div><div>Nuls</div></div>
        <div><div class="h2h-num away"  id="<?php echo $instance; ?>-h2hAway">0</div><div>Victoires</div></div>
      </div>
      <div class="filters">
        <button class="btn-filter" id="<?php echo $instance; ?>-h2hHomeOnly">Domicile uniquement</button>
        <button class="btn-filter" id="<?php echo $instance; ?>-h2hSameComp">Même compétition</button>
      </div>
      <div id="<?php echo $instance; ?>-h2h" class="muted">Chargement…</div>
    </section>
  </div>
  <?php
  return ob_get_clean();
});
