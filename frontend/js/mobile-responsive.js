/**
 * Mobile Responsive JavaScript
 * Обработка мобильного меню и адаптивности
 */

// Скрытие индикатора прокрутки таблицы после первого взаимодействия
document.addEventListener('DOMContentLoaded', function() {
    const tableContainers = document.querySelectorAll('.table-container');
    
    tableContainers.forEach(container => {
        let scrolled = false;
        
        container.addEventListener('scroll', function() {
            if (!scrolled) {
                scrolled = true;
                container.classList.add('scrolled');
            }
        }, { once: true });
    });
});

// Enhanced mobile menu functionality
function toggleMobileMenu() {
    const mobileMenu = document.getElementById('mobileMenu');
    const body = document.body;
    
    if (mobileMenu) {
        mobileMenu.classList.toggle('active');
        
        // Prevent body scroll when menu is open
        if (mobileMenu.classList.contains('active')) {
            body.style.overflow = 'hidden';
            body.classList.add('mobile-menu-open');
            
            // Focus management for accessibility
            const closeButton = mobileMenu.querySelector('.mobile-menu-close');
            if (closeButton) {
                closeButton.focus();
            }
            
            // Add backdrop
            createMobileMenuBackdrop();
        } else {
            body.style.overflow = '';
            body.classList.remove('mobile-menu-open');
            removeMobileMenuBackdrop();
        }
        
        // Update mobile menu toggle button state
        updateMobileMenuToggleState();
        
        // Analytics tracking
        trackMobileMenuUsage();
    }
}

// Create backdrop for mobile menu
function createMobileMenuBackdrop() {
    if (!document.getElementById('mobileMenuBackdrop')) {
        const backdrop = document.createElement('div');
        backdrop.id = 'mobileMenuBackdrop';
        backdrop.className = 'mobile-menu-backdrop';
        backdrop.onclick = toggleMobileMenu;
        document.body.appendChild(backdrop);
    }
}

// Remove backdrop
function removeMobileMenuBackdrop() {
    const backdrop = document.getElementById('mobileMenuBackdrop');
    if (backdrop) {
        backdrop.remove();
    }
}

// Update mobile menu toggle button state
function updateMobileMenuToggleState() {
    const mobileMenu = document.getElementById('mobileMenu');
    const toggleButton = document.querySelector('.mobile-menu-toggle');
    
    if (mobileMenu && toggleButton) {
        const isActive = mobileMenu.classList.contains('active');
        toggleButton.setAttribute('aria-expanded', isActive);
        toggleButton.setAttribute('aria-label', isActive ? 'Закрыть меню' : 'Открыть меню');
        
        // Update icon
        const icon = toggleButton.querySelector('i');
        if (icon) {
            icon.className = isActive ? 'fas fa-times' : 'fas fa-bars';
        }
    }
}

// Enhanced search functionality for mobile menu
function initMobileSearch() {
    const searchInput = document.getElementById('mobileSearch');
    if (searchInput) {
        let searchTimeout;
        
        searchInput.addEventListener('input', function() {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                performMobileSearch(this.value);
            }, 300);
        });
        
        // Handle search on enter
        searchInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                performMobileSearch(this.value);
            }
        });
    }
}

// Perform mobile search
function performMobileSearch(query) {
    if (!query.trim()) return;
    
    // Simple search implementation - can be enhanced with actual search API
    const searchResults = document.querySelectorAll('.mobile-menu-nav a');
    const queryLower = query.toLowerCase();
    
    searchResults.forEach(link => {
        const text = link.textContent.toLowerCase();
        const parent = link.closest('li');
        
        if (text.includes(queryLower)) {
            parent.style.display = 'block';
            parent.classList.add('search-highlight');
        } else {
            parent.style.display = 'none';
            parent.classList.remove('search-highlight');
        }
    });
    
    // Show "no results" message if needed
    showSearchResults(query);
}

// Show search results feedback
function showSearchResults(query) {
    const nav = document.querySelector('.mobile-menu-nav');
    let noResultsMsg = nav.querySelector('.no-search-results');
    
    const visibleItems = nav.querySelectorAll('li[style*="block"]');
    
    if (visibleItems.length === 0 && query.trim()) {
        if (!noResultsMsg) {
            noResultsMsg = document.createElement('div');
            noResultsMsg.className = 'no-search-results';
            noResultsMsg.innerHTML = `
                <div style="padding: 20px; text-align: center; color: var(--muted-text);">
                    <i class="fas fa-search" style="font-size: 24px; margin-bottom: 8px;"></i>
                    <p>По запросу "${query}" ничего не найдено</p>
                </div>
            `;
            nav.appendChild(noResultsMsg);
        }
    } else if (noResultsMsg) {
        noResultsMsg.remove();
    }
}

// Clear search
function clearMobileSearch() {
    const searchInput = document.getElementById('mobileSearch');
    const nav = document.querySelector('.mobile-menu-nav');
    const noResultsMsg = nav.querySelector('.no-search-results');
    
    if (searchInput) {
        searchInput.value = '';
    }
    
    // Show all menu items
    const menuItems = nav.querySelectorAll('li');
    menuItems.forEach(item => {
        item.style.display = '';
        item.classList.remove('search-highlight');
    });
    
    if (noResultsMsg) {
        noResultsMsg.remove();
    }
}

// Sync user data between desktop and mobile
function syncUserData() {
    // Sync admin name
    const adminNameDesktop = document.getElementById('adminName');
    const adminNameMobile = document.getElementById('adminNameMobile');
    if (adminNameDesktop && adminNameMobile) {
        adminNameMobile.textContent = adminNameDesktop.textContent;
    }
    
    // Sync student name
    const studentNameDesktop = document.getElementById('studentName');
    const studentNameMobile = document.getElementById('studentNameMobile');
    if (studentNameDesktop && studentNameMobile) {
        studentNameMobile.textContent = studentNameDesktop.textContent;
    }
    
    // Sync notification count
    const notificationCountDesktop = document.getElementById('notificationCount');
    const notificationCountMobile = document.getElementById('notificationCountMobile');
    if (notificationCountDesktop && notificationCountMobile) {
        notificationCountMobile.textContent = notificationCountDesktop.textContent;
    }
}

// Analytics tracking
function trackMobileMenuUsage() {
    const mobileMenu = document.getElementById('mobileMenu');
    const isOpen = mobileMenu.classList.contains('active');
    
    // Simple analytics - can be enhanced with actual analytics service
    // Track: Mobile menu ${isOpen ? 'opened' : 'closed'}
    const analytics = {
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
        screenSize: `${window.innerWidth}x${window.innerHeight}`
    });
}

// Close mobile menu when clicking outside
function setupMobileMenuClickOutside() {
    document.addEventListener('click', function(event) {
        const mobileMenu = document.getElementById('mobileMenu');
        const mobileMenuToggle = document.querySelector('.mobile-menu-toggle');
        
        if (mobileMenu && mobileMenuToggle) {
            if (!mobileMenu.contains(event.target) && !mobileMenuToggle.contains(event.target)) {
                mobileMenu.classList.remove('active');
            }
        }
    });
}

// Close mobile menu on escape key
function setupMobileMenuEscapeKey() {
    document.addEventListener('keydown', function(event) {
        if (event.key === 'Escape') {
            const mobileMenu = document.getElementById('mobileMenu');
            if (mobileMenu) {
                mobileMenu.classList.remove('active');
            }
        }
    });
}

// Smooth scrolling for mobile menu links
function setupMobileMenuSmoothScrolling() {
    document.querySelectorAll('.mobile-menu-nav a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
                // Close mobile menu after navigation
                const mobileMenu = document.getElementById('mobileMenu');
                if (mobileMenu) {
                    mobileMenu.classList.remove('active');
                }
            }
        });
    });
}

// Handle window resize for mobile menu
function setupMobileMenuResize() {
    window.addEventListener('resize', function() {
        const mobileMenu = document.getElementById('mobileMenu');
        if (mobileMenu && window.innerWidth > 1024) {
            mobileMenu.classList.remove('active');
        }
    });
}

// Initialize mobile menu functionality
function initMobileMenu() {
    setupMobileMenuClickOutside();
    setupMobileMenuEscapeKey();
    setupMobileMenuSmoothScrolling();
    setupMobileMenuResize();
}

// Mobile-specific utilities
const MobileUtils = {
    // Check if device is mobile
    isMobile: function() {
        return window.innerWidth <= 768;
    },
    
    // Check if device is tablet
    isTablet: function() {
        return window.innerWidth > 768 && window.innerWidth <= 1024;
    },
    
    // Check if device is desktop
    isDesktop: function() {
        return window.innerWidth > 1024;
    },
    
    // Check if device is high-resolution mobile (1080x2436 and similar)
    isHighResMobile: function() {
        return window.innerWidth === 1080 && window.innerHeight >= 2400;
    },
    
    // Check if device is ultra-wide mobile
    isUltraWideMobile: function() {
        return window.innerWidth > 1080 && window.innerWidth <= 1200;
    },
    
    // Get current breakpoint
    getBreakpoint: function() {
        if (this.isHighResMobile()) return 'high-res-mobile';
        if (this.isUltraWideMobile()) return 'ultra-wide-mobile';
        if (this.isMobile()) return 'mobile';
        if (this.isTablet()) return 'tablet';
        return 'desktop';
    },
    
    // Add mobile class to body
    addMobileClass: function() {
        // Remove existing classes
        document.body.classList.remove('mobile-device', 'tablet-device', 'desktop-device', 'high-res-mobile-device', 'ultra-wide-mobile-device');
        
        // Add appropriate class based on device type
        if (this.isHighResMobile()) {
            document.body.classList.add('high-res-mobile-device');
        } else if (this.isUltraWideMobile()) {
            document.body.classList.add('ultra-wide-mobile-device');
        } else if (this.isMobile()) {
            document.body.classList.add('mobile-device');
        } else if (this.isTablet()) {
            document.body.classList.add('tablet-device');
        } else {
            document.body.classList.add('desktop-device');
        }
    },
    
    // Handle orientation change
    handleOrientationChange: function() {
        setTimeout(() => {
            this.addMobileClass();
            // Close mobile menu on orientation change
            const mobileMenu = document.getElementById('mobileMenu');
            if (mobileMenu) {
                mobileMenu.classList.remove('active');
            }
        }, 100);
    }
};

// Setup mobile utilities
function setupMobileUtils() {
    // Add mobile class on load
    MobileUtils.addMobileClass();
    
    // Add mobile class on resize
    window.addEventListener('resize', function() {
        MobileUtils.addMobileClass();
    });
    
    // Handle orientation change
    window.addEventListener('orientationchange', function() {
        MobileUtils.handleOrientationChange();
    });
}

// Touch event handlers for better mobile experience
function setupTouchHandlers() {
    // Prevent double-tap zoom on buttons
    document.querySelectorAll('button, .btn, .action-btn').forEach(element => {
        element.addEventListener('touchend', function(e) {
            e.preventDefault();
            this.click();
        });
    });
    
    // Add touch feedback for interactive elements
    document.querySelectorAll('.mobile-menu-nav a, .btn, .action-btn, .filter-tab').forEach(element => {
        element.addEventListener('touchstart', function() {
            this.classList.add('touch-active');
        });
        
        element.addEventListener('touchend', function() {
            setTimeout(() => {
                this.classList.remove('touch-active');
            }, 150);
        });
    });
}

// Form enhancements for mobile
function setupMobileFormEnhancements() {
    // Prevent zoom on input focus (iOS)
    document.querySelectorAll('input, select, textarea').forEach(element => {
        element.addEventListener('focus', function() {
            if (MobileUtils.isMobile()) {
                this.style.fontSize = '16px';
            }
        });
    });
    
    // Auto-resize textareas
    document.querySelectorAll('textarea').forEach(textarea => {
        textarea.addEventListener('input', function() {
            this.style.height = 'auto';
            this.style.height = this.scrollHeight + 'px';
        });
    });
}

// Table enhancements for mobile
function setupMobileTableEnhancements() {
    // Add horizontal scroll indicators for tables
    document.querySelectorAll('.table-responsive').forEach(tableContainer => {
        const table = tableContainer.querySelector('table');
        if (table && table.scrollWidth > tableContainer.clientWidth) {
            tableContainer.classList.add('has-scroll');
        }
    });
}

// Modal enhancements for mobile
function setupMobileModalEnhancements() {
    // Close modal on backdrop click
    document.querySelectorAll('.modal').forEach(modal => {
        modal.addEventListener('click', function(e) {
            if (e.target === this) {
                this.classList.remove('active');
            }
        });
    });
    
    // Close modal on escape key
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            document.querySelectorAll('.modal.active').forEach(modal => {
                modal.classList.remove('active');
            });
        }
    });
}

// Performance optimizations for mobile
function setupMobilePerformanceOptimizations() {
    // Throttle scroll events
    let scrollTimeout;
    window.addEventListener('scroll', function() {
        if (scrollTimeout) {
            clearTimeout(scrollTimeout);
        }
        scrollTimeout = setTimeout(function() {
            // Handle scroll-based functionality here
        }, 10);
    });
    
    // Optimize animations for mobile
    if (MobileUtils.isMobile()) {
        // Reduce animation duration on mobile
        document.documentElement.style.setProperty('--transition', '0.2s ease');
        document.documentElement.style.setProperty('--transition-fast', '0.1s ease');
    }
}

// Initialize all mobile functionality
function initMobileResponsive() {
    // Wait for DOM to be ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function() {
            initMobileMenu();
            initMobileSearch();
            syncUserData();
            setupMobileUtils();
            setupTouchHandlers();
            setupMobileFormEnhancements();
            setupMobileTableEnhancements();
            setupMobileModalEnhancements();
            setupMobilePerformanceOptimizations();
        });
    } else {
        initMobileMenu();
        initMobileSearch();
        syncUserData();
        setupMobileUtils();
        setupTouchHandlers();
        setupMobileFormEnhancements();
        setupMobileTableEnhancements();
        setupMobileModalEnhancements();
        setupMobilePerformanceOptimizations();
    }
}

// Export functions for global access
window.toggleMobileMenu = toggleMobileMenu;
window.clearMobileSearch = clearMobileSearch;
window.syncUserData = syncUserData;
window.MobileUtils = MobileUtils;

// Auto-initialize
initMobileResponsive();
