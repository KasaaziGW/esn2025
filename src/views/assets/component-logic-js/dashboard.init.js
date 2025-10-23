'use strict';

$(document).ready(function() {
	// Initialize feather icons with error handling and debouncing
	setTimeout(function() {
		try {
			if (!window.featherInitialized && typeof feather !== 'undefined' && document.querySelector('[data-feather]')) {
				feather.replace();
				window.featherInitialized = true;
				//console.log('Feather icons initialized successfully in dashboard.init.js');
			}
		} catch (error) {
			console.warn('Feather icons initialization failed:', error);
		}
	}, 1500);

	// Initialize tooltips only if Bootstrap is available
	if (typeof $ !== 'undefined' && $.fn.tooltip) {
		try {
			$('[data-bs-toggle="tooltip"]').tooltip();
		} catch (error) {
			console.warn('Tooltip initialization failed:', error);
		}
	} else {
		//console.log('Bootstrap tooltips not available yet, will retry...');
		// Retry tooltip initialization after a delay
		setTimeout(function() {
			if (typeof $ !== 'undefined' && $.fn.tooltip) {
				try {
					$('[data-bs-toggle="tooltip"]').tooltip();
				} catch (error) {
					console.warn('Tooltip retry failed:', error);
				}
			}
		}, 1000);
	}

	// Prevent back button access after logout (cache restore)
	window.addEventListener('pageshow', function(event) {
		if (event && event.persisted) {
			$.ajax({
				url: '/auth/verify',
				method: 'GET',
				success: function(response) {
					if (!response || !response.success) {
						window.location.href = '/login';
					}
				},
				error: function() {
					window.location.href = '/login';
				}
			});
		}
	});

	// Search submit on Enter
	$('.content-search input').on('keypress', function(e) {
		if (e && e.which === 13) {
			var searchTerm = $(this).val().trim();
			if (searchTerm) {
				window.location.href = '/search?q=' + encodeURIComponent(searchTerm);
			}
		}
	});



	// Global alert helper
	window.showAlert = function(type, message) {
		var alertClass = type === 'success' ? 'alert-success' : 'alert-danger';
		var html = '' +
			'<div class="alert ' + alertClass + ' alert-dismissible fade show position-fixed" style="top: 20px; right: 20px; z-index: 9999;" role="alert">' +
				message +
				'<button type="button" class="btn-close" data-bs-dismiss="alert"></button>' +
			'</div>';
		$('body').append(html);
		setTimeout(function() { $('.alert').alert('close'); }, 5000);
	};

	// Refresh intervals
	var dataInterval = setInterval(function() { if (typeof window.refreshDashboardData === 'function') window.refreshDashboardData(); }, 30000);
	var notifInterval = setInterval(function() { if (typeof window.checkForNotifications === 'function') window.checkForNotifications(); }, 10000);

	// Kick off initial loads
	if (typeof window.refreshDashboardData === 'function') window.refreshDashboardData();
	if (typeof window.checkForNotifications === 'function') window.checkForNotifications();

	// Cleanup
	$(window).on('beforeunload', function() {
		if (dataInterval) clearInterval(dataInterval);
		if (notifInterval) clearInterval(notifInterval);
	});
});


