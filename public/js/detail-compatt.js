(function (w, d) {
  "use strict";
  
  function ready(fn){ if(w.jQuery){ fn(w.jQuery); } else { setTimeout(()=>ready(fn),50); } }

  ready(($)=>{
    var Common = w.CSLF && w.CSLF.DetailCommon;
    if(!Common){ return; }

    var playersDataCompat = null;
    // Compatibility layer for old detail.js functionality
    d.addEventListener('DOMContentLoaded', function(){
      var nodes = d.querySelectorAll('.cslf-detail[id], .cslf-detail[data-instance]');
      nodes.forEach(function(root){
        var inst = Common.fromNode(root);
        
        // Handle formations rendering
        var fixtureData = null;
        var playersData = null;
        
        var eventsData = null;
        
        // Listen for fixture data from core
        Common.on(inst, 'fixture', function(e){
          fixtureData = e.detail;
        });
        
        // Listen for players data from core
        Common.on(inst, 'players', function(e){
          var players = e.detail || [];
          playersData = players;
          playersDataCompat = players; // Store for modal use
          console.log('Received players data in compat:', players);
        });
        
        // Listen for events data to get substitution information
        Common.on(inst, 'events', function(e){
          var events = e.detail || [];
          eventsData = events;
        });

        // Player modal functions for compat version
        
        
        // Function to extract substitution data from events
        function extractSubstitutionData(events) {
          var substitutions = {};
          if (!events) return substitutions;
          
          events.forEach(function(event) {
            if (event.type && event.type.name === 'subst') {
              var playerId = event.player && event.player.id;
              var minute = event.time && event.time.elapsed;
              
              if (playerId && minute) {
                if (!substitutions[playerId]) {
                  substitutions[playerId] = {};
                }
                
                if (event.detail && event.detail.includes('Substitution')) {
                  // Player was substituted out
                  substitutions[playerId].subOut = minute;
                } else {
                  // Player was substituted in
                  substitutions[playerId].subIn = minute;
                }
              }
            }
          });
          
          return substitutions;
        }
        
        // Function to merge players data with lineups
        function mergePlayersWithLineups(lineups, players, events) {
          if (!players || !lineups) return lineups;
          
          
          // Extract substitution data from events
          var substitutionData = extractSubstitutionData(events);
          
          // Create a lookup map of players by ID with full statistics
          var playersMap = {};
          players.forEach(function(teamData) {
            if (teamData.players) {
              teamData.players.forEach(function(playerData) {
                if (playerData.player && playerData.player.id) {
                  var playerId = playerData.player.id;
                  var stats = playerData.statistics && playerData.statistics[0] ? playerData.statistics[0] : {};
                  
                  playersMap[playerId] = {
                    // Basic player info
                    id: playerData.player.id,
                    name: playerData.player.name,
                    photo: playerData.player.photo,
                    
                    // Game statistics
                    minutes: stats.games ? stats.games.minutes : null,
                    number: stats.games ? stats.games.number : null,
                    position: stats.games ? stats.games.position : null,
                    rating: stats.games ? stats.games.rating : null,
                    captain: stats.games ? stats.games.captain : false,
                    substitute: stats.games ? stats.games.substitute : false,
                    subOut: null, // Will be set from events data if player was actually substituted
                    subIn: null,  // Will be set from events data if player was actually substituted
                    
                    // Performance stats
                    goals: stats.goals ? {
                      total: stats.goals.total,
                      conceded: stats.goals.conceded,
                      assists: stats.goals.assists,
                      saves: stats.goals.saves
                    } : null,
                    
                    // Cards
                    cards: stats.cards ? {
                      yellow: stats.cards.yellow,
                      red: stats.cards.red
                    } : null,
                    
                    // Passes
                    passes: stats.passes ? {
                      total: stats.passes.total,
                      key: stats.passes.key,
                      accuracy: stats.passes.accuracy
                    } : null,
                    
                    // Shots
                    shots: stats.shots ? {
                      total: stats.shots.total,
                      on: stats.shots.on
                    } : null,
                    
                    // Tackles
                    tackles: stats.tackles ? {
                      total: stats.tackles.total,
                      blocks: stats.tackles.blocks,
                      interceptions: stats.tackles.interceptions
                    } : null,
                    
                    // Duels
                    duels: stats.duels ? {
                      total: stats.duels.total,
                      won: stats.duels.won
                    } : null,
                    
                    // Dribbles
                    dribbles: stats.dribbles ? {
                      attempts: stats.dribbles.attempts,
                      success: stats.dribbles.success,
                      past: stats.dribbles.past
                    } : null,
                    
                    // Fouls
                    fouls: stats.fouls ? {
                      drawn: stats.fouls.drawn,
                      committed: stats.fouls.committed
                    } : null,
                    
                    // Offsides
                    offsides: stats.offsides,
                    
                    // Penalties
                    penalty: stats.penalty ? {
                      won: stats.penalty.won,
                      committed: stats.penalty.committed,
                      scored: stats.penalty.scored,
                      missed: stats.penalty.missed,
                      saved: stats.penalty.saved
                    } : null
                  };
                }
              });
            }
          });
          
          // Apply substitution data from events to players
          Object.keys(substitutionData).forEach(function(playerId) {
            if (playersMap[playerId]) {
              playersMap[playerId].subOut = substitutionData[playerId].subOut;
              playersMap[playerId].subIn = substitutionData[playerId].subIn;
            }
          });
          
          // Merge data into lineups
          lineups.forEach(function(lineup) {
            if (lineup.startXI) {
              lineup.startXI.forEach(function(player) {
                if (player.player && player.player.id && playersMap[player.player.id]) {
                  var detailedPlayer = playersMap[player.player.id];
                  // Merge detailed data
                  player.player = Object.assign(player.player, detailedPlayer);
                }
              });
            }
            if (lineup.substitutes) {
              lineup.substitutes.forEach(function(player) {
                if (player.player && player.player.id && playersMap[player.player.id]) {
                  var detailedPlayer = playersMap[player.player.id];
                  // Merge detailed data
                  player.player = Object.assign(player.player, detailedPlayer);
                }
              });
            }
          });
          
          return lineups;
        }
        
        Common.on(inst, 'lineups', function(e){
          var lineups = e.detail || [];
          
          if (!lineups.length) {
            return;
          }
          
          if (!fixtureData) {
            return;
          }
          
          // Merge players data with lineups if available
                  var enrichedLineups = lineups;
                  if (playersData && playersData.length > 0) {
                    enrichedLineups = mergePlayersWithLineups(lineups, playersData, eventsData);
                  } else {
                  }
          
          renderFormations(inst, enrichedLineups, fixtureData);
        
        });
      });
    });

    function findDetailedPlayerDataCompat(basicPlayerData, inst) {
      console.log('Looking for detailed data in compat for:', basicPlayerData);
      console.log('Available players data in compat:', playersDataCompat);
      
      // Try to find detailed player data from playersDataCompat
      if (playersDataCompat) {
        // Search through all teams and players
        for (var i = 0; i < playersDataCompat.length; i++) {
          var team = playersDataCompat[i];
          if (team.players) {
            for (var j = 0; j < team.players.length; j++) {
              var player = team.players[j];
              // Match by player ID or name
              if (player.player && (
                (basicPlayerData.id && player.player.id === basicPlayerData.id) ||
                (basicPlayerData.name && player.player.name === basicPlayerData.name)
              )) {
                console.log('Found detailed player data in compat:', player);
                return player;
              }
            }
          }
        }
      }
      
      console.log('No detailed data found in compat, using basic data');
      // Fallback to basic player data if detailed data not found
      return basicPlayerData;
    }
    
    // Function to render mobile substitutes like the image

    function renderFormations(inst, lineups, fx) {
      
      // Determine home and away teams from fixture data
      var homeTeamId = null;
      var awayTeamId = null;
      
      if (fx && fx.length > 0) {
        var fixture = fx[0];
        homeTeamId = fixture.teams?.home?.id;
        awayTeamId = fixture.teams?.away?.id;
      }
      
      // Find teams based on fixture data
      var H = null;
      var A = null;
      
      if (homeTeamId && awayTeamId) {
        H = lineups.find(x => x.team && x.team.id === homeTeamId);
        A = lineups.find(x => x.team && x.team.id === awayTeamId);
      } else {
        // Fallback to first two teams
        H = lineups.find(x => x.team && x.team.id);
        A = lineups.find(x => x.team && x.team.id && x.team.id !== H?.team?.id);
      }
      
      var pitch = inst.byId('-pitch');
      var forms = inst.byId('-forms');
      
      
      if (!H || !A) {
        if (forms) forms.innerHTML = "Compositions indisponibles";
        return;
      }
      
      if (forms) {
        // Set formations HTML with team ratings and logos (like the image)
        var homeRating = H.team?.rating || H.rating || 'N/A';
        var awayRating = A.team?.rating || A.rating || 'N/A';
        var homeLogo = H.team?.logo || H.logo || '';
        var awayLogo = A.team?.logo || A.logo || '';
        
        var formationHtml = '<div style="display: flex; align-items: center; justify-content: space-between; padding: 15px; background: #f8f9fa; border-radius: 8px; margin-bottom: 15px;">';
        
        // Home team section (left side)
        formationHtml += '<div style="display: flex; align-items: center; gap: 12px;">';
        formationHtml += '<div style="background: #28a745; color: white; padding: 6px 10px; border-radius: 15px; font-size: 13px; font-weight: bold;">' + homeRating + '</div>';
        if (homeLogo) {
          formationHtml += '<img src="' + Common.esc(homeLogo) + '" alt="Home Logo" style="width: 30px; height: 30px; border-radius: 50%; object-fit: cover;">';
        }
        formationHtml += '<div style="font-weight: bold; color: #333; font-size: 16px;">' + Common.esc(H.team?.name || 'Home') + '</div>';
        formationHtml += '<div style="background: #007bff; color: white; padding: 4px 8px; border-radius: 6px; font-size: 12px; font-weight: bold;">' + (H.formation || 'N/A') + '</div>';
        formationHtml += '</div>';
        
        // Away team section (right side)
        formationHtml += '<div style="display: flex; align-items: center; gap: 12px;">';
        formationHtml += '<div style="background: #007bff; color: white; padding: 4px 8px; border-radius: 6px; font-size: 12px; font-weight: bold;">' + (A.formation || 'N/A') + '</div>';
        formationHtml += '<div style="font-weight: bold; color: #333; font-size: 16px;">' + Common.esc(A.team?.name || 'Away') + '</div>';
        if (awayLogo) {
          formationHtml += '<img src="' + Common.esc(awayLogo) + '" alt="Away Logo" style="width: 30px; height: 30px; border-radius: 50%; object-fit: cover;">';
        }
        formationHtml += '<div style="background: #fd7e14; color: white; padding: 6px 10px; border-radius: 15px; font-size: 13px; font-weight: bold;">' + awayRating + '</div>';
        formationHtml += '</div>';
        
        formationHtml += '</div>';
        
        forms.innerHTML = formationHtml;
      }
      
      if (pitch) {
        // Clear existing players
        pitch.querySelectorAll('.player').forEach(p => p.remove());
        
        // Add responsive classes
        pitch.classList.add('cslf-pitch');
        
        // Apply mobile player layout with JavaScript
        function applyMobilePlayerLayout() {
          if (window.innerWidth <= 768) {
            var players = pitch.querySelectorAll('.player');
            players.forEach(function(player) {
              // Force mobile layout
              player.style.display = 'flex';
              player.style.flexDirection = 'column';
              player.style.alignItems = 'center';
              player.style.textAlign = 'center';
              
              // Get elements
              var dot = player.querySelector('.dot');
              var name = player.querySelector('.name');
              var tags = player.querySelector('.tags');
              
              if (dot) {
                dot.style.order = '1';
                dot.style.marginBottom = '6px';
                dot.style.marginRight = '0';
                dot.style.marginTop = '0';
                dot.style.width = '32px';
                dot.style.height = '32px';
                dot.style.fontSize = '10px';
              }
              
              if (name) {
                name.style.order = '2';
                name.style.marginTop = '0';
                name.style.marginBottom = '0';
                name.style.fontSize = '11px';
                name.style.fontWeight = 'bold';
                name.style.color = 'white';
                name.style.textAlign = 'center';
                name.style.lineHeight = '1.2';
              }
              
              if (tags) {
                tags.style.order = '3';
                tags.style.marginTop = '4px';
                tags.style.display = 'flex';
                tags.style.justifyContent = 'center';
              }
              
              // Adjust player container
              player.style.minWidth = '50px';
              player.style.maxWidth = '70px';
            });
          } else {
            // Reset for desktop
            var players = pitch.querySelectorAll('.player');
            players.forEach(function(player) {
              player.style.display = '';
              player.style.flexDirection = '';
              player.style.alignItems = '';
              player.style.textAlign = '';
              player.style.minWidth = '';
              player.style.maxWidth = '';
              
              var dot = player.querySelector('.dot');
              var name = player.querySelector('.name');
              var tags = player.querySelector('.tags');
              
              if (dot) {
                dot.style.order = '';
                dot.style.marginBottom = '';
                dot.style.marginRight = '';
                dot.style.marginTop = '';
                dot.style.width = '';
                dot.style.height = '';
                dot.style.fontSize = '';
              }
              
              if (name) {
                name.style.order = '';
                name.style.marginTop = '';
                name.style.marginBottom = '';
                name.style.fontSize = '';
                name.style.fontWeight = '';
                name.style.color = '';
                name.style.textAlign = '';
                name.style.lineHeight = '';
              }
              
              if (tags) {
                tags.style.order = '';
                tags.style.marginTop = '';
                tags.style.display = '';
                tags.style.justifyContent = '';
              }
            });
          }
        }
        
        // Apply mobile layout after players are added
        setTimeout(function() {
          applyMobilePlayerLayout();
        }, 200);
        
        // Apply on resize
        window.addEventListener('resize', function() {
          setTimeout(applyMobilePlayerLayout, 100);
        });
        
        // Add responsive CSS if not already added
        if (!document.getElementById('cslf-mobile-styles')) {
          var style = document.createElement('style');
          style.id = 'cslf-mobile-styles';
          style.textContent = `
            .cslf-pitch {
              position: relative;
              background: #2d5016;
              border-radius: 8px;
              min-height: 400px;
              overflow: hidden;
            }
            
            
            /* Mobile layout: image up, name down - like the changements section */
            @media (max-width: 768px) {
              .cslf-pitch {
                min-height: auto;
              }
              
              .cslf-pitch .player {
                flex-direction: column !important;
                align-items: center !important;
                text-align: center !important;
              }
              
              .cslf-pitch .player .dot {
                order: 1;
                margin-bottom: 6px;
                margin-right: 0;
                margin-top: 0;
              }
              
              .cslf-pitch .player .name {
                order: 2;
                margin-top: 0;
                margin-bottom: 0;
                font-size: 11px;
                font-weight: bold;
                color: white;
                text-align: center;
                line-height: 1.2;
              }
              
              .cslf-pitch .player .tags {
                order: 3;
                margin-top: 4px;
                justify-content: center;
              }
              
              /* Make player dots smaller on mobile for better fit */
              .cslf-pitch .player .dot {
                width: 32px;
                height: 32px;
                font-size: 10px;
              }
              
              /* Adjust player positioning for better mobile layout */
              .cslf-pitch .player {
                min-width: 50px;
                max-width: 70px;
              }
            }
          `;
          document.head.appendChild(style);
        }


        
        
        // Find the best player across both teams for MVP
        var bestPlayer = null;
        var bestRating = -1;
        var allPlayers = [];
        
        if (H.startXI) allPlayers = allPlayers.concat(H.startXI);
        if (A.startXI) allPlayers = allPlayers.concat(A.startXI);
        
        allPlayers.forEach(function(player) {
          var playerData = player.player || player;
          var rating = parseFloat(playerData.rating || 0);
          if (rating > bestRating) {
            bestRating = rating;
            bestPlayer = player;
          }
        });
        
        
        // Render home team with proper formation positioning
        if (H.startXI && H.startXI.length) {
          
          // Debug: Check if players have grid and pos data
          if (H.startXI && H.startXI.length > 0) {
            if (H.startXI[0].player) {
            }
          }
          
          // Position players according to formation (home team on left)
          positionPlayersByFormation(pitch, H.startXI, H.formation, true, bestPlayer, inst);
        } else {
        }
        
        // Render away team with proper formation positioning
        if (A.startXI && A.startXI.length) {
          
          // Debug: Check if players have grid and pos data
          if (A.startXI && A.startXI.length > 0) {
            if (A.startXI[0].player) {
            }
          }
          
          // Position players according to formation (away team on right)
          positionPlayersByFormation(pitch, A.startXI, A.formation, false, bestPlayer, inst);
        } else {
        }
      } else {
      }
      
      // Render substitutes and coach information
      renderSubstitutesAndCoach(inst, H, A);
    }
    
    function parseGrid(grid) {
      var match = String(grid || "").match(/^(\d+):(\d+)$/);
      return match ? {row: +match[1], col: +match[2]} : {row: 1, col: 1};
    }

    function laneBandForCount(n, padY) {
      var W = 100 - 2 * padY;
      var f = 1.0;
      if (n === 1) f = 0.00;
      else if (n === 2) f = 0.50;
      else if (n === 3) f = 0.70;
      var start = padY + (W * (1 - f) / 2);
      var end = 100 - padY - (W * (1 - f) / 2);
      return {start: start, end: end};
    }

    function computeCoordsFromGrid(lineup, side) {
      var XI = (lineup.startXI || []).map(function(x) {
        var p = x.player || x;
        var g = parseGrid(p.grid);
        return {
          id: p.id,
          name: p.name,
          number: p.number,
          pos: (p.pos || "").toUpperCase(),
          row: g.row,
          col: g.col
        };
      });
      
      if (!XI.length) return [];
      
      var teamMinCol = Math.min.apply(Math, XI.map(function(p) { return p.col; }));
      var teamMaxCol = Math.max.apply(Math, XI.map(function(p) { return p.col; }));
      
      var rows = Array.from(new Set(XI.map(function(p) { return p.row; }))).sort(function(a, b) { return a - b; });
      var byRow = new Map(rows.map(function(r) {
        return [r, XI.filter(function(p) { return p.row === r; }).sort(function(a, b) { return a.col - b.col; })];
      }));
      
      var padX = 6, padY = 10, inner = 8;
      var xLeftMin = padX, xLeftMax = 50 - inner;
      var xRightMin = 50 + inner, xRightMax = 100 - padX;
      var lerp = function(a, b, t) { return a + (b - a) * t; };
      
      var rowMin = rows[0], rowMax = rows[rows.length - 1];
      
      var coords = [];
      rows.forEach(function(r) {
        var arr = byRow.get(r) || [];
        var n = arr.length;
        var tRow = (rowMax === rowMin) ? 0 : (r - rowMin) / (rowMax - rowMin);
        var x = (side === 'home') ? lerp(xLeftMin, xLeftMax, tRow) : lerp(xRightMax, xRightMin, tRow);
        var band = laneBandForCount(n, side === 'away' ? padY - 3 : padY);
        
        arr.forEach(function(p, idx) {
          var yAbs;
          if (teamMaxCol === teamMinCol) {
            yAbs = 50;
          } else {
            var tCol = (p.col - teamMinCol) / (teamMaxCol - teamMinCol);
            yAbs = padY + tCol * (100 - 2 * padY);
          }
          var tSym = (n === 1) ? 0.5 : idx / (n - 1);
          var ySym = band.start + (band.end - band.start) * tSym;
          var alpha = (n === 1) ? 1.0 : (n === 2) ? 1.0 : (n === 3 ? 0.75 : 0.0);
          var y = yAbs * (1 - alpha) + ySym * alpha;
          
          // Create better formation alignment
          if (n > 1) {
            var spacing = (band.end - band.start) / (n - 1);
            y = band.start + idx * spacing;
          }
          y = 100 - y; // Reverse all players within their teams
          if (side === 'away') y = 100 - y;
          coords.push({x: x, y: y, p: p});
        });
      });
      
      return coords;
    }

    function positionPlayersByFormation(pitch, players, formation, isHome) {
      
      // Use the working grid-based positioning from the HTML file
      var lineup = { startXI: players };
      var coords = computeCoordsFromGrid(lineup, isHome ? 'home' : 'away');
      
      
      // Position each player using grid coordinates
      coords.forEach(function(coord, idx) {
        if (idx < players.length) {
          addPlayerAtPosition(pitch, players[idx], isHome, coord.x, coord.y, idx);
        }
      });
    }
    
    function addPlayerAtPosition(pitch, player, isHome, x, y, idx) {
      if (!pitch || !player) return;
      
      
      var playerName = player.player?.name || player.name || '';
      var playerNumber = player.player?.number || player.number || '';
      var playerPhoto = player.player?.photo || player.photo || '';
      var playerPosition = getPositionName(player.player?.position || player.player?.pos || player.pos || '');
      var playerRating = player.player?.rating || '';
      var playerMinutes = player.player?.minutes || '';
      var playerCaptain = player.player?.captain || false;
      var playerSubstitute = player.player?.substitute || false;
      var playerCards = player.player?.cards || {};
      var playerGoals = player.player?.goals || {};
      
      var playerEl = d.createElement('div');
      playerEl.className = 'player';
      playerEl.style.left = x + '%';
      playerEl.style.top = y + '%';
      playerEl.style.position = 'absolute';
      playerEl.style.transform = 'translate(-50%, -50%)';
      
      // Create player dot with photo
      var playerDot = '';
      if (playerPhoto && playerPhoto !== '') {
        playerDot = '<div class="dot" style="background-image: url(\'' + Common.esc(playerPhoto) + '\'); background-size: cover; background-position: center; width: 40px; height: 40px; border-radius: 50%; border: 3px solid ' + (isHome ? '#007bff' : '#dc3545') + '; display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: bold; color: white; text-shadow: 2px 2px 4px rgba(0,0,0,0.8); box-shadow: 0 2px 8px rgba(0,0,0,0.3);">' + playerNumber + '</div>';
      } else {
        playerDot = '<div class="dot" style="background: ' + (isHome ? '#007bff' : '#dc3545') + '; width: 40px; height: 40px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: bold; color: white; box-shadow: 0 2px 8px rgba(0,0,0,0.3);">' + playerNumber + '</div>';
      }
      
      var tooltipText = Common.esc(playerName) + (playerPosition ? ' (' + playerPosition + ')' : '');
      if (playerRating) tooltipText += ' - Rating: ' + playerRating;
      if (playerMinutes) tooltipText += ' - ' + playerMinutes + ' min';
      if (playerCaptain) tooltipText += ' - Captain';
      if (playerCards && (playerCards.yellow > 0 || playerCards.red > 0)) {
        if (playerCards.yellow > 0) tooltipText += ' - ' + playerCards.yellow + ' yellow card(s)';
        if (playerCards.red > 0) tooltipText += ' - ' + playerCards.red + ' red card(s)';
      }
      if (playerGoals && playerGoals.total > 0) tooltipText += ' - ' + playerGoals.total + ' goal(s)';
      if (playerGoals && playerGoals.assists > 0) tooltipText += ' - ' + playerGoals.assists + ' assist(s)';
      
      // Simple display - just show rating and basic info
      var ratingBadge = '';
      if (playerRating) {
        var ratingNum = parseFloat(playerRating);
        var badgeColor = '#28a745'; // Green for good ratings
        
        if (ratingNum >= 8.5) {
          badgeColor = '#007bff'; // Blue for excellent
        } else if (ratingNum < 6.5) {
          badgeColor = '#fd7e14'; // Orange for poor
        }
        
        ratingBadge = '<div style="background: ' + badgeColor + '; color: white; padding: 2px 6px; border-radius: 8px; font-size: 9px; font-weight: bold; margin: 2px auto; display: inline-block;">' + playerRating + '</div>';
      }
      
      playerEl.innerHTML = playerDot +
        ratingBadge +
        '<div class="pname" title="' + tooltipText + '" style="font-size: 9px; text-align: center; margin-top: 3px; max-width: 70px; word-break: break-word; color: #333; font-weight: 500;">' + 
        Common.esc(playerName) + '</div>';
        
      pitch.appendChild(playerEl);
    }
    
    function parseGrid(grid) {
      var match = String(grid || "").match(/^(\d+):(\d+)$/);
      return match ? {row: +match[1], col: +match[2]} : {row: 1, col: 1};
    }

    function laneBandForCount(n, padY) {
      var W = 100 - 2 * padY;
      var f = 1.0;
      if (n === 1) f = 0.00;
      else if (n === 2) f = 0.50;
      else if (n === 3) f = 0.70;
      var start = padY + (W * (1 - f) / 2);
      var end = 100 - padY - (W * (1 - f) / 2);
      return {start: start, end: end};
    }

    function computeCoordsFromGrid(lineup, side) {
      var XI = (lineup.startXI || []).map(function(x) {
        var p = x.player || x;
        var g = parseGrid(p.grid);
        return {
          id: p.id,
          name: p.name,
          number: p.number,
          pos: (p.pos || "").toUpperCase(),
          row: g.row,
          col: g.col
        };
      });
      
      if (!XI.length) return [];
      
      var teamMinCol = Math.min.apply(Math, XI.map(function(p) { return p.col; }));
      var teamMaxCol = Math.max.apply(Math, XI.map(function(p) { return p.col; }));
      
      var rows = Array.from(new Set(XI.map(function(p) { return p.row; }))).sort(function(a, b) { return a - b; });
      var byRow = new Map(rows.map(function(r) {
        return [r, XI.filter(function(p) { return p.row === r; }).sort(function(a, b) { return a.col - b.col; })];
      }));
      
      var padX = 6, padY = 10, inner = 8;
      var xLeftMin = padX, xLeftMax = 50 - inner;
      var xRightMin = 50 + inner, xRightMax = 100 - padX;
      var lerp = function(a, b, t) { return a + (b - a) * t; };
      
      var rowMin = rows[0], rowMax = rows[rows.length - 1];
      
      var coords = [];
      rows.forEach(function(r) {
        var arr = byRow.get(r) || [];
        var n = arr.length;
        var tRow = (rowMax === rowMin) ? 0 : (r - rowMin) / (rowMax - rowMin);
        var x = (side === 'home') ? lerp(xLeftMin, xLeftMax, tRow) : lerp(xRightMax, xRightMin, tRow);
        var band = laneBandForCount(n, side === 'away' ? padY - 3 : padY);
        
        arr.forEach(function(p, idx) {
          var yAbs;
          if (teamMaxCol === teamMinCol) {
            yAbs = 50;
          } else {
            var tCol = (p.col - teamMinCol) / (teamMaxCol - teamMinCol);
            yAbs = padY + tCol * (100 - 2 * padY);
          }
          var tSym = (n === 1) ? 0.5 : idx / (n - 1);
          var ySym = band.start + (band.end - band.start) * tSym;
          var alpha = (n === 1) ? 1.0 : (n === 2) ? 1.0 : (n === 3 ? 0.75 : 0.0);
          var y = yAbs * (1 - alpha) + ySym * alpha;
          
          // Create better formation alignment
          if (n > 1) {
            var spacing = (band.end - band.start) / (n - 1);
            y = band.start + idx * spacing;
          }
          y = 100 - y; // Reverse all players within their teams
          if (side === 'away') y = 100 - y;
          coords.push({x: x, y: y, p: p});
        });
      });
      
      return coords;
    }

    function positionPlayersByFormation(pitch, players, formation, isHome, bestPlayer, inst) {
      // Use normal positioning for all layouts
      var lineup = { startXI: players };
      var coords = computeCoordsFromGrid(lineup, isHome ? 'home' : 'away');
      
      // Position each player using grid coordinates
      coords.forEach(function(coord, idx) {
        if (idx < players.length) {
          var isMVP = players[idx] === bestPlayer;
          addPlayerAtPosition(pitch, players[idx], isHome, coord.x, coord.y, idx, isMVP, false, inst);
        }
      });
    }
    
    function calculateFormationPositions(formation, isHome) {
      var positions = [];
      
      
      // Parse formation (e.g., "4-2-3-1" -> [4, 2, 3, 1] or already an array)
      var formationArray;
      if (Array.isArray(formation)) {
        formationArray = formation;
      } else if (typeof formation === 'string') {
        formationArray = formation.split('-').map(function(x) { return parseInt(x, 10); });
      } else {
        formationArray = [4, 4, 2]; // Default formation
      }
      
      // Goalkeeper - always at the back
      positions.push({
        x: isHome ? 8 : 92,
        y: 50,
        position: 'GK'
      });
      
      // Defenders - defensive line
      var defCount = formationArray[0] || 4;
      for (var i = 0; i < defCount; i++) {
        var x = isHome ? 18 : 82;
        var y = 20 + (i * 20);
        positions.push({
          x: x,
          y: y,
          position: 'DEF'
        });
      }
      
      // Midfielders - midfield line
      var midCount = formationArray[1] || 4;
      for (var i = 0; i < midCount; i++) {
        var x = isHome ? 35 : 65;
        var y = 20 + (i * 20);
        positions.push({
          x: x,
          y: y,
          position: 'MID'
        });
      }
      
      // Attackers - attacking line
      var attCount = formationArray[2] || 2;
      for (var i = 0; i < attCount; i++) {
        var x = isHome ? 55 : 45;
        var y = 30 + (i * 40);
        positions.push({
          x: x,
          y: y,
          position: 'ATT'
        });
      }
      
      // Striker - center forward
      if (formationArray[3]) {
        positions.push({
          x: isHome ? 65 : 35,
          y: 50,
          position: 'ST'
        });
      }
      
      return positions;
    }
    
    function addPlayerAtPosition(pitch, player, isHome, x, y, idx, isMVP, isMobile, inst) {
      if (!pitch || !player) return;
      
      
      // Extract player data
      var playerData = player.player || player;
      var playerName = playerData.name || '';
      var playerNumber = playerData.number || '';
      var playerId = playerData.id;
      var playerPhoto = playerData.photo || '';
      
      // Extract stats from merged data
      var playerRating = playerData.rating;
      var playerMinutes = playerData.minutes;
      var playerCards = playerData.cards || {};
      var playerGoals = playerData.goals || {};
      var playerSubOut = playerData.subOut;
      
      
      // Create player element using the exact working approach
      var el = document.createElement('div');
      el.className = 'player';
      
      if (isMobile) {
        // Mobile layout: no absolute positioning
        el.style.position = 'static';
        el.style.display = 'flex';
        el.style.alignItems = 'center';
        el.style.background = 'rgba(255,255,255,0.1)';
        el.style.borderRadius = '8px';
        el.style.padding = '8px';
        el.style.margin = '2px 0';
        el.style.width = '100%';
        el.style.boxSizing = 'border-box';
      } else {
        // Desktop layout: absolute positioning
        el.style.left = x + '%';
        el.style.top = y + '%';
        el.style.position = 'absolute';
        el.style.transform = 'translate(-50%, -50%)';
        el.style.display = 'flex';
        el.style.flexDirection = 'column';
      }
      el.style.alignItems = 'center';
      el.style.pointerEvents = 'none';
      
      // Create badge wrapper
      var wrap = document.createElement('div');
      wrap.className = 'badge-wrap';
      wrap.style.position = 'relative';
      
      // Create badge
      var badge = document.createElement('div');
      badge.className = 'badge';
      badge.style.width = '42px';
      badge.style.height = '42px';
      badge.style.borderRadius = '50%';
      badge.style.background = '#ffd166';
      badge.style.border = '2px solid #111827';
      badge.style.display = 'flex';
      badge.style.alignItems = 'center';
      badge.style.justifyContent = 'center';
      badge.style.overflow = 'hidden';
      
      // Add player photo - ensure it's circular
      if (playerPhoto) {
        var img = new Image();
        img.src = playerPhoto;
        img.alt = playerName || '';
        img.style.position = 'absolute';
        img.style.inset = '0';
        img.style.width = '100%';
        img.style.height = '100%';
        img.style.objectFit = 'cover';
        img.style.borderRadius = '50%'; // Ensure circular
        badge.appendChild(img);
      }
      
      // Create overlay tags exactly like the working HTML
      var tagsTR = document.createElement('div');
      tagsTR.className = 'tags tr';
      tagsTR.style.position = 'absolute';
      tagsTR.style.display = 'flex';
      tagsTR.style.gap = '3px';
      tagsTR.style.top = '-6px';
      tagsTR.style.right = '-6px';
      
      var tagsBR = document.createElement('div');
      tagsBR.className = 'tags br';
      tagsBR.style.position = 'absolute';
      tagsBR.style.display = 'flex';
      tagsBR.style.gap = '3px';
      tagsBR.style.bottom = '-6px';
      tagsBR.style.right = '-6px';
      
      var tagsBL = document.createElement('div');
      tagsBL.className = 'tags bl';
      tagsBL.style.position = 'absolute';
      tagsBL.style.display = 'flex';
      tagsBL.style.gap = '3px';
      tagsBL.style.bottom = '-6px';
      tagsBL.style.left = '-6px';
      
      var tagsTL = document.createElement('div');
      tagsTL.className = 'tags tl';
      tagsTL.style.position = 'absolute';
      tagsTL.style.display = 'flex';
      tagsTL.style.gap = '3px';
      tagsTL.style.top = '-6px';
      tagsTL.style.left = '-6px';
      tagsTL.style.flexDirection = 'column';
      tagsTL.style.alignItems = 'flex-start';
      
      var tagSL = document.createElement('div');
      tagSL.className = 'tags sl';
      tagSL.style.position = 'absolute';
      tagSL.style.display = 'flex';
      tagSL.style.gap = '3px';
      tagSL.style.left = '-6px';
      tagSL.style.top = '50%';
      tagSL.style.transform = 'translate(-100%, -50%)';
      
      // Add substitution info - show when player got changed with arrow
      if (playerSubOut != null) {
        var s = document.createElement('div');
        s.className = 'chip suboff';
        s.innerHTML = '↩ ' + playerSubOut + "'";
        s.style.fontSize = '10px';
        s.style.lineHeight = '1';
        s.style.padding = '2px 6px';
        s.style.borderRadius = '6px';
        s.style.background = '#111827';
        s.style.border = '1px solid #ef4444';
        s.style.color = '#fca5a5';
        s.style.fontWeight = '800';
        s.style.display = 'flex';
        s.style.alignItems = 'center';
        s.style.gap = '2px';
        tagSL.appendChild(s);
      }
      
      // Add substitution in info - show when player entered with arrow
      if (playerData.subIn != null) {
        var sIn = document.createElement('div');
        sIn.className = 'chip subin';
        sIn.innerHTML = '↪ ' + playerData.subIn + "'";
        sIn.style.fontSize = '10px';
        sIn.style.lineHeight = '1';
        sIn.style.padding = '2px 6px';
        sIn.style.borderRadius = '6px';
        sIn.style.background = '#111827';
        sIn.style.border = '1px solid #28a745';
        sIn.style.color = '#90ee90';
        sIn.style.fontWeight = '800';
        sIn.style.display = 'flex';
        sIn.style.alignItems = 'center';
        sIn.style.gap = '2px';
        tagSL.appendChild(sIn);
      }
      
      // Add cards
      if ((playerCards.yellow || 0) > 0) {
        for (var i = 0; i < playerCards.yellow; i++) {
          var y1 = document.createElement('div');
          y1.className = 'cardY';
          y1.style.width = '12px';
          y1.style.height = '16px';
          y1.style.border = '1px solid #111827';
          y1.style.borderRadius = '2px';
          y1.style.background = '#facc15';
          tagsTL.appendChild(y1);
        }
      }
      
      if ((playerCards.red || 0) > 0) {
        for (var i = 0; i < playerCards.red; i++) {
          var r1 = document.createElement('div');
          r1.className = 'cardR';
          r1.style.width = '12px';
          r1.style.height = '16px';
          r1.style.border = '1px solid #111827';
          r1.style.borderRadius = '2px';
          r1.style.background = '#ef4444';
          tagsTL.appendChild(r1);
        }
      }
      
      // Add rating with color coding and MVP indicator
      if (playerRating != null) {
        var r = document.createElement('div');
        r.className = 'chip rate';
        var ratingNum = parseFloat(playerRating);
        r.textContent = ratingNum.toFixed(1) + (isMVP ? ' ⭐' : '');
        r.style.fontSize = '10px';
        r.style.lineHeight = '1';
        r.style.padding = '2px 6px';
        r.style.borderRadius = '6px';
        r.style.color = '#fff';
        r.style.fontWeight = '800';
        
        // Color coding based on rating
        if (ratingNum < 5) {
          r.style.background = '#dc3545'; // Red for poor rating
          r.style.border = '1px solid #dc3545';
        } else if (ratingNum >= 5 && ratingNum < 7) {
          r.style.background = '#fd7e14'; // Orange for average rating
          r.style.border = '1px solid #fd7e14';
        } else if (ratingNum >= 7 && ratingNum < 8.5) {
          r.style.background = '#28a745'; // Green for good rating
          r.style.border = '1px solid #28a745';
        } else if (ratingNum >= 8.5) {
          r.style.background = '#007bff'; // Blue for excellent rating
          r.style.border = '1px solid #007bff';
        }
        
        // Add special MVP styling
        if (isMVP) {
          r.style.boxShadow = '0 0 10px rgba(255, 215, 0, 0.8)';
          r.style.border = '2px solid #ffd700';
        }
        
        tagsTR.appendChild(r);
      }
      
      // Add goals - don't show ×1, move more to the right, gray background
      if ((playerGoals.total || 0) > 0) {
        var g = document.createElement('div');
        g.className = 'chip goal';
        g.textContent = '⚽' + (playerGoals.total > 1 ? '×' + playerGoals.total : '');
        g.style.fontSize = '10px';
        g.style.lineHeight = '1';
        g.style.padding = '2px 6px';
        g.style.borderRadius = '6px';
        g.style.background = '#6c757d'; // Gray background
        g.style.border = '1px solid #6c757d';
        g.style.color = '#fff';
        g.style.fontWeight = '800';
        g.style.marginLeft = '8px'; // Move more to the right
        tagsBR.appendChild(g);
      }
      
      // Add assists
      if ((playerGoals.assists || 0) > 0) {
        var a = document.createElement('div');
        a.className = 'chip assist';
        a.textContent = '🦶×' + playerGoals.assists;
        a.style.fontSize = '10px';
        a.style.lineHeight = '1';
        a.style.padding = '2px 6px';
        a.style.borderRadius = '6px';
        a.style.background = '#1f2937';
        a.style.border = '1px solid #374151';
        a.style.color = '#fff';
        a.style.fontWeight = '800';
        tagsBL.appendChild(a);
      }
      
      // Assemble badge wrapper
      wrap.appendChild(badge);
      if (tagsTR.childElementCount) wrap.appendChild(tagsTR);
      if (tagsBR.childElementCount) wrap.appendChild(tagsBR);
      if (tagsBL.childElementCount) wrap.appendChild(tagsBL);
      if (tagsTL.childElementCount) wrap.appendChild(tagsTL);
      if (tagSL.childElementCount) wrap.appendChild(tagSL);
      
      // Create player name - make it bold
      var name = document.createElement('div');
      name.className = 'name';
      name.style.fontSize = '11px';
      name.style.marginTop = '4px';
      name.style.maxWidth = '160px';
      name.style.textAlign = 'center';
      name.style.color = '#e5e7eb';
      name.style.whiteSpace = 'nowrap';
      name.style.overflow = 'hidden';
      name.style.textOverflow = 'ellipsis';
      name.style.fontWeight = 'bold'; // Make names bold
      
      // Get last name only
      var lastName = function(name) {
        return (name || '').trim().split(/\s+/).slice(-1)[0] || '';
      };
      
      // Add captain indicator and remove #
      if (playerData.captain) {
        // Create captain badge with gray background
        var captainBadge = document.createElement('span');
        captainBadge.textContent = 'C';
        captainBadge.style.background = '#6c757d';
        captainBadge.style.color = '#fff';
        captainBadge.style.padding = '2px 4px';
        captainBadge.style.borderRadius = '3px';
        captainBadge.style.fontSize = '10px';
        captainBadge.style.fontWeight = 'bold';
        captainBadge.style.marginRight = '4px';
        
        name.appendChild(captainBadge);
      }
      
      // Add player number and name
      var numberAndName = document.createElement('span');
      numberAndName.textContent = (playerNumber || '') + ' ' + lastName(playerName);
      name.appendChild(numberAndName);
      
      // Assemble player element
      el.appendChild(wrap);
      el.appendChild(name);
      
      // Add click handler for player details modal
      el.style.cursor = 'pointer';
      el.style.pointerEvents = 'auto'; // Override the pointer-events: none
      el.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        // Find detailed player data from cache.players
        var detailedPlayerData = findDetailedPlayerDataCompat(playerData, inst);
        showPlayerModalCompat(detailedPlayerData, inst);
      });
      
      // Add to pitch
      pitch.appendChild(el);
    }
    
   // Helper to get first name only
   function getFirstName(fullName) {
     if (!fullName || fullName === 'N/A') return 'N/A';
     var names = fullName.trim().split(' ');
     return names[0] || fullName;
   }
   
   function getPositionName(pos) {
     var positions = {
       'G': 'Gardien',
       'D': 'Défenseur', 
       'M': 'Milieu de terrain',
       'F': 'Attaquant'
     };
     return positions[pos] || 'Attaquant';
   }
    
    function getPlayerDetails(player) {
      return {
        name: player.player?.name || player.name || '',
        number: player.player?.number || player.number || '',
        photo: player.player?.photo || player.photo || '',
        position: getPositionName(player.player?.pos || player.pos || ''),
        age: player.player?.age || player.age || '',
        country: player.player?.country || player.country || '',
        flag: player.player?.flag || player.flag || '',
        grid: player.player?.grid || player.grid || null
      };
    }
    
    function renderSubstitutesAndCoach(inst, H, A) {
      
      // Create or find substitutes container
      var subsContainer = inst.root.querySelector('#subs-' + inst.id);
      if (!subsContainer) {
        // Create substitutes section if it doesn't exist
        var composPane = inst.root.querySelector('[data-pane="compos"]');
        if (composPane) {
          var subsSection = d.createElement('div');
          subsSection.className = 'cslf-section';
          subsSection.style.marginTop = '20px';
          subsSection.innerHTML = '<div class="cslf-section">Remplaçants & Entraîneurs</div><div id="subs-' + inst.id + '"></div>';
          composPane.appendChild(subsSection);
          subsContainer = d.getElementById('subs-' + inst.id);
        }
      }
      
      if (subsContainer) {
        var subsHtml = '';
        
        // Desktop style - original (kept as is)
        subsHtml += '<div style="background: #2c2c2c; color: #fff; padding: 20px; border-radius: 8px;">';
        
        // Coaches section
        subsHtml += '<div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 30px; padding: 15px; background: rgba(255,255,255,0.1); border-radius: 8px;">';
        subsHtml += '<div style="display: flex; align-items: center; gap: 12px;">';
        if (H.coach?.photo || H.coachPhoto) {
          subsHtml += '<img src="' + Common.esc(H.coach?.photo || H.coachPhoto) + '" alt="Coach" style="width: 50px; height: 50px; border-radius: 50%; object-fit: cover;">';
        } else {
          subsHtml += '<div style="width: 50px; height: 50px; border-radius: 50%; background: #666; display: flex; align-items: center; justify-content: center; font-size: 16px;">👨‍💼</div>';
        }
        subsHtml += '<div><div style="font-weight: bold; font-size: 16px;">' + Common.esc(getFirstName(H.coach?.name || H.coachName || 'N/A')) + '</div><div style="color: #ccc; font-size: 12px;">Entraîneur</div></div>';
        subsHtml += '</div>';
        subsHtml += '<div style="display: flex; align-items: center; gap: 12px; justify-content: flex-end;">';
        if (A.coach?.photo || A.coachPhoto) {
          subsHtml += '<img src="' + Common.esc(A.coach?.photo || A.coachPhoto) + '" alt="Coach" style="width: 50px; height: 50px; border-radius: 50%; object-fit: cover;">';
        } else {
          subsHtml += '<div style="width: 50px; height: 50px; border-radius: 50%; background: #666; display: flex; align-items: center; justify-content: center; font-size: 16px;">👨‍💼</div>';
        }
        subsHtml += '<div><div style="font-weight: bold; font-size: 16px;">' + Common.esc(getFirstName(A.coach?.name || A.coachName || 'N/A')) + '</div><div style="color: #ccc; font-size: 12px;">Entraîneur</div></div>';
        subsHtml += '</div>';
        subsHtml += '</div>';
        
        // Changements section (players who came on as substitutes)
        subsHtml += '<div class="changements-section" style="margin-bottom: 30px;">';
        subsHtml += '<h4 style="color: #fff; margin-bottom: 20px; font-size: 20px; font-weight: bold;">Changements</h4>';
        subsHtml += '<div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">';
        
        // Left column - Home team changements
        subsHtml += '<div class="changements-column">';
        if (H.substitutes && H.substitutes.length > 0) {
          // Filter players who actually played (have minutes or rating)
          H.substitutes.filter(function(sub) {
            var playerMinutes = sub.player?.minutes || '';
            var playerRating = sub.player?.rating || '';
            return playerMinutes || playerRating;
          }).forEach(function(sub) {
            var playerName = sub.player?.name || sub.name || '';
            var playerNumber = sub.player?.number || sub.number || '';
            var playerPhoto = sub.player?.photo || sub.photo || '';
            var playerPosition = getPositionName(sub.player?.position || sub.player?.pos || sub.pos || '');
            var playerRating = sub.player?.rating || '';
            var playerMinutes = sub.player?.minutes || '';
            var playerCaptain = sub.player?.captain || false;
            var playerSubstitute = sub.player?.substitute || false;
            var playerCards = sub.player?.cards || {};
            var playerGoals = sub.player?.goals || {};
            
            subsHtml += '<div class="player-entry" style="display: flex; align-items: center; gap: 15px; margin-bottom: 15px; padding: 12px; background: rgba(255,255,255,0.1); border-radius: 8px; cursor: pointer; transition: background-color 0.2s ease;" data-player-id="' + (sub.player?.id || '') + '" data-player-name="' + Common.esc(playerName) + '">';
            if (playerPhoto && playerPhoto !== '') {
              subsHtml += '<img src="' + Common.esc(playerPhoto) + '" alt="' + Common.esc(playerName) + '" style="width: 50px; height: 50px; border-radius: 50%; object-fit: cover;">';
            } else {
              subsHtml += '<div style="width: 50px; height: 50px; border-radius: 50%; background: #666; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 16px;">' + playerNumber + '</div>';
            }
            subsHtml += '<div style="flex: 1;">';
            // Create rating badge for substitutes
            var ratingBadgeHtml = '';
            if (playerRating) {
              var ratingNum = parseFloat(playerRating);
              var badgeColor = '#28a745'; // Green for good ratings
              var badgeIcon = '';
              
              if (ratingNum >= 8.5) {
                badgeColor = '#007bff'; // Blue for excellent
                badgeIcon = ' ⭐';
              } else if (ratingNum < 6.5) {
                badgeColor = '#fd7e14'; // Orange for poor
              }
              
              ratingBadgeHtml = '<span style="background: ' + badgeColor + '; color: white; padding: 2px 6px; border-radius: 10px; font-size: 12px; font-weight: bold; margin-left: 8px;">' + playerRating + badgeIcon + '</span>';
            }
            
            // Create substitution info - DEBUG: Always show if we have data
            var substitutionInfo = '';
            var subInTime = sub.player?.subIn || '';
            var subOutTime = sub.player?.subOut || '';
            
            // Debug: Show what we have
            console.log('Player:', playerName, 'subIn:', subInTime, 'subOut:', subOutTime, 'substitute:', playerSubstitute);
            
            if (subInTime) {
              var timeRemaining = 90 - parseInt(subInTime);
              substitutionInfo = '<span style="background: #28a745; color: white; padding: 2px 6px; border-radius: 10px; font-size: 10px;">IN ' + subInTime + "'</span>";
            } else if (subOutTime) {
              substitutionInfo = '<span style="background: #dc3545; color: white; padding: 2px 6px; border-radius: 10px; font-size: 10px;">OUT ' + subOutTime + "'</span>";
            }
            
            // Create performance stats with icons like in composition
            var performanceStats = '';
            if (playerGoals) {
              if (playerGoals.total > 0) {
                performanceStats += '<span style="font-size: 10px; line-height: 1; padding: 2px 6px; border-radius: 6px; background: #6c757d; border: 1px solid #6c757d; color: #fff; font-weight: 800; margin-left: 8px;">⚽' + (playerGoals.total > 1 ? '×' + playerGoals.total : '') + '</span>';
              }
              if (playerGoals.assists > 0) {
                performanceStats += '<span style="font-size: 10px; line-height: 1; padding: 2px 6px; border-radius: 6px; background: #1f2937; border: 1px solid #374151; color: #fff; font-weight: 800; margin-left: 8px;">🦶×' + playerGoals.assists + '</span>';
              }
            }
            
            // Create cards info
            var cardsInfo = '';
            if (playerCards) {
              if (playerCards.yellow > 0) cardsInfo += '<span style="color: #ffc107; font-size: 12px; margin-left: 8px;">🟨 ' + playerCards.yellow + '</span>';
              if (playerCards.red > 0) cardsInfo += '<span style="color: #dc3545; font-size: 12px; margin-left: 8px;">🟥 ' + playerCards.red + '</span>';
            }
            
            // Player name with number
            subsHtml += '<div style="color: #fff; font-weight: bold; font-size: 16px;">' + playerNumber + ' ' + Common.esc(getFirstName(playerName)) + '</div>';
            
            // Player position
            subsHtml += '<div style="color: #ccc; font-size: 14px;">' + Common.esc(playerPosition) + '</div>';
            
            // Badges positioned on image
            subsHtml += '<div class="substitution-time">' + substitutionInfo + '</div>';
            subsHtml += '<div class="rating-badge">' + ratingBadgeHtml + '</div>';
            subsHtml += '<div class="performance-stats">' + performanceStats + '</div>';
            subsHtml += '<div class="cards-info">' + cardsInfo + '</div>';
            subsHtml += '</div>';
            // Note: Flag display removed as it's not available in the players API data structure
            subsHtml += '</div>';
          });
        }
        subsHtml += '</div>';
        
        // Right column - Away team changements
        subsHtml += '<div class="changements-column">';
        if (A.substitutes && A.substitutes.length > 0) {
          // Filter players who actually played (have minutes or rating)
          A.substitutes.filter(function(sub) {
            var playerMinutes = sub.player?.minutes || '';
            var playerRating = sub.player?.rating || '';
            return playerMinutes || playerRating;
          }).forEach(function(sub) {
            var playerName = sub.player?.name || sub.name || '';
            var playerNumber = sub.player?.number || sub.number || '';
            var playerPhoto = sub.player?.photo || sub.photo || '';
            var playerPosition = getPositionName(sub.player?.position || sub.player?.pos || sub.pos || '');
            var playerRating = sub.player?.rating || '';
            var playerMinutes = sub.player?.minutes || '';
            var playerCaptain = sub.player?.captain || false;
            var playerSubstitute = sub.player?.substitute || false;
            var playerCards = sub.player?.cards || {};
            var playerGoals = sub.player?.goals || {};
            
            subsHtml += '<div class="player-entry" style="display: flex; align-items: center; gap: 15px; margin-bottom: 15px; padding: 12px; background: rgba(255,255,255,0.1); border-radius: 8px; cursor: pointer; transition: background-color 0.2s ease;" data-player-id="' + (sub.player?.id || '') + '" data-player-name="' + Common.esc(playerName) + '">';
            if (playerPhoto && playerPhoto !== '') {
              subsHtml += '<img src="' + Common.esc(playerPhoto) + '" alt="' + Common.esc(playerName) + '" style="width: 50px; height: 50px; border-radius: 50%; object-fit: cover;">';
            } else {
              subsHtml += '<div style="width: 50px; height: 50px; border-radius: 50%; background: #666; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 16px;">' + playerNumber + '</div>';
            }
            subsHtml += '<div style="flex: 1;">';
            // Create rating badge for substitutes
            var ratingBadgeHtml = '';
            if (playerRating) {
              var ratingNum = parseFloat(playerRating);
              var badgeColor = '#28a745'; // Green for good ratings
              var badgeIcon = '';
              
              if (ratingNum >= 8.5) {
                badgeColor = '#007bff'; // Blue for excellent
                badgeIcon = ' ⭐';
              } else if (ratingNum < 6.5) {
                badgeColor = '#fd7e14'; // Orange for poor
              }
              
              ratingBadgeHtml = '<span style="background: ' + badgeColor + '; color: white; padding: 2px 6px; border-radius: 10px; font-size: 12px; font-weight: bold; margin-left: 8px;">' + playerRating + badgeIcon + '</span>';
            }
            
            // Create substitution info - DEBUG: Always show if we have data
            var substitutionInfo = '';
            var subInTime = sub.player?.subIn || '';
            var subOutTime = sub.player?.subOut || '';
            
            // Debug: Show what we have
            console.log('Player:', playerName, 'subIn:', subInTime, 'subOut:', subOutTime, 'substitute:', playerSubstitute);
            
            if (subInTime) {
              var timeRemaining = 90 - parseInt(subInTime);
              substitutionInfo = '<span style="background: #28a745; color: white; padding: 2px 6px; border-radius: 10px; font-size: 10px;">IN ' + subInTime + "'</span>";
            } else if (subOutTime) {
              substitutionInfo = '<span style="background: #dc3545; color: white; padding: 2px 6px; border-radius: 10px; font-size: 10px;">OUT ' + subOutTime + "'</span>";
            }
            
            // Create performance stats with icons like in composition
            var performanceStats = '';
            if (playerGoals) {
              if (playerGoals.total > 0) {
                performanceStats += '<span style="font-size: 10px; line-height: 1; padding: 2px 6px; border-radius: 6px; background: #6c757d; border: 1px solid #6c757d; color: #fff; font-weight: 800; margin-left: 8px;">⚽' + (playerGoals.total > 1 ? '×' + playerGoals.total : '') + '</span>';
              }
              if (playerGoals.assists > 0) {
                performanceStats += '<span style="font-size: 10px; line-height: 1; padding: 2px 6px; border-radius: 6px; background: #1f2937; border: 1px solid #374151; color: #fff; font-weight: 800; margin-left: 8px;">🦶×' + playerGoals.assists + '</span>';
              }
            }
            
            // Create cards info
            var cardsInfo = '';
            if (playerCards) {
              if (playerCards.yellow > 0) cardsInfo += '<span style="color: #ffc107; font-size: 12px; margin-left: 8px;">🟨 ' + playerCards.yellow + '</span>';
              if (playerCards.red > 0) cardsInfo += '<span style="color: #dc3545; font-size: 12px; margin-left: 8px;">🟥 ' + playerCards.red + '</span>';
            }
            
            // Player name with number
            subsHtml += '<div style="color: #fff; font-weight: bold; font-size: 16px;">' + playerNumber + ' ' + Common.esc(getFirstName(playerName)) + '</div>';
            
            // Player position
            subsHtml += '<div style="color: #ccc; font-size: 14px;">' + Common.esc(playerPosition) + '</div>';
            
            // Badges positioned on image
            subsHtml += '<div class="substitution-time">' + substitutionInfo + '</div>';
            subsHtml += '<div class="rating-badge">' + ratingBadgeHtml + '</div>';
            subsHtml += '<div class="performance-stats">' + performanceStats + '</div>';
            subsHtml += '<div class="cards-info">' + cardsInfo + '</div>';
            subsHtml += '</div>';
            // Note: Flag display removed as it's not available in the players API data structure
            subsHtml += '</div>';
          });
        }
        subsHtml += '</div>';
        subsHtml += '</div></div>';
        
        // Remplaçants section (players who didn't play at all)
        subsHtml += '<div class="remplacants-section">';
        subsHtml += '<h4 style="color: #fff; margin-bottom: 20px; font-size: 20px; font-weight: bold;">Remplaçants</h4>';
        subsHtml += '<div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">';
        
        // Left column - Home team remplaçants
        subsHtml += '<div class="remplacants-column">';
        if (H.substitutes && H.substitutes.length > 0) {
          // Filter players who didn't play (no minutes or rating)
          H.substitutes.filter(function(sub) {
            var playerMinutes = sub.player?.minutes || '';
            var playerRating = sub.player?.rating || '';
            return !playerMinutes && !playerRating;
          }).forEach(function(sub) {
            var playerName = sub.player?.name || sub.name || '';
            var playerNumber = sub.player?.number || sub.number || '';
            var playerPhoto = sub.player?.photo || sub.photo || '';
            var playerPosition = getPositionName(sub.player?.position || sub.player?.pos || sub.pos || '');
            var playerRating = sub.player?.rating || '';
            var playerMinutes = sub.player?.minutes || '';
            var playerCaptain = sub.player?.captain || false;
            var playerSubstitute = sub.player?.substitute || false;
            var playerCards = sub.player?.cards || {};
            var playerGoals = sub.player?.goals || {};
            
            subsHtml += '<div class="player-entry" style="display: flex; align-items: center; gap: 15px; margin-bottom: 15px; padding: 12px; background: rgba(255,255,255,0.1); border-radius: 8px; cursor: pointer; transition: background-color 0.2s ease;" data-player-id="' + (sub.player?.id || '') + '" data-player-name="' + Common.esc(playerName) + '">';
            if (playerPhoto && playerPhoto !== '') {
              subsHtml += '<img src="' + Common.esc(playerPhoto) + '" alt="' + Common.esc(playerName) + '" style="width: 50px; height: 50px; border-radius: 50%; object-fit: cover;">';
            } else {
              subsHtml += '<div style="width: 50px; height: 50px; border-radius: 50%; background: #666; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 16px;">' + playerNumber + '</div>';
            }
            subsHtml += '<div style="flex: 1;">';
            // Create rating badge for substitutes
            var ratingBadgeHtml = '';
            if (playerRating) {
              var ratingNum = parseFloat(playerRating);
              var badgeColor = '#28a745'; // Green for good ratings
              var badgeIcon = '';
              
              if (ratingNum >= 8.5) {
                badgeColor = '#007bff'; // Blue for excellent
                badgeIcon = ' ⭐';
              } else if (ratingNum < 6.5) {
                badgeColor = '#fd7e14'; // Orange for poor
              }
              
              ratingBadgeHtml = '<span style="background: ' + badgeColor + '; color: white; padding: 2px 6px; border-radius: 10px; font-size: 12px; font-weight: bold; margin-left: 8px;">' + playerRating + badgeIcon + '</span>';
            }
            
            // Create substitution info - DEBUG: Always show if we have data
            var substitutionInfo = '';
            var subInTime = sub.player?.subIn || '';
            var subOutTime = sub.player?.subOut || '';
            
            // Debug: Show what we have
            console.log('Player:', playerName, 'subIn:', subInTime, 'subOut:', subOutTime, 'substitute:', playerSubstitute);
            
            if (subInTime) {
              var timeRemaining = 90 - parseInt(subInTime);
              substitutionInfo = '<span style="background: #28a745; color: white; padding: 2px 6px; border-radius: 10px; font-size: 10px;">IN ' + subInTime + "'</span>";
            } else if (subOutTime) {
              substitutionInfo = '<span style="background: #dc3545; color: white; padding: 2px 6px; border-radius: 10px; font-size: 10px;">OUT ' + subOutTime + "'</span>";
            }
            
            // Create performance stats with icons like in composition
            var performanceStats = '';
            if (playerGoals) {
              if (playerGoals.total > 0) {
                performanceStats += '<span style="font-size: 10px; line-height: 1; padding: 2px 6px; border-radius: 6px; background: #6c757d; border: 1px solid #6c757d; color: #fff; font-weight: 800; margin-left: 8px;">⚽' + (playerGoals.total > 1 ? '×' + playerGoals.total : '') + '</span>';
              }
              if (playerGoals.assists > 0) {
                performanceStats += '<span style="font-size: 10px; line-height: 1; padding: 2px 6px; border-radius: 6px; background: #1f2937; border: 1px solid #374151; color: #fff; font-weight: 800; margin-left: 8px;">🦶×' + playerGoals.assists + '</span>';
              }
            }
            
            // Create cards info
            var cardsInfo = '';
            if (playerCards) {
              if (playerCards.yellow > 0) cardsInfo += '<span style="color: #ffc107; font-size: 12px; margin-left: 8px;">🟨 ' + playerCards.yellow + '</span>';
              if (playerCards.red > 0) cardsInfo += '<span style="color: #dc3545; font-size: 12px; margin-left: 8px;">🟥 ' + playerCards.red + '</span>';
            }
            
            // Player name with number
            subsHtml += '<div style="color: #fff; font-weight: bold; font-size: 16px;">' + playerNumber + ' ' + Common.esc(getFirstName(playerName)) + '</div>';
            
            // Player position
            subsHtml += '<div style="color: #ccc; font-size: 14px;">' + Common.esc(playerPosition) + '</div>';
            
            // Badges positioned on image
            subsHtml += '<div class="substitution-time">' + substitutionInfo + '</div>';
            subsHtml += '<div class="rating-badge">' + ratingBadgeHtml + '</div>';
            subsHtml += '<div class="performance-stats">' + performanceStats + '</div>';
            subsHtml += '<div class="cards-info">' + cardsInfo + '</div>';
            subsHtml += '</div>';
            // Note: Flag display removed as it's not available in the players API data structure
            subsHtml += '</div>';
          });
        }
        subsHtml += '</div>';
        
        // Right column - Away team remplaçants
        subsHtml += '<div class="remplacants-column">';
        if (A.substitutes && A.substitutes.length > 0) {
          // Filter players who didn't play (no minutes or rating)
          A.substitutes.filter(function(sub) {
            var playerMinutes = sub.player?.minutes || '';
            var playerRating = sub.player?.rating || '';
            return !playerMinutes && !playerRating;
          }).forEach(function(sub) {
            var playerName = sub.player?.name || sub.name || '';
            var playerNumber = sub.player?.number || sub.number || '';
            var playerPhoto = sub.player?.photo || sub.photo || '';
            var playerPosition = getPositionName(sub.player?.position || sub.player?.pos || sub.pos || '');
            var playerRating = sub.player?.rating || '';
            var playerMinutes = sub.player?.minutes || '';
            var playerCaptain = sub.player?.captain || false;
            var playerSubstitute = sub.player?.substitute || false;
            var playerCards = sub.player?.cards || {};
            var playerGoals = sub.player?.goals || {};
            
            subsHtml += '<div class="player-entry" style="display: flex; align-items: center; gap: 15px; margin-bottom: 15px; padding: 12px; background: rgba(255,255,255,0.1); border-radius: 8px; cursor: pointer; transition: background-color 0.2s ease;" data-player-id="' + (sub.player?.id || '') + '" data-player-name="' + Common.esc(playerName) + '">';
            if (playerPhoto && playerPhoto !== '') {
              subsHtml += '<img src="' + Common.esc(playerPhoto) + '" alt="' + Common.esc(playerName) + '" style="width: 50px; height: 50px; border-radius: 50%; object-fit: cover;">';
            } else {
              subsHtml += '<div style="width: 50px; height: 50px; border-radius: 50%; background: #666; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 16px;">' + playerNumber + '</div>';
            }
            subsHtml += '<div style="flex: 1;">';
            // Create rating badge for substitutes
            var ratingBadgeHtml = '';
            if (playerRating) {
              var ratingNum = parseFloat(playerRating);
              var badgeColor = '#28a745'; // Green for good ratings
              var badgeIcon = '';
              
              if (ratingNum >= 8.5) {
                badgeColor = '#007bff'; // Blue for excellent
                badgeIcon = ' ⭐';
              } else if (ratingNum < 6.5) {
                badgeColor = '#fd7e14'; // Orange for poor
              }
              
              ratingBadgeHtml = '<span style="background: ' + badgeColor + '; color: white; padding: 2px 6px; border-radius: 10px; font-size: 12px; font-weight: bold; margin-left: 8px;">' + playerRating + badgeIcon + '</span>';
            }
            
            // Create substitution info - DEBUG: Always show if we have data
            var substitutionInfo = '';
            var subInTime = sub.player?.subIn || '';
            var subOutTime = sub.player?.subOut || '';
            
            // Debug: Show what we have
            console.log('Player:', playerName, 'subIn:', subInTime, 'subOut:', subOutTime, 'substitute:', playerSubstitute);
            
            if (subInTime) {
              var timeRemaining = 90 - parseInt(subInTime);
              substitutionInfo = '<span style="background: #28a745; color: white; padding: 2px 6px; border-radius: 10px; font-size: 10px;">IN ' + subInTime + "'</span>";
            } else if (subOutTime) {
              substitutionInfo = '<span style="background: #dc3545; color: white; padding: 2px 6px; border-radius: 10px; font-size: 10px;">OUT ' + subOutTime + "'</span>";
            }
            
            // Create performance stats with icons like in composition
            var performanceStats = '';
            if (playerGoals) {
              if (playerGoals.total > 0) {
                performanceStats += '<span style="font-size: 10px; line-height: 1; padding: 2px 6px; border-radius: 6px; background: #6c757d; border: 1px solid #6c757d; color: #fff; font-weight: 800; margin-left: 8px;">⚽' + (playerGoals.total > 1 ? '×' + playerGoals.total : '') + '</span>';
              }
              if (playerGoals.assists > 0) {
                performanceStats += '<span style="font-size: 10px; line-height: 1; padding: 2px 6px; border-radius: 6px; background: #1f2937; border: 1px solid #374151; color: #fff; font-weight: 800; margin-left: 8px;">🦶×' + playerGoals.assists + '</span>';
              }
            }
            
            // Create cards info
            var cardsInfo = '';
            if (playerCards) {
              if (playerCards.yellow > 0) cardsInfo += '<span style="color: #ffc107; font-size: 12px; margin-left: 8px;">🟨 ' + playerCards.yellow + '</span>';
              if (playerCards.red > 0) cardsInfo += '<span style="color: #dc3545; font-size: 12px; margin-left: 8px;">🟥 ' + playerCards.red + '</span>';
            }
            
            // Player name with number
            subsHtml += '<div style="color: #fff; font-weight: bold; font-size: 16px;">' + playerNumber + ' ' + Common.esc(getFirstName(playerName)) + '</div>';
            
            // Player position
            subsHtml += '<div style="color: #ccc; font-size: 14px;">' + Common.esc(playerPosition) + '</div>';
            
            // Badges positioned on image
            subsHtml += '<div class="substitution-time">' + substitutionInfo + '</div>';
            subsHtml += '<div class="rating-badge">' + ratingBadgeHtml + '</div>';
            subsHtml += '<div class="performance-stats">' + performanceStats + '</div>';
            subsHtml += '<div class="cards-info">' + cardsInfo + '</div>';
            subsHtml += '</div>';
            // Note: Flag display removed as it's not available in the players API data structure
            subsHtml += '</div>';
          });
        }
        subsHtml += '</div>';
        subsHtml += '</div></div>';
        
        subsHtml += '</div>'; // Close main container
        
        if (subsHtml) {
          subsContainer.innerHTML = subsHtml;
        
        // Add mobile-only CSS overrides
        if (!window.cslfMobileCSSAdded) {
          var style = document.createElement('style');
          style.id = 'cslf-mobile-substitutes';
          style.textContent = `
            /* Mobile styles ONLY - Desktop stays original */
            @media (max-width: 480px) {
              /* Override main container for mobile */
              #subs-${inst.id} > div {
                background: #1a1a1a !important;
                color: white !important;
                padding: 15px !important;
                margin-top: 20px !important;
                border-radius: 8px !important;
              }
              
              /* Override coaches section for mobile */
              #subs-${inst.id} .coaches-section,
              #subs-${inst.id} > div > div:first-child {
                display: flex !important;
                justify-content: space-around !important;
                margin-bottom: 30px !important;
                padding: 0 !important;
                background: transparent !important;
              }
              
              /* Override coach items for mobile */
              #subs-${inst.id} .coaches-section > div,
              #subs-${inst.id} > div > div:first-child > div {
                display: flex !important;
                flex-direction: column !important;
                align-items: center !important;
                text-align: center !important;
                gap: 8px !important;
              }
              
              /* Override coach images for mobile */
              #subs-${inst.id} .coaches-section img,
              #subs-${inst.id} > div > div:first-child img {
                width: 60px !important;
                height: 60px !important;
                border-radius: 50% !important;
                object-fit: cover !important;
                margin-bottom: 8px !important;
              }
              
              /* Override coach names for mobile */
              #subs-${inst.id} .coaches-section div div:first-child,
              #subs-${inst.id} > div > div:first-child > div > div:first-child {
                font-size: 14px !important;
                font-weight: bold !important;
                color: white !important;
              }
              
              /* Override player entries for mobile - vertical layout */
              #subs-${inst.id} .player-entry {
                display: flex !important;
                flex-direction: column !important;
                align-items: center !important;
                text-align: center !important;
                gap: 8px !important;
                margin-bottom: 15px !important;
                padding: 12px !important;
                background: rgba(255,255,255,0.1) !important;
                border-radius: 8px !important;
                cursor: pointer !important;
                transition: background-color 0.2s ease !important;
                position: relative !important;
              }
              
              /* Override player images for mobile */
              #subs-${inst.id} .player-entry img,
              #subs-${inst.id} .player-entry > div:first-child {
                width: 50px !important;
                height: 50px !important;
                border-radius: 50% !important;
                object-fit: cover !important;
                margin-bottom: 8px !important;
                position: relative !important;
              }
              
              /* Override player info for mobile */
              #subs-${inst.id} .player-entry > div:last-child {
                width: 100% !important;
                text-align: center !important;
              }
              
              /* Rating badge - TOP RIGHT of image */
              #subs-${inst.id} .player-entry .rating-badge {
                position: absolute !important;
                top: 5px !important;
                right: 5px !important;
                z-index: 10 !important;
              }
              #subs-${inst.id} .player-entry .rating-badge span {
                font-size: 10px !important;
                padding: 1px 4px !important;
                border-radius: 8px !important;
              }
              
              /* Substitution time - TOP LEFT of image */
              #subs-${inst.id} .player-entry .substitution-time {
                position: absolute !important;
                top: 5px !important;
                left: 5px !important;
                z-index: 10 !important;
              }
              #subs-${inst.id} .player-entry .substitution-time span {
                font-size: 9px !important;
                padding: 1px 3px !important;
                border-radius: 6px !important;
              }
              
              /* Cards - BELOW minutes, TOP LEFT - SMALL RECTANGLES (no circle) */
              #subs-${inst.id} .player-entry .cards-info {
                position: absolute !important;
                top: 20px !important;
                left: 5px !important;
                z-index: 10 !important;
              }
              #subs-${inst.id} .player-entry .cards-info span {
                font-size: 0 !important;
                padding: 0 !important;
                border-radius: 0 !important;
                width: 8px !important;
                height: 12px !important;
                display: inline-block !important;
                margin-right: 2px !important;
              }
              
              /* Yellow card styling - NO CIRCLE, SQUARE */
              #subs-${inst.id} .player-entry .cards-info span[style*="color: #ffc107"] {
                background-color: #ffc107 !important;
                border: 1px solid #ffc107 !important;
                border-radius: 0 !important;
              }
              
              /* Red card styling - NO CIRCLE, SQUARE */
              #subs-${inst.id} .player-entry .cards-info span[style*="color: #dc3545"] {
                background-color: #dc3545 !important;
                border: 1px solid #dc3545 !important;
                border-radius: 0 !important;
              }
              
              /* Player name and number - UNDER the image */
              #subs-${inst.id} .player-entry > div:last-child > div:first-child {
                margin: 0 !important;
                font-weight: bold !important;
                font-size: 14px !important;
                color: #fff !important;
                margin-bottom: 4px !important;
              }
              
              /* Player position - BELOW the name */
              #subs-${inst.id} .player-entry > div:last-child > div:last-child {
                margin: 0 !important;
                font-size: 12px !important;
                color: #ccc !important;
              }
            }
          `;
          document.head.appendChild(style);
          window.cslfMobileCSSAdded = true;
        }
          
          // Add click handlers for changements players
          var changementsPlayers = subsContainer.querySelectorAll('.changements-section .player-entry');
          changementsPlayers.forEach(function(playerEl) {
            playerEl.addEventListener('click', function(e) {
              e.preventDefault();
              e.stopPropagation();
              
              var playerId = playerEl.getAttribute('data-player-id');
              var playerName = playerEl.getAttribute('data-player-name');
              
              // Find the detailed player data from cache.players
              var playerData = null;
              
              // First try to find in playersDataCompat (detailed data)
              if (playersDataCompat) {
                for (var team of playersDataCompat) {
                  if (team.players) {
                    for (var player of team.players) {
                      if (player.player && (player.player.id == playerId || player.player.name === playerName)) {
                        playerData = player;
                        break;
                      }
                    }
                  }
                  if (playerData) break;
                }
              }
              
              // Fallback to substitutes data if detailed data not found
              if (!playerData) {
                if (H.substitutes) {
                  for (var i = 0; i < H.substitutes.length; i++) {
                    var sub = H.substitutes[i];
                    if (sub.player && (sub.player.id == playerId || sub.player.name === playerName)) {
                      playerData = sub;
                      break;
                    }
                  }
                }
                if (!playerData && A.substitutes) {
                  for (var i = 0; i < A.substitutes.length; i++) {
                    var sub = A.substitutes[i];
                    if (sub.player && (sub.player.id == playerId || sub.player.name === playerName)) {
                      playerData = sub;
                      break;
                    }
                  }
                }
              }
              
              if (playerData) {
                showPlayerModalCompat(playerData, inst);
              }
            });
            
            // Add hover effects
            playerEl.addEventListener('mouseenter', function() {
              this.style.backgroundColor = 'rgba(255,255,255,0.2)';
            });
            playerEl.addEventListener('mouseleave', function() {
              this.style.backgroundColor = 'rgba(255,255,255,0.1)';
            });
          });
        } else {
          subsContainer.innerHTML = '<div class="muted">Informations sur les remplaçants et entraîneurs non disponibles</div>';
        }
      }
    }

    function addPlayer(pitch, player, isHome, idx) {
      if (!pitch || !player) {
        return;
      }
      
      
      // The player data might be nested differently
      var playerName = player.player?.name || player.name || '';
      var playerNumber = player.player?.number || player.number || '';
      var playerPhoto = player.player?.photo || player.photo || '';
      var playerPosition = getPositionName(player.player?.position || player.player?.pos || player.pos || '');
      var playerRating = player.player?.rating || '';
      var playerMinutes = player.player?.minutes || '';
      var playerCaptain = player.player?.captain || false;
      var playerSubstitute = player.player?.substitute || false;
      var playerCards = player.player?.cards || {};
      var playerGoals = player.player?.goals || {};
      
      var playerEl = d.createElement('div');
      playerEl.className = 'player';
      playerEl.style.left = (isHome ? 10 : 90) + '%';
      playerEl.style.top = (20 + (idx * 6)) + '%';
      
      // Create player dot with photo or number
      var playerDot = '';
      if (playerPhoto) {
        playerDot = '<div class="dot" style="background-image: url(\'' + Common.esc(playerPhoto) + '\'); background-size: cover; background-position: center; width: 35px; height: 35px; border-radius: 50%; border: 2px solid ' + (isHome ? '#007bff' : '#dc3545') + '; display: flex; align-items: center; justify-content: center; font-size: 10px; font-weight: bold; color: white; text-shadow: 1px 1px 2px rgba(0,0,0,0.8);">' + playerNumber + '</div>';
      } else {
        playerDot = '<div class="dot" style="background: ' + (isHome ? '#007bff' : '#dc3545') + '; width: 35px; height: 35px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: bold; color: white;">' + playerNumber + '</div>';
      }
      
      playerEl.innerHTML = playerDot +
        '<div class="pname" title="' + Common.esc(playerName) + (playerPosition ? ' (' + playerPosition + ')' : '') + '" style="font-size: 10px; text-align: center; margin-top: 2px; max-width: 60px; word-break: break-word;">' + 
        Common.esc(playerName) + '</div>';
        
      pitch.appendChild(playerEl);
    }

    function showPlayerModalCompat(playerData, inst) {
      // Create modal if it doesn't exist
      var modal = document.getElementById('player-modal-compat-' + inst.id);
      if (!modal) {
        modal = createPlayerModalCompat(inst);
        document.body.appendChild(modal);
      }
      
      // Populate modal with player data
      populatePlayerModalCompat(modal, playerData);
      
      // Show modal
      modal.style.display = 'flex';
      document.body.style.overflow = 'hidden';
    }

    function createPlayerModalCompat(inst) {
      var modal = document.createElement('div');
      modal.id = 'player-modal-compat-' + inst.id;
      modal.className = 'cslf-player-modal';
      modal.innerHTML = 
        '<div class="cslf-modal-overlay"></div>' +
        '<div class="cslf-modal-content">' +
          '<div class="cslf-modal-header">' +
            '<div class="cslf-player-info">' +
              '<div class="cslf-player-photo">' +
                '<img src="" alt="" class="cslf-player-img">' +
                '<div class="cslf-player-rating"></div>' +
                '<div class="cslf-player-badge"></div>' +
              '</div>' +
              '<div class="cslf-player-name"></div>' +
            '</div>' +
          '</div>' +
          '<div class="cslf-modal-body">' +
            '<div class="cslf-player-basic">' +
              '<div class="cslf-basic-item">' +
                '<span class="cslf-basic-label">Position</span>' +
                '<span class="cslf-basic-value"></span>' +
              '</div>' +
              '<div class="cslf-basic-item">' +
                '<span class="cslf-basic-label">Âge</span>' +
                '<span class="cslf-basic-value"></span>' +
              '</div>' +
              '<div class="cslf-basic-item">' +
                '<span class="cslf-basic-label">Pays</span>' +
                '<span class="cslf-basic-value"></span>' +
              '</div>' +
            '</div>' +
            '<div class="cslf-player-data">' +
              '<div class="cslf-data-title">Données du joueur</div>' +
              '<div class="cslf-data-text"></div>' +
            '</div>' +
            '<div class="cslf-player-stats">' +
              '<div class="cslf-stats-title">Meilleurs statistiques</div>' +
              '<div class="cslf-stats-grid">' +
                '<div class="cslf-stat-item">' +
                  '<div class="cslf-stat-label">Minutes jouées</div>' +
                  '<div class="cslf-stat-value"></div>' +
                '</div>' +
                '<div class="cslf-stat-item">' +
                  '<div class="cslf-stat-label">Buts</div>' +
                  '<div class="cslf-stat-value"></div>' +
                '</div>' +
                '<div class="cslf-stat-item">' +
                  '<div class="cslf-stat-label">Passes décisives</div>' +
                  '<div class="cslf-stat-value"></div>' +
                '</div>' +
                '<div class="cslf-stat-item">' +
                  '<div class="cslf-stat-label">Nombre de tirs</div>' +
                  '<div class="cslf-stat-value"></div>' +
                '</div>' +
              '</div>' +
            '</div>' +
          '</div>' +
          '<button class="cslf-modal-close">×</button>' +
        '</div>';
      
      // Add event listeners
      modal.querySelector('.cslf-modal-overlay').addEventListener('click', function() { hidePlayerModalCompat(inst); });
      modal.querySelector('.cslf-modal-close').addEventListener('click', function() { hidePlayerModalCompat(inst); });
      
      return modal;
    }

    function populatePlayerModalCompat(modal, playerData) {
      // Basic player info
      var playerImg = modal.querySelector('.cslf-player-img');
      var playerName = modal.querySelector('.cslf-player-name');
      var playerRating = modal.querySelector('.cslf-player-rating');
      var playerBadge = modal.querySelector('.cslf-player-badge');
      
      // Extract player info from the detailed API structure
      var player = playerData.player || {};
      var stats = playerData.statistics && playerData.statistics[0] || {};
      var games = stats.games || {};
      
      if (player.photo) {
        playerImg.src = player.photo;
        playerImg.alt = player.name || '';
      }
      
      playerName.textContent = player.name || 'Joueur inconnu';
      
      // Rating and badge
      var rating = games.rating || 'N/A';
      playerRating.textContent = rating;
      
      // Display rating in badge with color based on rating (same algorithm as composition)
      if (rating !== 'N/A' && !isNaN(parseFloat(rating))) {
        var ratingNum = parseFloat(rating);
        var isMVP = ratingNum >= 8.5;
        
        // Add star for MVP like in composition
        console.log('Rating:', ratingNum, 'isMVP:', isMVP);
        playerBadge.textContent = ratingNum.toFixed(1) + (isMVP ? ' ⭐' : '');
        playerBadge.className = 'cslf-player-badge';
        
        // Apply color based on rating (same as composition)
        if (ratingNum < 5) {
          playerBadge.style.backgroundColor = '#dc3545'; // Red for poor rating
          playerBadge.style.border = '1px solid #dc3545';
          playerBadge.title = 'Performance très faible';
        } else if (ratingNum >= 5 && ratingNum < 7) {
          playerBadge.style.backgroundColor = '#fd7e14'; // Orange for average rating
          playerBadge.style.border = '1px solid #fd7e14';
          playerBadge.title = 'Performance moyenne';
        } else if (ratingNum >= 7 && ratingNum < 8.5) {
          playerBadge.style.backgroundColor = '#28a745'; // Green for good rating
          playerBadge.style.border = '1px solid #28a745';
          playerBadge.title = 'Bonne performance';
        } else if (ratingNum >= 8.5) {
          playerBadge.style.backgroundColor = '#007bff'; // Blue for excellent rating
          playerBadge.style.border = '1px solid #007bff';
          playerBadge.title = 'Joueur du match';
        }
        
        // Add special MVP styling like in composition
        if (isMVP) {
          playerBadge.style.boxShadow = '0 0 10px rgba(255, 215, 0, 0.8)';
          playerBadge.style.border = '2px solid #ffd700';
        }
      } else {
        playerBadge.innerHTML = '';
        playerBadge.title = '';
        playerBadge.style.backgroundColor = '';
        playerBadge.style.border = '';
        playerBadge.style.boxShadow = '';
      }
      
      // Basic info
      var positionEl = modal.querySelector('.cslf-basic-item:nth-child(1) .cslf-basic-value');
      var ageEl = modal.querySelector('.cslf-basic-item:nth-child(2) .cslf-basic-value');
      var countryEl = modal.querySelector('.cslf-basic-item:nth-child(3) .cslf-basic-value');
      
      positionEl.textContent = games.position || 'N/A';
      ageEl.textContent = player.age || 'N/A';
      countryEl.textContent = player.nationality || 'N/A';
      
      // Player data text
      var dataText = modal.querySelector('.cslf-data-text');
      if (parseFloat(rating) >= 8.5) {
        dataText.textContent = player.name + ' a été élu Joueur du match avec une note de ' + rating + '.';
      } else {
        dataText.textContent = 'Informations sur ' + player.name + '.';
      }
      
      // Comprehensive statistics from the detailed API organized by specific categories
      var statsData = [
        // Informations générales
        { category: 'Informations générales', label: 'Minutes jouées', value: games.minutes || '0' },
        { category: 'Informations générales', label: 'Numéro', value: games.number || 'N/A' },
        { category: 'Informations générales', label: 'Capitaine', value: games.captain ? 'Oui' : 'Non' },
        
        // Buts
        { category: 'Buts', label: 'Buts', value: stats.goals && stats.goals.total || '0' },
        { category: 'Buts', label: 'Passes décisives', value: stats.goals && stats.goals.assists || '0' },
        { category: 'Buts', label: 'Arrêts', value: stats.goals && stats.goals.saves || '0' },
        
        // Passes
        { category: 'Passes', label: 'Passes', value: stats.passes && stats.passes.total || '0' },
        { category: 'Passes', label: 'Précision passes', value: (stats.passes && stats.passes.accuracy || '0') + '%' },
        { category: 'Passes', label: 'Passes clés', value: stats.passes && stats.passes.key || '0' },
        
        // Tacles
        { category: 'Tacles', label: 'Tacles', value: stats.tackles && stats.tackles.total || '0' },
        { category: 'Tacles', label: 'Interceptions', value: stats.tackles && stats.tackles.interceptions || '0' },
        { category: 'Tacles', label: 'Blocages', value: stats.tackles && stats.tackles.blocks || '0' },
        
        // Duels
        { category: 'Duels', label: 'Duels gagnés', value: (stats.duels && stats.duels.won || '0') + '/' + (stats.duels && stats.duels.total || '0') },
        
        // Dribbles
        { category: 'Dribbles', label: 'Dribbles', value: (stats.dribbles && stats.dribbles.success || '0') + '/' + (stats.dribbles && stats.dribbles.attempts || '0') },
        
        // Tirs
        { category: 'Tirs', label: 'Tirs', value: stats.shots && stats.shots.total || '0' },
        { category: 'Tirs', label: 'Tirs cadrés', value: stats.shots && stats.shots.on || '0' },
        
        // Fautes
        { category: 'Fautes', label: 'Fautes subies', value: stats.fouls && stats.fouls.drawn || '0' },
        { category: 'Fautes', label: 'Fautes commises', value: stats.fouls && stats.fouls.committed || '0' },
        
        // Cartons
        { category: 'Cartons', label: 'Cartons jaunes', value: stats.cards && stats.cards.yellow || '0' },
        { category: 'Cartons', label: 'Cartons rouges', value: stats.cards && stats.cards.red || '0' },
        
        // Hors-jeu
        { category: 'Hors-jeu', label: 'Hors-jeu', value: stats.offsides || '0' }
      ];
      
      // Update the stats grid with more comprehensive data organized by categories
      var statsGrid = modal.querySelector('.cslf-stats-grid');
      if (statsGrid) {
        statsGrid.innerHTML = '';
        
        // Group stats by category
        var categories = {};
        statsData.forEach(function(stat) {
          if (!categories[stat.category]) {
            categories[stat.category] = [];
          }
          categories[stat.category].push(stat);
        });
        
        // Create sections for each category
        Object.keys(categories).forEach(function(categoryName) {
          // Add category title
          var categoryTitle = document.createElement('div');
          categoryTitle.className = 'cslf-category-title';
          categoryTitle.textContent = categoryName;
          statsGrid.appendChild(categoryTitle);
          
          // Add stats for this category
          categories[categoryName].forEach(function(stat) {
            var statItem = document.createElement('div');
            statItem.className = 'cslf-stat-item';
            statItem.innerHTML = 
              '<div class="cslf-stat-label">' + stat.label + '</div>' +
              '<div class="cslf-stat-value">' + stat.value + '</div>';
            statsGrid.appendChild(statItem);
          });
        });
      }
    }

    function hidePlayerModalCompat(inst) {
      var modal = document.getElementById('player-modal-compat-' + inst.id);
      if (modal) {
        modal.style.display = 'none';
        document.body.style.overflow = '';
      }
    }

    function showPlayerModalCompat(playerData, inst) {
      // Create modal if it doesn't exist
      var modal = document.getElementById('player-modal-compat-' + inst.id);
      if (!modal) {
        modal = createPlayerModalCompat(inst);
        document.body.appendChild(modal);
      }
      
      // Populate modal with player data
      populatePlayerModalCompat(modal, playerData);
      
      // Show modal
      modal.style.display = 'flex';
      document.body.style.overflow = 'hidden';
    }

    function createPlayerModalCompat(inst) {
      var modal = document.createElement('div');
      modal.id = 'player-modal-compat-' + inst.id;
      modal.className = 'cslf-player-modal';
      modal.innerHTML = `
        <div class="cslf-modal-overlay"></div>
        <div class="cslf-modal-content">
          <div class="cslf-modal-header">
            <div class="cslf-player-info">
              <div class="cslf-player-photo">
                <img class="cslf-player-img" src="" alt="">
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
      modal.querySelector('.cslf-modal-overlay').addEventListener('click', function() { hidePlayerModalCompat(inst); });
      modal.querySelector('.cslf-modal-close').addEventListener('click', function() { hidePlayerModalCompat(inst); });
      
      return modal;
    }

    function populatePlayerModalCompat(modal, playerData) {
      // Extract player info from the detailed API structure
      var player = playerData.player || {};
      var stats = playerData.statistics && playerData.statistics[0] || {};
      var games = stats.games || {};
      
      // Basic player info
      var playerImg = modal.querySelector('.cslf-player-img');
      var playerName = modal.querySelector('.cslf-player-name');
      var playerRating = modal.querySelector('.cslf-player-rating');
      var playerBadge = modal.querySelector('.cslf-player-badge');
      
      if (player.photo) {
        playerImg.src = player.photo;
        playerImg.alt = player.name || '';
      }
      
      playerName.textContent = player.name || 'Joueur inconnu';
      
      // Rating and badge
      var rating = games.rating || 'N/A';
      playerRating.textContent = rating;
      
      // Display rating in badge with color based on rating (same algorithm as composition)
      if (rating !== 'N/A' && !isNaN(parseFloat(rating))) {
        var ratingNum = parseFloat(rating);
        var isMVP = ratingNum >= 8.5;
        
        // Add star for MVP like in composition
        console.log('Rating:', ratingNum, 'isMVP:', isMVP);
        playerBadge.textContent = ratingNum.toFixed(1) + (isMVP ? ' ⭐' : '');
        playerBadge.className = 'cslf-player-badge';
        
        // Apply color based on rating (same as composition)
        if (ratingNum < 5) {
          playerBadge.style.backgroundColor = '#dc3545'; // Red for poor rating
          playerBadge.style.border = '1px solid #dc3545';
          playerBadge.title = 'Performance très faible';
        } else if (ratingNum >= 5 && ratingNum < 7) {
          playerBadge.style.backgroundColor = '#fd7e14'; // Orange for average rating
          playerBadge.style.border = '1px solid #fd7e14';
          playerBadge.title = 'Performance moyenne';
        } else if (ratingNum >= 7 && ratingNum < 8.5) {
          playerBadge.style.backgroundColor = '#28a745'; // Green for good rating
          playerBadge.style.border = '1px solid #28a745';
          playerBadge.title = 'Bonne performance';
        } else if (ratingNum >= 8.5) {
          playerBadge.style.backgroundColor = '#007bff'; // Blue for excellent rating
          playerBadge.style.border = '1px solid #007bff';
          playerBadge.title = 'Joueur du match';
        }
        
        // Add special MVP styling like in composition
        if (isMVP) {
          playerBadge.style.boxShadow = '0 0 10px rgba(255, 215, 0, 0.8)';
          playerBadge.style.border = '2px solid #ffd700';
        }
      } else {
        playerBadge.innerHTML = '';
        playerBadge.title = '';
        playerBadge.style.backgroundColor = '';
        playerBadge.style.border = '';
        playerBadge.style.boxShadow = '';
      }
      
      // Basic info
      var positionEl = modal.querySelector('.cslf-basic-item:nth-child(1) .cslf-basic-value');
      var ageEl = modal.querySelector('.cslf-basic-item:nth-child(2) .cslf-basic-value');
      var countryEl = modal.querySelector('.cslf-basic-item:nth-child(3) .cslf-basic-value');
      
      positionEl.textContent = games.position || 'N/A';
      ageEl.textContent = player.age || 'N/A';
      countryEl.textContent = player.nationality || 'N/A';
      
      // Player data text
      var dataText = modal.querySelector('.cslf-data-text');
      if (parseFloat(rating) >= 8.5) {
        dataText.textContent = player.name + ' a été élu Joueur du match avec une note de ' + rating + '.';
      } else {
        dataText.textContent = 'Informations sur ' + player.name + '.';
      }
      
      // Comprehensive statistics from the detailed API organized by specific categories
      var statsData = [
        // Informations générales
        { category: 'Informations générales', label: 'Minutes jouées', value: games.minutes || '0' },
        { category: 'Informations générales', label: 'Numéro', value: games.number || 'N/A' },
        { category: 'Informations générales', label: 'Capitaine', value: games.captain ? 'Oui' : 'Non' },
        
        // Buts
        { category: 'Buts', label: 'Buts', value: stats.goals && stats.goals.total || '0' },
        { category: 'Buts', label: 'Passes décisives', value: stats.goals && stats.goals.assists || '0' },
        { category: 'Buts', label: 'Arrêts', value: stats.goals && stats.goals.saves || '0' },
        
        // Passes
        { category: 'Passes', label: 'Passes', value: stats.passes && stats.passes.total || '0' },
        { category: 'Passes', label: 'Précision passes', value: (stats.passes && stats.passes.accuracy || '0') + '%' },
        { category: 'Passes', label: 'Passes clés', value: stats.passes && stats.passes.key || '0' },
        
        // Tacles
        { category: 'Tacles', label: 'Tacles', value: stats.tackles && stats.tackles.total || '0' },
        { category: 'Tacles', label: 'Interceptions', value: stats.tackles && stats.tackles.interceptions || '0' },
        { category: 'Tacles', label: 'Blocages', value: stats.tackles && stats.tackles.blocks || '0' },
        
        // Duels
        { category: 'Duels', label: 'Duels gagnés', value: (stats.duels && stats.duels.won || '0') + '/' + (stats.duels && stats.duels.total || '0') },
        
        // Dribbles
        { category: 'Dribbles', label: 'Dribbles', value: (stats.dribbles && stats.dribbles.success || '0') + '/' + (stats.dribbles && stats.dribbles.attempts || '0') },
        
        // Tirs
        { category: 'Tirs', label: 'Tirs', value: stats.shots && stats.shots.total || '0' },
        { category: 'Tirs', label: 'Tirs cadrés', value: stats.shots && stats.shots.on || '0' },
        
        // Fautes
        { category: 'Fautes', label: 'Fautes subies', value: stats.fouls && stats.fouls.drawn || '0' },
        { category: 'Fautes', label: 'Fautes commises', value: stats.fouls && stats.fouls.committed || '0' },
        
        // Cartons
        { category: 'Cartons', label: 'Cartons jaunes', value: stats.cards && stats.cards.yellow || '0' },
        { category: 'Cartons', label: 'Cartons rouges', value: stats.cards && stats.cards.red || '0' },
        
        // Hors-jeu
        { category: 'Hors-jeu', label: 'Hors-jeu', value: stats.offsides || '0' }
      ];
      
      // Update the stats grid with more comprehensive data organized by categories
      var statsGrid = modal.querySelector('.cslf-stats-grid');
      if (statsGrid) {
        statsGrid.innerHTML = '';
        
        // Group stats by category
        var categories = {};
        statsData.forEach(function(stat) {
          if (!categories[stat.category]) {
            categories[stat.category] = [];
          }
          categories[stat.category].push(stat);
        });
        
        // Create sections for each category
        Object.keys(categories).forEach(function(categoryName) {
          // Add category title
          var categoryTitle = document.createElement('div');
          categoryTitle.className = 'cslf-category-title';
          categoryTitle.textContent = categoryName;
          statsGrid.appendChild(categoryTitle);
          
          // Add stats for this category
          categories[categoryName].forEach(function(stat) {
            var statItem = document.createElement('div');
            statItem.className = 'cslf-stat-item';
            statItem.innerHTML = 
              '<div class="cslf-stat-label">' + stat.label + '</div>' +
              '<div class="cslf-stat-value">' + stat.value + '</div>';
            statsGrid.appendChild(statItem);
          });
        });
      }
    }

    function hidePlayerModalCompat(inst) {
      var modal = document.getElementById('player-modal-compat-' + inst.id);
      if (modal) {
        modal.style.display = 'none';
        document.body.style.overflow = '';
      }
    }

    
  });
})(window, document);
