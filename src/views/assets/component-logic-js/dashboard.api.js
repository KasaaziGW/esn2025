'use strict';

(function() {
	// Expose API functions to global scope for reuse
	window.refreshDashboardData = function refreshDashboardData() {
		$.ajax({
			url: '/dashboard/data',
			method: 'GET',
			success: function(response) {
				if (response && response.success) {
					if (typeof window.updateDashboardCards === 'function') {
						window.updateDashboardCards(response.data);
					}
					if (typeof window.updateRecentAlerts === 'function') {
						window.updateRecentAlerts(response.data.recentAlerts);
					}
					if (typeof window.updateCommunityUpdates === 'function') {
						window.updateCommunityUpdates(response.data.communityUpdates);
					}
				}
			},
			error: function(xhr) {
				console.error('Failed to refresh dashboard data:', xhr);
				if (xhr && xhr.status === 401) {
					window.location.href = '/login';
				}
			}
		});
	};

	window.checkForNotifications = function checkForNotifications() {
		$.ajax({
			url: '/notifications/check',
			method: 'GET',
			success: function(response) {
				if (response && response.success && response.data && response.data.unread > 0) {
					if (typeof window.updateNotificationBadge === 'function') {
						window.updateNotificationBadge(response.data.unread);
					}
					if (typeof window.showNotificationToast === 'function') {
						window.showNotificationToast(response.data.latest);
					}
				}
			},
			error: function(xhr) {
				if (xhr && xhr.status === 401) {
					window.location.href = '/login';
				}
			}
		});
	};

	window.logoutUser = function logoutUser() {
		if (!confirm('Are you sure you want to sign out?')) return;
		
		// Disconnect Socket.io connection before logout
		if (typeof socket !== 'undefined' && socket) {
			socket.disconnect();
		}
		
		$.ajax({
			url: '/auth/logout',
			method: 'POST',
			success: function(response) {
				localStorage.clear();
				sessionStorage.clear();
				// Use server response redirect or default to login
				const redirectUrl = response.redirectTo || '/login';
				window.location.href = redirectUrl;
			},
			error: function() {
				localStorage.clear();
				sessionStorage.clear();
				window.location.href = '/login';
			}
		});
	};
})();


