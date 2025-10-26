// Wait for jQuery to be available
function waitForJQuery() {
    if (typeof $ !== 'undefined') {
        $(document).ready(function() {
    
    // Load communities data
    loadCommunities();
    
    // Set up event listeners
    setupEventListeners();
    
    // Feather icons disabled to prevent conflicts - will be handled by other scripts
        });
    } else {
        // jQuery not available yet, retry after a short delay
        setTimeout(waitForJQuery, 100);
    }
}

// Start the initialization
waitForJQuery();

// Feather icons initialization removed to prevent conflicts

function setupEventListeners() {
    // Refresh communities button
    $('#refreshCommunities').on('click', function() {
        loadCommunities();
    });
    
    // Join community button
    $(document).on('click', '.join-community-btn', function() {
        const communityId = $(this).data('community-id');
        const communityName = $(this).data('community-name');
        showJoinCommunityModal(communityId, communityName);
    });
    
    // Leave community button
    $(document).on('click', '.leave-community-btn', function() {
        showLeaveCommunityModal();
    });
    
    // Note: Join and leave community confirmations are now handled by Sweet Alert
}

function loadCommunities() {
    // Show loading state
    $('#communitiesLoading').show();
    $('#communitiesEmpty').hide();
    $('#communitiesList').empty();
    
    $.ajax({
        url: '/community-access/user-communities',
        method: 'GET',
        success: function(response) {
            
            $('#communitiesLoading').hide();
            
            if (response.data.profileComplete === false) {
                showProfileCompletionAlert();
                return;
            }
            
            if (!response.data.communities || response.data.communities.length === 0) {
                showEmptyState();
                return;
            }
            
            renderCommunities(response.data.communities);
            loadMyCommunity();
        },
        error: function(xhr) {
            
            $('#communitiesLoading').hide();
            
            // Show more detailed error message
            const errorMessage = xhr.responseJSON?.message || xhr.responseText || 'Failed to load communities. Please try again.';
            showAlert('error', `Error ${xhr.status}: ${errorMessage}`);
        }
    });
}

function loadMyCommunity() {
    $.ajax({
        url: '/community-access/my-community',
        method: 'GET',
        success: function(response) {
            
            if (response.data.community) {
                renderMyCommunity(response.data.community);
            } else {
                $('#myCommunityCard').hide();
            }
        },
        error: function(xhr) {
            console.error('Error:', xhr);
        }
    });
}

function renderCommunities(communities) {
    
    const communitiesList = $('#communitiesList');
    communitiesList.empty();
    
    communities.forEach(community => {
        const communityCard = createCommunityCard(community);
        communitiesList.append(communityCard);
    });
    
    // Re-initialize feather icons
    setTimeout(function() {
        try {
            if (typeof feather !== 'undefined' && document.querySelector('[data-feather]')) {
                feather.replace();
            }
        } catch (error) {
            console.warn('Feather icons re-initialization failed:', error);
        }
    }, 200);
}

function createCommunityCard(community) {
    const isMember = community.isMember || false;
    const memberCount = community.membersCount || 0;
    
    // Using connections template style
    const bannerUrl = community.bannerUrl || '/assets/img/placehold.jpg';
    const cardHtml = `
        <div class="col-sm-4 col-md-3 col-lg-4 col-xl-3">
            <div class="card card-profile">
                <img src="${bannerUrl}" class="card-img-top" alt="Community Banner" style="height: 120px; object-fit: cover;">
                <div class="card-body tx-13">
                    <div>
                        <a href="#">
                            <div class="avatar avatar-lg">
                                <span class="avatar-initial rounded-circle bg-primary">${community.name.charAt(0).toUpperCase()}</span>
                            </div>
                        </a>
                        <h5><a href="#">${community.name}</a></h5>
                        <p>${community.description || 'Community for local residents'}</p>
                        <div class="d-flex justify-content-between align-items-center mg-b-10">
                            <small class="text-muted">
                                <i data-feather="map-pin" class="mg-r-5"></i>
                                ${community.region?.name || 'Unknown'}, ${community.district?.name || 'Unknown'}
                            </small>
                        </div>
                        <div class="d-flex justify-content-between align-items-center mg-b-10">
                            <small class="text-muted">
                                <i data-feather="users" class="mg-r-5"></i>
                                ${memberCount} members
                            </small>
                        </div>
                        <button class="btn btn-block ${isMember ? 'btn-primary' : 'btn-white'} ${isMember ? 'leave-community-btn' : 'join-community-btn'}" 
                                data-community-id="${community._id}" 
                                data-community-name="${community.name}">
                            ${isMember ? 'Leave Community' : 'Join Community'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    return $(cardHtml);
}

function renderMyCommunity(community) {
    
    const myCommunityContent = $('#myCommunityContent');
    const memberCount = community.memberCount || 0;
    
    const contentHtml = `
        <div class="d-flex justify-content-between align-items-start mg-b-15">
            <div>
                <h6 class="mg-b-5">${community.name}</h6>
                <p class="text-muted mg-b-0">${community.description || 'No description available.'}</p>
            </div>
            <span class="badge badge-success">Member</span>
        </div>
        
        <div class="row mg-b-15">
            <div class="col-sm-6">
                <small class="text-muted">
                    <i data-feather="map-pin" class="mg-r-5"></i>
                    ${community.region}, ${community.district}
                </small>
            </div>
            <div class="col-sm-6">
                <small class="text-muted">
                    <i data-feather="users" class="mg-r-5"></i>
                    ${memberCount} members
                </small>
            </div>
        </div>
        
        <div class="d-flex justify-content-between">
            <button class="btn btn-sm btn-outline-danger leave-community-btn">
                <i data-feather="log-out"></i> Leave Community
            </button>
            <button class="btn btn-sm btn-outline-primary" onclick="viewCommunityDetails('${community.id}')">
                <i data-feather="eye"></i> View Details
            </button>
        </div>
    `;
    
    myCommunityContent.html(contentHtml);
    $('#myCommunityCard').show();
    
    // Re-initialize feather icons
    setTimeout(function() {
        try {
            if (typeof feather !== 'undefined' && document.querySelector('[data-feather]')) {
                feather.replace();
            }
        } catch (error) {
            console.warn('Feather icons re-initialization failed:', error);
        }
    }, 200);
}

function showProfileCompletionAlert() {
    $('#profileCompletionAlert').show();
    $('#communitiesEmpty').hide();
    $('#communitiesList').empty();
}

function showEmptyState() {
    $('#communitiesEmpty').show();
    $('#communitiesList').empty();
}

function showJoinCommunityModal(communityId, communityName) {
    
    Swal.fire({
        title: 'Join Community',
        html: `
            <p>Are you sure you want to join <strong>${communityName}</strong>?</p>
            <p class="text-muted">You can only be a member of one community at a time. If you're already in a community, you'll need to leave it first.</p>
        `,
        icon: 'question',
        showCancelButton: true,
        confirmButtonText: 'Join Community',
        cancelButtonText: 'Cancel',
        confirmButtonColor: '#007bff',
        cancelButtonColor: '#6c757d',
        reverseButtons: true
    }).then((result) => {
        if (result.isConfirmed) {
            joinCommunity(communityId);
        }
    });
}

function showLeaveCommunityModal() {
    
    Swal.fire({
        title: 'Leave Community',
        html: `
            <p>Are you sure you want to leave this community?</p>
            <p class="text-muted">You will need to join another community in your area to participate in community activities.</p>
        `,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Leave Community',
        cancelButtonText: 'Cancel',
        confirmButtonColor: '#dc3545',
        cancelButtonColor: '#6c757d',
        reverseButtons: true
    }).then((result) => {
        if (result.isConfirmed) {
            leaveCommunity();
        }
    });
}

function joinCommunity(communityId) {
    // Show loading state
    Swal.fire({
        title: 'Joining Community...',
        text: 'Please wait while we add you to the community.',
        allowOutsideClick: false,
        allowEscapeKey: false,
        showConfirmButton: false,
        didOpen: () => {
            Swal.showLoading();
        }
    });
    
    $.ajax({
        url: `/community-access/join/${communityId}`,
        method: 'POST',
        success: function(response) {
            
            Swal.fire({
                title: 'Success!',
                text: 'You have successfully joined the community!',
                icon: 'success',
                confirmButtonText: 'Great!',
                confirmButtonColor: '#28a745'
            }).then(() => {
                loadCommunities(); // Refresh the communities list
                loadMyCommunity(); // Refresh the "My Community" section
            });
        },
        error: function(xhr) {
            const errorMessage = xhr.responseJSON?.message || 'Failed to join community. Please try again.';
            Swal.fire({
                title: 'Error',
                text: errorMessage,
                icon: 'error',
                confirmButtonText: 'OK',
                confirmButtonColor: '#dc3545'
            });
        }
    });
}

function leaveCommunity() {
    
    // Get current user's community ID
    const currentUser = window.currentUser;
    if (!currentUser || !currentUser.community) {
        Swal.fire({
            title: 'Error',
            text: 'You are not currently in any community.',
            icon: 'error',
            confirmButtonText: 'OK',
            confirmButtonColor: '#dc3545'
        });
        return;
    }
    
    // Show loading state
    Swal.fire({
        title: 'Leaving Community...',
        text: 'Please wait while we remove you from the community.',
        allowOutsideClick: false,
        allowEscapeKey: false,
        showConfirmButton: false,
        didOpen: () => {
            Swal.showLoading();
        }
    });
    
    $.ajax({
        url: `/community-access/leave`,
        method: 'POST',
        success: function(response) {
            
            Swal.fire({
                title: 'Success!',
                text: 'You have successfully left the community!',
                icon: 'success',
                confirmButtonText: 'OK',
                confirmButtonColor: '#28a745'
            }).then(() => {
                loadCommunities(); // Refresh the communities list
                loadMyCommunity(); // Refresh the "My Community" section
            });
        },
        error: function(xhr) {
            
            const errorMessage = xhr.responseJSON?.message || 'Failed to leave community. Please try again.';
            Swal.fire({
                title: 'Error',
                text: errorMessage,
                icon: 'error',
                confirmButtonText: 'OK',
                confirmButtonColor: '#dc3545'
            });
        }
    });
}

function viewCommunityDetails(communityId) {
    
    // For now, just show an alert. In the future, this could open a detailed modal
    showAlert('info', 'Community details feature coming soon!');
}

function showAlert(type, message) {
    const alertClass = type === 'error' ? 'alert-danger' : 
                     type === 'success' ? 'alert-success' : 
                     type === 'warning' ? 'alert-warning' : 'alert-info';
    
    const alertHtml = `
        <div class="alert ${alertClass} alert-dismissible fade show" role="alert">
            ${message}
            <button type="button" class="close" data-dismiss="alert">
                <span aria-hidden="true">&times;</span>
            </button>
        </div>
    `;
    
    // Remove existing alerts
    $('.alert').remove();
    
    // Add new alert at the top of the page
    $('.container-fluid').prepend(alertHtml);
    
    // Auto-dismiss after 5 seconds
    setTimeout(function() {
        $('.alert').fadeOut();
    }, 5000);
}

// Initialize feather icons after DOM is ready
document.addEventListener('DOMContentLoaded', function() {
        // Feather icons will be initialized centrally
});
