(function(w,d,$){
  $(function(){
    d.querySelectorAll('.cslf-center[data-instance]').forEach(function(root){
      var id  = root.getAttribute('data-instance');
      var tabs = d.getElementById(id+'-tabs');
      if (!tabs) return;

      var loaded = { resume:false, stats:false, classement:false, h2h:false, compos:true }; // compos boots itself
      function show(tab){
        ['resume','compos','stats','classement','h2h'].forEach(function(t){
          var pane = d.getElementById(id+'-pane-'+t);
          if (pane) pane.classList.toggle('active', t===tab);
        });
        tabs.querySelectorAll('.tablink').forEach(b=>b.classList.toggle('active', b.dataset.tab===tab));
        alert(tab);
        // lazy-load per pane
        if (tab==='resume' && !loaded.resume && w.CSLF_resume) { w.CSLF_resume.boot(root); loaded.resume=true; }
        if (tab==='stats'  && !loaded.stats  && w.CSLF_stats ) { w.CSLF_stats.boot(root);  loaded.stats =true; }
        if (tab==='classement' && !loaded.classement && w.CSLF_standings){ w.CSLF_standings.boot(root); loaded.classement=true; }
        if (tab==='h2h'   && !loaded.h2h    && w.CSLF_h2h   ){ w.CSLF_h2h.boot(root);    loaded.h2h   =true; }
      }

      tabs.addEventListener('click', function(e){
        var b = e.target.closest('.tablink'); if(!b) return;
        show(b.dataset.tab);

        var url = new URL(window.location);
        url.searchParams.set('tab', b.dataset.tab);
        window.history.replaceState({}, '', url);
            });

      // default boot
      var urlParams = new URLSearchParams(window.location.search);
var defaultTab = urlParams.get('tab') || 'resume';
// Validate tab parameter
if (!['resume','compos','stats','classement','h2h'].includes(defaultTab)) {
  defaultTab = 'resume';
}
show(defaultTab);
    });
  });
})(window,document,window.jQuery);
