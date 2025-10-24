'use strict';

// Wait for jQuery to be available
function waitForJQuery() {
    if (typeof $ !== 'undefined') {
        $(document).ready(function() {
        
    // Track if regions and districts have been loaded
    let regionsLoaded = false;
    let districtsLoaded = false;
    
        // Load initial data
        loadCommunities();
        
        // Ensure first tab is active
        $('#communities-tab').addClass('active');
        $('#communities').addClass('active show').css('display', 'block');
        $('#regions').removeClass('active show').css('display', 'none');
        
        // Set up event listeners
        setupEventListeners();
        
        // Set up tab switching
        setupTabSwitching();
    
    // Feather icons disabled to prevent conflicts - will be handled by other scripts
    //console.log('Feather icons initialization skipped to prevent conflicts');
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
    // Community form submission
    $('#createCommunityForm').on('submit', function(e) {
        e.preventDefault();
        createCommunity();
    });
    
    // Load regions when create community modal opens
    $('#createCommunityModal').on('show.bs.modal', function() {
        loadRegionsForSelect();
        
        // Clear district select when modal opens
        $('#communityDistrictSelect').find('option:not(:first)').remove();
    });
    
    // Load regions when create district modal opens
    $('#createDistrictModal').on('show.bs.modal', function() {
        loadRegionsForSelect();
    });

    // Load regions when edit community modal opens
    $('#editCommunityModal').on('show.bs.modal', function() {
        // Regions and banner previews are handled in editCommunity function
        // This event listener is kept for compatibility but logic moved to editCommunity
    });

    // Load regions and districts when Regions & Districts tab is clicked
    $('#regions-tab').on('click', function() {
        loadRegionsList();
        loadDistrictsList();
    });
    
    // Region form submission
    $('#createRegionForm').on('submit', function(e) {
        e.preventDefault();
        createRegion();
    });
    
    // District form submission
    $('#createDistrictForm').on('submit', function(e) {
        e.preventDefault();
        createDistrict();
    });
    
    // Load districts when edit community region changes
    $('#editCommunityModal #editCommunityRegionSelect').on('change', function() {
        const regionId = $(this).val();
        if (regionId) {
            loadDistrictsForEditSelect(regionId);
        } else {
            $('#editCommunityDistrictSelect').find('option:not(:first)').remove();
        }
    });
    
    // Region change for community
    $('#communityRegionSelect').on('change', function() {
        const regionId = $(this).val();
        loadDistrictsForRegion(regionId, '#communityDistrictSelect');
    });
    
    // Region change for district
    $('#districtRegionSelect').on('change', function() {
        const regionId = $(this).val();
        // This is for creating districts, so we don't need to load districts
    });

    // Handle banner image preview for create modal
    $('#createBannerInput').on('change', function(e) {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = function(e) {
                $('#createBannerImage').attr('src', e.target.result);
                $('#createBannerPreview').show();
            };
            reader.readAsDataURL(file);
        } else {
            $('#createBannerPreview').hide();
        }
    });

    // Handle banner image preview for edit modal
    $('#editBannerInput').on('change', function(e) {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = function(e) {
                $('#editNewBannerImage').attr('src', e.target.result);
                $('#editNewBannerPreview').show();
            };
            reader.readAsDataURL(file);
        } else {
            $('#editNewBannerPreview').hide();
        }
    });
    }
    
function setupTabSwitching() {
    // Handle tab clicks manually
    $('.nav-link[data-bs-toggle="tab"]').on('click', function(e) {
        e.preventDefault();
        
        const targetTab = $(this).attr('href');
        
        // Remove active class from all tabs and tab panes
        $('.nav-link').removeClass('active');
        $('.tab-pane').removeClass('active show').css('display', 'none');
        
        // Add active class to clicked tab
        $(this).addClass('active');
        
        // Show target tab pane
        $(targetTab).addClass('active show').css('display', 'block');

        // Load data for the active tab
        if (targetTab === '#communities') {
            loadCommunities();
        } else if (targetTab === '#regions') {
            if (!regionsLoaded) {
            loadRegions();
                regionsLoaded = true;
            }
            if (!districtsLoaded) {
            loadDistricts();
                districtsLoaded = true;
            }
        }
        
        // Feather icons will be initialized centrally
    });
    
   // console.log('Tab switching setup complete');
}

function loadCommunities() {
    // Use server-side data if available, otherwise make AJAX call
    if (window.communitiesData && window.communitiesData.length > 0) {
        renderCommunities(window.communitiesData);
    } else {
        $.ajax({
            url: '/communities',
            method: 'GET',
            xhrFields: {
                withCredentials: true
            },
            success: function(response) {
                renderCommunities(response.data.items || response.data.communities || []);
            },
            error: function(xhr) {
                showAlert('error', 'Failed to load communities.');
            }
        });
    }
}

function renderCommunities(communities) {
    
    const communitiesList = $('#communitiesList');
    communitiesList.empty();
    
    if (!communities || communities.length === 0) {
        communitiesList.html('<p class="text-muted">No communities found.</p>');
        return;
    }
    
    communities.forEach(community => {
        const communityCard = createCommunityCard(community);
        communitiesList.append(communityCard);
    });
    
}

function createCommunityCard(community) {
    const statusBadge = community.isActive ? 'badge-success' : 'badge-danger';
    const statusText = community.isActive ? 'Active' : 'Inactive';
    const memberCount = community.membersCount || 0;
    
    const cardHtml = `
        <div class="card mg-b-15">
            <div class="card-body">
                <div class="d-flex justify-content-between align-items-start mg-b-10">
                    <h6 class="mg-b-0">${community.name}</h6>
                    <span class="badge ${statusBadge}">${statusText}</span>
                </div>
                
                <p class="text-muted mg-b-10">${community.description || 'No description available.'}</p>
                
                <div class="d-flex justify-content-between align-items-center">
                    <div>
                        <small class="text-muted">
                            <i data-feather="map-pin" class="mg-r-5"></i>
                            ${community.region?.name || 'Unknown'}, ${community.district?.name || 'Unknown'}
                        </small>
                        <small class="text-muted mg-l-15">
                            <i data-feather="users" class="mg-r-5"></i>
                            ${memberCount} members
                        </small>
                    </div>
                    
                    <div class="btn-group">
                        <button class="btn btn-sm btn-outline-primary" onclick="editCommunity('${community._id}')">
                            <i data-feather="edit"></i>||
                        </button>
                        <button class="btn btn-sm btn-outline-danger" onclick="deleteCommunity('${community._id}', '${community.name}')">
                            <i data-feather="trash"></i>x
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    return $(cardHtml);
}

function loadRegions() {
    $.ajax({
        url: '/regions',
        method: 'GET',
        xhrFields: {
            withCredentials: true
        },
        success: function(response) {
            renderRegions(response.data.regions);
            populateRegionSelects(response.data.regions);
        },
        error: function(xhr) {
            showAlert('error', 'Failed to load regions.');
        }
    });
}

function renderRegions(regions) {
    
    const regionsList = $('#regionsList');
    if (regionsList.length === 0) {
        return;
    }
    
    regionsList.empty();
    
    if (!regions || regions.length === 0) {
        regionsList.html('<p class="text-muted">No regions found.</p>');
        return;
    }
    
    console.log('Rendering', regions.length, 'regions');
    regions.forEach((region, index) => {
        const regionCard = createRegionCard(region);
        regionsList.append(regionCard);
    });
    
    console.log('Regions rendered, total cards:', regionsList.find('.card').length);
    
    // Re-initialize feather icons
        // Feather icons will be initialized centrally
}

function createRegionCard(region) {
    const cardHtml = `
        <div class="card mg-b-10">
            <div class="card-body">
                <div class="d-flex justify-content-between align-items-center">
                    <div>
                        <h6 class="mg-b-0">${region.name}</h6>
                        <small class="text-muted">${region.description || 'No description'}</small>
                    </div>
                    <div class="btn-group">
                        <button class="btn btn-sm btn-outline-primary" onclick="editRegion('${region._id}')">
                            <i data-feather="edit"></i> ||
                        </button>
                        <button class="btn btn-sm btn-outline-danger" onclick="deleteRegion('${region._id}', '${region.name}')">
                            <i data-feather="trash"></i> x
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    return $(cardHtml);
}

function loadDistricts() {
    
    $.ajax({
        url: '/districts',
        method: 'GET',
        xhrFields: {
            withCredentials: true
        },
        success: function(response) {
            renderDistricts(response.data.districts);
        },
        error: function(xhr) {
            showAlert('error', 'Failed to load districts.');
        }
    });
}

function renderDistricts(districts) {
    
    const districtsList = $('#districtsList');
    if (districtsList.length === 0) {
        return;
    }
    
    districtsList.empty();
    
    if (!districts || districts.length === 0) {
        districtsList.html('<p class="text-muted">No districts found.</p>');
        return;
    }
    
    //console.log('Rendering', districts.length, 'districts');
    districts.forEach((district, index) => {
        const districtCard = createDistrictCard(district);
        districtsList.append(districtCard);
    });
    
}

function createDistrictCard(district) {
    const cardHtml = `
        <div class="card mg-b-10">
            <div class="card-body">
                <div class="d-flex justify-content-between align-items-center">
                    <div>
                        <h6 class="mg-b-0">${district.name}</h6>
                        <small class="text-muted">
                            ${district.region?.name || 'Unknown Region'}
                            ${district.description ? ' - ' + district.description : ''}
                        </small>
                    </div>
                    <div class="btn-group">
                        <button class="btn btn-sm btn-outline-primary" onclick="editDistrict('${district._id}')">
                            <i data-feather="edit"></i> ||
                        </button>
                        <button class="btn btn-sm btn-outline-danger" onclick="deleteDistrict('${district._id}', '${district.name}')">
                            <i data-feather="trash"></i> x
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    return $(cardHtml);
}

function populateRegionSelects(regions) {
    
    // Populate community region select
    const communityRegionSelect = $('#communityRegionSelect');
    if (communityRegionSelect.length > 0) {
    communityRegionSelect.find('option:not(:first)').remove();
    regions.forEach(region => {
        communityRegionSelect.append(`<option value="${region._id}">${region.name}</option>`);
    });
        //console.log('Community region select populated with', regions.length, 'regions');
    }
    
    // Populate district region select
    const districtRegionSelect = $('#districtRegionSelect');
    if (districtRegionSelect.length > 0) {
    districtRegionSelect.find('option:not(:first)').remove();
    regions.forEach(region => {
        districtRegionSelect.append(`<option value="${region._id}">${region.name}</option>`);
    });
        //console.log('District region select populated with', regions.length, 'regions');
    }
}

function loadRegionsForSelect() {
    
    $.ajax({
        url: '/regions',
        method: 'GET',
        xhrFields: {
            withCredentials: true
        },
        success: function(response) {

            populateRegionSelects(response.data.regions);
        },
        error: function(xhr) {
            showAlert('error', 'Failed to load regions for selection.');
        }
    });
}

function loadDistrictsForRegion(regionId, selectId) {
    
    if (!regionId) {
        $(selectId).find('option:not(:first)').remove();
        return;
    }
    
    $.ajax({
        url: `/districts?region=${regionId}`,
        method: 'GET',
        xhrFields: {
            withCredentials: true
        },
        success: function(response) {

            const select = $(selectId);
            if (select.length === 0) {
                console.error('Select element not found:', selectId);
                return;
            }
            
            select.find('option:not(:first)').remove();
            
            response.data.districts.forEach(district => {
                select.append(`<option value="${district._id}">${district.name}</option>`);
            });
            
            //console.log('Districts populated in', selectId);
        },
        error: function(xhr) {
            showAlert('error', 'Failed to load districts for selected region.');
        }
    });
}

function createCommunity() {
    
    const formData = new FormData();
    formData.append('name', $('input[name="name"]').val());
    formData.append('description', $('textarea[name="description"]').val());
    formData.append('region', $('#communityRegionSelect').val());
    formData.append('district', $('#communityDistrictSelect').val());
    formData.append('isActive', $('select[name="isActive"]').val() === 'true');
    
    // Handle banner file upload
    const bannerFile = $('input[name="banner"]')[0].files[0];
    if (bannerFile) {
        formData.append('banner', bannerFile);
    }
    
    console.log('Form Data:', Object.fromEntries(formData));
    
    $.ajax({
        url: '/communities',
        method: 'POST',
        data: formData,
        processData: false,
        contentType: false,
        xhrFields: {
            withCredentials: true
        },
        success: function(response) {
            
            $('#createCommunityModal').modal('hide');
            $('#createCommunityForm')[0].reset();
            showAlert('success', 'Community created successfully!');
            loadCommunities();
        },
        error: function(xhr) {
            
            const errorMessage = xhr.responseJSON?.message || 'Failed to create community.';
            showAlert('error', errorMessage);
        }
    });
}

function createRegion() {

    const formData = {
        name: $('input[name="name"]').val(),
        description: $('textarea[name="description"]').val()
    };
    
    console.log('Form Data:', formData);
    
    $.ajax({
        url: '/regions',
        method: 'POST',
        data: formData,
        xhrFields: {
            withCredentials: true
        },
        success: function(response) {
            
            $('#createRegionModal').modal('hide');
            $('#createRegionForm')[0].reset();
            showAlert('success', 'Region created successfully!');
            loadRegionsList();
        },
        error: function(xhr) {
            
            const errorMessage = xhr.responseJSON?.message || 'Failed to create region.';
            showAlert('error', errorMessage);
        }
    });
}

function createDistrict() {
    
    const formData = {
        name: $('input[name="name"]').val(),
        description: $('textarea[name="description"]').val(),
        region: $('#districtRegionSelect').val()
    };
    
    console.log('Form Data:', formData);
    
    $.ajax({
        url: '/districts',
        method: 'POST',
        data: formData,
        xhrFields: {
            withCredentials: true
        },
        success: function(response) {
            
            $('#createDistrictModal').modal('hide');
            $('#createDistrictForm')[0].reset();
            showAlert('success', 'District created successfully!');
            loadDistrictsList();
        },
        error: function(xhr) {
            
            const errorMessage = xhr.responseJSON?.message || 'Failed to create district.';
            showAlert('error', errorMessage);
        }
    });
}

function editCommunity(communityId) {
    
    // Fetch community details
    $.ajax({
        url: `/communities/${communityId}`,
        method: 'GET',
        xhrFields: {
            withCredentials: true
        },
        success: function(response) {
            
            const community = response.data || response;
            // Populate the edit form
            $('#editCommunityModal input[name="name"]').val(community.name);
            $('#editCommunityModal textarea[name="description"]').val(community.description);
            $('#editCommunityModal select[name="isActive"]').val(community.isActive.toString());
            
            // Handle current banner image preview
            if (community.bannerUrl) {

                // Clear any existing event handlers to prevent duplicates
                $('#editCurrentBannerImage').off('load error');
                
                // Set the image source and show preview
                $('#editCurrentBannerImage').attr('src', community.bannerUrl);
                $('#editCurrentBannerPreview').show();
                
                // Add error handling for broken images
                $('#editCurrentBannerImage').on('error', function() {
                    //console.warn('Failed to load banner image:', community.bannerUrl);
                    $(this).attr('src', '/assets/img/placehold.jpg'); // Fallback image
                });
            } else {
                $('#editCurrentBannerPreview').hide();
            }
            
            // Set the community ID for the update
            $('#editCommunityModal').data('community-id', communityId);
            
            // Load regions and set the current region BEFORE showing modal
            if (community.region && community.region._id) {

                loadRegionsForEditSelect(community.region._id);
                // Load districts for the selected region
                loadDistrictsForEditSelect(community.region._id, community.district?._id);
            } else {
                console.warn('Community region:', community.region);
                loadRegionsForEditSelect();
            }
            
            // Show the modal AFTER regions are loaded
            $('#editCommunityModal').modal('show');
            
            // Ensure banner preview is visible after modal is shown
            setTimeout(function() {
                if (community.bannerUrl) {
                    $('#editCurrentBannerPreview').show();
                }
            }, 100);
        },
        error: function(xhr) {
            const errorMessage = xhr.responseJSON?.message || 'Failed to load community details.';
            showAlert('error', errorMessage);
        }
    });
}

function loadRegionsForEditSelect(selectedRegionId = null) {
    
    $.ajax({
        url: '/regions',
        method: 'GET',
        xhrFields: {
            withCredentials: true
        },
        success: function(response) {

            const regions = response.data?.regions || response.regions || response.data || response;
            const regionSelect = $('#editCommunityModal #editCommunityRegionSelect');

            // Clear existing options except the first one
            regionSelect.find('option:not(:first)').remove();
            
            regions.forEach(region => {
                //console.log('Adding region:', region.name, 'ID:', region._id);
                const option = $('<option></option>')
                    .attr('value', region._id)
                    .text(region.name);
                
                if (selectedRegionId && region._id === selectedRegionId) {
                    //console.log('Setting selected region:', region.name);
                    option.attr('selected', true);
                }
                
                regionSelect.append(option);
            });
            
            //console.log('Final region select options:', regionSelect.find('option').length);
        },
        error: function(xhr) {
            showAlert('error', 'Failed to load regions for editing.');
        }
    });
}

function loadDistrictsForEditSelect(regionId, selectedDistrictId = null) {

    $.ajax({
        url: `/districts?region=${regionId}`,
        method: 'GET',
        xhrFields: {
            withCredentials: true
        },
        success: function(response) {
            
            const districts = response.data?.districts || response.districts || response.data || response;
            const districtSelect = $('#editCommunityModal #editCommunityDistrictSelect');
            
            // Clear existing options except the first one
            districtSelect.find('option:not(:first)').remove();
            
            districts.forEach(district => {
                const option = $('<option></option>')
                    .attr('value', district._id)
                    .text(district.name);
                
                if (selectedDistrictId && district._id === selectedDistrictId) {
                    option.attr('selected', true);
                }
                
                districtSelect.append(option);
            });
        },
        error: function(xhr) {
            showAlert('error', 'Failed to load districts for editing.');
        }
    });
}

function updateCommunity() {

    const communityId = $('#editCommunityModal').data('community-id');
    const formData = new FormData();
    formData.append('name', $('#editCommunityModal input[name="name"]').val());
    formData.append('description', $('#editCommunityModal textarea[name="description"]').val());
    formData.append('region', $('#editCommunityModal #editCommunityRegionSelect').val());
    formData.append('district', $('#editCommunityModal #editCommunityDistrictSelect').val());
    formData.append('isActive', $('#editCommunityModal select[name="isActive"]').val() === 'true');
    
    // Handle banner file upload
    const bannerFile = $('#editCommunityModal input[name="banner"]')[0].files[0];
    if (bannerFile) {
        formData.append('banner', bannerFile);
    }
    
    //console.log('Update Data:', Object.fromEntries(formData));
    
    $.ajax({
        url: `/communities/${communityId}`,
        method: 'POST',
        data: formData,
        processData: false,
        contentType: false,
        xhrFields: {
            withCredentials: true
        },
        success: function(response) {
            $('#editCommunityModal').modal('hide');
            $('#editCommunityModal')[0].reset();
            showAlert('success', 'Community updated successfully!');
            loadCommunities();
        },
        error: function(xhr) {
            const errorMessage = xhr.responseJSON?.message || 'Failed to update community.';
            showAlert('error', errorMessage);
        }
    });
}

function deleteCommunity(communityId, communityName) {

    if (confirm(`Are you sure you want to delete "${communityName}"? This action cannot be undone.`)) {
        $.ajax({
            url: `/communities/${communityId}`,
            method: 'POST',
            xhrFields: {
                withCredentials: true
            },
            success: function(response) {
                showAlert('success', 'Community deleted successfully!');
                loadCommunities();
            },
            error: function(xhr) {
                const errorMessage = xhr.responseJSON?.message || 'Failed to delete community.';
                showAlert('error', errorMessage);
            }
        });
    }
}

function editRegion(regionId) {
    showAlert('info', 'Edit region feature coming soon!');
}

function deleteRegion(regionId, regionName) {
    if (confirm(`Are you sure you want to delete "${regionName}"? This action cannot be undone.`)) {
        $.ajax({
            url: `/regions/${regionId}`,
            method: 'POST',
            xhrFields: {
                withCredentials: true
            },
            success: function(response) {
                showAlert('success', 'Region deleted successfully!');
                loadRegionsList(); // Refresh the regions list
            },
            error: function(xhr) {
                const errorMessage = xhr.responseJSON?.message || 'Failed to delete region.';
                showAlert('error', errorMessage);
            }
        });
    }
}

function editDistrict(districtId) {
    showAlert('info', 'Edit district feature coming soon!');
}

function deleteDistrict(districtId, districtName) {
    
    if (confirm(`Are you sure you want to delete "${districtName}"? This action cannot be undone.`)) {
        $.ajax({
            url: `/districts/${districtId}`,
            method: 'POST',
            xhrFields: {
                withCredentials: true
            },
            success: function(response) {
                showAlert('success', 'District deleted successfully!');
                loadDistrictsList(); // Refresh the districts list
            },
            error: function(xhr) {
                const errorMessage = xhr.responseJSON?.message || 'Failed to delete district.';
                showAlert('error', errorMessage);
            }
        });
    }
}

// Load and display regions list
function loadRegionsList() {
    $.ajax({
        url: '/regions',
        method: 'GET',
        xhrFields: {
            withCredentials: true
        },
        success: function(response) {
            
            const regions = response.data?.regions || response.regions || response.data || response;
            //console.log('Regions array:', regions);
            
            const regionsListHtml = createRegionsListHtml(regions);
            $('#regionsList').html(regionsListHtml);
            
            // Re-initialize feather icons for the new content
            if (typeof feather !== 'undefined') {
                feather.replace();
            }
        },
        error: function(xhr) {
            showAlert('error', 'Failed to load regions list.');
        }
    });
}

// Load and display districts list
function loadDistrictsList() {
    console.log('=== LOADING DISTRICTS LIST ===');
    $.ajax({
        url: '/districts',
        method: 'GET',
        xhrFields: {
            withCredentials: true
        },
        success: function(response) {
            
            const districts = response.data?.districts || response.districts || response.data || response;
            //console.log('Districts array:', districts);
            
            const districtsListHtml = createDistrictsListHtml(districts);
            $('#districtsList').html(districtsListHtml);
            
            // Re-initialize feather icons for the new content
            if (typeof feather !== 'undefined') {
                feather.replace();
            }
        },
        error: function(xhr) {
            console.error('=== LOAD DISTRICTS LIST ERROR ===');
            console.error('Error:', xhr);
            showAlert('error', 'Failed to load districts list.');
        }
    });
}

// Create HTML for regions list
function createRegionsListHtml(regions) {
    if (!Array.isArray(regions) || regions.length === 0) {
        return `
            <div class="text-center text-muted py-4">
                <i data-feather="map-pin" class="mg-r-5"></i>
                No regions found. Create your first region!
            </div>
        `;
    }
    
    let html = '<div class="list-group" style="max-height: 400px; overflow-y: auto;">';
    
    regions.forEach(region => {
        html += `
            <div class="list-group-item d-flex justify-content-between align-items-center">
                <div>
                    <h6 class="mb-1">${region.name}</h6>
                    <p class="mb-1 text-muted">${region.description || 'No description provided'}</p>
                    <small class="text-muted">
                        <i data-feather="calendar" class="mg-r-5"></i>
                        Created: ${new Date(region.createdAt).toLocaleDateString()}
                    </small>
                </div>
                <div class="btn-group" role="group">
                    <button class="btn btn-sm btn-outline-primary" onclick="editRegion('${region._id}')" title="Edit Region">
                        <i data-feather="edit-2"></i>
                    </button>
                    <button class="btn btn-sm btn-outline-danger" onclick="deleteRegion('${region._id}', '${region.name}')" title="Delete Region">
                        <i data-feather="trash-2"></i>
                    </button>
                </div>
            </div>
        `;
    });
    
    html += '</div>';
    return html;
}

// Create HTML for districts list
function createDistrictsListHtml(districts) {
    if (!Array.isArray(districts) || districts.length === 0) {
        return `
            <div class="text-center text-muted py-4">
                <i data-feather="map" class="mg-r-5"></i>
                No districts found. Create your first district!
            </div>
        `;
    }
    
    let html = '<div class="list-group" style="max-height: 400px; overflow-y: auto;">';
    
    districts.forEach(district => {
        html += `
            <div class="list-group-item d-flex justify-content-between align-items-center">
                <div>
                    <h6 class="mb-1">${district.name}</h6>
                    <p class="mb-1 text-muted">${district.description || 'No description provided'}</p>
                    <small class="text-muted">
                        <i data-feather="map-pin" class="mg-r-5"></i>
                        Region: ${district.region?.name || 'Unknown'}
                    </small>
                    <br>
                    <small class="text-muted">
                        <i data-feather="calendar" class="mg-r-5"></i>
                        Created: ${new Date(district.createdAt).toLocaleDateString()}
                    </small>
                </div>
                <div class="btn-group" role="group">
                    <button class="btn btn-sm btn-outline-primary" onclick="editDistrict('${district._id}')" title="Edit District">
                        <i data-feather="edit-2"></i>
                    </button>
                    <button class="btn btn-sm btn-outline-danger" onclick="deleteDistrict('${district._id}', '${district.name}')" title="Delete District">
                        <i data-feather="trash-2"></i>
                    </button>
                </div>
            </div>
        `;
    });
    
    html += '</div>';
    return html;
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