/**
 * CSLF Detail - Substitution Module (Complete)
 * Handles all substitution-related functionality including:
 * - Substitution data extraction from events
 * - Coach information display
 * - Substitute players rendering
 * - Changements (substitutions that occurred)
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

    // Complete Substitution Module
    var SubstitutionModule = {
      init: function(inst) {
        this.instance = inst;
        this.instanceId = typeof inst === 'string' ? inst : (inst.id || inst);
        
        this.bindEvents();
      },

      bindEvents: function() {
        var self = this;
        
        // Listen for lineups data from core
        Common.on(self.instance, 'lineups', function(e) {
          self.renderSubstitutions(e.detail);
        });
        
        // Listen for events data to get substitution information
        Common.on(self.instance, 'events', function(e) {
          self.eventsData = e.detail;
        });
        
        // Listen for resume tab activation
        Common.on(self.instance, 'tab:resume:show', function(e) {
          // Try to get cached data and render
          var cached = Common.getCache(self.instance);
          if (cached && cached.lineups) {
            self.renderSubstitutions(cached.lineups);
          }
        });
      },

      // Extract substitution data from events
      extractSubstitutionData: function(events) {
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
      },

      // Get position name from position code
      getPositionName: function(pos) {
        var positions = {
          'G': 'Gardien', 'GK': 'Gardien',
          'D': 'Défenseur', 'D1': 'Défenseur', 'D2': 'Défenseur', 'D3': 'Défenseur',
          'M': 'Milieu', 'M1': 'Milieu', 'M2': 'Milieu', 'M3': 'Milieu',
          'F': 'Attaquant', 'F1': 'Attaquant', 'F2': 'Attaquant'
        };
        return positions[pos] || pos || 'Joueur';
      },

      // Get first name from full name
      getFirstName: function(name) {
        if (!name) return '';
        return name.split(' ')[0];
      },

      renderSubstitutions: function(lineupsData) {
        if (!lineupsData || lineupsData.length < 2) return;
        
        var H = lineupsData[0]; // Home team
        var A = lineupsData[1]; // Away team
        
        // Create or find substitutes container
        var subsContainer = this.instance.root.querySelector('#subs-' + this.instanceId);
        if (!subsContainer) {
          // Create substitutes section if it doesn't exist
          var composPane = this.instance.root.querySelector('[data-pane="compos"]');
          if (composPane) {
            var subsSection = d.createElement('div');
            subsSection.className = 'cslf-section';
            subsSection.style.marginTop = '20px';
            subsSection.innerHTML = '<div class="cslf-section">Remplaçants & Entraîneurs</div><div id="subs-' + this.instanceId + '"></div>';
            composPane.appendChild(subsSection);
            subsContainer = d.getElementById('subs-' + this.instanceId);
          }
        }
        
        if (!subsContainer) return;
        
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
        subsHtml += '<div><div style="font-weight: bold; font-size: 16px;">' + Common.esc(this.getFirstName(H.coach?.name || H.coachName || 'N/A')) + '</div><div style="color: #ccc; font-size: 12px;">Entraîneur</div></div>';
        subsHtml += '</div>';
        subsHtml += '<div style="display: flex; align-items: center; gap: 12px; justify-content: flex-end;">';
        if (A.coach?.photo || A.coachPhoto) {
          subsHtml += '<img src="' + Common.esc(A.coach?.photo || A.coachPhoto) + '" alt="Coach" style="width: 50px; height: 50px; border-radius: 50%; object-fit: cover;">';
        } else {
          subsHtml += '<div style="width: 50px; height: 50px; border-radius: 50%; background: #666; display: flex; align-items: center; justify-content: center; font-size: 16px;">👨‍💼</div>';
        }
        subsHtml += '<div><div style="font-weight: bold; font-size: 16px;">' + Common.esc(this.getFirstName(A.coach?.name || A.coachName || 'N/A')) + '</div><div style="color: #ccc; font-size: 12px;">Entraîneur</div></div>';
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
            var playerPosition = this.getPositionName(sub.player?.position || sub.player?.pos || sub.pos || '');
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
            
            // Create substitution info
            var substitutionInfo = '';
            var subInTime = sub.player?.subIn || '';
            var subOutTime = sub.player?.subOut || '';
            
            if (subInTime) {
              substitutionInfo = '<span style="background: #28a745; color: white; padding: 2px 6px; border-radius: 10px; font-size: 10px;">IN ' + subInTime + "'</span>";
            } else if (subOutTime) {
              substitutionInfo = '<span style="background: #dc3545; color: white; padding: 2px 6px; border-radius: 10px; font-size: 10px;">OUT ' + subOutTime + "'</span>";
            }
            
            // Create performance stats with icons
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
            subsHtml += '<div style="color: #fff; font-weight: bold; font-size: 16px;">' + playerNumber + ' ' + Common.esc(this.getFirstName(playerName)) + '</div>';
            
            // Player position
            subsHtml += '<div style="color: #ccc; font-size: 14px;">' + Common.esc(playerPosition) + '</div>';
            
            // Badges positioned on image
            subsHtml += '<div class="substitution-time">' + substitutionInfo + '</div>';
            subsHtml += '<div class="rating-badge">' + ratingBadgeHtml + '</div>';
            subsHtml += '<div class="performance-stats">' + performanceStats + '</div>';
            subsHtml += '<div class="cards-info">' + cardsInfo + '</div>';
            subsHtml += '</div>';
            subsHtml += '</div>';
          }.bind(this));
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
            var playerPosition = this.getPositionName(sub.player?.position || sub.player?.pos || sub.pos || '');
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
            
            // Create substitution info
            var substitutionInfo = '';
            var subInTime = sub.player?.subIn || '';
            var subOutTime = sub.player?.subOut || '';
            
            if (subInTime) {
              substitutionInfo = '<span style="background: #28a745; color: white; padding: 2px 6px; border-radius: 10px; font-size: 10px;">IN ' + subInTime + "'</span>";
            } else if (subOutTime) {
              substitutionInfo = '<span style="background: #dc3545; color: white; padding: 2px 6px; border-radius: 10px; font-size: 10px;">OUT ' + subOutTime + "'</span>";
            }
            
            // Create performance stats with icons
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
            subsHtml += '<div style="color: #fff; font-weight: bold; font-size: 16px;">' + playerNumber + ' ' + Common.esc(this.getFirstName(playerName)) + '</div>';
            
            // Player position
            subsHtml += '<div style="color: #ccc; font-size: 14px;">' + Common.esc(playerPosition) + '</div>';
            
            // Badges positioned on image
            subsHtml += '<div class="substitution-time">' + substitutionInfo + '</div>';
            subsHtml += '<div class="rating-badge">' + ratingBadgeHtml + '</div>';
            subsHtml += '<div class="performance-stats">' + performanceStats + '</div>';
            subsHtml += '<div class="cards-info">' + cardsInfo + '</div>';
            subsHtml += '</div>';
            subsHtml += '</div>';
          }.bind(this));
        }
        subsHtml += '</div>';
        subsHtml += '</div>';
        subsHtml += '</div>';
        subsHtml += '</div>';
        
        // Update the container
        subsContainer.innerHTML = subsHtml;
      }
    };

    // Initialize substitution module for all detail instances
    d.addEventListener('DOMContentLoaded', function() {
      var nodes = d.querySelectorAll('.cslf-detail[id], .cslf-detail[data-instance]');
      nodes.forEach(function(root) {
        var inst = Common.fromNode(root);
        if (inst) {
          var moduleInstance = Object.create(SubstitutionModule);
          moduleInstance.init(inst);
        }
      });
    });

    // Export module
    w.CSLF = w.CSLF || {};
    w.CSLF.SubstitutionModule = SubstitutionModule;
  });
})(window, document);