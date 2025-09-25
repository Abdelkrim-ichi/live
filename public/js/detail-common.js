
(function (w, d) {
  "use strict";

  function ready(fn){ if(w.jQuery){ fn(w.jQuery); } else { setTimeout(()=>ready(fn),50); } }

  function resolveAjaxUrl(){
    var u = (w.CSLF_DETAIL && w.CSLF_DETAIL.ajaxurl) || '';
    if (!u || !/admin-ajax\.php(\?.*)?$/.test(u)) {
      // last-resort fallback
      u = '/wp-admin/admin-ajax.php';
    }
    return u;
  }

  async function refreshNonce(){
    try{
      const ajaxUrl = resolveAjaxUrl();
      const r = await fetch(ajaxUrl + '?action=lf_get_nonce', { credentials: 'same-origin' });
      if(!r.ok) return false;
      const j = await r.json();
      if(j && j.nonce){
        w.CSLF_DETAIL = w.CSLF_DETAIL || {};
        w.CSLF_DETAIL.nonce = j.nonce;
        return true;
      }
    }catch(e){}
    return false;
  }

  ready(($)=>{
    const C = w.CSLF_DETAIL || {};
    if(!C || !C.ajaxurl || !C.nonce){
    }

    w.CSLF = w.CSLF || {};
    var NS = w.CSLF.DetailCommon = {
      fromNode(root){
        var id    = root.getAttribute('id') || root.getAttribute('data-instance');
        var ajax  = resolveAjaxUrl(); // force admin-ajax.php
        var nonce = (w.CSLF_DETAIL && w.CSLF_DETAIL.nonce) || '';
        var tz    = root.getAttribute('data-tz') || 'UTC';
        var byId  = (s)=> d.getElementById(id + s);
        return { id, ajax, nonce, tz, root, byId };
      },

      emit(inst, name, detail){ inst.root.dispatchEvent(new CustomEvent('cslf:'+name, { detail })); },
      on(inst, name, handler){ inst.root.addEventListener('cslf:'+name, handler); },

      esc(s){ return (s==null?'':String(s)).replace(/[&<>"']/g, (c)=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); },
      fmtTime(iso, tz){ try{ return new Date(iso).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit', timeZone: tz}); }catch(e){ return ''; } },
      fmtDate(iso, tz){ try{ return new Date(iso).toLocaleDateString([], {year:'numeric',month:'short',day:'2-digit', timeZone: tz}); }catch(e){ return ''; } },
      liveTxt(s){ var m={ "1H":"1re","2H":"2e","HT":"Mi-temps","ET":"Prol.","P":"Tab","FT":"Fin","NS":"À venir" }; return m[s] || s || ""; },
      isLive(short){ return ["1H","HT","2H","ET","BT","P"].includes(String(short||"").toUpperCase()); },
      toNum(v){ if(v==null) return 0; if(typeof v==='string') return parseFloat(v.replace('%',''))||0; return v; },
      val(v,f){ return (v==null? f : v); },

      proxy(inst, path, query){
        const ajaxUrl = resolveAjaxUrl();
        const payload = {
          action: 'cslf_api',
          _wpnonce: (w.CSLF_DETAIL && w.CSLF_DETAIL.nonce) || inst.nonce || '',
          endpoint: 'proxy',
          path, query
        };

        // helper retry function
        function doAjax(p){
          return jQuery.ajax({ url: ajaxUrl, method:'POST', dataType:'json', timeout:15000, data: p });
        }

        return doAjax(payload).then(async (resp, _textStatus, xhr) => {
          // Some servers return 200 with {success:false, message:'Invalid nonce'}
          if (resp && resp.success === false) {
            var msg = (resp.data && (resp.data.message || resp.data)) || resp.message;
            if (msg && String(msg).toLowerCase().indexOf('invalid nonce') !== -1) {
              const ok = await refreshNonce();
              if (ok) {
                payload._wpnonce = (w.CSLF_DETAIL && w.CSLF_DETAIL.nonce) || '';
                return doAjax(payload);
              }
            }
          }
          // If server dumped plain "0" (invalid action), fallback to cslf_api once
          if (resp === 0 || resp === "0") {
            const fallback = Object.assign({}, payload, { action: 'cslf_api' });
            return doAjax(fallback);
          }
          return resp;
        }, async (xhr) => {
          // HTTP error path
          if (xhr && (xhr.status === 403 || (xhr.responseText||'').toLowerCase().indexOf('invalid nonce') !== -1)) {
            const ok = await refreshNonce();
            if (ok) {
              payload._wpnonce = (w.CSLF_DETAIL && w.CSLF_DETAIL.nonce) || '';
              return doAjax(payload);
            }
          }
          return jQuery.Deferred().reject(xhr).promise();
        });
      },

      getList(inst, path, query){
        return NS.proxy(inst, path, query).then(
          (p)=> {
            return (p && p.success && p.data && Array.isArray(p.data.response)) ? p.data.response : [];
          },
          (err)=> {
            return [];
          }
        );
      },
    };
  });
})(window, document);
