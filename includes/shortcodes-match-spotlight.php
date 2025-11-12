<?php
if (!defined('ABSPATH')) exit;

add_shortcode('csport_match_spotlight', 'cslf_match_spotlight_shortcode');

function cslf_match_spotlight_translate_label($label) {
    if ($label === null) return '';
    $trimmed = trim($label);
    if ($trimmed === '') return '';
    $key = mb_strtolower($trimmed, 'UTF-8');

    static $map = [
        'morocco' => 'Maroc',
        'morocco w' => 'Maroc',
        'morocco u17' => 'Maroc',
        'morocco u19' => 'Maroc',
        'morocco u20' => 'Maroc',
        'morocco u23' => 'Maroc',
        'united states' => 'États-Unis',
        'united states u19' => 'États-Unis',
        'republic of ireland' => 'République d’Irlande',
        'ireland republic' => 'Irlande',
        'france' => 'France',
        'spain' => 'Espagne',
        'portugal' => 'Portugal',
        'belgium' => 'Belgique',
        'brazil' => 'Brésil',
        'argentina' => 'Argentine',
        'switzerland' => 'Suisse',
        'egypt' => 'Égypte',
        'mexico' => 'Mexique',
        'zambia' => 'Zambie',
        'mali' => 'Mali',
        'colombia' => 'Colombie',
        'canada' => 'Canada',
        'congo dr' => 'RD Congo',
        'congo' => 'Congo',
        'germany' => 'Allemagne',
        'germany u19' => 'Allemagne',
        'usa u19' => 'États-Unis',
        'gabon' => 'Gabon',
        'nigeria' => 'Nigeria',
        'cameroun' => 'Cameroun',
        'cameroon' => 'Cameroun',
        'gabon' => 'Gabon',
        'paraguay' => 'Paraguay',
        'japan' => 'Japon',
        'south korea' => 'Corée du Sud',
        'korea republic' => 'Corée du Sud',
        'ivory coast' => "Côte d’Ivoire",
        'cote d\'ivoire' => "Côte d’Ivoire",
        'senegal' => 'Sénégal',
        'tunisia' => 'Tunisie',
        'algeria' => 'Algérie',
        'england' => 'Angleterre',
        'germany' => 'Allemagne',
        'italy' => 'Italie',
        'netherlands' => 'Pays-Bas',
        'sweden' => 'Suède',
        'norway' => 'Norvège',
        'croatia' => 'Croatie',
        'colombia w' => 'Colombie',
        'mexico w' => 'Mexique',
        'world' => 'Monde',
        'friendlies' => 'Matchs amicaux',
    ];

    static $roundMap = [
        'round of 128'      => '1/64 de finale',
        'round of 64'       => '1/32 de finale',
        'round of 32'       => 'Seizièmes de finale',
        'round of 16'       => 'Huitièmes de finale',
        'quarter-finals'    => 'Quarts de finale',
        'semi-finals'       => 'Demi-finales',
        'final'             => 'Finale',
        'group stage'       => 'Phase de groupes',
        'league stage'      => 'Phase de championnat',
        'play-offs'         => 'Barrages',
        'playoff round'     => 'Tour de barrage',
        'preliminary round' => 'Tour préliminaire',
        'friendly'          => 'Match amical',
        'friendlies'        => 'Match amical',
    ];

    if (isset($roundMap[$key])) {
        return $roundMap[$key];
    }

    return $map[$key] ?? $trimmed;
}

function cslf_match_spotlight_shortcode($atts) {
    $options = cslf_get_options();
    if (empty($options['api_key'])) {
        return '';
    }

    $atts = shortcode_atts([
        'league_id'   => 0,
        'season'      => '',
        'limit'       => 8,
        'title'       => '',
        'button_text' => __('Voir plus', 'csport-live-foot'),
        'button_url'  => '',
    ], $atts, 'csport_match_spotlight');

    $leagueId = intval($atts['league_id']);
    if ($leagueId <= 0) {
        return '';
    }

    $limit = max(1, min(12, intval($atts['limit'])));

    wp_enqueue_style(
        'cslf-match-spotlight',
        CSLF_URL . 'public/css/spotlight.css',
        [],
        CSLF_VERSION
    );

    $season = $atts['season'];
    if (empty($season) && function_exists('cslf_resolve_league_season')) {
        $season = cslf_resolve_league_season($leagueId, '');
    }

    $query = [
        'league' => $leagueId,
        'season' => $season,
        'next'   => $limit * 2,
    ];

    $response = cslf_cached_get('/fixtures', $query, 300);
    $fixtures = is_array($response['response'] ?? null) ? $response['response'] : [];

    $moroccoFixtures = [];
    $otherFixtures = [];
    foreach ($fixtures as $fixture) {
        if (cslf_match_spotlight_is_moroccan($fixture)) {
            $moroccoFixtures[] = $fixture;
        } else {
            $otherFixtures[] = $fixture;
        }
    }

    $allFixtures = array_slice(array_merge($moroccoFixtures, $otherFixtures), 0, $limit);
    if (empty($allFixtures)) {
        return '';
    }

    $hasMore = count($moroccoFixtures) + count($otherFixtures) > $limit;
    $buttonUrl = $atts['button_url'];
    if (empty($buttonUrl)) {
        $args = ['league_id' => $leagueId];
        if (!empty($season)) {
            $args['season'] = $season;
        }
        $buttonUrl = add_query_arg($args, home_url('/league-dashboard/'));
    }

    $meta = cslf_get_league_meta($leagueId);
    $leagueLabel = $meta['name'] ?? '';
    if (!$leagueLabel && !empty($allFixtures[0]['league']['name'])) {
        $leagueLabel = $allFixtures[0]['league']['name'];
    }
    $leagueLabel = cslf_match_spotlight_translate_label($leagueLabel);

    $timezone = !empty($options['timezone']) ? $options['timezone'] : 'UTC';

    ob_start();
    ?>
    <section class="cslf-spotlight">
        <header class="cslf-spotlight__header">
            <?php if ($leagueLabel): ?>
                <a class="cslf-spotlight__league-title" href="<?php echo esc_url($buttonUrl); ?>"><?php echo esc_html($leagueLabel); ?></a>
            <?php endif; ?>
            <?php if ($hasMore && $buttonUrl): ?>
                <a class="cslf-spotlight__more-link" href="<?php echo esc_url($buttonUrl); ?>"><?php echo esc_html($atts['button_text']); ?></a>
            <?php endif; ?>
        </header>
        <div class="cslf-spotlight__grid">
            <?php foreach ($allFixtures as $fixture):
                $isMorocco = cslf_match_spotlight_is_moroccan($fixture);
                $classes = 'cslf-spotlight__card' . ($isMorocco ? ' is-morocco' : '');
                $matchUrl = !empty($fixture['fixture']['id']) ? add_query_arg(['fixture' => intval($fixture['fixture']['id'])], home_url('/match-center/')) : '';
                $home = $fixture['teams']['home'] ?? [];
                $away = $fixture['teams']['away'] ?? [];
                if (!empty($home['country'])) {
                    $home['country'] = cslf_match_spotlight_translate_label($home['country']);
                }
                if (!empty($away['country'])) {
                    $away['country'] = cslf_match_spotlight_translate_label($away['country']);
                }
                $status = $fixture['fixture']['status']['short'] ?? '';
                $scoreHome = $fixture['goals']['home'] ?? null;
                $scoreAway = $fixture['goals']['away'] ?? null;
                $timeLabel = cslf_match_spotlight_time_label($fixture, $timezone);
            ?>
            <article class="<?php echo esc_attr($classes); ?>">
                <div class="cslf-spotlight__meta">
                    <span><?php echo esc_html($timeLabel); ?></span>
                    <?php if (!empty($fixture['league']['round'])): ?>
                        <span class="cslf-spotlight__round"><?php echo esc_html($fixture['league']['round']); ?></span>
                    <?php endif; ?>
                </div>
                <div class="cslf-spotlight__teams">
                    <?php echo cslf_match_spotlight_render_team($home, $scoreHome, $status, 'home'); ?>
                    <span class="cslf-spotlight__score"><?php echo cslf_match_spotlight_score_label($status, $scoreHome, $scoreAway); ?></span>
                    <?php echo cslf_match_spotlight_render_team($away, $scoreAway, $status, 'away'); ?>
                </div>
            </article>
            <?php endforeach; ?>
        </div>
    </section>
    <?php
    return ob_get_clean();
}

function cslf_match_spotlight_is_moroccan(array $fixture) {
    $checkTeam = function ($team) {
        $name = strtoupper((string) ($team['name'] ?? ''));
        $country = strtoupper((string) ($team['country'] ?? ''));
        return str_contains($name, 'MAROC') || str_contains($name, 'MOROCCO') || $country === 'MAROC' || $country === 'MOROCCO';
    };

    return $checkTeam($fixture['teams']['home'] ?? []) || $checkTeam($fixture['teams']['away'] ?? []);
}

function cslf_match_spotlight_time_label(array $fixture, $timezone) {
    $status = strtoupper((string) ($fixture['fixture']['status']['short'] ?? ''));
    $elapsed = $fixture['fixture']['status']['elapsed'] ?? null;

    if (in_array($status, ['FT', 'AET'], true)) {
        return __('Terminé', 'csport-live-foot');
    }

    if (in_array($status, ['HT'], true)) {
        return __('Mi-temps', 'csport-live-foot');
    }

    if (in_array($status, ['1H', '2H', 'LIVE', 'ET', 'P'], true) && $elapsed) {
        return sprintf(__('%d′', 'csport-live-foot'), intval($elapsed));
    }

    $date = $fixture['fixture']['date'] ?? '';
    if (!$date) {
        return '';
    }

    try {
        $dt = new DateTime($date);
        $dt->setTimezone(new DateTimeZone($timezone));
        $formatter = new IntlDateFormatter('fr_FR', IntlDateFormatter::FULL, IntlDateFormatter::SHORT, $timezone, IntlDateFormatter::GREGORIAN, 'EEE d MMM HH:mm');
        $label = $formatter->format($dt);
        return $label ?: $dt->format('d/m H:i');
    } catch (Exception $e) {
        return '';
    }
}

function cslf_match_spotlight_score_label($status, $scoreHome, $scoreAway) {
    $status = strtoupper((string) $status);
    if (in_array($status, ['FT', 'AET', 'ET', 'P', 'LIVE', 'HT', '1H', '2H'], true)) {
        if ($scoreHome === null || $scoreAway === null) {
            return '—';
        }
        return sprintf('%s - %s', $scoreHome, $scoreAway);
    }
    return 'vs';
}

function cslf_match_spotlight_render_team($team, $score, $status, $position) {
    $nameRaw = $team['name'] ?? '';
    $name = preg_replace('/\b(U|W)\d+$/i', '', $nameRaw);
    $name = trim($name);
    if ($name === '') {
        $name = $nameRaw;
    }
    $name = cslf_match_spotlight_translate_label($name);
    $logo = $team['logo'] ?? '';
    $klass = 'cslf-spotlight__team cslf-spotlight__team--' . esc_attr($position);

    ob_start();
    ?>
    <div class="<?php echo $klass; ?>">
        <div class="cslf-spotlight__team-row">
            <?php if ($logo): ?>
                <img src="<?php echo esc_url($logo); ?>" alt="<?php echo esc_attr($name); ?>">
            <?php else: ?>
                <span class="cslf-spotlight__team-placeholder"><?php echo esc_html(mb_substr($name, 0, 2)); ?></span>
            <?php endif; ?>
            <span class="cslf-spotlight__team-name"><?php echo esc_html($name); ?></span>
        </div>
        <?php if (!empty($team['country'])): ?>
            <span class="cslf-spotlight__team-country"><?php echo esc_html($team['country']); ?></span>
        <?php endif; ?>
    </div>
    <?php
    return ob_get_clean();
}
