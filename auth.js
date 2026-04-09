// ====== AUTHENTICATION — SimamiaKanisa (Multitenant) ======
// Depends on: firebase-config.js  (TENANT_ID, membersCollection, db, auth)
// Depends on: EmailJS CDN script  (must be loaded in HTML before this file)

// ─── EmailJS Setup ─────────────────────────────────────────────────────────────

emailjs.init("tLY1iJ6bfFVb7b_TN");

async function _alertAdmin(displayName, email) {
  try {
    await emailjs.send("service_vkvy0ze", "template_woqwxpl", {
      user_name:  displayName || "Unknown",
      user_email: email,
      time:       new Date().toLocaleString(),
      to_email:   "maxoti96@gmail.com"
    });
    console.log("✅ Admin alert email sent");
  } catch (err) {
    console.warn("⚠ Email alert failed:", err);
  }
}

// ─── Internal helpers ──────────────────────────────────────────────────────────

async function _getTokenClaims(user) {
  const result = await user.getIdTokenResult(false);
  return result.claims;
}

async function _refreshToken(user) {
  await user.getIdToken(true);
  return user.getIdTokenResult();
}

function _friendlyAuthError(code, fallback) {
  const map = {
    'auth/email-already-in-use': "This email is already registered.",
    'auth/invalid-email':        "Invalid email address.",
    'auth/weak-password':        "Password is too weak — use at least 6 characters.",
    'auth/user-not-found':       "No account found with this email.",
    'auth/wrong-password':       "Incorrect password.",
    'auth/invalid-credential':   "Email or password is incorrect.",
    'auth/user-disabled':        "This account has been disabled.",
    'auth/too-many-requests':    "Too many failed attempts. Please try again later.",
  };
  return map[code] ?? fallback;
}

// ─── Tenant discovery ──────────────────────────────────────────────────────────
// When TENANT_ID is "default" (no ?tenant= in URL), search all tenants for the
// user's member document and redirect them to their correct church automatically.

async function _findTenantForUser(uid) {
  try {
    const tenantsSnap = await db.collection('tenants').get();
    for (const tenantDoc of tenantsSnap.docs) {
      const memberDoc = await db.collection('tenants').doc(tenantDoc.id)
                                .collection('members').doc(uid).get();
      if (memberDoc.exists) {
        console.log('✅ Found member in tenant:', tenantDoc.id);
        return { tenantId: tenantDoc.id, data: memberDoc.data() };
      }
    }
  } catch (err) {
    console.warn('⚠ Tenant search failed:', err.message);
  }
  return null;
}

// ─── Register ──────────────────────────────────────────────────────────────────

async function registerUser(email, password, role = "member", displayName = "") {
  if (!email || !password)                          { alert("Email and password are required!"); return; }
  if (password.length < 6)                          { alert("Password must be at least 6 characters!"); return; }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))   { alert("Please enter a valid email address!"); return; }

  try {
    const { user } = await auth.createUserWithEmailAndPassword(email, password);
    console.log("✅ Auth account created:", user.uid);

    // Set custom claim via Cloud Function (may not be deployed yet — non-fatal)
    try {
      const setTenantClaim = firebase.functions().httpsCallable("setTenantClaim");
      await setTenantClaim({ tenantId: TENANT_ID, role });
      await _refreshToken(user);
      console.log(`✅ Claim set — tenant: ${TENANT_ID}, role: ${role}`);
    } catch (claimErr) {
      console.warn("⚠ Could not set claim:", claimErr.message);
    }

    // Write member document — active: false locks them until admin approves
    await membersCollection().doc(user.uid).set({
      displayName,
      email,
      role,
      tenantId:  TENANT_ID,
      active:    false,                                           // 🔒 Locked by default
      status:    "pending",                                       // Pending admin approval
      joined:    new Date().toISOString().split('T')[0],
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      lastLogin: firebase.firestore.FieldValue.serverTimestamp()
    });
    console.log("✅ Member document saved under tenant:", TENANT_ID);

    // Alert admin about new registration
    await _alertAdmin(displayName, email);
    console.log("✅ Admin notified of new registration");

    // Sign out immediately — they must wait for admin approval
    await auth.signOut();

    alert("Registration received! Your account is pending admin approval. You will be notified once approved.");
    window.location.href = `login.html?tenant=${TENANT_ID}`;

  } catch (error) {
    console.error("Registration error:", error);
    alert("Registration failed. " + _friendlyAuthError(error.code, error.message));
  }
} // ← end of registerUser

// ─── Login ─────────────────────────────────────────────────────────────────────

async function loginUser(email, password) {
  if (!email || !password) { alert("Email and password are required!"); return; }

  try {
    const { user } = await auth.signInWithEmailAndPassword(email, password);
    console.log("✅ Signed in:", user.uid);

    // 1. Check JWT claim
    let claims = await _getTokenClaims(user);

    // 2. Claim exists and points to a different tenant — redirect there
    if (claims.tenantId && claims.tenantId !== TENANT_ID && TENANT_ID !== 'default') {
      console.warn(`Tenant mismatch — claim: ${claims.tenantId}, page: ${TENANT_ID}`);
      await auth.signOut();
      window.location.href = `login.html?tenant=${claims.tenantId}`;
      return;
    }

    // 3. Try to read member doc from current tenant
    let memberDoc;
    let resolvedTenantId = TENANT_ID;

    try {
      memberDoc = await membersCollection().doc(user.uid).get();
    } catch {
      // Rules blocked it — force refresh and retry once
      console.warn("⚠ Rules blocked read, refreshing token...");
      await _refreshToken(user);
      try {
        memberDoc = await membersCollection().doc(user.uid).get();
      } catch {
        memberDoc = { exists: false };
      }
    }

    // 4. Not found in current tenant — search all tenants (handles no-?tenant= case)
    if (!memberDoc || !memberDoc.exists) {
      console.warn(`⚠ Member not found in tenant "${TENANT_ID}" — searching all tenants...`);
      const found = await _findTenantForUser(user.uid);

      if (found) {
        resolvedTenantId = found.tenantId;
        memberDoc        = { exists: true, data: () => found.data };
        localStorage.setItem('simamia_tenant', resolvedTenantId);
        console.log(`✅ Auto-resolved tenant: ${resolvedTenantId}`);
      } else {
        alert("Member record not found. Contact your church admin.");
        await auth.signOut();
        return;
      }
    }

    const data = memberDoc.data();

    // 5. 🔒 Check active flag — blocks pending and deactivated users
    if (data.active === false) {
      const msg = data.status === "pending"
        ? "Your account is still pending admin approval. Please wait."
        : "Your account has been deactivated. Contact your church admin.";
      alert(msg);
      await auth.signOut();
      return;
    }

    // 6. Update last login timestamp
    try {
      await db.collection('tenants').doc(resolvedTenantId)
              .collection('members').doc(user.uid).update({
        lastLogin: firebase.firestore.FieldValue.serverTimestamp()
      });
    } catch (e) {
      console.warn("⚠ Could not update lastLogin:", e.message);
    }

    // 7. Set claim if missing (self-heal on first login)
    if (!claims.tenantId) {
      console.log("⚠ No tenant claim — setting now...");
      try {
        const setTenantClaim = firebase.functions().httpsCallable('setTenantClaim');
        await setTenantClaim({ tenantId: resolvedTenantId, role: data.role });
        await _refreshToken(user);
        console.log("✅ Claim set on first login");
      } catch (claimErr) {
        console.warn("⚠ Could not set claim:", claimErr.message);
      }
    }

    // 8. Cache session and redirect to correct church
    _setSession({ uid: user.uid, email: data.email, role: data.role, tenantId: resolvedTenantId });
    console.log(`✅ Login OK — tenant: ${resolvedTenantId}, role: ${data.role}`);
    window.location.href = `index.html?tenant=${resolvedTenantId}`;

  } catch (error) {
    console.error("Login error:", error);
    throw error;
  }
} // ← end of loginUser

// ─── Logout ────────────────────────────────────────────────────────────────────

async function logoutUser() {
  try {
    const tenantId = getCurrentTenantId() || TENANT_ID;
    await auth.signOut();
    _clearSession();
    console.log("✅ Logged out");
    window.location.href = `login.html?tenant=${tenantId}`;
  } catch (error) {
    console.error("Logout error:", error.message);
    alert("Error logging out. Please try again.");
  }
} // ← end of logoutUser

// ─── Page protection ───────────────────────────────────────────────────────────

function protectPage(requiredRole = null) {
  auth.onAuthStateChanged(async (user) => {
    if (!user) {
      console.log("❌ No user — redirecting to login");
      window.location.href = `login.html?tenant=${TENANT_ID}`;
      return;
    }

    try {
      // 1. Check JWT claim
      const claims = await _getTokenClaims(user);
      if (claims.tenantId && claims.tenantId !== TENANT_ID && TENANT_ID !== 'default') {
        console.warn(`Tenant mismatch — claim: ${claims.tenantId}, page: ${TENANT_ID}`);
        await auth.signOut();
        window.location.href = `login.html?tenant=${claims.tenantId}`;
        return;
      }

      // 2. Load member document
      let doc;
      let resolvedTenantId = TENANT_ID;

      try {
        doc = await membersCollection().doc(user.uid).get();
      } catch {
        doc = { exists: false };
      }

      // 3. Not found — search all tenants
      if (!doc.exists) {
        const found = await _findTenantForUser(user.uid);
        if (found) {
          resolvedTenantId = found.tenantId;
          doc = { exists: true, data: () => found.data };
          localStorage.setItem('simamia_tenant', resolvedTenantId);
          if (TENANT_ID !== resolvedTenantId) {
            window.location.href = `index.html?tenant=${resolvedTenantId}`;
            return;
          }
        } else {
          alert("Member record not found. Contact your church admin.");
          await auth.signOut();
          window.location.href = `login.html?tenant=${TENANT_ID}`;
          return;
        }
      }

      const data = doc.data();

      // 4.  Active check — blocks pending/deactivated users from every protected page
      if (data.active === false) {
        const msg = data.status === "pending"
          ? "Your account is still pending admin approval."
          : "Your account has been deactivated. Contact your church admin.";
        alert(msg);
        await auth.signOut();
        window.location.href = `login.html?tenant=${TENANT_ID}`;
        return;
      }

      // 5. Role check
      if (requiredRole) {
        const allowed = Array.isArray(requiredRole) ? requiredRole : [requiredRole];
        if (!allowed.includes(data.role)) {
          alert("Access denied! You don't have permission to view this page.");
          window.location.href = "index.html";
          return;
        }
      }

      // 6. Hydrate session
      _setSession({ uid: user.uid, email: data.email, role: data.role, tenantId: resolvedTenantId });
      console.log(`✅ Page protected — tenant: ${resolvedTenantId}, role: ${data.role}`);

      // 7. Signal app that auth is ready
      _dispatchAuthReady(user, data);

    } catch (err) {
      console.error("protectPage error:", err);
      window.location.href = `login.html?tenant=${TENANT_ID}`;
    }
  });
} // ← end of protectPage

// ─── Auth-ready event ──────────────────────────────────────────────────────────

function _dispatchAuthReady(user, memberData) {
  document.dispatchEvent(new CustomEvent("authReady", {
    detail: { user, member: memberData }
  }));
  console.log("✅ authReady dispatched");
}

// ─── Session helpers ───────────────────────────────────────────────────────────

function _setSession({ uid, email, role, tenantId }) {
  sessionStorage.setItem("userId",    uid);
  sessionStorage.setItem("userEmail", email);
  sessionStorage.setItem("userRole",  role);
  sessionStorage.setItem("tenantId",  tenantId);
}

function _clearSession() {
  sessionStorage.clear();
  localStorage.removeItem("simamia_tenant");
}

// ─── Public helpers ────────────────────────────────────────────────────────────

function hasRole(requiredRole) {
  const role = sessionStorage.getItem("userRole");
  if (!role) return false;
  if (Array.isArray(requiredRole)) return requiredRole.includes(role);
  if (requiredRole === "admin")    return role === "admin";
  if (requiredRole === "editor")   return role === "admin" || role === "editor";
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
  const publicPages = ["login.html", "register.html", "register-church.html", ""];

  if (!publicPages.includes(page)) {
    console.log(`✅ Protecting page: ${page} (tenant: ${TENANT_ID})`);
    protectPage();
  } else {
    console.log(`✅ Public page: ${page}`);
  }
});