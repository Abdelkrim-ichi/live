<?php
if (!defined('ABSPATH')) exit;

if (!function_exists('cslf_translate_country_label')) {
    function cslf_translate_country_label($country) {
        if ($country === null) {
            return '';
        }
        $trimmed = trim($country);
        if ($trimmed === '') {
            return '';
        }

        static $map = [
            'Spain'            => 'Espagne',
            'England'          => 'Angleterre',
            'Italy'            => 'Italie',
            'Germany'          => 'Allemagne',
            'France'           => 'France',
            'Morocco'          => 'Maroc',
            'Saudi Arabia'     => 'Arabie saoudite',
            'Argentina'        => 'Argentine',
            'Brazil'           => 'Brésil',
            'Portugal'         => 'Portugal',
            'Netherlands'      => 'Pays-Bas',
            'United States'    => 'États-Unis',
            'USA'              => 'États-Unis',
            'Mexico'           => 'Mexique',
            'Qatar'            => 'Qatar',
            'Belgium'          => 'Belgique',
            'Turkey'           => 'Turquie',
            'Algeria'          => 'Algérie',
            'Tunisia'          => 'Tunisie',
            'Senegal'          => 'Sénégal',
            'Ivory Coast'      => "Côte d'Ivoire",
            'Cote d\'Ivoire'   => "Côte d'Ivoire",
            'South Africa'     => 'Afrique du Sud',
            'Japan'            => 'Japon',
            'Korea Republic'   => 'Corée du Sud',
            'South Korea'      => 'Corée du Sud',
            'Croatia'          => 'Croatie',
            'Serbia'           => 'Serbie',
            'Russia'           => 'Russie',
            'Greece'           => 'Grèce',
            'Austria'          => 'Autriche',
            'Switzerland'      => 'Suisse',
            'Ukraine'          => 'Ukraine',
            'Poland'           => 'Pologne',
        ];

        return $map[$trimmed] ?? $trimmed;
    }
}

/**
 * Shortcode [championnats_list]
 * Affiche un catalogue des compétitions suivies avec liens vers le dashboard de chaque ligue.
 *
 * Attributs :
 * - dashboard_url : URL de base du dashboard (par défaut /league-dashboard/)
 * - columns       : nombre de colonnes (par défaut auto via CSS grid)
 */
add_shortcode('championnats_list', 'cslf_championnats_list_shortcode');

function cslf_championnats_list_shortcode($atts) {
    $opts = cslf_get_options();
    if (empty($opts['api_key'])) {
        return '<div class="cslf-league-catalog cslf-league-catalog--empty">'.esc_html__('Configurez votre clé API-Football.', 'csport-live-foot').'</div>';
    }

    $atts = shortcode_atts([
        'dashboard_url' => home_url('/league-dashboard/'),
    ], $atts, 'championnats_list');
    $dashboard_base = esc_url($atts['dashboard_url']);

    wp_enqueue_style(
        'cslf-championnats',
        CSLF_URL . 'public/css/championnats.css',
        [],
        CSLF_VERSION
    );

    $groups = cslf_followed_league_groups();
    if (empty($groups)) {
        return '';
    }

    $cards = [];
    foreach ($groups as $group) {
        $items = $group['items'] ?? [];
        foreach ($items as $item) {
            $leagueId = isset($item['id']) ? intval($item['id']) : 0;
            if ($leagueId <= 0) {
                continue;
            }

                $meta = cslf_get_league_meta($leagueId);
                $leagueName = $item['label'] ?? '';
                if (!$leagueName) {
                    $leagueName = $meta['name'] ?? '';
                }

                $country    = $item['country'] ?? ($meta['country'] ?? '');
                $country    = cslf_translate_country_label($country);

                $type       = $meta['type'] ?? '';
                $season     = $meta['current_season'] ?? '';

                $localLogoPath = CSLF_PATH . 'public/img/leagues/' . $leagueId . '.png';
                if (file_exists($localLogoPath)) {
                    $logo = CSLF_URL . 'public/img/leagues/' . $leagueId . '.png';
                } else {
                    $logo = $meta['logo'] ?? '';
                }

                if (!$season && !empty($meta['seasons']) && is_array($meta['seasons'])) {
                    $latest = end($meta['seasons']);
                    if (!empty($latest['year'])) {
                        $season = $latest['year'];
                    }
                }

                $cardKey = 'league-'.$leagueId;
                if (isset($cards[$cardKey])) {
                    continue;
                }

                if (empty($logo)) {
                    $localLogo = CSLF_URL . 'public/img/leagues/' . $leagueId . '.png';
                    if (file_exists(CSLF_PATH . 'public/img/leagues/' . $leagueId . '.png')) {
                        $logo = $localLogo;
                    }
                }

                $description = $item['description'] ?? '';
                if (!$description && $type) {
                    $description = ucfirst($type);
                }
                if (!$description && $country) {
                    $description = sprintf(__('Compétition %s', 'csport-live-foot'), $country);
                }

                $link = $dashboard_base;
                if (!empty($link)) {
                    $args = ['league_id' => $leagueId];
                    if ($season) {
                        $args['season'] = $season;
                    }
                    $link = add_query_arg($args, $link);
                }

                $cards[$cardKey] = [
                    'id'          => $leagueId,
                    'name'        => $leagueName ?: ($item['label'] ?? ''),
                    'label'       => $item['label'] ?? '',
                    'logo'        => $logo,
                    'country'     => $country,
                    'description' => $description,
                    'group'       => $group['group'] ?? '',
                    'note'        => $group['note'] ?? '',
                    'link'        => $link,
                    'season'      => $season,
                ];
        }
    }

    if (empty($cards)) {
        return '<div class="cslf-league-catalog cslf-league-catalog--empty">'.esc_html__('Aucune compétition suivie.', 'csport-live-foot').'</div>';
    }

    ob_start(); ?>
    <div class="cslf-league-catalog">
        <?php foreach ($groups as $groupIndex => $group): ?>
            <?php
            $hasItems = false;
            foreach ($group['items'] as $item) {
                if (!empty($item['id']) && isset($cards['league-'.$item['id']])) {
                    $hasItems = true;
                    break;
                }
            }
            if (!$hasItems) {
                continue;
            }
            ?>
            <section class="cslf-league-section">
                <header class="cslf-league-section__header">
                    <h2><?php echo esc_html($group['group'] ?? __('Compétitions', 'csport-live-foot')); ?></h2>
                    <?php if (!empty($group['note'])): ?>
                        <p class="cslf-league-section__note"><?php echo esc_html($group['note']); ?></p>
                    <?php endif; ?>
                </header>
                <div class="cslf-league-grid">
                    <?php foreach ($group['items'] as $item): ?>
                        <?php
                        $leagueId = intval($item['id']);
                        if ($leagueId <= 0) {
                            continue;
                        }
                        $key = 'league-'.$leagueId;
                        if (!isset($cards[$key])) {
                            continue;
                        }
                        $card = $cards[$key];
                        ?>
                        <a class="cslf-league-card" href="<?php echo esc_url($card['link']); ?>">
                            <div class="cslf-league-card__media">
                                <?php if (!empty($card['logo'])): ?>
                                    <img src="<?php echo esc_url($card['logo']); ?>" alt="<?php echo esc_attr($card['name']); ?>">
                                <?php else: ?>
                                    <span class="cslf-league-card__placeholder"><?php echo esc_html(mb_substr($card['name'], 0, 2)); ?></span>
                                <?php endif; ?>
                            </div>
                            <div class="cslf-league-card__body">
                                <span class="cslf-league-card__name"><?php echo esc_html($card['name']); ?></span>
                                <?php if (!empty($card['country'])): ?>
                                    <span class="cslf-league-card__country"><?php echo esc_html($card['country']); ?></span>
                                <?php endif; ?>
                            </div>
                            <?php if (!empty($card['description'])): ?>
                                <div class="cslf-league-card__hover">
                                    <p><?php echo esc_html($card['description']); ?></p>
                                </div>
                            <?php endif; ?>
                        </a>
                    <?php endforeach; ?>
                </div>
            </section>
        <?php endforeach; ?>
    </div>
    <?php
    return ob_get_clean();
}

