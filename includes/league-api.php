<?php

if (!defined('ABSPATH')) exit;

add_action('wp_ajax_cslf_league_api', 'cslf_ajax_league_api');
add_action('wp_ajax_nopriv_cslf_league_api', 'cslf_ajax_league_api');

/**
 * AJAX router for league dashboard data.
 */
function cslf_ajax_league_api() {
    check_ajax_referer('cslf_nonce', '_wpnonce');

    $league_id = isset($_REQUEST['league_id']) ? intval($_REQUEST['league_id']) : 0;
    $season    = isset($_REQUEST['season']) ? sanitize_text_field($_REQUEST['season']) : '';
    $tab       = isset($_REQUEST['tab']) ? sanitize_text_field($_REQUEST['tab']) : 'overview';
    $round     = isset($_REQUEST['round']) ? sanitize_text_field($_REQUEST['round']) : '';

    if ($league_id <= 0) {
        wp_send_json_error(['message' => __('Paramètres invalides (league_id manquant)', 'csport-live-foot')], 400);
    }

    try {
        switch ($tab) {
            case 'overview':
                $payload = cslf_league_api_overview($league_id, $season);
                break;

            case 'standings':
                $payload = cslf_league_api_standings($league_id, $season);
                break;

            case 'matches':
                $payload = cslf_league_api_matches($league_id, $season, $round);
                break;

            case 'stats':
                $payload = cslf_league_api_stats($league_id, $season);
                break;

            case 'transfers':
                $payload = cslf_league_api_transfers($league_id, $season);
                break;

            case 'seasons':
                $payload = cslf_league_api_seasons($league_id);
                break;

            case 'team':
                $payload = cslf_league_api_team_of_week($league_id, $season);
                break;

            default:
                wp_send_json_error(['message' => __('Onglet inconnu.', 'csport-live-foot')], 400);
        }

        wp_send_json_success($payload);
    } catch (Exception $e) {
        wp_send_json_error(['message' => $e->getMessage()], 500);
    }
}

/**
 * Fetch league meta info (name, country, logo, current season).
 */
function cslf_get_league_meta($league_id) {
    static $cache = [];
    if (isset($cache[$league_id])) {
        return $cache[$league_id];
    }

    $data = cslf_cached_get('/leagues', ['id' => $league_id], 86400);
    $league = $data['response'][0]['league'] ?? [];
    $country = $data['response'][0]['country'] ?? [];

    $result = [
        'id'       => $league_id,
        'name'     => $league['name'] ?? '',
        'type'     => $league['type'] ?? '',
        'logo'     => $league['logo'] ?? '',
        'country'  => $country['name'] ?? '',
        'flag'     => $country['flag'] ?? '',
        'seasons'  => $league['seasons'] ?? [],
        'current_season' => null,
    ];

    if (!empty($result['seasons'])) {
        foreach ($result['seasons'] as $season) {
            if (!empty($season['current'])) {
                $result['current_season'] = $season['year'];
                break;
            }
        }
    }

    $cache[$league_id] = $result;
    return $result;
}

/**
 * Resolve season. Uses provided value or falls back to current season for the league.
 */
function cslf_resolve_league_season($league_id, $season) {
    if (!empty($season)) {
        return $season;
    }
    $meta = cslf_get_league_meta($league_id);
    if (!empty($meta['current_season'])) {
        return $meta['current_season'];
    }
    if (!empty($meta['seasons'])) {
        $first = end($meta['seasons']);
        return $first['year'] ?? date('Y');
    }
    return date('Y');
}

function cslf_league_api_overview($league_id, $season = '') {
    $season = cslf_resolve_league_season($league_id, $season);

    $roundsResp = cslf_cached_get('/fixtures/rounds', [
        'league' => $league_id,
        'season' => $season,
    ], 3600);

    $currentRoundResp = cslf_cached_get('/fixtures/rounds', [
        'league'  => $league_id,
        'season'  => $season,
        'current' => 'true',
    ], 3600);

    $rounds        = array_values($roundsResp['response'] ?? []);
    $currentRound  = $currentRoundResp['response'][0] ?? ($rounds[0] ?? '');
    $currentIndex  = array_search($currentRound, $rounds, true);
    if ($currentIndex === false) {
        $currentIndex = 0;
    }

    $finishedStatuses = ['FT', 'AET', 'PEN'];

    $currentFixturesResp = $currentRound
        ? cslf_cached_get('/fixtures', [
            'league' => $league_id,
            'season' => $season,
            'round'  => $currentRound,
        ], 300)
        : ['response' => []];

    $currentFixtures = $currentFixturesResp['response'] ?? [];

    $upcomingCurrent = array_values(array_filter($currentFixtures, function ($fixture) use ($finishedStatuses) {
        $short = strtoupper($fixture['fixture']['status']['short'] ?? '');
        return !in_array($short, $finishedStatuses, true);
    }));

    $nextRound    = $rounds[$currentIndex + 1] ?? '';
    $nextFixtures = [];
    if ($nextRound) {
        $nextResp     = cslf_cached_get('/fixtures', [
            'league' => $league_id,
            'season' => $season,
            'round'  => $nextRound,
        ], 300);
        $nextFixtures = $nextResp['response'] ?? [];
    }

    $upcoming = cslf_unique_fixtures(array_merge($upcomingCurrent, $nextFixtures));

    if (empty($upcoming)) {
        $fallback = cslf_cached_get('/fixtures', [
            'league' => $league_id,
            'season' => $season,
            'next'   => 20,
        ], 300);
        $upcoming = $fallback['response'] ?? [];
    }

    $recent = [];
    $prevRound = $rounds[$currentIndex - 1] ?? '';
    if ($prevRound) {
        $prevResp = cslf_cached_get('/fixtures', [
            'league' => $league_id,
            'season' => $season,
            'round'  => $prevRound,
        ], 300);
        $recent = array_values(array_filter($prevResp['response'] ?? [], function ($fixture) use ($finishedStatuses) {
            $short = strtoupper($fixture['fixture']['status']['short'] ?? '');
            return in_array($short, $finishedStatuses, true);
        }));
    }

    if (empty($recent)) {
        $recent = array_values(array_filter($currentFixtures, function ($fixture) use ($finishedStatuses) {
            $short = strtoupper($fixture['fixture']['status']['short'] ?? '');
            return in_array($short, $finishedStatuses, true);
        }));
    }

    if (empty($recent)) {
        $fallbackRecent = cslf_cached_get('/fixtures', [
            'league' => $league_id,
            'season' => $season,
            'last'   => 15,
        ], 300);
        $recent = $fallbackRecent['response'] ?? [];
    }

    $recent = cslf_unique_fixtures($recent);

    $standingsResp = cslf_cached_get('/standings', [
        'league' => $league_id,
        'season' => $season,
    ], 600);

    $standings = [];
    if (!empty($standingsResp['response'][0]['league']['standings'][0])) {
        $standings = array_slice($standingsResp['response'][0]['league']['standings'][0], 0, 5);
    }

    return [
        'season'      => $season,
        'next_fixtures' => array_slice($upcoming, 0, 40),
        'last_fixtures' => array_slice($recent, 0, 40),
        'standings'     => array_slice($standings, 0, 5),
        'standings_full'=> $standings,
    ];
}

function cslf_unique_fixtures(array $fixtures) {
    $seen = [];
    $unique = [];
    foreach ($fixtures as $fixture) {
        $id = $fixture['fixture']['id'] ?? null;
        if ($id && isset($seen[$id])) {
            continue;
        }
        if ($id) {
            $seen[$id] = true;
        }
        $unique[] = $fixture;
    }
    return $unique;
}

function cslf_league_api_standings($league_id, $season = '') {
    $season = cslf_resolve_league_season($league_id, $season);

    $resp = cslf_cached_get('/standings', [
        'league' => $league_id,
        'season' => $season,
    ], 600);

    $standings = [];
    if (!empty($resp['response'][0]['league']['standings'])) {
        $standings = $resp['response'][0]['league']['standings'];
    }

    return [
        'season'    => $season,
        'standings' => $standings,
    ];
}

function cslf_league_api_matches($league_id, $season = '', $round = '') {
    $season = cslf_resolve_league_season($league_id, $season);
    $roundsResp = cslf_cached_get('/fixtures/rounds', [
        'league' => $league_id,
        'season' => $season,
    ], 3600);

    $rounds = $roundsResp['response'] ?? [];

    $currentResp = cslf_cached_get('/fixtures/rounds', [
        'league'  => $league_id,
        'season'  => $season,
        'current' => 'true',
    ], 3600);

    $currentRound = $currentResp['response'][0] ?? ($rounds[0] ?? '');
    $selectedRound = !empty($round) ? $round : $currentRound;

    $fixturesResp = cslf_cached_get('/fixtures', array_filter([
        'league' => $league_id,
        'season' => $season,
        'round'  => $selectedRound ?: null,
    ]), 300);

    $fixtures = $fixturesResp['response'] ?? [];

    return [
        'season'        => $season,
        'round'         => $selectedRound,
        'current_round' => $currentRound,
        'rounds'        => $rounds,
        'fixtures'      => $fixtures,
    ];
}

function cslf_league_api_stats($league_id, $season = '') {
    $season = cslf_resolve_league_season($league_id, $season);

    $topScorers = cslf_cached_get('/players/topscorers', [
        'league' => $league_id,
        'season' => $season,
    ], 600);

    $topAssists = cslf_cached_get('/players/topassists', [
        'league' => $league_id,
        'season' => $season,
    ], 600);

    $topCards = cslf_cached_get('/players/topyellowcards', [
        'league' => $league_id,
        'season' => $season,
    ], 600);

    return [
        'season'      => $season,
        'top_scorers' => $topScorers['response'] ?? [],
        'top_assists' => $topAssists['response'] ?? [],
        'top_cards'   => $topCards['response'] ?? [],
    ];
}

function cslf_league_api_transfers($league_id, $season = '') {
    $season = cslf_resolve_league_season($league_id, $season);

    $teamsResp = cslf_cached_get('/teams', [
        'league' => $league_id,
        'season' => $season,
    ], 86400);

    $teams = $teamsResp['response'] ?? [];
    $teamIds = [];
    foreach ($teams as $entry) {
        $tid = $entry['team']['id'] ?? null;
        if ($tid && !in_array($tid, $teamIds, true)) {
            $teamIds[] = $tid;
        }
        if (count($teamIds) >= 6) break;
    }

    $transfers = [];
    foreach ($teamIds as $tid) {
        $cacheKey = "transfers_team_{$tid}";
        $transResp = cslf_cached_get('/transfers', [
            'team' => $tid,
        ], 900);
        foreach ($transResp['response'] ?? [] as $transfer) {
            $transfer['team_id'] = $tid;
            $transfers[] = $transfer;
        }
    }

    usort($transfers, function($a, $b) {
        $dateA = strtotime($a['transfers'][0]['date'] ?? '1970-01-01');
        $dateB = strtotime($b['transfers'][0]['date'] ?? '1970-01-01');
        return $dateB <=> $dateA;
    });

    $transfers = array_slice($transfers, 0, 40);

    return [
        'season'    => $season,
        'transfers' => $transfers,
    ];
}

function cslf_league_api_seasons($league_id) {
    $meta = cslf_get_league_meta($league_id);
    $seasons = $meta['seasons'] ?? [];

    $result = [];
    foreach ($seasons as $season) {
        $year = intval($season['year'] ?? 0);
        if ($year < 1888) continue;

        $summary = cslf_get_season_summary($league_id, $year);
        $result[] = [
            'year'       => $year,
            'start'      => $season['start'] ?? '',
            'end'        => $season['end'] ?? '',
            'champion'   => $summary['champion'] ?? null,
            'runner_up'  => $summary['runner_up'] ?? null,
            'current'    => !empty($season['current']),
        ];
    }

    usort($result, function ($a, $b) {
        return $b['year'] <=> $a['year'];
    });

    return [
        'seasons' => $result,
    ];
}

function cslf_get_season_summary($league_id, $season_year) {
    $cache = get_transient("cslf_league_summary_{$league_id}_{$season_year}");
    if ($cache !== false) {
        return $cache;
    }

    $resp = cslf_cached_get('/standings', [
        'league' => $league_id,
        'season' => $season_year,
    ], 86400);

    $summary = [
        'champion'  => null,
        'runner_up' => null,
    ];

    if (!empty($resp['response'][0]['league']['standings'][0])) {
        $table = $resp['response'][0]['league']['standings'][0];
        if (!empty($table[0])) {
            $summary['champion'] = [
                'name' => $table[0]['team']['name'] ?? '',
                'logo' => $table[0]['team']['logo'] ?? '',
                'points' => $table[0]['points'] ?? '',
            ];
        }
        if (!empty($table[1])) {
            $summary['runner_up'] = [
                'name' => $table[1]['team']['name'] ?? '',
                'logo' => $table[1]['team']['logo'] ?? '',
                'points' => $table[1]['points'] ?? '',
            ];
        }
    }

    set_transient("cslf_league_summary_{$league_id}_{$season_year}", $summary, DAY_IN_SECONDS);

    return $summary;
}

function cslf_league_api_team_of_week($league_id, $season = '') {
    $season = cslf_resolve_league_season($league_id, $season);

    $fixturesResp = cslf_cached_get('/fixtures', [
        'league' => $league_id,
        'season' => $season,
        'last'   => 8,
    ], 300);

    $fixtures = $fixturesResp['response'] ?? [];
    if (empty($fixtures)) {
        return [
            'season' => $season,
            'players' => [],
        ];
    }

    $pool = [];
    foreach ($fixtures as $fixture) {
        $fixtureId = $fixture['fixture']['id'] ?? null;
        if (!$fixtureId) continue;
        $playersResp = cslf_cached_get('/fixtures/players', [
            'fixture' => $fixtureId,
        ], 300);

        foreach ($playersResp['response'] ?? [] as $teamEntry) {
            $teamInfo = $teamEntry['team'] ?? [];
            foreach ($teamEntry['players'] ?? [] as $playerEntry) {
                $stats = $playerEntry['statistics'][0] ?? [];
                $rating = floatval($stats['games']['rating'] ?? 0);
                if ($rating <= 0) continue;

                $pool[] = [
                    'player'   => $playerEntry['player'],
                    'stats'    => $stats,
                    'rating'   => $rating,
                    'team'     => $teamInfo,
                    'fixture'  => $fixture,
                ];
            }
        }
    }

    if (empty($pool)) {
        return [
            'season' => $season,
            'players' => [],
        ];
    }

    usort($pool, function ($a, $b) {
        return ($b['rating'] ?? 0) <=> ($a['rating'] ?? 0);
    });

    $formation = [
        'GK' => 1,
        'DF' => 4,
        'MF' => 3,
        'FW' => 3,
    ];
    $selected = [];
    $counts = ['GK' => 0, 'DF' => 0, 'MF' => 0, 'FW' => 0];
    $usedPlayers = [];

    foreach ($pool as $entry) {
        $position = strtoupper($entry['stats']['games']['position'] ?? '');
        $slot = cslf_position_slot($position);
        if (!$slot || !isset($formation[$slot])) continue;
        if ($counts[$slot] >= $formation[$slot]) continue;
        $playerId = $entry['player']['id'] ?? null;
        if ($playerId && isset($usedPlayers[$playerId])) continue;

        $counts[$slot]++;
        if ($playerId) {
            $usedPlayers[$playerId] = true;
        }
        $selected[] = $entry;
        if (count($selected) >= array_sum($formation)) break;
    }

    if (count($selected) < array_sum($formation)) {
        foreach ($pool as $entry) {
            $playerId = $entry['player']['id'] ?? null;
            if ($playerId && isset($usedPlayers[$playerId])) continue;
            $selected[] = $entry;
            if ($playerId) {
                $usedPlayers[$playerId] = true;
            }
            if (count($selected) >= array_sum($formation)) break;
        }
    }

    usort($selected, function ($a, $b) {
        $order = ['GK' => 0, 'DF' => 1, 'MF' => 2, 'FW' => 3];
        $posA = strtoupper($a['stats']['games']['position'] ?? '');
        $posB = strtoupper($b['stats']['games']['position'] ?? '');
        $slotA = $order[cslf_position_slot($posA)] ?? 99;
        $slotB = $order[cslf_position_slot($posB)] ?? 99;
        if ($slotA !== $slotB) {
            return $slotA <=> $slotB;
        }
        $ratingA = $a['rating'] ?? 0;
        $ratingB = $b['rating'] ?? 0;
        return $ratingB <=> $ratingA;
    });

    usort($pool, function ($a, $b) {
        return ($b['rating'] ?? 0) <=> ($a['rating'] ?? 0);
    });

    return [
        'season'  => $season,
        'formation' => $formation,
        'reference' => $fixtures[0] ?? [],
        'players' => $selected,
    ];
}

function cslf_position_slot($position) {
    if (!$position) return null;
    $position = strtoupper($position);
    if (strpos($position, 'G') === 0) return 'GK';
    if (strpos($position, 'D') === 0) return 'DF';
    if (strpos($position, 'M') === 0) return 'MF';
    if (strpos($position, 'F') === 0 || strpos($position, 'S') === 0) return 'FW';
    return null;
}

