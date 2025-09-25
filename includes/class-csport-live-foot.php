<?php

if (!defined('ABSPATH')) exit;

class CSport_Live_Foot {
    private static $instance = null;

    public static function instance() {
        if (self::$instance === null) {
            self::$instance = new self();
        }
        return self::$instance;
    }

    public static function activate() {
        // Ensure options exist (no cron here)
        $defaults = cslf_default_options();
        $opts = get_option(CSLF_OPTION_KEY, []);
        if (!is_array($opts)) $opts = [];
        update_option(CSLF_OPTION_KEY, array_merge($defaults, $opts));
        
        wp_cache_flush();
    }

    public static function deactivate() {
        // Clear cron
        $timestamp = wp_next_scheduled('cslf_warm_live_details');
        if ($timestamp) wp_unschedule_event($timestamp, 'cslf_warm_live_details');
        
        cslf_clear_plugin_cache();
    }

    private function __construct() {
        // Admin settings
        add_action('admin_menu', [$this, 'add_menu']);
        add_action('admin_init', [$this, 'register_settings']);

        // Cron schedule: register interval and ensure job on init
        add_filter('cron_schedules', [$this, 'add_minutely_schedule']);
        add_action('init', [$this, 'ensure_cron']);
        add_action('cslf_warm_live_details', [$this, 'cron_warm_details']);

        // Public assets + shortcode + AJAX
        add_action('wp_enqueue_scripts', [$this, 'enqueue_public_assets']);
        add_shortcode('cs_live_widget', [$this, 'shortcode_live_widget']);

        // AJAX router (server-side proxy)
        add_action('wp_ajax_cslf_api', [$this, 'ajax_router']);
        add_action('wp_ajax_nopriv_cslf_api', [$this, 'ajax_router']);
        
        add_action('wp_ajax_cslf_clear_cache', [$this, 'ajax_clear_cache']);
    }

    public function add_minutely_schedule($schedules) {
        if (!isset($schedules['minutely'])) {
            $schedules['minutely'] = ['interval' => 60, 'display' => __('Every Minute', 'csport-live-foot')];
        }
        return $schedules;
    }

    public function ensure_cron() {
        if (!wp_next_scheduled('cslf_warm_live_details')) {
            wp_schedule_event(time() + 90, 'minutely', 'cslf_warm_live_details');
        }
    }

    public function add_menu() {
        add_options_page(
            __('CSport LiveFoot', 'csport-live-foot'),
            __('CSport LiveFoot', 'csport-live-foot'),
            'manage_options',
            'csport-live-foot',
            [$this, 'render_settings_page']
        );
    }

    public function register_settings() {
        register_setting('cslf_settings', CSLF_OPTION_KEY, [
            'sanitize_callback' => [$this, 'sanitize_options']
        ]);

        add_settings_section('cslf_main', __('Paramètres API & Cache', 'csport-live-foot'), function(){
            echo '<p>'.esc_html__('Configurez votre clé API-Football et les TTL de cache.', 'csport-live-foot').'</p>';
        }, 'cslf_settings');

        add_settings_field('api_key', __('API Key', 'csport-live-foot'), function(){
            $opts = cslf_get_options();
            echo '<input type="password" name="'.esc_attr(CSLF_OPTION_KEY).'[api_key]" value="'.esc_attr($opts['api_key']).'" class="regular-text" />';
            echo '<p class="description">'.esc_html__('Votre clé API-Football', 'csport-live-foot').'</p>';
        }, 'cslf_settings', 'cslf_main');

        add_settings_field('ttl_live', __('TTL Live (sec)', 'csport-live-foot'), function(){
            $opts = cslf_get_options();
            echo '<input type="number" min="5" max="300" name="'.esc_attr(CSLF_OPTION_KEY).'[ttl_live]" value="'.esc_attr($opts['ttl_live']).'" class="small-text" />';
            echo '<p class="description">'.esc_html__('Durée de cache pour les matchs en direct (5-300 secondes)', 'csport-live-foot').'</p>';
        }, 'cslf_settings', 'cslf_main');

        add_settings_field('ttl_details', __('TTL Détails (sec)', 'csport-live-foot'), function(){
            $opts = cslf_get_options();
            echo '<input type="number" min="15" max="3600" name="'.esc_attr(CSLF_OPTION_KEY).'[ttl_details]" value="'.esc_attr($opts['ttl_details']).'" class="small-text" />';
            echo '<p class="description">'.esc_html__('Durée de cache pour les détails des matchs (15-3600 secondes)', 'csport-live-foot').'</p>';
        }, 'cslf_settings', 'cslf_main');

        add_settings_field('timezone', __('Timezone pour fixtures_today', 'csport-live-foot'), function(){
            $opts = cslf_get_options();
            echo '<input type="text" name="'.esc_attr(CSLF_OPTION_KEY).'[timezone]" value="'.esc_attr($opts['timezone']).'" class="regular-text" placeholder="UTC" />';
            echo '<p class="description">'.esc_html__('Timezone pour les matchs du jour (ex: Africa/Casablanca)', 'csport-live-foot').'</p>';
        }, 'cslf_settings', 'cslf_main');
    }

    public function sanitize_options($input) {
        $sanitized = [];
        
        $api_key = sanitize_text_field($input['api_key'] ?? '');
        if (!empty($api_key) && !cslf_validate_api_key($api_key)) {
            add_settings_error(
                CSLF_OPTION_KEY,
                'invalid_api_key',
                __('La clé API semble invalide. Vérifiez le format.', 'csport-live-foot')
            );
        }
        $sanitized['api_key'] = $api_key;
        
        $sanitized['ttl_live'] = max(5, min(300, intval($input['ttl_live'] ?? 20)));
        $sanitized['ttl_details'] = max(15, min(3600, intval($input['ttl_details'] ?? 60)));
        $sanitized['timezone'] = sanitize_text_field($input['timezone'] ?? 'UTC');
        return $sanitized;
    }

    public function render_settings_page() {
        $cache_stats = cslf_get_cache_stats();
        ?>
        <div class="wrap">
            <h1><?php esc_html_e('CSport LiveFoot - Réglages', 'csport-live-foot'); ?></h1>
            
            <?php if (isset($_GET['settings-updated'])): ?>
                <div class="notice notice-success is-dismissible">
                    <p><?php esc_html_e('Paramètres sauvegardés avec succès!', 'csport-live-foot'); ?></p>
                </div>
            <?php endif; ?>
            
            <form method="post" action="options.php">
                <?php
                settings_fields('cslf_settings');
                do_settings_sections('cslf_settings');
                submit_button();
                ?>
            </form>
            
            <!-- Enhanced cache management section with statistics -->
            <hr>
            <h2><?php esc_html_e('Gestion du Cache', 'csport-live-foot'); ?></h2>
            <div class="cslf-cache-info">
                <p><strong><?php esc_html_e('Statistiques du cache:', 'csport-live-foot'); ?></strong></p>
                <ul>
                    <li><?php printf(__('Éléments en cache: %d', 'csport-live-foot'), $cache_stats['cached_items']); ?></li>
                    <li><?php printf(__('Éléments de sauvegarde: %d', 'csport-live-foot'), $cache_stats['stale_items']); ?></li>
                </ul>
            </div>
            <p><?php esc_html_e('Utilisez ce bouton pour vider le cache en cas de problème.', 'csport-live-foot'); ?></p>
            <button type="button" id="cslf-clear-cache" class="button button-secondary">
                <?php esc_html_e('Vider le Cache', 'csport-live-foot'); ?>
            </button>
            <div id="cslf-cache-status"></div>
            
            <script>
            jQuery(document).ready(function($) {
                $('#cslf-clear-cache').on('click', function() {
                    var $btn = $(this);
                    var $status = $('#cslf-cache-status');
                    
                    $btn.prop('disabled', true).text('<?php esc_html_e('Vidage en cours...', 'csport-live-foot'); ?>');
                    
                    $.post(ajaxurl, {
                        action: 'cslf_clear_cache',
                        _wpnonce: '<?php echo wp_create_nonce('cslf_clear_cache'); ?>'
                    }, function(response) {
                        if (response.success) {
                            $status.html('<div class="notice notice-success inline"><p>' + response.data.message + '</p></div>');
                            setTimeout(function() {
                                location.reload();
                            }, 2000);
                        } else {
                            $status.html('<div class="notice notice-error inline"><p>' + response.data.message + '</p></div>');
                        }
                    }).always(function() {
                        $btn.prop('disabled', false).text('<?php esc_html_e('Vider le Cache', 'csport-live-foot'); ?>');
                    });
                });
            });
            </script>
            
            <hr>
            <p><strong>Shortcodes :</strong></p>
            <ul>
                <li><code>[cs_live_widget]</code> — Widget "Live" minimal</li>
                <li><code>[live_foot_results detail_url="/detail"]</code> — Liste du jour (cartes + filtre)</li>
                <li><code>[live_foot_detail back_url="/"]</code> — Page détail</li>
            </ul>
        </div>
        <?php
    }

    public function ajax_clear_cache() {
        if (!current_user_can('manage_options')) {
            wp_send_json_error(['message' => __('Permission insuffisante', 'csport-live-foot')]);
        }
        
        if (!wp_verify_nonce($_POST['_wpnonce'], 'cslf_clear_cache')) {
            wp_send_json_error(['message' => __('Nonce invalide', 'csport-live-foot')]);
        }
        
        $cleared = cslf_clear_plugin_cache();
        
        if ($cleared) {
            wp_send_json_success(['message' => __('Cache vidé avec succès!', 'csport-live-foot')]);
        } else {
            wp_send_json_error(['message' => __('Erreur lors du vidage du cache', 'csport-live-foot')]);
        }
    }

    public function enqueue_public_assets() {
        wp_register_style('cslf-style', CSLF_URL . 'public/css/lf-live.css', [], CSLF_VERSION);
        wp_register_script('cslf-script', CSLF_URL . 'public/js/lf-live.js', ['jquery'], CSLF_VERSION, true);

        $opts = cslf_get_options();
        wp_localize_script('cslf-script', 'CSLF', [
            'ajaxurl'     => admin_url('admin-ajax.php'),
            'nonce'       => wp_create_nonce('cslf_nonce'),
            'ttl_live_ms' => (int)$opts['ttl_live'] * 1000,
            'ttl_det_ms'  => (int)$opts['ttl_details'] * 1000,
        ]);
    }

    public function shortcode_live_widget($atts) {
        $opts = cslf_get_options();
        if (empty($opts['api_key'])) {
            return ''; // No API key -> show nothing
        }

        wp_enqueue_style('cslf-style');
        wp_enqueue_script('cslf-script');

        $id = uniqid('cslf_');
        ob_start(); ?>
        <div class="cslf-live-widget" id="<?php echo esc_attr($id); ?>">
            <div class="cslf-live-summary"><?php esc_html_e('Chargement des matchs en cours…', 'csport-live-foot'); ?></div>
            <div class="cslf-fixture-list"></div>
        </div>
        <?php
        return ob_get_clean();
    }

    public function ajax_router() {
        $nonceField = isset($_REQUEST['_lf_nonce']) ? '_lf_nonce' : (isset($_REQUEST['_wpnonce']) ? '_wpnonce' : null);
        $nonceVal = $nonceField ? sanitize_text_field($_REQUEST[$nonceField]) : '';
        if (!$nonceVal || !wp_verify_nonce($nonceVal, 'cslf_nonce')) {
            wp_send_json_error(['message' => 'Invalid nonce'], 200);
        }

        if (!cslf_check_rate_limit()) {
            wp_send_json_error(['message' => 'Rate limit exceeded. Please try again later.'], 200);
        }

        $endpoint = isset($_REQUEST['endpoint']) ? sanitize_text_field($_REQUEST['endpoint']) : '';
        $opts = cslf_get_options();
        
        if (empty($opts['api_key'])) {
            wp_send_json_error(['message' => 'API key not configured'], 200);
        }
        
        if (!cslf_validate_api_key($opts['api_key'])) {
            wp_send_json_error(['message' => 'Invalid API key format'], 200);
        }
        
        $ttl_live = (int)$opts['ttl_live'];
        $ttl_det  = (int)$opts['ttl_details'];
        $timezone = sanitize_text_field($opts['timezone']);

        switch ($endpoint) {
            case 'live':
                $data = cslf_cached_get('/fixtures', ['live' => 'all'], $ttl_live);
                wp_send_json($data);
                break;

            case 'fixtures_today':
                $date = isset($_REQUEST['date']) ? sanitize_text_field($_REQUEST['date']) : current_time('Y-m-d');
                if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $date)) {
                    wp_send_json_error(['message' => 'Invalid date format'], 200);
                }
                
                $date_obj = DateTime::createFromFormat('Y-m-d', $date);
                $now = new DateTime();
                $diff = $now->diff($date_obj)->days;
                
                if ($diff > 30) {
                    wp_send_json_error(['message' => 'Date too far from current date'], 200);
                }
                
                $data = cslf_cached_get('/fixtures', ['date' => $date, 'timezone' => $timezone], 120);
                wp_send_json($data);
                break;

            case 'fixture_bundle':
                $ids = isset($_REQUEST['fixture_ids']) ? (array) $_REQUEST['fixture_ids'] : [];
                $ids = array_values(array_filter(array_map('intval', $ids)));
                if (empty($ids)) wp_send_json_error(['message' => 'fixture_ids required'], 200);
                
                if (count($ids) > 5) {
                    wp_send_json_error(['message' => 'Too many fixture IDs (max 5)'], 400);
                }

                $bundle = [];
                foreach ($ids as $fid) {
                    if ($fid <= 0 || $fid > 9999999) {
                        continue; // Skip invalid IDs
                    }
                    
                    $lineups = cslf_cached_get('/fixtures/lineups', ['fixture' => $fid], $ttl_det);
                    $stats   = cslf_cached_get('/fixtures/statistics', ['fixture' => $fid], $ttl_det);
                    $events  = cslf_cached_get('/fixtures/events', ['fixture' => $fid], $ttl_det);
                    $bundle[$fid] = ['lineups' => $lineups, 'stats' => $stats, 'events' => $events];
                }
                wp_send_json(['ok' => true, 'bundle' => $bundle]);
                break;

            case 'proxy':
                // Generic proxy with whitelist
                $path = isset($_REQUEST['path']) ? sanitize_text_field($_REQUEST['path']) : '';
                $query_str = isset($_REQUEST['query']) ? wp_unslash($_REQUEST['query']) : '';
                
                if (strlen($query_str) > 1000) {
                    wp_send_json_error(['message' => 'Query string too long'], 200);
                }
                
                parse_str($query_str, $query);

                $allowed = [
                    '/fixtures','/fixtures/events','/fixtures/statistics','/fixtures/lineups',
                    '/standings','/fixtures/headtohead','/leagues','/teams', '/fixtures/players'
                ];
                if (!in_array('/'.ltrim($path,'/'), $allowed, true)) {
                    wp_send_json_error(['message' => 'Path not allowed'], 200);
                }

                // TTL per path
                $ttl_map = [
                    'fixtures'            => $ttl_live,
                    'fixtures/events'     => $ttl_live,
                    'fixtures/statistics' => $ttl_det,
                    'fixtures/lineups'    => max($ttl_det, 300),
                    'standings'           => 3600,
                    'fixtures/headtohead' => 900,
                    'leagues'             => 3600,
                    'teams'               => 3600,
                ];
                $pkey = trim($path, '/');
                $ttl = isset($ttl_map[$pkey]) ? $ttl_map[$pkey] : 60;

                $data = cslf_cached_get('/'.$pkey, $query, $ttl);
                wp_send_json(['success' => true, 'data' => $data]);
                break;

            default:
                wp_send_json_error(['message' => 'Unsupported endpoint'], 200);
        }
    }

    public function cron_warm_details() {
        $opts = cslf_get_options();
        
        if (empty($opts['api_key']) || !cslf_validate_api_key($opts['api_key'])) {
            return;
        }
        
        if (!cslf_check_rate_limit()) {
            error_log('CSLF: Cron job skipped due to rate limiting');
            return;
        }
        
        $ttl_live = (int)$opts['ttl_live'];
        $ttl_det  = (int)$opts['ttl_details'];

        $live = cslf_cached_get('/fixtures', ['live' => 'all'], $ttl_live);
        if (!is_array($live) || empty($live['response'])) return;

        $ids = array_map(function($fx){ return intval($fx['fixture']['id'] ?? 0); }, $live['response']);
        $ids = array_values(array_filter($ids));
        
        $ids = array_slice($ids, 0, 3);

        foreach ($ids as $fid) {
            if ($fid <= 0) continue;
            
            cslf_cached_get('/fixtures/lineups', ['fixture' => $fid], $ttl_det);
            cslf_cached_get('/fixtures/statistics', ['fixture' => $fid], $ttl_det);
            cslf_cached_get('/fixtures/events', ['fixture' => $fid], $ttl_det);
            
            usleep(500000); // 0.5 second delay
        }
    }

    private function send_safe($data) {
        if (is_array($data) && isset($data['ok']) && $data['ok'] === false) {
            $msg = isset($data['error']) ? (string)$data['error'] : 'Erreur API';
            wp_send_json_error(['message' => $msg, 'payload' => $data], 200);
        }
        if (is_wp_error($data)) {
            wp_send_json_error(['message' => $data->get_error_message()], 200);
        }
        $this->send_safe($data);
    }
}
