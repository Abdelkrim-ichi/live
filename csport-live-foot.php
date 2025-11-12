<?php
/**
 * Plugin Name: CSport Live Foot (API-Football Proxy + Cache)
 * Plugin URI:  https://csport.ma/
 * Description: Proxy côté serveur + cache (transients/Redis) pour API-Football, avec shortcodes et AJAX. Protège le quota peu importe le trafic.
 * \g<1>1.3.2
 * Author:      Abdelkrim Ichi
 * License:     GPLv2 or later
 * Text Domain: csport-live-foot
 */

if (!defined('ABSPATH')) exit;

define('CSLF_VERSION', '1.1.10');
define('CSLF_PATH', plugin_dir_path(__FILE__));
define('CSLF_URL', plugin_dir_url(__FILE__));
define('CSLF_OPTION_KEY', 'cslf_options');

// Defaults
function cslf_default_options() {
    return [
        'api_key'     => '',
        'ttl_live'    => 20,   // seconds
        'ttl_details' => 60,   // seconds
        'timezone'    => 'UTC',
    ];
}

// Load files
require_once CSLF_PATH . 'includes/helpers.php';
require_once CSLF_PATH . 'includes/leagues-followed.php';
require_once CSLF_PATH . 'includes/class-csport-live-foot.php';
require_once CSLF_PATH . 'includes/cslf-cache-warmers.php';
// NEW: split shortcodes
require_once CSLF_PATH . 'includes/shortcodes-results.php';
require_once CSLF_PATH . 'includes/shortcodes-championnats.php';
require_once CSLF_PATH . 'includes/shortcodes-detail.php';
require_once CSLF_PATH . 'includes/league-api.php';
require_once CSLF_PATH . 'includes/shortcodes-league-dashboard.php';
require_once CSLF_PATH . 'includes/shortcodes-widgets.php';

// Activation/Deactivation hooks
register_activation_hook(__FILE__, ['CSport_Live_Foot', 'activate']);
register_deactivation_hook(__FILE__, ['CSport_Live_Foot', 'deactivate']);

// Bootstrap
add_action('plugins_loaded', function() {
    CSport_Live_Foot::instance();
});


/** Nonce refresh endpoint (for cached pages) **/
add_action('wp_ajax_lf_get_nonce', 'cslf_ajax_get_nonce');
add_action('wp_ajax_nopriv_lf_get_nonce', 'cslf_ajax_get_nonce');
if (!function_exists('cslf_ajax_get_nonce')) {
  function cslf_ajax_get_nonce() {
    wp_send_json(['nonce' => wp_create_nonce('cslf_nonce')]);
  }
}
