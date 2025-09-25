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

    const urlParams = new URLSearchParams(location.search);
    const initialTab = urlParams.get('tab') || 'resume';
    const validTabs = ['resume', 'compos', 'stats', 'classement', 'h2h'];
    const tabToShow = validTabs.includes(initialTab) ? initialTab : 'resume';

    // Activate the initial tab
    root.find('.cslf-tabs button').removeClass('is-active');
    root.find(`.cslf-tabs button[data-tab="${tabToShow}"]`).addClass('is-active');
    root.find('.cslf-pane').removeClass('is-active');
    root.find(`.cslf-pane[data-pane="${tabToShow}"]`).addClass('is-active');

    
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
    function addNode(pitch,x,y,label,name,mini=false,playerData=null){
      const dEl = d.createElement('div'); dEl.className = mini?'player-mini':'player'; dEl.style.left=x+'%'; dEl.style.top=y+'%';
      dEl.innerHTML = `<div class="${mini?'dot-mini':'dot'}">${label||''}</div><div class="${mini?'pname-mini':'pname'}" title="${name||''}">${name||''}</div>`;
      
      // Add click handler for player details modal
      if (playerData && !mini) {
        dEl.style.cursor = 'pointer';
        dEl.addEventListener('click', function(e) {
          e.preventDefault();
          // Find detailed player data from cache.players
          const detailedPlayerData = findDetailedPlayerData(playerData);
          showPlayerModal(detailedPlayerData);
        });
      }
      
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
      layout(H,true).forEach(o=> addNode(pitch,o.x,o.y,o.p.number??'',o.p.name,false,o.p));
      layout(A,false).forEach(o=> addNode(pitch,o.x,o.y,o.p.number??'',o.p.name,false,o.p));
      const pm = el('pitch-mini-'+C.instanceId); pm.innerHTML=''; layout(H,true).forEach(o=> addNode(pm,o.x,o.y,o.p.number??'',o.p.name,true)); layout(A,false).forEach(o=> addNode(pm,o.x,o.y,o.p.number??'',o.p.name,true));
    }

    function formBadges(s){ if(!s) return ''; return `<div class="form">${
      s.slice(-5).split('').map(ch=>{ const c=ch.toUpperCase(); const t=c==='W'?'G':c==='D'?'N':'D'; const cls=t==='G'?'G':t==='N'?'N':'P'; return `<span class="f ${cls}">${t}</span>`;}).join('')
    }</div>`; }

    // Store players data when received
    let playersData = null;
    
    // Listen for players data
    C.on(inst, 'players', function(e) {
      console.log('Received players data:', e.detail);
      playersData = e.detail;
    });

    function findDetailedPlayerData(basicPlayerData) {
      console.log('Looking for detailed data for:', basicPlayerData);
      console.log('Available players data:', playersData);
      
      // Try to find detailed player data from playersData
      if (playersData) {
        // Search through all teams and players
        for (let team of playersData) {
          if (team.players) {
            for (let player of team.players) {
              // Match by player ID or name
              if (player.player && (
                (basicPlayerData.id && player.player.id === basicPlayerData.id) ||
                (basicPlayerData.name && player.player.name === basicPlayerData.name)
              )) {
                console.log('Found detailed player data:', player);
                return player;
              }
            }
          }
        }
      }
      
      console.log('No detailed data found, using basic data');
      // Fallback to basic player data if detailed data not found
      return basicPlayerData;
    }

    function showPlayerModal(playerData) {
      // Create modal if it doesn't exist
      let modal = document.getElementById('player-modal-' + C.instanceId);
      if (!modal) {
        modal = createPlayerModal();
        document.body.appendChild(modal);
      }
      
      // Populate modal with player data
      populatePlayerModal(modal, playerData);
      
      // Show modal
      modal.style.display = 'flex';
      document.body.style.overflow = 'hidden';
    }

    function createPlayerModal() {
      const modal = document.createElement('div');
      modal.id = 'player-modal-' + C.instanceId;
      modal.className = 'cslf-player-modal';
      modal.innerHTML = `
        <div class="cslf-modal-overlay"></div>
        <div class="cslf-modal-content">
          <div class="cslf-modal-header">
            <div class="cslf-player-info">
              <div class="cslf-player-photo">
                <img src="" alt="" class="cslf-player-img">
                <div class="cslf-player-rating"></div>
                <div class="cslf-player-badge"></div>
              </div>
              <div class="cslf-player-name"></div>
            </div>
          </div>
          <div class="cslf-modal-body">
            <div class="cslf-player-basic">
              <div class="cslf-basic-item">
                <span class="cslf-basic-label">Position</span>
                <span class="cslf-basic-value"></span>
              </div>
              <div class="cslf-basic-item">
                <span class="cslf-basic-label">Âge</span>
                <span class="cslf-basic-value"></span>
              </div>
              <div class="cslf-basic-item">
                <span class="cslf-basic-label">Pays</span>
                <span class="cslf-basic-value"></span>
              </div>
            </div>
            <div class="cslf-player-data">
              <div class="cslf-data-title">Données du joueur</div>
              <div class="cslf-data-text"></div>
            </div>
            <div class="cslf-player-stats">
              <div class="cslf-stats-title">Meilleurs statistiques</div>
              <div class="cslf-stats-grid">
                <div class="cslf-stat-item">
                  <div class="cslf-stat-label">Minutes jouées</div>
                  <div class="cslf-stat-value"></div>
                </div>
                <div class="cslf-stat-item">
                  <div class="cslf-stat-label">Buts</div>
                  <div class="cslf-stat-value"></div>
                </div>
                <div class="cslf-stat-item">
                  <div class="cslf-stat-label">Passes décisives</div>
                  <div class="cslf-stat-value"></div>
                </div>
                <div class="cslf-stat-item">
                  <div class="cslf-stat-label">Nombre de tirs</div>
                  <div class="cslf-stat-value"></div>
                </div>
              </div>
            </div>
          </div>
          <button class="cslf-modal-close">×</button>
        </div>
      `;
      
      // Add event listeners
      modal.querySelector('.cslf-modal-overlay').addEventListener('click', hidePlayerModal);
      modal.querySelector('.cslf-modal-close').addEventListener('click', hidePlayerModal);
      
      return modal;
    }

    function populatePlayerModal(modal, playerData) {
      // Basic player info
      const playerImg = modal.querySelector('.cslf-player-img');
      const playerName = modal.querySelector('.cslf-player-name');
      const playerRating = modal.querySelector('.cslf-player-rating');
      const playerBadge = modal.querySelector('.cslf-player-badge');
      
      // Extract player info from the detailed API structure
      const player = playerData.player || {};
      const stats = playerData.statistics?.[0] || {};
      const games = stats.games || {};
      
      if (player.photo) {
        playerImg.src = player.photo;
        playerImg.alt = player.name || '';
      }
      
      playerName.textContent = player.name || 'Joueur inconnu';
      
      // Rating and badge
      const rating = games.rating || 'N/A';
      playerRating.textContent = rating;
      
      // Check if player of the match
      if (rating >= 8.5) {
        playerBadge.innerHTML = '<span class="cslf-badge-star">★</span>';
        playerBadge.title = 'Joueur du match';
      }
      
      // Basic info
      const positionEl = modal.querySelector('.cslf-basic-item:nth-child(1) .cslf-basic-value');
      const ageEl = modal.querySelector('.cslf-basic-item:nth-child(2) .cslf-basic-value');
      const countryEl = modal.querySelector('.cslf-basic-item:nth-child(3) .cslf-basic-value');
      
      positionEl.textContent = games.position || 'N/A';
      ageEl.textContent = player.age || 'N/A';
      countryEl.textContent = player.nationality || 'N/A';
      
      // Player data text
      const dataText = modal.querySelector('.cslf-data-text');
      if (rating >= 8.5) {
        dataText.textContent = `${player.name} a été élu Joueur du match avec une note de ${rating}.`;
      } else {
        dataText.textContent = `Informations sur ${player.name}.`;
      }
      
      // Comprehensive statistics from the detailed API organized by specific categories
      const statsData = [
        // Informations générales
        { category: 'Informations générales', label: 'Minutes jouées', value: games.minutes || '0' },
        { category: 'Informations générales', label: 'Numéro', value: games.number || 'N/A' },
        { category: 'Informations générales', label: 'Capitaine', value: games.captain ? 'Oui' : 'Non' },
        
        // Buts
        { category: 'Buts', label: 'Buts', value: stats.goals?.total || '0' },
        { category: 'Buts', label: 'Passes décisives', value: stats.goals?.assists || '0' },
        { category: 'Buts', label: 'Arrêts', value: stats.goals?.saves || '0' },
        
        // Passes
        { category: 'Passes', label: 'Passes', value: stats.passes?.total || '0' },
        { category: 'Passes', label: 'Précision passes', value: (stats.passes?.accuracy || '0') + '%' },
        { category: 'Passes', label: 'Passes clés', value: stats.passes?.key || '0' },
        
        // Tacles
        { category: 'Tacles', label: 'Tacles', value: stats.tackles?.total || '0' },
        { category: 'Tacles', label: 'Interceptions', value: stats.tackles?.interceptions || '0' },
        { category: 'Tacles', label: 'Blocages', value: stats.tackles?.blocks || '0' },
        
        // Duels
        { category: 'Duels', label: 'Duels gagnés', value: (stats.duels?.won || '0') + '/' + (stats.duels?.total || '0') },
        
        // Dribbles
        { category: 'Dribbles', label: 'Dribbles', value: (stats.dribbles?.success || '0') + '/' + (stats.dribbles?.attempts || '0') },
        
        // Tirs
        { category: 'Tirs', label: 'Tirs', value: stats.shots?.total || '0' },
        { category: 'Tirs', label: 'Tirs cadrés', value: stats.shots?.on || '0' },
        
        // Fautes
        { category: 'Fautes', label: 'Fautes subies', value: stats.fouls?.drawn || '0' },
        { category: 'Fautes', label: 'Fautes commises', value: stats.fouls?.committed || '0' },
        
        // Cartons
        { category: 'Cartons', label: 'Cartons jaunes', value: stats.cards?.yellow || '0' },
        { category: 'Cartons', label: 'Cartons rouges', value: stats.cards?.red || '0' },
        
        // Hors-jeu
        { category: 'Hors-jeu', label: 'Hors-jeu', value: stats.offsides || '0' }
      ];
      
      // Update the stats grid with more comprehensive data organized by categories
      const statsGrid = modal.querySelector('.cslf-stats-grid');
      if (statsGrid) {
        statsGrid.innerHTML = '';
        
        // Group stats by category
        const categories = {};
        statsData.forEach(stat => {
          if (!categories[stat.category]) {
            categories[stat.category] = [];
          }
          categories[stat.category].push(stat);
        });
        
        // Create sections for each category
        Object.keys(categories).forEach(categoryName => {
          // Add category title
          const categoryTitle = document.createElement('div');
          categoryTitle.className = 'cslf-category-title';
          categoryTitle.textContent = categoryName;
          statsGrid.appendChild(categoryTitle);
          
          // Add stats for this category
          categories[categoryName].forEach(stat => {
            const statItem = document.createElement('div');
            statItem.className = 'cslf-stat-item';
            statItem.innerHTML = `
              <div class="cslf-stat-label">${stat.label}</div>
              <div class="cslf-stat-value">${stat.value}</div>
            `;
            statsGrid.appendChild(statItem);
          });
        });
      }
    }

    function hidePlayerModal() {
      const modal = document.getElementById('player-modal-' + C.instanceId);
      if (modal) {
        modal.style.display = 'none';
        document.body.style.overflow = '';
      }
    }

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
