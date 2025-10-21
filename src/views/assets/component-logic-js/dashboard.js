$(document).ready(function() {
    'use strict';

    // Initialize feather icons
    feather.replace();

    // Prevent back button access after logout
    window.addEventListener('pageshow', function(event) {
        if (event.persisted) {
            // Page was loaded from cache (back button), check session
            $.ajax({
                url: '/api/auth/verify',
                method: 'GET',
                success: function(response) {
                    if (!response.success) {
                        // Session invalid, redirect to login
                        window.location.href = '/login';
                    }
                },
                error: function() {
                    // Session check failed, redirect to login
                    window.location.href = '/login';
                }
            });
        }
    });

    // No token management needed with session-based authentication

    // Initialize tooltips
    $('[data-bs-toggle="tooltip"]').tooltip();

    // Auto-refresh dashboard data every 30 seconds
    let refreshInterval;

    function refreshDashboardData() {
        $.ajax({
            url: '/api/dashboard/data',
            method: 'GET',
            success: function(response) {
                if (response.success) {
                    updateDashboardCards(response.data);
                    updateRecentAlerts(response.data.recentAlerts);
                    updateCommunityUpdates(response.data.communityUpdates);
                }
            },
            error: function(xhr) {
                console.error('Failed to refresh dashboard data:', xhr);
                if (xhr.status === 401) {
                    // Session expired, redirect to login
                    window.location.href = '/login';
                }
            }
        });
    }

    function updateDashboardCards(data) {
        // Update active alerts
        $('.card-body h3').first().text(data.activeAlerts || 0);
        
        // Update community members
        $('.card-body h3').eq(1).text(data.totalMembers || 0);
        
        // Update response teams
        $('.card-body h3').eq(2).text(data.activeTeams || 0);
        
        // Update emergency contacts
        $('.card-body h3').eq(3).text(data.emergencyContacts || 0);
    }

    function updateRecentAlerts(alerts) {
        const tbody = $('.table-dashboard tbody').first();
        tbody.empty();
        
        if (alerts && alerts.length > 0) {
            alerts.forEach(alert => {
                const row = `
                    <tr>
                        <td class="tx-medium">${alert.type}</td>
                        <td class="tx-color-03">${alert.location}</td>
                        <td>
                            <span class="badge badge-${alert.severity === 'critical' ? 'danger' : alert.severity === 'high' ? 'warning' : 'info'}">
                                ${alert.severity}
                            </span>
                        </td>
                        <td class="tx-color-03">${alert.time}</td>
                        <td>
                            <span class="badge badge-${alert.status === 'active' ? 'success' : 'secondary'}">
                                ${alert.status}
                            </span>
                        </td>
                    </tr>
                `;
                tbody.append(row);
            });
        } else {
            tbody.append('<tr><td colspan="5" class="text-center tx-color-03 py-4">No recent alerts</td></tr>');
        }
    }

    function updateCommunityUpdates(updates) {
        const tbody = $('.table-dashboard tbody').eq(1);
        tbody.empty();
        
        if (updates && updates.length > 0) {
            updates.forEach(update => {
                const row = `
                    <tr>
                        <td class="tx-medium">${update.message}</td>
                        <td class="text-right">
                            <span class="badge badge-${update.type === 'alert' ? 'danger' : update.type === 'info' ? 'info' : 'success'}">
                                ${update.type}
                            </span>
                        </td>
                        <td class="text-right tx-color-03">${update.time}</td>
                    </tr>
                `;
                tbody.append(row);
            });
        } else {
            tbody.append('<tr><td colspan="3" class="text-center tx-color-03 py-4">No recent updates</td></tr>');
        }
    }

    // Start auto-refresh
    refreshInterval = setInterval(refreshDashboardData, 30000);

    // Emergency button functionality
    $('.btn-danger').on('click', function(e) {
        if ($(this).text().includes('Emergency Call')) {
            e.preventDefault();
            if (confirm('This will initiate an emergency call. Are you sure?')) {
                // Make emergency call
                $.ajax({
                    url: '/api/emergency/call',
                    method: 'POST',
                    success: function(response) {
                        if (response.success) {
                            showAlert('success', 'Emergency call initiated successfully');
                        }
                    },
                    error: function(xhr) {
                        showAlert('danger', 'Failed to initiate emergency call');
                        if (xhr.status === 401) {
                            window.location.href = '/login';
                        }
                    }
                });
            }
        }
    });

    // Search functionality
    $('.content-search input').on('keypress', function(e) {
        if (e.which === 13) { // Enter key
            const searchTerm = $(this).val().trim();
            if (searchTerm) {
                window.location.href = `/search?q=${encodeURIComponent(searchTerm)}`;
            }
        }
    });

    // Real-time notifications
    function checkForNotifications() {
        $.ajax({
            url: '/api/notifications/check',
            method: 'GET',
            success: function(response) {
                if (response.success && response.data.unread > 0) {
                    updateNotificationBadge(response.data.unread);
                    showNotificationToast(response.data.latest);
                }
            },
            error: function(xhr) {
                if (xhr.status === 401) {
                    window.location.href = '/login';
                }
            }
        });
    }

    function updateNotificationBadge(count) {
        $('.aside-alert-link a[title*="notifications"]').addClass('new');
        $('.aside-alert-link a[title*="notifications"]').attr('title', `You have ${count} new notifications`);
    }

    function showNotificationToast(notification) {
        if (notification) {
            const toast = `
                <div class="toast show position-fixed" style="top: 20px; right: 20px; z-index: 9999;" role="alert">
                    <div class="toast-header">
                        <i data-feather="bell" class="wd-16 ht-16 me-2"></i>
                        <strong class="me-auto">Emergency Alert</strong>
                        <button type="button" class="btn-close" data-bs-dismiss="toast"></button>
                    </div>
                    <div class="toast-body">
                        ${notification.message}
                    </div>
                </div>
            `;
            $('body').append(toast);
            feather.replace();
            
            // Auto-remove after 5 seconds
            setTimeout(() => {
                $('.toast').remove();
            }, 5000);
        }
    }

    // Check for notifications every 10 seconds
    setInterval(checkForNotifications, 10000);

    // Cleanup on page unload
    $(window).on('beforeunload', function() {
        if (refreshInterval) {
            clearInterval(refreshInterval);
        }
    });

    // Global alert function
    window.showAlert = function(type, message) {
        const alertClass = type === 'success' ? 'alert-success' : 'alert-danger';
        const alertHtml = `
            <div class="alert ${alertClass} alert-dismissible fade show position-fixed" style="top: 20px; right: 20px; z-index: 9999;" role="alert">
                ${message}
                <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
            </div>
        `;
        $('body').append(alertHtml);
        
        setTimeout(() => {
            $('.alert').alert('close');
        }, 5000);
    };

    // Logout function
    window.logoutUser = function() {
        if (confirm('Are you sure you want to sign out?')) {
            // Disconnect Socket.io connection before logout
            if (typeof socket !== 'undefined' && socket) {
                socket.disconnect();
            }
            
            $.ajax({
                url: '/api/auth/logout',
                method: 'POST',
                success: function(response) {
                    // Clear any cached data
                    localStorage.clear();
                    sessionStorage.clear();
                    
                    // Use server response redirect or default to login
                    const redirectUrl = response.redirectTo || '/login';
                    window.location.href = redirectUrl;
                },
                error: function(xhr) {
                    console.error('Logout error:', xhr);
                    // Even if logout fails, redirect to login
                    localStorage.clear();
                    sessionStorage.clear();
                    window.location.href = '/login';
                }
            });
        }
    };

    // Initialize dashboard
    refreshDashboardData();
    checkForNotifications();
});
