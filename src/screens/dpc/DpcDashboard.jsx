import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  getDpcSession,
  saveDpcSession,
  clearDpcSession,
  subscribeToQueue,
  advanceQueue,
  checkInToken,
  updateProcurementStage,
  getDpcLiveStats,
  getAllMspRates,
  getDpcCentres,
  MOCK_DPC_CENTRES
} from "../../firebase/firestoreService";
import { useI18n } from "../../i18n/I18nContext";
import { sendPaymentCreditSMS } from "../../services/smsService";

export default function DpcDashboard() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const [session, setSession] = useState(() => getDpcSession() || { dpcId: "dpc_ponneri", dpcName: "பொன்னேரி DPC", officerName: "DPC Officer" });
  const [centre, setCentre] = useState(null);
  const [centresList, setCentresList] = useState(MOCK_DPC_CENTRES);
  const [activeTab, setActiveTab] = useState("queue"); // 'queue' | 'lab' | 'dispatch' | 'report'
  const [mspRates, setMspRates] = useState({});
  const [stats, setStats] = useState({});

  // Active farmer being processed in the lab modal
  const [selectedFarmer, setSelectedFarmer] = useState(null);
  const [processingStage, setProcessingStage] = useState("weighing"); // 'weighing' | 'receipt'

  // Lab form values
  const [moisture, setMoisture] = useState(16.5);
  const [grossWeight, setGrossWeight] = useState(2500);
  const [tareWeight, setTareWeight] = useState(100);
  const [grade, setGrade] = useState("grade_a"); // 'common' | 'grade_a'
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [receiptData, setReceiptData] = useState(null);

  // Lorry dispatch state
  const [dispatches, setDispatches] = useState([
    { id: "DISP-TN-8821", lorryNo: "TN 49 AZ 1204", driverName: "செல்வராஜ்", bags: 250, destination: "தஞ்சாவூர் நவீன அரிசி ஆலை (MRM)", time: "09:30 AM", status: "In Transit" },
    { id: "DISP-TN-8822", lorryNo: "TN 50 K 8901", driverName: "முருகேசன்", bags: 300, destination: "மன்னார்குடி TNCSC சேமிப்புக் கிடங்கு", time: "11:15 AM", status: "Delivered" },
  ]);
  const [newLorryNo, setNewLorryNo] = useState("");
  const [newDriver, setNewDriver] = useState("");
  const [newBags, setNewBags] = useState("200");
  const [newDest, setNewDest] = useState("தஞ்சாவூர் நவீன அரிசி ஆலை (MRM)");
  const [dispatchSuccess, setDispatchSuccess] = useState(false);

  // Manual search token
  const [searchToken, setSearchToken] = useState("");
  const [checkInMsg, setCheckInMsg] = useState("");

  useEffect(() => {
    getDpcCentres().then(items => {
      if (items?.length) setCentresList(items);
    });
    getAllMspRates().then(setMspRates);
    const unsub = subscribeToQueue(session.dpcId, (data) => {
      setCentre(data);
      setStats(getDpcLiveStats(session.dpcId));
    });
    return unsub;
  }, [session.dpcId]);

  if (!session) return null;

  const queue = centre?.queue || [];
  const servingToken = centre?.currentServingToken || 31;

  // Real-time calculations for the Moisture & Weighment Lab
  const currentMsp = grade === "grade_a" ? 2203 : 2183;
  const rawNetWeight = Math.max(0, Number(grossWeight || 0) - Number(tareWeight || 0));

  // TNCSC Moisture Rule: Standard threshold is 17%. For each 1% over 17%, 1% weight deduction
  const excessMoisture = Math.max(0, Number(moisture || 0) - 17.0);
  const moistureDeductionKg = Math.round((rawNetWeight * excessMoisture) / 100);
  const finalProcuredWeightKg = Math.max(0, rawNetWeight - moistureDeductionKg);
  const finalQuintals = (finalProcuredWeightKg / 100).toFixed(2);
  const totalPayoutAmt = Math.round(Number(finalQuintals) * currentMsp);
  const bagsCount = Math.round(finalProcuredWeightKg / 40);

  const handleOpenLab = (farmer) => {
    setSelectedFarmer(farmer);
    const estGross = farmer.grossWeightKg || 2400;
    setGrossWeight(estGross);
    setTareWeight(100);
    setMoisture(16.5);
    setProcessingStage("weighing");
    setReceiptData(null);
  };

  const handleAdvanceQueue = async () => {
    await advanceQueue(session.dpcId);
  };

  const handleCheckIn = async (tokenNo) => {
    try {
      setCheckInMsg("");
      const res = await checkInToken({ dpcId: session.dpcId, tokenNumber: tokenNo });
      setCheckInMsg(`✓ Token #${res.tokenNumber} (${res.farmerName}) Checked in!`);
      setTimeout(() => setCheckInMsg(""), 4000);
    } catch (e) {
      setCheckInMsg(`⚠️ ${e.message}`);
    }
  };

  const handleConfirmDisbursement = async () => {
    if (!selectedFarmer) return;
    setIsSubmitting(true);

    const generatedTxId = `TNCSC-DBT-${Date.now().toString().slice(-8)}`;
    const payload = {
      grossWeightKg: Number(grossWeight),
      tareWeightKg: Number(tareWeight),
      moisturePercent: Number(moisture),
      moistureDeductionKg: moistureDeductionKg,
      netWeightKg: finalProcuredWeightKg,
      quantityQuintals: Number(finalQuintals),
      mspRate: currentMsp,
      totalAmount: totalPayoutAmt,
      bagsCount: bagsCount,
      paymentTxId: generatedTxId,
      paidAt: new Date().toISOString(),
      grade: grade === "grade_a" ? "Grade A (தரம் ஏ)" : "Common (பொது ரகம்)",
    };

    await updateProcurementStage({
      dpcId: session.dpcId,
      tokenNumber: selectedFarmer.tokenNumber,
      stage: "paid",
      weighData: payload
    });

    // 📲 Dispatch DBT Payment Credit SMS
    try {
      await sendPaymentCreditSMS(selectedFarmer.mobile || "9876543210", {
        ...payload,
        farmerName: selectedFarmer.farmerName,
        tokenNumber: selectedFarmer.tokenNumber,
      });
    } catch { }

    setIsSubmitting(false);
    setReceiptData({
      ...payload,
      farmerName: selectedFarmer.farmerName,
      farmerId: selectedFarmer.farmerId || "TN-UZH-2026-8921",
      tokenNumber: selectedFarmer.tokenNumber,
      surveyNumber: selectedFarmer.surveyNumber || "142/3A",
      village: selectedFarmer.village || "திருவாரூர்",
      dpcName: session.dpcName,
    });
    setProcessingStage("receipt");
    setStats(getDpcLiveStats(session.dpcId));
  };

  const handleCreateLorryDispatch = (e) => {
    e.preventDefault();
    if (!newLorryNo.trim() || !newDriver.trim()) return;
    const newEntry = {
      id: `DISP-TN-${Date.now().toString().slice(-4)}`,
      lorryNo: newLorryNo.toUpperCase(),
      driverName: newDriver,
      bags: Number(newBags),
      destination: newDest,
      time: new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }),
      status: "In Transit",
    };
    setDispatches([newEntry, ...dispatches]);
    setNewLorryNo("");
    setNewDriver("");
    setDispatchSuccess(true);
    setTimeout(() => setDispatchSuccess(false), 4000);
  };

  return (
    <div style={{ minHeight: "100vh", background: "rgba(20,12,3,0.85)", paddingBottom: 90, position: "relative" }}>
      {/* Background Cover */}
      <img
        src="/images/paddy_landscape_bg.jpg"
        alt=""
        aria-hidden="true"
        style={{
          position: "fixed",
          inset: 0,
          width: "100%",
          height: "100%",
          objectFit: "cover",
          objectPosition: "center 30%",
          zIndex: 0,
        }}
      />
      <div aria-hidden style={{
        position: "fixed",
        inset: 0,
        zIndex: 1,
        background: "linear-gradient(180deg, rgba(20,12,3,0.72) 0%, rgba(20,12,3,0.60) 40%, rgba(20,12,3,0.82) 100%)",
        pointerEvents: "none",
      }} />

      <div style={{ position: "relative", zIndex: 2 }}>
        {/* Top Official Header Banner */}
        <header style={{
          background: "linear-gradient(135deg, #1B3B2B, #0E2419)",
          borderBottom: "3px solid var(--paddy-gold-500)",
          padding: "var(--sp-4) var(--sp-6)",
          color: "var(--paper)",
          boxShadow: "var(--sh-md)",
        }}>
          <div style={{
            maxWidth: 1080,
            margin: "0 auto",
            display: "flex",
            flexWrap: "wrap",
            justifyContent: "space-between",
            alignItems: "center",
            gap: "var(--sp-3)",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{
                width: 44, height: 44, borderRadius: "50%",
                background: "var(--paddy-gold-500)", color: "var(--earth-900)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 22, fontWeight: 900, border: "2px solid white",
              }}>
                🏢
              </div>
              <div>
                <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: 1.5, color: "var(--paddy-gold-200)", fontWeight: 700 }}>
                  தமிழ்நாடு நுகர்பொருள் வாணிபக் கழகம் · TNCSC Official
                </div>
                <h1 style={{ fontFamily: "var(--font-display)", fontSize: "var(--fs-xl)", margin: 0, color: "white", fontWeight: 800 }}>
                  {session.dpcName} · {t("dpc_dashboard_title", "கொள்முதல் நிலைய கட்டுப்பாட்டு அறை")}
                </h1>
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              {/* DPC Center Switcher */}
              <div style={{ display: "flex", alignItems: "center", gap: 6, background: "rgba(0,0,0,0.35)", padding: "4px 8px", borderRadius: "var(--r-md)", border: "1.5px solid var(--paddy-gold-400)" }}>
                <span style={{ fontSize: 13, color: "var(--paddy-gold-200)", fontWeight: 700 }}>மையம்:</span>
                <select
                  value={session.dpcId}
                  onChange={(e) => {
                    const chosenId = e.target.value;
                    const found = centresList.find(c => c.id === chosenId);
                    if (found) {
                      const updated = { ...session, dpcId: found.id, dpcName: found.name };
                      saveDpcSession(updated);
                      setSession(updated);
                    }
                  }}
                  style={{
                    background: "rgba(255,255,255,0.95)",
                    color: "var(--earth-900)",
                    fontWeight: 800,
                    fontSize: "var(--fs-xs)",
                    borderRadius: "var(--r-sm)",
                    padding: "4px 8px",
                    border: "none",
                    cursor: "pointer",
                    minWidth: 160,
                  }}
                >
                  {centresList.map(c => (
                    <option key={c.id} value={c.id}>
                      🏢 {c.name} ({c.nameEn})
                    </option>
                  ))}
                </select>
              </div>

              <div style={{
                background: "rgba(255,255,255,0.12)",
                padding: "6px 14px",
                borderRadius: "var(--r-md)",
                border: "1px solid rgba(255,255,255,0.2)",
                fontSize: "var(--fs-xs)",
                fontWeight: 600,
                color: "var(--paper)",
              }}>
                👤 அலுவலர்: <strong>கே. அன்பழகன் (DPC In-Charge)</strong>
              </div>
              <button
                onClick={() => { clearDpcSession(); navigate("/dpc", { replace: true }); }}
                style={{
                  padding: "6px 14px",
                  background: "#C2251C",
                  color: "white",
                  border: "none",
                  borderRadius: "var(--r-md)",
                  fontSize: "var(--fs-xs)",
                  fontWeight: 800,
                  cursor: "pointer",
                }}
              >
                {t("dpc_logout")} ↪
              </button>
            </div>
          </div>
        </header>

        {/* Live Executive KPI Cards */}
        <div style={{ maxWidth: 1080, margin: "var(--sp-4) auto 0", padding: "0 var(--sp-4)" }}>
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
            gap: "var(--sp-3)",
          }}>
            {/* KPI 1: Serving Token */}
            <div style={{
              background: "linear-gradient(145deg, #FFFDF8, #FAF3E0)",
              borderRadius: "var(--r-lg)",
              padding: "var(--sp-4)",
              border: "2px solid var(--paddy-gold-400)",
              boxShadow: "0 8px 20px rgba(0,0,0,0.25)",
            }}>
              <div style={{ fontSize: "var(--fs-xs)", color: "var(--ink-700)", fontWeight: 700 }}>
                📢 {t("dpc_token_serving")}
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginTop: 4 }}>
                <span style={{ fontFamily: "var(--font-display)", fontSize: 38, fontWeight: 900, color: "var(--vermilion-500)", lineHeight: 1 }}>
                  #{servingToken}
                </span>
                <button
                  onClick={handleAdvanceQueue}
                  style={{
                    padding: "4px 10px",
                    background: "var(--vermilion-500)",
                    color: "white",
                    border: "none",
                    borderRadius: "var(--r-sm)",
                    fontWeight: 800,
                    fontSize: 11,
                    cursor: "pointer",
                  }}
                >
                  ▶ {t("dpc_call_next")}
                </button>
              </div>
            </div>

            {/* KPI 2: Total Procured Quintals */}
            <div style={{
              background: "linear-gradient(145deg, #FFFDF8, #FAF3E0)",
              borderRadius: "var(--r-lg)",
              padding: "var(--sp-4)",
              border: "2px solid var(--paddy-gold-400)",
              boxShadow: "0 8px 20px rgba(0,0,0,0.25)",
            }}>
              <div style={{ fontSize: "var(--fs-xs)", color: "var(--ink-700)", fontWeight: 700 }}>
                🌾 இன்றைய கொள்முதல் (Procured)
              </div>
              <div style={{ fontFamily: "var(--font-display)", fontSize: 32, fontWeight: 900, color: "#1B5E20", marginTop: 4 }}>
                {stats.totalProcuredQuintals || "56.0"} <span style={{ fontSize: "var(--fs-sm)", fontWeight: 700 }}>குவிண்டால்</span>
              </div>
            </div>

            {/* KPI 3: Total DBT Disbursed */}
            <div style={{
              background: "linear-gradient(145deg, #FFFDF8, #FAF3E0)",
              borderRadius: "var(--r-lg)",
              padding: "var(--sp-4)",
              border: "2px solid var(--paddy-gold-400)",
              boxShadow: "0 8px 20px rgba(0,0,0,0.25)",
            }}>
              <div style={{ fontSize: "var(--fs-xs)", color: "var(--ink-700)", fontWeight: 700 }}>
                💳 நேரடி வங்கி வரவு (DBT Paid)
              </div>
              <div style={{ fontFamily: "var(--font-display)", fontSize: 30, fontWeight: 900, color: "var(--earth-700)", marginTop: 4 }}>
                ₹{(Number(stats.totalDisbursedCrores || 1.72) * 100000).toLocaleString("en-IN")}
              </div>
            </div>

            {/* KPI 4: Gunny Bag Inventory */}
            <div style={{
              background: "linear-gradient(145deg, #FFFDF8, #FAF3E0)",
              borderRadius: "var(--r-lg)",
              padding: "var(--sp-4)",
              border: "2px solid var(--paddy-gold-400)",
              boxShadow: "0 8px 20px rgba(0,0,0,0.25)",
            }}>
              <div style={{ fontSize: "var(--fs-xs)", color: "var(--ink-700)", fontWeight: 700 }}>
                📦 சாக்கு பை இருப்பு (40kg Bags)
              </div>
              <div style={{ fontFamily: "var(--font-display)", fontSize: 30, fontWeight: 900, color: "#0D47A1", marginTop: 4 }}>
                {stats.gunnyBagsStock || 1250} <span style={{ fontSize: "var(--fs-xs)", color: "var(--ink-700)" }}>இருப்பு</span>
              </div>
            </div>
          </div>

          {/* Navigation Workstation Tabs */}
          <div style={{
            display: "flex",
            gap: 8,
            margin: "var(--sp-4) 0 var(--sp-4)",
            overflowX: "auto",
            paddingBottom: 4,
          }}>
            {[
              { id: "queue", icon: "📋", label: t("dpc_tab_queue", "நேரடி வரிசை & சரிபார்ப்பு") },
              { id: "lab", icon: "⚖️", label: t("dpc_tab_lab", "ஈரப்பதம் & எடை மேடை (Lab)") },
              { id: "dispatch", icon: "🚛", label: t("dpc_tab_dispatch", "கிடங்கு லாரி ஏற்றுமதி") },
              { id: "report", icon: "📊", label: "நாள் நிறைவு அறிக்கை (Day Ledger)" },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  padding: "10px 18px",
                  borderRadius: "var(--r-md)",
                  border: activeTab === tab.id ? "2px solid var(--vermilion-500)" : "1px solid rgba(255,255,255,0.3)",
                  background: activeTab === tab.id ? "var(--vermilion-500)" : "rgba(255, 253, 248, 0.92)",
                  color: activeTab === tab.id ? "white" : "var(--earth-800)",
                  fontFamily: "var(--font-display)",
                  fontWeight: 800,
                  fontSize: "var(--fs-sm)",
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  whiteSpace: "nowrap",
                  boxShadow: activeTab === tab.id ? "0 4px 12px rgba(194,37,28,0.4)" : "none",
                }}
              >
                <span>{tab.icon}</span>
                <span>{tab.label}</span>
              </button>
            ))}
          </div>

          {/* TAB 1: LIVE QUEUE & CHECK-IN */}
          {activeTab === "queue" && (
            <div style={{
              background: "linear-gradient(145deg, rgba(255, 253, 248, 0.98), rgba(251, 243, 220, 0.98))",
              backdropFilter: "blur(16px)",
              borderRadius: "var(--r-xl)",
              border: "2px solid var(--paddy-gold-400)",
              padding: "var(--sp-5)",
              boxShadow: "0 16px 40px rgba(0,0,0,0.4)",
            }}>
              {/* Quick Check-in Bar */}
              <div style={{
                display: "flex",
                flexWrap: "wrap",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 12,
                padding: "var(--sp-3) var(--sp-4)",
                background: "#FFF9E8",
                border: "2px solid var(--paddy-gold-400)",
                borderRadius: "var(--r-lg)",
                marginBottom: "var(--sp-4)",
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, flex: 1, minWidth: 260 }}>
                  <span style={{ fontSize: 20 }}>📷</span>
                  <input
                    type="number"
                    value={searchToken}
                    onChange={(e) => setSearchToken(e.target.value)}
                    placeholder="டோக்கன் எண் உள்ளிடவும் (e.g. 47)..."
                    style={{
                      flex: 1, minHeight: 44, padding: "0 14px",
                      borderRadius: "var(--r-md)", border: "2px solid var(--tarpaulin-300)",
                      fontSize: "var(--fs-sm)", fontWeight: 700,
                    }}
                  />
                  <button
                    onClick={() => { if (searchToken) handleCheckIn(searchToken); }}
                    style={{
                      minHeight: 44, padding: "0 18px",
                      background: "var(--earth-700)", color: "white",
                      border: "none", borderRadius: "var(--r-md)",
                      fontWeight: 800, cursor: "pointer",
                    }}
                  >
                    Check In ✓
                  </button>
                </div>
                {checkInMsg && (
                  <div style={{ fontWeight: 800, fontSize: "var(--fs-sm)", color: checkInMsg.startsWith("✓") ? "#1B5E20" : "#C2251C" }}>
                    {checkInMsg}
                  </div>
                )}
              </div>

              {/* Live Queue Table */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <h2 style={{ fontFamily: "var(--font-display)", fontSize: "var(--fs-lg)", margin: 0, color: "var(--earth-800)", fontWeight: 800 }}>
                  📋 இன்றைய உழவர் பட்டியல் (Today's Booked Farmers - {queue.length})
                </h2>
                <span style={{ fontSize: "var(--fs-xs)", color: "var(--ink-700)", fontWeight: 600 }}>
                  தற்போது சேவை: #{servingToken}
                </span>
              </div>

              <div style={{ display: "grid", gap: 10 }}>
                {queue.map((farmer) => {
                  const isCurrent = farmer.tokenNumber === servingToken;
                  const isPaid = farmer.status === "paid";
                  const isArrived = farmer.status === "arrived" || farmer.status === "weighing" || farmer.status === "approved";

                  return (
                    <div
                      key={farmer.tokenNumber}
                      style={{
                        display: "flex",
                        flexWrap: "wrap",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: 12,
                        padding: "var(--sp-3) var(--sp-4)",
                        background: isCurrent ? "#FFF9EC" : isPaid ? "#F1F8F1" : "white",
                        border: isCurrent ? "2px solid var(--vermilion-500)" : isPaid ? "1.5px solid #81C784" : "1.5px solid var(--tarpaulin-300)",
                        borderRadius: "var(--r-lg)",
                        boxShadow: "var(--sh-sm)",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                        <div style={{
                          width: 44, height: 44, borderRadius: "50%",
                          background: isCurrent ? "var(--vermilion-500)" : isPaid ? "#2E7D32" : "var(--tarpaulin-100)",
                          color: isCurrent || isPaid ? "white" : "var(--earth-800)",
                          display: "flex", alignItems: "center", justifyContent: "center",
                          fontFamily: "var(--font-mono)", fontWeight: 900, fontSize: "var(--fs-md)",
                        }}>
                          #{farmer.tokenNumber}
                        </div>
                        <div>
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <strong style={{ fontSize: "var(--fs-md)", color: "var(--ink-900)" }}>
                              {farmer.farmerName}
                            </strong>
                            {farmer.isCurrentFarmer && (
                              <span style={{ background: "var(--paddy-gold-500)", color: "var(--earth-900)", fontSize: 10, fontWeight: 800, padding: "2px 6px", borderRadius: 4 }}>
                                Live Farmer
                              </span>
                            )}
                            {farmer.surveyNumber && (
                              <span style={{ fontSize: 11, color: "var(--earth-700)", fontWeight: 700 }}>
                                📍 சர்வே: #{farmer.surveyNumber}
                              </span>
                            )}
                          </div>
                          <div style={{ fontSize: "var(--fs-xs)", color: "var(--ink-700)", marginTop: 2, display: "flex", gap: 10 }}>
                            <span>🌾 {farmer.crop}</span>
                            <span>·</span>
                            <span>📦 {farmer.qty}</span>
                            <span>·</span>
                            <span>📱 {farmer.mobile || "9876543210"}</span>
                          </div>
                        </div>
                      </div>

                      {/* Action & Status Badges */}
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div style={{
                          padding: "4px 10px",
                          borderRadius: 20,
                          fontSize: 11,
                          fontWeight: 800,
                          background: isPaid ? "#E8F5E9" : isArrived ? "#FFF8E1" : "var(--tarpaulin-100)",
                          color: isPaid ? "#1B5E20" : isArrived ? "#8A6000" : "var(--ink-700)",
                          border: isPaid ? "1px solid #4CAF50" : isArrived ? "1px solid #FFE082" : "1px solid var(--tarpaulin-300)",
                        }}>
                          {isPaid ? "✓ Paid (பணம் செலுத்தப்பட்டது)" : isArrived ? "⏳ Arrived / Weighing" : "📅 Booked"}
                        </div>

                        {!isPaid && (
                          <button
                            onClick={() => handleOpenLab(farmer)}
                            style={{
                              padding: "8px 16px",
                              background: isCurrent ? "var(--vermilion-500)" : "var(--earth-700)",
                              color: "white",
                              border: "none",
                              borderRadius: "var(--r-md)",
                              fontWeight: 800,
                              fontSize: "var(--fs-xs)",
                              cursor: "pointer",
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 6,
                              boxShadow: "0 2px 6px rgba(0,0,0,0.2)",
                            }}
                          >
                            <span>⚖️</span>
                            <span>{t("procure_farmer", "கொள்முதல் செய்க")} →</span>
                          </button>
                        )}

                        {isPaid && (
                          <button
                            onClick={() => handleOpenLab(farmer)}
                            style={{
                              padding: "8px 14px",
                              background: "#FFFFFF",
                              color: "#1B5E20",
                              border: "1.5px solid #2E7D32",
                              borderRadius: "var(--r-md)",
                              fontWeight: 800,
                              fontSize: "var(--fs-xs)",
                              cursor: "pointer",
                            }}
                          >
                            📄 ரசீது காண்
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 2: DIGITAL MOISTURE & WEIGHBRIDGE LAB (STANDALONE WORKSTATION) */}
          {activeTab === "lab" && (
            <div style={{
              background: "linear-gradient(145deg, rgba(255, 253, 248, 0.98), rgba(251, 243, 220, 0.98))",
              backdropFilter: "blur(16px)",
              borderRadius: "var(--r-xl)",
              border: "2px solid var(--paddy-gold-400)",
              padding: "var(--sp-6)",
              boxShadow: "0 16px 40px rgba(0,0,0,0.4)",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: "var(--sp-4)", borderBottom: "2px solid var(--paddy-gold-200)", paddingBottom: "var(--sp-3)" }}>
                <span style={{ fontSize: 28 }}>🔬</span>
                <div>
                  <h2 style={{ fontFamily: "var(--font-display)", fontSize: "var(--fs-xl)", margin: 0, color: "var(--earth-800)", fontWeight: 800 }}>
                    டிஜிட்டல் ஈரப்பதம் & எடைமேடை மையம் (Quality Lab & Weighbridge)
                  </h2>
                  <div style={{ fontSize: "var(--fs-xs)", color: "var(--earth-700)", fontWeight: 600, marginTop: 2 }}>
                    TNCSC தரக்கட்டுப்பாடு விதிகள்: 17.0% வரை ஈரப்பதம் அனுமதிக்கப்படும். அதற்கு மேல் 1% கழித்தல்.
                  </div>
                </div>
              </div>

              {/* Select Farmer from active list */}
              <div style={{ marginBottom: "var(--sp-5)" }}>
                <label style={{ display: "block", fontSize: "var(--fs-sm)", fontWeight: 700, color: "var(--ink-900)", marginBottom: 6 }}>
                  கொள்முதல் செய்ய உழவரைத் தேர்ந்தெடுக்கவும் (Select Active Farmer):
                </label>
                <select
                  value={selectedFarmer?.tokenNumber || ""}
                  onChange={(e) => {
                    const found = queue.find(f => f.tokenNumber === Number(e.target.value));
                    if (found) handleOpenLab(found);
                  }}
                  style={{
                    width: "100%", minHeight: 48, padding: "0 14px",
                    borderRadius: "var(--r-md)", border: "2px solid var(--tarpaulin-300)",
                    fontSize: "var(--fs-md)", fontWeight: 700, background: "white", color: "var(--ink-900)",
                  }}
                >
                  <option value="">— வரிசையில் உள்ள உழவரைத் தேர்ந்தெடுக்கவும் —</option>
                  {queue.map(f => (
                    <option key={f.tokenNumber} value={f.tokenNumber}>
                      Token #{f.tokenNumber} · {f.farmerName} ({f.crop} · சர்வே: #{f.surveyNumber || "142/3A"}) — {f.status.toUpperCase()}
                    </option>
                  ))}
                </select>
              </div>

              {/* Moisture & Weighment Interactive Panel */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "var(--sp-4)" }}>
                {/* 1. Moisture Meter Simulator */}
                <div style={{
                  background: "#FFFFFF",
                  borderRadius: "var(--r-lg)",
                  border: moisture > 17 ? "2px solid #F57C00" : "2px solid #81C784",
                  padding: "var(--sp-4)",
                  boxShadow: "var(--sh-sm)",
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                    <span style={{ fontWeight: 800, fontSize: "var(--fs-sm)", color: "var(--earth-800)" }}>
                      💧 டிஜிட்டல் ஈரப்பதம் மீட்டர் (Moisture Meter)
                    </span>
                    <span style={{
                      padding: "2px 8px", borderRadius: 12, fontSize: 11, fontWeight: 800,
                      background: moisture <= 17 ? "#E8F5E9" : "#FFF3E0",
                      color: moisture <= 17 ? "#1B5E20" : "#E65100",
                    }}>
                      {moisture <= 17 ? "தகுதி (Normal)" : `+${(moisture - 17).toFixed(1)}% கூடுதல் ஈரப்பதம்`}
                    </span>
                  </div>

                  <div style={{ textAlign: "center", padding: "12px 0" }}>
                    <div style={{ fontFamily: "var(--font-display)", fontSize: 44, fontWeight: 900, color: moisture > 17 ? "#E65100" : "#1B5E20", lineHeight: 1 }}>
                      {Number(moisture).toFixed(1)}%
                    </div>
                    <div style={{ fontSize: "var(--fs-xs)", color: "var(--ink-700)", marginTop: 4, fontWeight: 600 }}>
                      TNCSC Standard Threshold: 17.0% Max
                    </div>
                  </div>

                  <input
                    type="range"
                    min="12.0"
                    max="22.0"
                    step="0.1"
                    value={moisture}
                    onChange={(e) => setMoisture(parseFloat(e.target.value))}
                    style={{ width: "100%", accentColor: moisture > 17 ? "#F57C00" : "#2E7D32", cursor: "pointer" }}
                  />
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "var(--ink-700)", fontWeight: 700, marginTop: 4 }}>
                    <span>12.0% (மிக உலர்)</span>
                    <span>17.0% (அரசு வரம்பு)</span>
                    <span>22.0% (அதிக ஈரம்)</span>
                  </div>
                </div>

                {/* 2. Weighbridge Capture (Gross & Tare) */}
                <div style={{
                  background: "#FFFFFF",
                  borderRadius: "var(--r-lg)",
                  border: "2px solid var(--paddy-gold-400)",
                  padding: "var(--sp-4)",
                  boxShadow: "var(--sh-sm)",
                }}>
                  <span style={{ fontWeight: 800, fontSize: "var(--fs-sm)", color: "var(--earth-800)", display: "block", marginBottom: 8 }}>
                    ⚖️ மின் எடைமேடை பதிவு (Weighbridge Gross & Tare)
                  </span>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
                    <div>
                      <label style={{ fontSize: 11, fontWeight: 700, color: "var(--ink-700)", display: "block", marginBottom: 2 }}>
                        வாகன மொத்த எடை (Gross Kg)
                      </label>
                      <input
                        type="number"
                        value={grossWeight}
                        onChange={(e) => setGrossWeight(e.target.value)}
                        style={{ width: "100%", minHeight: 40, padding: "0 10px", borderRadius: "var(--r-md)", border: "2px solid var(--tarpaulin-300)", fontWeight: 800 }}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: 11, fontWeight: 700, color: "var(--ink-700)", display: "block", marginBottom: 2 }}>
                        டிராக்டர்/வாகன எடை (Tare Kg)
                      </label>
                      <input
                        type="number"
                        value={tareWeight}
                        onChange={(e) => setTareWeight(e.target.value)}
                        style={{ width: "100%", minHeight: 40, padding: "0 10px", borderRadius: "var(--r-md)", border: "2px solid var(--tarpaulin-300)", fontWeight: 800 }}
                      />
                    </div>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                    <div>
                      <label style={{ fontSize: 11, fontWeight: 700, color: "var(--ink-700)", display: "block", marginBottom: 2 }}>
                        பயிர் தரம் (Grain Grade)
                      </label>
                      <select
                        value={grade}
                        onChange={(e) => setGrade(e.target.value)}
                        style={{ width: "100%", minHeight: 40, padding: "0 8px", borderRadius: "var(--r-md)", border: "2px solid var(--tarpaulin-300)", fontWeight: 700, fontSize: "var(--fs-xs)" }}
                      >
                        <option value="grade_a">Grade A (தரம் ஏ - ₹2,203/qtl)</option>
                        <option value="common">Common (பொது ரகம் - ₹2,183/qtl)</option>
                      </select>
                    </div>
                    <div>
                      <label style={{ fontSize: 11, fontWeight: 700, color: "var(--ink-700)", display: "block", marginBottom: 2 }}>
                        சாக்கு மூட்டை (40kg Bags)
                      </label>
                      <div style={{ minHeight: 40, background: "var(--paper)", display: "flex", alignItems: "center", padding: "0 10px", borderRadius: "var(--r-md)", border: "1px solid var(--paddy-gold-300)", fontWeight: 800, color: "var(--earth-800)" }}>
                        {bagsCount} மூட்டைகள்
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Live Computation Bill Summary */}
              <div style={{
                marginTop: "var(--sp-4)",
                background: "#FFF9EC",
                borderRadius: "var(--r-lg)",
                border: "2px solid var(--paddy-gold-500)",
                padding: "var(--sp-4)",
              }}>
                <div style={{ fontWeight: 800, fontSize: "var(--fs-md)", color: "var(--earth-800)", marginBottom: 8 }}>
                  🧾 அரசு கொள்முதல் கணக்கீடு சுருக்கம் (Procurement Calculation)
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 10, fontSize: "var(--fs-sm)" }}>
                  <div>
                    <span style={{ color: "var(--ink-700)" }}>நிகர எடை (Raw Net): </span>
                    <strong style={{ color: "var(--ink-900)" }}>{rawNetWeight} kg</strong>
                  </div>
                  <div>
                    <span style={{ color: "var(--ink-700)" }}>ஈரப்பதம் கழித்தல்: </span>
                    <strong style={{ color: "#C2251C" }}>- {moistureDeductionKg} kg ({excessMoisture > 0 ? `${excessMoisture.toFixed(1)}%` : "0%"})</strong>
                  </div>
                  <div>
                    <span style={{ color: "var(--ink-700)" }}>இறுதி கொள்முதல் எடை: </span>
                    <strong style={{ color: "#1B5E20" }}>{finalProcuredWeightKg} kg ({finalQuintals} qtl)</strong>
                  </div>
                  <div>
                    <span style={{ color: "var(--ink-700)" }}>MSP வீதம்: </span>
                    <strong style={{ color: "var(--earth-800)" }}>₹{currentMsp}/qtl</strong>
                  </div>
                </div>

                <div style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginTop: "var(--sp-3)",
                  paddingTop: "var(--sp-3)",
                  borderTop: "2px dashed var(--paddy-gold-400)",
                }}>
                  <div>
                    <span style={{ fontSize: "var(--fs-xs)", color: "var(--ink-700)", fontWeight: 700 }}>உழவர் கணக்கில் வரவு வைக்கப்படும் தொகை (Total DBT Payout):</span>
                    <div style={{ fontFamily: "var(--font-display)", fontSize: 32, fontWeight: 900, color: "var(--vermilion-500)" }}>
                      ₹{totalPayoutAmt.toLocaleString("en-IN")}
                    </div>
                  </div>

                  <button
                    disabled={!selectedFarmer || isSubmitting || selectedFarmer.status === "paid"}
                    onClick={handleConfirmDisbursement}
                    style={{
                      padding: "12px 28px",
                      background: selectedFarmer?.status === "paid" ? "#81C784" : "var(--vermilion-500)",
                      color: "white",
                      border: "none",
                      borderRadius: "var(--r-md)",
                      fontFamily: "var(--font-display)",
                      fontWeight: 900,
                      fontSize: "var(--fs-md)",
                      cursor: selectedFarmer?.status === "paid" ? "default" : "pointer",
                      boxShadow: "0 4px 14px rgba(194,37,28,0.4)",
                    }}
                  >
                    {isSubmitting ? "பரிவர்த்தனை நடக்கிறது..." : selectedFarmer?.status === "paid" ? "✓ ஏற்கனவே செலுத்தப்பட்டது" : "💳 DBT மூலம் பணம் வரவு செய் →"}
                  </button>
                </div>
              </div>

              {/* Generated E-Receipt Modal / Card */}
              {receiptData && (
                <div style={{
                  marginTop: "var(--sp-5)",
                  background: "#FFFFFF",
                  border: "3px solid #2E7D32",
                  borderRadius: "var(--r-xl)",
                  overflow: "hidden",
                  boxShadow: "0 12px 32px rgba(46,125,50,0.25)",
                }}>
                  <div style={{ background: "linear-gradient(90deg, #1B5E20, #2E7D32)", color: "white", padding: "var(--sp-3) var(--sp-5)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <div style={{ fontSize: 10, letterSpacing: 1, textTransform: "uppercase", color: "var(--paddy-gold-200)", fontWeight: 800 }}>தமிழ்நாடு நுகர்பொருள் வாணிபக் கழகம் · TNCSC</div>
                      <div style={{ fontFamily: "var(--font-display)", fontSize: "var(--fs-md)", fontWeight: 900 }}>நேரடி கொள்முதல் ரசீது & வங்கி பரிவர்த்தனை ஆவணம்</div>
                    </div>
                    <span style={{ background: "white", color: "#1B5E20", padding: "3px 10px", borderRadius: 12, fontSize: 11, fontWeight: 900 }}>
                      ✓ DBT APPROVED
                    </span>
                  </div>

                  <div style={{ padding: "var(--sp-4)" }}>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, fontSize: "var(--fs-xs)", marginBottom: 12 }}>
                      <div><strong>உழவர் பெயர்:</strong> {receiptData.farmerName}</div>
                      <div><strong>உழவர் எண்:</strong> {receiptData.farmerId}</div>
                      <div><strong>DPC மையம்:</strong> {receiptData.dpcName}</div>
                      <div><strong>சர்வே எண்:</strong> #{receiptData.surveyNumber}</div>
                      <div><strong>பரிவர்த்தனை ID:</strong> <span style={{ fontFamily: "var(--font-mono)", color: "var(--vermilion-500)", fontWeight: 800 }}>{receiptData.paymentTxId}</span></div>
                      <div><strong>தேதி & நேரம்:</strong> {new Date().toLocaleString("ta-IN")}</div>
                    </div>

                    <div style={{ display: "flex", justifyContent: "space-between", background: "#E8F5E9", padding: "var(--sp-3)", borderRadius: "var(--r-md)", fontWeight: 800, fontSize: "var(--fs-sm)", color: "#1B5E20" }}>
                      <span>மொத்த கொள்முதல்: {receiptData.quantityQuintals} qtl ({receiptData.bagsCount} மூட்டைகள்)</span>
                      <span>வரவு தொகை: ₹{receiptData.totalAmount.toLocaleString("en-IN")}</span>
                    </div>

                    <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 12 }}>
                      <button
                        onClick={() => window.print()}
                        style={{ padding: "6px 16px", background: "var(--earth-700)", color: "white", border: "none", borderRadius: "var(--r-md)", fontWeight: 700, fontSize: "var(--fs-xs)", cursor: "pointer" }}
                      >
                        🖨️ ரசீதை அச்சிடு (Print)
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: GODOWN & RICE MILL LORRY DISPATCH */}
          {activeTab === "dispatch" && (
            <div style={{
              background: "linear-gradient(145deg, rgba(255, 253, 248, 0.98), rgba(251, 243, 220, 0.98))",
              backdropFilter: "blur(16px)",
              borderRadius: "var(--r-xl)",
              border: "2px solid var(--paddy-gold-400)",
              padding: "var(--sp-6)",
              boxShadow: "0 16px 40px rgba(0,0,0,0.4)",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: "var(--sp-4)", borderBottom: "2px solid var(--paddy-gold-200)", paddingBottom: "var(--sp-3)" }}>
                <span style={{ fontSize: 28 }}>🚛</span>
                <div>
                  <h2 style={{ fontFamily: "var(--font-display)", fontSize: "var(--fs-xl)", margin: 0, color: "var(--earth-800)", fontWeight: 800 }}>
                    நவீன நெல் அரவை ஆலை / சேமிப்பு கிடங்கு லாரி ஏற்றுமதி
                  </h2>
                  <div style={{ fontSize: "var(--fs-xs)", color: "var(--earth-700)", fontWeight: 600, marginTop: 2 }}>
                    TNCSC Modern Rice Mills (MRM) & Godown Lifting Gate Pass
                  </div>
                </div>
              </div>

              {/* Lorry Gate Pass Generator Form */}
              <form onSubmit={handleCreateLorryDispatch} style={{
                background: "#FFFDF5",
                border: "2px solid var(--paddy-gold-300)",
                borderRadius: "var(--r-lg)",
                padding: "var(--sp-4)",
                marginBottom: "var(--sp-5)",
              }}>
                <div style={{ fontWeight: 800, fontSize: "var(--fs-sm)", color: "var(--earth-800)", marginBottom: 8 }}>
                  + புதிய லாரி கேட் பாஸ் உருவாக்கு (Generate Lorry Gate Pass)
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 10, marginBottom: 12 }}>
                  <div>
                    <label style={{ fontSize: 11, fontWeight: 700, color: "var(--ink-700)", display: "block", marginBottom: 2 }}>லாரி பதிவு எண் (Lorry No.)</label>
                    <input
                      type="text"
                      placeholder="எ.கா: TN 49 BY 7741"
                      value={newLorryNo}
                      onChange={(e) => setNewLorryNo(e.target.value)}
                      required
                      style={{ width: "100%", minHeight: 40, padding: "0 10px", borderRadius: "var(--r-md)", border: "2px solid var(--tarpaulin-300)", fontWeight: 700 }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: 11, fontWeight: 700, color: "var(--ink-700)", display: "block", marginBottom: 2 }}>ஓட்டுநர் பெயர் (Driver Name)</label>
                    <input
                      type="text"
                      placeholder="எ.கா: கே. பாலசுப்ரமணியன்"
                      value={newDriver}
                      onChange={(e) => setNewDriver(e.target.value)}
                      required
                      style={{ width: "100%", minHeight: 40, padding: "0 10px", borderRadius: "var(--r-md)", border: "2px solid var(--tarpaulin-300)", fontWeight: 700 }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: 11, fontWeight: 700, color: "var(--ink-700)", display: "block", marginBottom: 2 }}>சாக்கு மூட்டைகள் (Bags)</label>
                    <input
                      type="number"
                      value={newBags}
                      onChange={(e) => setNewBags(e.target.value)}
                      required
                      style={{ width: "100%", minHeight: 40, padding: "0 10px", borderRadius: "var(--r-md)", border: "2px solid var(--tarpaulin-300)", fontWeight: 700 }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: 11, fontWeight: 700, color: "var(--ink-700)", display: "block", marginBottom: 2 }}>சேருமிடம் (Destination Mill/Godown)</label>
                    <select
                      value={newDest}
                      onChange={(e) => setNewDest(e.target.value)}
                      style={{ width: "100%", minHeight: 40, padding: "0 8px", borderRadius: "var(--r-md)", border: "2px solid var(--tarpaulin-300)", fontWeight: 700, fontSize: "var(--fs-xs)" }}
                    >
                      <option value="தஞ்சாவூர் நவீன அரிசி ஆலை (MRM)">தஞ்சாவூர் நவீன அரிசி ஆலை (MRM)</option>
                      <option value="மன்னார்குடி TNCSC சேமிப்புக் கிடங்கு">மன்னார்குடி TNCSC சேமிப்புக் கிடங்கு</option>
                      <option value="திருவாரூர் நேரடி அரவை மையம்">திருவாரூர் நேரடி அரவை மையம்</option>
                    </select>
                  </div>
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  {dispatchSuccess && (
                    <span style={{ color: "#1B5E20", fontWeight: 800, fontSize: "var(--fs-sm)" }}>
                      ✓ லாரி கேட் பாஸ் வெற்றிகரமாக உருவாக்கப்பட்டது!
                    </span>
                  )}
                  <div style={{ flex: 1 }} />
                  <button
                    type="submit"
                    style={{
                      padding: "8px 20px",
                      background: "var(--earth-700)",
                      color: "white",
                      border: "none",
                      borderRadius: "var(--r-md)",
                      fontWeight: 800,
                      fontSize: "var(--fs-sm)",
                      cursor: "pointer",
                    }}
                  >
                    🚛 கேட் பாஸ் வெளியிடு (Generate Gate Pass)
                  </button>
                </div>
              </form>

              {/* Lorry Dispatches Log Table */}
              <div style={{ fontWeight: 800, fontSize: "var(--fs-md)", color: "var(--earth-800)", marginBottom: 10 }}>
                📋 இன்றைய லாரி ஏற்றுமதி வரலாறு (Today's Dispatches - {dispatches.length})
              </div>

              <div style={{ display: "grid", gap: 8 }}>
                {dispatches.map(d => (
                  <div key={d.id} style={{
                    display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center",
                    padding: "var(--sp-3) var(--sp-4)", background: "white", borderRadius: "var(--r-md)",
                    border: "1px solid var(--tarpaulin-300)", boxShadow: "var(--sh-sm)",
                  }}>
                    <div>
                      <div style={{ fontWeight: 800, fontSize: "var(--fs-sm)", color: "var(--ink-900)" }}>
                        🚛 {d.lorryNo} · {d.driverName}
                      </div>
                      <div style={{ fontSize: "var(--fs-xs)", color: "var(--ink-700)", marginTop: 2 }}>
                        📍 {d.destination} · ⏱ {d.time}
                      </div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontWeight: 800, color: "var(--earth-800)", fontSize: "var(--fs-sm)" }}>
                        {d.bags} மூட்டைகள் ({((d.bags * 40) / 100).toFixed(1)} qtl)
                      </div>
                      <span style={{ fontSize: 10, fontWeight: 800, color: d.status === "Delivered" ? "#1B5E20" : "#F57C00" }}>
                        ● {d.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 4: DAY-END PROCUREMENT REGISTER */}
          {activeTab === "report" && (
            <div style={{
              background: "linear-gradient(145deg, rgba(255, 253, 248, 0.98), rgba(251, 243, 220, 0.98))",
              backdropFilter: "blur(16px)",
              borderRadius: "var(--r-xl)",
              border: "2px solid var(--paddy-gold-400)",
              padding: "var(--sp-6)",
              boxShadow: "0 16px 40px rgba(0,0,0,0.4)",
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "var(--sp-4)", borderBottom: "2px solid var(--paddy-gold-200)", paddingBottom: "var(--sp-3)" }}>
                <div>
                  <h2 style={{ fontFamily: "var(--font-display)", fontSize: "var(--fs-xl)", margin: 0, color: "var(--earth-800)", fontWeight: 800 }}>
                    📊 நாள் நிறைவு கொள்முதல் பதிவேடு (Day-End Register)
                  </h2>
                  <div style={{ fontSize: "var(--fs-xs)", color: "var(--earth-700)", fontWeight: 600, marginTop: 2 }}>
                    TNCSC நேரடி நெல் கொள்முதல் தினசரி தணிக்கை அறிக்கை
                  </div>
                </div>
                <button
                  onClick={() => window.print()}
                  style={{ padding: "6px 14px", background: "var(--earth-700)", color: "white", border: "none", borderRadius: "var(--r-md)", fontWeight: 800, fontSize: "var(--fs-xs)", cursor: "pointer" }}
                >
                  📥 பதிவிறக்கு (PDF/CSV)
                </button>
              </div>

              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "var(--fs-xs)", textAlign: "left" }}>
                  <thead>
                    <tr style={{ background: "var(--paddy-gold-100)", borderBottom: "2px solid var(--paddy-gold-400)", color: "var(--earth-800)" }}>
                      <th style={{ padding: 10 }}>டோக்கன்</th>
                      <th style={{ padding: 10 }}>உழவர் பெயர்</th>
                      <th style={{ padding: 10 }}>சர்வே எண்</th>
                      <th style={{ padding: 10 }}>பயிர் ரகம்</th>
                      <th style={{ padding: 10 }}>ஈரப்பதம்</th>
                      <th style={{ padding: 10 }}>கொள்முதல் எடை</th>
                      <th style={{ padding: 10 }}>தொகை (₹)</th>
                      <th style={{ padding: 10 }}>நிலை</th>
                    </tr>
                  </thead>
                  <tbody>
                    {queue.map(item => (
                      <tr key={item.tokenNumber} style={{ borderBottom: "1px solid var(--tarpaulin-100)" }}>
                        <td style={{ padding: 10, fontWeight: 800 }}>#{item.tokenNumber}</td>
                        <td style={{ padding: 10, fontWeight: 700 }}>{item.farmerName}</td>
                        <td style={{ padding: 10 }}>#{item.surveyNumber || "142/3A"}</td>
                        <td style={{ padding: 10 }}>{item.crop}</td>
                        <td style={{ padding: 10 }}>{item.moisturePercent ? `${item.moisturePercent}%` : "16.5%"}</td>
                        <td style={{ padding: 10, fontWeight: 700 }}>{item.netWeightKg ? `${item.netWeightKg} kg` : `${item.qty}`}</td>
                        <td style={{ padding: 10, fontWeight: 800, color: "var(--earth-800)" }}>₹{(item.totalAmount || 49773).toLocaleString("en-IN")}</td>
                        <td style={{ padding: 10 }}>
                          <span style={{ padding: "2px 8px", borderRadius: 8, fontSize: 10, fontWeight: 800, background: item.status === "paid" ? "#E8F5E9" : "#FFF8E1", color: item.status === "paid" ? "#1B5E20" : "#8A6000" }}>
                            {item.status.toUpperCase()}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
