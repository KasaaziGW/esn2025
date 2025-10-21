
    // Global variables
    let currentAnnouncementId = null;
    let communityUsers = [];
    let currentPage = 1;
    let currentSearch = '';
    let currentSortBy = 'createdAt';
    let currentSortOrder = 'desc';
    
    // Initialize page
    $(document).ready(function() {
        
        // Set current user info for permission checks
        window.currentUser = {
            id: '<%= user._id || user.id %>',
            role: '<%= user.role %>'
        };
        
        //console.log('Current user set:', window.currentUser);
        
        loadAnnouncements();
        loadCommunityUsers();
        loadCommunityInfo();
        
        // Event listeners
        $('#searchInput').on('keypress', function(e) {
            if (e.which === 13) { // Enter key
                searchAnnouncements();
            }
        });
        
        // Save edit changes button
        $('#saveEditChanges').on('click', function() {
            const announcementId = $('#editAnnouncementModal').data('announcement-id');
            const title = $('#editTitle').val().trim();
            const body = $('#editBody').val().trim();
            const severity = $('#editSeverity').val();
            const status = $('#editStatus').val();
            const isEmergency = $('#editIsEmergency').is(':checked');
            const pinned = $('#editPinned').is(':checked');
            
            // Validation
            if (!title) {
                Swal.fire('Error', 'Title is required', 'error');
                return;
            }
            if (!body) {
                Swal.fire('Error', 'Message is required', 'error');
                return;
            }
            
            // Collect form data
            const formData = {
                title,
                body,
                severity,
                status,
                isEmergency,
                pinned
            };
            
            // Call update function
            updateAnnouncement(announcementId, formData);
            
            // Close modal
            $('#editAnnouncementModal').modal('hide');
        });
        
        $('#sortBy, #sortOrder').on('change', function() {
            currentSortBy = $('#sortBy').val();
            currentSortOrder = $('#sortOrder').val();
            loadAnnouncements();
        });
        
        $('#announcementType').on('change', function() {
            const type = $(this).val();
            if (type === 'emergency') {
                $('#announcementPriority').val('high');
            }
        });
        
        $('#announcementAttachments').on('change', function() {
            const files = this.files;
            const fileNames = Array.from(files).map(file => file.name).join(', ');
            $(this).next('.custom-file-label').html(fileNames || 'Choose files...');
        });
        
        $('#createAnnouncementForm').on('submit', function(e) {
            e.preventDefault();
            createAnnouncement();
        });
        
        // Show/hide emergency type field based on announcement type
        $('#announcementType').on('change', function() {
            const type = $(this).val();
            if (type === 'emergency') {
                $('#emergencyTypeRow').show();
            } else {
                $('#emergencyTypeRow').hide();
            }
        });
        
        $('input[name="forwardTo"]').on('change', function() {
            const forwardTo = $(this).val();
            if (forwardTo === 'private') {
                $('#privateChatOptions').show();
            } else {
                $('#privateChatOptions').hide();
            }
        });
        
        $('#confirmForwardBtn').on('click', function() {
            forwardAnnouncement();
        });
    });
    
    // Load announcements with pagination and search
    function loadAnnouncements() {
        
        const params = new URLSearchParams({
            page: currentPage,
            limit: 10,
            sortBy: currentSortBy,
            sortOrder: currentSortOrder
        });
        
        if (currentSearch) {
            params.append('search', currentSearch);
        }
        
        $.ajax({
            url: `/api/announcements/list?${params.toString()}`,
            method: 'GET',
            success: function(response) {
                //console.log('Response:', response);
                renderAnnouncementsTable(response.data.announcements, response.data.pagination);
            },
            error: function(xhr) {
                console.error('Error:', xhr);
                
                $('#announcementsTableBody').html(`
                    <tr>
                        <td colspan="8" class="text-center text-danger py-4">
                            <i data-feather="alert-circle" class="wd-16 mg-r-5"></i>
                            Failed to load announcements. Please try again.
                        </td>
                    </tr>
                `);
            }
        });
    }
    
    // Search announcements
    function searchAnnouncements() {
        currentSearch = $('#searchInput').val();
        currentPage = 1;
        loadAnnouncements();
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
                    $('#communityDescription').html(`
                        Create and manage community announcements for <strong>${community.name}</strong>${community.address ? ` located at ${community.address}` : ''}.
                    `);
                } else {
                    $('#communityDescription').html('Create and manage community announcements for your community.');
                }
            },
            error: function(xhr) {
                //console.error('Failed to load community info:', xhr);
                $('#communityDescription').html('Create and manage community announcements for your community.');
            }
        });
    }
    
    // Load community users for private chat
    function loadCommunityUsers() {
        $.ajax({
            url: '/api/community-access/user-communities',
            method: 'GET',
            success: function(response) {
                // This would need to be implemented to get community members
                // For now, we'll use a placeholder
                communityUsers = [];
            },
            error: function(xhr) {
                console.error('Failed to load community users:', xhr);
            }
        });
    }
    
    // Render announcements table
    function renderAnnouncementsTable(announcements, pagination) {
        const tbody = $('#announcementsTableBody');
        if (!announcements || announcements.length === 0) {
            tbody.html(`
                <tr>
                    <td colspan="8" class="text-center py-4">
                        <i data-feather="megaphone" class="wd-48 ht-48 tx-color-03 mg-b-15"></i>
                        <p class="tx-color-03 mg-b-0">No announcements found</p>
                        <small class="tx-color-03">Create your first community announcement</small>
                    </td>
                </tr>
            `);
            updatePaginationInfo(pagination);
            feather.replace();
            return;
        }
        
        let html = '';
        announcements.forEach(announcement => {
            const createdDate = new Date(announcement.createdAt).toLocaleDateString();
            const attachmentCount = announcement.attachments ? announcement.attachments.length : 0;
            
            //console.log('Rendering announcement:', announcement._id, 'Can edit:', canEditAnnouncement(announcement));
            
            html += `
                <tr>
                    <td>
                        <div class="d-flex align-items-center">
                            <div>
                                <h6 class="mb-0">${announcement.title}</h6>
                                <small class="text-muted">${announcement.body.substring(0, 50)}${announcement.body.length > 50 ? '...' : ''}</small>
                            </div>
                            ${announcement.pinned ? '<span class="text-warning ml-2" style="font-weight: 500;">(Pinned)</span>' : ''}
                        </div>
                    </td>
                    <td style="color: #333; font-weight: 500;">
                        ${announcement.isEmergency ? 'Emergency' : 'General'}
                    </td>
                    <td style="color: #333; font-weight: 500;">${getPriorityText(announcement.severity)}</td>
                    <td>
                        <div class="d-flex align-items-center">
                            <div class="avatar avatar-xs bg-primary text-white rounded-circle mg-r-5">
                                ${(announcement.createdBy.displayName || announcement.createdBy.username).charAt(0).toUpperCase()}
                            </div>
                            <div>
                                <div class="tx-weight-600">${announcement.createdBy.displayName || announcement.createdBy.username}</div>
                                <small class="tx-color-03">${announcement.createdBy.role}</small>
                            </div>
                        </div>
                    </td>
                    <td>${createdDate}</td>
                    <td style="color: #333; font-weight: 500;">
                        ${attachmentCount > 0 ? 
                            `${attachmentCount} file${attachmentCount > 1 ? 's' : ''}` : 
                            'None'
                        }
                    </td>
                    <td style="color: #333; font-weight: 500;">${getStatusText(announcement.status)}</td>
                    <td>
                        <div class="dropdown">
                            <button class="btn btn-sm btn-outline-secondary dropdown-toggle" type="button" data-bs-toggle="dropdown" aria-expanded="false">
                                <i data-feather="more-vertical"></i>
                            </button>
                            <ul class="dropdown-menu">
                                <li><a class="dropdown-item" href="#" onclick="viewAnnouncement('${announcement._id}')">
                                    <i data-feather="eye" class="wd-12 mg-r-5"></i>
                                    View
                                </a></li>
                                ${canEditAnnouncement(announcement) ? `
                                <li><a class="dropdown-item" href="#" onclick="editAnnouncement('${announcement._id}')">
                                    <i data-feather="edit" class="wd-12 mg-r-5"></i>
                                    Edit
                                </a></li>
                                ` : ''}
                                <li><a class="dropdown-item" href="#" onclick="forwardAnnouncement('${announcement._id}')">
                                    <i data-feather="share-2" class="wd-12 mg-r-5"></i>
                                    Forward
                                </a></li>
                                ${canEditAnnouncement(announcement) ? `
                                <li><hr class="dropdown-divider"></li>
                                <li><a class="dropdown-item text-danger" href="#" onclick="deleteAnnouncement('${announcement._id}')">
                                    <i data-feather="trash-2" class="wd-12 mg-r-5"></i>
                                    Delete
                                </a></li>
                                ` : ''}
                            </ul>
                        </div>
                    </td>
                </tr>
            `;
        });
        
        tbody.html(html);
        updatePaginationInfo(pagination);
        renderPagination(pagination);
        feather.replace();
        
        // Initialize Bootstrap dropdowns
        if (typeof bootstrap !== 'undefined') {
            // Bootstrap 5 syntax
            const dropdownElementList = [].slice.call(document.querySelectorAll('.dropdown-toggle'));
            console.log('Found dropdown elements:', dropdownElementList.length);
            dropdownElementList.map(function (dropdownToggleEl) {
                return new bootstrap.Dropdown(dropdownToggleEl);
            });
        } else {
            console.log('Using jQuery dropdown initialization');
            // Fallback to jQuery if Bootstrap 5 is not available
            $('.dropdown-toggle').dropdown();
        }
        
        // Test if functions are accessible
        console.log('Functions available:', {
            editAnnouncement: typeof editAnnouncement,
            deleteAnnouncement: typeof deleteAnnouncement,
            viewAnnouncement: typeof viewAnnouncement
        });
    }
    
    // Update pagination info
    function updatePaginationInfo(pagination) {
        const start = (pagination.currentPage - 1) * pagination.itemsPerPage + 1;
        const end = Math.min(pagination.currentPage * pagination.itemsPerPage, pagination.totalItems);
        $('#announcementsInfo').text(`Showing ${start} to ${end} of ${pagination.totalItems} entries`);
    }
    
    // Render pagination
    function renderPagination(pagination) {
        const paginationContainer = $('#pagination');
        let html = '';
        
        // Previous button
        html += `
            <li class="page-item ${!pagination.hasPrev ? 'disabled' : ''}">
                <a class="page-link" href="#" onclick="changePage(${pagination.currentPage - 1})">Previous</a>
            </li>
        `;
        
        // Page numbers
        const startPage = Math.max(1, pagination.currentPage - 2);
        const endPage = Math.min(pagination.totalPages, pagination.currentPage + 2);
        
        for (let i = startPage; i <= endPage; i++) {
            html += `
                <li class="page-item ${i === pagination.currentPage ? 'active' : ''}">
                    <a class="page-link" href="#" onclick="changePage(${i})">${i}</a>
                </li>
            `;
        }
        
        // Next button
        html += `
            <li class="page-item ${!pagination.hasNext ? 'disabled' : ''}">
                <a class="page-link" href="#" onclick="changePage(${pagination.currentPage + 1})">Next</a>
            </li>
        `;
        
        paginationContainer.html(html);
    }
    
    // Change page
    function changePage(page) {
        if (page >= 1) {
            currentPage = page;
            loadAnnouncements();
        }
    }
    
    // Get priority text (no badges)
    function getPriorityText(priority) {
        const priorities = {
            low: 'Low',
            medium: 'Medium', 
            high: 'High',
            critical: 'Critical'
        };
        return priorities[priority] || 'Medium';
    }
    
    // Get status text (no badges)
    function getStatusText(status) {
        const statuses = {
            active: 'Active',
            resolved: 'Resolved',
            cancelled: 'Cancelled'
        };
        return statuses[status] || 'Active';
    }
    
    
    // Check if current user can edit/delete an announcement
    function canEditAnnouncement(announcement) {
        // Get current user info from the page
        const currentUserId = window.currentUser ? window.currentUser.id : null;
        const currentUserRole = window.currentUser ? window.currentUser.role : null;
        
        // Admin can edit/delete any announcement
        if (currentUserRole === 'admin') {
            console.log('Admin can edit any announcement');
            return true;
        }
        
        // Coordinator can only edit/delete their own announcements
        if (currentUserRole === 'coordinator') {
            const canEdit = announcement.createdBy._id === currentUserId || 
                           announcement.createdBy.id === currentUserId ||
                           announcement.createdBy._id.toString() === currentUserId ||
                           announcement.createdBy.id.toString() === currentUserId;
            console.log('Coordinator edit check:', canEdit);
            return canEdit;
        }
        return false;
    }
    
    // Show create announcement modal
    function showCreateAnnouncementModal() {
        $('#createAnnouncementModal').modal('show');
    }
    
    // View announcement
    function viewAnnouncement(announcementId) {
        // Find announcement in current data or fetch from server
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
                            <td>${announcement.isEmergency ? 'Emergency' : 'General'}</td>
                        </tr>
                        <tr>
                            <td class="bg-light font-weight-bold">Priority</td>
                            <td>${getPriorityText(announcement.severity)}</td>
                        </tr>
                        <tr>
                            <td class="bg-light font-weight-bold">Status</td>
                            <td>${getStatusText(announcement.status)}</td>
                        </tr>
                        <tr>
                            <td class="bg-light font-weight-bold">Author</td>
                            <td>${announcement.createdBy.displayName || announcement.createdBy.username}</td>
                        </tr>
                        <tr>
                            <td class="bg-light font-weight-bold">Created</td>
                            <td>${new Date(announcement.createdAt).toLocaleString()}</td>
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
            }
        });
    }
    
    // Edit announcement
    function editAnnouncement(announcementId) {
        // First, fetch the announcement details
        $.ajax({
            url: `/api/announcements/id/${announcementId}`,
            method: 'GET',
            success: function(response) {
                const announcement = response.data;
                
                // Check permissions
                if (!canEditAnnouncement(announcement)) {
                    if (typeof Swal !== 'undefined') {
                        Swal.fire('Error', 'You do not have permission to edit this announcement', 'error');
                    } else {
                        alert('You do not have permission to edit this announcement');
                    }
                    return;
                }
                
                // Populate the Bootstrap modal with announcement data
                $('#editTitle').val(announcement.title);
                $('#editBody').val(announcement.body);
                $('#editSeverity').val(announcement.severity);
                $('#editStatus').val(announcement.status);
                $('#editIsEmergency').prop('checked', announcement.isEmergency);
                $('#editPinned').prop('checked', announcement.pinned);
                
                // Store the announcement ID for the save function
                $('#editAnnouncementModal').data('announcement-id', announcementId);
                
                // Show the modal
                $('#editAnnouncementModal').modal('show');
            },
            error: function(xhr) {
                //console.error('Failed to fetch announcement:', xhr);
                Swal.fire('Error', 'Failed to load announcement details', 'error');
            }
        });
    }
    
    // Update announcement
    function updateAnnouncement(announcementId, data) {
        //console.log('Update announcement called with ID:', announcementId, 'Data:', data);
        $.ajax({
            url: `/api/announcements/id/${announcementId}`,
            method: 'PUT',
            contentType: 'application/json',
            data: JSON.stringify(data),
            success: function(response) {
                Swal.fire('Success', 'Announcement updated successfully', 'success');
                loadAnnouncements(); // Reload the announcements list
            },
            error: function(xhr) {
                const errorMessage = xhr.responseJSON?.message || 'Failed to update announcement';
                Swal.fire('Error', errorMessage, 'error');
            }
        });
    }
    
    // Delete announcement
    function deleteAnnouncement(announcementId) {
        // First, fetch the announcement to check permissions
        $.ajax({
            url: `/api/announcements/id/${announcementId}`,
            method: 'GET',
            success: function(response) {
                const announcement = response.data;
                
                // Check permissions
                if (!canEditAnnouncement(announcement)) {
                    if (typeof Swal !== 'undefined') {
                        Swal.fire('Error', 'You do not have permission to delete this announcement', 'error');
                    } else {
                        alert('You do not have permission to delete this announcement');
                    }
                    return;
                }
                
                // Show confirmation dialog
                Swal.fire({
                    title: 'Are you sure?',
                    text: `You are about to delete: "${announcement.title}"`,
                    icon: 'warning',
                    showCancelButton: true,
                    confirmButtonColor: '#d33',
                    cancelButtonColor: '#3085d6',
                    confirmButtonText: 'Yes, delete it!',
                    cancelButtonText: 'Cancel'
                }).then((result) => {
                    if (result.isConfirmed) {
                        // Call delete API
                        $.ajax({
                            url: `/api/announcements/id/${announcementId}`,
                            method: 'DELETE',
                            success: function(response) {
                                Swal.fire('Deleted!', 'The announcement has been deleted.', 'success');
                                // Reload announcements
                                loadAnnouncements();
                            },
                            error: function(xhr) {
                                let errorMessage = 'Failed to delete announcement';
                                if (xhr.responseJSON && xhr.responseJSON.message) {
                                    errorMessage = xhr.responseJSON.message;
                                }
                                Swal.fire('Error', errorMessage, 'error');
                            }
                        });
                    }
                }).catch((error) => {
                    alert('Error: ' + error.message);
                });
            },
            error: function(xhr) {
                Swal.fire('Error', 'Failed to load announcement details', 'error');
            }
        });
    }
    
    // Create announcement
    function createAnnouncement() {
        const formData = new FormData($('#createAnnouncementForm')[0]);
        
        // Transform form data for backend
        const type = formData.get('type');
        const priority = formData.get('priority');
        const emergencyType = formData.get('emergencyType');
        
        // Set emergency fields based on type
        if (type === 'emergency') {
            formData.set('isEmergency', 'true');
            formData.set('emergencyType', emergencyType || 'other');
            formData.set('severity', priority); // Map priority to severity
        } else {
            formData.set('isEmergency', 'false');
        }
        
        // Remove the old type field since backend doesn't use it
        formData.delete('type');
        formData.delete('priority');
        
        console.log('Form data being sent:', Object.fromEntries(formData));
        
        // Show loading state
        const submitBtn = $('#createAnnouncementForm').find('button[type="submit"]');
        const originalText = submitBtn.html();
        submitBtn.html('<i data-feather="loader" class="wd-12 mg-r-5"></i>Posting...');
        submitBtn.prop('disabled', true);
        
        $.ajax({
            url: '/api/announcements',
            method: 'POST',
            data: formData,
            processData: false,
            contentType: false,
            success: function(response) {
                
                Swal.fire({
                    title: 'Success!',
                    text: 'Announcement posted successfully!',
                    icon: 'success',
                    confirmButtonText: 'OK',
                    confirmButtonColor: '#28a745'
                }).then(() => {
                    $('#createAnnouncementModal').modal('hide');
                    loadAnnouncements(); // Reload announcements
                });
            },
            error: function(xhr) {
                
                const errorMessage = xhr.responseJSON?.message || 'Failed to create announcement. Please try again.';
                
                Swal.fire({
                    title: 'Error',
                    text: errorMessage,
                    icon: 'error',
                    confirmButtonText: 'OK'
                });
            },
            complete: function() {
                // Reset button state
                submitBtn.html(originalText);
                submitBtn.prop('disabled', false);
            }
        });
    }
    
    // Forward announcement
    function forwardAnnouncement(announcementId) {
        currentAnnouncementId = announcementId;
        $('#forwardAnnouncementModal').modal('show');
    }
    
    // Confirm forward
    function forwardAnnouncement() {
        const forwardTo = $('input[name="forwardTo"]:checked').val();
        const selectedUsers = $('#selectedUsers').val();
        
        // Implementation for forwarding to chat would go here
        // This would involve creating messages in the chat system
        
        Swal.fire({
            title: 'Success!',
            text: 'Announcement forwarded successfully!',
            icon: 'success',
            confirmButtonText: 'OK',
            confirmButtonColor: '#28a745'
        }).then(() => {
            $('#forwardAnnouncementModal').modal('hide');
        });
    }