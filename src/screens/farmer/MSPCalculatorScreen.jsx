import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useI18n } from "../../i18n/I18nContext";
import { getAllMspRates } from "../../firebase/firestoreService";
import FormField from "../../components/FormField";

export default function MSPCalculatorScreen() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const [rates, setRates] = useState({});
  const [cropId, setCropId] = useState("whiteponni");
  const [qty, setQty] = useState("");
  const [result, setResult] = useState(null);

  useEffect(() => { getAllMspRates().then(setRates); }, []);

  const cropOptions = Object.entries(rates).map(([id, r]) => ({ value:id, label:r.cropName || r.cropNameEn }));
  const selectedRate = rates[cropId];

  const calculate = () => {
    const q = parseFloat(qty);
    if (!q || !selectedRate) return;
    const gross = q * selectedRate.ratePerQuintal;
    const moisture = gross * 0.05;
    const net = gross - moisture;
    setResult({ gross, moisture, net, rate: selectedRate.ratePerQuintal, qty: q });
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
      <div style={{ background:"linear-gradient(135deg,#3A7A1E,#1E4A0E)", padding:"var(--sp-6)", color:"var(--paper)", display:"flex", alignItems:"center", gap:"var(--sp-3)" }}>
        <button onClick={() => navigate("/farmer")} style={{ background:"none", border:"none", color:"var(--paper)", fontSize:22, cursor:"pointer" }}>←</button>
        <div>
          <div style={{ fontFamily:"var(--font-display)", fontSize:"var(--fs-xl)", fontWeight:700 }}>💰 {t("msp_title")}</div>
          <div style={{ fontSize:"var(--fs-xs)", opacity:.8 }}>MSP 2025-26</div>
        </div>
      </div>

      <div style={{ padding:"var(--sp-6)", maxWidth:"var(--content-max)", margin:"0 auto", display:"flex", flexDirection:"column", gap:"var(--sp-5)" }}>

        {/* Current rates display */}
        <div style={{ background:"var(--paper)", borderRadius:"var(--r-lg)", padding:"var(--sp-5)", boxShadow:"var(--sh-sm)", border:"2px solid #C8E6C9" }}>
          <div style={{ fontWeight:700, color:"#3A7A1E", marginBottom:"var(--sp-3)", fontFamily:"var(--font-display)" }}>தற்போதைய MSP விலைகள் / Current MSP Rates</div>
          {Object.entries(rates).map(([id, r]) => (
            <div key={id} style={{ display:"flex", justifyContent:"space-between", padding:"var(--sp-2) 0", borderBottom:"1px solid var(--earth-50)", fontSize:"var(--fs-sm)" }}>
              <span style={{ color:"var(--ink-700)" }}>{r.cropName}</span>
              <span style={{ fontWeight:800, color:"#3A7A1E" }}>₹{r.ratePerQuintal}/qtl</span>
            </div>
          ))}
        </div>

        {/* Calculator form */}
        <div style={{ background:"var(--paper)", borderRadius:"var(--r-lg)", padding:"var(--sp-5)", boxShadow:"var(--sh-sm)" }}>
          <div style={{ fontWeight:700, color:"var(--earth-700)", marginBottom:"var(--sp-4)", fontFamily:"var(--font-display)", fontSize:"var(--fs-lg)" }}>{t("msp_calculate")}</div>
          <div style={{ display:"flex", flexDirection:"column", gap:"var(--sp-4)" }}>
            <FormField id="msp_crop" label={t("msp_crop")} value={cropId} onChange={setCropId} options={cropOptions} />
            <FormField id="msp_qty"  label={`${t("msp_quantity")} (1-500)`} value={qty} onChange={setQty} type="number" placeholder="உதாரணம்: 24" />
          </div>
          <button
            onClick={calculate}
            disabled={!qty || !selectedRate}
            style={{
              width:"100%", marginTop:"var(--sp-5)", minHeight:52,
              background: qty && selectedRate ? "#3A7A1E" : "var(--tarpaulin-300)",
              color:"white", borderRadius:"var(--r-md)", fontFamily:"var(--font-display)",
              fontWeight:800, fontSize:"var(--fs-lg)", border:"none", cursor: qty?"pointer":"not-allowed",
            }}
          >{t("msp_calculate")} →</button>
        </div>

        {/* Result */}
        {result && (
          <div style={{ background:"var(--paper)", borderRadius:"var(--r-lg)", overflow:"hidden", boxShadow:"var(--sh-md)", border:"2px solid #3A7A1E" }}>
            <div style={{ background:"#3A7A1E", padding:"var(--sp-4) var(--sp-5)", color:"white" }}>
              <div style={{ fontSize:"var(--fs-sm)", opacity:.9 }}>{t("msp_expected")}</div>
              <div style={{ fontFamily:"var(--font-display)", fontSize:36, fontWeight:900 }}>₹{Math.round(result.net).toLocaleString("en-IN")}</div>
            </div>
            <div style={{ padding:"var(--sp-5)" }}>
              {[
                [t("msp_quantity"),  `${result.qty} qtl`],
                [t("msp_rate"),      `₹${result.rate}/qtl`],
                [t("pay_weighed"),   `₹${Math.round(result.gross).toLocaleString("en-IN")}`],
                [t("pay_moisture") + " (~5%)", `- ₹${Math.round(result.moisture).toLocaleString("en-IN")}`],
                [t("msp_expected"),  `₹${Math.round(result.net).toLocaleString("en-IN")}`],
              ].map(([k,v]) => (
                <div key={k} style={{ display:"flex", justifyContent:"space-between", padding:"var(--sp-2) 0", borderBottom:"1px solid var(--earth-50)", fontSize:"var(--fs-sm)" }}>
                  <span style={{ color:"var(--ink-500)" }}>{k}</span>
                  <span style={{ fontWeight:700, color:"var(--ink-900)" }}>{v}</span>
                </div>
              ))}
              <div style={{ marginTop:"var(--sp-4)", padding:"var(--sp-3)", background:"#FFF8E1", borderRadius:"var(--r-md)", fontSize:"var(--fs-xs)", color:"var(--earth-700)", fontWeight:600 }}>
                ⚠ {t("msp_note")}
              </div>
            </div>
          </div>
        )}
      </div>
      </div>
    </div>
  );
}
