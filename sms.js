// ====== SMS SERVICE — SimamiaKanisa ======
// Depends on: firebase-config.js (membersCollection, db, TENANT_ID)
// Connects to: simamiakanisa-api (localhost:5000 locally, Railway in production)

// ─── Config ────────────────────────────────────────────────────────────────────

const SMS_API_URL      = "http://localhost:5000";       // Change to Railway URL in production
const INTERNAL_SECRET  = "simamiakanisa_secret_2026";   // Must match server .env INTERNAL_SECRET

// ─── Core SMS sender ───────────────────────────────────────────────────────────

async function _sendSMS(recipients, message) {
  if (!recipients || recipients.length === 0) {
    console.warn("⚠ No recipients provided");
    return { success: false, error: "No recipients" };
  }

  try {
    const response = await fetch(`${SMS_API_URL}/send-sms`, {
      method:  "POST",
      headers: {
        "Content-Type":  "application/json",
        "Authorization": `Bearer ${INTERNAL_SECRET}`
      },
      body: JSON.stringify({ recipients, message })
    });

    const data = await response.json();

    if (data.success) {
      console.log(` SMS sent to ${recipients.length} recipient(s)`);
    } else {
      console.error(" SMS failed:", data.error);
    }

    return data;

  } catch (err) {
    console.error("❌ SMS service unreachable:", err.message);
    return { success: false, error: "SMS service unreachable" };
  }
}

// ─── Format phone number to Kenya format ───────────────────────────────────────

function _formatPhone(phone) {
  if (!phone) return null;
  const cleaned = phone.toString().replace(/\s+/g, "").replace(/-/g, "");
  if (cleaned.startsWith("254"))  return cleaned;           // 254722001001
  if (cleaned.startsWith("+254")) return cleaned.slice(1);  // +254722... → 254722...
  if (cleaned.startsWith("0"))    return "254" + cleaned.slice(1); // 0722... → 254722...
  return cleaned;
}

// ─── Format date nicely ────────────────────────────────────────────────────────

function _formatDate(dateString) {
  return new Date(dateString).toLocaleDateString("en-KE", {
    weekday: "long",
    day:     "numeric",
    month:   "long",
    year:    "numeric"
  });
}

// ─── Get all member phone numbers for current tenant ───────────────────────────

async function _getMemberPhones() {
  try {
    const snap = await membersCollection().get();
    const phones = [];

    snap.forEach(doc => {
      const member = doc.data();
      if (member.phone && member.active !== false) {
        const formatted = _formatPhone(member.phone);
        if (formatted) phones.push(formatted);
      }
    });

    console.log(`✅ Found ${phones.length} member phone numbers`);
    return phones;

  } catch (err) {
    console.error("❌ Could not fetch member phones:", err.message);
    return [];
  }
}

// ─── Get church name for current tenant ────────────────────────────────────────

async function _getChurchName() {
  try {
    const tenantDoc = await db.collection("tenants").doc(TENANT_ID).get();
    return tenantDoc.exists ? tenantDoc.data().name || "SimamiaKanisa" : "SimamiaKanisa";
  } catch {
    return "SimamiaKanisa";
  }
}

// ══ PUBLIC FUNCTIONS ══════════════════════════════════════════════════════════

// ─── 1. Event reminder — send to ALL members ───────────────────────────────────

async function sendEventReminder(event) {
  const [phones, churchName] = await Promise.all([
    _getMemberPhones(),
    _getChurchName()
  ]);

  if (phones.length === 0) {
    alert("⚠ No members with phone numbers found.\nPlease add phone numbers to member profiles first.");
    return;
  }

  const message =
    `Dear member, reminder: ${event.name} ` +
    `is on ${_formatDate(event.date)} ` +
    `at ${event.time}. ` +
    `We look forward to seeing you. ` +
    `— ${churchName}`;

  const confirm = window.confirm(
    `Send SMS reminder to ${phones.length} members?\n\n` +
    `Event: ${event.name}\n` +
    `Date: ${_formatDate(event.date)}\n` +
    `Time: ${event.time}`
  );

  if (!confirm) return;

  const result = await _sendSMS(phones, message);

  if (result.success) {
    alert(`✅ SMS reminder sent to ${phones.length} members!`);
  } else {
    alert(`⚠ SMS failed: ${result.error}`);
  }
}

// ─── 2. Contribution confirmation — send to ONE member ─────────────────────────

async function sendContributionConfirmation(member, amount, type) {
  if (!member.phone) {
    console.log("ℹ Member has no phone number — skipping SMS");
    return;
  }

  const churchName = await _getChurchName();
  const phone      = _formatPhone(member.phone);

  const message =
    `Dear ${member.displayName || member.name}, ` +
    `your ${type} of KES ${Number(amount).toLocaleString()} ` +
    `has been received. ` +
    `Thank you and God bless you. ` +
    `— ${churchName}`;

  await _sendSMS([phone], message);
}

// ─── 3. Pledge payment confirmation — send to ONE member ───────────────────────

async function sendPledgeConfirmation(member, amountPaid, balance) {
  if (!member.phone) return;

  const churchName = await _getChurchName();
  const phone      = _formatPhone(member.phone);

  const isComplete = balance <= 0;

  const message = isComplete
    ? `Dear ${member.displayName || member.name}, ` +
      `your pledge is now FULLY PAID. ` +
      `Thank you for your faithfulness. ` +
      `God bless you! ` +
      `— ${churchName}`
    : `Dear ${member.displayName || member.name}, ` +
      `your pledge payment of KES ${Number(amountPaid).toLocaleString()} ` +
      `has been received. ` +
      `Balance remaining: KES ${Number(balance).toLocaleString()}. ` +
      `— ${churchName}`;

  await _sendSMS([phone], message);
}

// ─── 4. General broadcast — send custom message to ALL members ─────────────────

async function sendBroadcast(customMessage) {
  const [phones, churchName] = await Promise.all([
    _getMemberPhones(),
    _getChurchName()
  ]);

  if (phones.length === 0) {
    alert("⚠ No members with phone numbers found.");
    return;
  }

  const fullMessage = `${customMessage} — ${churchName}`;

  const confirm = window.confirm(
    `Send broadcast SMS to ${phones.length} members?\n\n` +
    `Message: ${fullMessage}`
  );

  if (!confirm) return;

  const result = await _sendSMS(phones, fullMessage);

  if (result.success) {
    alert(`✅ Broadcast sent to ${phones.length} members!`);
  } else {
    alert(`⚠ Broadcast failed: ${result.error}`);
  }
}



// ─── 6. Test SMS — send to one number to confirm service is working ────────────

async function testSMS(phoneNumber) {
  const phone = _formatPhone(phoneNumber);

  const result = await _sendSMS(
    [phone],
    "SimamiaKanisa SMS service is working correctly. Test message only."
  );

  if (result.success) {
    alert(` Test SMS sent to ${phoneNumber} successfully!`);
  } else {
    alert(` Test SMS failed: ${result.error}\n\nMake sure the API server is running on localhost:5000`);
  }

  return result;
}

console.log(" SimamiaKanisa SMS service loaded");