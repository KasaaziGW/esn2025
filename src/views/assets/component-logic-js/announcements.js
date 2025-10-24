
    // Global variables
    let currentPage = 1;
    let currentSearch = '';
    let currentSortBy = 'createdAt';
    let currentSortOrder = 'desc';
    let currentFilters = {
        emergency: false,
        active: false,
        pinned: false
    };

    // Initialize page
    $(document).ready(function() {
        
        // Current user is set in the EJS template
        console.log('Current user available:', window.currentUser);
        
        loadAnnouncements();
        loadCommunityInfo();
        loadAnnouncementStats();
        
        // Forward announcement modal event handlers
        $('#forwardAnnouncementModal').on('show.bs.modal', function() {
            populateForwardAnnouncementPreview();
        });
        
        // Forward to public chat
        $('#forwardToPublicChat').on('click', function() {
            if (window.currentForwardingAnnouncement) {
                forwardAnnouncementToChat('public', null);
            }
        });
        
        // Forward to private chat
        $('#forwardToPrivateChat').on('click', function() {
            $('#userSearchSection').show();
            loadCommunityUsers();
        });
        
        // User search functionality
        $('#userSearchInput').on('input', function() {
            const searchTerm = $(this).val().toLowerCase();
            if (searchTerm.length >= 2) {
                searchUsers(searchTerm);
            } else {
                $('#userSearchResults').empty();
            }
        });
        
        // Event listeners
        $('#searchInput').on('keypress', function(e) {
            if (e.which === 13) { // Enter key
                searchAnnouncements();
            }
        });
        
        // Real-time search with debounce
        let searchTimeout;
        $('#searchInput').on('input', function() {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(function() {
                searchAnnouncements();
            }, 500); // 500ms delay
        });
        
        $('#sortBy, #sortOrder').on('change', function() {
            currentSortBy = $('#sortBy').val();
            currentSortOrder = $('#sortOrder').val();
            loadAnnouncements();
        });
        
        // Filter button event listeners
        $('#filterEmergency').on('click', function() {
            currentFilters.emergency = !currentFilters.emergency;
            $(this).toggleClass('active', currentFilters.emergency);
            loadAnnouncements();
        });
        
        $('#filterActive').on('click', function() {
            currentFilters.active = !currentFilters.active;
            $(this).toggleClass('active', currentFilters.active);
            loadAnnouncements();
        });
        
        $('#filterPinned').on('click', function() {
            currentFilters.pinned = !currentFilters.pinned;
            $(this).toggleClass('active', currentFilters.pinned);
            loadAnnouncements();
        });
        
        // Sidebar filter event listeners
        $('#filterAll').on('click', function(e) {
            e.preventDefault();
            currentFilters.emergency = false;
            currentFilters.active = false;
            currentFilters.pinned = false;
            $('#filterEmergency, #filterActive, #filterPinned').removeClass('active');
            loadAnnouncements();
        });
        
        $('#filterGeneral').on('click', function(e) {
            e.preventDefault();
            currentFilters.emergency = false;
            currentFilters.active = false;
            currentFilters.pinned = false;
            $('#filterEmergency, #filterActive, #filterPinned').removeClass('active');
            loadAnnouncements();
        });
        
        $('#filterEmergencyType').on('click', function(e) {
            e.preventDefault();
            currentFilters.emergency = true;
            currentFilters.active = false;
            currentFilters.pinned = false;
            $('#filterEmergency').addClass('active');
            $('#filterActive, #filterPinned').removeClass('active');
            loadAnnouncements();
        });
        
        $('#filterPinnedType').on('click', function(e) {
            e.preventDefault();
            currentFilters.emergency = false;
            currentFilters.active = false;
            currentFilters.pinned = true;
            $('#filterPinned').addClass('active');
            $('#filterEmergency, #filterActive').removeClass('active');
            loadAnnouncements();
        });
    });

    // Load announcements
    function loadAnnouncements() {
        console.log('=== LOADING ANNOUNCEMENTS ===');
        
        const params = new URLSearchParams({
            page: currentPage,
            limit: 10,
            sortBy: currentSortBy,
            sortOrder: currentSortOrder
        });
        
        if (currentSearch) {
            params.append('search', currentSearch);
        }
        
        // Add filter parameters
        if (currentFilters.emergency) {
            params.append('emergency', 'true');
        }
        if (currentFilters.active) {
            params.append('status', 'active');
        }
        if (currentFilters.pinned) {
            params.append('pinned', 'true');
        }
        
        $.ajax({
            url: `/announcements/list?${params}`,
            method: 'GET',
            success: function(response) {
                
                if (response.data && response.data.announcements) {
                    renderAnnouncementsTable(response.data.announcements);
                    updatePaginationInfo(response.data.pagination);
                    renderPagination(response.data.pagination);
                } else {
                    console.error('Invalid response structure:', response);
                    $('#announcementsGrid').html(`
                        <div class="col-12 text-center text-danger">
                            <i data-feather="alert-circle" class="wd-16 mg-r-5"></i>
                            Invalid response format. Please try again.
                        </div>
                    `);
                    feather.replace();
                }
            },
            error: function(xhr) {
                $('#announcementsGrid').html(`
                    <div class="col-12 text-center text-danger">
                        <i data-feather="alert-circle" class="wd-16 mg-r-5"></i>
                        Failed to load announcements. Please try again.
                    </div>
                `);
                feather.replace();
            }
        });
    }

    // Render announcements grid
    function renderAnnouncementsTable(announcements) {
        const grid = $('#announcementsGrid');
        
        if (!announcements || announcements.length === 0) {
            grid.html(`
                <div class="col-12 text-center text-muted">
                    <i data-feather="inbox" class="wd-16 mg-r-5"></i>
                    No announcements found.
                </div>
            `);
            feather.replace();
            return;
        }
        
        let html = '';
        announcements.forEach(announcement => {
            const createdDate = new Date(announcement.createdAt);
            const dateString = createdDate.toLocaleDateString();
            const timeString = createdDate.toLocaleTimeString();
            const attachmentCount = announcement.attachments ? announcement.attachments.length : 0;
            
            console.log('Rendering announcement:', announcement._id);
            
            html += `
                <div class="col-md-6 mg-t-20">
                    <div class="card card-event">
                        <div class="card-body tx-13">
                            <div class="d-flex align-items-center justify-content-between mg-b-10">
                                <h5 class="mg-b-0">
                                    <a href="#" onclick="viewAnnouncement('${announcement._id}')" class="link-01">${announcement.title}</a>
                                </h5>
                                <div class="dropdown">
                                    <button class="btn btn-xs btn-outline-secondary dropdown-toggle" type="button" data-bs-toggle="dropdown" aria-expanded="false">
                                        <i data-feather="more-vertical"></i>
                                    </button>
                                    <ul class="dropdown-menu">
                                        <li><a class="dropdown-item" href="#" onclick="viewAnnouncement('${announcement._id}')">
                                            <i data-feather="eye" class="wd-12 mg-r-5"></i>View Details
                                        </a></li>
                                        <li><a class="dropdown-item" href="#" onclick="forwardAnnouncement('${announcement._id}')">
                                            <i data-feather="share-2" class="wd-12 mg-r-5"></i>Share
                                        </a></li>
                                    </ul>
                                </div>
                            </div>
                            <p class="mg-b-15 tx-color-03">${announcement.body.substring(0, 100)}${announcement.body.length > 100 ? '...' : ''}</p>
                            <div class="d-flex align-items-center justify-content-between">
                                <div class="d-flex align-items-center">
                                    <div class="avatar avatar-xs bg-primary text-white rounded-circle mg-r-10">
                                        ${(announcement.createdBy.displayName || announcement.createdBy.username).charAt(0).toUpperCase()}
                                    </div>
                                    <div>
                                        <div class="tx-weight-600 tx-12">${announcement.createdBy.displayName || announcement.createdBy.username}</div>
                                        <div class="tx-color-03 tx-11">${announcement.createdBy.role}</div>
                                    </div>
                                </div>
                                <div class="text-right">
                                    <div class="tx-12 tx-color-03">${dateString}</div>
                                    <div class="tx-11 tx-color-04">${timeString}</div>
                                    <div class="d-flex align-items-center mg-t-5">
                                        <span class="badge badge-${announcement.isEmergency ? 'danger' : 'info'} mg-r-5">
                                            ${announcement.isEmergency ? 'Emergency' : 'General'}
                                        </span>
                                        ${announcement.pinned ? '<span class="badge badge-warning mg-r-5">Pinned</span>' : ''}
                                        <span class="badge badge-${getPriorityBadgeClass(announcement.severity)}">
                                            ${getPriorityText(announcement.severity)}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div class="card-footer tx-13">
                            <div class="d-flex align-items-center justify-content-between">
                                <div class="d-flex align-items-center">
                                    <span class="tx-color-03 mg-r-15">
                                        <i data-feather="eye" class="wd-12 mg-r-2"></i>${announcement.viewCount || 0} views
                                    </span>
                                    <span class="tx-color-03 mg-r-15">
                                        <i data-feather="share-2" class="wd-12 mg-r-2"></i>${announcement.forwardCount || 0} shares
                                    </span>
                                    <span class="tx-color-03">
                                        <i data-feather="paperclip" class="wd-12 mg-r-2"></i>${attachmentCount} files
                                    </span>
                                </div>
                                <span class="badge badge-${getStatusBadgeClass(announcement.status)}">
                                    ${getStatusText(announcement.status)}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        });
        
        grid.html(html);
        feather.replace();
        
        // Store announcements data for forwarding functionality
        window.announcementsData = announcements;
        
        // Initialize Bootstrap dropdowns
        if (typeof bootstrap !== 'undefined') {
            // Bootstrap 5 syntax
            const dropdownElementList = [].slice.call(document.querySelectorAll('.dropdown-toggle'));
            dropdownElementList.map(function (dropdownToggleEl) {
                return new bootstrap.Dropdown(dropdownToggleEl);
            });
        } else {
            // Fallback to jQuery if Bootstrap 5 is not available
            $('.dropdown-toggle').dropdown();
        }
    }

    // Update pagination info
    function updatePaginationInfo(pagination) {
        const info = `Showing ${pagination.startItem} to ${pagination.endItem} of ${pagination.totalItems} announcements`;
        $('#paginationInfo').text(info);
    }

    // Render pagination
    function renderPagination(pagination) {
        const paginationContainer = $('#pagination');
        let html = '';
        
        // Previous button
        html += `
            <li class="page-item ${pagination.currentPage === 1 ? 'disabled' : ''}">
                <a class="page-link" href="#" onclick="changePage(${pagination.currentPage - 1})">Previous</a>
            </li>
        `;
        
        // Page numbers
        for (let i = 1; i <= pagination.totalPages; i++) {
            if (i === pagination.currentPage || (i >= pagination.currentPage - 2 && i <= pagination.currentPage + 2)) {
                html += `
                    <li class="page-item ${i === pagination.currentPage ? 'active' : ''}">
                        <a class="page-link" href="#" onclick="changePage(${i})">${i}</a>
                    </li>
                `;
            } else if (i === 1 || i === pagination.totalPages || (i === pagination.currentPage - 3) || (i === pagination.currentPage + 3)) {
                html += `
                    <li class="page-item">
                        <a class="page-link" href="#" onclick="changePage(${i})">${i}</a>
                    </li>
                `;
            } else if (i === pagination.currentPage - 4 || i === pagination.currentPage + 4) {
                html += '<li class="page-item disabled"><span class="page-link">...</span></li>';
            }
        }
        
        // Next button
        html += `
            <li class="page-item ${pagination.currentPage === pagination.totalPages ? 'disabled' : ''}">
                <a class="page-link" href="#" onclick="changePage(${pagination.currentPage + 1})">Next</a>
            </li>
        `;
        
        paginationContainer.html(html);
    }

    // Change page
    function changePage(page) {
        if (page >= 1 && page <= $('#pagination').data('total-pages')) {
            currentPage = page;
            loadAnnouncements();
        }
    }

    // Search announcements
    function searchAnnouncements() {
        currentSearch = $('#searchInput').val().trim();
        currentPage = 1;
        loadAnnouncements();
    }

    // Refresh announcements
    function refreshAnnouncements() {
        loadAnnouncements();
    }

    // Helper functions
    function getPriorityText(priority) {
        const priorityMap = {
            'low': 'Low',
            'medium': 'Medium',
            'high': 'High',
            'critical': 'Critical'
        };
        return priorityMap[priority] || priority;
    }

    function getStatusText(status) {
        const statusMap = {
            'active': 'Active',
            'resolved': 'Resolved',
            'cancelled': 'Cancelled'
        };
        return statusMap[status] || status;
    }

    function getPriorityBadgeClass(priority) {
        const classMap = {
            'low': 'success',
            'medium': 'warning',
            'high': 'danger',
            'critical': 'dark'
        };
        return classMap[priority] || 'secondary';
    }

    function getStatusBadgeClass(status) {
        const classMap = {
            'active': 'success',
            'resolved': 'info',
            'cancelled': 'secondary'
        };
        return classMap[status] || 'secondary';
    }

    // Load community info
    function loadCommunityInfo() {
        $.ajax({
            url: '/community-access/my-community',
            method: 'GET',
            success: function(response) {
                //console.log('Community info response:', response);
                if (response.data && response.data.community) {
                    const community = response.data.community;
                    //console.log('Community data:', community);
                    $('#communityDescription').html(`
                        View community announcements for <strong>${community.name}</strong>${community.address ? ` located at ${community.address}` : ''}.
                    `);
                } else {
                    //console.log('No community data found');
                    $('#communityDescription').html('View community announcements for your community.');
                }
            },
            error: function(xhr) {
                console.error('Failed to load community info:', xhr);
                console.error('Status:', xhr.status);
                console.error('Response Text:', xhr.responseText);
                $('#communityDescription').html('View community announcements for your community.');
            }
        });
    }

    // Load announcement statistics
    function loadAnnouncementStats() {
        $.ajax({
            url: '/announcements/list?limit=1000', // Get all announcements for stats
            method: 'GET',
            success: function(response) {
                //console.log('Stats response:', response);
                const announcements = response.data?.announcements || [];
                //console.log('Announcements for stats:', announcements);
                
                const stats = {
                    total: announcements.length,
                    emergency: announcements.filter(a => a.isEmergency).length,
                    general: announcements.filter(a => !a.isEmergency).length,
                    pinned: announcements.filter(a => a.pinned).length,
                    active: announcements.filter(a => a.status === 'active').length,
                    totalViews: announcements.reduce((sum, a) => sum + (a.viewCount || 0), 0),
                    totalShares: announcements.reduce((sum, a) => sum + (a.forwardCount || 0), 0)
                };
                
                $('#announcementStats').html(`
                    <div class="list-unstyled">
                        <div class="media align-items-center mg-b-10">
                            <div class="wd-40 ht-40 bg-primary tx-white d-flex align-items-center justify-content-center rounded mg-r-10">
                                <i data-feather="bell"></i>
                            </div>
                            <div class="media-body">
                                <div class="tx-weight-600">${stats.total} Total</div>
                                <div class="tx-12 tx-color-03">Announcements</div>
                            </div>
                        </div>
                        <div class="media align-items-center mg-b-10">
                            <div class="wd-40 ht-40 bg-danger tx-white d-flex align-items-center justify-content-center rounded mg-r-10">
                                <i data-feather="alert-triangle"></i>
                            </div>
                            <div class="media-body">
                                <div class="tx-weight-600">${stats.emergency} Emergency</div>
                                <div class="tx-12 tx-color-03">Alerts</div>
                            </div>
                        </div>
                        <div class="media align-items-center mg-b-10">
                            <div class="wd-40 ht-40 bg-success tx-white d-flex align-items-center justify-content-center rounded mg-r-10">
                                <i data-feather="eye"></i>
                            </div>
                            <div class="media-body">
                                <div class="tx-weight-600">${stats.totalViews} Views</div>
                                <div class="tx-12 tx-color-03">Total Views</div>
                            </div>
                        </div>
                        <div class="media align-items-center">
                            <div class="wd-40 ht-40 bg-info tx-white d-flex align-items-center justify-content-center rounded mg-r-10">
                                <i data-feather="share-2"></i>
                            </div>
                            <div class="media-body">
                                <div class="tx-weight-600">${stats.totalShares} Shares</div>
                                <div class="tx-12 tx-color-03">Total Shares</div>
                            </div>
                        </div>
                    </div>
                `);
                
                // Update badge counts
                $('#badgeAll').text(stats.total);
                $('#badgeGeneral').text(stats.general);
                $('#badgeEmergency').text(stats.emergency);
                $('#badgePinned').text(stats.pinned);
                
                feather.replace();
            },
            error: function(xhr) {
                console.error('Failed to load announcement stats:', xhr);
                console.error('Status:', xhr.status);
                console.error('Response Text:', xhr.responseText);
                $('#announcementStats').html('<p class="text-muted">Failed to load statistics</p>');
            }
        });
    }

    // View announcement details
    function viewAnnouncement(announcementId) {
        // First track the view
        $.ajax({
            url: `/announcements/id/${announcementId}/view`,
            method: 'POST',
            success: function(response) {
                // Then load the announcement details
                loadAnnouncementDetails(announcementId);
            },
            error: function(xhr) {
                console.error('Failed to track view:', xhr);
                // Still try to load the announcement details
                loadAnnouncementDetails(announcementId);
            }
        });
    }

    // Load announcement details
    function loadAnnouncementDetails(announcementId) {
        $.ajax({
            url: `/announcements/id/${announcementId}`,
            method: 'GET',
            success: function(response) {
                const announcement = response.data;
                showAnnouncementDetailsModal(announcement);
            },
            error: function(xhr) {
                console.error('Failed to load announcement:', xhr);
                Swal.fire('Error', 'Failed to load announcement details', 'error');
            }
        });
    }

    // Show announcement details modal
    function showAnnouncementDetailsModal(announcement) {
        const attachmentsHtml = announcement.attachments && announcement.attachments.length > 0 
            ? announcement.attachments.map(att => 
                `<a href="${att.url}" target="_blank" class="btn btn-sm btn-outline-secondary mg-r-5 mg-b-5">
                    <i data-feather="paperclip" class="wd-10 mg-r-2"></i>${att.filename}
                </a>`
              ).join('')
            : '<p class="text-muted">No attachments</p>';
        
        Swal.fire({
            title: announcement.title,
            html: `
                <div class="text-left">
                    <table class="table table-bordered table-sm">
                        <tr>
                            <td class="bg-light font-weight-bold" style="width: 30%;">Type</td>
                            <td><span class="badge ${announcement.isEmergency ? 'badge-danger' : 'badge-info'}">${announcement.isEmergency ? 'Emergency' : 'General'}</span></td>
                        </tr>
                        <tr>
                            <td class="bg-light font-weight-bold">Priority</td>
                            <td><span class="badge badge-${getPriorityBadgeClass(announcement.severity)}">${getPriorityText(announcement.severity)}</span></td>
                        </tr>
                        <tr>
                            <td class="bg-light font-weight-bold">Status</td>
                            <td><span class="badge badge-${getStatusBadgeClass(announcement.status)}">${getStatusText(announcement.status)}</span></td>
                        </tr>
                        <tr>
                            <td class="bg-light font-weight-bold">Author</td>
                            <td>${announcement.createdBy.displayName || announcement.createdBy.username} (${announcement.createdBy.role})</td>
                        </tr>
                        <tr>
                            <td class="bg-light font-weight-bold">Views</td>
                            <td><span class="badge badge-light"><i data-feather="eye" class="wd-10 mg-r-2"></i>${announcement.viewCount || 0}</span></td>
                        </tr>
                        <tr>
                            <td class="bg-light font-weight-bold">Forwards</td>
                            <td><span class="badge badge-light"><i data-feather="share-2" class="wd-10 mg-r-2"></i>${announcement.forwardCount || 0}</span></td>
                        </tr>
                        <tr>
                            <td class="bg-light font-weight-bold">Created</td>
                            <td>${new Date(announcement.createdAt).toLocaleString()}</td>
                        </tr>
                        <tr>
                            <td class="bg-light font-weight-bold">Pinned</td>
                            <td>${announcement.pinned ? '<span class="badge badge-warning">Yes</span>' : '<span class="badge badge-light">No</span>'}</td>
                        </tr>
                    </table>
                    <hr>
                    <h6 class="font-weight-bold">Message:</h6>
                    <div class="border p-3 bg-light rounded">${announcement.body}</div>
                    <hr>
                    <h6 class="font-weight-bold">Attachments:</h6>
                    <div class="border p-3 bg-light rounded">${attachmentsHtml}</div>
                </div>
            `,
            width: '700px',
            showCloseButton: true,
            showConfirmButton: false,
            customClass: {
                popup: 'text-left'
            },
            didOpen: () => {
                feather.replace(); // Initialize feather icons in the modal
            }
        });
    }

    // Forward announcement
    function forwardAnnouncement(announcementId) {
        // Find the announcement data
        const announcement = window.announcementsData?.find(ann => ann._id === announcementId);
        if (!announcement) {
            Swal.fire('Error', 'Announcement not found', 'error');
            return;
        }
        
        // Store the announcement data for the modal
        window.currentForwardingAnnouncement = announcement;
        
        // Show the forward modal
        $('#forwardAnnouncementModal').modal('show');
    }
    
    // Populate announcement preview in forward modal
    function populateForwardAnnouncementPreview() {
        if (!window.currentForwardingAnnouncement) return;
        
        const announcement = window.currentForwardingAnnouncement;
        const previewHtml = `
            <div class="announcement-preview">
                <h6 class="tx-weight-600 mg-b-10">${announcement.title}</h6>
                <p class="tx-color-03 mg-b-10">${announcement.body.substring(0, 200)}${announcement.body.length > 200 ? '...' : ''}</p>
                <div class="d-flex align-items-center justify-content-between">
                    <div class="d-flex align-items-center">
                        <div class="avatar avatar-xs bg-primary text-white rounded-circle mg-r-5">
                            ${(announcement.createdBy.displayName || announcement.createdBy.username).charAt(0).toUpperCase()}
                        </div>
                        <div>
                            <small class="tx-weight-600">${announcement.createdBy.displayName || announcement.createdBy.username}</small>
                            <br>
                            <small class="tx-color-03">${new Date(announcement.createdAt).toLocaleDateString()}</small>
                        </div>
                    </div>
                    <div class="text-end">
                        <span class="badge ${announcement.isEmergency ? 'bg-danger' : 'bg-primary'} mg-r-5">
                            ${announcement.isEmergency ? 'Emergency' : 'General'}
                        </span>
                        ${announcement.pinned ? '<span class="badge bg-warning">Pinned</span>' : ''}
                    </div>
                </div>
            </div>
        `;
        
        $('#forwardAnnouncementPreview').html(previewHtml);
    }
    
    // Load community users for private chat forwarding
    function loadCommunityUsers() {
        $.ajax({
            url: '/community-access/members',
            method: 'GET',
            success: function(response) {
                if (response.success && response.data && response.data.members) {
                    window.communityUsers = response.data.members;
                    console.log('Community users loaded:', window.communityUsers);
                } else {
                    console.error('Invalid response structure:', response);
                    //Swal.fire('Error', 'Failed to load community members', 'error');
                }
            },
            error: function(xhr) {
                console.error('Failed to load community users:', xhr);
                //Swal.fire('Error', 'Failed to load community members', 'error');
            }
        });
    }
    
    // Search users for private chat
    function searchUsers(searchTerm) {
        if (!window.communityUsers) return;
        
        const filteredUsers = window.communityUsers.filter(user => {
            const fullName = (user.displayName || user.username || '').toLowerCase();
            const firstName = (user.firstName || '').toLowerCase();
            const lastName = (user.lastName || '').toLowerCase();
            const username = (user.username || '').toLowerCase();
            
            return fullName.includes(searchTerm) || 
                   firstName.includes(searchTerm) || 
                   lastName.includes(searchTerm) || 
                   username.includes(searchTerm);
        });
        
        displayUserSearchResults(filteredUsers);
    }
    
    // Display user search results
    function displayUserSearchResults(users) {
        const resultsContainer = $('#userSearchResults');
        resultsContainer.empty();
        
        if (users.length === 0) {
            resultsContainer.html('<div class="list-group-item text-center text-muted">No users found</div>');
            return;
        }
        
        users.forEach(user => {
            const userHtml = `
                <div class="list-group-item list-group-item-action" onclick="selectUserForForwarding('${user._id}')">
                    <div class="d-flex align-items-center">
                        <div class="avatar avatar-sm bg-primary text-white rounded-circle mg-r-10">
                            ${(user.displayName || user.username).charAt(0).toUpperCase()}
                        </div>
                        <div>
                            <div class="tx-weight-600">${user.displayName || user.username}</div>
                            <small class="tx-color-03">${user.role} • ${user.username}</small>
                        </div>
                    </div>
                </div>
            `;
            resultsContainer.append(userHtml);
        });
    }
    
    // Select user for forwarding
    function selectUserForForwarding(userId) {
        const user = window.communityUsers?.find(u => u._id === userId);
        if (user && window.currentForwardingAnnouncement) {
            forwardAnnouncementToChat('private', user);
        }
    }
    
    // Forward announcement to chat
    function forwardAnnouncementToChat(chatType, targetUser) {
        if (!window.currentForwardingAnnouncement) return;
        
        const announcement = window.currentForwardingAnnouncement;
        const forwardData = {
            announcementId: announcement._id,
            chatType: chatType,
            targetUserId: targetUser ? targetUser._id : null
        };
        
        $.ajax({
            url: '/announcements/forward',
            method: 'POST',
            contentType: 'application/json',
            data: JSON.stringify(forwardData),
            success: function(response) {
                if (response.success) {
                    Swal.fire({
                        title: 'Success!',
                        text: `Announcement forwarded to ${chatType === 'public' ? 'public chat' : targetUser.displayName + '\'s private chat'}`,
                        icon: 'success',
                        timer: 3000
                    });
                    $('#forwardAnnouncementModal').modal('hide');
                    // Reset the modal
                    $('#userSearchSection').hide();
                    $('#userSearchInput').val('');
                    $('#userSearchResults').empty();
                } else {
                    //Swal.fire('Error', response.message || 'Failed to forward announcement', 'error');
                }
            },
            error: function(xhr) {
                console.error('Forward announcement error:', xhr);
                //Swal.fire('Error', 'Failed to forward announcement', 'error');
            }
        });
    }
