/**
 * CSLF Detail - Top Stats Module (Simplified)
 * Just renders the top stats when data is available
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

    // Simple Top Stats Module
    var TopStatsModule = {
      init: function(inst) {
        this.instance = inst;
        this.instanceId = typeof inst === 'string' ? inst : (inst.id || inst);
        
        this.bindEvents();
      },

      bindEvents: function() {
        var self = this;
        
        // Listen for stats data from core
        Common.on(self.instance, 'stats', function(e) {
          self.renderTopStats(e.detail);
        });
        
        // Listen for resume tab activation
        Common.on(self.instance, 'tab:resume:show', function(e) {
          // Try to get cached data and render
          var cached = Common.getCache(self.instance);
          if (cached && cached.stats) {
            self.renderTopStats(cached.stats);
          }
        });
      },

      renderTopStats: function(statsData) {
        if (!statsData) return;
        
        // Handle different data structures
        var homeStats, awayStats;
        
        if (Array.isArray(statsData)) {
          // If it's an array, take first two elements
          if (statsData.length >= 2) {
            homeStats = statsData[0];
            awayStats = statsData[1];
          } else {
            return; // Not enough data
          }
        } else if (statsData.statistics && Array.isArray(statsData.statistics)) {
          // If it's an object with statistics array
          homeStats = statsData.statistics[0];
          awayStats = statsData.statistics[1];
        } else {
          return; // Unknown data structure
        }
        
        // Update possession
        this.updatePossession(homeStats, awayStats);
        
        // Update key stats
        this.updateKeyStats(homeStats, awayStats);
      },

      updatePossession: function(homeStats, awayStats) {
        var homePossession = this.getStatValue(homeStats, 'Ball Possession');
        var awayPossession = this.getStatValue(awayStats, 'Ball Possession');
        
        // Default to 50-50 if no data
        if (!homePossession && !awayPossession) {
          homePossession = 50;
          awayPossession = 50;
        } else if (!homePossession) {
          homePossession = 100 - awayPossession;
        } else if (!awayPossession) {
          awayPossession = 100 - homePossession;
        }
        
        // Update UI
        var $posBar = $('#' + this.instanceId + '-posBarHome');
        if ($posBar.length) {
          $posBar.css('width', homePossession + '%');
        }
        
        var $posHome = $('#' + this.instanceId + '-posHome');
        var $posAway = $('#' + this.instanceId + '-posAway');
        
        if ($posHome.length) {
          $posHome.text(homePossession + '%');
        }
        if ($posAway.length) {
          $posAway.text(awayPossession + '%');
        }
      },

      updateKeyStats: function(homeStats, awayStats) {
        // Expected Goals (xG)
        var homeXG = this.getStatValue(homeStats, 'Expected Goals');
        var awayXG = this.getStatValue(awayStats, 'Expected Goals');
        
        var $xgHome = $('#' + this.instanceId + '-xgHome');
        var $xgAway = $('#' + this.instanceId + '-xgAway');
        
        if ($xgHome.length) {
          $xgHome.text(homeXG ? homeXG.toFixed(2) : '0.00');
        }
        if ($xgAway.length) {
          $xgAway.text(awayXG ? awayXG.toFixed(2) : '0.00');
        }
        
        // Total Shots
        var homeShots = this.getStatValue(homeStats, 'Total Shots');
        var awayShots = this.getStatValue(awayStats, 'Total Shots');
        
        var $shotsHome = $('#' + this.instanceId + '-shotsHome');
        var $shotsAway = $('#' + this.instanceId + '-shotsAway');
        
        if ($shotsHome.length) {
          $shotsHome.text(homeShots || '0');
        }
        if ($shotsAway.length) {
          $shotsAway.text(awayShots || '0');
        }
        
        // Big Chances (simplified)
        var $bcHome = $('#' + this.instanceId + '-bcHome');
        var $bcAway = $('#' + this.instanceId + '-bcAway');
        
        if ($bcHome.length) {
          $bcHome.text('0'); // Simplified for now
        }
        if ($bcAway.length) {
          $bcAway.text('0'); // Simplified for now
        }
      },

      getStatValue: function(stats, statName) {
        if (!stats) return null;
        
        // Make sure stats is an array
        var statsArray = Array.isArray(stats) ? stats : (stats.statistics || []);
        
        if (!Array.isArray(statsArray)) return null;
        
        var stat = statsArray.find(function(s) {
          return s.type === statName;
        });
        
        if (!stat || stat.value === null || stat.value === undefined) return null;
        
        // Handle percentage values
        if (typeof stat.value === 'string' && stat.value.includes('%')) {
          return parseFloat(stat.value.replace('%', ''));
        }
        
        // Handle numeric values
        var numValue = parseFloat(stat.value);
        return isNaN(numValue) ? null : numValue;
      }
    };

    // Initialize top stats module for all detail instances
    d.addEventListener('DOMContentLoaded', function() {
      var nodes = d.querySelectorAll('.cslf-detail[id], .cslf-detail[data-instance]');
      nodes.forEach(function(root) {
        var inst = Common.fromNode(root);
        if (inst) {
          var moduleInstance = Object.create(TopStatsModule);
          moduleInstance.init(inst);
        }
      });
    });

    // Export module
    w.CSLF = w.CSLF || {};
    w.CSLF.TopStatsModule = TopStatsModule;
  });
})(window, document);