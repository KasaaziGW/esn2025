/**
 * Login Form Logic
 * Handles authentication form validation and submission
 */

$(document).ready(function() {
    // Initialize feather icons
    feather.replace();

    // Global alert function
    window.showAlert = function(type, message) {
        const alertContainer = $('#alertContainer');
        const alertClass = type === 'success' ? 'alert-success' : 'alert-danger';
        
        alertContainer.html(`
            <div class="alert ${alertClass} fade show" role="alert">
                <i class="fas fa-${type === 'success' ? 'check-circle' : 'exclamation-circle'}"></i>
                ${message}
            </div>
        `);
        
        // Auto-dismiss after 5 seconds
        setTimeout(() => {
            alertContainer.find('.alert').alert('close');
        }, 5000);
    };

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

    window.detectIdentifierType = function(identifier) {
        // Check if it contains @ symbol (email)
        if (identifier.includes('@')) {
            return 'email';
        }

        // Check if it starts with + (international phone)
        if (identifier.startsWith('+')) {
            return 'phone';
        }

        // Check if it's a valid username format
        if (window.isValidUsername(identifier)) {
            return 'username';
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
        const isNotJustNumbers = !/^\d+$/.test(identifier);
        const isLongEnough = identifier.length > 3;

        // If it looks like an email without @, treat it as email
        if (hasEmailPattern && hasLetters && isNotJustNumbers && isLongEnough) {
            return 'email';
        }

        // Special case: if it ends with a common TLD, it's definitely an email
        const hasCommonTLD = /\.(com|org|net|edu|gov|co|uk|ca|au|de|fr|jp|cn|in|br|ru)$/i.test(identifier);
        if (hasCommonTLD && hasLetters && isNotJustNumbers) {
            return 'email';
        }

        // Check if it's mostly digits (phone) - be more lenient
        const digitCount = (identifier.match(/\d/g) || []).length;
        const totalLength = identifier.length;
        if (digitCount >= 7 && digitCount / totalLength >= 0.5) {
            return 'phone';
        }

        return 'unknown';
    };

    // Form submission
    $('#loginForm').on('submit', function(e) {
        e.preventDefault();

        const identifier = $('#identifier').val().trim();
        const password = $('#password').val();
        const rememberMe = $('#rememberMe').is(':checked');

        if (!identifier) {
            showAlert('danger', 'Please enter your username, email address, or phone number');
            return;
        }

        if (!password) {
            showAlert('danger', 'Please enter your password');
            return;
        }

        const loginBtn = $('#loginBtn');
        const btnText = loginBtn.find('.btn-text');
        const btnLoading = loginBtn.find('.btn-loading');

        // Show loading state
        loginBtn.prop('disabled', true);
        btnText.hide();
        btnLoading.show();

        // Determine identifier type
        const type = window.detectIdentifierType(identifier);
        const formData = {
            password: password,
            rememberMe: rememberMe
        };

        // Add identifier based on type
        if (type === 'username') {
            formData.username = identifier;
        } else if (type === 'email') {
            formData.email = identifier;
        } else if (type === 'phone') {
            formData.phone = identifier;
        } else {
            // Try all identifier fields
            formData.identifier = identifier;
        }

        $.ajax({
            url: '/auth/login',
            method: 'POST',
            contentType: 'application/json',
            data: JSON.stringify(formData),
            success: function(response) {
                console.log('Login response:', response);
                showAlert('success', 'Login successful! Redirecting...');

                // Redirect to dashboard or home (session-based, no token needed)
                setTimeout(() => {
                    const redirectUrl = response.data.redirectTo || '/dashboard';
                    console.log('Redirecting to:', redirectUrl);
                    window.location.href = redirectUrl;
                }, 1500);
            },
            error: function(xhr) {
                const error = xhr.responseJSON || { message: 'Login failed. Please try again.' };
                showAlert('danger', error.message || 'Login failed. Please check your credentials and try again.');
            },
            complete: function() {
                // Reset button state
                loginBtn.prop('disabled', false);
                btnText.show();
                btnLoading.hide();
            }
        });
    });

    // Forgot password functionality
    $('#forgotPasswordLink').on('click', function(e) {
        e.preventDefault();
        showAlert('info', 'Forgot password functionality will be implemented soon. Please contact support for assistance.');
    });

    // Check for existing session (with delay to ensure logout is complete)
    setTimeout(() => {
        // Don't auto-redirect if user just logged out
        if (sessionStorage.getItem('justLoggedOut')) {
            sessionStorage.removeItem('justLoggedOut');
            return;
        }
        
        $.ajax({
            url: '/auth/verify',
            method: 'GET',
            success: function(response) {
                // Only redirect if user is actually authenticated and not just logged out
                if (response && response.user && response.user.id) {
                    window.location.href = '/dashboard';
                }
            },
            error: function() {
                // No valid session, stay on login page
            }
        });
    }, 500); // 500ms delay to ensure logout is complete
});

// Helper function to get cookie value
function getCookie(name) {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop().split(';').shift();
}

// Helper function to delete cookie
function deleteCookie(name) {
    document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
}
