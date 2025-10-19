// Modern Sticky Plugin for jQuery
// Replaces the deprecated jquery.sticky.js with modern MutationObserver

(function($) {
    'use strict';

    var defaults = {
        topSpacing: 0,
        bottomSpacing: 0,
        className: 'is-sticky',
        wrapperClassName: 'sticky-wrapper',
        center: false,
        getWidthFrom: '',
        widthFromWrapper: true,
        responsiveWidth: false,
        zIndex: 'auto'
    };

    var $window = $(window);
    var $document = $(document);
    var sticked = [];
    var windowHeight = $window.height();
    var documentHeight = $document.height();
    var documentWidth = $document.width();
    var originalOffset = false;

    function getOriginalOffsetTop(element) {
        var offset = element.offset();
        return offset.top;
    }

    function getOriginalOffsetLeft(element) {
        var offset = element.offset();
        return offset.left;
    }

    function getOriginalWidth(element) {
        return element.outerWidth();
    }

    function getOriginalHeight(element) {
        return element.outerHeight();
    }

    function getOriginalPosition(element) {
        return {
            top: getOriginalOffsetTop(element),
            left: getOriginalOffsetLeft(element),
            width: getOriginalWidth(element),
            height: getOriginalHeight(element)
        };
    }

    function setStickyPosition(stickyElement, options) {
        var elementTop = stickyElement.offset().top;
        var elementHeight = stickyElement.outerHeight();
        var elementWidth = stickyElement.outerWidth();
        var elementLeft = stickyElement.offset().left;
        
        // Set wrapper height
        stickyElement.parent().css('height', elementHeight);
        
        var scrollTop = $window.scrollTop();
        var shouldStick = scrollTop >= (elementTop - options.topSpacing);
        
        if (shouldStick) {
            var newTop = options.topSpacing;
            var newLeft = elementLeft;
            var newWidth = elementWidth;
            
            // Handle width changes
            if (options.widthFromWrapper) {
                newWidth = stickyElement.parent().width();
            }
            
            stickyElement.css({
                position: 'fixed',
                top: newTop,
                left: newLeft,
                width: newWidth,
                zIndex: options.zIndex === 'auto' ? 999 : options.zIndex
            });
            
            stickyElement.parent().addClass(options.className);
            stickyElement.trigger('sticky-start', [options]);
        } else {
            stickyElement.css({
                position: '',
                top: '',
                left: '',
                width: '',
                zIndex: ''
            });
            
            stickyElement.parent().removeClass(options.className);
            stickyElement.trigger('sticky-end', [options]);
        }
    }

    function updateStickyPositions() {
        for (var i = 0; i < sticked.length; i++) {
            setStickyPosition(sticked[i].stickyElement, sticked[i].options);
        }
    }

    function setupMutationObserver(element) {
        if (window.MutationObserver) {
            var observer = new MutationObserver(function(mutations) {
                mutations.forEach(function(mutation) {
                    if (mutation.type === 'childList') {
                        // Recalculate positions when DOM changes
                        setTimeout(updateStickyPositions, 0);
                    }
                });
            });
            
            observer.observe(element[0], {
                childList: true,
                subtree: true
            });
            
            return observer;
        }
        return null;
    }

    function initSticky(element, options) {
        var stickyElement = $(element);
        var stickyId = stickyElement.attr('id');
        var wrapperId = stickyId ? stickyId + '-' + defaults.wrapperClassName : defaults.wrapperClassName;
        
        // Wrap element if not already wrapped
        if (!stickyElement.parent().hasClass(defaults.wrapperClassName)) {
            stickyElement.wrapAll('<div class="' + defaults.wrapperClassName + '" id="' + wrapperId + '"></div>');
        }
        
        var stickyWrapper = stickyElement.parent();
        
        // Set initial wrapper styles
        stickyWrapper.css({
            width: stickyElement.outerWidth(),
            marginLeft: 'auto',
            marginRight: 'auto'
        });
        
        // Handle float elements
        if (stickyElement.css('float') === 'right') {
            stickyElement.css({'float': 'none'}).parent().css({'float': 'right'});
        }
        
        // Store element and options
        var stickyData = {
            stickyElement: stickyElement,
            stickyWrapper: stickyWrapper,
            options: options,
            observer: null
        };
        
        // Setup mutation observer for modern browsers
        stickyData.observer = setupMutationObserver(stickyElement);
        
        // Store in global array
        sticked.push(stickyData);
        
        // Initial position calculation
        setStickyPosition(stickyElement, options);
        
        return stickyElement;
    }

    function destroySticky(element) {
        var unstickyElement = $(element);
        var unstickyId = unstickyElement.attr('id');
        
        // Remove from global array
        for (var i = 0; i < sticked.length; i++) {
            if (sticked[i].stickyElement.get(0) === element) {
                // Disconnect observer
                if (sticked[i].observer) {
                    sticked[i].observer.disconnect();
                }
                
                // Remove from array
                sticked.splice(i, 1);
                break;
            }
        }
        
        // Unwrap element
        unstickyElement.unwrap();
        unstickyElement.css({
            position: '',
            top: '',
            left: '',
            width: '',
            zIndex: ''
        });
        
        return unstickyElement;
    }

    // Main plugin function
    $.fn.sticky = function(method) {
        if (typeof method === 'string') {
            if (method === 'destroy') {
                return this.each(function() {
                    destroySticky(this);
                });
            } else {
                $.error('Method ' + method + ' does not exist on jQuery.sticky');
            }
        } else {
            var options = $.extend({}, defaults, method);
            return this.each(function() {
                initSticky(this, options);
            });
        }
    };

    // Ensure the plugin is available immediately
    if (typeof $ !== 'undefined') {
        // Plugin is already registered above
    }

    // Global methods
    $.sticky = {
        update: updateStickyPositions,
        destroy: function() {
            for (var i = sticked.length - 1; i >= 0; i--) {
                destroySticky(sticked[i].stickyElement.get(0));
            }
        }
    };

    // Event handlers
    $window.on('scroll', updateStickyPositions);
    $window.on('resize', function() {
        windowHeight = $window.height();
        documentHeight = $document.height();
        documentWidth = $document.width();
        updateStickyPositions();
    });

})(jQuery);
