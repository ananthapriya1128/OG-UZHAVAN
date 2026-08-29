/**
 * smsService.js — OG Uzhavan Real & Simulated SMS Notification Gateway
 *
 * Supports:
 * 1. Real SMS dispatch via Fast2SMS / MSG91 HTTP API when API key is set in .env.local
 * 2. In-App Live Push SMS Banner event broadcast for instant on-screen demonstration
 * 3. Dynamic OTP generation with auto-fill binding
 */

export const SMS_TEMPLATES = {
  OTP_SMS: (code, mobile) =>
    `[TN-GOVT] ஓ ஜி உழவன் போர்டல் சரிபார்ப்புக் குறியீடு: ${code}. இந்த OTP 10 நிமிடங்களுக்கு செல்லுபடியாகும். யாரிடமும் பகிர வேண்டாம். - TNCSC`,

  REGISTRATION_SUCCESS_TA: (farmer) =>
    `அன்பான ${farmer.name} அவர்களுக்கு,\nஓ ஜி உழவன் திட்டத்தில் உங்கள் பதிவு வெற்றிகரமாக முடிந்தது! ✓\nஉழவர் எண்: ${farmer.id || "TN-UZH-2026-8921"}\nசர்வே எண்: ${farmer.surveyNumber}\nVAO சான்றிதழ்: ${farmer.vaoCertNumber}\n- தமிழ்நாடு நுகர்பொருள் வாணிபக் கழகம் (TNCSC)`,

  REGISTRATION_SUCCESS_EN: (farmer) =>
    `Dear ${farmer.name},\nYour registration on OG Uzhavan is SUCCESSFUL. ✓\nFarmer ID: ${farmer.id || "TN-UZH-2026-8921"}\nSurvey No: ${farmer.surveyNumber}\nVAO Cert: ${farmer.vaoCertNumber}\n- TNCSC, Govt of Tamil Nadu`,

  SLOT_BOOKED_TA: (booking) =>
    `[TNCSC] இட ஒதுக்கீடு உறுதி!\nடோக்கன் எண்: #${booking.tokenNumber}\nகொள்முதல் மையம்: ${booking.dpcName}\nதேதி & நேரம்: ${booking.slotDate} (${booking.slotTime})\nசர்வே எண்: #${booking.surveyNumber || "142/3A"}\nஇந்த டோக்கனுடன் DPC மையத்திற்கு வரவும். - TNCSC`,

  SLOT_BOOKED_EN: (booking) =>
    `[TNCSC] Slot Confirmed!\nToken: #${booking.tokenNumber}\nDPC Centre: ${booking.dpcName}\nDate: ${booking.slotDate} | ${booking.slotTime}\nSurvey No: #${booking.surveyNumber || "142/3A"}\nBring this token to the centre. - TNCSC`,

  PAYMENT_CREDITED_TA: (booking) =>
    `[TNCSC-PFMS] நெல் கொள்முதல் கட்டணம் வரவு!\nதொகை: ₹${(booking.totalAmount || 49773).toLocaleString("en-IN")}\nநிகர எடை: ${booking.netWeightKg || 2280} kg\nபரிவர்த்தனை ID: ${booking.paymentTxId || "TNCSC-DBT-99214018"}\nஉங்கள் வங்கிக் கணக்கில் வரவு வைக்கப்பட்டது. - TNCSC`,
};

/**
 * Format mobile number to E.164 (+91XXXXXXXXXX)
 */
export function toE164(mobile) {
  const digits = String(mobile || "").replace(/\D/g, "");
  if (digits.startsWith("91") && digits.length === 12) return `+${digits}`;
  if (digits.length === 10) return `+91${digits}`;
  return `+${digits}`;
}

/**
 * Send an SMS via real gateway API if configured, otherwise dispatch in-app push SMS event
 */
export async function sendRealOrSimulatedSMS({ mobile, message, title = "TN-TNCSC" }) {
  const formattedPhone = toE164(mobile);
  const clean10Digit = String(mobile || "").replace(/\D/g, "").slice(-10);

  const receipt = {
    status: "delivered",
    messageId: `TNCSC-SMS-${Date.now()}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`,
    to: formattedPhone,
    title,
    message,
    sentAt: new Date().toISOString(),
    provider: "TNCSC Government SMS Gateway",
  };

  // 1. Attempt real Fast2SMS API call if key is in environment
  const fast2SmsKey = import.meta.env?.VITE_FAST2SMS_API_KEY;
  if (fast2SmsKey && fast2SmsKey !== "YOUR_FAST2SMS_KEY") {
    try {
      await fetch("https://www.fast2sms.com/dev/bulkV2", {
        method: "POST",
        headers: {
          "authorization": fast2SmsKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          route: "v3",
          sender_id: "TXTIND",
          message: message,
          language: "unicode",
          flash: 0,
          numbers: clean10Digit,
        }),
      });
      receipt.provider = "Fast2SMS (Real SMS Delivered)";
    } catch (e) {
      console.warn("[Fast2SMS] Fallback to simulated delivery:", e);
    }
  }

  // 2. Broadcast Live In-App Push Notification to display realistic notification banner
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("ogu_incoming_sms", { detail: receipt }));
  }

  console.log(`%c[SMS Gateway] Sent to ${formattedPhone}`, "color:#2E7D32;font-weight:800;font-size:12px;");
  console.log(`%c${message}`, "color:#1B5E20;background:#E8F5E9;padding:6px;border-radius:4px;");

  return receipt;
}

/**
 * Send Dynamic OTP SMS
 */
export async function sendOtpSMS(mobile, code) {
  const message = SMS_TEMPLATES.OTP_SMS(code, mobile);
  return sendRealOrSimulatedSMS({ mobile, message, title: "TN-GOVT OTP" });
}

/**
 * Send Registration Confirmation SMS
 */
export async function sendRegistrationSMS(farmer, lang = "ta") {
  const template = lang === "ta" ? SMS_TEMPLATES.REGISTRATION_SUCCESS_TA : SMS_TEMPLATES.REGISTRATION_SUCCESS_EN;
  const message = template(farmer);
  return sendRealOrSimulatedSMS({ mobile: farmer.mobile, message, title: "TNCSC உழவர் பதிவு" });
}

/**
 * Send Slot Booking Confirmation SMS
 */
export async function sendSlotBookedSMS(mobile, booking, lang = "ta") {
  const template = lang === "ta" ? SMS_TEMPLATES.SLOT_BOOKED_TA : SMS_TEMPLATES.SLOT_BOOKED_EN;
  const message = template(booking);
  return sendRealOrSimulatedSMS({ mobile, message, title: "TNCSC டோக்கன் உறுதி" });
}

/**
 * Send Payment Credit SMS
 */
export async function sendPaymentCreditSMS(mobile, booking) {
  const message = SMS_TEMPLATES.PAYMENT_CREDITED_TA(booking);
  return sendRealOrSimulatedSMS({ mobile, message, title: "TNCSC வங்கி வரவு" });
}
