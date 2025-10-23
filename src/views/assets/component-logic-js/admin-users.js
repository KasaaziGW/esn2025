'use strict';

$(document).ready(function() {
    // Initialize variables
    let currentPage = 1;
    let totalPages = 1;
    let currentFilters = {};
    let usersData = [];
    let paginationData = {};
    let socket = null;

    // Initialize the page
    init();

    function init() {
        
        // Check if user is logged in by making a test API call
        $.ajax({
            url: '/auth/verify',
            method: 'GET',
            xhrFields: {
                withCredentials: true
            },
            success: function(response) {
                //console.log('Session verification successful:', response);
                loadUserStats();
                loadUsers();
                },
                error: function(xhr) {
                    if (xhr.status === 401) {
                        window.location.href = '/login';
                    return;
                }
            }
        });
        
        bindEvents();
        initializeFeatherIcons();
        initializeSocket();
        initializeModals();
    }

    function initializeFeatherIcons() {
        // Initialize feather icons with error handling and debouncing
        try {
            // Only initialize if not already done
            if (typeof feather !== 'undefined' && !window.featherInitialized) {
                feather.replace();
                window.featherInitialized = true;
            }
        } catch (error) {
            console.warn('Feather icons initialization failed:', error);
        }
    }

    function initializeSocket() {
        try {
            // Initialize Socket.io connection
            socket = io({
                auth: {
                    userId: getCurrentUserId()
                }
            });

            socket.on('connect', () => {
               // console.log('Socket connected:', socket.id);
                // Join admin room for real-time updates
                socket.emit('joinAdminRoom');
                // Update status indicator
                $('#realtimeStatus').removeClass('bg-danger').addClass('bg-success').html('<i data-feather="wifi"></i> Live Updates');
                if (typeof feather !== 'undefined') feather.replace();
            });

            socket.on('disconnect', () => {
                //console.log('Socket disconnected');
                // Update status indicator
                $('#realtimeStatus').removeClass('bg-success').addClass('bg-danger').html('<i data-feather="wifi-off"></i> Disconnected');
                if (typeof feather !== 'undefined') feather.replace();
            });

            socket.on('connect_error', (error) => {
                // Update status indicator
                $('#realtimeStatus').removeClass('bg-success').addClass('bg-warning').html('<i data-feather="alert-circle"></i> Connection Error');
                if (typeof feather !== 'undefined') feather.replace();
            });

            // Real-time user management events
            socket.on('userCreated', (user) => {
                showAlert('info', `New user "${user.username}" has been created`);
                loadUsers();
                loadUserStats();
            });

            socket.on('userUpdated', (user) => {
                showAlert('info', `User "${user.username}" has been updated`);
                loadUsers();
                loadUserStats();
            });

            socket.on('userDeleted', (data) => {
                showAlert('info', 'A user has been deleted');
                loadUsers();
                loadUserStats();
            });

            socket.on('userStatusChanged', (user) => {
                showAlert('info', `User "${user.username}" status changed to ${user.isActive ? 'Active' : 'Inactive'}`);
                loadUsers();
                loadUserStats();
            });

            socket.on('userPasswordChanged', (data) => {
                showAlert('info', 'A user password has been changed');
            });

            socket.on('userStatsUpdated', (stats) => {
                // Update stats display
                $('#totalUsers').text(stats.total || 0);
                $('#activeUsers').text(stats.active || 0);
                $('#onlineUsers').text(stats.online || 0);
                $('#coordinators').text(stats.coordinators || 0);
                $('#newToday').text(stats.newToday || 0);
            });

            // Listen for real-time online status changes
            socket.on('userOnlineStatusChanged', (data) => {
                // Update the specific user's row in the table
                updateUserRowStatus(data.userId, data.isOnline, data.lastSeenAt);
            });

    } catch (error) {
        console.warn('Socket initialization failed:', error);
    }
}

// Function to update user row status in real-time
function updateUserRowStatus(userId, isOnline, lastSeenAt) {
    const userRow = $(`tr[data-user-id="${userId}"]`);
    if (userRow.length === 0) return;

    // Update online status badge
    const onlineStatusCell = userRow.find('td:nth-child(4)'); // Online column
    let onlineStatusBadge;
    
    if (isOnline) {
        // Check if user was active within the last 2 minutes
        const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000);
        const lastSeen = lastSeenAt ? new Date(lastSeenAt) : null;
        
        if (lastSeen && lastSeen > twoMinutesAgo) {
            onlineStatusBadge = '<span class="badge bg-success"><i data-feather="wifi" class="mg-r-5"></i>Online</span>';
        } else {
            onlineStatusBadge = '<span class="badge bg-warning"><i data-feather="clock" class="mg-r-5"></i>Recently Active</span>';
        }
    } else {
        onlineStatusBadge = '<span class="badge bg-secondary"><i data-feather="wifi-off" class="mg-r-5"></i>Offline</span>';
    }
    
    onlineStatusCell.html(onlineStatusBadge);
    
    // Update last seen
    const lastSeenCell = userRow.find('td:nth-child(6)'); // Last Seen column
    const lastSeenText = lastSeenAt ? formatDate(new Date(lastSeenAt)) : 'Never';
    lastSeenCell.text(lastSeenText);
    
    // Re-initialize feather icons for the new badges
    if (typeof feather !== 'undefined') {
        feather.replace();
    }
}

    // Cleanup function for page unload
    function cleanupSocket() {
        if (socket) {
            socket.emit('leaveAdminRoom');
            socket.disconnect();
        }
    }

    // Cleanup on page unload
    $(window).on('beforeunload', cleanupSocket);

    function initializeModals() {
        // Initialize Bootstrap modals
        try {
            // Ensure all modals are properly initialized
            const modals = ['#createUserModal', '#editUserModal', '#changePasswordModal', '#deleteUserModal'];
            modals.forEach(modalId => {
                const modalElement = document.querySelector(modalId);
                if (modalElement) {
                    // Initialize Bootstrap modal if not already done
                    if (!modalElement._modal) {
                        new bootstrap.Modal(modalElement);
                    }
                }
            });
            //console.log('Modals initialized successfully');
        } catch (error) {
            console.warn('Modal initialization failed:', error);
        }
    }

    function getCurrentUserId() {
        // Get user ID from the page data
        return window.currentUser ? window.currentUser.id : null;
    }

    function bindEvents() {
        // Search functionality
        $('#searchUsers').on('input', debounce(function() {
            currentFilters.search = $(this).val();
            currentPage = 1;
            loadUsers();
        }, 500));

        // Region-District dependency for filters
        $('#filterRegion').on('change', function() {
            const region = $(this).val();
            updateDistrictOptions('#filterDistrict', region);
            if (!region) {
                $('#filterDistrict').prop('disabled', true).val('');
            }
        });

        // Region-District dependency for create user modal
        $('#createRegion').on('change', function() {
            const region = $(this).val();
            updateDistrictOptions('#createDistrict', region);
            if (!region) {
                $('#createDistrict').prop('disabled', true).val('');
            }
        });

        // Region-District dependency for edit user modal
        $('#editRegion').on('change', function() {
            const region = $(this).val();
            updateDistrictOptions('#editDistrict', region);
            if (!region) {
                $('#editDistrict').prop('disabled', true).val('');
            }
        });

        // Real-time search functionality
        let searchTimeout;
        $('#searchUsers').on('input', function() {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                currentFilters.search = $(this).val();
                currentPage = 1;
                loadUsers();
            }, 500); // 500ms delay for better performance
        });

        // Filter functionality
        $('#applyFilters').on('click', function() {
            currentFilters = {
                search: $('#searchUsers').val(),
                role: $('#filterRole').val(),
                status: $('#filterStatus').val(),
                online: $('#filterOnline').val(),
                region: $('#filterRegion').val(),
                district: $('#filterDistrict').val()
            };
            currentPage = 1;
            loadUsers();
        });

        // Auto-apply filters when dropdowns change
        $('#filterRole, #filterStatus, #filterOnline, #filterRegion, #filterDistrict').on('change', function() {
            currentFilters = {
                search: $('#searchUsers').val(),
                role: $('#filterRole').val(),
                status: $('#filterStatus').val(),
                online: $('#filterOnline').val(),
                region: $('#filterRegion').val(),
                district: $('#filterDistrict').val()
            };
            currentPage = 1;
            loadUsers();
        });

        // Clear filters
        $('#clearFilters').on('click', function() {
            $('#searchUsers').val('');
            $('#filterRole').val('');
            $('#filterStatus').val('');
            $('#filterOnline').val('');
            $('#filterRegion').val('');
            $('#filterDistrict').val('').prop('disabled', true);
            currentFilters = {};
            currentPage = 1;
            loadUsers();
        });

        // Export users
        $('#exportUsers').on('click', function() {
            exportUsers();
        });

        // Refresh users
        $('#refreshUsers').on('click', function() {
            loadUserStats();
            loadUsers();
        });

        // Create user form
        $('#createUserForm').on('submit', function(e) {
            e.preventDefault();
            createUser();
        });

        // Edit user form
        $('#editUserForm').on('submit', function(e) {
            e.preventDefault();
            updateUser();
        });

        // Change password form
        $('#changePasswordForm').on('submit', function(e) {
            e.preventDefault();
            changePassword();
        });

        // Delete user confirmation is now handled by Sweet Alert
    }

    function loadUserStats() {
        $.ajax({
            url: '/users/stats',
            method: 'GET',
            xhrFields: {
                withCredentials: true
            },
            success: function(response) {
                if (response && response.status === 'success') {
                    $('#totalUsers').text(response.data.total || 0);
                    $('#activeUsers').text(response.data.active || 0);
                    $('#onlineUsers').text(response.data.online || 0);
                    $('#coordinators').text(response.data.coordinators || 0);
                    $('#newToday').text(response.data.newToday || 0);
                    
                    // Emit stats update to other connected admins
                    if (socket && socket.connected) {
                        socket.emit('userStatsUpdated', response.data);
                    }
                } else {
                    showAlert('warning', 'Received invalid response format. Check console for details.');
                }
            },
            error: function(xhr) {
                if (xhr.status === 401) {
                    showAlert('warning', 'Please log in to access user statistics. Redirecting to login page in 3 seconds...');
                    // Redirect to login page with delay so you can see the error
                    setTimeout(() => {
                        window.location.href = '/login';
                    }, 3000);
                } else {
                    showAlert('danger', 'Failed to load user statistics');
                }
            }
        });
    }

    function loadUsers() {
        // Show loading state
        showLoadingState();

        // Clean up filters to remove undefined values
        const cleanFilters = {};
        Object.keys(currentFilters).forEach(key => {
            if (currentFilters[key] && currentFilters[key] !== 'undefined' && currentFilters[key] !== '') {
                cleanFilters[key] = currentFilters[key];
            }
        });

        const params = new URLSearchParams({
            page: currentPage,
            limit: 10,
            ...cleanFilters
        });

        $.ajax({
            url: `/users?${params}`,
            method: 'GET',
            xhrFields: {
                withCredentials: true
            },
            success: function(response) {
                hideLoadingState();
                if (response.status === 'success') {
                    usersData = response.data.users;
                    paginationData = response.data.pagination;
                    renderUsersTable();
                    renderPagination();
                } else {
                    showAlert('warning', 'Received invalid response format for users. Check console for details.');
                }
            },
            error: function(xhr) {
                hideLoadingState();
                if (xhr.status === 401) {
                    showAlert('warning', 'Please log in to access user data. Redirecting to login page in 3 seconds...');
                    // Redirect to login page with delay so you can see the error
                    setTimeout(() => {
                        window.location.href = '/login';
                    }, 3000);
                } else {
                    showAlert('danger', 'Failed to load users');
                }
            }
        });
    }

    function renderUsersTable() {
        const tbody = $('#usersTableBody');
        tbody.empty();

        if (!usersData || usersData.length === 0) {
            tbody.append(`
                <tr>
                    <td colspan="6" class="text-center py-4">
                        <div class="d-flex flex-column align-items-center">
                            <i data-feather="users" class="tx-color-03" style="width: 48px; height: 48px;"></i>
                            <p class="mg-t-10 mg-b-0 tx-color-03">No users found</p>
                        </div>
                    </td>
                </tr>
            `);
            // Feather icons will be handled by the main dashforge.js
            return;
        }

        usersData.forEach(user => {
            const statusBadge = user.isActive 
                ? '<span class="badge bg-success"><i data-feather="user-check" class="mg-r-5"></i>Active</span>' 
                : '<span class="badge bg-danger"><i data-feather="user-x" class="mg-r-5"></i>Inactive</span>';
            
            const roleBadge = getRoleBadge(user.role);
            const lastSeen = user.lastSeenAt ? formatDate(user.lastSeenAt) : 'Never';
            const location = user.region && user.district ? `${user.region.name || user.region}, ${user.district.name || user.district}` : 'Not set';
            const displayName = user.displayName || user.firstName || user.username;
            const avatarInitial = (user.firstName ? user.firstName.charAt(0) : user.username.charAt(0)).toUpperCase();
            
            // Online status with more granular display
            let onlineStatus;
            if (user.isOnline) {
                // Check if user was active within the last 5 minutes
                const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
                const lastSeen = user.lastSeenAt ? new Date(user.lastSeenAt) : null;
                
                if (lastSeen && lastSeen > fiveMinutesAgo) {
                    onlineStatus = '<span class="badge bg-success"><i data-feather="wifi" class="mg-r-5"></i>Online</span>';
                } else {
                    onlineStatus = '<span class="badge bg-warning"><i data-feather="clock" class="mg-r-5"></i>Recently Active</span>';
                }
            } else {
                onlineStatus = '<span class="badge bg-secondary"><i data-feather="wifi-off" class="mg-r-5"></i>Offline</span>';
            }

            const row = `
                <tr data-user-id="${user._id}">
                    <td>
                        <div class="d-flex align-items-center">
                            <div class="avatar avatar-sm bg-primary text-white rounded-circle mg-r-10">
                                ${avatarInitial}
                            </div>
                            <div>
                                <h6 class="mg-b-0">${displayName}</h6>
                                <small class="tx-color-03">@${user.username}</small>
                            </div>
                        </div>
                    </td>
                    <td>${roleBadge}</td>
                    <td>${statusBadge}</td>
                    <td>${onlineStatus}</td>
                    <td>${location}</td>
                    <td>${lastSeen}</td>
                    <td>
                        <div class="dropdown">
                            <button class="btn btn-sm btn-outline-primary dropdown-toggle" type="button" data-bs-toggle="dropdown">
                                Actions
                            </button>
                            <ul class="dropdown-menu">
                                <li><a class="dropdown-item" href="#" onclick="editUser('${user._id}')" data-user-id="${user._id}">
                                    <i data-feather="edit"></i> Edit Profile
                                </a></li>
                                <li><a class="dropdown-item" href="#" onclick="changeUserPassword('${user._id}')" data-user-id="${user._id}">
                                    <i data-feather="key"></i> Change Password
                                </a></li>
                                <li><a class="dropdown-item" href="#" onclick="toggleUserStatus('${user._id}', ${user.isActive})" data-user-id="${user._id}">
                                    <i data-feather="${user.isActive ? 'user-x' : 'user-check'}"></i> 
                                    ${user.isActive ? 'Deactivate' : 'Activate'}
                                </a></li>
                                <li><hr class="dropdown-divider"></li>
                                <li><a class="dropdown-item text-danger" href="#" onclick="deleteUserConfirm('${user._id}')" data-user-id="${user._id}">
                                    <i data-feather="trash-2"></i> Delete User
                                </a></li>
                            </ul>
                        </div>
                    </td>
                </tr>
            `;
            tbody.append(row);
        });

        // Add event delegation for action buttons as fallback
        $(document).off('click', '.dropdown-item[data-user-id]').on('click', '.dropdown-item[data-user-id]', function(e) {
            e.preventDefault();
            const userId = $(this).data('user-id');
            const action = $(this).attr('onclick');
            
            if (action) {
                // Execute the onclick function
                eval(action);
            }
        });

        // Feather icons will be handled by the main dashforge.js
    }

    function renderPagination() {
        const pagination = $('#usersPagination');
        pagination.empty();

        // Use pagination data from API if available, otherwise use local variables
        const totalPagesCount = paginationData.totalPages || totalPages;
        const currentPageNum = paginationData.currentPage || currentPage;
        const totalUsers = paginationData.totalUsers || 0;

        if (totalPagesCount <= 1) {
            // Show pagination info even if only one page
            pagination.append(`
                <li class="page-item disabled">
                    <span class="page-link"> ${totalUsers} users</span>
                </li>
            `);
            return;
        }

        // Pagination info
        const startUser = ((currentPageNum - 1) * 10) + 1;
        const endUser = Math.min(currentPageNum * 10, totalUsers);
        pagination.append(`
            <li class="page-item disabled">
                <span class="page-link"> ${startUser}-${endUser} of ${totalUsers} users</span>
            </li>
        `);

        // Previous button
        const prevDisabled = currentPageNum === 1 ? 'disabled' : '';
        pagination.append(`
            <li class="page-item ${prevDisabled}">
                <a class="page-link" href="#" onclick="changePage(${currentPageNum - 1})" ${prevDisabled ? 'tabindex="-1"' : ''}>
                    <i data-feather="chevron-left"></i> Prev
                </a>
            </li>
        `);

        // Smart page numbers (show limited pages with ellipsis)
        const maxVisiblePages = 5;
        let startPage = Math.max(1, currentPageNum - Math.floor(maxVisiblePages / 2));
        let endPage = Math.min(totalPagesCount, startPage + maxVisiblePages - 1);
        
        if (endPage - startPage + 1 < maxVisiblePages) {
            startPage = Math.max(1, endPage - maxVisiblePages + 1);
        }

        // First page and ellipsis
        if (startPage > 1) {
            pagination.append(`
                <li class="page-item">
                    <a class="page-link" href="#" onclick="changePage(1)">1</a>
                </li>
            `);
            if (startPage > 2) {
                pagination.append(`
                    <li class="page-item disabled">
                        <span class="page-link">...</span>
                    </li>
                `);
            }
        }

        // Page numbers
        for (let i = startPage; i <= endPage; i++) {
            const active = i === currentPageNum ? 'active' : '';
            pagination.append(`
                <li class="page-item ${active}">
                    <a class="page-link" href="#" onclick="changePage(${i})">${i}</a>
                </li>
            `);
        }

        // Last page and ellipsis
        if (endPage < totalPagesCount) {
            if (endPage < totalPagesCount - 1) {
                pagination.append(`
                    <li class="page-item disabled">
                        <span class="page-link">...</span>
                    </li>
                `);
            }
            pagination.append(`
                <li class="page-item">
                    <a class="page-link" href="#" onclick="changePage(${totalPagesCount})">${totalPagesCount}</a>
                </li>
            `);
        }

        // Next button
        const nextDisabled = currentPageNum === totalPagesCount ? 'disabled' : '';
        pagination.append(`
            <li class="page-item ${nextDisabled}">
                <a class="page-link" href="#" onclick="changePage(${currentPageNum + 1})" ${nextDisabled ? 'tabindex="-1"' : ''}>
                    Next <i data-feather="chevron-right"></i>
                </a>
            </li>
        `);

        // Re-initialize feather icons for pagination
        if (typeof feather !== 'undefined') {
            feather.replace();
        }
    }

    function createUser() {
        const formData = new FormData($('#createUserForm')[0]);
        const data = Object.fromEntries(formData);

        //console.log('Creating user with data:', data);

        // Validate required fields
        if (!data.username) {
            showAlert('danger', 'Username is required');
            return;
        }
        if (!data.password) {
            showAlert('danger', 'Password is required');
            return;
        }

        $.ajax({
            url: '/users',
            method: 'POST',
            contentType: 'application/json',
            data: JSON.stringify(data),
            xhrFields: {
                withCredentials: true
            },
            success: function(response) {
                if (response.status === 'success') {
                    $('#createUserModal').modal('hide');
                    $('#createUserForm')[0].reset();
                    // Reset district dropdown
                    $('#createDistrict').val('').prop('disabled', true);
                    showAlert('success', 'User created successfully');
                    loadUsers();
                    loadUserStats();
                } else {
                    showAlert('danger', response.message || 'Failed to create user');
                }
            },
            error: function(xhr) {
                
                let errorMessage = 'Failed to create user';
                if (xhr.responseJSON && xhr.responseJSON.message) {
                    errorMessage = xhr.responseJSON.message;
                } else if (xhr.responseText) {
                    try {
                        const errorData = JSON.parse(xhr.responseText);
                        errorMessage = errorData.message || errorMessage;
                    } catch (e) {
                        errorMessage = xhr.responseText;
                    }
                }
                
                showAlert('danger', errorMessage);
            }
        });
    }

    function updateUser() {
        const userId = $('#editUserId').val();
        const formData = new FormData($('#editUserForm')[0]);
        const data = Object.fromEntries(formData);

        // Convert string values to appropriate types
        data.isActive = data.isActive === 'true';
        data.verified = data.verified === 'true';

        $.ajax({
            url: `/users/${userId}`,
            method: 'PUT',
            contentType: 'application/json',
            data: JSON.stringify(data),
            xhrFields: {
                withCredentials: true
            },
            success: function(response) {
                if (response.status === 'success') {
                    $('#editUserModal').modal('hide');
                    showAlert('success', 'User updated successfully');
                    loadUsers();
                    loadUserStats();
                } else {
                    showAlert('danger', response.message || 'Failed to update user');
                }
            },
            error: function(xhr) {
                const error = xhr.responseJSON?.message || 'Failed to update user';
                showAlert('danger', error);
            }
        });
    }

    function changePassword() {
        const userId = $('#changePasswordUserId').val();
        const password = $('#changePasswordForm input[name="password"]').val();
        const confirmPassword = $('#changePasswordForm input[name="confirmPassword"]').val();

        if (!password) {
            showAlert('danger', 'Password is required');
            return;
        }

        if (password.length < 6) {
            showAlert('danger', 'Password must be at least 6 characters long');
            return;
        }

        if (password !== confirmPassword) {
            showAlert('danger', 'Passwords do not match');
            return;
        }
        
        const user = usersData.find(u => u._id === userId);
        showAlert('info', `Changing password for ${user?.username || 'user'}...`);
        
        $.ajax({
            url: `/users/${userId}/password`,
            method: 'PUT',
            contentType: 'application/json',
            data: JSON.stringify({ password }),
            xhrFields: {
                withCredentials: true
            },
            success: function(response) {
                if (response.status === 'success') {
                    $('#changePasswordModal').modal('hide');
                    $('#changePasswordForm')[0].reset();
                    showAlert('success', `Password changed successfully for ${user?.username || 'user'}`);
                } else {
                    showAlert('danger', response.message || 'Failed to change password');
                }
            },
            error: function(xhr) {
                const error = xhr.responseJSON?.message || 'Failed to change password';
                showAlert('danger', error);
            }
        });
    }

    function deleteUser(userId) {
        const user = usersData.find(u => u._id === userId);
        
        showAlert('info', `Deleting user "${user?.username || 'Unknown'}"...`);
        
        $.ajax({
            url: `/users/${userId}`,
            method: 'DELETE',
            xhrFields: {
                withCredentials: true
            },
            success: function(response) {
                if (response.status === 'success') {
                    // Show success with Sweet Alert
                    Swal.fire({
                        title: 'Deleted!',
                        text: `User "${user?.username || 'Unknown'}" has been deleted successfully.`,
                        icon: 'success',
                        timer: 2000,
                        showConfirmButton: false
                    });
                    loadUsers();
                    loadUserStats();
                } else {
                    showAlert('danger', response.message || 'Failed to delete user');
                }
            },
            error: function(xhr) {
                const error = xhr.responseJSON?.message || 'Failed to delete user';
                showAlert('danger', error);
            }
        });
    }

    window.toggleUserStatus = function(userId, currentStatus) {
         const user = usersData.find(u => u._id === userId);
        if (!user) {
            return;
        }
        const action = currentStatus ? 'deactivate' : 'activate';
        
        // Show loading state
        showAlert('info', `${action === 'activate' ? 'Activating' : 'Deactivating'} user...`);
        
        $.ajax({
            url: `/users/${userId}/status`,
            method: 'PUT',
            contentType: 'application/json',
            data: JSON.stringify({ isActive: !currentStatus }),
            xhrFields: {
                withCredentials: true
            },
            success: function(response) {
                if (response.status === 'success') {
                    showAlert('success', `User "${user?.username || 'Unknown'}" ${!currentStatus ? 'activated' : 'deactivated'} successfully`);
                    loadUsers();
                    loadUserStats();
                } else {
                    showAlert('danger', response.message || 'Failed to update user status');
                }
            },
            error: function(xhr) {
                showAlert('danger', error);
            }
        });
    }

    function exportUsers() {
        window.open('/users/export', '_blank');
    }

    // Test function for debugging
    window.testActions = function() {
        if (usersData && usersData.length > 0) {
            const firstUser = usersData[0];
            window.editUser(firstUser._id);
        } else {
            console.log('No users data available for testing');
        }
    };

    // Loading state functions
    function showLoadingState() {
        const tbody = $('#usersTableBody');
        tbody.html(`
            <tr>
                <td colspan="6" class="text-center py-4">
                    <div class="d-flex flex-column align-items-center">
                        <div class="spinner-border text-primary" role="status">
                            <span class="visually-hidden">Loading...</span>
                        </div>
                        <p class="mg-t-10 mg-b-0 tx-color-03">Loading users...</p>
                    </div>
                </td>
            </tr>
        `);
        
        // Disable pagination during loading
        $('#usersPagination').html(`
            <li class="page-item disabled">
                <span class="page-link">Loading...</span>
            </li>
        `);
    }

    function hideLoadingState() {
        // Loading state will be replaced by renderUsersTable() and renderPagination()
    }

    // Global functions for inline event handlers
    window.editUser = function(userId) {
        const user = usersData.find(u => u._id === userId);
        if (!user) {
            console.error('User not found:', userId);
            return;
        }

        // Populate basic fields
        $('#editUserId').val(user._id);
        $('#editUsername').val(user.username);
        $('#editEmail').val(user.email || '');
        $('#editPhone').val(user.phone || '');
        $('#editRole').val(user.role);
        $('#editFirstName').val(user.firstName || '');
        $('#editLastName').val(user.lastName || '');
        $('#editIsActive').val(user.isActive.toString());
        $('#editVerified').val(user.verified.toString());

        // Handle region-district dependency
        if (user.region) {
            $('#editRegion').val(user.region);
            updateDistrictOptions('#editDistrict', user.region);
            // Set district after options are loaded
            setTimeout(() => {
                $('#editDistrict').val(user.district || '');
            }, 100);
        } else {
            $('#editRegion').val('');
            $('#editDistrict').val('').prop('disabled', true);
        }

        $('#editUserModal').modal('show');
    };

    window.changeUserPassword = function(userId) {
        $('#changePasswordUserId').val(userId);
        $('#changePasswordModal').modal('show');
    };

    window.deleteUserConfirm = function(userId) {
        const user = usersData.find(u => u._id === userId);
        if (!user) {
            return;
        }
        
        // Use Sweet Alert for confirmation
        Swal.fire({
            title: 'Delete User',
            html: `Are you sure you want to delete user <strong>${user.firstName || user.username} (${user.username})</strong>?<br><br><span class="text-danger">This action cannot be undone!</span>`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            cancelButtonColor: '#3085d6',
            confirmButtonText: 'Yes, delete it!',
            cancelButtonText: 'Cancel',
            reverseButtons: true
        }).then((result) => {
            if (result.isConfirmed) {
                deleteUser(userId);
            }
        });
    };

    window.changePage = function(page) {
        const totalPagesCount = paginationData.totalPages || totalPages;
        if (page >= 1 && page <= totalPagesCount) {
            currentPage = page;
            loadUsers();
        }
    };

    // Utility functions
    // District-Region dependency function
    function updateDistrictOptions(selector, region) {
        const districtSelect = $(selector);
        districtSelect.empty().append('<option value="">Select District</option>');
        
        if (!region) {
            districtSelect.prop('disabled', true);
            return;
        }
        
        // District data based on regions
        const districts = {
            'Central': ['Kampala', 'Wakiso', 'Mukono', 'Buikwe', 'Kayunga', 'Luweero', 'Nakaseke', 'Nakasongola', 'Mpigi', 'Butambala', 'Gomba', 'Kalungu', 'Lwengo', 'Masaka', 'Rakai', 'Sembabule', 'Kalangala', 'Buvuma'],
            'Northern': ['Gulu', 'Kitgum', 'Pader', 'Agago', 'Amuru', 'Lamwo', 'Nwoya', 'Omoro', 'Arua', 'Koboko', 'Maracha', 'Terego', 'Yumbe', 'Zombo', 'Adjumani', 'Moyo', 'Obongi', 'Lira', 'Alebtong', 'Amolatar', 'Dokolo', 'Kole', 'Kwania', 'Otuke', 'Oyam', 'Apac', 'Kole', 'Kwania', 'Oyam'],
            'Eastern': ['Jinja', 'Kamuli', 'Buyende', 'Iganga', 'Bugiri', 'Bugweri', 'Iganga', 'Jinja', 'Kaliro', 'Luuka', 'Mayuge', 'Namayingo', 'Namutumba', 'Tororo', 'Busia', 'Butaleja', 'Kibuku', 'Pallisa', 'Butebo', 'Kibuku', 'Pallisa', 'Butebo', 'Mbale', 'Budaka', 'Bududa', 'Bulambuli', 'Kween', 'Manafwa', 'Namisindwa', 'Sironko', 'Kapchorwa', 'Bukwo', 'Kween', 'Kotido', 'Abim', 'Kaabong', 'Karenga', 'Nabilatuk', 'Napak', 'Moroto', 'Amudat', 'Nakapiripirit', 'Nabilatuk'],
            'Western': ['Mbarara', 'Bushenyi', 'Ibanda', 'Isingiro', 'Kiruhura', 'Ntungamo', 'Rubirizi', 'Sheema', 'Kasese', 'Bundibugyo', 'Bunyangabu', 'Kabarole', 'Kamwenge', 'Kitagwenda', 'Kyegegwa', 'Ntoroko', 'Fort Portal', 'Hoima', 'Buliisa', 'Kakumiro', 'Kibaale', 'Kikuube', 'Kiryandongo', 'Masindi', 'Masindi', 'Kabarole', 'Bundibugyo', 'Bunyangabu', 'Kamwenge', 'Kitagwenda', 'Kyegegwa', 'Ntoroko']
        };
        
        if (districts[region]) {
            districts[region].forEach(district => {
                districtSelect.append(`<option value="${district}">${district}</option>`);
            });
            districtSelect.prop('disabled', false);
        } else {
            districtSelect.prop('disabled', true);
        }
    }

    function getRoleBadge(role) {
        const badges = {
            'admin': '<span class="badge bg-danger">Administrator</span>',
            'coordinator': '<span class="badge bg-warning">Coordinator</span>',
            'citizen': '<span class="badge bg-primary">Citizen</span>'
        };
        return badges[role] || '<span class="badge bg-secondary">Unknown</span>';
    }

    function formatDate(dateString) {
        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMins / 60);
        const diffDays = Math.floor(diffHours / 24);

        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffHours < 24) return `${diffHours}h ago`;
        if (diffDays < 7) return `${diffDays}d ago`;
        
        return date.toLocaleDateString();
    }

    function debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    function showAlert(type, message) {
        const alertClass = type === 'success' ? 'alert-success' : 'alert-danger';
        const html = `
            <div class="alert ${alertClass} alert-dismissible fade show position-fixed" style="top: 20px; right: 20px; z-index: 9999;" role="alert">
                ${message}
                <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
            </div>
        `;
        $('body').append(html);
        setTimeout(function() { $('.alert').alert('close'); }, 5000);
    }
});