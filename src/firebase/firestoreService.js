// ─── OG Uzhavan — Firestore Service Layer ─────────────────────────────────────
// All Firestore reads/writes go through this module.
// When Firebase config keys are placeholders (demo mode), mock data is used.
// Mock queue auto-advances every 45 seconds to simulate a live procurement day.

import { isConfigured, db, functions } from "./config.js";
import { retryWithBackoff, isTransientFirebaseError } from "../services/retry.js";

let _firestoreFns = {};
if (isConfigured) {
  import("firebase/firestore").then((m) => { _firestoreFns = m; });
}

// ─── MOCK DATA ────────────────────────────────────────────────────────────────

export const MOCK_FARMER = {
  id: "farmer_001",
  name: "முருகன் சுப்பையா",
  mobile: "9876543210",
  village: "திருவாரூர்",
  district: "திருவாரூர்",
  state: "தமிழ்நாடு",
  preferredLanguage: "ta",
  aadhaarMasked: "XXXX XXXX 4521",
  rationCardNumber: "TN01 00123456",
  rationCardType: "PHH",
  surveyNumber: "142/3A",
  pattaNumber: "PAT-45210",
  taluk: "திருவாரூர் வட்டம்",
  cultivatedAcres: "3.5",
  cropVariety: "whiteponni",
  cropVarietyName: "வெள்ளை பொன்னி",
  vaoCertNumber: "VAO/2026/TN/8831",
  vaoOfficerName: "கே. ரவிச்சந்திரன் (VAO)",
  vaoVerified: true,
};

export const MOCK_BOOKING = {
  id: "booking_001",
  farmerId: "farmer_001",
  farmerName: "முருகன் சுப்பையா",
  dpcId: "dpc_ponneri",
  dpcName: "பொன்னேரி DPC",
  tokenNumber: 47,
  slotDate: "2026-08-28",
  slotTime: "10:00 AM",
  status: "arrived",
  channel: "app",
  cropVariety: "whiteponni",
  cropVarietyName: "வெள்ளை பொன்னி",
  quantityQuintals: 24,
  grossWeightKg: 2400,
  moistureDeductionKg: 120,
  netWeightKg: 2280,
  mspRate: 2183,
  totalAmount: 49773,
  bankAccount: "SBI ****8921",
  expectedPaymentDate: "2026-09-04",
  createdAt: "2026-08-25T09:00:00.000Z",
};

export const MOCK_DPC_CENTRES = [
  { id: "dpc_ponneri",       districtId:"tiruvallur",   name: "பொன்னேரி DPC",         nameEn: "Ponneri DPC",         distance: "4.2 கி.மீ",  load: "high",   currentServingToken: 31, dailyCapacity: 60, lat: 13.3269, lng: 80.1908, slots: ["8:00 AM","9:00 AM","10:00 AM","11:00 AM","2:00 PM","3:00 PM"] },
  { id: "dpc_gummidipoondi",  districtId:"tiruvallur",   name: "கும்மிடிப்பூண்டி DPC", nameEn: "Gummidipoondi DPC",    distance: "8.1 கி.மீ",  load: "low",    currentServingToken: 8,  dailyCapacity: 60, lat: 13.4069, lng: 80.1208, slots: ["8:00 AM","9:00 AM","10:00 AM","11:00 AM","2:00 PM","3:00 PM"] },
  { id: "dpc_tiruvallur",     districtId:"tiruvallur",   name: "திருவள்ளூர் DPC",       nameEn: "Tiruvallur DPC",      distance: "12.4 கி.மீ", load: "medium", currentServingToken: 22, dailyCapacity: 60, lat: 13.1430, lng: 79.9091, slots: ["8:00 AM","9:00 AM","10:00 AM","11:00 AM","2:00 PM","3:00 PM"] },
  { id: "dpc_thanjavur",      districtId:"thanjavur",     name: "தஞ்சாவூர் DPC",        nameEn: "Thanjavur DPC",       distance: "3.5 கி.மீ",  load: "high",   currentServingToken: 45, dailyCapacity: 80, lat: 10.7870, lng: 79.1378, slots: ["7:30 AM","8:30 AM","9:30 AM","10:30 AM","1:30 PM","2:30 PM","3:30 PM"] },
  { id: "dpc_kumbakonam",     districtId:"thanjavur",     name: "கும்பகோணம் DPC",       nameEn: "Kumbakonam DPC",      distance: "6.8 கி.மீ",  load: "medium", currentServingToken: 18, dailyCapacity: 70, lat: 10.9617, lng: 79.3881, slots: ["8:00 AM","9:00 AM","10:00 AM","11:00 AM","2:00 PM","3:00 PM"] },
  { id: "dpc_tiruvarur",      districtId:"tiruvarur",     name: "திருவாரூர் DPC",        nameEn: "Tiruvarur DPC",       distance: "5.2 கி.மீ",  load: "low",    currentServingToken: 12, dailyCapacity: 55, lat: 10.7713, lng: 79.6369, slots: ["8:00 AM","9:00 AM","10:00 AM","11:00 AM","2:00 PM","3:00 PM"] },
  { id: "dpc_nagapattinam",   districtId:"nagapattinam",  name: "நாகப்பட்டினம் DPC",    nameEn: "Nagapattinam DPC",    distance: "9.6 கி.மீ",  load: "low",    currentServingToken: 5,  dailyCapacity: 50, lat: 10.7654, lng: 79.8424, slots: ["8:00 AM","9:00 AM","10:00 AM","11:00 AM","2:00 PM","3:00 PM"] },
  { id: "dpc_cuddalore",      districtId:"cuddalore",     name: "கடலூர் DPC",            nameEn: "Cuddalore DPC",      distance: "7.3 கி.மீ",  load: "medium", currentServingToken: 28, dailyCapacity: 65, lat: 11.7480, lng: 79.7714, slots: ["8:00 AM","9:00 AM","10:00 AM","11:00 AM","2:00 PM","3:00 PM"] },
  { id: "dpc_kanchipuram",    districtId:"kanchipuram",   name: "காஞ்சிபுரம் DPC",       nameEn: "Kanchipuram DPC",     distance: "11.0 கி.மீ", load: "low",    currentServingToken: 10, dailyCapacity: 55, lat: 12.8342, lng: 79.7036, slots: ["8:00 AM","9:00 AM","10:00 AM","11:00 AM","2:00 PM","3:00 PM"] },
  { id: "dpc_villupuram",     districtId:"villupuram",    name: "விழுப்புரம் DPC",       nameEn: "Villupuram DPC",      distance: "14.5 கி.மீ", load: "high",   currentServingToken: 38, dailyCapacity: 70, lat: 11.9401, lng: 79.4861, slots: ["8:00 AM","9:00 AM","10:00 AM","11:00 AM","2:00 PM","3:00 PM"] },
];

export const MOCK_DISTRICTS = [
  { id:"tiruvallur", name:"Tiruvallur", farmers:12840, volumeQuintals:57220, value:124911260, grievanceBacklog:18 },
  { id:"thanjavur", name:"Thanjavur", farmers:18620, volumeQuintals:89210, value:194645430, grievanceBacklog:25 },
  { id:"tiruvarur", name:"Tiruvarur", farmers:10450, volumeQuintals:41380, value:90333450, grievanceBacklog:12 },
];

export const MOCK_MSP_RATES = {
  whiteponni: { cropName: "வெள்ளை பொன்னி",  cropNameEn: "White Ponni", ratePerQuintal: 2183, effectiveFrom: "2025-10-01" },
  co51:       { cropName: "சோ.51",           cropNameEn: "Co 51",       ratePerQuintal: 2183, effectiveFrom: "2025-10-01" },
  cr1009:     { cropName: "சோ.ரு.1009",     cropNameEn: "CR 1009",     ratePerQuintal: 2183, effectiveFrom: "2025-10-01" },
  aduthurai:  { cropName: "அடுத்துறை புடி",  cropNameEn: "Aduthurai",   ratePerQuintal: 2203, effectiveFrom: "2025-10-01" },
  koozha:     { cropName: "கூழா புடி",       cropNameEn: "Kuzha Paddy", ratePerQuintal: 2183, effectiveFrom: "2025-10-01" },
};

export const MOCK_QUEUE = [
  { tokenNumber: 29, farmerName: "ஆண்டிசாமி",      status: "paid",     crop: "White Ponni", qty: "18 qtl" },
  { tokenNumber: 30, farmerName: "கருப்பையா",      status: "approved", crop: "Co 51",       qty: "14 qtl" },
  { tokenNumber: 31, farmerName: "ராமசாமி",        status: "weighing", crop: "White Ponni", qty: "18 qtl" },
  { tokenNumber: 32, farmerName: "கணேசன்",         status: "arrived",  crop: "Co 51",       qty: "22 qtl" },
  { tokenNumber: 33, farmerName: "செல்வம்",        status: "arrived",  crop: "CR 1009",     qty: "15 qtl" },
  { tokenNumber: 34, farmerName: "மாரிமுத்து",     status: "arrived",  crop: "White Ponni", qty: "30 qtl" },
  { tokenNumber: 35, farmerName: "பழனியப்பன்",    status: "arrived",  crop: "Aduthurai",   qty: "20 qtl" },
  { tokenNumber: 36, farmerName: "குமாரசாமி",      status: "arrived",  crop: "Co 51",       qty: "12 qtl" },
  { tokenNumber: 37, farmerName: "வேலுசாமி",      status: "arrived",  crop: "White Ponni", qty: "25 qtl" },
  { tokenNumber: 38, farmerName: "சண்முகம்",       status: "arrived",  crop: "CR 1009",     qty: "18 qtl" },
  { tokenNumber: 39, farmerName: "அருண்",          status: "arrived",  crop: "Kuzha",       qty: "14 qtl" },
  { tokenNumber: 40, farmerName: "தங்கம்",         status: "arrived",  crop: "White Ponni", qty: "28 qtl" },
  { tokenNumber: 41, farmerName: "முத்துலட்சுமி",  status: "arrived",  crop: "Co 51",       qty: "16 qtl" },
  { tokenNumber: 42, farmerName: "சுந்தரம்",       status: "arrived",  crop: "Aduthurai",   qty: "21 qtl" },
  { tokenNumber: 43, farmerName: "லட்சுமி",        status: "arrived",  crop: "White Ponni", qty: "19 qtl" },
  { tokenNumber: 44, farmerName: "பாலமுருகன்",    status: "arrived",  crop: "CR 1009",     qty: "24 qtl" },
  { tokenNumber: 45, farmerName: "சீனிவாசன்",     status: "arrived",  crop: "White Ponni", qty: "22 qtl" },
  { tokenNumber: 46, farmerName: "மீனாட்சி",       status: "arrived",  crop: "Co 51",       qty: "17 qtl" },
  { tokenNumber: 47, farmerName: "முருகன் சுப்பையா", status: "arrived", crop: "White Ponni", qty: "24 qtl", isCurrentFarmer: true },
  { tokenNumber: 48, farmerName: "கோவிந்தசாமி",   status: "booked",   crop: "CR 1009",     qty: "20 qtl" },
  { tokenNumber: 49, farmerName: "தேவகி",          status: "booked",   crop: "White Ponni", qty: "15 qtl" },
  { tokenNumber: 50, farmerName: "இராஜகோபால்",    status: "booked",   crop: "Co 51",       qty: "18 qtl" },
];

const _mockGrievances = [
  { id: "grievance_001", farmerId: "farmer_001", bookingId: "booking_001", dpcId: "dpc_ponneri", category: "payment_delay", description: "கட்டணம் 7 நாட்களுக்கும் மேலாக வரவில்லை. வங்கி கணக்கு சரிதான்.", status: "open", raisedAt: "2026-08-26T10:00:00.000Z", slaDeadline: "2026-08-29T10:00:00.000Z", escalatedTo: null, resolutionNotes: null },
];
const _grievanceSubs = new Set();

function notifyGrievances() {
  _grievanceSubs.forEach((subscriber) => subscriber());
}

// ─── MOCK LIVE ENGINE ─────────────────────────────────────────────────────────

let _mockToken = 31;
const _queueSubs = new Set();
const _bookingSubs = new Map();
const _mockBookingsByRequest = new Map();

// Auto-advance queue every 45 seconds (demo mode only)
setInterval(() => {
  if (_mockToken < 50) {
    _mockToken++;
    _queueSubs.forEach(cb => cb(_mockToken));
    _bookingSubs.forEach(cb => cb({ ...MOCK_BOOKING }));
  }
}, 45000);

export function getMockServingToken() { return _mockToken; }

// ─── SESSION HELPERS ──────────────────────────────────────────────────────────

export function getCurrentFarmer() {
  try { const s = localStorage.getItem("ogu.farmer"); if (s) return JSON.parse(s); } catch {}
  return { ...MOCK_FARMER };
}
export function saveCurrentFarmer(d) {
  try { localStorage.setItem("ogu.farmer", JSON.stringify(d)); } catch {}
}
export function getCurrentBooking() {
  try { const s = localStorage.getItem("ogu.booking"); if (s) return JSON.parse(s); } catch {}
  return { ...MOCK_BOOKING };
}
export function saveCurrentBooking(d) {
  try { localStorage.setItem("ogu.booking", JSON.stringify(d)); } catch {}
}
export function getDpcSession() {
  try { const s = localStorage.getItem("ogu.dpcSession"); if (s) return JSON.parse(s); } catch {}
  return null;
}
export function saveDpcSession(d) {
  try { localStorage.setItem("ogu.dpcSession", JSON.stringify(d)); } catch {}
}
export function clearDpcSession() {
  try { localStorage.removeItem("ogu.dpcSession"); } catch {}
}

// ─── QUEUE & BOOKING PERSISTENCE HELPERS ─────────────────────────────────────

function getStoredQueue(dpcId) {
  try {
    const raw = localStorage.getItem(`ogu.live_queue_${dpcId || "dpc_ponneri"}`);
    if (raw) return JSON.parse(raw);
  } catch {}
  // Initialize with MOCK_QUEUE
  const init = [...MOCK_QUEUE];
  try {
    const booking = getCurrentBooking();
    if (booking && (!booking.dpcId || booking.dpcId === dpcId)) {
      const idx = init.findIndex(i => i.tokenNumber === booking.tokenNumber);
      const entry = {
        tokenNumber: booking.tokenNumber || 47,
        farmerName: booking.farmerName || "முருகன் சுப்பையா",
        farmerId: booking.farmerId || "farmer_001",
        status: booking.status || "arrived",
        crop: booking.cropVarietyName || booking.cropVariety || "White Ponni",
        qty: `${booking.quantityQuintals || 24} qtl`,
        surveyNumber: booking.surveyNumber || "142/3A",
        village: booking.village || "திருவாரூர்",
        mobile: booking.mobile || "9876543210",
        isCurrentFarmer: true,
        grossWeightKg: booking.grossWeightKg || 2400,
        moistureDeductionKg: booking.moistureDeductionKg || 120,
        netWeightKg: booking.netWeightKg || 2280,
        mspRate: booking.mspRate || 2183,
        totalAmount: booking.totalAmount || 49773,
      };
      if (idx >= 0) init[idx] = { ...init[idx], ...entry };
      else init.push(entry);
    }
  } catch {}
  return init;
}

function saveStoredQueue(dpcId, queue) {
  try {
    localStorage.setItem(`ogu.live_queue_${dpcId || "dpc_ponneri"}`, JSON.stringify(queue));
  } catch {}
}

function notifyAllQueueSubscribers(dpcId, currentToken) {
  const q = getStoredQueue(dpcId);
  const dpc = MOCK_DPC_CENTRES.find(d => d.id === dpcId) || MOCK_DPC_CENTRES[0];
  _queueSubs.forEach(cb => cb({ ...dpc, currentServingToken: currentToken || _mockToken, queue: q }));
  
  const curBooking = getCurrentBooking();
  if (curBooking) {
    _bookingSubs.forEach(cb => cb({ ...curBooking, currentServingToken: currentToken || _mockToken }));
  }
}

// ─── BOOKING ─────────────────────────────────────────────────────────────────

export function subscribeToBooking(bookingId, callback) {
  if (!isConfigured) {
    const cur = getCurrentBooking();
    callback({ ...cur, currentServingToken: _mockToken });
    const l = () => {
      const b = getCurrentBooking();
      callback({ ...b, currentServingToken: _mockToken });
    };
    _bookingSubs.set(bookingId || "default", l);
    return () => _bookingSubs.delete(bookingId || "default");
  }
  import("firebase/firestore").then(({ doc, onSnapshot }) => {
    onSnapshot(doc(db, "bookings", bookingId), snap => {
      if (snap.exists()) callback({ id: snap.id, ...snap.data() });
    });
  });
  return () => {};
}

export async function createBooking(data) {
  const idempotencyKey = data.idempotencyKey || createIdempotencyKey();
  if (!isConfigured && _mockBookingsByRequest.has(idempotencyKey)) return _mockBookingsByRequest.get(idempotencyKey);
  
  const token = Math.floor(Math.random() * 20) + 48;
  const booking = {
    ...data,
    id: "booking_" + Date.now(),
    idempotencyKey,
    channel: "app",
    status: "booked",
    tokenNumber: token,
    quantityQuintals: parseFloat(data.quantityQuintals) || 24,
    createdAt: new Date().toISOString()
  };

  if (!isConfigured) {
    saveCurrentBooking(booking);
    _mockBookingsByRequest.set(idempotencyKey, booking);
    
    // Add to DPC live queue
    const dpcId = data.dpcId || "dpc_ponneri";
    const q = getStoredQueue(dpcId);
    const newEntry = {
      tokenNumber: token,
      farmerName: data.farmerName || "விவசாயி",
      farmerId: data.farmerId || "farmer_001",
      status: "booked",
      crop: data.cropVarietyName || data.cropVariety || "White Ponni",
      qty: `${data.quantityQuintals || 24} qtl`,
      surveyNumber: data.surveyNumber || "142/3A",
      village: data.village || "திருவாரூர்",
      mobile: data.mobile || "9876543210",
      isCurrentFarmer: true,
      bookedAt: new Date().toISOString(),
    };
    
    // Remove existing if any, then append
    const filtered = q.filter(item => item.tokenNumber !== token && item.farmerId !== data.farmerId);
    filtered.push(newEntry);
    saveStoredQueue(dpcId, filtered);
    notifyAllQueueSubscribers(dpcId, _mockToken);

    return booking;
  }
  const { httpsCallable } = await import("firebase/functions");
  const call = httpsCallable(functions, "createBooking");
  const result = await retryWithBackoff(() => call({ ...data, idempotencyKey }), { shouldRetry: isTransientFirebaseError });
  const b = result.data;
  saveCurrentBooking(b);
  return b;
}

export async function cancelBooking(bookingId, farmerId) {
  const curBooking = getCurrentBooking();
  const dpcId = curBooking?.dpcId || "dpc_ponneri";
  const tokenNum = curBooking?.tokenNumber;

  if (!isConfigured) {
    // Clear current booking from localStorage
    localStorage.removeItem("ogu.booking");

    // Remove or cancel in DPC queue
    const q = getStoredQueue(dpcId);
    const updated = q.filter(item => item.tokenNumber !== tokenNum && item.farmerId !== farmerId);
    saveStoredQueue(dpcId, updated);
    notifyAllQueueSubscribers(dpcId, _mockToken);

    return { success: true, message: "Booking cancelled successfully." };
  }

  const { doc, updateDoc } = await import("firebase/firestore");
  await updateDoc(doc(db, "bookings", bookingId), { status: "cancelled", cancelledAt: new Date().toISOString() });
  localStorage.removeItem("ogu.booking");
  return { success: true };
}

export function createIdempotencyKey() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return `ogu_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

// ─── QUEUE ───────────────────────────────────────────────────────────────────

export function subscribeToQueue(dpcId, callback) {
  if (!isConfigured) {
    const targetDpcId = dpcId || "dpc_ponneri";
    const dpc = MOCK_DPC_CENTRES.find(d => d.id === targetDpcId) || MOCK_DPC_CENTRES[0];
    const emit = (stateOrToken) => {
      const q = getStoredQueue(targetDpcId);
      const serving = typeof stateOrToken === "number" ? stateOrToken : _mockToken;
      callback({ ...dpc, currentServingToken: serving, queue: q });
    };
    emit(_mockToken);
    _queueSubs.add(emit);
    return () => _queueSubs.delete(emit);
  }
  import("firebase/firestore").then(({ doc, onSnapshot }) => {
    onSnapshot(doc(db, "dpc_centres", dpcId), snap => {
      if (snap.exists()) callback({ id: snap.id, ...snap.data() });
    });
  });
  return () => {};
}

export async function advanceQueue(dpcId) {
  if (!isConfigured) {
    if (_mockToken < 60) {
      _mockToken++;
      notifyAllQueueSubscribers(dpcId, _mockToken);
    }
    return { currentServingToken: _mockToken };
  }
  const { doc, getDoc, updateDoc } = await import("firebase/firestore");
  const ref = doc(db, "dpc_centres", dpcId);
  const snap = await getDoc(ref);
  const next = (snap.data()?.currentServingToken ?? 0) + 1;
  await updateDoc(ref, { currentServingToken: next });
  return { currentServingToken: next };
}

/** Accepts a token typed by an officer or supplied by a hardware QR/barcode scanner. */
export async function checkInToken({ dpcId, tokenNumber }) {
  const token = Number(tokenNumber);
  if (!Number.isInteger(token) || token < 1) throw new Error("Enter a valid token number.");
  if (!isConfigured) {
    const targetDpcId = dpcId || "dpc_ponneri";
    const q = getStoredQueue(targetDpcId);
    const entry = q.find((item) => item.tokenNumber === token);
    if (!entry) throw new Error("Token was not found in today’s queue.");
    entry.status = "arrived";
    saveStoredQueue(targetDpcId, q);

    const curBooking = getCurrentBooking();
    if (curBooking && curBooking.tokenNumber === token) {
      curBooking.status = "arrived";
      saveCurrentBooking(curBooking);
    }
    notifyAllQueueSubscribers(targetDpcId, _mockToken);
    return { tokenNumber: token, status: "arrived", farmerName: entry.farmerName };
  }
  const { httpsCallable } = await import("firebase/functions");
  return (await httpsCallable(functions, "checkInBooking")({ dpcId, tokenNumber: token })).data;
}

/** Updates the procurement lifecycle stage (arrived -> weighing -> approved -> paid) */
export async function updateProcurementStage({ dpcId, tokenNumber, stage, weighData = {} }) {
  const targetDpcId = dpcId || "dpc_ponneri";
  const token = Number(tokenNumber);

  if (!isConfigured) {
    const q = getStoredQueue(targetDpcId);
    const entry = q.find(item => item.tokenNumber === token);
    if (entry) {
      entry.status = stage;
      Object.assign(entry, weighData);
      saveStoredQueue(targetDpcId, q);
    }

    const curBooking = getCurrentBooking();
    if (curBooking && (curBooking.tokenNumber === token || entry?.isCurrentFarmer)) {
      curBooking.status = stage;
      Object.assign(curBooking, weighData);
      if (stage === "paid") {
        curBooking.paymentTxId = weighData.paymentTxId || `TXN-TNCSC-${Date.now().toString().slice(-6)}`;
        curBooking.paidAt = new Date().toISOString();
        curBooking.bankAccount = curBooking.bankAccount || "SBI · A/C Ending in 8921";
      }
      saveCurrentBooking(curBooking);
    }

    notifyAllQueueSubscribers(targetDpcId, _mockToken);
    return { success: true, stage, token, weighData };
  }

  const { doc, updateDoc } = await import("firebase/firestore");
  await updateDoc(doc(db, "bookings", `booking_${token}`), { status: stage, ...weighData, updatedAt: new Date().toISOString() });
  return { success: true };
}

/** Get live DPC Summary Statistics */
export function getDpcLiveStats(dpcId) {
  const q = getStoredQueue(dpcId || "dpc_ponneri");
  const paidItems = q.filter(i => i.status === "paid");
  const arrivedItems = q.filter(i => i.status === "arrived" || i.status === "weighing" || i.status === "approved");
  
  const totalBags = paidItems.reduce((acc, i) => acc + (i.bagsCount || 60), 0) + 140;
  const totalProcuredKg = paidItems.reduce((acc, i) => acc + (i.netWeightKg || 2400), 0) + 5600;
  const totalDisbursedAmt = paidItems.reduce((acc, i) => acc + (i.totalAmount || 49773), 0) + 122248;

  return {
    servingToken: _mockToken,
    farmersWaiting: arrivedItems.length,
    farmersPaidToday: paidItems.length + 3,
    totalProcuredQuintals: (totalProcuredKg / 100).toFixed(1),
    totalDisbursedCrores: (totalDisbursedAmt / 100000).toFixed(2),
    gunnyBagsStock: 1450 - totalBags,
    gunnyBagsFilled: totalBags,
  };
}

// ─── DPC CENTRES ─────────────────────────────────────────────────────────────

export async function getDpcCentres() {
  if (!isConfigured) return [...MOCK_DPC_CENTRES];
  const { collection, getDocs } = await import("firebase/firestore");
  const snap = await getDocs(collection(db, "dpc_centres"));
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

// ─── MSP RATES ───────────────────────────────────────────────────────────────

export async function getMspRate(cropId) {
  if (!isConfigured) return MOCK_MSP_RATES[cropId] ?? MOCK_MSP_RATES.whiteponni;
  const { doc, getDoc } = await import("firebase/firestore");
  const snap = await getDoc(doc(db, "msp_rates", cropId));
  return snap.exists() ? snap.data() : MOCK_MSP_RATES.whiteponni;
}

export async function getAllMspRates() {
  if (!isConfigured) return { ...MOCK_MSP_RATES };
  const { collection, getDocs } = await import("firebase/firestore");
  const snap = await getDocs(collection(db, "msp_rates"));
  const result = {};
  snap.docs.forEach(d => { result[d.id] = d.data(); });
  return result;
}

// ─── GRIEVANCES ───────────────────────────────────────────────────────────────

export function subscribeToFarmerGrievances(farmerId, callback) {
  if (!isConfigured) {
    const emit = () => callback(_mockGrievances.filter(g => g.farmerId === farmerId).map(g => ({ ...g })));
    emit();
    _grievanceSubs.add(emit);
    return () => _grievanceSubs.delete(emit);
  }
  import("firebase/firestore").then(({ collection, query, where, orderBy, onSnapshot }) => {
    const q = query(collection(db, "grievances"), where("farmerId", "==", farmerId), orderBy("raisedAt", "desc"));
    onSnapshot(q, snap => callback(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
  });
  return () => {};
}

export function subscribeToAllGrievances(dpcId, callback) {
  if (!isConfigured) {
    const emit = () => callback(_mockGrievances.filter(g => !dpcId || g.dpcId === dpcId).map(g => ({ ...g })));
    emit();
    _grievanceSubs.add(emit);
    return () => _grievanceSubs.delete(emit);
  }
  import("firebase/firestore").then(({ collection, query, where, orderBy, onSnapshot }) => {
    const q = query(collection(db, "grievances"), where("dpcId", "==", dpcId), orderBy("raisedAt", "desc"));
    onSnapshot(q, snap => callback(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
  });
  return () => {};
}

export async function createGrievance(data) {
  const g = { ...data, status: "open", raisedAt: new Date().toISOString(), slaDeadline: new Date(Date.now() + 3 * 86400000).toISOString(), escalatedTo: null, resolutionNotes: null };
  if (!isConfigured) {
    const newG = { id: "grievance_" + Date.now(), ...g };
    _mockGrievances.push(newG);
    notifyGrievances();
    return newG;
  }
  const { collection, addDoc, serverTimestamp } = await import("firebase/firestore");
  const ref = await addDoc(collection(db, "grievances"), { ...g, raisedAt: serverTimestamp() });
  return { id: ref.id, ...g };
}

export async function resolveGrievance(grievanceId, resolutionNotes) {
  if (!isConfigured) {
    const g = _mockGrievances.find(x => x.id === grievanceId);
    if (g) { g.status = "resolved"; g.resolutionNotes = resolutionNotes; }
    notifyGrievances();
    return;
  }
  const { doc, updateDoc, serverTimestamp } = await import("firebase/firestore");
  await updateDoc(doc(db, "grievances", grievanceId), { status: "resolved", resolutionNotes, resolvedAt: serverTimestamp() });
}

// ─── ANALYTICS ───────────────────────────────────────────────────────────────

export function getAnalyticsData() {
  return {
    bookingsByHour: [
      { hour: "8 AM", count: 12 }, { hour: "9 AM", count: 18 },
      { hour: "10 AM", count: 22 }, { hour: "11 AM", count: 8 },
      { hour: "12 PM", count: 3 },  { hour: "2 PM",  count: 15 },
      { hour: "3 PM",  count: 11 },
    ],
    dailyCapacity: 60,
    totalBooked: 50,
    pendingPayments: [
      { bookingId: "booking_020", farmerName: "வேலையன்",  daysStuck: 9, amount: 41200 },
      { bookingId: "booking_015", farmerName: "சுந்தரி",   daysStuck: 7, amount: 35750 },
      { bookingId: "booking_008", farmerName: "நாகராஜன்", daysStuck: 5, amount: 52100 },
    ],
    channelMix: { app: 38, whatsapp: 7, ivr: 3, voice_assistant: 2 },
    predictedVsActual: [
      { token: 31, predicted: 35, actual: 38 },
      { token: 35, predicted: 67, actual: 72 },
      { token: 40, predicted: 107, actual: 98 },
      { token: 44, predicted: 139, actual: 145 },
    ],
  };
}

export async function getStateOverview() {
  if (!isConfigured) {
    const districts = MOCK_DISTRICTS.map((district) => ({ ...district }));
    return { districts, totalFarmers:districts.reduce((sum, d) => sum + d.farmers, 0), totalVolumeQuintals:districts.reduce((sum, d) => sum + d.volumeQuintals, 0), totalValue:districts.reduce((sum, d) => sum + d.value, 0), grievanceBacklog:districts.reduce((sum, d) => sum + d.grievanceBacklog, 0), channelMix:getAnalyticsData().channelMix };
  }
  const { httpsCallable } = await import("firebase/functions");
  return (await httpsCallable(functions, "getStateOverview")()).data;
}

// ─── WAIT TIME ────────────────────────────────────────────────────────────────

export async function predictWaitTime({ currentQueueDepth }) {
  // ~8 min per farmer, client-side heuristic. Replace with FastAPI call post-hackathon.
  return { estimatedWaitMinutes: Math.round(currentQueueDepth * 8) };
}
