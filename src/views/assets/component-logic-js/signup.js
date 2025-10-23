/**
 * Signup Form Logic
 * Handles multi-step form validation and submission
 */

$(function(){
    'use strict'

    // Initialize Feather icons
    feather.replace();

    // Mobile menu functionality
    $('#mainMenuOpen').on('click', function(e) {
        e.preventDefault();
        $('#navbarMenu').addClass('show');
    });

    $('#mainMenuClose').on('click', function(e) {
        e.preventDefault();
        $('#navbarMenu').removeClass('show');
    });

    // Close mobile menu when clicking outside
    $(document).on('click', function(e) {
        if (!$(e.target).closest('#navbarMenu, #mainMenuOpen').length) {
            $('#navbarMenu').removeClass('show');
        }
    });

    // Multi-step form functionality
    window.currentStep = 1;
    const totalSteps = 3;
    
    // Update progress and step indicators
    function updateProgress() {
        const progressPercentage = (window.currentStep / totalSteps) * 100;
        $('#progressBar').css('width', progressPercentage + '%');
        
        // Update step indicators
        $('.step-indicator').removeClass('active completed');
        for (let i = 1; i <= totalSteps; i++) {
            if (i < window.currentStep) {
                $(`.step-indicator[data-step="${i}"]`).addClass('completed');
            } else if (i === window.currentStep) {
                $(`.step-indicator[data-step="${i}"]`).addClass('active');
            }
        }
    }
    
    // Show specific step
    window.showStep = function(step) {
        $('.form-step').removeClass('active');
        $(`#step${step}`).addClass('active');
        window.currentStep = step;
        updateProgress();
    };
    
    // Initialize the form
    updateProgress();
    
    // Auto-suggest display name from first and last name
    let userModifiedDisplayName = false;
    
    $('#firstName, #lastName').on('input', function() {
        const firstName = $('#firstName').val().trim();
        const lastName = $('#lastName').val().trim();
        const displayNameField = $('#displayName');
        
        if (!userModifiedDisplayName) {
            if (firstName || lastName) {
                const suggestedDisplayName = [firstName, lastName].filter(name => name).join(' ');
                displayNameField.val(suggestedDisplayName);
            } else {
                displayNameField.val('');
            }
        }
    });
    
    $('#displayName').on('input', function() {
        userModifiedDisplayName = true;
    });
    
    $('#displayName').on('blur', function() {
        if ($(this).val().trim() === '') {
            userModifiedDisplayName = false;
        }
    });
    
    // Real-time identifier validation (email/phone detection)
    $('#identifier').on('input', function() {
        const identifier = $(this).val().trim();
        const type = window.detectIdentifierType(identifier);
        const helpText = $('#identifierHelp');
        
        // Show country info for valid phone numbers
        if (type === 'phone' && identifier.length > 5) {
            const phoneInfo = window.getPhoneInfo(identifier);
            if (phoneInfo) {
                helpText.text(`Valid ${phoneInfo.country} phone number (${phoneInfo.international})`);
                helpText.removeClass('text-muted').addClass('text-success');
            } else if (identifier.startsWith('+')) {
                helpText.text('Entering phone number with country code...');
                helpText.removeClass('text-success').addClass('text-muted');
            }
        } else if (type === 'email' && identifier.includes('@')) {
            helpText.text('Valid email address format');
            helpText.removeClass('text-muted').addClass('text-success');
        } else if (identifier.length === 0) {
            helpText.text('Use email format or phone with country code (e.g., +1234567890)');
            helpText.removeClass('text-success').addClass('text-muted');
        }
        
        validateIdentifier(identifier);
    });
    
    // Password confirmation validation
    $('#confirmPassword').on('input', function() {
        const password = $('#password').val();
        const confirmPassword = $(this).val();
        
        if (confirmPassword && password !== confirmPassword) {
            $(this).addClass('is-invalid');
            if (!$(this).next('.invalid-feedback').length) {
                $(this).after('<div class="invalid-feedback">Passwords do not match</div>');
            }
        } else {
            $(this).removeClass('is-invalid');
            $(this).next('.invalid-feedback').remove();
        }
    });

    // Form submission
    $('#signupForm').on('submit', function(e) {
        e.preventDefault();
        
        // Get identifier and check if it exists
        const identifier = $('#identifier').val().trim();
        
        if (!identifier) {
            showAlert('danger', 'Please enter your email address or phone number');
            return;
        }
        
        // Check if we can detect the type
        const type = window.detectIdentifierType(identifier);
        
        if (type === 'unknown') {
            showAlert('danger', 'Please enter a valid email address or phone number with country code (e.g., +1234567890)');
            return;
        }
        
        const submitBtn = $('#submitBtn');
        const originalText = submitBtn.html();
        
        submitBtn.prop('disabled', true).text('Creating Account...');
        
        const username = $('#username').val().trim();
        const formData = {
            username: username,
            password: $('#password').val(),
            displayName: $('#displayName').val().trim() || undefined,
            firstName: $('#firstName').val().trim() || undefined,
            lastName: $('#lastName').val().trim() || undefined
        };

        // Validate username
        if (!username) {
            showAlert('danger', 'Username is required');
            submitBtn.prop('disabled', false).html(originalText);
            return;
        }

        if (!window.isValidUsername(username)) {
            showAlert('danger', 'Username must be 3-30 characters long and contain only letters, numbers, underscores, and hyphens');
            submitBtn.prop('disabled', false).html(originalText);
            return;
        }
        
        if (type === 'email') {
            formData.email = identifier;
        } else {
            formData.phone = identifier;
        }
        
        $.ajax({
            url: '/auth/register',
            method: 'POST',
            contentType: 'application/json',
            data: JSON.stringify(formData),
            success: function(response) {
                showAlert('success', 'Registration successful! Redirecting to login...');
                
                if (response.data.token) {
                    localStorage.setItem('authToken', response.data.token);
                }
                
                setTimeout(() => {
                    window.location.href = '/login';
                }, 2000);
            },
            error: function(xhr) {
                const error = xhr.responseJSON || { message: 'Registration failed. Please try again.' };
                showAlert('danger', error.message || 'Registration failed. Please try again.');
            },
            complete: function() {
                submitBtn.prop('disabled', false).text(originalText);
            }
        });
    });

    // Global validation functions
    window.isValidEmail = function(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    };
    
    window.isValidPhone = function(phone) {
        try {
            // Use libphonenumber-js for validation
            const parsed = libphonenumber.parsePhoneNumberFromString(phone);
            return parsed && parsed.isValid();
        } catch (error) {
            // Fallback to basic validation if libphonenumber fails
            const cleanPhone = phone.replace(/\D/g, '');
            return cleanPhone.length >= 7 && cleanPhone.length <= 15;
        }
    };

    window.isValidUsername = function(username) {
        // Username validation: 3-30 characters, alphanumeric + underscore/hyphen
        const usernameRegex = /^[a-zA-Z0-9_-]{3,30}$/;
        return usernameRegex.test(username);
    };

    window.getPhoneInfo = function(phone) {
        try {
            const parsed = libphonenumber.parsePhoneNumberFromString(phone);
            if (parsed && parsed.isValid()) {
                return {
                    isValid: true,
                    country: parsed.country,
                    countryCallingCode: parsed.countryCallingCode,
                    nationalNumber: parsed.nationalNumber,
                    international: parsed.formatInternational(),
                    national: parsed.formatNational()
                };
            }
        } catch (error) {
            // Return null if parsing fails
        }
        return null;
    };
    
    window.detectIdentifierType = function(identifier) {
        // Check if it contains @ symbol (email)
        if (identifier.includes('@')) {
            return 'email';
        }
        
        // Check if it starts with + (international phone)
        if (identifier.startsWith('+')) {
            return 'phone';
        }
        
        // Check for email-like patterns even without @
        const emailPatterns = [
            /^[a-zA-Z0-9._-]+$/, // Contains letters, numbers, dots, underscores, hyphens
            /^[a-zA-Z]+[a-zA-Z0-9._-]*$/, // Starts with letters
            /\.(com|org|net|edu|gov|mil|int|co|uk|ca|au|de|fr|jp|cn|in|br|ru|za|mx|ar|cl|pe|ve|ec|bo|py|uy|gy|sr|tt|bb|jm|bs|cu|do|ht|pr|vi|ag|ai|aw|bb|bl|bm|bn|bq|bs|bv|cw|dm|fk|gd|gf|gl|gp|gs|gt|gy|hn|ht|jm|kn|ky|lc|mf|mq|ms|ni|pa|pm|pr|py|sv|sx|tc|tt|us|uy|vc|vg|vi|wf|ws)$/i // Common TLDs
        ];
        
        // Check if it looks like an email without @
        const hasEmailPattern = emailPatterns.some(pattern => pattern.test(identifier));
        const hasLetters = /[a-zA-Z]/.test(identifier);
        const hasCommonTLD = /\.(com|org|net|edu|gov|co|uk|ca|au|de|fr|jp|cn|in|br|ru)$/i.test(identifier);
        const isNotJustNumbers = !/^\d+$/.test(identifier);
        const isLongEnough = identifier.length > 3;
        
        // If it looks like an email without @, treat it as email
        if (hasEmailPattern && hasLetters && isNotJustNumbers && isLongEnough) {
            return 'email';
        }
        
        // Special case: if it ends with a common TLD, it's definitely an email
        if (hasCommonTLD && hasLetters && isNotJustNumbers) {
            return 'email';
        }
        
        // Check if it's mostly digits (phone) - be more lenient
        const digitCount = (identifier.match(/\d/g) || []).length;
        const totalLength = identifier.length;
        if (digitCount >= 7 && digitCount / totalLength >= 0.5) { // Reduced from 0.7 to 0.5
            return 'phone';
        }
        
        return 'unknown';
    }
    
    function validateIdentifier(identifier) {
        const type = window.detectIdentifierType(identifier);
        const identifierField = $('#identifier');
        const feedbackElement = identifierField.next('.invalid-feedback');
        const label = $('#identifierLabel');
        const helpText = $('#identifierHelp');
        
        // Remove existing feedback
        if (feedbackElement.length) {
            feedbackElement.remove();
        }
        identifierField.removeClass('is-invalid is-valid');
        
        // Update label and help text based on detected type
        if (type === 'email') {
            label.text('Email address *');
            if (identifier.includes('@')) {
                helpText.text('Enter a valid email address');
            } else {
                helpText.text('Enter a valid email address (don\'t forget the @ symbol)');
            }
        } else if (type === 'phone') {
            label.text('Phone number *');
            if (identifier.startsWith('+')) {
                helpText.text('Enter a valid phone number with country code');
            } else {
                helpText.text('Enter a valid phone number with country code (e.g., +1234567890)');
            }
        } else if (identifier.trim()) {
            label.text('Email address or Phone *');
            helpText.text('Please enter a valid email address or phone number with country code');
        } else {
            label.text('Email address or Phone *');
            helpText.text('Use email format or phone with country code (e.g., +1234567890)');
        }
        
        if (!identifier.trim()) {
            return false;
        }
        
        let isValid = false;
        let errorMessage = '';
        
        if (type === 'email') {
            isValid = window.isValidEmail(identifier);
            if (!isValid) {
                if (identifier.includes('@')) {
                    errorMessage = 'Please enter a valid email address';
                } else {
                    errorMessage = 'Email address is missing the @ symbol';
                }
            }
        } else if (type === 'phone') {
            isValid = window.isValidPhone(identifier);
            if (!isValid) {
                if (identifier.startsWith('+')) {
                    errorMessage = 'Please enter a valid phone number with country code';
                } else {
                    errorMessage = 'Please enter a valid phone number with country code (e.g., +1234567890)';
                }
            } else {
                // Get phone info for better feedback
                const phoneInfo = window.getPhoneInfo(identifier);
                if (phoneInfo) {
                    // Update help text with country info
                    helpText.text(`Valid ${phoneInfo.country} phone number (${phoneInfo.international})`);
                }
            }
        } else {
            isValid = false;
            errorMessage = 'Please enter a valid email address or phone number with country code';
        }
        
        // Apply visual feedback
        if (isValid) {
            identifierField.addClass('is-valid');
        } else {
            identifierField.addClass('is-invalid');
            if (errorMessage) {
                identifierField.after(`<div class="invalid-feedback">${errorMessage}</div>`);
            }
        }
        
        return isValid;
    }
    
    function showAlert(type, message) {
        const alertHtml = `
            <div class="alert alert-${type} alert-dismissible fade show" role="alert">
                ${message}
                <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
            </div>
        `;
        $('#alertContainer').html(alertHtml);
        
        setTimeout(() => {
            $('.alert').alert('close');
        }, 5000);
    }
});

/**
 * Multi-Step Navigation Logic
 */
document.addEventListener('DOMContentLoaded', function() {
    // Next buttons
    document.getElementById('nextStep1')?.addEventListener('click', function(e) {
        e.preventDefault();
        window.showStep(2);
    });
    
    document.getElementById('nextStep2')?.addEventListener('click', function(e) {
        e.preventDefault();
        
        // Validate identifier before proceeding to step 3
        const identifier = document.getElementById('identifier').value.trim();
        if (!identifier) {
            alert('Please enter your email address or phone number');
            return;
        }
        
        // Check if identifier is valid
        const type = window.detectIdentifierType(identifier);
        let isValid = false;
        
        if (type === 'email') {
            isValid = window.isValidEmail(identifier);
        } else if (type === 'phone') {
            isValid = window.isValidPhone(identifier);
        }
        
        if (!isValid) {
            alert('Please enter a valid email address or phone number with country code (e.g., +1234567890)');
            return;
        }
        
        window.showStep(3);
    });
    
    // Previous buttons
    document.getElementById('prevStep2')?.addEventListener('click', function(e) {
        e.preventDefault();
        window.showStep(1);
    });
    
    document.getElementById('prevStep3')?.addEventListener('click', function(e) {
        e.preventDefault();
        window.showStep(2);
    });
});
