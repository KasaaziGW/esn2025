
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
        console.log('=== ANNOUNCEMENTS PAGE INITIALIZED ===');
        
        // Set current user info for permission checks
        window.currentUser = {
            id: '<%= typeof user !== "undefined" ? (user._id || user.id) : "" %>',
            role: '<%= typeof user !== "undefined" ? user.role : "" %>'
        };
        
        console.log('Current user set:', window.currentUser);
        
        loadAnnouncements();
        loadCommunityInfo();
        loadAnnouncementStats();
        
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
            url: `/api/announcements/list?${params}`,
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
            url: '/api/community-access/my-community',
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
            url: '/api/announcements/list?limit=1000', // Get all announcements for stats
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
            url: `/api/announcements/id/${announcementId}/view`,
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
            url: `/api/announcements/id/${announcementId}`,
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
        Swal.fire({
            title: 'Share Announcement',
            html: `
                <div class="text-center">
                    <p>Share this announcement with others in your community?</p>
                    <div class="mt-3">
                        <button class="btn btn-primary" onclick="confirmForward('${announcementId}')">
                            <i data-feather="share-2" class="wd-12 mg-r-2"></i>Share Now
                        </button>
                        <button class="btn btn-secondary ml-2" onclick="Swal.close()">
                            Cancel
                        </button>
                    </div>
                </div>
            `,
            showConfirmButton: false,
            showCloseButton: true,
            didOpen: () => {
                feather.replace();
            }
        });
    }

    // Confirm forward
    function confirmForward(announcementId) {
        // Track the forward
        $.ajax({
            url: `/api/announcements/id/${announcementId}/forward`,
            method: 'POST',
            success: function(response) {
                Swal.fire({
                    title: 'Shared Successfully!',
                    text: 'The announcement has been shared and the forward count has been updated.',
                    icon: 'success',
                    timer: 2000,
                    showConfirmButton: false
                });
                // Refresh the announcements to show updated counts
                setTimeout(() => {
                    loadAnnouncements();
                }, 1000);
            },
            error: function(xhr) {
                console.error('Failed to track forward:', xhr);
                Swal.fire({
                    title: 'Error',
                    text: 'Failed to track the share. Please try again.',
                    icon: 'error'
                });
            }
        });
    }
