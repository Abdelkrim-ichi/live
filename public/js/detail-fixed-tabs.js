/**
 * CSLF Detail - Fixed Tabs Module
 * Handles sticky/fixed tabs that remain visible when scrolling
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

    // Fixed Tabs Module
    var FixedTabsModule = {
      init: function(inst) {
        this.instance = inst;
        
        // Ensure instance is a string
        var instanceId = typeof inst === 'string' ? inst : (inst.id || inst);
        this.$container = $('#' + instanceId);
        this.$tabs = this.$container.find('.cslf-tabs');
        this.$headbar = this.$container.find('.cslf-headbar');
        this.$matchHeader = this.$container.find('.cslf-match-header');
        
        this.isFixed = false;
        this.originalTop = 0;
        this.tabsHeight = 0;
        
        this.bindEvents();
        this.setupFixedTabs();
      },

      bindEvents: function() {
        var self = this;
        
        // Listen for window scroll
        $(window).on('scroll.fixedTabs', function() {
          self.handleScroll();
        });
        
        // Listen for window resize
        $(window).on('resize.fixedTabs', function() {
          self.handleResize();
        });
        
        // Listen for tab changes
        Common.on(self.instance, 'tabChanged', function(e) {
          self.handleTabChange(e.detail);
        });
      },

      setupFixedTabs: function() {
        if (!this.$tabs.length) return;
        
        // Store original position
        this.originalTop = this.$tabs.offset().top;
        this.tabsHeight = this.$tabs.outerHeight();
        
        // Add CSS for fixed tabs
        this.addFixedTabsCSS();
        
        // Create fixed tabs clone
        this.createFixedTabsClone();
      },

      addFixedTabsCSS: function() {
        var cssId = 'cslf-fixed-tabs-css';
        if ($('#' + cssId).length) return; // Already added
        
        var css = `
          <style id="${cssId}">
            .cslf-tabs-fixed {
              position: fixed !important;
              top: 0 !important;
              left: 0 !important;
              right: 0 !important;
              z-index: 1000 !important;
              background: #fff !important;
              border-bottom: 1px solid #e6e8ec !important;
              box-shadow: 0 2px 4px rgba(0,0,0,0.1) !important;
              transition: all 0.3s ease !important;
            }
            
            .cslf-tabs-fixed .tablink {
              padding: 12px 16px !important;
              font-size: 14px !important;
              font-weight: 600 !important;
            }
            
            .cslf-tabs-spacer {
              height: 0 !important;
              transition: height 0.3s ease !important;
            }
            
            .cslf-tabs-spacer.active {
              height: 50px !important;
            }
            
            @media (max-width: 768px) {
              .cslf-tabs-fixed {
                padding: 0 16px !important;
              }
              
              .cslf-tabs-fixed .tablink {
                padding: 10px 12px !important;
                font-size: 13px !important;
              }
              
              .cslf-tabs-spacer.active {
                height: 45px !important;
              }
            }
            
            @media (max-width: 480px) {
              .cslf-tabs-fixed .tablink {
                padding: 8px 10px !important;
                font-size: 12px !important;
              }
              
              .cslf-tabs-spacer.active {
                height: 42px !important;
              }
            }
          </style>
        `;
        
        $('head').append(css);
      },

      createFixedTabsClone: function() {
        if (!this.$tabs.length) return;
        
        // Create spacer div
        this.$spacer = $('<div class="cslf-tabs-spacer"></div>');
        this.$tabs.after(this.$spacer);
        
        // Clone tabs for fixed version
        this.$fixedTabs = this.$tabs.clone().addClass('cslf-tabs-fixed').hide();
        $('body').append(this.$fixedTabs);
        
        // Bind click events to fixed tabs
        this.bindFixedTabEvents();
      },

      bindFixedTabEvents: function() {
        var self = this;
        
        this.$fixedTabs.find('.tablink').on('click', function(e) {
          e.preventDefault();
          
          var $clickedTab = $(this);
          var tabName = $clickedTab.data('tab');
          
          // Update original tabs
          self.$tabs.find('.tablink').removeClass('is-active');
          self.$tabs.find('.tablink[data-tab="' + tabName + '"]').addClass('is-active');
          
          // Update fixed tabs
          self.$fixedTabs.find('.tablink').removeClass('is-active');
          $clickedTab.addClass('is-active');
          
          // Show corresponding pane
          self.$container.find('.cslf-pane').removeClass('is-active');
          self.$container.find('.cslf-pane[data-pane="' + tabName + '"]').addClass('is-active');
          
          // Trigger custom event
          Common.trigger(self.instance, 'tabChanged', { tab: tabName });
          
          // Scroll to top of content
          self.scrollToContent();
        });
      },

      handleScroll: function() {
        var scrollTop = $(window).scrollTop();
        var shouldBeFixed = scrollTop > this.originalTop;
        
        if (shouldBeFixed && !this.isFixed) {
          this.makeFixed();
        } else if (!shouldBeFixed && this.isFixed) {
          this.makeUnfixed();
        }
      },

      handleResize: function() {
        // Recalculate positions
        this.originalTop = this.$tabs.offset().top;
        this.tabsHeight = this.$tabs.outerHeight();
      },

      makeFixed: function() {
        if (this.isFixed) return;
        
        this.isFixed = true;
        
        // Show fixed tabs
        this.$fixedTabs.show();
        
        // Activate spacer
        this.$spacer.addClass('active');
        
        // Sync tab states
        this.syncTabStates();
        
        // Add body class for additional styling
        $('body').addClass('cslf-tabs-fixed-active');
      },

      makeUnfixed: function() {
        if (!this.isFixed) return;
        
        this.isFixed = false;
        
        // Hide fixed tabs
        this.$fixedTabs.hide();
        
        // Deactivate spacer
        this.$spacer.removeClass('active');
        
        // Remove body class
        $('body').removeClass('cslf-tabs-fixed-active');
      },

      syncTabStates: function() {
        var activeTab = this.$tabs.find('.tablink.is-active').data('tab');
        if (activeTab) {
          this.$fixedTabs.find('.tablink').removeClass('is-active');
          this.$fixedTabs.find('.tablink[data-tab="' + activeTab + '"]').addClass('is-active');
        }
      },

      scrollToContent: function() {
        var contentTop = this.originalTop + this.tabsHeight;
        var currentScroll = $(window).scrollTop();
        
        // Only scroll if we're above the content
        if (currentScroll < contentTop) {
          $('html, body').animate({
            scrollTop: contentTop
          }, 300);
        }
      },

      handleTabChange: function(detail) {
        // Handle any additional logic when tabs change
        console.log('Tab changed to:', detail.tab);
      },

      destroy: function() {
        // Clean up event listeners
        $(window).off('scroll.fixedTabs resize.fixedTabs');
        
        // Remove fixed tabs clone
        if (this.$fixedTabs) {
          this.$fixedTabs.remove();
        }
        
        // Remove spacer
        if (this.$spacer) {
          this.$spacer.remove();
        }
        
        // Remove body class
        $('body').removeClass('cslf-tabs-fixed-active');
        
        // Remove CSS
        $('#cslf-fixed-tabs-css').remove();
      }
    };

    // Initialize fixed tabs module for all detail instances
    d.addEventListener('DOMContentLoaded', function() {
      var nodes = d.querySelectorAll('.cslf-detail[id], .cslf-detail[data-instance]');
      nodes.forEach(function(root) {
        var inst = Common.fromNode(root);
        if (inst) {
          // Create a new instance of the module for each detail instance
          var moduleInstance = Object.create(FixedTabsModule);
          moduleInstance.init(inst);
        }
      });
    });

    // Export module for global access
    w.CSLF = w.CSLF || {};
    w.CSLF.FixedTabsModule = FixedTabsModule;
  });
})(window, document);
