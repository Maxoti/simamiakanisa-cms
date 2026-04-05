// ====== AUTHENTICATION — SimamiaKanisa (Multitenant) ======
// Depends on: firebase-config.js  (TENANT_ID, membersCollection, tenantRef)


// ─── Internal helpers ──────────────────────────────────────────────────────────

async function _getTokenClaims(user) {
  const result = await user.getIdTokenResult(/* forceRefresh = */ false);
  return result.claims;
}

/** Force-refresh the JWT so freshly-set custom claims are available immediately */
async function _refreshToken(user) {
  await user.getIdToken(/* forceRefresh = */ true);
  return user.getIdTokenResult();
}

function _friendlyAuthError(code, fallback) {
  const map = {
    'auth/email-already-in-use': "This email is already registered.",
    'auth/invalid-email':        "Invalid email address.",
    'auth/weak-password':        "Password is too weak — use at least 6 characters.",
    'auth/user-not-found':       "No account found with this email.",
    'auth/wrong-password':       "Incorrect password.",
    'auth/user-disabled':        "This account has been disabled.",
    'auth/too-many-requests':    "Too many failed attempts. Please try again later.",
  };
  return map[code] ?? fallback;
}

// ─── Register ──────────────────────────────────────────────────────────────────

async function registerUser(email, password, role = "member", displayName = "") {
  // --- Validation ---
  if (!email || !password) { alert("Email and password are required!"); return; }
  if (password.length < 6)  { alert("Password must be at least 6 characters!"); return; }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { alert("Please enter a valid email address!"); return; }

  try {
    // 1. Create the Firebase Auth account
    const { user } = await auth.createUserWithEmailAndPassword(email, password);
    console.log(" Auth account created:", user.uid);

    // 2. Stamp the tenant + role as a custom claim via Cloud Function
    const setTenantClaim = functions.httpsCallable("setTenantClaim");
    await setTenantClaim({ tenantId: TENANT_ID, role });
    console.log(` Custom claim set — tenant: ${TENANT_ID}, role: ${role}`);

    // 3. Force-refresh token so the claim is live immediately
    await _refreshToken(user);

    // 4. Write the member document under tenants/{tenantId}/members/{uid}
    await membersCollection().doc(user.uid).set({
      displayName,
      email,
      role,
      tenantId: TENANT_ID,       // denormalized for queries
      createdAt:  firebase.firestore.FieldValue.serverTimestamp(),
      lastLogin:  firebase.firestore.FieldValue.serverTimestamp(),
      active: true
    });
    console.log(" Member document saved under tenant:", TENANT_ID);

    alert("Registration successful! Please log in.");
    window.location.href = `login.html?tenant=${TENANT_ID}`;

  } catch (error) {
    console.error("Registration error:", error);
    alert("Registration failed. " + _friendlyAuthError(error.code, error.message));
  }
}

// ─── Login ─────────────────────────────────────────────────────────────────────

async function loginUser(email, password) {
    if (!email || !password) { alert("Email and password are required!"); return; }

    try {
        const { user } = await auth.signInWithEmailAndPassword(email, password);
        console.log(" Signed in:", user.uid);

        // 1. Check if JWT has a tenantId claim
        let claims = await _getTokenClaims(user);

        // 2. If claim exists but doesn't match current tenant — wrong church
        if (claims.tenantId && claims.tenantId !== TENANT_ID) {
            alert(`This account belongs to a different church. Redirecting...`);
            await auth.signOut();
            window.location.href = `login.html?tenant=${claims.tenantId}`;
            return;
        }

        // 3. Read member doc — works even without claim (rules allow own UID)
        let memberDoc;
        try {
            memberDoc = await membersCollection().doc(user.uid).get();
        } catch (rulesError) {
            // Rules still blocked it — token may be stale, force refresh and retry
            console.warn("⚠ Rules blocked read, refreshing token and retrying...");
            await _refreshToken(user);
            memberDoc = await membersCollection().doc(user.uid).get();
        }

        if (!memberDoc.exists) {
            alert("Member record not found. Contact your church admin.");
            await auth.signOut();
            return;
        }

        const data = memberDoc.data();

        if (data.active === false) {
            alert("Your account has been deactivated. Contact your church admin.");
            await auth.signOut();
            return;
        }

        // 4. Update last login
        await membersCollection().doc(user.uid).update({
            lastLogin: firebase.firestore.FieldValue.serverTimestamp()
        });

        // 5. If no claim yet, set it now (first login after registration)
        if (!claims.tenantId) {
            console.log("⚠ No tenant claim found — setting now...");
            try {
                const setTenantClaim = firebase.functions().httpsCallable('setTenantClaim');
                await setTenantClaim({ tenantId: TENANT_ID, role: data.role });
                await _refreshToken(user);
                console.log(" Claim set on first login");
            } catch (claimErr) {
                // Function not deployed — continue anyway, rules fallback handles it
                console.warn("⚠ Could not set claim:", claimErr.message);
            }
        }

        // 6. Cache session
        _setSession({ uid: user.uid, email: data.email, role: data.role, tenantId: TENANT_ID });

        console.log(` Login OK — tenant: ${TENANT_ID}, role: ${data.role}`);
        window.location.href = `index.html?tenant=${TENANT_ID}`;

    } catch (error) {
        console.error("Login error:", error);
        throw error; // let login.html handle the UI error display
    }
}

// ─── Logout ────────────────────────────────────────────────────────────────────

async function logoutUser() {
  try {
    await auth.signOut();
    _clearSession();
    console.log(" Logged out");
    window.location.href = `login.html?tenant=${TENANT_ID}`;
  } catch (error) {
    console.error("Logout error:", error.message);
    alert("Error logging out. Please try again.");
  }
}

// ─── Page protection ───────────────────────────────────────────────────────────

function protectPage(requiredRole = null) {
  auth.onAuthStateChanged(async (user) => {
    if (!user) {
      console.log("❌ No user — redirecting to login");
      window.location.href = `login.html?tenant=${TENANT_ID}`;
      return;
    }

    try {
      // 1. Verify tenant claim
      const claims = await _getTokenClaims(user);
      if (claims.tenantId && claims.tenantId !== TENANT_ID) {
        console.warn(`Tenant mismatch: claim=${claims.tenantId} page=${TENANT_ID}`);
        await auth.signOut();
        window.location.href = `login.html?tenant=${claims.tenantId}`;
        return;
      }

      // 2. Load the member document from this tenant
      const doc = await membersCollection().doc(user.uid).get();
      if (!doc.exists) {
        alert("Member record not found. Contact your church admin.");
        await auth.signOut();
        window.location.href = `login.html?tenant=${TENANT_ID}`;
        return;
      }

      const data = doc.data();

      // 3. Check active flag
      if (data.active === false) {
        alert("Your account has been deactivated.");
        await auth.signOut();
        window.location.href = `login.html?tenant=${TENANT_ID}`;
        return;
      }

      // 4. Role check
      if (requiredRole) {
        const allowed = Array.isArray(requiredRole) ? requiredRole : [requiredRole];
        if (!allowed.includes(data.role)) {
          alert("Access denied! You don't have permission to view this page.");
          window.location.href = "index.html";
          return;
        }
      }

      // 5. Hydrate session
      _setSession({ uid: user.uid, email: data.email, role: data.role, tenantId: TENANT_ID });
      console.log(` Page protected — tenant: ${TENANT_ID}, role: ${data.role}`);

      // 6. Signal the rest of the app that auth is ready
      _dispatchAuthReady(user, data);

    } catch (err) {
      console.error("protectPage error:", err);
      window.location.href = `login.html?tenant=${TENANT_ID}`;
    }
  });
}

// ─── Auth-ready event (replaces brittle retry loop) ───────────────────────────
// main.js / pledges.js listen for this instead of polling for loadAllData()
//
//   document.addEventListener('authReady', (e) => {
//     const { user, member } = e.detail;
//     loadAllData();
//   });

function _dispatchAuthReady(user, memberData) {
  const event = new CustomEvent("authReady", {
    detail: { user, member: memberData }
  });
  document.dispatchEvent(event);
  console.log(" authReady dispatched");
}

// ─── Session helpers ───────────────────────────────────────────────────────────

function _setSession({ uid, email, role, tenantId }) {
  sessionStorage.setItem("userId",   uid);
  sessionStorage.setItem("userEmail", email);
  sessionStorage.setItem("userRole",  role);
  sessionStorage.setItem("tenantId",  tenantId);
}

function _clearSession() {
  sessionStorage.clear();
  // Keep tenant so the login page knows where to send them
  localStorage.removeItem("simamia_tenant");
}

// ─── Public role/identity helpers ─────────────────────────────────────────────

function hasRole(requiredRole) {
  const role = sessionStorage.getItem("userRole");
  if (!role) return false;
  if (Array.isArray(requiredRole)) return requiredRole.includes(role);
  if (requiredRole === "admin")  return role === "admin";
  if (requiredRole === "editor") return role === "admin" || role === "editor";
  return true;
}

const getCurrentUserRole  = () => sessionStorage.getItem("userRole")  ?? null;
const getCurrentUserEmail = () => sessionStorage.getItem("userEmail") ?? null;
const getCurrentUserId    = () => sessionStorage.getItem("userId")    ?? auth.currentUser?.uid ?? null;
const getCurrentTenantId  = () => sessionStorage.getItem("tenantId")  ?? TENANT_ID;
const isAdmin             = () => getCurrentUserRole() === "admin";

// ─── Password reset ────────────────────────────────────────────────────────────

async function resetPassword(email) {
  if (!email) { alert("Please enter your email address!"); return; }
  try {
    await auth.sendPasswordResetEmail(email);
    alert("Password reset email sent! Check your inbox.");
  } catch (error) {
    alert("Failed to send reset email. " + _friendlyAuthError(error.code, error.message));
  }
}

// ─── Auto-initialize ───────────────────────────────────────────────────────────

document.addEventListener("DOMContentLoaded", () => {
  const page        = window.location.pathname.split("/").pop();
  const publicPages = ["login.html", "register.html", ""];

  if (!publicPages.includes(page)) {
    console.log(` Protecting page: ${page} (tenant: ${TENANT_ID})`);
    protectPage();
  } else {
    console.log(` Public page: ${page}`);
  }
});