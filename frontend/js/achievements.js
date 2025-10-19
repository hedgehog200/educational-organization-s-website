// Achievements section functionality
$(document).ready(function() {
    // Initialize achievements on page load
    initAchievements();
    
    // Also initialize on scroll to about section
    $(window).on('scroll', function() {
        const aboutSection = $('#about-section');
        if (aboutSection.length) {
            const elementTop = aboutSection.offset().top;
            const elementBottom = elementTop + aboutSection.outerHeight();
            const viewportTop = $(window).scrollTop();
            const viewportBottom = viewportTop + $(window).height();

            if (elementBottom > viewportTop && elementTop < viewportBottom) {
                if (!aboutSection.hasClass('achievements-initialized')) {
                    aboutSection.addClass('achievements-initialized');
                    initAchievements();
                }
            }
        }
    });
});

function initAchievements() {
    // Animate achievement numbers
    $('.achievement-number').each(function() {
        const $this = $(this);
        const targetValue = parseInt($this.data('target'));
        
        if (targetValue && targetValue > 0) {
            // Set initial value to 0
            $this.text('0');
            
            // Animate to target value
            $({ countNum: 0 }).animate({
                countNum: targetValue
            }, {
                duration: 2000,
                easing: 'swing',
                step: function() {
                    $this.text(Math.floor(this.countNum));
                },
                complete: function() {
                    $this.text(targetValue);
                }
            });
        }
    });
}

// Simple counter animation without jQuery animate
function animateCounter(element, target) {
    let current = 0;
    const increment = target / 100;
    const timer = setInterval(function() {
        current += increment;
        if (current >= target) {
            current = target;
            clearInterval(timer);
        }
        element.textContent = Math.floor(current);
    }, 20);
}
