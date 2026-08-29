import { useEffect, useState } from "react";
import { getStateOverview } from "../../firebase/firestoreService";

const card = { background:"var(--paper)", borderRadius:"var(--r-md)", padding:"var(--sp-4)", boxShadow:"var(--sh-sm)" };
const inr = new Intl.NumberFormat("en-IN", { maximumFractionDigits:0 });

export default function StateAdminDashboard() {
  const [data, setData] = useState(null); const [error, setError] = useState("");
  useEffect(() => { getStateOverview().then(setData).catch(() => setError("State data could not be loaded. Check administrator access.")); }, []);
  if (error) return <main style={{ padding:24 }}><p role="alert">{error}</p></main>;
  if (!data) return <main style={{ padding:24 }}>Loading state overview…</main>;
  return <main style={{ maxWidth:900, margin:"0 auto", padding:"var(--sp-5) var(--sp-4)" }}>
    <header style={{ background:"#163C5A", color:"white", padding:"var(--sp-5)", borderRadius:"var(--r-lg)", marginBottom:"var(--sp-5)" }}><div style={{ opacity:.8 }}>Tamil Nadu procurement operations</div><h1 style={{ color:"white" }}>State Admin Dashboard</h1></header>
    <section aria-label="State totals" style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(170px, 1fr))", gap:"var(--sp-3)", marginBottom:"var(--sp-5)" }}>{[['Registered farmers', inr.format(data.totalFarmers)], ['Procurement volume', `${inr.format(data.totalVolumeQuintals)} qtl`], ['Procurement value', `₹${inr.format(data.totalValue)}`], ['Grievance backlog', data.grievanceBacklog]].map(([label, value]) => <article key={label} style={card}><small>{label}</small><strong style={{ display:"block", fontSize:"var(--fs-xl)", marginTop:4 }}>{value}</strong></article>)}</section>
    <section style={{ ...card, marginBottom:"var(--sp-5)", overflowX:"auto" }}><h2 style={{ fontSize:"var(--fs-lg)", marginBottom:"var(--sp-3)" }}>District comparison</h2><table style={{ width:"100%", borderCollapse:"collapse", textAlign:"left" }}><thead><tr><th>District</th><th>Farmers</th><th>Volume (qtl)</th><th>Value (₹)</th><th>Open grievances</th></tr></thead><tbody>{data.districts.map((district) => <tr key={district.id}><td>{district.name}</td><td>{inr.format(district.farmers)}</td><td>{inr.format(district.volumeQuintals)}</td><td>{inr.format(district.value)}</td><td>{district.grievanceBacklog}</td></tr>)}</tbody></table></section>
    <section style={card}><h2 style={{ fontSize:"var(--fs-lg)" }}>Channel mix</h2><p>App: {data.channelMix.app} · WhatsApp: {data.channelMix.whatsapp} · IVR: {data.channelMix.ivr} · Voice assistant: {data.channelMix.voice_assistant}</p></section>
  </main>;
}
