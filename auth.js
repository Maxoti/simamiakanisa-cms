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

// ─── ✅ Tenant active check helper ────────────────────────────────────────────

async function _checkTenantActive(tenantId) {
  const tenantDoc = await db.collection('tenants').doc(tenantId).get();
  if (!tenantDoc.exists || tenantDoc.data().active === false) {
    return false;
  }
  return true;
}

// ─── Tenant discovery ──────────────────────────────────────────────────────────

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

    try {
      const setTenantClaim = firebase.functions().httpsCallable("setTenantClaim");
      await setTenantClaim({ tenantId: TENANT_ID, role });
      await _refreshToken(user);
      console.log(`✅ Claim set — tenant: ${TENANT_ID}, role: ${role}`);
    } catch (claimErr) {
      console.warn("⚠ Could not set claim:", claimErr.message);
    }

    await membersCollection().doc(user.uid).set({
      displayName,
      email,
      role,
      tenantId:  TENANT_ID,
      active:    false,
      status:    "pending",
      joined:    new Date().toISOString().split('T')[0],
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      lastLogin: firebase.firestore.FieldValue.serverTimestamp()
    });
    console.log("✅ Member document saved under tenant:", TENANT_ID);

    await _alertAdmin(displayName, email);
    await auth.signOut();

    alert("Registration received! Your account is pending admin approval.");
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
    console.log("✅ Signed in:", user.uid);

    let claims = await _getTokenClaims(user);

    if (claims.tenantId && claims.tenantId !== TENANT_ID && TENANT_ID !== 'default') {
      console.warn(`Tenant mismatch — claim: ${claims.tenantId}, page: ${TENANT_ID}`);
      await auth.signOut();
      window.location.href = `login.html?tenant=${claims.tenantId}`;
      return;
    }

    let memberDoc;
    let resolvedTenantId = TENANT_ID;

    try {
      memberDoc = await membersCollection().doc(user.uid).get();
    } catch {
      console.warn("⚠ Rules blocked read, refreshing token...");
      await _refreshToken(user);
      try {
        memberDoc = await membersCollection().doc(user.uid).get();
      } catch {
        memberDoc = { exists: false };
      }
    }

    if (!memberDoc || !memberDoc.exists) {
      console.warn(`⚠ Member not found in tenant "${TENANT_ID}" — searching all tenants...`);
      const found = await _findTenantForUser(user.uid);
      if (found) {
        resolvedTenantId = found.tenantId;
        memberDoc        = { exists: true, data: () => found.data };
        localStorage.setItem('simamia_tenant', resolvedTenantId);
      } else {
        alert("Member record not found. Contact your church admin.");
        await auth.signOut();
        return;
      }
    }

    const data = memberDoc.data();

    // ✅ TENANT ACTIVE CHECK — blocks login if church is deactivated
    const tenantIsActive = await _checkTenantActive(resolvedTenantId);
    if (!tenantIsActive) {
      alert("Your church subscription is inactive. Contact SimamiaKanisa support.");
      await auth.signOut();
      return;
    }

    // Member active check
    if (data.active === false) {
      const msg = data.status === "pending"
        ? "Your account is still pending admin approval. Please wait."
        : "Your account has been deactivated. Contact your church admin.";
      alert(msg);
      await auth.signOut();
      return;
    }

    try {
      await db.collection('tenants').doc(resolvedTenantId)
              .collection('members').doc(user.uid).update({
        lastLogin: firebase.firestore.FieldValue.serverTimestamp()
      });
    } catch (e) {
      console.warn("⚠ Could not update lastLogin:", e.message);
    }

    if (!claims.tenantId) {
      try {
        const setTenantClaim = firebase.functions().httpsCallable('setTenantClaim');
        await setTenantClaim({ tenantId: resolvedTenantId, role: data.role });
        await _refreshToken(user);
      } catch (claimErr) {
        console.warn("⚠ Could not set claim:", claimErr.message);
      }
    }

    _setSession({ uid: user.uid, email: data.email, role: data.role, tenantId: resolvedTenantId });
    console.log(`✅ Login OK — tenant: ${resolvedTenantId}, role: ${data.role}`);

    // FIX: was index.html — root URL is now a router, dashboard lives at dashboard.html
    window.location.href = `dashboard.html?tenant=${resolvedTenantId}`;

  } catch (error) {
    console.error("Login error:", error);
    throw error;
  }
}

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
}

// ─── Page protection ───────────────────────────────────────────────────────────

function protectPage(requiredRole = null) {
  auth.onAuthStateChanged(async (user) => {
    if (!user) {
      window.location.href = `login.html?tenant=${TENANT_ID}`;
      return;
    }

    try {
      const claims = await _getTokenClaims(user);
      if (claims.tenantId && claims.tenantId !== TENANT_ID && TENANT_ID !== 'default') {
        await auth.signOut();
        window.location.href = `login.html?tenant=${claims.tenantId}`;
        return;
      }

      let doc;
      let resolvedTenantId = TENANT_ID;

      try {
        doc = await membersCollection().doc(user.uid).get();
      } catch {
        doc = { exists: false };
      }

      if (!doc.exists) {
        const found = await _findTenantForUser(user.uid);
        if (found) {
          resolvedTenantId = found.tenantId;
          doc = { exists: true, data: () => found.data };
          localStorage.setItem('simamia_tenant', resolvedTenantId);
          if (TENANT_ID !== resolvedTenantId) {
            // FIX: was index.html
            window.location.href = `dashboard.html?tenant=${resolvedTenantId}`;
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

      // ✅ TENANT ACTIVE CHECK — blocks page access if church is deactivated
      const tenantIsActive = await _checkTenantActive(resolvedTenantId);
      if (!tenantIsActive) {
        alert("Your church subscription is inactive. Contact SimamiaKanisa support.");
        await auth.signOut();
        window.location.href = `login.html?tenant=${resolvedTenantId}`;
        return;
      }

      // Member active check
      if (data.active === false) {
        const msg = data.status === "pending"
          ? "Your account is still pending admin approval."
          : "Your account has been deactivated. Contact your church admin.";
        alert(msg);
        await auth.signOut();
        window.location.href = `login.html?tenant=${TENANT_ID}`;
        return;
      }

      if (requiredRole) {
        const allowed = Array.isArray(requiredRole) ? requiredRole : [requiredRole];
        if (!allowed.includes(data.role)) {
          alert("Access denied! You don't have permission to view this page.");
          // FIX: was index.html
          window.location.href = "dashboard.html";
          return;
        }
      }

      _setSession({ uid: user.uid, email: data.email, role: data.role, tenantId: resolvedTenantId });
      console.log(`✅ Page protected — tenant: ${resolvedTenantId}, role: ${data.role}`);
      _dispatchAuthReady(user, data);

    } catch (err) {
      console.error("protectPage error:", err);
      window.location.href = `login.html?tenant=${TENANT_ID}`;
    }
  });
}

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
  const page = window.location.pathname.split("/").pop();

  // FIX: added "index.html" — new index.html is a pure auth router, not a protected page.
  // Root URL ("/") resolves to "" via .pop(), which was already here and is still needed.
  const publicPages = ["login.html", "register.html", "register-church.html", "index.html", ""];

  if (!publicPages.includes(page)) {
    console.log(`✅ Protecting page: ${page} (tenant: ${TENANT_ID})`);
    protectPage();
  } else {
    console.log(`✅ Public page: ${page}`);
  }
});