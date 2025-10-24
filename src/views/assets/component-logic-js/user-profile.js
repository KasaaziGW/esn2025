'use strict';

$(document).ready(function() {
    console.log('=== USER PROFILE PAGE INITIALIZED ===');
    console.log('jQuery version:', $.fn.jquery);
    console.log('Current User:', window.currentUser);
    console.log('User data element exists:', document.getElementById('user-data') !== null);
    console.log('Region select element exists:', $('#regionSelect').length);
    console.log('District select element exists:', $('#districtSelect').length);
    
    // Skip feather icons initialization to avoid errors
    // Feather icons will be handled by other scripts
    
    // Initialize tooltips
    $('[data-bs-toggle="tooltip"]').tooltip();
    
    // Initialize form
    initializeForm();
    
    // Ensure user data is available
    if (!window.currentUser) {
        console.warn('User data not available, attempting to extract from DOM...');
        const userDataEl = document.getElementById('user-data');
        if (userDataEl) {
            window.currentUser = {
                id: userDataEl.dataset.userId,
                username: userDataEl.dataset.username,
                role: userDataEl.dataset.role,
                region: userDataEl.dataset.region,
                district: userDataEl.dataset.district,
                avatarUrl: userDataEl.dataset.avatarUrl,
                location: JSON.parse(userDataEl.dataset.location || '{}'),
                emergencyContacts: JSON.parse(userDataEl.dataset.emergencyContacts || '[]')
            };
            console.log('User data extracted from DOM:', window.currentUser);
        } else {
            console.error('User data element not found!');
        }
    }
    
    // Load regions from API
    console.log('=== CALLING loadRegions() ===');
    loadRegions();
    
    // Set up region-district dependency
    setupRegionDistrictDependency();
    
    // Initialize emergency contacts
    initializeEmergencyContacts();
    
    // Initialize progress bar width
    initializeProgressBar();
    
    // Force refresh districts after everything is loaded
    setTimeout(function() {
        console.log('Force refreshing districts...');
        const currentRegion = $('#regionSelect').val();
        if (currentRegion) {
            console.log('Force updating districts for region:', currentRegion);
            updateDistricts(currentRegion);
        }
    }, 500);
});

// Load regions from API and populate dropdown
function loadRegions() {
    console.log('=== LOADING REGIONS FROM API ===');
    console.log('jQuery available:', typeof $ !== 'undefined');
    console.log('Region select element found:', $('#regionSelect').length);
    
    $.ajax({
        url: `/regions`,
        method: 'GET',
        xhrFields: {
            withCredentials: true
        },
        success: function(response) {
            console.log('=== REGIONS API SUCCESS ===');
            console.log('Regions loaded successfully:', response);
            
            const regionSelect = $('#regionSelect');
            console.log('Region select element:', regionSelect);
            console.log('Current options count:', regionSelect.find('option').length);
            
            if (response.data && response.data.regions) {
                console.log('Found regions in response:', response.data.regions.length);
                
                // Clear existing options except the first one
                regionSelect.find('option:not(:first)').remove();
                console.log('Cleared existing options');
                
                // Add regions from API
                response.data.regions.forEach((region, index) => {
                    const isSelected = window.currentUser.region === region.name ? 'selected' : '';
                    const optionHtml = `<option value="${region.name}" ${isSelected}>${region.name}</option>`;
                    console.log(`Adding region ${index + 1}: ${region.name} (selected: ${isSelected})`);
                    regionSelect.append(optionHtml);
                });
                
                console.log('Regions populated in dropdown');
                console.log('Final options count:', regionSelect.find('option').length);
                
                // If user has a region, load districts for it
                if (window.currentUser.region) {
                    console.log('User has region, loading districts for:', window.currentUser.region);
                    updateDistricts(window.currentUser.region);
                }
            } else {
                console.error('No regions found in response data');
            }
        },
        error: function(xhr) {
            console.error('=== REGIONS API ERROR ===');
            console.error('Error loading regions:', xhr);
            console.error('Status:', xhr.status);
            console.error('Response:', xhr.responseText);
            showAlert('warning', 'Failed to load regions. Please refresh the page.');
        }
    });
}

// Initialize form with user data
function initializeForm() {
    console.log('Initializing form with user data');
    console.log('Current user region:', window.currentUser.region);
    console.log('Current user district:', window.currentUser.district);
    
    // Set district based on current region
    if (window.currentUser.region) {
        console.log('Updating districts for region:', window.currentUser.region);
        updateDistricts(window.currentUser.region);
        
        // Set the district value after a short delay to ensure DOM is ready
        setTimeout(() => {
            if (window.currentUser.district) {
                console.log('Setting district value to:', window.currentUser.district);
                $('#districtSelect').val(window.currentUser.district);
            }
        }, 200);
    }
    
    // Also trigger the region change event to ensure districts are populated
    setTimeout(() => {
        const currentRegion = $('#regionSelect').val();
        if (currentRegion) {
            console.log('Triggering region change for:', currentRegion);
            $('#regionSelect').trigger('change');
        }
    }, 300);
}

// Region-District dependency
function setupRegionDistrictDependency() {
    console.log('Setting up region-district dependency...');
    
    // Check if elements exist
    const regionSelect = $('#regionSelect');
    const districtSelect = $('#districtSelect');
    
    console.log('Region select found:', regionSelect.length);
    console.log('District select found:', districtSelect.length);
    
    if (regionSelect.length === 0) {
        console.error('Region select element not found!');
        return;
    }
    
    if (districtSelect.length === 0) {
        console.error('District select element not found!');
        return;
    }
    
    // Set up change event
    regionSelect.on('change', function() {
        const region = $(this).val();
        console.log('=== REGION CHANGE EVENT TRIGGERED ===');
        console.log('Region changed to:', region);
        console.log('Calling updateDistricts...');
        updateDistricts(region);
    });
    
    // Also set up click event as backup
    regionSelect.on('click', function() {
        const region = $(this).val();
        console.log('=== REGION CLICK EVENT TRIGGERED ===');
        console.log('Region clicked, current value:', region);
        if (region) {
            console.log('Calling updateDistricts from click event...');
            updateDistricts(region);
        }
    });
}

function updateDistricts(region) {
    console.log('updateDistricts called with region:', region);
    const districtSelect = $('#districtSelect');
    
    if (districtSelect.length === 0) {
        console.error('District select element not found!');
        return;
    }
    
    // Clear existing options
    districtSelect.empty().append('<option value="">Select District</option>');
    
    if (!region) {
        console.log('No region selected');
        return;
    }
    
    // Show loading state
    districtSelect.append('<option value="" disabled>Loading districts...</option>');
    
    // Get the region key from the regions we already loaded
    const regionSelect = $('#regionSelect');
    const selectedOption = regionSelect.find(`option[value="${region}"]`);
    
    if (selectedOption.length === 0) {
        console.error('Region option not found in dropdown:', region);
        districtSelect.empty().append('<option value="">Select District</option>');
        districtSelect.append('<option value="" disabled>Region not found</option>');
        return;
    }
    
    // For now, let's use a simple approach - get districts by region name
    // We'll need to modify the API to accept region names
    console.log('Fetching districts for region:', region);
    
    $.ajax({
        url: `/districts?region=${encodeURIComponent(region)}`,
        method: 'GET',
        xhrFields: {
            withCredentials: true
        },
        success: function(response) {
            console.log('Districts fetched successfully:', response);
            
            // Clear loading option
            districtSelect.empty().append('<option value="">Select District</option>');
            
            if (response.data && response.data.districts && response.data.districts.length > 0) {
                console.log('Adding districts for region:', region, response.data.districts);
                response.data.districts.forEach(district => {
                    const isSelected = window.currentUser.district === district.name ? 'selected' : '';
                    districtSelect.append(`<option value="${district.name}" ${isSelected}>${district.name}</option>`);
                });
            } else {
                console.log('No districts found for region:', region);
                districtSelect.append('<option value="" disabled>No districts available</option>');
            }
        },
        error: function(xhr) {
            console.error('Error fetching districts:', xhr);
            
            // Clear loading option and show error
            districtSelect.empty().append('<option value="">Select District</option>');
            districtSelect.append('<option value="" disabled>Error loading districts</option>');
            
            // Show user-friendly error message
            showAlert('warning', 'Failed to load districts. Please try again.');
        },
        complete: function() {
            // Trigger change event to update any dependent elements
            districtSelect.trigger('change');
        }
    });
}

// Manual function to refresh districts (can be called from browser console for debugging)
window.refreshDistricts = function() {
    const region = $('#regionSelect').val();
    console.log('Manual refresh of districts for region:', region);
    updateDistricts(region);
};

// Debug function to test the functionality
window.testRegionDistrict = function() {
    console.log('=== Testing Region-District Functionality ===');
    console.log('jQuery loaded:', typeof $ !== 'undefined');
    console.log('Region select element:', $('#regionSelect').length);
    console.log('District select element:', $('#districtSelect').length);
    console.log('Current region value:', $('#regionSelect').val());
    console.log('Current district options:', $('#districtSelect option').length);
    
    // Test API endpoint directly
    console.log('Testing API endpoint...');
    $.ajax({
        url: '/regions',
        method: 'GET',
        xhrFields: {
            withCredentials: true
        },
        success: function(response) {
            console.log('Regions API test successful:', response);
        },
        error: function(xhr) {
            console.error('Regions API test failed:', xhr);
        }
    });
    
    // Test with current region
    const currentRegion = $('#regionSelect').val();
    if (currentRegion) {
        console.log('Testing with current region:', currentRegion);
        updateDistricts(currentRegion);
    }
};

// Manual test function for districts
window.testDistricts = function(regionName) {
    console.log('=== Manual District Test ===');
    console.log('Testing districts for region:', regionName);
    updateDistricts(regionName);
};

// Emergency Contacts Management
function initializeEmergencyContacts() {
    // If no emergency contacts, add one empty one
    if ($('.emergency-contact-item').length === 0) {
        addEmergencyContact();
    }
}

function initializeProgressBar() {
    // Set progress bar width from data attribute
    const progressBar = $('.progress-bar[data-width]');
    if (progressBar.length) {
        const width = progressBar.data('width');
        progressBar.css('width', width + '%');
    }
}

function addEmergencyContact() {
    const container = $('#emergencyContacts');
    const index = $('.emergency-contact-item').length;
    
    const contactHtml = `
        <div class="emergency-contact-item mg-b-15">
            <div class="row">
                <div class="col-md-4">
                    <input type="text" class="form-control" name="emergencyContacts[${index}][name]" 
                           placeholder="Contact Name" required>
                </div>
                <div class="col-md-4">
                    <input type="tel" class="form-control" name="emergencyContacts[${index}][phone]" 
                           placeholder="Phone Number" required>
                </div>
                <div class="col-md-3">
                    <select class="form-control" name="emergencyContacts[${index}][priority]">
                        <option value="1">Priority 1</option>
                        <option value="2">Priority 2</option>
                        <option value="3">Priority 3</option>
                        <option value="4">Priority 4</option>
                        <option value="5">Priority 5</option>
                    </select>
                </div>
                <div class="col-md-1">
                    <button type="button" class="btn btn-sm btn-outline-danger" onclick="removeEmergencyContact(this)">
                        <i data-feather="trash-2" class="wd-12"></i>
                    </button>
                </div>
            </div>
        </div>
    `;
    
    // Remove the "no contacts" message if it exists
    container.find('.text-center').remove();
    
    container.append(contactHtml);
    
    // Re-initialize feather icons for new buttons
    setTimeout(function() {
        if (typeof feather !== 'undefined') {
            try {
                feather.replace();
            } catch (error) {
                console.warn('Feather icons re-initialization failed:', error);
            }
        }
    }, 50);
}

function removeEmergencyContact(button) {
    $(button).closest('.emergency-contact-item').remove();
    
    // If no contacts left, show the empty state
    if ($('.emergency-contact-item').length === 0) {
        const container = $('#emergencyContacts');
        container.html(`
            <div class="text-center py-4">
                <i data-feather="phone-call" class="wd-48 ht-48 tx-color-03 mg-b-15"></i>
                <p class="tx-color-03 mg-b-0">No emergency contacts added yet</p>
                <small class="tx-color-03">Add at least one emergency contact for your safety</small>
            </div>
        `);
        
        // Re-initialize feather icons
        setTimeout(function() {
            if (typeof feather !== 'undefined') {
                try {
                    feather.replace();
                } catch (error) {
                    console.warn('Feather icons re-initialization failed:', error);
                }
            }
        }, 50);
    }
}

// Save profile function
window.saveProfile = function() {
    console.log('Saving profile...');
    
    // Show loading state
    const saveBtn = $('button[onclick="saveProfile()"]');
    const originalText = saveBtn.html();
    saveBtn.html('<i data-feather="loader" class="wd-12 mg-r-5"></i> Saving...').prop('disabled', true);
    
    setTimeout(function() {
        if (typeof feather !== 'undefined') {
            try {
                feather.replace();
            } catch (error) {
                console.warn('Feather icons re-initialization failed:', error);
            }
        }
    }, 50);
    
    // Collect form data
    const formData = collectFormData();
    
    // Validate form
    if (!validateForm(formData)) {
        resetSaveButton(saveBtn, originalText);
        return;
    }
    
    // Send AJAX request
    $.ajax({
        url: '/users/profile',
        method: 'POST',
        contentType: 'application/json',
        data: JSON.stringify(formData),
        xhrFields: {
            withCredentials: true
        },
        success: function(response) {
            console.log('Profile saved successfully:', response);
            showAlert('success', 'Profile updated successfully!');
            resetSaveButton(saveBtn, originalText);
            
            // Update profile completion if needed
            if (response.data && response.data.profileComplete) {
                updateProfileCompletion(100);
            }
        },
        error: function(xhr) {
            console.error('Error saving profile:', xhr);
            const errorMessage = xhr.responseJSON?.message || 'Failed to save profile';
            showAlert('danger', errorMessage);
            resetSaveButton(saveBtn, originalText);
        }
    });
};

function collectFormData() {
    const formData = {
        firstName: $('input[name="firstName"]').val(),
        lastName: $('input[name="lastName"]').val(),
        displayName: $('input[name="displayName"]').val(),
        bio: $('textarea[name="bio"]').val(),
        email: $('input[name="email"]').val(),
        phone: $('input[name="phone"]').val(),
        currentStatus: $('select[name="currentStatus"]').val(),
        region: $('select[name="region"]').val(),
        district: $('select[name="district"]').val(),
        tags: $('input[name="tags"]').val().split(',').map(tag => tag.trim()).filter(tag => tag),
        emergencySettings: {
            alertFrequency: $('select[name="emergencySettings[alertFrequency]"]').val(),
            locationSharing: $('select[name="emergencySettings[locationSharing]"]').val()
        }
    };
    
    // Add location if coordinates are provided
    const latitude = parseFloat($('input[name="latitude"]').val());
    const longitude = parseFloat($('input[name="longitude"]').val());
    if (!isNaN(latitude) && !isNaN(longitude)) {
        formData.location = {
            type: 'Point',
            coordinates: [longitude, latitude]
        };
    }
    
    // Collect emergency contacts
    formData.emergencyContacts = [];
    $('.emergency-contact-item').each(function() {
        const name = $(this).find('input[name*="[name]"]').val();
        const phone = $(this).find('input[name*="[phone]"]').val();
        const priority = parseInt($(this).find('select[name*="[priority]"]').val());
        
        if (name && phone) {
            formData.emergencyContacts.push({
                name: name,
                phone: phone,
                priority: priority
            });
        }
    });
    
    return formData;
}

function validateForm(formData) {
    // Required fields validation
    if (!formData.firstName || !formData.lastName) {
        showAlert('warning', 'First name and last name are required');
        return false;
    }
    
    if (!formData.email || !formData.phone) {
        showAlert('warning', 'Email and phone number are required');
        return false;
    }
    
    if (!formData.region || !formData.district) {
        showAlert('warning', 'Region and district are required');
        return false;
    }
    
    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
        showAlert('warning', 'Please enter a valid email address');
        return false;
    }
    
    // Phone validation (basic)
    const phoneRegex = /^[\+]?[0-9\s\-\(\)]{10,}$/;
    if (!phoneRegex.test(formData.phone)) {
        showAlert('warning', 'Please enter a valid phone number');
        return false;
    }
    
    return true;
}

function resetSaveButton(button, originalText) {
    button.html(originalText).prop('disabled', false);
    setTimeout(function() {
        if (typeof feather !== 'undefined') {
            try {
                feather.replace();
            } catch (error) {
                console.warn('Feather icons re-initialization failed:', error);
            }
        }
    }, 50);
}

function updateProfileCompletion(percentage) {
    $('.progress-bar').css('width', percentage + '%');
    $('.progress-bar').next().text(percentage === 100 ? 'Complete' : 'Incomplete');
}

// Reset form function
window.resetForm = function() {
    if (confirm('Are you sure you want to reset all changes? This will reload the page.')) {
        location.reload();
    }
};

// Alert helper function
function showAlert(type, message) {
    // Remove existing alerts
    $('.alert').remove();
    
    const alertHtml = `
        <div class="alert alert-${type} alert-dismissible fade show" role="alert">
            <i data-feather="${type === 'success' ? 'check-circle' : type === 'warning' ? 'alert-triangle' : 'x-circle'}" class="wd-16 mg-r-5"></i>
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        </div>
    `;
    
    // Insert alert at the top of the content body
    $('.content-body .container').prepend(alertHtml);
    
    // Re-initialize feather icons
    setTimeout(function() {
        if (typeof feather !== 'undefined') {
            try {
                feather.replace();
            } catch (error) {
                console.warn('Feather icons re-initialization failed:', error);
            }
        }
    }, 50);
    
    // Auto-dismiss after 5 seconds
    setTimeout(() => {
        $('.alert').fadeOut();
    }, 5000);
}

// Form validation on input
$(document).on('input', 'input[required], select[required]', function() {
    const $this = $(this);
    const value = $this.val();
    
    if (value) {
        $this.removeClass('is-invalid').addClass('is-valid');
    } else {
        $this.removeClass('is-valid').addClass('is-invalid');
    }
});

// Real-time form validation
$(document).on('blur', 'input[type="email"]', function() {
    const email = $(this).val();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    
    if (email && !emailRegex.test(email)) {
        $(this).addClass('is-invalid');
        showAlert('warning', 'Please enter a valid email address');
    } else {
        $(this).removeClass('is-invalid');
    }
});

$(document).on('blur', 'input[type="tel"]', function() {
    const phone = $(this).val();
    const phoneRegex = /^[\+]?[0-9\s\-\(\)]{10,}$/;
    
    if (phone && !phoneRegex.test(phone)) {
        $(this).addClass('is-invalid');
        showAlert('warning', 'Please enter a valid phone number');
    } else {
        $(this).removeClass('is-invalid');
    }
});

// Avatar Upload Functions
window.handleAvatarUpload = function(input) {
    const file = input.files[0];
    if (!file) return;
    
    // Validate file type
    if (!file.type.startsWith('image/')) {
        showAlert('danger', 'Please select a valid image file');
        return;
    }
    
    // Validate file size (5MB max)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
        showAlert('danger', 'Image size must be less than 5MB');
        return;
    }
    
    // Show preview
    const reader = new FileReader();
    reader.onload = function(e) {
        $('#profileAvatar').attr('src', e.target.result);
    };
    reader.readAsDataURL(file);
    
    // Upload the file
    uploadAvatar(file);
};

function uploadAvatar(file) {
    const formData = new FormData();
    formData.append('profile', file);
    
    // Show progress
    $('#uploadProgress').show();
    const progressBar = $('#uploadProgress .progress-bar');
    progressBar.css('width', '0%');
    
    $.ajax({
        url: '/users/profile/avatar',
        method: 'POST',
        data: formData,
        processData: false,
        contentType: false,
        xhrFields: {
            withCredentials: true
        },
        xhr: function() {
            const xhr = new window.XMLHttpRequest();
            xhr.upload.addEventListener('progress', function(evt) {
                if (evt.lengthComputable) {
                    const percentComplete = evt.loaded / evt.total * 100;
                    progressBar.css('width', percentComplete + '%');
                }
            }, false);
            return xhr;
        },
        success: function(response) {
            console.log('Avatar uploaded successfully:', response);
            showAlert('success', 'Profile photo updated successfully!');
            
            // Update the avatar URL in the page
            if (response.data && response.data.avatarUrl) {
                $('#profileAvatar').attr('src', response.data.avatarUrl);
                // Show remove button if it wasn't there before
                if (!$('button[onclick="removeAvatar()"]').length) {
                    $('button[onclick*="avatarUpload"]').after(
                        '<button type="button" class="btn btn-sm btn-outline-danger mg-l-5" onclick="removeAvatar()">' +
                        '<i data-feather="trash-2" class="wd-12 mg-r-5"></i> Remove' +
                        '</button>'
                    );
                    setTimeout(function() {
                        if (typeof feather !== 'undefined') {
                            try {
                                feather.replace();
                            } catch (error) {
                                console.warn('Feather icons re-initialization failed:', error);
                            }
                        }
                    }, 50);
                }
            }
        },
        error: function(xhr) {
            console.error('Error uploading avatar:', xhr);
            const errorMessage = xhr.responseJSON?.message || 'Failed to upload photo';
            showAlert('danger', errorMessage);
            
            // Revert to original avatar
            $('#profileAvatar').attr('src', window.currentUser.avatarUrl || '/assets/img/avatar.webp');
        },
        complete: function() {
            $('#uploadProgress').hide();
            progressBar.css('width', '0%');
        }
    });
}

window.removeAvatar = function() {
    if (!confirm('Are you sure you want to remove your profile photo?')) {
        return;
    }
    
    $.ajax({
        url: '/users/profile/avatar/remove',
        method: 'POST',
        xhrFields: {
            withCredentials: true
        },
        success: function(response) {
            console.log('Avatar removed successfully:', response);
            showAlert('success', 'Profile photo removed successfully!');
            
            // Update the avatar to default
            $('#profileAvatar').attr('src', '/assets/img/avatar.webp');
            
            // Hide remove button
            $('button[onclick="removeAvatar()"]').remove();
        },
        error: function(xhr) {
            console.error('Error removing avatar:', xhr);
            const errorMessage = xhr.responseJSON?.message || 'Failed to remove photo';
            showAlert('danger', errorMessage);
        }
    });
};