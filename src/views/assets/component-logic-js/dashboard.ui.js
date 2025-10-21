'use strict';

(function() {
	// Expose UI update helpers
	window.updateDashboardCards = function updateDashboardCards(data) {
		if (!data) return;
		const numbers = [
			data.activeAlerts || 0,
			data.totalMembers || data.myAlerts || 0,
			data.activeTeams || data.myCommunityMembers || 0,
			data.emergencyContacts || 0
		];
		// Update the first four card numbers in the top row
		$('.row.row-xs').first().find('.card-body h3').each(function(index) {
			if (index < numbers.length) {
				$(this).text(numbers[index]);
			}
		});
	};

	window.updateRecentAlerts = function updateRecentAlerts(alerts) {
		const tbody = $('.table-dashboard tbody').first();
		tbody.empty();
		if (alerts && alerts.length > 0) {
			alerts.forEach(function(alert) {
				const row = '<tr>' +
					'<td class="tx-medium">' + (alert.type || '') + '</td>' +
					'<td class="tx-color-03">' + (alert.location || '') + '</td>' +
					'<td><span class="badge badge-' + (alert.severity === 'critical' ? 'danger' : alert.severity === 'high' ? 'warning' : 'info') + '">' + (alert.severity || '') + '</span></td>' +
					'<td class="tx-color-03">' + (alert.time || '') + '</td>' +
					'<td><span class="badge badge-' + (alert.status === 'active' ? 'success' : 'secondary') + '">' + (alert.status || '') + '</span></td>' +
				'</tr>';
				tbody.append(row);
			});
		} else {
			tbody.append('<tr><td colspan="5" class="text-center tx-color-03 py-4">No recent alerts</td></tr>');
		}
	};

	window.updateCommunityUpdates = function updateCommunityUpdates(updates) {
		const tbody = $('.table-dashboard tbody').eq(1);
		tbody.empty();
		if (updates && updates.length > 0) {
			updates.forEach(function(update) {
				const row = '<tr>' +
					'<td class="tx-medium">' + (update.message || '') + '</td>' +
					'<td class="text-right"><span class="badge badge-' + (update.type === 'alert' ? 'danger' : update.type === 'info' ? 'info' : 'success') + '">' + (update.type || '') + '</span></td>' +
					'<td class="text-right tx-color-03">' + (update.time || '') + '</td>' +
				'</tr>';
				tbody.append(row);
			});
		} else {
			tbody.append('<tr><td colspan="3" class="text-center tx-color-03 py-4">No recent updates</td></tr>');
		}
	};

	window.updateNotificationBadge = function updateNotificationBadge(count) {
		$('.aside-alert-link a[title*="notifications"]').addClass('new');
		$('.aside-alert-link a[title*="notifications"]').attr('title', 'You have ' + count + ' new notifications');
	};

	window.showNotificationToast = function showNotificationToast(notification) {
		if (!notification) return;
		const toast = '' +
			'<div class="toast show position-fixed" style="top: 20px; right: 20px; z-index: 9999;" role="alert">' +
				'<div class="toast-header">' +
					'<i data-feather="bell" class="wd-16 ht-16 me-2"></i>' +
					'<strong class="me-auto">Emergency Alert</strong>' +
					'<button type="button" class="btn-close" data-bs-dismiss="toast"></button>' +
				'</div>' +
				'<div class="toast-body">' + (notification.message || '') + '</div>' +
			'</div>';
		$('body').append(toast);
		feather.replace();
		setTimeout(function() { $('.toast').remove(); }, 5000);
	};
})();


