(function(w,d,$){
  function ready(fn){ if ($) fn(); else setTimeout(()=>ready(fn),50); }
  ready(function(){
    const C = w.CSLF_DETAIL||{};
    const root = $('#'+C.instanceId);
    const TZ   = C.timezone || 'UTC';

    const qs = new URLSearchParams(location.search);
    const FIXTURE_ID = parseInt(qs.get('fixture'),10);

    const el = (id)=> root.find('#'+id)[0];

    function api(path, query){
      return $.ajax({
        url: C.ajaxurl, method:'POST', dataType:'json', timeout:15000,
        data: { action:'cslf_api', endpoint:'proxy', _wpnonce:C.nonce, path, query }
      });
    }
    function get(path, query){
      return api(path, query).then(p => (p && p.success && Array.isArray(p.data?.response)) ? p.data.response : []);
    }

    if(!FIXTURE_ID){ root.find('.cslf-bad').text("Aucun fixture fourni").show(); return; }

    // Tabs
    root.find('.cslf-tabs button').on('click', function(){
      root.find('.cslf-tabs button').removeClass('is-active'); $(this).addClass('is-active');
      const t = $(this).data('tab');
      root.find('.cslf-pane').removeClass('is-active');
      root.find(`.cslf-pane[data-pane="${t}"]`).addClass('is-active');
      if(t==='classement') loadStandings(activeStand);
      if(t==='h2h')        loadH2H();
      if(t==='stats')      renderStatsTable(LOCAL.stats||[]);
    });

    // Standings filter
    let activeStand='all';
    root.find('.cslf-stand-filters .pill').on('click', function(){
      root.find('.cslf-stand-filters .pill').removeClass('is-active'); $(this).addClass('is-active');
      activeStand = $(this).data('stand'); loadStandings(activeStand);
    });

    // H2H filters
    let H2H_HOME=false, H2H_COMP=false;
    root.find('.cslf-h2h-filters .pill').on('click', function(){
      $(this).toggleClass('is-active');
      const k=$(this).data('h2h');
      if(k==='home') H2H_HOME = $(this).hasClass('is-active');
      if(k==='comp') H2H_COMP = $(this).hasClass('is-active');
      if(LOCAL.fx) renderH2H(LOCAL.h2h||[], LOCAL.fx);
    });

    // Helpers
    function setLast(){ root.find('#last-'+C.instanceId).text("Dernière MAJ : " + new Date().toLocaleTimeString([], {timeZone: TZ})); }
    function t(iso){ try{return new Date(iso).toLocaleString([], {hour:'2-digit',minute:'2-digit', timeZone: TZ});}catch(e){return '';} }
    function num(v){ if(v==null) return 0; if(typeof v==='string') return parseFloat(v.replace('%',''))||0; return v; }
    function getStatVal(block, keys){ if(!block||!block.statistics) return null; for(const k of keys){const r=block.statistics.find(s=>(s.type||'').toLowerCase()===k.toLowerCase()); if(r) return r.value;} return null; }

    function parseFormation(f){ if(!f) return [4,4,2]; return f.split('-').map(n=>parseInt(n,10)).filter(Boolean); }
    function layout(team, isHome){
      const rowsDef=parseFormation(team.formation); const XI=(team.startXI||[]).map(p=>p.player).slice(0,11);
      const coords=[]; const rows=rowsDef.length+1; const padX=6, padY=8; let idx=0;
      const yGK=isHome?(100-padY):padY; const xGK=isHome?padX:(100-padX); if(XI[idx]) coords.push({x:xGK,y:yGK,p:XI[idx]}); idx++;
      for(let r=0;r<rowsDef.length;r++){ const count=rowsDef[r]; const slot=isHome?(rows-2-r):(1+r); const y=padY+((100-2*padY)/(rows-1))*slot;
        for(let c=0;c<count;c++){ const xRaw=(count===1)?50: padX+((100-2*padX)/(count-1))*c; const x=isHome?xRaw:(100-xRaw);
          if(XI[idx]) coords.push({x,y,p:XI[idx]}); idx++; } }
      return coords;
    }
    function addNode(pitch,x,y,label,name,mini=false){
      const dEl = d.createElement('div'); dEl.className = mini?'player-mini':'player'; dEl.style.left=x+'%'; dEl.style.top=y+'%';
      dEl.innerHTML = `<div class="${mini?'dot-mini':'dot'}">${label||''}</div><div class="${mini?'pname-mini':'pname'}" title="${name||''}">${name||''}</div>`;
      pitch.appendChild(dEl);
    }

    function renderHeader(FX){
      const m=FX[0]; if(!m) return;
      const home=m.teams.home, away=m.teams.away, st=m.fixture.status;
      const live = st.short && !['NS','FT'].includes(st.short);
      const title = `
        ${ live ? `<span class="badge">LIVE ${st.elapsed!=null?`${st.elapsed}'`:''}</span>` : '' }
        <span class="chip">${m.league.name}</span>
        <span class="chip">${m.league.round||''}</span>
        <span class="chip">${t(m.fixture.date)}</span>
        <span style="margin-left:8px;font-weight:800">${home.name} ${m.goals.home??'-'}–${m.goals.away??'-'} ${away.name}</span>`;
      root.find('#title-'+C.instanceId).html(title);
      root.find('#hh-'+C.instanceId).html(`${home.logo?`<img src="${home.logo}" alt="">`:''} ${home.name}`);
      root.find('#ah-'+C.instanceId).html(`${away.logo?`<img src="${away.logo}" alt="">`:''} ${away.name}`);
    }

    function renderTopStats(stats){
      const A=stats[0]||{}, B=stats[1]||{};
      const posA=num(getStatVal(A,["Ball Possession","Possession"])); const posB= num(getStatVal(B,["Ball Possession","Possession"])) || (100-posA);
      root.find('#posH-'+C.instanceId).css('width',`${posA||50}%`).text(`${posA||50}%`);
      root.find('#posA-'+C.instanceId).text(`${posB||50}%`);
      const xgA=num(getStatVal(A,["Expected Goals (xG)","Expected goals (xG)","xG"])); const xgB=num(getStatVal(B,["Expected Goals (xG)","Expected goals (xG)","xG"]));
      root.find('#xgH-'+C.instanceId).text(isFinite(xgA)?xgA.toFixed(2):'0.00'); root.find('#xgA-'+C.instanceId).text(isFinite(xgB)?xgB.toFixed(2):'0.00');
      const shA=num(getStatVal(A,["Total Shots","Total shots"])); const shB=num(getStatVal(B,["Total Shots","Total shots"]));
      root.find('#shH-'+C.instanceId).text(shA||0); root.find('#shA-'+C.instanceId).text(shB||0);
      const bcA=num(getStatVal(A,["Big Chances","Big chances"])); const bcB=num(getStatVal(B,["Big Chances","Big chances"]));
      root.find('#bcH-'+C.instanceId).text(bcA||0); root.find('#bcA-'+C.instanceId).text(bcB||0);
    }

    function renderEvents(list){
      const box = root.find('#events-'+C.instanceId); if(!list?.length){ box.html("<div class='muted'>Aucun événement</div>"); return; }
      box.html(list.map(e=>{
        const tm = e.time?.elapsed!=null?`${e.time.elapsed}'`:'';
        const tp = [e.type, e.detail].filter(Boolean).join(' • ');
        return `<div class="cslf-event"><div class="min">${tm}</div><div><div style="font-weight:700">${tp}</div><div class="muted">${e.team?.name||''} — ${e.player?.name||''}</div></div></div>`;
      }).join(''));
    }
    function renderMiniEvents(list){
      const box = root.find('#mini-'+C.instanceId);
      if(!list?.length){ box.html("<div class='muted'>—</div>"); return; }
      box.html(list.slice(-5).reverse().map(e=>{
        const tm = e.time?.elapsed!=null?`${e.time.elapsed}'`:'';
        const tp = [e.type, e.detail].filter(Boolean).join(' • ');
        return `<div class="cslf-event"><div class="min">${tm}</div><div>${tp} <span class="muted">— ${e.team?.name||''}</span></div></div>`;
      }).join(''));
    }
    function renderSubs(list){
      const box = root.find('#subs-'+C.instanceId);
      const subs = (list||[]).filter(e => (e.type||'').toLowerCase()==='subst' || (e.detail||'').toLowerCase().includes('subst'));
      if(!subs.length){ box.html('—'); return; }
      box.html(subs.slice().reverse().map(s=>{
        const tm=s.time?.elapsed!=null?`${s.time.elapsed}'`:'';
        const inn=s.assist?.name||''; const out=s.player?.name||''; const side=s.team?.name||'';
        return `<div class="cslf-event"><div class="min">${tm}</div><div>Changement <span class="muted">(${side})</span> — <b>${inn}</b> IN / <b>${out}</b> OUT</div></div>`;
      }).join(''));
    }

    function renderFormations(lineups, fx){
      const H=lineups.find(x=>x.team?.id===fx.teams.home.id), A=lineups.find(x=>x.team?.id===fx.teams.away.id);
      const pitch = el('pitch-'+C.instanceId); $(pitch).find('.player').remove();
      if(!H || !A){ root.find('#forms-'+C.instanceId).html("Compositions indisponibles"); return; }
      root.find('#forms-'+C.instanceId).html(`<div><b>${fx.teams.home.name} :</b> ${H.formation||'—'} &nbsp; | &nbsp; <b>${fx.teams.away.name} :</b> ${A.formation||'—'}</div>`);
      layout(H,true).forEach(o=> addNode(pitch,o.x,o.y,o.p.number??'',o.p.name));
      layout(A,false).forEach(o=> addNode(pitch,o.x,o.y,o.p.number??'',o.p.name));
      const pm = el('pitch-mini-'+C.instanceId); pm.innerHTML=''; layout(H,true).forEach(o=> addNode(pm,o.x,o.y,o.p.number??'',o.p.name,true)); layout(A,false).forEach(o=> addNode(pm,o.x,o.y,o.p.number??'',o.p.name,true));
    }

    function formBadges(s){ if(!s) return ''; return `<div class="form">${
      s.slice(-5).split('').map(ch=>{ const c=ch.toUpperCase(); const t=c==='W'?'G':c==='D'?'N':'D'; const cls=t==='G'?'G':t==='N'?'N':'P'; return `<span class="f ${cls}">${t}</span>`;}).join('')
    }</div>`; }

    function renderStandings(raw, filter){
      const wrap = root.find('#stand-'+C.instanceId);
      const lg = raw?.[0]?.league; if(!lg){ wrap.html("<div class='muted'>Classement indisponible</div>"); return; }
      root.find('#lgName-'+C.instanceId).text(`${lg.name} • Saison ${lg.season}`); root.find('#lgLogo-'+C.instanceId).attr('src', lg.logo||'');
      const table = Array.isArray(lg.standings?.[0]) ? lg.standings[0] : (lg.standings||[]);
      const rows = table.map(r=>{
        let played=r.all?.played, won=r.all?.win, draw=r.all?.draw, lost=r.all?.lose, gf=r.all?.goals?.for, ga=r.all?.goals?.against;
        if(filter==='home' && r.home){ played=r.home.played; won=r.home.win; draw=r.home.draw; lost=r.home.lose; gf=r.home.goals.for; ga=r.home.goals.against; }
        if(filter==='away' && r.away){ played=r.away.played; won=r.away.win; draw=r.away.draw; lost=r.away.lose; gf=r.away.goals.for; ga=r.away.goals.against; }
        const diff = (isFinite(gf-ga)? (gf-ga) : null);
        return `<tr>
          <td>${r.rank??''}</td>
          <td><div style="display:flex;align-items:center;gap:8px"><img src="${r.team?.logo||''}" width="20" height="20"> ${r.team?.name||''}</div></td>
          <td>${played??'-'}</td><td>${won??'-'}</td><td>${draw??'-'}</td><td>${lost??'-'}</td>
          <td>${diff!=null?((diff>0?'+':'')+diff):'-'}</td>
          <td><b>${r.points??'-'}</b></td>
          <td>${formBadges(r.form||'')}</td>
        </tr>`;
      }).join('');
      wrap.html(`<table class="tbl"><thead><tr><th>#</th><th>Équipe</th><th>J</th><th>G</th><th>N</th><th>D</th><th>+/-</th><th>PTS</th><th>Forme</th></tr></thead><tbody>${rows}</tbody></table>`);
    }

    function computeH2H(list, homeId){
      let homeW=0, awayW=0, draws=0;
      list.forEach(m=>{
        if(m.fixture.status?.short!=='FT') return;
        const gh=m.goals?.home, ga=m.goals?.away;
        if(gh===ga) draws++; else if(gh>ga){ if(m.teams.home.id===homeId) homeW++; else awayW++; } else { if(m.teams.home.id===homeId) awayW++; else homeW++; }
      });
      return {homeW,draws,awayW};
    }
    function renderH2H(list, fx){
      let arr=list.slice();
      if(H2H_HOME) arr=arr.filter(m=>m.teams.home.id===fx.teams.home.id);
      if(H2H_COMP) arr=arr.filter(m=>m.league.id===fx.league.id);
      arr.sort((a,b)=> new Date(b.fixture.date)-new Date(a.fixture.date));
      const sum=computeH2H(list, fx.teams.home.id);
      root.find('#h2h-head-'+C.instanceId).html(`
        <div class="h2h-box"><div class="h2h-num home">${sum.homeW}</div><div>Victoires</div></div>
        <div class="h2h-box"><div class="h2h-num">${sum.draws}</div><div>Nuls</div></div>
        <div class="h2h-box"><div class="h2h-num away">${sum.awayW}</div><div>Victoires</div></div>
      `);
      root.find('#h2h-'+C.instanceId).html(arr.map(m=>{
        const dte=new Date(m.fixture.date);
        const score=(m.fixture.status?.short==='NS')? dte.toLocaleTimeString([], {hour:'2-digit',minute:'2-digit', timeZone:TZ}) : `${m.goals?.home??'-'} - ${m.goals?.away??'-'}`;
        return `<div class="row"><div class="left"><span class="muted" style="width:105px">${dte.toLocaleDateString([], {timeZone:TZ})}</span><span>${m.teams.home.name}</span><span class="tag">${score}</span><span>${m.teams.away.name}</span></div><div class="muted">${m.league?.name||''}</div></div>`;
      }).join('') || "<div class='muted'>Aucun match récent</div>");
    }

    function renderStatsTable(stats){
      const box = root.find('#stats-'+C.instanceId);
      if(!stats?.length){ box.html("<div class='muted'>—</div>"); return; }
      const byTeam = new Map(); stats.forEach(x=> byTeam.set(x.team?.id, x.statistics||[]));
      const H = byTeam.values().next().value || [];
      const others = [...byTeam.values()]; const A = others.length>1? others[1] : (others[0]||[]);
      box.html(H.map((s,i)=> `<div class="row" style="display:flex;justify-content:space-between;border-bottom:1px solid var(--border);padding:6px 0">
        <span>${s.type||''}</span><span>${s.value??'-'} — ${(A[i]?.value??'-')}</span></div>`).join(''));
    }

    // Data bucket
    const LOCAL = { fx:null, events:[], stats:[], lineups:[], h2h:[] };

    function isLive(short){ return ["1H","HT","2H","ET","BT","P"].includes(String(short||"").toUpperCase()); }

    function loadAll(){
      $.when(
        get('fixtures',            'id='+FIXTURE_ID),
        get('fixtures/events',     'fixture='+FIXTURE_ID),
        get('fixtures/statistics', 'fixture='+FIXTURE_ID),
        get('fixtures/lineups',    'fixture='+FIXTURE_ID)
      ).done(function(FX,EV,ST,LU){
        LOCAL.fx = FX?.[0] || null; LOCAL.events = EV||[]; LOCAL.stats = ST||[]; LOCAL.lineups = LU||[];
        if(LOCAL.fx){
          renderHeader(FX);
          renderTopStats(ST);
          renderEvents(EV);
          renderMiniEvents(EV);
          renderSubs(EV);
          renderFormations(LU, LOCAL.fx);

          const st = LOCAL.fx.fixture?.status?.short || '';
          if (isLive(st)) { setTimeout(loadAll, 60000); } // refresh only si live
        }
        setLast();
      }).fail(function(xhr,s,e){
        root.find('#err-'+C.instanceId).text(`Erreur de chargement (${xhr.status})`).show();
      });
    }

    function loadStandings(filter){
      if(!LOCAL.fx?.league?.id || !LOCAL.fx?.league?.season) return;
      get('standings', `league=${LOCAL.fx.league.id}&season=${LOCAL.fx.league.season}`).done(d=> renderStandings(d, filter||'all'));
    }

    function loadH2H(){
      if(!LOCAL.fx?.teams?.home?.id || !LOCAL.fx?.teams?.away?.id) return;
      get('fixtures/headtohead', `h2h=${LOCAL.fx.teams.home.id}-${LOCAL.fx.teams.away.id}&last=10`).done(d=>{ LOCAL.h2h=d; renderH2H(d, LOCAL.fx); });
    }

    loadAll();
  });
})(window, document, window.jQuery);
