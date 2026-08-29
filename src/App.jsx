import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate } from "react-router-dom";
import { I18nProvider, useI18n } from "./i18n/I18nContext";
import { useState, useEffect } from "react";
import WelcomeScreen from "./screens/WelcomeScreen";
import LanguageScreen from "./screens/LanguageScreen";
import PortalSelectionScreen from "./screens/PortalSelectionScreen";
import FarmerRegistrationScreen from "./screens/FarmerRegistrationScreen";
import AppShell from "./components/AppShell";
import FarmerDashboard from "./screens/farmer/FarmerDashboard";
import TokenQRScreen from "./screens/farmer/TokenQRScreen";
import LiveQueueScreen from "./screens/farmer/LiveQueueScreen";
import MSPCalculatorScreen from "./screens/farmer/MSPCalculatorScreen";
import GrievanceScreen from "./screens/farmer/GrievanceScreen";
import SlotBookingScreen from "./screens/farmer/SlotBookingScreen";
import DpcLoginScreen from "./screens/dpc/DpcLoginScreen";
import DpcDashboard from "./screens/dpc/DpcDashboard";
import DpcQueueManager from "./screens/dpc/DpcQueueManager";
import DpcGrievances from "./screens/dpc/DpcGrievances";
import AnalyticsDashboard from "./screens/dpc/AnalyticsDashboard";
import StateAdminDashboard from "./screens/admin/StateAdminDashboard";
import AlexaAssistant from "./components/AlexaAssistant";
import IncomingSmsToast from "./components/IncomingSmsToast";
import { saveCurrentFarmer } from "./firebase/firestoreService";

function OfflineBanner() {
  const [online, setOnline] = useState(typeof navigator === "undefined" ? true : navigator.onLine);
  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    addEventListener("online", on); addEventListener("offline", off);
    return () => { removeEventListener("online", on); removeEventListener("offline", off); };
  }, []);
  if (online) return null;
  const { t } = useI18n();
  return <div className="offline-banner" role="status" aria-live="polite">⚠ {t("offline_msg")}</div>;
}

function AppRoutes() {
  const [alexaOpen, setAlexaOpen] = useState(false);
  const navigate = useNavigate();

  return (
    <>
      <IncomingSmsToast />
      <OfflineBanner />
      <Routes>
        <Route path="/" element={<WelcomeScreen onContinue={() => navigate("/lang")} />} />
        <Route path="/lang" element={<LanguageScreen onProceed={() => navigate("/portal")} onBack={() => navigate("/")} />} />
        <Route path="/portal" element={<PortalSelectionScreen />} />
        <Route
          path="/register"
          element={
            <FarmerRegistrationScreen
              initial={{}}
              onNext={(data) => {
                saveCurrentFarmer(data);
                navigate("/farmer");
              }}
              onBack={() => navigate("/portal")}
            />
          }
        />
        <Route path="/farmer" element={<AppShell onAssistant={() => setAlexaOpen(true)}><FarmerDashboard /></AppShell>} />
        <Route path="/farmer/token" element={<AppShell onAssistant={() => setAlexaOpen(true)}><TokenQRScreen /></AppShell>} />
        <Route path="/farmer/queue" element={<AppShell onAssistant={() => setAlexaOpen(true)}><LiveQueueScreen /></AppShell>} />
        <Route path="/farmer/msp" element={<AppShell onAssistant={() => setAlexaOpen(true)}><MSPCalculatorScreen /></AppShell>} />
        <Route path="/farmer/grievance" element={<AppShell onAssistant={() => setAlexaOpen(true)}><GrievanceScreen /></AppShell>} />
        <Route path="/farmer/booking" element={<AppShell onAssistant={() => setAlexaOpen(true)}><SlotBookingScreen /></AppShell>} />
        <Route path="/dpc" element={<AppShell onAssistant={() => setAlexaOpen(true)} isDpc><DpcLoginScreen /></AppShell>} />
        <Route path="/dpc/dashboard" element={<AppShell onAssistant={() => setAlexaOpen(true)} isDpc><DpcDashboard /></AppShell>} />
        <Route path="/dpc/queue" element={<AppShell onAssistant={() => setAlexaOpen(true)} isDpc><DpcQueueManager /></AppShell>} />
        <Route path="/dpc/grievances" element={<AppShell onAssistant={() => setAlexaOpen(true)} isDpc><DpcGrievances /></AppShell>} />
        <Route path="/dpc/analytics" element={<AppShell onAssistant={() => setAlexaOpen(true)} isDpc><AnalyticsDashboard /></AppShell>} />
        <Route path="/admin" element={<AppShell onAssistant={() => setAlexaOpen(true)} isDpc><StateAdminDashboard /></AppShell>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <AlexaAssistant open={alexaOpen} onClose={() => setAlexaOpen(false)} />
    </>
  );
}

export default function App() {
  return (
    <I18nProvider>
      <Router>
        <AppRoutes />
      </Router>
    </I18nProvider>
  );
}
