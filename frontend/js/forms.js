// Function to toggle registration forms
function toggleRegistrationForm(formId) {
    const form = document.getElementById(formId);
    if (form.style.display === "none" || form.style.display === "") {
        // Hide all other forms first
        const allForms = document.querySelectorAll('.registration-form');
        allForms.forEach(f => {
            f.style.display = "none";
        });
        // Show the selected form
        form.style.display = "block";
    } else {
        form.style.display = "none";
    }
}

// Display session messages if they exist
document.addEventListener('DOMContentLoaded', function() {
    // Check for login errors
    const urlParams = new URLSearchParams(window.location.search);
    const loginError = urlParams.get('login_error');
    if (loginError) {
        alert(loginError);
    }
    
    // Check for registration messages
    const regSuccess = urlParams.get('reg_success');
    if (regSuccess) {
        alert(regSuccess);
    }
    
    const regError = urlParams.get('reg_error');
    if (regError) {
        alert(regError);
    }
    
    // Check for contact form messages
    const contactSuccess = urlParams.get('contact_success');
    if (contactSuccess) {
        alert(contactSuccess);
    }
    
    const contactError = urlParams.get('contact_error');
    if (contactError) {
        alert(contactError);
    }
});
