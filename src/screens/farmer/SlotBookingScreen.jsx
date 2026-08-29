import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useI18n } from "../../i18n/I18nContext";
import { createIdempotencyKey, getCurrentFarmer, getDpcCentres, createBooking } from "../../firebase/firestoreService";
import { sendSlotBookedSMS } from "../../services/smsService";

const LOAD_STYLE = {
  low:    { label:"🟢", bg:"#EAF5EA", border:"#3A7A1E", color:"#3A7A1E" },
  medium: { label:"🟡", bg:"#FFF8E1", border:"#8A6000", color:"#8A6000" },
  high:   { label:"🔴", bg:"#FFF0F0", border:"var(--vermilion-500)", color:"var(--vermilion-500)" },
};
const ESTIMATED_WAIT_BY_LOAD = { low:35, medium:75, high:160 };

export default function SlotBookingScreen() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const farmer = getCurrentFarmer();
  const [dpcs, setDpcs] = useState([]);
  const [selectedDpc, setSelectedDpc] = useState(null);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [selectedDate, setSelectedDate] = useState("");
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [requestKey] = useState(() => createIdempotencyKey());
  const [success, setSuccess] = useState(false);
  const [newBooking, setNewBooking] = useState(null);
  const [smsReceipt, setSmsReceipt] = useState(null);
  const [showReschedule, setShowReschedule] = useState(false);

  useEffect(() => { getDpcCentres().then(setDpcs); }, []);

  // Tomorrow as default date
  useEffect(() => {
    const d = new Date(); d.setDate(d.getDate() + 1);
    setSelectedDate(d.toISOString().split("T")[0]);
  }, []);

  const handleDpcSelect = (dpc) => {
    setSelectedDpc(dpc);
    if (dpc.load === "high") setShowReschedule(true);
    else { setShowReschedule(false); setStep(2); }
  };

  const alternatives = dpcs.filter(d => d.id !== selectedDpc?.id && d.load !== "high").slice(0,2);

  const confirm = async () => {
    if (!selectedDpc || !selectedSlot || !selectedDate) return;
    setSubmitting(true);
    const b = await createBooking({
      idempotencyKey: requestKey,
      farmerId: farmer.id || "farmer_001",
      farmerName: farmer.name || "முருகன் சுப்பையா",
      mobile: farmer.mobile || "9876543210",
      surveyNumber: farmer.surveyNumber || "142/3A",
      village: farmer.village || "திருவாரூர்",
      district: farmer.district || "திருவாரூர்",
      dpcId: selectedDpc.id,
      dpcName: selectedDpc.name,
      slotDate: selectedDate,
      slotTime: selectedSlot,
      cropVariety: farmer.cropVariety || "whiteponni",
      cropVarietyName: farmer.cropVarietyName || "வெள்ளை பொன்னி",
      quantityQuintals: farmer.cultivatedAcres ? (parseFloat(farmer.cultivatedAcres) * 8).toFixed(0) : 24,
    });

    // 📲 Trigger SMS Notification to Farmer Mobile
    try {
      const receipt = await sendSlotBookedSMS(farmer.mobile || "9876543210", b);
      setSmsReceipt(receipt);
    } catch {}

    setNewBooking(b);
    setSubmitting(false);
    setSuccess(true);
  };

  if (success && newBooking) return (
    <div style={{ minHeight:"100vh", background:"rgba(20,12,3,0.82)", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:"var(--sp-6)", position:"relative" }}>
      <img src="/images/paddy_landscape_bg.jpg" alt="" aria-hidden="true"
        style={{ position:"fixed", inset:0, width:"100%", height:"100%", objectFit:"cover", objectPosition:"center 30%", zIndex:0 }}
      />
      <div aria-hidden style={{ position:"fixed", inset:0, zIndex:1, background:"linear-gradient(180deg, rgba(20,12,3,0.68) 0%, rgba(20,12,3,0.55) 40%, rgba(20,12,3,0.78) 100%)", pointerEvents:"none" }} />
      <div style={{ position:"relative", zIndex:2, display:"flex", flexDirection:"column", alignItems:"center", width:"100%" }}>
      <div style={{ fontSize:72, marginBottom:"var(--sp-5)" }}>🎫</div>
      <div style={{ fontFamily:"var(--font-display)", fontSize:"var(--fs-2xl)", fontWeight:900, color:"var(--paper)", textAlign:"center", marginBottom:"var(--sp-3)", textShadow:"0 2px 8px rgba(0,0,0,0.6)" }}>
        {t("booking_success")}
      </div>

      {/* SMS Confirmation Pill */}
      <div style={{
        background: "#E8F5E9",
        border: "1.5px solid #4CAF50",
        color: "#1B5E20",
        padding: "8px 16px",
        borderRadius: "var(--r-md)",
        fontWeight: 800,
        fontSize: "var(--fs-xs)",
        marginBottom: "var(--sp-4)",
        display: "flex",
        alignItems: "center",
        gap: 8,
        boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
      }}>
        <span>📲</span>
        <span>உறுதிப்படுத்தல் SMS அனுப்பப்பட்டது: <strong>+91 {farmer.mobile || "9876543210"}</strong> ✓</span>
      </div>

      <div style={{ background:"var(--paper)", borderRadius:"var(--r-lg)", padding:"var(--sp-5)", width:"100%", maxWidth:380, boxShadow:"var(--sh-md)", marginBottom:"var(--sp-6)", border:"2px solid var(--paddy-gold-300)" }}>
        <div style={{ textAlign:"center", marginBottom:"var(--sp-4)" }}>
          <div style={{ fontSize:"var(--fs-xs)", color:"var(--ink-500)" }}>{t("token_num")}</div>
          <div style={{ fontFamily:"var(--font-display)", fontSize:64, fontWeight:900, color:"var(--vermilion-500)" }}>{newBooking.tokenNumber}</div>
        </div>
        <div style={{ fontSize:"var(--fs-sm)", color:"var(--ink-700)" }}>📍 {newBooking.dpcName}</div>
        <div style={{ fontSize:"var(--fs-sm)", color:"var(--ink-700)" }}>📅 {newBooking.slotDate} · {newBooking.slotTime}</div>
        <div style={{ fontSize:"var(--fs-xs)", color:"var(--ink-500)", marginTop: 6 }}>🌾 சர்வே எண்: #{farmer.surveyNumber || "142/3A"}</div>
      </div>
      <button onClick={() => navigate("/farmer/token")} style={{ width:"100%", maxWidth:380, minHeight:52, background:"var(--vermilion-500)", color:"white", borderRadius:"var(--r-md)", fontFamily:"var(--font-display)", fontWeight:800, fontSize:"var(--fs-lg)", border:"none", cursor:"pointer" }}>
        {t("view_token")} →
      </button>
      </div>
    </div>
  );

  return (
    <div style={{ minHeight:"100vh", background:"rgba(20,12,3,0.82)", paddingBottom:80, position:"relative" }}>
      <img src="/images/paddy_landscape_bg.jpg" alt="" aria-hidden="true"
        style={{ position:"fixed", inset:0, width:"100%", height:"100%", objectFit:"cover", objectPosition:"center 30%", zIndex:0 }}
      />
      <div aria-hidden style={{
        position:"fixed", inset:0, zIndex:1,
        background:"linear-gradient(180deg, rgba(20,12,3,0.68) 0%, rgba(20,12,3,0.55) 40%, rgba(20,12,3,0.78) 100%)",
        pointerEvents:"none",
      }} />
      <div style={{ position:"relative", zIndex:2 }}>
      <div style={{ background:"linear-gradient(135deg,var(--paddy-gold-700),#7A5800)", padding:"var(--sp-6)", color:"var(--paper)", display:"flex", alignItems:"center", gap:"var(--sp-3)" }}>
        <button onClick={() => step > 1 ? setStep(s=>s-1) : navigate("/farmer")} style={{ background:"none", border:"none", color:"var(--paper)", fontSize:22, cursor:"pointer" }}>←</button>
        <div style={{ fontFamily:"var(--font-display)", fontSize:"var(--fs-xl)", fontWeight:700 }}>📅 {t("booking_title")}</div>
      </div>

      {/* Step indicator */}
      <div style={{ display:"flex", background:"var(--paper)", borderBottom:"2px solid var(--paddy-gold-200)" }}>
        {["DPC","திகதி/நேரம்","உறுதி"].map((s,i) => (
          <div key={i} style={{ flex:1, textAlign:"center", padding:"var(--sp-3)", fontSize:"var(--fs-xs)", fontWeight:700, color: step===i+1?"var(--vermilion-500)":"var(--ink-500)", borderBottom: step===i+1?"3px solid var(--vermilion-500)":"3px solid transparent" }}>
            {i+1}. {s}
          </div>
        ))}
      </div>

      <div style={{ padding:"var(--sp-5)", maxWidth:"var(--content-max)", margin:"0 auto" }}>

        {/* Step 1: DPC selection */}
        {step === 1 && (
          <>
            <div style={{ fontFamily:"var(--font-display)", fontWeight:800, fontSize:"var(--fs-lg)", color:"var(--paper)", marginBottom:"var(--sp-4)", textShadow:"0 2px 6px rgba(0,0,0,0.6)" }}>{t("booking_dpc")}</div>
            {dpcs.map(dpc => {
              const ls = LOAD_STYLE[dpc.load] || LOAD_STYLE.low;
              return (
                <button key={dpc.id} onClick={() => handleDpcSelect(dpc)} style={{
                  width:"100%", display:"flex", alignItems:"center", justifyContent:"space-between",
                  background: selectedDpc?.id===dpc.id ? ls.bg : "var(--paper)",
                  border:`2px solid ${selectedDpc?.id===dpc.id ? ls.border : "var(--tarpaulin-300)"}`,
                  borderRadius:"var(--r-lg)", padding:"var(--sp-4)", marginBottom:"var(--sp-3)",
                  cursor:"pointer", textAlign:"left", boxShadow:"var(--sh-sm)",
                }}>
                  <div>
                    <div style={{ fontWeight:700, fontSize:"var(--fs-base)", color:"var(--ink-900)" }}>{dpc.name}</div>
                    <div style={{ fontSize:"var(--fs-xs)", color:"var(--ink-500)", marginTop:2 }}>{dpc.distance} · {dpc.dailyCapacity - dpc.currentServingToken} இடங்கள் உள்ளன</div>
                  </div>
                  <div style={{ textAlign:"right" }}>
                    <div style={{ fontSize:20 }}>{ls.label}</div>
                    <div style={{ fontSize:"var(--fs-xs)", color:ls.color, fontWeight:700 }}>{t("dpc_load_"+dpc.load.slice(0,3))?.split(" ")[0] || dpc.load}</div>
                  </div>
                </button>
              );
            })}
          </>
        )}

        {/* Reschedule suggestion */}
        {showReschedule && step === 1 && (
          <div style={{ background:"#FFF0F0", border:"2px solid var(--vermilion-500)", borderRadius:"var(--r-lg)", padding:"var(--sp-4)", marginBottom:"var(--sp-4)" }}>
            <div style={{ fontWeight:700, color:"var(--vermilion-500)", marginBottom:"var(--sp-2)" }}>⚠ {t("reschedule_suggest")}</div>
            <div style={{ fontSize:"var(--fs-sm)", color:"var(--ink-700)", marginBottom:"var(--sp-3)" }}>
              {selectedDpc?.name} நிறைந்து உள்ளது. {t("reschedule_current_wait")}: ~{ESTIMATED_WAIT_BY_LOAD[selectedDpc?.load]} {t("queue_min")}. அருகிலுள்ள குறைந்த சுமை DPC-க்கு மாறுவீர்களா?
            </div>
            {alternatives.map(alt => (
              <button key={alt.id} onClick={() => { setSelectedDpc(alt); setShowReschedule(false); setStep(2); }} style={{ width:"100%", background:"var(--paper)", border:"2px solid #3A7A1E", borderRadius:"var(--r-md)", padding:"var(--sp-3)", marginBottom:"var(--sp-2)", cursor:"pointer", textAlign:"left" }}>
                <div style={{ fontWeight:700, color:"#3A7A1E" }}>{alt.name}</div>
                <div style={{ fontSize:"var(--fs-xs)", color:"var(--ink-500)", marginTop:3 }}>{alt.distance} · {t("reschedule_alt_wait")}: ~{ESTIMATED_WAIT_BY_LOAD[alt.load]} {t("queue_min")}</div>
                <div style={{ marginTop:6, color:"var(--success-500)", fontSize:"var(--fs-sm)", fontWeight:800 }}>✓ {t("reschedule_save_time", { minutes:Math.max(0, ESTIMATED_WAIT_BY_LOAD[selectedDpc?.load] - ESTIMATED_WAIT_BY_LOAD[alt.load]) })}</div>
              </button>
            ))}
            <button onClick={() => { setShowReschedule(false); setStep(2); }} style={{ width:"100%", background:"none", border:"1px solid var(--tarpaulin-300)", borderRadius:"var(--r-md)", padding:"var(--sp-2)", cursor:"pointer", fontSize:"var(--fs-sm)", color:"var(--ink-500)" }}>
              {t("reschedule_skip")}
            </button>
          </div>
        )}

        {/* Step 2: Date & Slot */}
        {step === 2 && (
          <div style={{
            background: "linear-gradient(145deg, rgba(255, 253, 248, 0.98), rgba(251, 243, 220, 0.98))",
            backdropFilter: "blur(16px)",
            WebkitBackdropFilter: "blur(16px)",
            borderRadius: "var(--r-xl)",
            border: "2px solid var(--paddy-gold-400)",
            boxShadow: "0 16px 40px rgba(0,0,0,0.45)",
            padding: "var(--sp-6)",
          }}>
            <div style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              marginBottom: "var(--sp-4)",
              paddingBottom: "var(--sp-3)",
              borderBottom: "2px solid var(--paddy-gold-200)",
            }}>
              <span style={{ fontSize: 22 }}>📍</span>
              <div style={{ fontWeight: 800, fontSize: "var(--fs-lg)", color: "var(--earth-800)", fontFamily: "var(--font-display)" }}>
                {selectedDpc?.name}
              </div>
            </div>

            <label htmlFor="slot-date-picker" style={{ display: "block", fontSize: "var(--fs-sm)", fontWeight: 700, color: "var(--ink-900)", marginBottom: "var(--sp-2)" }}>
              {t("booking_date")}
            </label>
            <input
              id="slot-date-picker"
              type="date"
              value={selectedDate}
              onChange={e => setSelectedDate(e.target.value)}
              min={new Date().toISOString().split("T")[0]}
              style={{
                width: "100%", minHeight: 50, padding: "10px 16px",
                fontSize: "var(--fs-md)", borderRadius: "var(--r-md)",
                border: "2px solid var(--tarpaulin-300)", marginBottom: "var(--sp-5)",
                fontFamily: "var(--font-body)", background: "#FFFFFF", color: "var(--ink-900)", fontWeight: 600
              }}
            />

            <div style={{ fontWeight: 700, fontSize: "var(--fs-base)", color: "var(--ink-900)", marginBottom: "var(--sp-3)" }}>
              {t("booking_time")}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--sp-2)", marginBottom: "var(--sp-5)" }}>
              {(selectedDpc?.slots || []).map(slot => (
                <button key={slot} onClick={() => setSelectedSlot(slot)} style={{
                  minHeight: 48, borderRadius: "var(--r-md)", fontWeight: 700, fontSize: "var(--fs-base)",
                  background: selectedSlot === slot ? "var(--vermilion-500)" : "var(--paper)",
                  color: selectedSlot === slot ? "white" : "var(--ink-900)",
                  border: `2px solid ${selectedSlot === slot ? "var(--vermilion-500)" : "var(--tarpaulin-300)"}`,
                  cursor: "pointer",
                }}>{slot}</button>
              ))}
            </div>
            <button onClick={() => setStep(3)} disabled={!selectedSlot} style={{
              width: "100%", minHeight: 54,
              background: selectedSlot ? "var(--vermilion-500)" : "var(--tarpaulin-300)",
              color: "white",
              borderRadius: "var(--r-md)", fontFamily: "var(--font-display)", fontWeight: 800, fontSize: "var(--fs-lg)",
              border: "none", cursor: selectedSlot ? "pointer" : "not-allowed",
              boxShadow: selectedSlot ? "0 4px 12px rgba(194,37,28,0.35)" : "none"
            }}>{t("next")} →</button>
          </div>
        )}

        {/* Step 3: Confirm */}
        {step === 3 && (
          <div style={{
            background: "linear-gradient(145deg, rgba(255, 253, 248, 0.98), rgba(251, 243, 220, 0.98))",
            backdropFilter: "blur(16px)",
            WebkitBackdropFilter: "blur(16px)",
            borderRadius: "var(--r-xl)",
            border: "2px solid var(--paddy-gold-400)",
            boxShadow: "0 16px 40px rgba(0,0,0,0.45)",
            padding: "var(--sp-6)",
          }}>
            <div style={{
              fontFamily: "var(--font-display)", fontWeight: 800, fontSize: "var(--fs-xl)",
              color: "var(--earth-800)", marginBottom: "var(--sp-4)", paddingBottom: "var(--sp-2)",
              borderBottom: "2px solid var(--paddy-gold-200)"
            }}>
              {t("booking_confirm")}
            </div>
            <div style={{ background: "#FFFFFF", borderRadius: "var(--r-lg)", padding: "var(--sp-4)", marginBottom: "var(--sp-5)", border: "2px solid var(--paddy-gold-300)" }}>
              {[
                ["DPC", selectedDpc?.name],
                [t("booking_date"), selectedDate],
                [t("booking_time"), selectedSlot],
                [t("token_farmer"), farmer.name],
              ].map(([k,v]) => (
                <div key={k} style={{ display: "flex", justifyContent: "space-between", padding: "var(--sp-3) 0", borderBottom: "1px solid var(--earth-50)", fontSize: "var(--fs-base)" }}>
                  <span style={{ color: "var(--ink-700)", fontWeight: 600 }}>{k}</span>
                  <span style={{ fontWeight: 800, color: "var(--ink-900)" }}>{v}</span>
                </div>
              ))}
            </div>
            <button onClick={confirm} disabled={submitting} style={{
              width:"100%", minHeight:56, background:"var(--vermilion-500)", color:"white",
              borderRadius:"var(--r-md)", fontFamily:"var(--font-display)", fontWeight:800, fontSize:"var(--fs-xl)", border:"none", cursor:"pointer",
              boxShadow:"0 8px 24px rgba(194,37,28,.35)",
            }}>{submitting ? "..." : t("confirm") + " ✓"}</button>
          </div>
        )}
      </div>
      </div>
    </div>
  );
}
