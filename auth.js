// ====== AUTHENTICATION FUNCTIONS ======
// Wait for main.js to load

// Register a new user with enhanced security
function registerUser(email, password, role = "user") {
    // Input validation
    if (!email || !password) {
        alert("Email and password are required!");
        return;
    }

    if (password.length < 6) {
        alert("Password must be at least 6 characters long!");
        return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        alert("Please enter a valid email address!");
        return;
    }

    auth.createUserWithEmailAndPassword(email, password)
        .then((userCredential) => {
            const user = userCredential.user;
            console.log("User registered:", user.uid);

            // Save role and additional info in Firestore
            return db.collection("users").doc(user.uid).set({
                email: email,
                role: role,
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                lastLogin: firebase.firestore.FieldValue.serverTimestamp(),
                active: true
            });
        })
        .then(() => {
            console.log("User data saved successfully");
            alert("Registration successful! Please login.");
            window.location.href = "login.html";
        })
        .catch((error) => {
            console.error("Registration error:", error.message);
            
            // User-friendly error messages
            let errorMessage = "Registration failed. ";
            switch(error.code) {
                case 'auth/email-already-in-use':
                    errorMessage += "This email is already registered.";
                    break;
                case 'auth/invalid-email':
                    errorMessage += "Invalid email address.";
                    break;
                case 'auth/weak-password':
                    errorMessage += "Password is too weak. Use at least 6 characters.";
                    break;
                default:
                    errorMessage += error.message;
            }
            alert(errorMessage);
        });
}

// Login a user with enhanced security
function loginUser(email, password) {
    // Input validation
    if (!email || !password) {
        alert("Email and password are required!");
        return;
    }

    auth.signInWithEmailAndPassword(email, password)
        .then((userCredential) => {
            const user = userCredential.user;
            console.log("User logged in:", user.uid);

            // Update last login timestamp
            return db.collection("users").doc(user.uid).update({
                lastLogin: firebase.firestore.FieldValue.serverTimestamp()
            }).then(() => {
                // Get user role and store in sessionStorage
                return db.collection("users").doc(user.uid).get();
            });
        })
        .then((doc) => {
            if (doc.exists) {
                const userData = doc.data();
                
                // Check if account is active
                if (userData.active === false) {
                    alert("Your account has been deactivated. Please contact admin.");
                    auth.signOut();
                    return;
                }

                // Store user info in sessionStorage for quick access
                sessionStorage.setItem('userRole', userData.role);
                sessionStorage.setItem('userEmail', userData.email);
                sessionStorage.setItem('userId', doc.id);
                
                console.log("User role:", userData.role);
                
                // Redirect to appropriate page based on role
                if (userData.role === 'admin') {
                    window.location.href = "index.html"; // Admin dashboard
                } else {
                    window.location.href = "index.html"; // Regular dashboard
                }
            }
        })
        .catch((error) => {
            console.error("Login error:", error.message);
            
            // User-friendly error messages
            let errorMessage = "Login failed. ";
            switch(error.code) {
                case 'auth/user-not-found':
                    errorMessage += "No account found with this email.";
                    break;
                case 'auth/wrong-password':
                    errorMessage += "Incorrect password.";
                    break;
                case 'auth/invalid-email':
                    errorMessage += "Invalid email address.";
                    break;
                case 'auth/user-disabled':
                    errorMessage += "This account has been disabled.";
                    break;
                case 'auth/too-many-requests':
                    errorMessage += "Too many failed attempts. Please try again later.";
                    break;
                default:
                    errorMessage += error.message;
            }
            alert(errorMessage);
        });
}

// Logout a user with cleanup
function logoutUser() {
    auth.signOut()
        .then(() => {
            console.log("User logged out");
            // Clear all session data
            sessionStorage.clear();
            localStorage.clear();
            window.location.href = "login.html";
        })
        .catch((error) => {
            console.error("Logout error:", error.message);
            alert("Error logging out. Please try again.");
        });
}

// Protect pages (check if user is logged in and has required role)

function protectPage(requiredRole = null) {
    auth.onAuthStateChanged((user) => {
        if (user) {
            console.log("✅ User logged in:", user.uid);

            // Fetch user data from Firestore
            db.collection("users").doc(user.uid).get()
                .then(doc => {
                    if (doc.exists) {
                        const userData = doc.data();
                        const role = userData.role;
                        
                        // Check if account is active
                        if (userData.active === false) {
                            alert("Your account has been deactivated.");
                            auth.signOut();
                            window.location.href = "login.html";
                            return;
                        }

                        console.log("👤 User role:", role);
                        
                        // Store role in sessionStorage
                        sessionStorage.setItem('userRole', role);
                        sessionStorage.setItem('userEmail', userData.email);
                        sessionStorage.setItem('userId', user.uid);

                        // Check if user has required role
                        if (requiredRole) {
                            const allowedRoles = Array.isArray(requiredRole) ? requiredRole : [requiredRole];
                            
                            if (!allowedRoles.includes(role)) {
                                alert("Access denied! You don't have permission to view this page.");
                                window.location.href = "index.html";
                                return;
                            }
                        }

                        // ✅ CRITICAL FIX: Load data after authentication
                        console.log("🔄 Authentication successful, loading app data...");
                        
                        // Multiple attempts to load data
                        let attempts = 0;
                        const maxAttempts = 5;
                        
                        function attemptLoadData() {
                            attempts++;
                            console.log(`📊 Load attempt ${attempts}/${maxAttempts}...`);
                            
                            if (typeof loadAllData === 'function') {
                                console.log('✅ loadAllData found!');
                                loadAllData()
                                    .then(() => {
                                        console.log("✅ All data loaded successfully!");
                                        
                                        // Make sure dashboard shows data
                                        if (typeof updateDashboard === 'function') {
                                            updateDashboard();
                                        }
                                    })
                                    .catch(error => {
                                        console.error("❌ Error loading data:", error);
                                        alert("Error loading data. Please refresh the page.");
                                    });
                            } else {
                                console.warn(`⚠️ loadAllData not found (attempt ${attempts})`);
                                
                                if (attempts < maxAttempts) {
                                    console.log('⏳ Retrying in 500ms...');
                                    setTimeout(attemptLoadData, 500);
                                } else {
                                    console.error('❌ loadAllData function not found after multiple attempts');
                                    alert('Error: Data loading function not available. Please refresh the page.');
                                }
                            }
                        }
                        
                        // Start loading attempts
                        attemptLoadData();
                        
                    } else {
                        console.error("User document not found");
                        alert("User data not found. Please contact admin.");
                        auth.signOut();
                        window.location.href = "login.html";
                    }
                })
                .catch(err => {
                    console.error("Error fetching user data:", err);
                    alert("Error loading user data.");
                    window.location.href = "login.html";
                });
        } else {
            console.log("❌ No user logged in");
            window.location.href = "login.html";
        }
    });
}

function forceLoadData() {
    console.log('🔄 Force loading all data...');
    
    // Check if loadAllData exists
    if (typeof loadAllData === 'function') {
        console.log('✅ loadAllData found, calling it now...');
        loadAllData()
            .then(() => {
                console.log('✅ Data loaded successfully');
            })
            .catch(error => {
                console.error('❌ Error loading data:', error);
            });
    } else {
        console.error('❌ loadAllData function not found!');
        console.log('⚠️ Retrying in 1 second...');
        
        // Retry after 1 second
        setTimeout(() => {
            if (typeof loadAllData === 'function') {
                console.log('✅ loadAllData found on retry, calling now...');
                loadAllData();
            } else {
                console.error('❌ loadAllData still not found after retry');
                alert('Error: Data loading function not found. Please refresh the page.');
            }
        }, 1000);
    }
}


// Check if user has specific role (useful for hiding/showing UI elements)
function hasRole(requiredRole) {
    const userRole = sessionStorage.getItem('userRole');
    
    if (!userRole) return false;
    
    if (Array.isArray(requiredRole)) {
        return requiredRole.includes(userRole);
    }
    
    if (requiredRole === 'admin') {
        return userRole === 'admin';
    } else if (requiredRole === 'editor') {
        return userRole === 'admin' || userRole === 'editor';
    }
    
    return true; // Regular user
}

// Get current user role
function getCurrentUserRole() {
    return sessionStorage.getItem('userRole') || null;
}

// Get current user email
function getCurrentUserEmail() {
    return sessionStorage.getItem('userEmail') || null;
}

// Get current user ID
function getCurrentUserId() {
    return sessionStorage.getItem('userId') || auth.currentUser?.uid || null;
}

// Check if user is admin (for showing/hiding admin features)
function isAdmin() {
    return getCurrentUserRole() === 'admin';
}

// Password reset function
function resetPassword(email) {
    if (!email) {
        alert("Please enter your email address!");
        return;
    }

    auth.sendPasswordResetEmail(email)
        .then(() => {
            alert("Password reset email sent! Check your inbox.");
        })
        .catch((error) => {
            console.error("Password reset error:", error.message);
            let errorMessage = "Failed to send reset email. ";
            
            switch(error.code) {
                case 'auth/user-not-found':
                    errorMessage += "No account found with this email.";
                    break;
                case 'auth/invalid-email':
                    errorMessage += "Invalid email address.";
                    break;
                default:
                    errorMessage += error.message;
            }
            alert(errorMessage);
        });
}

// Update user profile
function updateUserProfile(displayName, photoURL) {
    const user = auth.currentUser;
    
    if (!user) {
        alert("No user logged in!");
        return;
    }

    user.updateProfile({
        displayName: displayName,
        photoURL: photoURL
    })
    .then(() => {
        console.log("Profile updated successfully");
        alert("Profile updated!");
    })
    .catch((error) => {
        console.error("Profile update error:", error.message);
        alert("Error updating profile: " + error.message);
    });
}

// ====== AUTO-INITIALIZE ======
// Automatically protect pages that aren't login or register
document.addEventListener('DOMContentLoaded', function() {
    const currentPage = window.location.pathname.split('/').pop();
    
    // Pages that don't need authentication
    const publicPages = ['login.html', 'register.html', ''];
    
    if (!publicPages.includes(currentPage)) {
        console.log("🔐 Protecting page:", currentPage);
        // This page needs authentication
        protectPage();
    } else {
        console.log("🌐 Public page, no authentication required");
    }
});