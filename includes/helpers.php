<?php
// Simple rate limiter
if (!function_exists('cslf_rate_key')) {
  function cslf_rate_key($scope='ajax'){ $ip = $_SERVER['REMOTE_ADDR'] ?? 'cli'; return 'cslf_rl_'.md5($ip.'|'.$scope); }
}
if (!function_exists('cslf_check_rate_limit')) {
  function cslf_check_rate_limit($scope='ajax',$limit=5,$window=1){
    $key = cslf_rate_key($scope); $b = get_transient($key); $now=time();
    if(!is_array($b)||!isset($b['ts'],$b['count'])) $b=['ts'=>$now,'count'=>0];
    if($now-$b['ts'] >= $window) $b=['ts'=>$now,'count'=>0];
    if($b['count'] >= $limit){ set_transient($key,$b,max(1,$window-($now-$b['ts']))); return false; }
    $b['count']++; set_transient($key,$b,$window); return true;
  }
}

if (!defined('ABSPATH')) exit;

if (!defined('CSLF_API_BASE')) define('CSLF_API_BASE', 'https://v3.football.api-sports.io');
if (!defined('CSLF_DAILY_QUOTA')) define('CSLF_DAILY_QUOTA', 7000);

function cslf_quota_option_key() {
    return 'cslf_quota_state';
}

function cslf_quota_get_state() {
    $state = get_option(cslf_quota_option_key(), []);
    if (!is_array($state)) {
        $state = [];
    }
    $today = current_time('Y-m-d');
    if (!isset($state['date']) || $state['date'] !== $today) {
        $state = [
            'date'  => $today,
            'count' => 0,
            'log'   => [],
        ];
        update_option(cslf_quota_option_key(), $state, false);
    }
    return $state;
}

function cslf_quota_store_state(array $state) {
    update_option(cslf_quota_option_key(), $state, false);
}

function cslf_quota_remaining() {
    $state = cslf_quota_get_state();
    $used = isset($state['count']) ? (int)$state['count'] : 0;
    $remaining = (int)CSLF_DAILY_QUOTA - $used;
    return $remaining > 0 ? $remaining : 0;
}

function cslf_quota_reserve($endpoint, $cost = 1) {
    $cost = max(1, (int)$cost);
    $state = cslf_quota_get_state();
    $used = isset($state['count']) ? (int)$state['count'] : 0;
    if ($used + $cost > (int)CSLF_DAILY_QUOTA) {
        return false;
    }
    $state['count'] = $used + $cost;
    $key = sanitize_key(str_replace('/', '_', $endpoint));
    if (!isset($state['log']) || !is_array($state['log'])) {
        $state['log'] = [];
    }
    $allowed_tracking = [
        'fixtures/events',
        'fixtures/lineups',
    ];

    if (!in_array($endpoint, $allowed_tracking, true)) {
        $state['log'][$key] = isset($state['log'][$key]) ? (int)$state['log'][$key] + $cost : $cost;
        cslf_quota_store_state($state);
    }
    return true;
}

/**
 * Get plugin options merged with defaults.
 */
function cslf_get_options() {
    $defaults = cslf_default_options();
    $opts = get_option(CSLF_OPTION_KEY, []);
    if (!is_array($opts)) $opts = [];
    return array_merge($defaults, $opts);
}

/**
 * Build a cache key.
 */
function cslf_cache_key($prefix, $params = []) {
    if (is_array($params)) ksort($params);
    return 'cslf_' . sanitize_key($prefix) . '_' . md5(wp_json_encode($params));
}

function cslf_get_league_priorities() {
    return [
        // Botola (Morocco)
        'botola' => ['priority' => 1, 'leagues' => [200]], // Botola Pro
        
        // Champions League Africa
        'champions_africa' => ['priority' => 2, 'leagues' => [12]], // CAF Champions League
        
        // UEFA competitions
        'uefa' => ['priority' => 3, 'leagues' => [2, 3, 848]], // Champions League, Europa League, Conference League
        
        // Africa Cup
        'africa_cup' => ['priority' => 4, 'leagues' => [15]], // Africa Cup of Nations
        
        // European National Cups
        'euro_cups' => ['priority' => 5, 'leagues' => [
            1, 65, 66, 67, 68, 69, 70, 71, 72, 73, 74, 75, 76, 77, 79, 80, 81
        ]],
        
        // Big-5 European Leagues
        'big5' => ['priority' => 6, 'leagues' => [
            39, // Premier League
            140, // La Liga
            61, // Ligue 1
            135, // Serie A
            78  // Bundesliga
        ]],
        
        // Continental competitions (lower priority)
        'continental' => ['priority' => 7, 'leagues' => [
            13, 14, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30
        ]]
    ];
}

function cslf_sort_fixtures_by_league_priority($fixtures) {
    if (!is_array($fixtures) || empty($fixtures)) {
        return $fixtures;
    }
    
    // Simple priority mapping
    $league_priorities = [
        200 => 1, // Botola
        12 => 2,  // CAF Champions League
        2 => 3, 3 => 3, 848 => 3, // UEFA
        15 => 4,  // Africa Cup
        39 => 5, 140 => 5, 61 => 5, 135 => 5, 78 => 5 // Big-5
    ];
    
    // Simple sorting without complex logic
    usort($fixtures, function($a, $b) use ($league_priorities) {
        $league_a = 999;
        $league_b = 999;
        
        if (isset($a['league']['id'])) {
            $league_a = isset($league_priorities[$a['league']['id']]) ? $league_priorities[$a['league']['id']] : 999;
        }
        
        if (isset($b['league']['id'])) {
            $league_b = isset($league_priorities[$b['league']['id']]) ? $league_priorities[$b['league']['id']] : 999;
        }
        
        return $league_a - $league_b;
    });
    
    return $fixtures;
}

function cslf_cached_get($path, $query = [], $ttl = null) {
    $opts    = cslf_get_options();
    $api_key = isset($opts['api_key']) ? $opts['api_key'] : '';
    if (empty($api_key)) return ['ok'=>false,'error'=>'Missing API key'];

    $p = ltrim($path, '/');
    $tz   = function_exists('wp_timezone') ? wp_timezone() : new DateTimeZone('Africa/Casablanca');
    $h    = (int)(new DateTime('now',$tz))->format('G');
    if ($ttl === null) $ttl = ($h>=12 && $h<=23) ? 120 : 300;

    $cacheKey = 'cslf_' . md5($p.'|'.wp_json_encode($query));
    $staleKey = $cacheKey.'_stale';
    $lockKey  = $cacheKey.'_lock';

    $cached = get_transient($cacheKey);
    if ($cached !== false) return $cached;

    $last = (int)get_transient($lockKey);
    if ($last && $last > (time()-20)) { $stale = get_option($staleKey,false); if($stale!==false) return $stale; }
    set_transient($lockKey, time(), 20);

    $base = trailingslashit(CSLF_API_BASE);
    $url  = add_query_arg($query, $base.$p);
    $disabled_paths = ['fixtures/events', 'fixtures/lineups'];
    if (in_array($p, $disabled_paths, true)) {
        delete_transient($lockKey);
        return ['ok'=>false,'error'=>'Endpoint disabled temporarily'];
    }

    if (!cslf_quota_reserve($p)) {
        delete_transient($lockKey);
        $stale = get_option($staleKey,false);
        return $stale!==false ? $stale : ['ok'=>false,'error'=>'Daily quota exceeded'];
    }

    $resp = wp_remote_get($url, ['timeout'=>15,'headers'=>['x-apisports-key'=>$api_key,'Accept'=>'application/json']]);
    if (is_wp_error($resp)) { $stale=get_option($staleKey,false); return $stale!==false?$stale:['ok'=>false,'error'=>'HTTP Error: '.$resp->get_error_message()]; }

    $code = wp_remote_retrieve_response_code($resp);
    $body = json_decode(wp_remote_retrieve_body($resp), true);

    if ($code>=200 && $code<300 && is_array($body)) {
        if ($p==='fixtures' && !empty($body['response']) && function_exists('cslf_sort_fixtures_by_league_priority')) {
            $body['response'] = cslf_sort_fixtures_by_league_priority($body['response']);
        }
        set_transient($cacheKey, $body, (int)$ttl);
        update_option($staleKey, $body, false);
        return $body;
    }
    $stale = get_option($staleKey,false);
    return $stale!==false ? $stale : ['ok'=>false,'error'=>'API Error: '.$code];
}

add_action('cslf_background_refresh', 'cslf_background_refresh_callback', 10, 3);
function cslf_background_refresh_callback($path, $query, $ttl) {
    // Refresh cache in background without blocking user requests
    cslf_cached_get($path, $query, $ttl);
}

function cslf_clear_plugin_cache() {
    global $wpdb;
    
    try {
        // Clear transients with our prefix
        $result = $wpdb->query(
            $wpdb->prepare(
                "DELETE FROM {$wpdb->options} WHERE option_name LIKE %s OR option_name LIKE %s OR option_name LIKE %s",
                '_transient_cslf_%',
                '_transient_timeout_cslf_%',
                '_transient_cslf_%_stale'
            )
        );
        
        // Clear object cache if available
        if (function_exists('wp_cache_flush_group')) {
            wp_cache_flush_group('cslf');
        }
        
        if (function_exists('wp_cache_delete_multiple')) {
            // This is more efficient for newer WordPress versions
            wp_cache_flush();
        }
        
        return $result !== false;
    } catch (Exception $e) {
        error_log('CSLF Cache Clear Error: ' . $e->getMessage());
        return false;
    }
}

function cslf_get_cache_stats() {
    global $wpdb;
    
    try {
        $count = $wpdb->get_var(
            $wpdb->prepare(
                "SELECT COUNT(*) FROM {$wpdb->options} WHERE option_name LIKE %s",
                '_transient_cslf_%'
            )
        );
        
        $stale_count = $wpdb->get_var(
            $wpdb->prepare(
                "SELECT COUNT(*) FROM {$wpdb->options} WHERE option_name LIKE %s",
                '_transient_cslf_%_stale'
            )
        );
        
        return [
            'cached_items' => (int)$count,
            'stale_items' => (int)$stale_count,
            'cache_prefix' => 'cslf_'
        ];
    } catch (Exception $e) {
        error_log('CSLF Cache Stats Error: ' . $e->getMessage());
        return [
            'cached_items' => 0,
            'stale_items' => 0,
            'cache_prefix' => 'cslf_',
            'error' => $e->getMessage()
        ];
    }
}

function cslf_validate_api_key($api_key) {
    if (empty($api_key)) {
        return false;
    }
    
    // Basic validation - API-Football keys are typically 32 characters
    if (strlen($api_key) < 20 || strlen($api_key) > 64) {
        return false;
    }
    
    // Should contain only alphanumeric characters and possibly hyphens
    if (!preg_match('/^[a-zA-Z0-9\-_]+$/', $api_key)) {
        return false;
    }
    
    return true;
}

if (!function_exists('cslf_enqueue_select2_assets')) {
  function cslf_enqueue_select2_assets() {
    static $enqueued = false;
    if ($enqueued) {
      return;
    }
    $enqueued = true;

    $local_js  = CSLF_URL . 'public/vendor/select2/select2.min.js';
    $local_css = CSLF_URL . 'public/vendor/select2/select2.min.css';

    wp_enqueue_style('cslf-select2', $local_css, [], CSLF_VERSION);

    if (!wp_script_is('cslf-select2', 'registered')) {
      wp_register_script('cslf-select2', $local_js, ['jquery'], CSLF_VERSION, true);
    }

    wp_enqueue_script('cslf-select2');
  }
}

if (!function_exists('cslf_norm')) {
  function cslf_norm($s){ $s = is_string($s)?$s:''; $s = iconv('UTF-8','ASCII//TRANSLIT//IGNORE',$s); return strtolower(trim($s)); }
}
if (!function_exists('cslf_has')) {
  function cslf_has($txt, array $terms){ $t = cslf_norm($txt); foreach($terms as $k){ if($t!=='' && strpos($t, cslf_norm($k))!==false) return true; } return false; }
}

// === Priority per rules (v1.3.0) ===
if (!function_exists('cslf_involves_barca_real')) {
  function cslf_involves_barca_real($home,$away){
    $h=cslf_norm($home); $a=cslf_norm($away);
    foreach(['barcelona','fc barcelona','barca','real madrid'] as $k){ if(strpos($h,$k)!==false||strpos($a,$k)!==false) return true; }
    return false;
  }
}
if (!function_exists('cslf_is_morocco_team')) {
  function cslf_is_morocco_team($n){ return cslf_has($n, ['morocco','maroc','المغرب']); }
}
if (!function_exists('cslf_is_moroccan_club')) {
  function cslf_is_moroccan_club($n){
    return cslf_has($n, ['wydad','raja','fath','fus','as far','asfar','rs berkane','berkane','maghreb fes','hassania','difaa','ock khouribga','mat tetouan','tetouan','youssoufia berrechid','rabat','casablanca','tanger','agadir','safi']);
  }
}
if (!function_exists('cslf_priority_key')) {
  function cslf_priority_key($m){
    $L = $m['league'] ?? []; $id = (int)($L['id'] ?? 0); $name = $L['name'] ?? '';
    $home = $m['teams']['home']['name'] ?? ''; $away = $m['teams']['away']['name'] ?? '';

    if (cslf_is_morocco_team($home)||cslf_is_morocco_team($away)) return [0,0];
    if ($id===200 || cslf_has($name,['botola','inwi','البطولة'])) return [1,0];
    if ($id===822 || cslf_has($name,['coupe du trone','coupe du trône','coupe maroc'])) return [1,1];
    if (cslf_has($name,['supercoupe du maroc','super coupe maroc'])) return [1,2];
    if (in_array($id,[4,5],true)) return [2,0];
    if (in_array($id,[2,3,848,531,525,743,1040],true)) return [3,0];
    if (in_array($id,[140,39,135,78,61],true)){
      if ($id===140 && cslf_involves_barca_real($home,$away)) return [4,0];
      if ($id===39)  return [4,1];
      if ($id===140) return [4,2];
      if ($id===135) return [4,3];
      if ($id===78)  return [4,4];
      if ($id===61)  return [4,5];
    }
    if (in_array($id,[6,19,1163],true)) return [5,0];
    if (in_array($id,[12,20,533,1043,1164],true)) return [6,0];
    if ($id===768) return [7, (cslf_is_moroccan_club($home)||cslf_is_moroccan_club($away)) ? 0 : 1];
    if ($id===860) return [7,2];
    if ($id===307) return [8,0];
    if (in_array($id,[9,13,11],true)) return [9,0];
    if (in_array($id,[7,35,18],true)) return [10,0];
    if (in_array($id,[22,16,536],true)) return [11,0];
    if ($id===27) return [12,0];
    return [99,0];
  }
}
if (!function_exists('cslf_sort_fixtures_by_league_priority')) {
  function cslf_sort_fixtures_by_league_priority(array $fixtures): array {
    usort($fixtures, function($a,$b){
      $pa = cslf_priority_key($a); $pb = cslf_priority_key($b);
      if ($pa[0] !== $pb[0]) return $pa[0] <=> $pb[0];
      if ($pa[1] !== $pb[1]) return $pa[1] <=> $pb[1];
      $na = cslf_norm($a['league']['name'] ?? ''); $nb = cslf_norm($b['league']['name'] ?? '');
      if ($na !== $nb) return $na < $nb ? -1 : 1;
      $da = strtotime($a['fixture']['date'] ?? 'now'); $db = strtotime($b['fixture']['date'] ?? 'now');
      return $da <=> $db;
    });
    return $fixtures;
  }
}
