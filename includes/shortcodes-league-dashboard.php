<?php

if (!defined('ABSPATH')) exit;

add_shortcode('live_foot_league', 'cslf_live_foot_league_shortcode');

/**
 * Shortcode [live_foot_league league_id="39" season="2024"].
 */
function cslf_live_foot_league_shortcode($atts = [], $content = null) {
    $atts = shortcode_atts([
        'league_id' => isset($_GET['league_id']) ? intval($_GET['league_id']) : 0,
        'season'    => isset($_GET['season']) ? sanitize_text_field($_GET['season']) : '',
        'title'     => '',
    ], $atts, 'live_foot_league');

    $league_id = intval($atts['league_id']);
    if ($league_id <= 0) {
        return '<div class="cslf-league-error">'.esc_html__('Identifiant de championnat manquant.', 'csport-live-foot').'</div>';
    }

    $meta   = cslf_get_league_meta($league_id);
    $season = cslf_resolve_league_season($league_id, $atts['season']);

    // Enqueue assets
    cslf_enqueue_league_assets();

    $seasons_for_js = array_map(function($season) {
        return [
            'year'    => $season['year'] ?? '',
            'current' => !empty($season['current']),
            'start'   => $season['start'] ?? '',
            'end'     => $season['end'] ?? '',
        ];
    }, $meta['seasons'] ?? []);

    $config = [
        'league_id' => $league_id,
        'season'    => $season,
        'league'    => [
            'name'    => $meta['name'],
            'country' => $meta['country'],
            'logo'    => $meta['logo'],
            'flag'    => $meta['flag'],
        ],
        'seasons'   => $seasons_for_js,
    ];

    $tabs = [
        'overview'   => __('Aperçu', 'csport-live-foot'),
        'standings'  => __('Classement', 'csport-live-foot'),
        'matches'    => __('Matches', 'csport-live-foot'),
        'stats'      => __('Statistiques', 'csport-live-foot'),
        'transfers'  => __('Transferts', 'csport-live-foot'),
        'seasons'    => __('Saisons', 'csport-live-foot'),
        'team'       => __('Équipe de la semaine', 'csport-live-foot'),
    ];

    $title = !empty($atts['title']) ? $atts['title'] : ($meta['name'] ?? __('Championnat', 'csport-live-foot'));
    ob_start();
    ?>
    <div class="cslf-league-dashboard" data-config="<?php echo esc_attr(wp_json_encode($config)); ?>">
        <div class="cslf-league-top">
            <div class="cslf-league-id">
                <?php if (!empty($meta['logo'])): ?>
                    <img class="cslf-league-logo" src="<?php echo esc_url($meta['logo']); ?>" alt="<?php echo esc_attr($title); ?>">
                <?php endif; ?>
                <div>
                    <h1 class="cslf-league-title"><?php echo esc_html($title); ?></h1>
                    <?php if (!empty($meta['country'])): ?>
                        <div class="cslf-league-country"><?php echo esc_html($meta['country']); ?></div>
                    <?php endif; ?>
                </div>
            </div>
            <div class="cslf-league-meta">
                <label class="cslf-season-select">
                    <select class="cslf-season-switch" aria-label="<?php esc_attr_e('Sélection de la saison', 'csport-live-foot'); ?>">
                        <?php foreach ($seasons_for_js as $season_entry): ?>
                            <option value="<?php echo esc_attr($season_entry['year']); ?>" <?php selected($season_entry['year'], $season); ?>>
                                <?php echo esc_html($season_entry['year']); ?>
                            </option>
                        <?php endforeach; ?>
                    </select>
                </label>
            </div>
        </div>

        <div class="cslf-league-tabs">
            <?php $i = 0; foreach ($tabs as $tab_id => $label): ?>
                <button type="button"
                        class="cslf-league-tab<?php echo $i === 0 ? ' is-active' : ''; ?>"
                        data-tab="<?php echo esc_attr($tab_id); ?>">
                    <?php echo esc_html($label); ?>
                </button>
            <?php $i++; endforeach; ?>
        </div>

        <div class="cslf-league-content is-loading" data-active="">
            <?php foreach ($tabs as $tab_id => $label): ?>
            <div class="cslf-league-panel" data-panel="<?php echo esc_attr($tab_id); ?>">
                <?php echo esc_html__('Chargement…', 'csport-live-foot'); ?>
            </div>
            <?php endforeach; ?>
            <div class="cslf-league-panel cslf-league-error" data-panel="error"></div>
        </div>
    </div>
    <?php
    return ob_get_clean();
}

function cslf_enqueue_league_assets() {
    wp_enqueue_style(
        'cslf-league-dashboard',
        CSLF_URL . 'public/css/league/dashboard.css',
        [],
        CSLF_VERSION
    );

    $tab_scripts = [
        'cslf-league-overview'  => 'overview.js',
        'cslf-league-standings' => 'standings.js',
        'cslf-league-matches'   => 'matches.js',
        'cslf-league-stats'     => 'stats.js',
        'cslf-league-transfers' => 'transfers.js',
        'cslf-league-seasons'   => 'seasons.js',
        'cslf-league-team'      => 'team.js',
    ];

    wp_enqueue_script(
        'cslf-league-dashboard',
        CSLF_URL . 'public/js/league/dashboard.js',
        ['jquery'],
        CSLF_VERSION,
        true
    );

    foreach ($tab_scripts as $handle => $file) {
        wp_enqueue_script(
            $handle,
            CSLF_URL . 'public/js/league/' . $file,
            ['cslf-league-dashboard'],
            CSLF_VERSION,
            true
        );
    }

    wp_localize_script('cslf-league-dashboard', 'CSLF_LEAGUE_CORE', [
        'ajaxurl' => admin_url('admin-ajax.php'),
        'nonce'   => wp_create_nonce('cslf_nonce'),
        'i18n'    => [
            'loading'   => __('Chargement…', 'csport-live-foot'),
            'no_data'   => __('Aucune donnée disponible pour le moment.', 'csport-live-foot'),
            'error'     => __('Erreur de chargement.', 'csport-live-foot'),
        ],
    ]);
}

