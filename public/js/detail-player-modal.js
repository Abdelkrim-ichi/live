/**
 * CSLF Detail - Player Modal Module (Simplified)
 * Just handles player modal display
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

    // Simple Player Modal Module
    var PlayerModalModule = {
      init: function(inst) {
        this.instance = inst;
        this.instanceId = typeof inst === 'string' ? inst : (inst.id || inst);
        
        this.bindEvents();
        this.addModalCSS();
      },

      bindEvents: function() {
        var self = this;
        
        // Listen for show player modal events
        Common.on(self.instance, 'showPlayerModal', function(e) {
          self.showModal(e.detail.player);
        });
        
        // Listen for hide player modal events
        Common.on(self.instance, 'hidePlayerModal', function() {
          self.hideModal();
        });
      },

      addModalCSS: function() {
        var cssId = 'cslf-player-modal-css';
        if ($('#' + cssId).length) return;
        
        var css = `
          <style id="${cssId}">
            .cslf-player-modal-overlay {
              position: fixed !important;
              top: 0 !important;
              left: 0 !important;
              right: 0 !important;
              bottom: 0 !important;
              background: rgba(0, 0, 0, 0.7) !important;
              z-index: 2000 !important;
              display: flex !important;
              align-items: center !important;
              justify-content: center !important;
              opacity: 0 !important;
              visibility: hidden !important;
              transition: all 0.3s ease !important;
              padding: 20px !important;
            }
            
            .cslf-player-modal-overlay.show {
              opacity: 1 !important;
              visibility: visible !important;
            }
            
            .cslf-player-modal {
              background: #fff !important;
              border-radius: 12px !important;
              max-width: 500px !important;
              width: 100% !important;
              max-height: 90vh !important;
              overflow-y: auto !important;
              box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3) !important;
              transform: scale(0.9) !important;
              transition: transform 0.3s ease !important;
            }
            
            .cslf-player-modal-overlay.show .cslf-player-modal {
              transform: scale(1) !important;
            }
            
            .cslf-player-modal-header {
              display: flex !important;
              align-items: center !important;
              justify-content: space-between !important;
              padding: 20px !important;
              border-bottom: 1px solid #e6e8ec !important;
              background: #f8f9fa !important;
              border-radius: 12px 12px 0 0 !important;
            }
            
            .cslf-player-modal-title {
              font-size: 18px !important;
              font-weight: 700 !important;
              color: #111 !important;
              margin: 0 !important;
            }
            
            .cslf-player-modal-close {
              background: none !important;
              border: none !important;
              font-size: 24px !important;
              color: #666 !important;
              cursor: pointer !important;
              padding: 0 !important;
              width: 30px !important;
              height: 30px !important;
              display: flex !important;
              align-items: center !important;
              justify-content: center !important;
              border-radius: 50% !important;
              transition: all 0.2s ease !important;
            }
            
            .cslf-player-modal-close:hover {
              background: #e6e8ec !important;
              color: #111 !important;
            }
            
            .cslf-player-modal-content {
              padding: 20px !important;
            }
            
            .cslf-player-info {
              display: flex !important;
              align-items: center !important;
              gap: 16px !important;
              margin-bottom: 20px !important;
            }
            
            .cslf-player-photo {
              width: 80px !important;
              height: 80px !important;
              border-radius: 50% !important;
              object-fit: cover !important;
              border: 3px solid #e6e8ec !important;
            }
          </style>
        `;
        
        $('head').append(css);
      },

      showModal: function(playerData) {
        var modal = this.createModal(playerData);
        this.currentModal = modal;
        
        // Show modal
        modal.$overlay.addClass('show');
        
        // Prevent body scroll
        $('body').addClass('cslf-modal-open');
        
        // Focus management
        modal.$close.focus();
      },

      hideModal: function() {
        if (!this.currentModal) return;
        
        var modal = this.currentModal;
        
        // Hide modal
        modal.$overlay.removeClass('show');
        
        // Remove body scroll lock
        $('body').removeClass('cslf-modal-open');
        
        // Clean up after animation
        setTimeout(function() {
          modal.$overlay.remove();
        }, 300);
        
        this.currentModal = null;
      },

      createModal: function(playerData) {
        var modal = {
          $overlay: null,
          $modal: null,
          $close: null
        };
        
        // Create overlay
        modal.$overlay = $('<div class="cslf-player-modal-overlay"></div>');
        
        // Create modal content
        var modalHTML = this.generateModalHTML(playerData);
        modal.$modal = $(modalHTML);
        
        // Add to overlay
        modal.$overlay.append(modal.$modal);
        
        // Add to body
        $('body').append(modal.$overlay);
        
        // Get close button
        modal.$close = modal.$modal.find('.cslf-player-modal-close');
        
        // Bind events
        var self = this;
        
        // Close button click
        modal.$close.on('click', function() {
          self.hideModal();
        });
        
        // Overlay click
        modal.$overlay.on('click', function(e) {
          if (e.target === modal.$overlay[0]) {
            self.hideModal();
          }
        });
        
        // Escape key
        $(document).on('keydown.cslfModal', function(e) {
          if (e.key === 'Escape' && self.currentModal === modal) {
            self.hideModal();
          }
        });
        
        return modal;
      },

      generateModalHTML: function(playerData) {
        var player = playerData.player || playerData;
        var name = player.name || 'Joueur inconnu';
        var photo = player.photo || '';
        var number = player.number || '';
        
        var html = [
          '<div class="cslf-player-modal">',
          '<div class="cslf-player-modal-header">',
          '<h2 class="cslf-player-modal-title">Détails du joueur</h2>',
          '<button class="cslf-player-modal-close" aria-label="Fermer">×</button>',
          '</div>',
          '<div class="cslf-player-modal-content">',
          '<div class="cslf-player-info">',
          photo ? '<img src="' + photo + '" alt="' + name + '" class="cslf-player-photo">' : '<div class="cslf-player-photo" style="background:#e6e8ec;display:flex;align-items:center;justify-content:center;color:#666">👤</div>',
          '<div class="cslf-player-details">',
          '<h3>' + name + '</h3>',
          number ? '<div class="position">#' + number + '</div>' : '',
          '</div>',
          '</div>',
          '</div>',
          '</div>'
        ];
        
        return html.join('');
      }
    };

    // Initialize player modal module for all detail instances
    d.addEventListener('DOMContentLoaded', function() {
      var nodes = d.querySelectorAll('.cslf-detail[id], .cslf-detail[data-instance]');
      nodes.forEach(function(root) {
        var inst = Common.fromNode(root);
        if (inst) {
          var moduleInstance = Object.create(PlayerModalModule);
          moduleInstance.init(inst);
        }
      });
    });

    // Export module
    w.CSLF = w.CSLF || {};
    w.CSLF.PlayerModalModule = PlayerModalModule;
  });
})(window, document);