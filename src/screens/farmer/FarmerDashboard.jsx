import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useI18n } from "../../i18n/I18nContext";
import {
  getCurrentFarmer,
  getCurrentBooking,
  subscribeToQueue,
  subscribeToBooking,
  cancelBooking,
  getMockServingToken
} from "../../firebase/firestoreService";

const PIPELINE = ["st_1_booked","st_2_arrived","st_3_weighed","st_4_procured","st_5_paid"];
const STATUS_IDX = { booked:0, arrived:1, weighing:2, weighed:2, approved:3, procured:3, paid:4 };

function PipelineStepper({ status }) {
  const { t } = useI18n();
  const cur = STATUS_IDX[status] ?? 0;
  return (
    <div style={{ display:"flex", alignItems:"center", gap:0, margin:"var(--sp-4) 0" }}>
      {PIPELINE.map((key, i) => (
        <div key={key} style={{ display:"flex", alignItems:"center", flex:1 }}>
          <div style={{ display:"flex", flexDirection:"column", alignItems:"center", flex:1 }}>
            <div style={{
              width:28, height:28, borderRadius:"50%",
              background: i <= cur ? "var(--vermilion-500)" : "var(--tarpaulin-300)",
              display:"flex", alignItems:"center", justifyContent:"center",
              color:"white", fontSize:12, fontWeight:700,
              border: i === cur ? "3px solid var(--paddy-gold-500)" : "2px solid transparent",
              transition:"all .3s",
            }}>{i < cur ? "✓" : i+1}</div>
            <div style={{ fontSize:9, color: i<=cur?"var(--vermilion-500)":"var(--ink-500)", marginTop:4, textAlign:"center", fontWeight:600, lineHeight:1.2, maxWidth:48 }}>
              {t(key)}
            </div>
          </div>
          {i < PIPELINE.length-1 && (
            <div style={{ height:3, flex:0.5, background: i < cur ? "var(--vermilion-500)" : "var(--tarpaulin-300)", marginBottom:18 }} />
          )}
        </div>
      ))}
    </div>
  );
}

function QuickAction({ icon, label, route, color }) {
  const navigate = useNavigate();
  return (
    <button onClick={() => navigate(route)} style={{
      display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center",
      gap:"var(--sp-2)", padding:"var(--sp-4) var(--sp-3)",
      background:"var(--paper)", borderRadius:"var(--r-lg)",
      border:"2px solid var(--paddy-gold-200)",
      boxShadow:"var(--sh-sm)", cursor:"pointer", flex:1,
      minHeight:80,
    }}>
      <span style={{ fontSize:26 }}>{icon}</span>
      <span style={{ fontSize:11, fontWeight:700, color:"var(--earth-700)", fontFamily:"var(--font-body)", textAlign:"center", lineHeight:1.2 }}>{label}</span>
    </button>
  );
}

export default function FarmerDashboard() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const farmer = getCurrentFarmer();
  const [booking, setBooking] = useState(getCurrentBooking());
  const [servingToken, setServingToken] = useState(getMockServingToken());
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelSuccessMsg, setCancelSuccessMsg] = useState("");
  const [isCancelling, setIsCancelling] = useState(false);

  useEffect(() => {
    // Subscribe to live booking updates
    const unsubBooking = subscribeToBooking(booking?.id || "default", (updated) => {
      if (updated && updated.status !== "cancelled") {
        setBooking(updated);
      } else {
        setBooking(null);
      }
    });

    const unsubQueue = subscribeToQueue(booking?.dpcId || "dpc_ponneri", (state) => {
      setServingToken(state.currentServingToken);
    });

    return () => {
      unsubBooking();
      unsubQueue();
    };
  }, [booking?.dpcId, booking?.id]);

  const ahead = booking ? Math.max(0, booking.tokenNumber - servingToken - 1) : 0;
  const estWait = ahead * 8;
  const leaveIn = Math.max(0, estWait - 15);
  const isPaid = booking?.status === "paid";

  const handleCancelBooking = async () => {
    if (!booking) return;
    setIsCancelling(true);
    await cancelBooking(booking.id, farmer.id);
    setIsCancelling(false);
    setShowCancelModal(false);
    setBooking(null);
    setCancelSuccessMsg("முன்பதிவு வெற்றிகரமாக ரத்து செய்யப்பட்டது. புதிய இட ஒதுக்கீடு செய்யலாம்.");
    setTimeout(() => setCancelSuccessMsg(""), 5000);
  };

  return (
    <div style={{ minHeight:"100vh", background:"rgba(20,12,3,0.82)", paddingBottom:80, position:"relative" }}>
      {/* Full-screen paddy landscape background */}
      <img
        src="/images/paddy_landscape_bg.jpg"
        alt=""
        aria-hidden="true"
        style={{
          position:"fixed", inset:0, width:"100%", height:"100%",
          objectFit:"cover", objectPosition:"center 30%", zIndex:0,
        }}
      />
      <div aria-hidden style={{
        position:"fixed", inset:0, zIndex:1,
        background:"linear-gradient(180deg, rgba(20,12,3,0.68) 0%, rgba(20,12,3,0.55) 40%, rgba(20,12,3,0.78) 100%)",
        pointerEvents:"none",
      }} />
      <div style={{ position:"relative", zIndex:2 }}>
      
      {/* Header */}
      <div style={{
        position: "relative",
        overflow: "hidden",
        background: "linear-gradient(135deg, var(--earth-700), #2A1A06)",
        padding: "var(--sp-8) var(--sp-6) var(--sp-6)",
        color: "var(--paper)",
        boxShadow: "var(--sh-md)",
      }}>
        <img
          src="/images/paddy_landscape_bg.jpg"
          alt=""
          aria-hidden="true"
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            objectFit: "cover",
            objectPosition: "center 35%",
            opacity: 0.28,
          }}
        />
        <div style={{
          position: "absolute",
          inset: 0,
          background: "linear-gradient(180deg, rgba(42,26,6,0.7) 0%, rgba(42,26,6,0.92) 100%)",
        }} />

        <div style={{ position: "relative", zIndex: 2 }}>
          <div style={{ fontSize: "var(--fs-sm)", opacity: .85, marginBottom: 4 }}>{t("dash_greeting")},</div>
          <div style={{ fontFamily: "var(--font-display)", fontSize: "var(--fs-2xl)", fontWeight: 800, textShadow: "0 2px 4px rgba(0,0,0,0.4)" }}>
            {farmer.name}
          </div>
          <div style={{ fontSize: "var(--fs-sm)", opacity: .9, marginTop: 2 }}>
            🌾 {farmer.village} · {farmer.district}
          </div>
          <div style={{ display: "inline-flex", gap: 8, alignItems: "center", background: "rgba(0,0,0,0.4)", backdropFilter: "blur(4px)", border: "1px solid rgba(255,255,255,0.2)", padding: "5px 12px", borderRadius: 8, marginTop: 10, fontSize: "var(--fs-xs)", color: "var(--paddy-gold-200)", fontWeight: 600 }}>
            <span>📍 சர்வே: <strong>#{farmer.surveyNumber || "142/3A"}</strong></span>
            <span>·</span>
            <span>பட்டா: <strong>{farmer.pattaNumber || "PAT-45210"}</strong></span>
            <span>·</span>
            <span style={{ color: "#99FF99" }}>✓ VAO Verified</span>
          </div>
        </div>
      </div>

      <div style={{ padding:"var(--sp-5) var(--sp-5)", maxWidth:"var(--content-max)", margin:"0 auto" }}>

        {cancelSuccessMsg && (
          <div style={{
            background: "#E8F5E9",
            border: "2px solid #4CAF50",
            color: "#1B5E20",
            padding: "var(--sp-3)",
            borderRadius: "var(--r-md)",
            fontWeight: 800,
            fontSize: "var(--fs-sm)",
            marginBottom: "var(--sp-4)",
            textAlign: "center",
          }}>
            ✓ {cancelSuccessMsg}
          </div>
        )}

        {/* ─── PAYMENT CREDITED CELEBRATION BANNER (WHEN PAID BY DPC) ─── */}
        {isPaid && (
          <div style={{
            background: "linear-gradient(135deg, #1B5E20, #2E7D32)",
            color: "white",
            borderRadius: "var(--r-xl)",
            padding: "var(--sp-5)",
            marginBottom: "var(--sp-5)",
            border: "3px solid #81C784",
            boxShadow: "0 10px 30px rgba(27,94,32,0.4)",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <span style={{ fontSize: 36 }}>💰</span>
              <div>
                <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: 1, color: "var(--paddy-gold-200)", fontWeight: 800 }}>
                  தமிழ்நாடு அரசு நேரடி கொள்முதல் · TNCSC
                </div>
                <div style={{ fontFamily: "var(--font-display)", fontSize: "var(--fs-xl)", fontWeight: 900 }}>
                  பணம் உங்கள் வங்கிக் கணக்கில் வரவு வைக்கப்பட்டது! ✓
                </div>
              </div>
            </div>

            <div style={{
              background: "rgba(255,255,255,0.15)",
              borderRadius: "var(--r-md)",
              padding: "var(--sp-3) var(--sp-4)",
              marginTop: "var(--sp-3)",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: 8,
            }}>
              <div>
                <div style={{ fontSize: "var(--fs-xs)", opacity: 0.9 }}>பரிவர்த்தனை ID (DBT Txn UTR):</div>
                <div style={{ fontFamily: "var(--font-mono)", fontWeight: 800, fontSize: "var(--fs-sm)", color: "var(--paddy-gold-200)" }}>
                  {booking.paymentTxId || "TNCSC-DBT-99214018"}
                </div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: "var(--fs-xs)", opacity: 0.9 }}>மொத்த தொகை:</div>
                <div style={{ fontFamily: "var(--font-display)", fontSize: 26, fontWeight: 900, color: "white" }}>
                  ₹{(booking.totalAmount || 49773).toLocaleString("en-IN")}
                </div>
              </div>
            </div>

            <button
              onClick={() => window.print()}
              style={{
                width: "100%",
                minHeight: 46,
                marginTop: "var(--sp-3)",
                background: "white",
                color: "#1B5E20",
                border: "none",
                borderRadius: "var(--r-md)",
                fontWeight: 900,
                fontSize: "var(--fs-sm)",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 6,
              }}
            >
              📄 {t("print_receipt", "கொள்முதல் ரசீது பதிவிறக்கு (E-Receipt)")}
            </button>
          </div>
        )}

        {/* The one-glance, farmer-first visit plan (if not yet paid). */}
        {booking && !isPaid && (
          <section aria-label={t("visit_today")} style={{
            background: ahead === 0
              ? "linear-gradient(135deg, #B71C1C, #E53935)"
              : "linear-gradient(135deg, #245A3B, var(--success-500))",
            color:"white", borderRadius:"var(--r-lg)", padding:"var(--sp-5)", marginBottom:"var(--sp-5)", boxShadow:"var(--sh-md)"
          }}>
            <div style={{ display:"flex", justifyContent:"space-between", gap:"var(--sp-3)", alignItems:"flex-start" }}>
              <div>
                <div style={{ fontWeight:800, fontSize:"var(--fs-lg)" }}>🗓 {t("visit_today")}</div>
                <div style={{ fontSize:"var(--fs-sm)", opacity:.88, marginTop:4 }}>{t("visit_dpc")}: {booking.dpcName}</div>
              </div>
              <div style={{ background:"rgba(255,255,255,.16)", borderRadius:"var(--r-md)", padding:"var(--sp-2) var(--sp-3)", textAlign:"center" }}>
                <small>{t("token_num")}</small>
                <strong style={{ display:"block", fontSize:"var(--fs-xl)" }}>#{booking.tokenNumber}</strong>
              </div>
            </div>

            <div style={{ margin:"var(--sp-4) 0 var(--sp-3)", padding:"var(--sp-3)", borderRadius:"var(--r-md)", background:"rgba(0,0,0,.22)", fontFamily:"var(--font-display)", fontWeight:800, fontSize:"var(--fs-lg)" }}>
              {servingToken >= booking.tokenNumber
                ? `🚨 உங்கள் டோக்கன் எண் #${booking.tokenNumber} தற்போது அழைக்கப்படுகிறது! DPC மேடையை அணுகவும்.`
                : leaveIn === 0 ? `📍 ${t("leave_now")}` : `🏠 ${t("leave_in", { minutes:leaveIn })}`}
            </div>

            <div style={{ display:"flex", justifyContent:"space-between", fontSize:"var(--fs-sm)", opacity:.92 }}>
              <span>{t("queue_serving")}: <strong>#{servingToken}</strong></span>
              <span><strong>{ahead}</strong> {t("queue_ahead")}</span>
            </div>

            <button onClick={() => navigate("/farmer/queue")} style={{ width:"100%", minHeight:48, marginTop:"var(--sp-4)", background:"white", color:"var(--earth-700)", borderRadius:"var(--r-md)", fontWeight:900, border: "none", cursor: "pointer" }}>
              📊 {t("track_queue")}
            </button>
            <p style={{ margin:"var(--sp-3) 0 0", fontSize:"var(--fs-xs)", opacity:.82 }}>{t("visit_live_note")}</p>
          </section>
        )}

        {/* Active Booking Card */}
        {booking ? (
          <div style={{
            background:"var(--paper)", borderRadius:"var(--r-lg)",
            padding:"var(--sp-5)", marginBottom:"var(--sp-5)",
            boxShadow:"var(--sh-md)", border:"2px solid var(--paddy-gold-300)",
          }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:"var(--sp-3)" }}>
              <div>
                <div style={{ fontSize:"var(--fs-sm)", color:"var(--ink-500)", fontWeight:600 }}>{t("dash_active_booking")}</div>
                <div style={{ fontFamily:"var(--font-display)", fontSize:"var(--fs-xl)", fontWeight:800, color:"var(--earth-700)" }}>
                  {t("token_num")} #{booking.tokenNumber}
                </div>
                <div style={{ fontSize:"var(--fs-sm)", color:"var(--ink-700)", marginTop:2 }}>{booking.dpcName} · {booking.slotTime}</div>
              </div>
              <div style={{
                background: isPaid ? "#2E7D32" : ahead <= 5 ? "var(--vermilion-500)" : "var(--paddy-gold-500)",
                color:"white", borderRadius:"var(--r-md)", padding:"4px 10px",
                fontSize:"var(--fs-sm)", fontWeight:800, textAlign:"center", minWidth:60,
              }}>
                <div style={{ fontSize:18, fontWeight:800 }}>{isPaid ? "✓" : ahead}</div>
                <div style={{ fontSize:9 }}>{isPaid ? "PAID" : t("queue_ahead")}</div>
              </div>
            </div>

            {/* Queue live bar */}
            {!isPaid && (
              <div style={{ background:"var(--earth-50)", borderRadius:"var(--r-md)", padding:"var(--sp-3)", marginBottom:"var(--sp-3)" }}>
                <div style={{ display:"flex", justifyContent:"space-between", fontSize:"var(--fs-sm)", color:"var(--ink-700)", marginBottom:6 }}>
                  <span>{t("queue_serving")}: <strong style={{color:"var(--earth-700)"}}>#{servingToken}</strong></span>
                  <span>{t("queue_estimated_wait")}: <strong style={{color:"var(--vermilion-500)"}}>~{estWait} {t("queue_min")}</strong></span>
                </div>
                <div style={{ height:8, background:"var(--tarpaulin-300)", borderRadius:4, overflow:"hidden" }}>
                  <div style={{
                    height:"100%", borderRadius:4, background:"var(--vermilion-500)",
                    width: `${Math.min(100, (servingToken / booking.tokenNumber) * 100)}%`,
                    transition:"width .8s ease",
                  }} />
                </div>
              </div>
            )}

            <PipelineStepper status={booking.status} />

            {/* Cancel Slot Button */}
            {!isPaid && (
              <div style={{ marginTop: "var(--sp-4)", borderTop: "1px solid var(--tarpaulin-100)", paddingTop: "var(--sp-3)" }}>
                <button
                  type="button"
                  onClick={() => setShowCancelModal(true)}
                  style={{
                    width: "100%",
                    padding: "10px",
                    background: "none",
                    border: "1.5px solid var(--danger-500)",
                    color: "var(--danger-500)",
                    borderRadius: "var(--r-md)",
                    fontWeight: 800,
                    fontSize: "var(--fs-xs)",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 6,
                  }}
                >
                  <span>🗑️</span>
                  <span>{t("cancel_booking", "முன்பதிவை ரத்து செய் (Cancel Slot)")}</span>
                </button>
              </div>
            )}
          </div>
        ) : (
          <div style={{ background:"var(--paper)", borderRadius:"var(--r-lg)", padding:"var(--sp-6)", textAlign:"center", marginBottom:"var(--sp-5)", border:"2px dashed var(--tarpaulin-300)" }}>
            <div style={{ fontSize:40, marginBottom:"var(--sp-3)" }}>🌾</div>
            <div style={{ fontWeight:700, color:"var(--earth-700)", marginBottom:"var(--sp-4)" }}>{t("dash_no_booking")}</div>
            <button
              onClick={() => navigate("/farmer/booking")}
              style={{
                padding: "12px 24px",
                background: "var(--vermilion-500)",
                color: "white",
                border: "none",
                borderRadius: "var(--r-md)",
                fontWeight: 800,
                fontSize: "var(--fs-md)",
                cursor: "pointer",
                boxShadow: "0 4px 12px rgba(194,37,28,0.35)",
              }}
            >
              📅 {t("book_slot")} →
            </button>
          </div>
        )}

        {/* Quick Actions */}
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"var(--sp-3)", marginBottom:"var(--sp-5)" }}>
          <QuickAction icon="🎫" label={t("view_token")}    route="/farmer/token" />
          <QuickAction icon="📊" label={t("track_queue")}   route="/farmer/queue" />
          <QuickAction icon="💰" label={t("calc_msp")}      route="/farmer/msp" />
          <QuickAction icon="📝" label={t("raise_grievance")} route="/farmer/grievance" />
        </div>
        <div style={{ marginTop:"var(--sp-2)" }}>
          <QuickAction icon="📅" label={t("book_slot")} route="/farmer/booking" />
        </div>

        {/* Payment summary card (ONLY shown when booking is PAID) */}
        {isPaid && booking?.totalAmount && (
          <div style={{ background:"var(--paper)", borderRadius:"var(--r-lg)", padding:"var(--sp-5)", marginTop:"var(--sp-5)", boxShadow:"var(--sh-sm)", border: "2px solid #81C784" }}>
            <div style={{ fontFamily:"var(--font-display)", fontWeight:800, fontSize:"var(--fs-lg)", color:"#1B5E20", marginBottom:"var(--sp-4)", display: "flex", alignItems: "center", gap: 8 }}>
              <span>🧾</span>
              <span>{t("pay_title")} · TNCSC கொள்முதல் அறிக்கை</span>
            </div>
            {[
              [t("pay_weighed"),  `${booking.grossWeightKg || 2400} kg`],
              [t("pay_moisture"), (booking.moisturePercent && booking.moisturePercent > 17) ? `- ${booking.moistureDeductionKg} kg (${booking.moisturePercent}%)` : `0 kg (${booking.moisturePercent || 16.5}% - வரம்பிற்குள்)`],
              [t("pay_final"),    `${booking.netWeightKg || 2400} kg (${((booking.netWeightKg || 2400)/100).toFixed(1)} qtl)`],
              [t("pay_msp"),      `₹${booking.mspRate || 2183}/qtl`],
              ["வங்கி கணக்கு",   booking.bankAccount || "SBI · A/C Ending in 8921"],
              ["பரிவர்த்தனை ID",  booking.paymentTxId || "TNCSC-DBT-99214018"],
            ].map(([k,v]) => (
              <div key={k} style={{ display:"flex", justifyContent:"space-between", padding:"var(--sp-2) 0", borderBottom:"1px solid var(--earth-50)", fontSize:"var(--fs-sm)", color:"var(--ink-700)" }}>
                <span>{k}</span><span style={{ fontWeight:700, color:"var(--ink-900)" }}>{v}</span>
              </div>
            ))}
            <div style={{ display:"flex", justifyContent:"space-between", marginTop:"var(--sp-3)", padding:"var(--sp-3)", background:"#E8F5E9", borderRadius:"var(--r-md)", border: "1px solid #C8E6C9" }}>
              <span style={{ fontFamily:"var(--font-display)", fontWeight:800, fontSize:"var(--fs-lg)", color: "#1B5E20" }}>{t("pay_total")}</span>
              <span style={{ fontFamily:"var(--font-display)", fontWeight:800, fontSize:"var(--fs-xl)", color:"#1B5E20" }}>₹{booking.totalAmount.toLocaleString("en-IN")}</span>
            </div>
          </div>
        )}
      </div>
      </div>

      {/* ─── CANCEL SLOT CONFIRMATION MODAL ─── */}
      {showCancelModal && (
        <div style={{
          position: "fixed",
          inset: 0,
          zIndex: 1000,
          background: "rgba(0,0,0,0.65)",
          backdropFilter: "blur(6px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "var(--sp-4)",
        }}>
          <div style={{
            background: "var(--paper)",
            borderRadius: "var(--r-xl)",
            border: "2px solid var(--danger-500)",
            padding: "var(--sp-6)",
            maxWidth: 440,
            width: "100%",
            boxShadow: "0 20px 40px rgba(0,0,0,0.5)",
            textAlign: "center",
          }}>
            <div style={{ fontSize: 44, marginBottom: 8 }}>⚠️</div>
            <h2 style={{ fontFamily: "var(--font-display)", fontSize: "var(--fs-lg)", fontWeight: 800, color: "var(--danger-500)", margin: "0 0 8px" }}>
              {t("cancel_booking_confirm", "முன்பதிவை ரத்து செய்ய விரும்புகிறீர்களா?")}
            </h2>
            <p style={{ fontSize: "var(--fs-xs)", color: "var(--ink-700)", margin: "0 0 var(--sp-5)", lineHeight: 1.5 }}>
              {t("cancel_booking_sub", "உங்கள் இட ஒதுக்கீடு ரத்து செய்யப்பட்டு டோக்கன் விடுவிக்கப்படும். நீங்கள் பின்னர் புதிய தேதியில் மீண்டும் பதிவு செய்யலாம்.")}
            </p>

            <div style={{ display: "flex", gap: 10 }}>
              <button
                type="button"
                onClick={() => setShowCancelModal(false)}
                style={{
                  flex: 1,
                  minHeight: 46,
                  background: "var(--tarpaulin-100)",
                  color: "var(--ink-900)",
                  border: "1px solid var(--tarpaulin-300)",
                  borderRadius: "var(--r-md)",
                  fontWeight: 700,
                  fontSize: "var(--fs-sm)",
                  cursor: "pointer",
                }}
              >
                {t("keep_booking", "வேண்டாம் (Keep)")}
              </button>
              <button
                type="button"
                disabled={isCancelling}
                onClick={handleCancelBooking}
                style={{
                  flex: 1,
                  minHeight: 46,
                  background: "var(--danger-500)",
                  color: "white",
                  border: "none",
                  borderRadius: "var(--r-md)",
                  fontWeight: 800,
                  fontSize: "var(--fs-sm)",
                  cursor: isCancelling ? "not-allowed" : "pointer",
                }}
              >
                {isCancelling ? "ரத்து செய்யப்படுகிறது..." : "ஆம், ரத்து செய் ✓"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
