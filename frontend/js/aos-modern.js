// Modern AOS (Animate On Scroll) - Fixed version without deprecated events
(function() {
    'use strict';

    // Configuration
    var config = {
        offset: 120,
        delay: 0,
        easing: 'ease',
        duration: 400,
        disable: false,
        once: true,
        startEvent: 'DOMContentLoaded'
    };

    var elements = [];
    var initialized = false;
    var isIE = document.all && !window.atob;

    // Utility functions
    function throttle(func, wait, immediate) {
        var timeout;
        return function() {
            var context = this, args = arguments;
            var later = function() {
                timeout = null;
                if (!immediate) func.apply(context, args);
            };
            var callNow = immediate && !timeout;
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
            if (callNow) func.apply(context, args);
        };
    }

    function debounce(func, wait, immediate) {
        var timeout;
        return function() {
            var context = this, args = arguments;
            var later = function() {
                timeout = null;
                if (!immediate) func.apply(context, args);
            };
            var callNow = immediate && !timeout;
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
            if (callNow) func.apply(context, args);
        };
    }

    // Check if element is in viewport
    function isInViewport(element, offset) {
        var rect = element.getBoundingClientRect();
        var windowHeight = window.innerHeight || document.documentElement.clientHeight;
        return (
            rect.top <= windowHeight + offset &&
            rect.bottom >= -offset
        );
    }

    // Get element position
    function getElementPosition(element) {
        var rect = element.getBoundingClientRect();
        var scrollTop = window.pageYOffset || document.documentElement.scrollTop;
        return rect.top + scrollTop;
    }

    // Animate element
    function animateElement(element, position, windowHeight, scrollTop, once) {
        var isVisible = isInViewport(element, config.offset);
        var hasAnimated = element.classList.contains('aos-animate');
        var shouldAnimate = position < windowHeight + scrollTop;

        if (shouldAnimate && !hasAnimated) {
            element.classList.add('aos-animate');
        } else if (!isVisible && !once && hasAnimated) {
            element.classList.remove('aos-animate');
        }
    }

    // Initialize elements
    function initElements() {
        var elementsList = document.querySelectorAll('[data-aos]');
        elements = [];

        for (var i = 0; i < elementsList.length; i++) {
            var element = elementsList[i];
            element.classList.add('aos-init');
            
            // Calculate position
            var position = getElementPosition(element);
            
            elements.push({
                node: element,
                position: position
            });
        }
    }

    // Refresh animations
    function refresh(force) {
        if (force) {
            initialized = true;
        }
        
        if (!initialized) {
            return;
        }

        initElements();
        updateAnimations();
    }

    // Update animations based on scroll position
    function updateAnimations() {
        var windowHeight = window.innerHeight || document.documentElement.clientHeight;
        var scrollTop = window.pageYOffset || document.documentElement.scrollTop;

        elements.forEach(function(element) {
            animateElement(element.node, element.position, windowHeight, scrollTop, config.once);
        });
    }

    // Setup event listeners
    function setupEventListeners() {
        // Scroll event
        window.addEventListener('scroll', throttle(updateAnimations, 16), { passive: true });
        
        // Resize event
        window.addEventListener('resize', debounce(refresh, 50, true));
        
        // Orientation change
        window.addEventListener('orientationchange', debounce(refresh, 50, true));
        
        // Initial load
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', function() {
                refresh(true);
            });
        } else {
            refresh(true);
        }
    }

    // Public API
    window.AOS = {
        init: function(options) {
            // Merge options
            if (options) {
                for (var key in options) {
                    if (options.hasOwnProperty(key)) {
                        config[key] = options[key];
                    }
                }
            }

            // Initialize
            initElements();
            
            if (!config.disable && !isIE) {
                setupEventListeners();
            }
        },
        
        refresh: function() {
            refresh(true);
        },
        
        refreshHard: function() {
            elements = [];
            initElements();
            refresh(true);
        }
    };

    // Auto-initialize if script is loaded after DOM is ready
    if (document.readyState !== 'loading') {
        window.AOS.init();
    }

})();
