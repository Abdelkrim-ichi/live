(function(w,d,$){
  $(function(){
    d.querySelectorAll('.cslf-center[data-instance]').forEach(function(root){
      var id   = root.getAttribute('data-instance');
      var tabs = root.querySelector('.cslf-tabs');
      if (!tabs) return;

      // ---------- Mobile sticky with scroll-container support ----------
      var lastMobile = null, spacer = null, sentinel = null, io = null, scrollParent = null;

      function isMobile(){ return w.innerWidth <= 768; }

      function getScrollParent(el){
        var cur = el.parentElement;
        while (cur && cur !== d.body){
          var cs = w.getComputedStyle(cur);
          if (/(auto|scroll|overlay)/i.test(cs.overflowY)) return cur;
          cur = cur.parentElement;
        }
        return null; // means window scrolls
      }

      function enableSticky(){
        // create sentinel (detects when tabs hit top)
        if (!sentinel){
          sentinel = d.createElement('div');
          sentinel.style.cssText = 'height:0;margin:0;padding:0;';
          tabs.parentNode.insertBefore(sentinel, tabs);
        }
        // spacer to avoid layout jump when pinning
        if (!spacer){
          spacer = d.createElement('div');
          spacer.style.cssText = 'height:0;transition:height .15s ease;';
          tabs.parentNode.insertBefore(spacer, tabs);
        }

        scrollParent = getScrollParent(tabs);

        // Clean previous observer
        if (io){ io.disconnect(); io = null; }

        // Observe sentinel relative to the scroll root (container or viewport)
        io = new IntersectionObserver(function(entries){
          var e = entries[0];
          var hitTop = (e.intersectionRatio === 0 || e.boundingClientRect.top <= 0);

          if (hitTop){
            if (!tabs.classList.contains('mobile-sticky')){
              tabs.classList.add('mobile-sticky');
              spacer.style.height = tabs.offsetHeight + 'px';

              // choose pinning mode: fixed for window, sticky for container
              if (scrollParent){
                // inside scrolling container -> sticky
                tabs.style.position = 'sticky';
                tabs.style.top = '0';
                tabs.style.left = '';
                tabs.style.right = '';
                tabs.style.zIndex = '1000';
              } else {
                // window scroll -> fixed
                tabs.style.position = 'fixed';
                tabs.style.top = '0';
                tabs.style.left = '0';
                tabs.style.right = '0';
                tabs.style.zIndex = '1000';
              }
            }
          } else {
            if (tabs.classList.contains('mobile-sticky')){
              tabs.classList.remove('mobile-sticky');
              spacer.style.height = '0px';
              // reset inline pin styles
              tabs.style.position = '';
              tabs.style.top = '';
              tabs.style.left = '';
              tabs.style.right = '';
              tabs.style.zIndex = '';
            }
          }
        }, {
          root: scrollParent || null,   // null = viewport
          threshold: [0,1]
        });

        io.observe(sentinel);

        // initial check after layout settles
        setTimeout(function(){
          spacer.style.height = '0px';
          // force a cycle: disconnect/observe to trigger callback
          io.disconnect(); io.observe(sentinel);
        }, 0);
      }

      function disableSticky(){
        if (io){ io.disconnect(); io = null; }
        if (tabs){
          tabs.classList.remove('mobile-sticky');
          tabs.style.position = '';
          tabs.style.top = '';
          tabs.style.left = '';
          tabs.style.right = '';
          tabs.style.zIndex = '';
        }
        if (spacer && spacer.parentNode) spacer.parentNode.removeChild(spacer);
        if (sentinel && sentinel.parentNode) sentinel.parentNode.removeChild(sentinel);
        spacer = sentinel = null;
      }

      function syncSticky(){
        var m = isMobile();
        if (m !== lastMobile){
          lastMobile = m;
          if (m) enableSticky();
          else   disableSticky();
        } else if (m){
          // re-measure on resize/orientation/font loads
          if (spacer) spacer.style.height = '0px';
          if (io && sentinel){ io.disconnect(); io.observe(sentinel); }
        }
      }

      // init
      syncSticky();
      w.addEventListener('resize', syncSticky, {passive:true});
      w.addEventListener('orientationchange', syncSticky, {passive:true});

      // ---------- your existing tabs logic stays the same ----------
      var loaded = { resume:false, stats:false, classement:false, h2h:false, compos:true };
      function show(tab){
        ['resume','compos','stats','classement','h2h'].forEach(function(t){
          var pane = d.getElementById(id+'-pane-'+t);
          if (pane) pane.classList.toggle('active', t===tab);
        });
        tabs.querySelectorAll('.tablink').forEach(function(b){
          b.classList.toggle('active', b.dataset.tab===tab);
        });
        if (tab==='resume' && !loaded.resume && w.CSLF_resume) { w.CSLF_resume.boot(root); loaded.resume=true; }
        if (tab==='stats'  && !loaded.stats  && w.CSLF_stats ) { w.CSLF_stats.boot(root);  loaded.stats =true; }
        if (tab==='classement' && !loaded.classement && w.CSLF_standings){ w.CSLF_standings.boot(root); loaded.classement=true; }
        if (tab==='h2h'   && !loaded.h2h    && w.CSLF_h2h   ){ w.CSLF_h2h.boot(root);    loaded.h2h   =true; }
      }

      tabs.addEventListener('click', function(e){
        var b = e.target.closest('.tablink'); if(!b) return;
        show(b.dataset.tab);
        var url = new URL(w.location);
        url.searchParams.set('tab', b.dataset.tab);
        w.history.replaceState({}, '', url);
      });

      var urlParams = new URLSearchParams(w.location.search);
      var defaultTab = urlParams.get('tab') || 'resume';
      if (!['resume','compos','stats','classement','h2h'].includes(defaultTab)) defaultTab = 'resume';
      show(defaultTab);
    });
  });
})(window,document,window.jQuery);
