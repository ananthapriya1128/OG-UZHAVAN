/**
 * AI Mentor Service for OG Uzhavan — Powered by Gemini AI
 * 
 * Provides intelligent, context-aware agricultural procurement guidance
 * & deep Paddy Rate Analysis (MSP, TN Government Incentive, Moisture Deduction,
 * Net Payout per 40kg bag & Quintal) in Tamil, English, Hindi, and Telugu.
 */

const getApiKey = () => import.meta.env?.VITE_GEMINI_API_KEY || "";

const SYSTEM_PROMPT = `
You are "பேசும் உழவன் AI" (Talking Uzhavan AI), the official expert Paddy Rate Analyst and Agricultural Procurement Mentor for Tamil Nadu Civil Supplies Corporation (TNCSC) Direct Paddy Procurement (DPC).

Knowledge Base & Rate Analysis (2025-2026 Tamil Nadu Paddy Procurement):
1. Fine / Grade-A Paddy (White Ponni, Co 51, CR 1009):
   - Central MSP: ₹2,203 per quintal (₹881.20 per 40kg bag)
   - TN Government Bonus Incentive: ₹107 per quintal
   - Total Effective Price: ₹2,310 per quintal (₹924 per 40kg bag)

2. Common Variety Paddy (Aduthurai, Kuzha Paddy):
   - Central MSP: ₹2,183 per quintal (₹873.20 per 40kg bag)
   - TN Government Bonus Incentive: ₹82 per quintal
   - Total Effective Price: ₹2,265 per quintal (₹906 per 40kg bag)

3. Moisture & Quality Deduction Analysis:
   - Permissible Moisture Limit: Up to 17% (Zero deduction/full payout).
   - Moisture 17% - 20%: Subject to drying at DPC campus or weight adjustment per TNCSC slab.
   - Foreign Matter / Refuse limit: Max 1% un-milled husk allowed.

4. Direct Benefit Transfer (DBT):
   - Direct bank credit into Aadhaar-seeded bank account within 48 hours of weighbridge receipt.

Instructions:
1. Provide concise, friendly, and highly accurate analysis suitable for voice output (2 to 3 sentences max).
2. Use requested language code (ta: Tamil, en: English, hi: Hindi, te: Telugu). In Tamil, use warm, respectful spoken Tamil phrasing.
3. If the user asks about paddy rates, price analysis, bag prices, moisture deduction, or estimated earnings, provide exact price breakdowns.
4. Output valid JSON in this exact format:
{
  "text": "Your accurate response and rate analysis text here",
  "actionRoute": "/farmer/msp" or "/farmer/token" or "/farmer/booking" or "/farmer/grievance" or "/farmer/queue" or null
}
`;

// Local intent & paddy rate analysis engine (Offline fallback)
function detectLocalIntent(text) {
  const t = (text || "").toLowerCase();

  if (t.includes("விலை") || t.includes("ரேட்") || t.includes("rate") || t.includes("msp") || t.includes("price") || t.includes("குவிண்டால்") || t.includes("பணம் எவ்வளவு") || t.includes("மூட்டை") || t.includes("bag") || t.includes("பகுப்பாய்வு") || t.includes("analysis")) {
    return "check_msp_analysis";
  }
  if (t.includes("ஈரப்பதம்") || t.includes("moisture") || t.includes("மழை") || t.includes("கழிவு")) {
    return "check_moisture_analysis";
  }
  if (t.includes("டோக்கன்") || t.includes("token") || t.includes("வரிசை") || t.includes("நிலை") || t.includes("status") || t.includes("queue") || t.includes("my turn")) {
    return "check_token";
  }
  if (t.includes("பணம்") || t.includes("வரவு") || t.includes("payment") || t.includes("வங்கி") || t.includes("dbt") || t.includes("bank")) {
    return "check_payment";
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
    case "check_msp_analysis":
      text = lang === "ta"
        ? "தமிழ்நாடு நெல் கொள்முதல் பகுப்பாய்வு: சன்ன ரகம் (வெள்ளை பொன்னி) MSP ₹2,203 + தமிழக அரசின் ஊக்கத்தொகை ₹107 சேர்த்து குவிண்டாலுக்கு ₹2,310 (40 கிலோ மூட்டை ₹924). சாதாரண ரகம் குவிண்டாலுக்கு ₹2,265 (மூட்டை ₹906). 17% ஈரப்பதத்திற்குள் முழுத் தொகையும் 48 மணி நேரத்தில் வங்கிக்கு வரும்."
        : "TN Paddy Rate Analysis: Grade-A (White Ponni) MSP ₹2,203 + TN Govt Bonus ₹107 = ₹2,310/qtl (₹924 per 40kg bag). Common variety is ₹2,265/qtl (₹906 per 40kg bag). Zero deduction if moisture is under 17%.";
      actionRoute = "/farmer/msp";
      break;

    case "check_moisture_analysis":
      text = lang === "ta"
        ? "ஈரப்பதம் பகுப்பாய்வு: 17% ஈரப்பதம் வரை எடைக் கழிவு கிடையாது, முழு MSP விலை வழங்கப்படும். 17% முதல் 20% வரை இருந்தால் DPC வளாகத்தில் உணர்த்திய பின்னரே கொள்முதல் செய்யப்படும்."
        : "Moisture Analysis: Up to 17% moisture gets zero weight deduction and full MSP rate. Paddy with 17%-20% moisture must be dried at DPC before procurement.";
      actionRoute = "/farmer/msp";
      break;

    case "check_token":
      if (curBooking) {
        const ahead = Math.max(0, curBooking.tokenNumber - serving);
        text = lang === "ta"
          ? `வணக்கம்! உங்கள் டோக்கன் எண் #${curBooking.tokenNumber} (${curBooking.dpcName}). தற்போது #${serving} அழைக்கப்படுகிறது. உங்களுக்கு முன் ${ahead} விவசாயிகள் உள்ளனர்.`
          : `Hello! Your token number is #${curBooking.tokenNumber} at ${curBooking.dpcName}. Currently token #${serving} is serving (${ahead} farmers ahead).`;
        actionRoute = "/farmer/token";
      } else {
        text = lang === "ta"
          ? "உங்களிடம் தற்போது முன்பதிவு இல்லை. உடனடியாக முன்பதிவு செய்ய 'இட ஒதுக்கீடு' பக்கத்திற்கு செல்கிறேன்."
          : "You don't have an active booking right now. Redirecting you to the slot booking page.";
        actionRoute = "/farmer/booking";
      }
      break;

    case "check_payment":
      text = lang === "ta"
        ? "கொள்முதல் பகுப்பாய்வு: நெல் எடைபோட்டு DPC சீட்டு வழங்கப்பட்ட 48 மணி நேரத்திற்குள் DBT மூலம் உங்கள் ஆதார் இணைக்கப்பட்ட வங்கிக் கணக்கிற்கு பணம் நேரடி வரவு செய்யப்படும்."
        : "Payment Analysis: Funds will be directly credited to your Aadhaar-linked bank account via DBT within 48 hours of weighment at DPC.";
      actionRoute = "/farmer";
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
        ? "வணக்கம்! நான் உங்களின் நெல் கொள்முதல் பகுப்பாய்வு AI. நெல் விலை, மூட்டை மதிப்பு, ஈரப்பதம் கழிவு அல்லது டோக்கன் நிலை பற்றி என்னிடம் கேட்கலாம்."
        : "Hello! I am your Paddy Procurement AI Analyst. Ask me about paddy rates per bag, moisture rules, token status, or booking.";
      actionRoute = null;
      break;
  }

  return { text, actionRoute };
}

/**
 * Primary function to query Gemini API or fallback
 */
export async function queryAIMentor({ query, lang = "ta", farmer = null, booking = null, servingToken = 42, mspRates = {} }) {
  const apiKey = getApiKey();
  const isDefaultKey = !apiKey || apiKey.includes("YOUR_GEMINI_API_KEY") || !apiKey.startsWith("AIzaSy");

  if (isDefaultKey) {
    console.info("[AI Mentor] Active API Key is in offline fallback mode. Providing intelligent rate analysis response.");
    const intent = detectLocalIntent(query);
    return getLocalFallbackResponse({ intent, lang, farmer, booking, servingToken });
  }

  try {
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
    const contextPrompt = `
Farmer Context:
- Name: ${farmer?.name || "Farmer"}
- Active Booking: ${booking ? `Token #${booking.tokenNumber} at ${booking.dpcName}, Date: ${booking.slotDate}` : "None"}
- Current Serving Token at DPC: #${servingToken}
- Selected Language: ${lang} (ta=Tamil, en=English, hi=Hindi, te=Telugu)

Farmer Query: "${query}"
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
        temperature: 0.2,
        maxOutputTokens: 256,
      }
    };

    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      const errBody = await res.text();
      throw new Error(`Gemini API HTTP ${res.status}: ${errBody}`);
    }

    const data = await res.json();
    const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (!rawText) {
      throw new Error("Empty response content from Gemini API");
    }

    // Parse JSON or extract response cleanly
    let text = "";
    let actionRoute = null;

    try {
      const jsonStart = rawText.indexOf("{");
      const jsonEnd = rawText.lastIndexOf("}");
      if (jsonStart !== -1 && jsonEnd !== -1) {
        const jsonStr = rawText.substring(jsonStart, jsonEnd + 1);
        const parsed = JSON.parse(jsonStr);
        text = parsed.text;
        actionRoute = parsed.actionRoute;
      } else {
        text = rawText;
      }
    } catch {
      text = rawText.replace(/[\{\}\"]/g, "").trim();
    }

    return {
      text: text || "தமிழ்நாடு நெல் கொள்முதல் விலை பகுப்பாய்வு: வெள்ளை பொன்னி மூட்டை ₹924 (குவிண்டால் ₹2,310). ஈரப்பதம் 17% வரை அனுமதிக்கப்படும்.",
      actionRoute: actionRoute || null
    };

  } catch (err) {
    console.warn("[AI Mentor] Gemini API call note (using fallback):", err.message);
    const intent = detectLocalIntent(query);
    return getLocalFallbackResponse({ intent, lang, farmer, booking, servingToken });
  }
}
