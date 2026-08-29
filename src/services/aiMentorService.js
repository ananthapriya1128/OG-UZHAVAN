/**
 * AI Mentor Service for OG Uzhavan — Powered by Gemini AI
 * 
 * Provides intelligent, context-aware agricultural procurement guidance
 * in Tamil, English, Hindi, and Telugu. Supports Gemini REST API with 
 * seamless offline intent engine fallback.
 */

const GEMINI_API_KEY = import.meta.env?.VITE_GEMINI_API_KEY || "";
const GEMINI_ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`;

const SYSTEM_PROMPT = `
You are "பேசும் உழவன் AI" (Talking Uzhavan AI), the official agricultural procurement virtual mentor for Tamil Nadu Civil Supplies Corporation (TNCSC) Direct Paddy Procurement (DPC).

Rules:
1. Answer concisely in 2 to 3 friendly sentences suitable for text-to-speech voice output.
2. Respond strictly in the requested language code (ta: Tamil, en: English, hi: Hindi, te: Telugu). Use natural vernacular spoken Tamil phrasing when language is Tamil.
3. Help paddy farmers with token status, slot booking, MSP rates, moisture guidelines (17% max limit), payment/DBT status, and grievance redressal.
4. Output valid JSON in this exact format:
{
  "text": "Your spoken response text here",
  "actionRoute": "/farmer/token" or "/farmer/booking" or "/farmer/msp" or "/farmer/grievance" or "/farmer/queue" or null
}
`;

// Local intent detection engine (Offline fallback)
function detectLocalIntent(text, lang) {
  const t = (text || "").toLowerCase();

  if (t.includes("டோக்கன்") || t.includes("token") || t.includes("வரிசை") || t.includes("நிலை") || t.includes("status") || t.includes("queue") || t.includes("my turn")) {
    return "check_token";
  }
  if (t.includes("விலை") || t.includes("ரேட்") || t.includes("rate") || t.includes("msp") || t.includes("price") || t.includes("குவிண்டால்")) {
    return "check_msp";
  }
  if (t.includes("பணம்") || t.includes("வரவு") || t.includes("payment") || t.includes("வங்கி") || t.includes("dbt") || t.includes("bank")) {
    return "check_payment";
  }
  if (t.includes("மழை") || t.includes("வானிலை") || t.includes("ஈரப்பதம்") || t.includes("weather") || t.includes("rain") || t.includes("moisture")) {
    return "check_weather";
  }
  if (t.includes("புக்") || t.includes("பதிவு") || t.includes("slot") || t.includes("book") || t.includes("booking") || t.includes("இடம்")) {
    return "book_slot";
  }
  if (t.includes("புகார்") || t.includes("பிரச்சனை") || t.includes("complaint") || t.includes("grievance") || t.includes("problem") || t.includes("உதவி")) {
    return "raise_grievance";
  }
  return "general";
}

function getLocalFallbackResponse({ intent, lang, farmer, booking, servingToken }) {
  const curBooking = booking;
  const serving = servingToken || 42;

  let text = "";
  let actionRoute = null;

  switch (intent) {
    case "check_token":
      if (curBooking) {
        const ahead = Math.max(0, curBooking.tokenNumber - serving);
        text = lang === "ta"
          ? `வணக்கம்! உங்கள் டோக்கன் எண் #${curBooking.tokenNumber}. மையம்: ${curBooking.dpcName}. தற்போது #${serving} அழைக்கப்படுகிறது. உங்களுக்கு முன் ${ahead} விவசாயிகள் உள்ளனர்.`
          : `Hello! Your token number is #${curBooking.tokenNumber} at ${curBooking.dpcName}. Currently token #${serving} is serving. There are ${ahead} farmers ahead of you.`;
        actionRoute = "/farmer/token";
      } else {
        text = lang === "ta"
          ? "உங்களிடம் தற்போது முன்பதிவு இல்லை. உடனடியாக முன்பதிவு செய்ய 'இட ஒதுக்கீடு' பக்கத்திற்கு செல்கிறேன்."
          : "You don't have an active booking right now. Redirecting you to the slot booking page.";
        actionRoute = "/farmer/booking";
      }
      break;

    case "check_msp":
      text = lang === "ta"
        ? "இன்றைய தமிழ்நாடு அரசு நேரடி நெல் கொள்முதல் விலை: வெள்ளை பொன்னி குவிண்டாலுக்கு ₹2,183, தரம் ஏ ரகம் குவிண்டாலுக்கு ₹2,203 ஆகும். ஈரப்பதம் 17% வரை அனுமதிக்கப்படும்."
        : "Today's TN Government Paddy MSP: White Ponni at ₹2,183/qtl, Grade-A at ₹2,203/qtl. Maximum moisture limit is 17%.";
      actionRoute = "/farmer/msp";
      break;

    case "check_payment":
      text = lang === "ta"
        ? "நெல் கொள்முதல் முடிந்த 48 மணி நேரத்திற்குள் DBT மூலம் உங்கள் ஆதார் இணைக்கப்பட்ட வங்கிக் கணக்கிற்கு பணம் நேரடியாக வரவு வைக்கப்படும்."
        : "Payment will be credited directly to your Aadhaar-linked bank account via DBT within 48 hours of procurement.";
      actionRoute = "/farmer";
      break;

    case "check_weather":
      text = lang === "ta"
        ? "காவிரி டெல்டா மண்டலத்தில் இன்று வானிலை தெளிவாக உள்ளது. உங்கள் நெல்லின் ஈரப்பதம் 17% க்குள் இருப்பதை உறுதி செய்து DPC-க்கு கொண்டு வாருங்கள்."
        : "Weather in Cauvery Delta is clear today. Ensure your paddy moisture is under 17% before bringing it to DPC.";
      actionRoute = null;
      break;

    case "book_slot":
      text = lang === "ta"
        ? "நிச்சயமாக! உழவர் நேரடி நெல் கொள்முதல் முன்பதிவு பக்கத்திற்கு அழைத்துச் செல்கிறேன்."
        : "Sure! Redirecting you to the direct paddy procurement slot booking screen.";
      actionRoute = "/farmer/booking";
      break;

    case "raise_grievance":
      text = lang === "ta"
        ? "உங்கள் புகாரை பதிவு செய்ய குறைதீர்ப்பு பக்கத்திற்கு அழைத்துச் செல்கிறேன். 72 மணி நேரத்திற்குள் தீர்வு காணப்படும்."
        : "Taking you to the grievance redressal page to register your complaint. Resolution within 72 hours.";
      actionRoute = "/farmer/grievance";
      break;

    default:
      text = lang === "ta"
        ? "வணக்கம்! நான் உங்களின் உழவர் உதவி AI. டோக்கன் எண், இன்றைய விலை, அல்லது முன்பதிவு பற்றி என்னிடம் கேட்கலாம்."
        : "Hello! I am your Uzhavan AI Assistant. Ask me about your token status, MSP prices, slot booking, or grievances.";
      actionRoute = null;
      break;
  }

  return { text, actionRoute };
}

/**
 * Primary function to query Gemini API or fallback
 */
export async function queryAIMentor({ query, lang = "ta", farmer = null, booking = null, servingToken = 42, mspRates = {} }) {
  if (!GEMINI_API_KEY) {
    console.info("[AI Mentor] VITE_GEMINI_API_KEY not configured. Using local intelligent intent engine.");
    const intent = detectLocalIntent(query, lang);
    return getLocalFallbackResponse({ intent, lang, farmer, booking, servingToken });
  }

  try {
    const contextPrompt = `
Farmer context:
- Name: ${farmer?.name || "Farmer"}
- Mobile: ${farmer?.mobile || "N/A"}
- Active Booking: ${booking ? `Token #${booking.tokenNumber} at ${booking.dpcName}, Date: ${booking.slotDate}` : "None"}
- Current Serving Token at DPC: #${servingToken}
- Language: ${lang} (ta=Tamil, en=English, hi=Hindi, te=Telugu)

User input query: "${query}"
`;

    const payload = {
      contents: [
        {
          role: "user",
          parts: [
            { text: SYSTEM_PROMPT },
            { text: contextPrompt }
          ]
        }
      ],
      generationConfig: {
        temperature: 0.3,
        maxOutputTokens: 256,
        responseMimeType: "application/json"
      }
    };

    const res = await fetch(GEMINI_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      throw new Error(`Gemini API returned status ${res.status}`);
    }

    const data = await res.json();
    const candidateText = data.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (!candidateText) {
      throw new Error("Invalid response structure from Gemini API");
    }

    const parsed = JSON.parse(candidateText);
    return {
      text: parsed.text || "மன்னிக்கவும், மீண்டும் முயற்சிக்கவும்.",
      actionRoute: parsed.actionRoute || null
    };

  } catch (err) {
    console.warn("[AI Mentor] Gemini API error, falling back to local engine:", err.message);
    const intent = detectLocalIntent(query, lang);
    return getLocalFallbackResponse({ intent, lang, farmer, booking, servingToken });
  }
}
