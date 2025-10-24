
    // Global variables
    let currentAnnouncementId = null;
    let communityUsers = [];
    let currentPage = 1;
    let currentSearch = '';
    let currentSortBy = 'createdAt';
    let currentSortOrder = 'desc';
    
    // Initialize page
    $(document).ready(function() {
        
        // Current user is set in the EJS template
        console.log('Current user available:', window.currentUser);
        
        loadAnnouncements();
        loadCommunityUsers();
        loadCommunityInfo();
        
        // Event listeners
        $('#searchInput').on('keypress', function(e) {
            if (e.which === 13) { // Enter key
                searchAnnouncements();
            }
        });
        
        // Handle Type field change in edit modal
        $('#editType').on('change', function() {
            const selectedType = $(this).val();
            if (selectedType === 'emergency') {
                $('#editEmergencyTypeRow').show();
            } else {
                $('#editEmergencyTypeRow').hide();
            }
        });
        
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
        
        // Save edit changes button
        $('#saveEditChanges').on('click', function() {
            const announcementId = $('#editAnnouncementModal').data('announcement-id');
            const title = $('#editTitle').val().trim();
            const body = $('#editBody').val().trim();
            const type = $('#editType').val();
            const priority = $('#editPriority').val();
            const emergencyType = $('#editEmergencyType').val();
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
                type,
                priority,
                emergencyType: type === 'emergency' ? emergencyType : null,
                isEmergency: type === 'emergency',
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
            url: `/announcements/list?${params.toString()}`,
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
            url: '/community-access/my-community',
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
            url: '/community-access/user-communities',
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
        const currentUserId = window.currentUser ? (window.currentUser._id || window.currentUser.id) : null;
        const currentUserRole = window.currentUser ? window.currentUser.role : null;
        
        console.log('Permission check:', {
            currentUserId,
            currentUserRole,
            announcementAuthorId: announcement.createdBy ? announcement.createdBy._id : 'no createdBy',
            announcementAuthorIdString: announcement.createdBy ? announcement.createdBy._id?.toString() : 'no createdBy',
            announcementAuthorIdAlt: announcement.createdBy ? announcement.createdBy.id : 'no createdBy'
        });
        
        // Admin can edit/delete any announcement
        if (currentUserRole === 'admin') {
            console.log('Admin can edit any announcement');
            return true;
        }
        
        // Coordinator can only edit/delete their own announcements
        if (currentUserRole === 'coordinator' && announcement.createdBy) {
            // Safely check for author ID with multiple fallbacks
            const authorId = announcement.createdBy._id || announcement.createdBy.id;
            const authorIdString = authorId ? authorId.toString() : null;
            const currentUserIdString = currentUserId ? currentUserId.toString() : null;
            
            const canEdit = authorId === currentUserId || 
                           authorIdString === currentUserId ||
                           authorIdString === currentUserIdString;
                           
            console.log('Coordinator edit check:', canEdit, {
                authorId,
                authorIdString,
                currentUserId,
                currentUserIdString,
                directMatch: authorId === currentUserId,
                stringMatch: authorIdString === currentUserId,
                bothStringMatch: authorIdString === currentUserIdString
            });
            return canEdit;
        }
        return false;
    }
    
    // Show create announcement modal
    function showCreateAnnouncementModal() {
        $('#createAnnouncementModal').modal('show');
    }
    
    // Forward announcement function
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
                    Swal.fire('Error', 'Failed to load community members', 'error');
                }
            },
            error: function(xhr) {
                console.error('Failed to load community users:', xhr);
                Swal.fire('Error', 'Failed to load community members', 'error');
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
                    Swal.fire('Error', response.message || 'Failed to forward announcement', 'error');
                }
            },
            error: function(xhr) {
                console.error('Forward announcement error:', xhr);
                Swal.fire('Error', 'Failed to forward announcement', 'error');
            }
        });
    }
    
    // Display current attachments in edit modal
    function displayCurrentAttachments(attachments) {
        const container = $('#editCurrentAttachments');
        container.empty();
        
        if (attachments && attachments.length > 0) {
            container.append('<h6>Current Attachments:</h6>');
            attachments.forEach((attachment, index) => {
                const attachmentHtml = `
                    <div class="d-flex justify-content-between align-items-center mb-2 p-2 border rounded">
                        <div>
                            <i class="fas fa-paperclip me-2"></i>
                            <a href="${attachment.url}" target="_blank" class="text-decoration-none">
                                ${attachment.filename || 'Attachment ' + (index + 1)}
                            </a>
                            <small class="text-muted ms-2">(${formatFileSize(attachment.size)})</small>
                        </div>
                        <button type="button" class="btn btn-sm btn-outline-danger" onclick="removeCurrentAttachment(${index})">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                `;
                container.append(attachmentHtml);
            });
        }
    }
    
    // Format file size
    function formatFileSize(bytes) {
        if (!bytes) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }
    
    // Remove current attachment (placeholder function)
    function removeCurrentAttachment(index) {
        // This would need to be implemented to actually remove attachments from the server
        console.log('Remove attachment at index:', index);
    }
    
    // View announcement
    function viewAnnouncement(announcementId) {
        // Find announcement in current data or fetch from server
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
            url: `/announcements/id/${announcementId}`,
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
                $('#editType').val(announcement.type || 'general');
                $('#editPriority').val(announcement.priority || 'medium');
                $('#editPinned').prop('checked', announcement.pinned || false);
                
                // Handle emergency type field
                if (announcement.type === 'emergency' || announcement.isEmergency) {
                    $('#editType').val('emergency');
                    $('#editEmergencyTypeRow').show();
                    $('#editEmergencyType').val(announcement.emergencyType || 'medical');
                } else {
                    $('#editEmergencyTypeRow').hide();
                }
                
                // Display current attachments
                displayCurrentAttachments(announcement.attachments || []);
                
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
            url: `/announcements/id/${announcementId}/update`,
            method: 'POST',
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
            url: `/announcements/id/${announcementId}`,
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
                            url: `/announcements/id/${announcementId}/delete`,
                            method: 'POST',
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
            url: '/announcements',
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