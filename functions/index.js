const { onCall, HttpsError } = require("firebase-functions/v2/https");
const admin                  = require("firebase-admin");

admin.initializeApp();

exports.setTenantClaim = onCall(async (request) => {
    const uid = request.auth?.uid;
    if (!uid) throw new HttpsError("unauthenticated", "Must be signed in.");

    const { tenantId, role = "member" } = request.data;
    if (!tenantId) throw new HttpsError("invalid-argument", "tenantId is required.");

    const VALID_ROLES = ["member", "editor", "admin"];
    if (!VALID_ROLES.includes(role)) {
        throw new HttpsError("invalid-argument", `Invalid role: ${role}`);
    }

    const tenantDoc = await admin.firestore()
        .collection("tenants").doc(tenantId).get();
    if (!tenantDoc.exists) {
        throw new HttpsError("not-found", `Tenant '${tenantId}' does not exist.`);
    }

    const existingClaims = (await admin.auth().getUser(uid)).customClaims || {};
    if (role === "admin" && existingClaims.role !== "admin") {
        const tenantData = tenantDoc.data();
        if (tenantData.ownerUid !== uid) {
            throw new HttpsError("permission-denied", "Cannot self-assign admin role.");
        }
    }

    await admin.auth().setCustomUserClaims(uid, { tenantId, role });
    console.log(` Claims set — uid:${uid} tenantId:${tenantId} role:${role}`);
    return { success: true, tenantId, role };
});

exports.promoteUser = onCall(async (request) => {
    const callerClaims = request.auth?.token;
    if (!callerClaims || callerClaims.role !== "admin") {
        throw new HttpsError("permission-denied", "Only admins can promote users.");
    }

    const { targetUid, tenantId, role } = request.data;
    if (!targetUid || !tenantId || !role) {
        throw new HttpsError("invalid-argument", "targetUid, tenantId and role are required.");
    }

    if (callerClaims.tenantId !== tenantId) {
        throw new HttpsError("permission-denied", "Cannot manage users from a different tenant.");
    }

    const VALID_ROLES = ["member", "editor", "admin"];
    if (!VALID_ROLES.includes(role)) {
        throw new HttpsError("invalid-argument", `Invalid role: ${role}`);
    }

    await admin.auth().setCustomUserClaims(targetUid, { tenantId, role });
    await admin.firestore()
        .collection("tenants").doc(tenantId)
        .collection("members").doc(targetUid)
        .update({ role });

    console.log(` Promoted uid:${targetUid} to ${role} in tenant:${tenantId}`);
    return { success: true };
});