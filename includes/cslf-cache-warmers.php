<?php
if (!defined('ABSPATH')) exit;

/** ========= CONFIG (tune to your quota) ========= */
const CSLF_WARM_MAX_HOT_FIXTURES = 1;   // how many opened fixtures we keep hot
const CSLF_TTL_FIXTURES          = 120; // results list TTL (sec)
const CSLF_TTL_EVENTS            = 90;  // detail: events TTL
const CSLF_TTL_STATS             = 90;  // detail: statistics TTL
const CSLF_TTL_PLAYERS           = 600; // detail: players TTL
const CSLF_TTL_LINEUPS           = 3600;// detail: lineups TTL (1 hour)
const CSLF_HOT_FIXTURE_TTL       = 1800; // “interest” pin 30 minutes

/** ========= Schedules ========= */
add_filter('cron_schedules', function($s){
  $s['cslf_every_two_minutes'] = ['interval'=>120, 'display'=>'Every 2 Minutes (CSLF)'];
  return $s;
});

register_activation_hook(__FILE__, function(){
  if (!wp_next_scheduled('cslf_warm_fixtures_minutely')) {
    wp_schedule_event(time()+10, 'cslf_every_two_minutes', 'cslf_warm_fixtures_minutely');
  }
  if (!wp_next_scheduled('cslf_warm_details_minutely')) {
    wp_schedule_event(time()+30, 'cslf_every_two_minutes', 'cslf_warm_details_minutely');
  }
});

register_deactivation_hook(__FILE__, function(){
  wp_clear_scheduled_hook('cslf_warm_fixtures_minutely');
  wp_clear_scheduled_hook('cslf_warm_details_minutely');
});

/** ========= Helpers (use your helpers.php) ========= */
function cslf_opts(){ return function_exists('cslf_get_options') ? cslf_get_options() : []; }
function cslf_tz(){ $o=cslf_opts(); return !empty($o['timezone']) ? $o['timezone'] : 'UTC'; }
function cslf_cache_peek($path, $query){
  // “cached-only”: never fetch, just read the transient key built by helpers.php
  $key = cslf_cache_key($path, $query);
  return get_transient($key); // false if absent/expired
}

/** ========= Hot fixtures (what detail to warm) ========= */
function cslf_hot_list_get(){
  $list = get_transient('cslf_hot_list');
  if (!is_array($list)) $list = [];
  $now = time();
  $list = array_values(array_filter($list, fn($r)=> ($r['exp']??0) > $now));
  // keep a small cap
  if (count($list) > 20) $list = array_slice($list, 0, 20);
  set_transient('cslf_hot_list', $list, CSLF_HOT_FIXTURE_TTL);
  return array_column($list, 'id');
}
function cslf_hot_list_mark($fixtureId){
  $list = get_transient('cslf_hot_list');
  if (!is_array($list)) $list = [];
  $list = array_values(array_filter($list, fn($r)=> (int)$r['id'] !== (int)$fixtureId));
  array_unshift($list, ['id'=>(int)$fixtureId, 'exp'=>time()+CSLF_HOT_FIXTURE_TTL]);
  set_transient('cslf_hot_list', $list, CSLF_HOT_FIXTURE_TTL);
}

/** ========= Cron: warm today’s results ========= */
add_action('cslf_warm_fixtures_minutely', function(){
  if (get_transient('cslf_cron_running')) {
    error_log('CSLF: Skipping fixtures warming - another cron job is running');
    return;
  }
  
  set_transient('cslf_cron_running', true, 60); // Lock for 1 minute
  
  $date = (new DateTime('now', new DateTimeZone(cslf_tz())))->format('Y-m-d');
  // This calls upstream only when transient expired (TTL below)
  cslf_cached_get('fixtures', ['date'=>$date, 'timezone'=>cslf_tz()], CSLF_TTL_FIXTURES);
  
  delete_transient('cslf_cron_running');
});

/** ========= Cron: warm “hot” fixture detail ========= */
add_action('cslf_warm_details_minutely', function(){
  if (get_transient('cslf_details_cron_running')) {
    error_log('CSLF: Skipping details warming - another cron job is running');
    return;
  }
  
  set_transient('cslf_details_cron_running', true, 120); // Lock for 2 minutes
  
  $hot = array_slice(cslf_hot_list_get(), 0, CSLF_WARM_MAX_HOT_FIXTURES);
  if (!$hot) {
    delete_transient('cslf_details_cron_running');
    return;
  }
  
  foreach ($hot as $fxId){
    cslf_cached_get('fixtures/events', ['fixture'=>$fxId], CSLF_TTL_EVENTS);
    sleep(1); // 1 second delay
    
    cslf_cached_get('fixtures/statistics', ['fixture'=>$fxId], CSLF_TTL_STATS);
    sleep(1); // 1 second delay
    
    cslf_cached_get('fixtures/players', ['fixture'=>$fxId], CSLF_TTL_PLAYERS);
    sleep(1); // 1 second delay

    // Lineups are slow-changing: only refresh if missing/stale
    if (false === cslf_cache_peek('fixtures/lineups', ['fixture'=>$fxId])) {
      cslf_cached_get('fixtures/lineups', ['fixture'=>$fxId], CSLF_TTL_LINEUPS);
    }
  }
  
  delete_transient('cslf_details_cron_running');
});

/** ========= AJAX: mark interest (called by detail page once) ========= */
add_action('wp_ajax_cslf_mark_interest', function(){
  check_ajax_referer('cslf_nonce','_wpnonce');
  $id = isset($_POST['fixture']) ? (int)$_POST['fixture'] : 0;
  if (!$id) wp_send_json_error(['msg'=>'bad id']);
  cslf_hot_list_mark($id);
  wp_send_json_success(['ok'=>1]);
});

/**
 * ========= AJAX: cached-only reader =========
 * Returns cached JSON if present; NEVER triggers an upstream fetch.
 * Your front-end can poll this every 20/60s safely.
 */
add_action('wp_ajax_cslf_cached', 'cslf_ajax_cached');
add_action('wp_ajax_nopriv_cslf_cached', 'cslf_ajax_cached');
function cslf_ajax_cached(){
  check_ajax_referer('cslf_nonce','_wpnonce');
  $path  = sanitize_text_field($_POST['path']  ?? '');
  $query = $_POST['query'] ?? [];
  if (is_string($query)) parse_str($query, $query);
  if (!$path || !is_array($query)) wp_send_json_error(['msg'=>'bad params']);

  $cached = cslf_cache_peek($path, $query);
  $resp   = is_array($cached) ? ($cached['response'] ?? []) : [];
  wp_send_json_success(['cached'=> (bool)$cached, 'response'=>$resp]);
}
