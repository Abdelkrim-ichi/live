
(function (w, d, $) {
  "use strict";
  function ready(fn){ if (w.jQuery) fn(); else setTimeout(()=>ready(fn), 50); }

  function ensureEl(tag, parent, className, id){
    var el = d.createElement(tag);
    if (className) el.className = className;
    if (id) el.id = id;
    parent.appendChild(el);
    return el;
  }

  function ensureId(root, id, selectors) {
    var node = d.getElementById(id);
    if (node) return node;
    for (var i=0;i<selectors.length;i++){
      var found = root.querySelector(selectors[i]);
      if (found) { found.id = id; return found; }
    }
    return null;
  }

  ready(function(){
    var root = d.querySelector('.cslf-detail');
    if (!root) return;

    var inst = root.getAttribute('id') || root.getAttribute('data-instance') || '';
    if (!inst) { inst = 'cslf_det_'+Math.random().toString(36).slice(2,10); root.id = inst; }

    // Populate global config if missing
    w.CSLF_DETAIL = w.CSLF_DETAIL || {};
    if (!w.CSLF_DETAIL.instanceId) w.CSLF_DETAIL.instanceId = inst;
    if (!w.CSLF_DETAIL.ajaxurl) { var au = root.getAttribute('data-ajaxurl'); if (au) w.CSLF_DETAIL.ajaxurl = au; }
    if (!w.CSLF_DETAIL.nonce)   { var nz = root.getAttribute('data-nonce');   if (nz) w.CSLF_DETAIL.nonce = nz; }
    if (!w.CSLF_DETAIL.timezone){ var tz = root.getAttribute('data-tz')||'UTC'; w.CSLF_DETAIL.timezone = tz; }

    // === HEADER GUARANTEE ===
    // Ensure header container
    var hdr = root.querySelector('.cslf-hdr') || ensureEl('header', root, 'cslf-hdr');
    // top row
    var hdrTop = hdr.querySelector('.hdr-top') || ensureEl('div', hdr, 'hdr-top');
    // ensure title + last update
    ensureId(hdrTop, inst+'-hdrTitle', ['.hdr-title','[id^="title-"]','[id$="-hdrTitle"]']) || ensureEl('div', hdrTop, 'hdr-title', inst+'-hdrTitle');
    ensureId(hdrTop, inst+'-lastUpdate', ['.hdr-upd','[id^="last-"]','[id$="-lastUpdate"]']) || ensureEl('div', hdrTop, 'hdr-upd', inst+'-lastUpdate');

    // teams row
    var teams = hdr.querySelector('.hdr-teams') || ensureEl('div', hdr, 'hdr-teams');
    // ensure home, score, away
    ensureId(teams, inst+'-homeHead', ['#'+inst+'-homeHead','.team.home','.cslf-team-home','.hdr-teams .team:first-child','.team']) || ensureEl('div', teams, 'team home', inst+'-homeHead');
    ensureId(teams, inst+'-score',    ['#'+inst+'-score','.score','.cslf-score']) || ensureEl('div', teams, 'score', inst+'-score');
    ensureId(teams, inst+'-awayHead', ['#'+inst+'-awayHead','.team.away','.cslf-team-away','.hdr-teams .team:last-child']) || ensureEl('div', teams, 'team away', inst+'-awayHead');

    // meta row
    ensureId(hdr, inst+'-matchInfo', ['#'+inst+'-matchInfo','.hdr-meta','[id^="matchInfo-"]','.cslf-league-head']) || ensureEl('div', hdr, 'hdr-meta', inst+'-matchInfo');

    // === TABS/PANES GUARANTEE ===
    var tabs = ensureId(root, inst+'-tabs', ['#'+inst+'-tabs','.cslf-tabs','.tabs']);
    if (!tabs) {
      tabs = ensureEl('div', root, 'cslf-tabs', inst+'-tabs');
      // minimal 5 tabs (text doesn't matter for logic)
      ['resume','compos','stats','classement','h2h'].forEach(function(t, i){
        var b = ensureEl('button', tabs, 'tablink' + (i===0?' active':''));
        b.setAttribute('data-tab', t);
        b.textContent = t.charAt(0).toUpperCase()+t.slice(1);
      });
    }

    function ensurePane(suffix, sels, title){
      var pid = inst+'-pane-'+suffix;
      var p = ensureId(root, pid, sels);
      if (!p) {
        p = ensureEl('section', root, 'tabpane', pid);
        if (suffix==='resume') p.classList.add('active');
        var h = ensureEl('h4', p, '');
        h.textContent = title || suffix;
        var div = ensureEl('div', p, 'muted');
        div.textContent = 'Chargement…';
      }
    }

    ensurePane('resume',     ['#'+inst+'-pane-resume','[data-pane="resume"]','#resume-'+inst,'.pane.resume'],'Résumé');
    ensurePane('compos',     ['#'+inst+'-pane-compos','[data-pane="compos"]','#compos-'+inst,'.pane.compos'],'Compositions');
    ensurePane('stats',      ['#'+inst+'-pane-stats','[data-pane="stats"]','#stats-'+inst,'.pane.stats'],'Statistiques');
    ensurePane('classement', ['#'+inst+'-pane-classement','[data-pane="classement"]','#stand-'+inst,'.pane.classement'],'Classement');
    ensurePane('h2h',        ['#'+inst+'-pane-h2h','[data-pane="h2h"]','#h2h-'+inst,'.pane.h2h'],'Confrontations');

    // default active pane
    if (!root.querySelector('.tabpane.active')) {
      var pr = d.getElementById(inst+'-pane-resume'); if (pr) pr.classList.add('active');
    }
  });
})(window, document, window.jQuery);

// Ensure center class and data-instance for tabs.js
try { var r=document.querySelector('.cslf-detail'); if(r){ r.classList.add('cslf-center'); if(!r.getAttribute('data-instance')) r.setAttribute('data-instance', r.id); } } catch(e){}


// Fallback tab switching if tabs.js not active
(function(w,d){
  var root = d.querySelector('.cslf-detail');
  if(!root) return;
  var id = root.id;
  var tabs = d.getElementById(id+'-tabs');
  if(!tabs) return;
  if (tabs.getAttribute('data-cslf-twired')) return;
  tabs.setAttribute('data-cslf-twired','1');
  tabs.addEventListener('click', function(e){
    var b = e.target.closest('.tablink'); if(!b) return;
    var tab = b.getAttribute('data-tab');
    ['resume','compos','stats','classement','h2h'].forEach(function(t){
      var pane = d.getElementById(id+'-pane-'+t);
      if (pane) pane.classList.toggle('active', t===tab);
    });
    tabs.querySelectorAll('.tablink').forEach(function(x){
      x.classList.toggle('active', x.getAttribute('data-tab')===tab);
    });
  });
})(window, document);
