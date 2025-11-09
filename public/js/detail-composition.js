/**
 * CSLF Detail - Composition Module (Simplified)
 * Just renders the compositions when data is available
 */
(function (w, d) {
  "use strict";

  function ready(fn) { 
    if (w.jQuery) { 
      fn(w.jQuery); 
    } else { 
      setTimeout(() => ready(fn), 50); 
    } 
  }

  ready(($) => {
    var Common = w.CSLF && w.CSLF.DetailCommon;
    if (!Common) { return; }

    // Simple Composition Module
    var CompositionModule = {
      init: function(inst) {
        this.instance = inst;
        this.instanceId = typeof inst === 'string' ? inst : (inst.id || inst);
        
        console.log('Composition module init - inst:', inst);
        console.log('Composition module init - instanceId:', this.instanceId);
        console.log('Composition module init - inst.id:', inst.id);
        console.log('Composition module init - root element:', inst.root);
        console.log('Composition module init - root ID:', inst.root ? inst.root.id : 'no root');
        
        this.bindEvents();
      },

      bindEvents: function() {
        var self = this;
        
        // Listen for lineups data from core
        Common.on(self.instance, 'lineups', function(e) {
          console.log('Composition module received lineups event:', e.detail);
          Common.setCache(self.instance, 'lineups', e.detail);
          self.renderCompositions(e.detail);
        });
        
        // Listen for composition tab activation
        Common.on(self.instance, 'tab:compos:show', function(e) {
          console.log('Composition tab activated!', e);
          // Try to get cached data and render
          var cached = Common.getCache(self.instance);
          console.log('Cached data:', cached);
          if (cached && cached.lineups) {
            console.log('Re-rendering compositions from cache');
            self.renderCompositions(cached.lineups);
          } else {
            console.log('No cached lineups data available');
          }
        });
      },

      renderCompositions: function(lineupsData) {
        console.log('renderCompositions called with:', lineupsData);
        if (!lineupsData || lineupsData.length < 2) {
          console.log('renderCompositions: Invalid lineups data, returning');
          return;
        }
        
        var H = lineupsData[0]; // Home team
        var A = lineupsData[1]; // Away team
        console.log('Home team:', H);
        console.log('Away team:', A);
        
        // Set formations HTML - update team headers
        console.log('Instance ID:', this.instanceId);
        console.log('All elements with compo-pitch:', document.querySelectorAll('[id*="compo-pitch"]'));
        console.log('All elements with compo-homeHead:', document.querySelectorAll('[id*="compo-homeHead"]'));
        console.log('All elements with pitch:', document.querySelectorAll('[id*="pitch"]'));
        console.log('All elements with homeHead:', document.querySelectorAll('[id*="homeHead"]'));
        console.log('All elements with compo:', document.querySelectorAll('[id*="compo"]'));
        console.log('All elements with home-coach:', document.querySelectorAll('[id*="home-coach"]'));
        console.log('All elements with home-pitch:', document.querySelectorAll('[id*="home-pitch"]'));
        console.log('All elements with pane-compos:', document.querySelectorAll('[id*="pane-compos"]'));
        console.log('All elements with compos:', document.querySelectorAll('[id*="compos"]'));
        
        var $homeHead = $('#' + this.instanceId + '-homeHead');
        var $awayHead = $('#' + this.instanceId + '-awayHead');
        console.log('Looking for team headers:', '#' + this.instanceId + '-homeHead', 'Found:', $homeHead.length);
        if ($homeHead.length && H.team) {
          $homeHead.text(H.team.name || 'Home');
        }
        if ($awayHead.length && A.team) {
          $awayHead.text(A.team.name || 'Away');
        }
        
        // Clear existing players
        var $pitch = $('#' + this.instanceId + '-pitch');
        console.log('Looking for pitch element:', '#' + this.instanceId + '-pitch', 'Found:', $pitch.length);
        if ($pitch.length) {
          $pitch.find('.player').remove();
          console.log('Cleared existing players');
          console.log('Pitch element found, proceeding with rendering');
        } else {
          console.log('Pitch element not found!');
          console.log('Available pitch elements:', document.querySelectorAll('[id*="pitch"]'));
          return; // Exit early if no pitch found
        }
        
        // Render home team
        if (H && H.startXI) {
          console.log('Rendering home team with', H.startXI.length, 'players');
          this.renderTeamPlayers(H.startXI, true);
        }
        
        // Render away team  
        if (A && A.startXI) {
          console.log('Rendering away team with', A.startXI.length, 'players');
          this.renderTeamPlayers(A.startXI, false);
        }
        
        // Update coach information
        var $homeCoach = $('#' + this.instanceId + '-coachHome');
        var $awayCoach = $('#' + this.instanceId + '-coachAway');
        if ($homeCoach.length && H.coach) {
          $homeCoach.text(H.coach.name || '');
        }
        if ($awayCoach.length && A.coach) {
          $awayCoach.text(A.coach.name || '');
        }
        
        // Render substitutes
        this.renderSubstitutes(H, A);
      },

      renderTeamPlayers: function(players, isHome) {
        console.log('renderTeamPlayers called with', players.length, 'players, isHome:', isHome);
        var positions = this.getFormationPositions(players.length, isHome);
        console.log('Formation positions:', positions);
        var self = this;
        
        players.forEach(function(player, idx) {
          console.log('Processing player', idx, ':', player);
          if (idx < positions.length) {
            var pos = positions[idx];
            console.log('Adding player to pitch at position:', pos);
            self.addPlayerToPitch(player, isHome, pos.x, pos.y, idx);
          } else {
            console.log('No position found for player', idx);
          }
        });
      },

      getFormationPositions: function(playerCount, isHome) {
        var positions = [];
        var y = isHome ? 20 : 80;
        
        // Simple positioning - just spread players evenly
        for (var i = 0; i < playerCount; i++) {
          var x = 10 + (i * 80 / Math.max(playerCount - 1, 1));
          positions.push({ x: x, y: y });
        }
        
        return positions;
      },

      addPlayerToPitch: function(player, isHome, x, y, idx) {
        console.log('addPlayerToPitch called:', { player, isHome, x, y, idx });
        var playerInfo = player.player || player;
        var name = playerInfo.name || '';
        var photo = playerInfo.photo || '';
        var number = playerInfo.number || '';
        console.log('Player info:', { name, photo, number });
        
        // Create player element
        var el = d.createElement('div');
        el.className = 'player';
        el.style.position = 'absolute';
        el.style.left = x + '%';
        el.style.top = y + '%';
        el.style.transform = 'translate(-50%, -50%)';
        el.style.cursor = 'pointer';
        el.style.zIndex = '10';
        
        // Create badge
        var badge = d.createElement('div');
        badge.style.width = '32px';
        badge.style.height = '32px';
        badge.style.borderRadius = '50%';
        badge.style.background = '#fff';
        badge.style.border = '2px solid #e6e8ec';
        badge.style.display = 'flex';
        badge.style.alignItems = 'center';
        badge.style.justifyContent = 'center';
        badge.style.fontSize = '11px';
        badge.style.fontWeight = '700';
        badge.style.color = '#111';
        badge.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';
        badge.textContent = number;
        
        // Add photo if available
        if (photo) {
          var img = d.createElement('img');
          img.src = photo;
          img.alt = name;
          img.style.width = '100%';
          img.style.height = '100%';
          img.style.borderRadius = '50%';
          img.style.objectFit = 'cover';
          badge.appendChild(img);
        }
        
        // Create name
        var nameEl = d.createElement('div');
        nameEl.style.marginTop = '4px';
        nameEl.style.textAlign = 'center';
        nameEl.style.fontSize = '10px';
        nameEl.style.fontWeight = 'bold';
        nameEl.style.color = '#111';
        nameEl.style.lineHeight = '1.2';
        nameEl.style.maxWidth = '60px';
        nameEl.style.wordWrap = 'break-word';
        nameEl.textContent = name;
        
        // Assemble
        el.appendChild(badge);
        el.appendChild(nameEl);
        
        // Add to pitch
        var $pitch = $('#' + this.instanceId + '-compo-pitch');
        console.log('Adding player element to pitch:', $pitch.length, 'pitch elements found');
        if ($pitch.length) {
          $pitch[0].appendChild(el);
          console.log('Player element added to pitch successfully');
        } else {
          console.log('No pitch element found to add player to');
        }
      },
      
      renderSubstitutes: function(H, A) {
        console.log('renderSubstitutes called');
        
        // Render home substitutes
        var $homeSubs = $('#' + this.instanceId + '-subsHome');
        if ($homeSubs.length && H.substitutes) {
          var homeSubsHtml = '';
          H.substitutes.forEach(function(sub) {
            var playerName = sub.player?.name || sub.name || '';
            var playerNumber = sub.player?.number || sub.number || '';
            homeSubsHtml += '<div style="padding: 4px 0; border-bottom: 1px solid #eee;">';
            homeSubsHtml += '<strong>' + playerNumber + '</strong> ' + playerName;
            homeSubsHtml += '</div>';
          });
          $homeSubs.html(homeSubsHtml || '<div class="muted">—</div>');
        }
        
        // Render away substitutes
        var $awaySubs = $('#' + this.instanceId + '-subsAway');
        if ($awaySubs.length && A.substitutes) {
          var awaySubsHtml = '';
          A.substitutes.forEach(function(sub) {
            var playerName = sub.player?.name || sub.name || '';
            var playerNumber = sub.player?.number || sub.number || '';
            awaySubsHtml += '<div style="padding: 4px 0; border-bottom: 1px solid #eee;">';
            awaySubsHtml += '<strong>' + playerNumber + '</strong> ' + playerName;
            awaySubsHtml += '</div>';
          });
          $awaySubs.html(awaySubsHtml || '<div class="muted">—</div>');
        }
      }
    };

    // Initialize composition module for all detail instances
    d.addEventListener('DOMContentLoaded', function() {
      console.log('Composition module DOMContentLoaded triggered');
      var nodes = d.querySelectorAll('.cslf-detail[id], .cslf-detail[data-instance]');
      console.log('Found detail nodes:', nodes.length);
      nodes.forEach(function(root) {
        var inst = Common.fromNode(root);
        if (inst) {
          console.log('Initializing composition module for:', inst.id);
          var moduleInstance = Object.create(CompositionModule);
          moduleInstance.init(inst);
        }
      });
    });

    // Export module
    w.CSLF = w.CSLF || {};
    w.CSLF.CompositionModule = CompositionModule;
  });
})(window, document);