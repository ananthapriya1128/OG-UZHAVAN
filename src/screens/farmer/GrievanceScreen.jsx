import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useI18n } from "../../i18n/I18nContext";
import { getCurrentFarmer, getCurrentBooking, subscribeToFarmerGrievances, createGrievance } from "../../firebase/firestoreService";
import FormField from "../../components/FormField";

const STATUS_STYLE = {
  open:      { bg:"#FFF0F0", border:"var(--vermilion-500)", icon:"🔴", textColor:"var(--vermilion-500)" },
  escalated: { bg:"#FFF8E1", border:"var(--paddy-gold-500)", icon:"🟡", textColor:"#8A6000" },
  resolved:  { bg:"#EAF5EA", border:"#3A7A1E", icon:"🟢", textColor:"#3A7A1E" },
};

export default function GrievanceScreen() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const farmer = getCurrentFarmer();
  const booking = getCurrentBooking();
  const [grievances, setGrievances] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ category:"", description:"" });
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const unsub = subscribeToFarmerGrievances(farmer.id || "farmer_001", setGrievances);
    return unsub;
  }, [farmer.id]);

  const catOptions = [
    { value:"payment_delay",    label: t("grievance_payment_delay") },
    { value:"quality_dispute",  label: t("grievance_quality_dispute") },
    { value:"queue_issue",      label: t("grievance_queue_issue") },
    { value:"other",            label: t("grievance_other") },
  ];

  const submit = async () => {
    if (!form.category || !form.description.trim()) return;
    setSubmitting(true);
    await createGrievance({ farmerId: farmer.id || "farmer_001", bookingId: booking?.id || "booking_001", dpcId: booking?.dpcId || "dpc_ponneri", category: form.category, description: form.description });
    setSubmitting(false);
    setSuccess(true);
    setShowForm(false);
    setForm({ category:"", description:"" });
    setTimeout(() => setSuccess(false), 3000);
  };

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
      <div style={{ background:"linear-gradient(135deg,#8A4FCF,#5A1FAF)", padding:"var(--sp-6)", color:"var(--paper)", display:"flex", alignItems:"center", gap:"var(--sp-3)" }}>
        <button onClick={() => navigate("/farmer")} style={{ background:"none", border:"none", color:"var(--paper)", fontSize:22, cursor:"pointer" }}>←</button>
        <div style={{ fontFamily:"var(--font-display)", fontSize:"var(--fs-xl)", fontWeight:700 }}>📝 {t("grievance_title")}</div>
      </div>

      <div style={{ padding:"var(--sp-5)", maxWidth:"var(--content-max)", margin:"0 auto" }}>
        {success && (
          <div style={{ background:"#EAF5EA", border:"2px solid #3A7A1E", borderRadius:"var(--r-lg)", padding:"var(--sp-4)", marginBottom:"var(--sp-4)", textAlign:"center", fontWeight:700, color:"#3A7A1E" }}>
            ✓ {t("grievance_submit")} — {t("booking_success")}
          </div>
        )}

        <button
          onClick={() => setShowForm(!showForm)}
          style={{
            width:"100%", minHeight:52, marginBottom:"var(--sp-5)",
            background:"#8A4FCF", color:"white", borderRadius:"var(--r-md)",
            fontFamily:"var(--font-display)", fontWeight:800, fontSize:"var(--fs-lg)", border:"none", cursor:"pointer",
          }}
        >+ {t("grievance_new")}</button>

        {/* New grievance form */}
        {showForm && (
          <div style={{ background:"var(--paper)", borderRadius:"var(--r-lg)", padding:"var(--sp-5)", marginBottom:"var(--sp-5)", boxShadow:"var(--sh-md)", border:"2px solid #D0B0F0" }}>
            <div style={{ display:"flex", flexDirection:"column", gap:"var(--sp-4)" }}>
              <FormField id="g_cat" label={t("grievance_category")} value={form.category} onChange={(v) => setForm(p=>({...p,category:v}))} options={catOptions} required />
              <FormField id="g_desc" label={t("grievance_description")} value={form.description} onChange={(v) => setForm(p=>({...p,description:v}))} required placeholder="உங்கள் புகாரை விவரமாக எழுதுங்கள்..." />
            </div>
            <div style={{ display:"flex", gap:"var(--sp-3)", marginTop:"var(--sp-4)" }}>
              <button onClick={() => setShowForm(false)} style={{ flex:1, minHeight:48, background:"var(--tarpaulin-100)", border:"2px solid var(--tarpaulin-300)", borderRadius:"var(--r-md)", fontWeight:700, cursor:"pointer" }}>{t("cancel")}</button>
              <button
                onClick={submit} disabled={submitting || !form.category || !form.description.trim()}
                style={{ flex:2, minHeight:48, background: form.category&&form.description?"#8A4FCF":"var(--tarpaulin-300)", color:"white", borderRadius:"var(--r-md)", fontFamily:"var(--font-display)", fontWeight:800, border:"none", cursor:"pointer" }}
              >{submitting ? "..." : t("submit")}</button>
            </div>
          </div>
        )}

        {/* Existing grievances */}
        <div style={{ fontFamily:"var(--font-display)", fontWeight:800, fontSize:"var(--fs-lg)", color:"var(--paper)", marginBottom:"var(--sp-3)", textShadow:"0 2px 6px rgba(0,0,0,0.5)" }}>
          {t("grievance_title")} ({grievances.length})
        </div>
        {grievances.length === 0 ? (
          <div style={{ textAlign:"center", padding:"var(--sp-8)", color:"var(--ink-500)" }}>புகார்கள் எதுவும் இல்லை</div>
        ) : grievances.map(g => {
          const s = STATUS_STYLE[g.status] || STATUS_STYLE.open;
          return (
            <div key={g.id} style={{ background:s.bg, border:`2px solid ${s.border}`, borderRadius:"var(--r-lg)", padding:"var(--sp-4)", marginBottom:"var(--sp-3)" }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:"var(--sp-2)" }}>
                <div style={{ fontWeight:700, color:s.textColor, fontSize:"var(--fs-sm)" }}>
                  {s.icon} {t("grievance_" + g.category) || g.category}
                </div>
                <div style={{ fontSize:"var(--fs-xs)", color:s.textColor, fontWeight:700, background:"white", borderRadius:12, padding:"2px 8px", border:`1px solid ${s.border}` }}>
                  {t("grievance_" + g.status) || g.status}
                </div>
              </div>
              <div style={{ fontSize:"var(--fs-sm)", color:"var(--ink-700)", marginBottom:"var(--sp-2)" }}>{g.description}</div>
              {g.resolutionNotes && (
                <div style={{ fontSize:"var(--fs-xs)", color:"#3A7A1E", fontWeight:600, background:"white", borderRadius:"var(--r-md)", padding:"var(--sp-2)" }}>
                  ✓ {t("resolution_notes")}: {g.resolutionNotes}
                </div>
              )}
              <div style={{ fontSize:"var(--fs-xs)", color:"var(--ink-500)", marginTop:"var(--sp-2)" }}>
                {new Date(g.raisedAt).toLocaleDateString("ta-IN")}
              </div>
            </div>
          );
        })}
      </div>
      </div>
    </div>
  );
}
