<?php

if (!defined('ABSPATH')) exit;

add_shortcode('live_foot_widget_matches', 'cslf_widget_matches_shortcode');
add_shortcode('live_foot_widget_standings', 'cslf_widget_standings_shortcode');
add_shortcode('live_foot_widget_scorers', 'cslf_widget_scorers_shortcode');

function cslf_widget_enqueue_core_assets() {
    static $registered = false;
    if ($registered) {
        return;
    }
    $registered = true;

    wp_register_style(
        'cslf-widget-matches-css',
        CSLF_URL . 'public/css/widgets/matches.css',
        [],
        CSLF_VERSION
    );
    wp_register_style(
        'cslf-widget-standings-css',
        CSLF_URL . 'public/css/widgets/standings.css',
        [],
        CSLF_VERSION
    );
    wp_register_style(
        'cslf-widget-scorers-css',
        CSLF_URL . 'public/css/widgets/scorers.css',
        [],
        CSLF_VERSION
    );

    wp_register_script(
        'cslf-widget-matches-js',
        CSLF_URL . 'public/js/widgets/matches.js',
        [],
        CSLF_VERSION,
        true
    );
    wp_register_script(
        'cslf-widget-standings-js',
        CSLF_URL . 'public/js/widgets/standings.js',
        [],
        CSLF_VERSION,
        true
    );
    wp_register_script(
        'cslf-widget-scorers-js',
        CSLF_URL . 'public/js/widgets/scorers.js',
        [],
        CSLF_VERSION,
        true
    );
}

function cslf_widget_localize_core($handle) {
    static $localized = false;
    if ($localized) {
        return;
    }
    $localized = true;
    wp_localize_script($handle, 'CSLF_WIDGET_CORE', [
        'ajaxurl' => admin_url('admin-ajax.php'),
        'nonce'   => wp_create_nonce('cslf_nonce'),
        'i18n'    => [
            'error' => __('Impossible de charger les données.', 'csport-live-foot'),
            'empty' => __('Aucune donnée disponible.', 'csport-live-foot'),
        ],
    ]);
}

function cslf_widget_matches_shortcode($atts = []) {
    $opts = cslf_get_options();
    if (empty($opts['api_key'])) {
        return '';
    }

    $a = shortcode_atts([
        'league_id' => 0,
        'season'    => '',
        'title'     => '',
        'limit'     => 10,
    ], $atts, 'live_foot_widget_matches');

    $league_id = intval($a['league_id']);
    if ($league_id <= 0) {
        return '<div class="cslf-widget-error">'.esc_html__('Identifiant de championnat manquant.', 'csport-live-foot').'</div>';
    }

    cslf_widget_enqueue_core_assets();
    wp_enqueue_style('cslf-widget-matches-css');
    wp_enqueue_script('cslf-widget-matches-js');
    cslf_widget_localize_core('cslf-widget-matches-js');

    $config = [
        'league_id' => $league_id,
        'season'    => $a['season'],
        'limit'     => max(1, intval($a['limit'])),
        'title'     => sanitize_text_field($a['title']),
    ];

    $id = 'cslf-widget-matches-' . uniqid();

    ob_start(); ?>
    <div class="cslf-widget cslf-widget-matches" id="<?php echo esc_attr($id); ?>" data-config="<?php echo esc_attr(wp_json_encode($config)); ?>">
        <div class="cslf-widget-shell is-loading">
            <div class="cslf-widget-header">
                <div class="cslf-skeleton-line is-lg"></div>
                <div class="cslf-skeleton-line is-sm"></div>
            </div>
            <div class="cslf-widget-body">
                <?php for ($i = 0; $i < 6; $i++): ?>
                <div class="cslf-skeleton-card">
                    <div class="cslf-skeleton-row">
                        <div class="cslf-skeleton-avatar"></div>
                        <div class="cslf-skeleton-line"></div>
                    </div>
                    <div class="cslf-skeleton-row">
                        <div class="cslf-skeleton-avatar"></div>
                        <div class="cslf-skeleton-line"></div>
                    </div>
                </div>
                <?php endfor; ?>
            </div>
        </div>
        <div class="cslf-widget-error" style="display:none;"></div>
    </div>
    <?php
    return ob_get_clean();
}

function cslf_widget_standings_shortcode($atts = []) {
    $opts = cslf_get_options();
    if (empty($opts['api_key'])) {
        return '';
    }

    $a = shortcode_atts([
        'league_id' => 0,
        'season'    => '',
        'limit'     => 10,
        'title'     => '',
    ], $atts, 'live_foot_widget_standings');

    $league_id = intval($a['league_id']);
    if ($league_id <= 0) {
        return '<div class="cslf-widget-error">'.esc_html__('Identifiant de championnat manquant.', 'csport-live-foot').'</div>';
    }

    cslf_widget_enqueue_core_assets();
    wp_enqueue_style('cslf-widget-standings-css');
    wp_enqueue_script('cslf-widget-standings-js');
    cslf_widget_localize_core('cslf-widget-standings-js');

    $config = [
        'league_id' => $league_id,
        'season'    => $a['season'],
        'limit'     => max(1, intval($a['limit'])),
        'title'     => sanitize_text_field($a['title']),
    ];

    $id = 'cslf-widget-standings-' . uniqid();

    ob_start(); ?>
    <div class="cslf-widget cslf-widget-standings" id="<?php echo esc_attr($id); ?>" data-config="<?php echo esc_attr(wp_json_encode($config)); ?>">
        <div class="cslf-widget-shell is-loading">
            <div class="cslf-widget-header">
                <div class="cslf-skeleton-line is-lg"></div>
                <div class="cslf-skeleton-line is-sm"></div>
            </div>
            <div class="cslf-widget-body">
                <?php for ($i = 0; $i < 8; $i++): ?>
                <div class="cslf-skeleton-table-row">
                    <div class="cslf-skeleton-line is-sm"></div>
                </div>
                <?php endfor; ?>
            </div>
        </div>
        <div class="cslf-widget-error" style="display:none;"></div>
    </div>
    <?php
    return ob_get_clean();
}

function cslf_widget_scorers_shortcode($atts = []) {
    $opts = cslf_get_options();
    if (empty($opts['api_key'])) {
        return '';
    }

    $a = shortcode_atts([
        'league_id' => 0,
        'season'    => '',
        'limit'     => 10,
        'title'     => '',
    ], $atts, 'live_foot_widget_scorers');

    $league_id = intval($a['league_id']);
    if ($league_id <= 0) {
        return '<div class="cslf-widget-error">'.esc_html__('Identifiant de championnat manquant.', 'csport-live-foot').'</div>';
    }

    cslf_widget_enqueue_core_assets();
    wp_enqueue_style('cslf-widget-scorers-css');
    wp_enqueue_script('cslf-widget-scorers-js');
    cslf_widget_localize_core('cslf-widget-scorers-js');

    $config = [
        'league_id' => $league_id,
        'season'    => $a['season'],
        'limit'     => max(1, intval($a['limit'])),
        'title'     => sanitize_text_field($a['title']),
    ];

    $id = 'cslf-widget-scorers-' . uniqid();

    ob_start(); ?>
    <div class="cslf-widget cslf-widget-scorers" id="<?php echo esc_attr($id); ?>" data-config="<?php echo esc_attr(wp_json_encode($config)); ?>">
        <div class="cslf-widget-shell is-loading">
            <div class="cslf-widget-header">
                <div class="cslf-skeleton-line is-lg"></div>
                <div class="cslf-skeleton-line is-sm"></div>
            </div>
            <div class="cslf-widget-body">
                <?php for ($i = 0; $i < 6; $i++): ?>
                <div class="cslf-skeleton-row">
                    <div class="cslf-skeleton-avatar"></div>
                    <div class="cslf-skeleton-line"></div>
                </div>
                <?php endfor; ?>
            </div>
        </div>
        <div class="cslf-widget-error" style="display:none;"></div>
    </div>
    <?php
    return ob_get_clean();
}


