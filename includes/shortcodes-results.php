<?php
if (!defined('ABSPATH')) exit;

if (!function_exists('cslf_live_foot_results_shortcode')) {
  add_shortcode('live_foot_results', 'cslf_live_foot_results_shortcode');

  function cslf_live_foot_results_shortcode($atts) {
    // Si pas de clé API -> on ne rend rien
    $opts = cslf_get_options();
    if (empty($opts['api_key'])) return '';

    $a = shortcode_atts([
      'detail_url' => '#',
    ], $atts, 'live_foot_results');

    // Dépendances (jQuery + Select2)
    wp_enqueue_script('jquery');
    cslf_enqueue_select2_assets();

    // Nos assets
    wp_enqueue_style('cslf-results-css', CSLF_URL . 'public/css/results.css', [], CSLF_VERSION);
    wp_enqueue_style('cslf-cards-css', CSLF_URL . 'public/css/cslf-cards.css', ['cslf-results-css'], CSLF_VERSION);
    wp_enqueue_script('cslf-results-js', CSLF_URL . 'public/js/results.js', ['jquery','cslf-select2'], CSLF_VERSION, true);

    // Données côté JS
    $id = uniqid('cslf_res_');
    wp_localize_script('cslf-results-js', 'CSLF_RESULTS', [
      'instanceId' => $id,
      'ajaxurl'    => admin_url('admin-ajax.php'),
      'nonce'      => wp_create_nonce('cslf_nonce'),
      'detailUrl'  => $a['detail_url'],
      'timezone'   => $opts['timezone'] ?: 'UTC',
    ]);

    // Markup minimal
    ob_start(); ?>
    <div class="cslf-results" id="<?php echo esc_attr($id); ?>">
      <div class="cslf-filters">
        <div class="cslf-field">
          <!-- <label>Championnat</label> -->
          <select class="cslf-league-select"><option value="all">Tous</option></select>
        </div>
      </div>

      <div class="cslf-results-col">
        <!-- <div class="cslf-toolbar"><h1>Résultats</h1></div> -->
        <div class="cslf-rail-outer">
          <button class="cslf-nav cslf-prev" aria-label="Précédent">◀</button>
          <div class="cslf-rail"></div>
          <button class="cslf-nav cslf-next" aria-label="Suivant">▶</button>
        </div>
        <div class="cslf-empty" style="display:none;">Aucun match pour aujourd’hui.</div>
        <div class="cslf-error" style="display:none;"></div>
      </div>
    </div>
    <?php
    return ob_get_clean();
  }
}
