import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useI18n } from '../i18n/I18nContext';
import FormField, {
  formatTamilNaduRationCard,
  isValidAadhaar,
  isValidTamilNaduRationCard,
  maskAadhaarFn
} from '../components/FormField';
import StepProgress from '../components/StepProgress';
import MobileOtpVerification from '../components/MobileOtpVerification';
import { saveCurrentFarmer } from '../firebase/firestoreService';
import { sendRegistrationSMS } from '../services/smsService';

export default function FarmerRegistrationScreen({ initial = {}, onNext, onBack }) {
  const { t, lang } = useI18n();
  const navigate = useNavigate();

  const [stepIndex, setStepIndex] = useState(0);

  // Camera & File Upload Refs and State
  const cameraInputRef = useRef(null);
  const fileInputRef = useRef(null);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [uploadedPreview, setUploadedPreview] = useState(null);
  const [uploadedFileName, setUploadedFileName] = useState('');
  const [uploadedFileSize, setUploadedFileSize] = useState('');
  const [showWebcamModal, setShowWebcamModal] = useState(false);
  const [cameraStream, setCameraStream] = useState(null);
  const [cameraError, setCameraError] = useState('');

  const [form, setForm] = useState({
    // Step 1: Personal & Identity
    name: 'முருகன் சுப்பையா',
    mobile: '9876543210',
    mobileVerified: true,
    village: 'திருவாரூர்',
    district: 'திருவாரூர்',
    state: 'தமிழ்நாடு / Tamil Nadu',
    aadhaar: '987654321098',
    aadhaarVerified: true,
    aadhaarMasked: 'XXXX XXXX 1098',
    rationCardNumber: 'TN01 00123456',
    rationCardType: 'PHH',

    // Step 2: Land & Crop with VAO Survey Number
    surveyNumber: '142/3A',
    pattaNumber: 'PAT-45210',
    taluk: 'திருவாரூர் வட்டம் / Tiruvarur Taluk',
    landVillage: 'திருவாரூர்',
    cultivatedAcres: '3.5',
    cropVariety: 'whiteponni',
    cultivationType: 'owner',
    harvestDate: '2026-09-15',

    // Step 3: VAO Certificate Verification
    vaoCertNumber: 'VAO/2026/TN/8831',
    vaoOfficerName: 'கே. ரவிச்சந்திரன் (VAO Officer)',
    vaoDocUploaded: true,
    vaoVerified: true,

    // Step 4: Digital ID
    farmerId: 'TN-UZH-2026-8921',
    ...initial
  });

  const [validationError, setValidationError] = useState('');
  const [downloadSuccess, setDownloadSuccess] = useState(false);
  const [smsState, setSmsState] = useState(null); // null | 'sending' | { status, to, messageId, message }

  const set = (k, v) => setForm(prev => ({ ...prev, [k]: v }));

  const rationOptions = [
    { value: 'APHS', label: 'APHS' },
    { value: 'PHH',  label: 'PHH (Priority Household)' },
    { value: 'NPHH', label: 'NPHH' },
    { value: 'AAY',  label: 'AAY (Antyodaya)' }
  ];

  const cropOptions = [
    { value: 'whiteponni', label: `${t('crop_whiteponni')} (White Ponni)` },
    { value: 'co51',       label: `${t('crop_co51')} (Co 51)` },
    { value: 'cr1009',     label: `${t('crop_cr1009')} (CR 1009)` },
    { value: 'aduthurai',  label: `${t('crop_aduthurai')} (Aduthurai)` },
    { value: 'koozha',     label: `${t('crop_koozha')} (Kuzha Paddy)` },
  ];

  const cultivationOptions = [
    { value: 'owner',  label: t('cultivation_owner') },
    { value: 'tenant', label: t('cultivation_tenant') },
  ];

  const verifyAadhaar = () => {
    const digits = String(form.aadhaar || '').replace(/\D/g, '');
    if (isValidAadhaar(digits)) {
      set('aadhaarVerified', true);
      set('aadhaarMasked', maskAadhaarFn(digits));
      setValidationError('');
    } else {
      setValidationError('Enter a valid 12-digit Aadhaar number with valid checksum.');
    }
  };

  // Step 1 Validation
  const canStep1 =
    form.name.trim() &&
    /^\d{10}$/.test(String(form.mobile || '').replace(/\D/g, '')) &&
    form.mobileVerified &&
    form.village.trim() &&
    form.district.trim() &&
    form.aadhaarVerified &&
    isValidTamilNaduRationCard(form.rationCardNumber) &&
    form.rationCardType;

  // Step 2 Validation (VAO Survey Number is mandatory)
  const canStep2 =
    form.surveyNumber.trim() &&
    form.pattaNumber.trim() &&
    form.taluk.trim() &&
    form.landVillage.trim() &&
    parseFloat(form.cultivatedAcres) > 0 &&
    form.cropVariety;

  // Step 3 Validation
  const canStep3 =
    form.vaoCertNumber.trim() &&
    form.vaoOfficerName.trim() &&
    form.vaoVerified;

  const handleFinishRegistration = () => {
    const finalFarmer = {
      id: form.farmerId || `farmer_${Date.now()}`,
      name: form.name,
      mobile: form.mobile,
      village: form.village,
      district: form.district,
      state: form.state,
      preferredLanguage: lang,
      aadhaarMasked: form.aadhaarMasked || maskAadhaarFn(form.aadhaar),
      rationCardNumber: form.rationCardNumber,
      rationCardType: form.rationCardType,
      surveyNumber: form.surveyNumber,
      pattaNumber: form.pattaNumber,
      taluk: form.taluk,
      landVillage: form.landVillage,
      cultivatedAcres: form.cultivatedAcres,
      cropVariety: form.cropVariety,
      cultivationType: form.cultivationType,
      vaoCertNumber: form.vaoCertNumber,
      vaoOfficerName: form.vaoOfficerName,
      vaoVerified: form.vaoVerified,
      registeredAt: new Date().toISOString(),
    };

    saveCurrentFarmer(finalFarmer);
    if (onNext) {
      onNext(finalFarmer);
    } else {
      navigate('/farmer');
    }
  };

  const handleBackStep = () => {
    if (stepIndex > 0) {
      setStepIndex(s => s - 1);
    } else if (onBack) {
      onBack();
    } else {
      navigate('/portal');
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: 'rgba(30,19,5,0.92)', paddingBottom: 80, position: 'relative' }}>
      {/* Full-screen paddy landscape background */}
      <img
        src="/images/paddy_landscape_bg.jpg"
        alt=""
        aria-hidden="true"
        style={{
          position: 'fixed',
          inset: 0,
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          objectPosition: 'center 30%',
          zIndex: 0,
        }}
      />
      {/* Dark overlay for readability */}
      <div aria-hidden style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1,
        background: `linear-gradient(180deg,
          rgba(20,12,3,0.72) 0%,
          rgba(20,12,3,0.60) 40%,
          rgba(20,12,3,0.80) 100%)`,
        pointerEvents: 'none',
      }} />
      {/* Content wrapper above background */}
      <div style={{ position: 'relative', zIndex: 2 }}>

      {/* Top Header */}
      <div style={{
        position: 'relative',
        overflow: 'hidden',
        background: 'linear-gradient(135deg, var(--earth-700), #2A1A06)',
        padding: 'var(--sp-5) var(--sp-6)',
        color: 'var(--paper)',
        display: 'flex',
        alignItems: 'center',
        gap: 'var(--sp-3)',
      }}>
        <img
          src="/images/golden_paddy_grains_bg.jpg"
          alt=""
          aria-hidden="true"
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            objectPosition: 'center 30%',
            opacity: 0.25,
          }}
        />
        <div style={{
          position: 'absolute',
          inset: 0,
          background: 'linear-gradient(180deg, rgba(42,26,6,0.6) 0%, rgba(42,26,6,0.92) 100%)',
        }} />

        <div style={{ position: 'relative', zIndex: 2, display: 'flex', alignItems: 'center', gap: 'var(--sp-3)', width: '100%' }}>
          <button
            onClick={handleBackStep}
            style={{
              background: 'rgba(255,255,255,0.15)',
              border: '1px solid var(--paddy-gold-300)',
              borderRadius: '50%',
              width: 36,
              height: 36,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--paper)',
              fontSize: 18,
              cursor: 'pointer',
            }}
            aria-label="Back"
          >
            ←
          </button>
          <div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--fs-xl)', fontWeight: 800 }}>
              🌾 {t('step_register')}
            </div>
            <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--paddy-gold-200)', opacity: 0.9 }}>
              தமிழ்நாடு நேரடி கொள்முதல் உழவர் பதிவு · VAO Certified
            </div>
          </div>
        </div>
      </div>

      {/* Step Progress Bar */}
      <StepProgress
        current={stepIndex}
        steps={['step_register', 'step_land', 'step_vao', 'step_done']}
      />

      <div style={{
        padding: 'var(--sp-6) var(--sp-4)',
        maxWidth: 'var(--content-max)',
        margin: '0 auto'
      }}>

        {/* ─────────────────────────────────────────────────────────────────── */}
        {/* STEP 0: PERSONAL & IDENTITY DETAILS */}
        {/* ─────────────────────────────────────────────────────────────────── */}
        {/* ─────────────────────────────────────────────────────────────────── */}
        {/* STEP 0: PERSONAL & IDENTITY DETAILS */}
        {/* ─────────────────────────────────────────────────────────────────── */}
        {stepIndex === 0 && (
          <div style={{
            background: 'linear-gradient(145deg, rgba(255, 253, 248, 0.98), rgba(251, 243, 220, 0.98))',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            borderRadius: 'var(--r-xl)',
            border: '2px solid var(--paddy-gold-400)',
            boxShadow: '0 16px 40px rgba(0,0,0,0.45)',
            padding: 'var(--sp-6)',
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              marginBottom: 'var(--sp-5)',
              paddingBottom: 'var(--sp-3)',
              borderBottom: '2px solid var(--paddy-gold-200)',
            }}>
              <span style={{
                width: 38, height: 38, borderRadius: '50%',
                background: 'var(--vermilion-500)', color: 'white',
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                fontWeight: 800, fontSize: 'var(--fs-lg)',
                boxShadow: '0 2px 6px rgba(194,37,28,0.3)'
              }}>1</span>
              <div>
                <h1 style={{
                  fontSize: 'var(--fs-xl)',
                  color: 'var(--earth-800)',
                  margin: 0,
                  fontFamily: 'var(--font-display)',
                  fontWeight: 800,
                }}>
                  {t('reg_title')}
                </h1>
                <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--earth-700)', fontWeight: 600, marginTop: 2 }}>
                  உழவர் அடிப்படை மற்றும் முகவரி விவரங்கள் · Basic & Contact Details
                </div>
              </div>
            </div>

            <form onSubmit={(e) => { e.preventDefault(); if (canStep1) setStepIndex(1); }} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-5)' }}>
              <FormField
                id="name" required
                label={t('f_name')}
                value={form.name}
                onChange={(v) => set('name', v)}
              />

              <div>
                <FormField
                  id="mobile" required type="tel"
                  label={t('f_mobile')}
                  placeholder="9XXXXXXXXX"
                  value={form.mobile}
                  onChange={(v) => {
                    set('mobile', String(v).replace(/\D/g, '').slice(0, 10));
                    if (form.mobileVerified) set('mobileVerified', false);
                  }}
                />
                <div style={{
                  marginTop: 6,
                  padding: '8px 12px',
                  background: '#EBF3FF',
                  border: '1px solid #90CAF9',
                  borderRadius: 'var(--r-md)',
                  color: '#0D47A1',
                  fontSize: 'var(--fs-xs)',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6
                }}>
                  <span>ℹ️</span>
                  <span>{t('f_mobile_hint')}</span>
                </div>
                <div style={{ marginTop: 8 }}>
                  <MobileOtpVerification mobile={form.mobile} verified={form.mobileVerified} onVerified={() => set('mobileVerified', true)} />
                </div>
                <p style={{ margin: '6px 0 0', color: 'var(--ink-700)', fontSize: 'var(--fs-xs)', fontWeight: 500 }}>
                  {t('f_mobile_otp_note')}
                </p>
              </div>

              <div style={{ display: 'grid', gap: 'var(--sp-4)' }}>
                <FormField
                  id="village" required
                  label={t('f_village')}
                  value={form.village}
                  onChange={(v) => set('village', v)}
                />
                <FormField
                  id="district" required
                  label={t('f_district')}
                  value={form.district}
                  onChange={(v) => set('district', v)}
                />
                <FormField
                  id="state" required
                  label={t('f_state')}
                  value={form.state}
                  onChange={(v) => set('state', v)}
                />
              </div>

              {/* Aadhaar Box */}
              <div style={{
                padding: 'var(--sp-4)',
                borderRadius: 'var(--r-lg)',
                background: form.aadhaarVerified ? '#F4F9F2' : '#FFFDF5',
                border: '2px solid',
                borderColor: form.aadhaarVerified ? 'var(--success-500)' : 'var(--paddy-gold-400)',
                boxShadow: 'var(--sh-sm)'
              }}>
                <FormField
                  id="aadhaar" required
                  label={t('f_aadhaar')}
                  placeholder="XXXX XXXX XXXX"
                  value={form.aadhaar}
                  maskAadhaar={!!form.aadhaar}
                  onChange={(v) => {
                    const digits = String(v).replace(/\D/g, '').slice(0, 12);
                    if (form.aadhaarVerified) set('aadhaarVerified', false);
                    setValidationError('');
                    set('aadhaar', digits);
                  }}
                />
                <div style={{ marginTop: 'var(--sp-3)' }}>
                  {!form.aadhaarVerified ? (
                    <button
                      type="button"
                      onClick={verifyAadhaar}
                      style={{
                        minHeight: 'var(--touch-target)',
                        padding: '0 var(--sp-5)',
                        background: 'var(--paddy-gold-500)',
                        color: 'var(--ink-900)',
                        borderRadius: 'var(--r-md)',
                        fontFamily: 'var(--font-display)',
                        fontWeight: 800,
                        fontSize: 'var(--fs-md)',
                        border: '2px solid var(--paddy-gold-700)',
                        cursor: 'pointer',
                      }}
                    >
                      ✓ {t('verify_aadhaar')}
                    </button>
                  ) : (
                    <div style={{
                      display: 'inline-flex', alignItems: 'center', gap: 'var(--sp-2)',
                      padding: '8px var(--sp-4)',
                      background: '#E8F5E9',
                      border: '2px solid #2E7D32',
                      borderRadius: 'var(--r-md)',
                      color: '#1B5E20',
                      fontWeight: 800,
                      fontFamily: 'var(--font-display)'
                    }}>
                      <span aria-hidden>✓</span>
                      Verified · {form.aadhaarMasked}
                    </div>
                  )}
                </div>
                {validationError && (
                  <p role="alert" style={{
                    color: 'var(--danger-500)',
                    fontSize: 'var(--fs-sm)',
                    fontWeight: 700,
                    margin: '8px 0 0',
                    background: '#FFF0F0',
                    padding: '6px 10px',
                    borderRadius: 'var(--r-sm)',
                    border: '1px solid #FFCDD2'
                  }}>
                    {validationError}
                  </p>
                )}
              </div>

              {/* Ration Card */}
              <div>
                <FormField
                  id="ration_no" required
                  label={t('f_ration_no')}
                  placeholder="TN01 00123456"
                  value={form.rationCardNumber}
                  onChange={(v) => set('rationCardNumber', formatTamilNaduRationCard(v))}
                />
                {form.rationCardNumber && !isValidTamilNaduRationCard(form.rationCardNumber) && (
                  <p role="alert" style={{
                    color: 'var(--danger-500)',
                    fontSize: 'var(--fs-xs)',
                    fontWeight: 700,
                    marginTop: 6,
                    background: '#FFF0F0',
                    padding: '6px 10px',
                    borderRadius: 'var(--r-sm)',
                    border: '1px solid #FFCDD2'
                  }}>
                    Use the Tamil Nadu family-card format: TN + 2-digit district code + 8 digits (e.g. TN01 00123456).
                  </p>
                )}
              </div>

              <FormField
                id="ration_type" required
                label={t('f_ration_type')}
                value={form.rationCardType}
                onChange={(v) => set('rationCardType', v)}
                options={rationOptions}
              />

              <div style={{ display: 'flex', gap: 'var(--sp-3)', marginTop: 'var(--sp-4)' }}>
                <button
                  type="button"
                  onClick={handleBackStep}
                  style={{
                    minHeight: 56, padding: '0 var(--sp-5)',
                    background: 'var(--tarpaulin-100)', color: 'var(--ink-900)',
                    borderRadius: 'var(--r-md)', fontWeight: 700, fontSize: 'var(--fs-md)',
                    border: '2px solid var(--tarpaulin-300)', flex: 1, cursor: 'pointer',
                  }}
                >
                  ← {t('back')}
                </button>
                <button
                  type="submit"
                  disabled={!canStep1}
                  style={{
                    minHeight: 56, padding: '0 var(--sp-5)',
                    background: canStep1 ? 'var(--vermilion-500)' : 'var(--tarpaulin-300)',
                    color: 'var(--white)', borderRadius: 'var(--r-md)',
                    fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 'var(--fs-lg)',
                    flex: 2, cursor: canStep1 ? 'pointer' : 'not-allowed',
                    border: 'none',
                    boxShadow: canStep1 ? '0 4px 12px rgba(194,37,28,0.35)' : 'none',
                  }}
                >
                  {t('next')} →
                </button>
              </div>
            </form>
          </div>
        )}

        {/* ─────────────────────────────────────────────────────────────────── */}
        {/* STEP 1: LAND & CROP WITH VAO SURVEY NUMBER */}
        {/* ─────────────────────────────────────────────────────────────────── */}
        {stepIndex === 1 && (
          <div style={{
            background: 'linear-gradient(145deg, rgba(255, 253, 248, 0.98), rgba(251, 243, 220, 0.98))',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            borderRadius: 'var(--r-xl)',
            border: '2px solid var(--paddy-gold-400)',
            boxShadow: '0 16px 40px rgba(0,0,0,0.45)',
            padding: 'var(--sp-6)',
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              marginBottom: 'var(--sp-4)',
              paddingBottom: 'var(--sp-3)',
              borderBottom: '2px solid var(--paddy-gold-200)',
            }}>
              <span style={{
                width: 38, height: 38, borderRadius: '50%',
                background: 'var(--vermilion-500)', color: 'white',
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                fontWeight: 800, fontSize: 'var(--fs-lg)',
                boxShadow: '0 2px 6px rgba(194,37,28,0.3)'
              }}>2</span>
              <div>
                <h1 style={{
                  fontSize: 'var(--fs-xl)',
                  color: 'var(--earth-800)',
                  margin: 0,
                  fontFamily: 'var(--font-display)',
                  fontWeight: 800,
                }}>
                  {t('land_title')}
                </h1>
                <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--earth-700)', fontWeight: 600, marginTop: 2 }}>
                  கிராம நிர்வாக அலுவலர் (VAO) சான்றளிக்கப்பட்ட நில விவரங்கள்
                </div>
              </div>
            </div>

            <form onSubmit={(e) => { e.preventDefault(); if (canStep2) setStepIndex(2); }} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-5)' }}>
              {/* Highlighted Survey Number Box */}
              <div style={{
                background: '#FFF9E8',
                border: '2px solid var(--paddy-gold-500)',
                borderRadius: 'var(--r-lg)',
                padding: 'var(--sp-4)',
                boxShadow: 'var(--sh-sm)',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                  <span style={{ fontSize: 18 }}>📍</span>
                  <strong style={{ color: 'var(--earth-800)', fontSize: 'var(--fs-sm)', fontWeight: 800 }}>
                    VAO சான்றளிக்கப்பட்ட சர்வே எண் (Survey Number) *
                  </strong>
                </div>
                <FormField
                  id="surveyNumber" required
                  label={t('f_survey_no')}
                  placeholder="எ.கா: 142/3A அல்லது 89/1B"
                  value={form.surveyNumber}
                  onChange={(v) => set('surveyNumber', v)}
                />
                <div style={{
                  margin: '8px 0 0',
                  padding: '6px 10px',
                  background: 'rgba(255,255,255,0.85)',
                  border: '1px solid var(--paddy-gold-300)',
                  borderRadius: 'var(--r-sm)',
                  fontSize: 'var(--fs-xs)',
                  color: 'var(--earth-800)',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6
                }}>
                  <span>ℹ️</span>
                  <span>{t('f_survey_hint')}</span>
                </div>
              </div>

              {/* Patta / Chitta Number */}
              <FormField
                id="pattaNumber" required
                label={t('f_patta_no')}
                placeholder="எ.கா: PAT-45210"
                value={form.pattaNumber}
                onChange={(v) => set('pattaNumber', v)}
              />

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--sp-4)' }}>
                <FormField
                  id="taluk" required
                  label={t('f_taluk')}
                  placeholder="வட்டம்"
                  value={form.taluk}
                  onChange={(v) => set('taluk', v)}
                />
                <FormField
                  id="landVillage" required
                  label={t('f_land_village')}
                  placeholder="கிராமம்"
                  value={form.landVillage}
                  onChange={(v) => set('landVillage', v)}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--sp-4)' }}>
                <FormField
                  id="cultivatedAcres" required type="number"
                  label={t('f_area_acres')}
                  placeholder="எ.கா: 3.5"
                  value={form.cultivatedAcres}
                  onChange={(v) => set('cultivatedAcres', v)}
                />
                <FormField
                  id="cultivationType" required
                  label={t('f_cultivation_type')}
                  value={form.cultivationType}
                  onChange={(v) => set('cultivationType', v)}
                  options={cultivationOptions}
                />
              </div>

              <FormField
                id="cropVariety" required
                label={t('f_crop')}
                value={form.cropVariety}
                onChange={(v) => set('cropVariety', v)}
                options={cropOptions}
              />

              <FormField
                id="harvestDate" required type="date"
                label={t('f_harvest_date')}
                value={form.harvestDate}
                onChange={(v) => set('harvestDate', v)}
              />

              <div style={{ display: 'flex', gap: 'var(--sp-3)', marginTop: 'var(--sp-4)' }}>
                <button
                  type="button"
                  onClick={handleBackStep}
                  style={{
                    minHeight: 56, padding: '0 var(--sp-5)',
                    background: 'var(--tarpaulin-100)', color: 'var(--ink-900)',
                    borderRadius: 'var(--r-md)', fontWeight: 700, fontSize: 'var(--fs-md)',
                    border: '2px solid var(--tarpaulin-300)', flex: 1, cursor: 'pointer',
                  }}
                >
                  ← {t('back')}
                </button>
                <button
                  type="submit"
                  disabled={!canStep2}
                  style={{
                    minHeight: 56, padding: '0 var(--sp-5)',
                    background: canStep2 ? 'var(--vermilion-500)' : 'var(--tarpaulin-300)',
                    color: 'var(--white)', borderRadius: 'var(--r-md)',
                    fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 'var(--fs-lg)',
                    flex: 2, cursor: canStep2 ? 'pointer' : 'not-allowed',
                    border: 'none',
                    boxShadow: canStep2 ? '0 4px 12px rgba(194,37,28,0.35)' : 'none',
                  }}
                >
                  {t('next')} →
                </button>
              </div>
            </form>
          </div>
        )}

        {/* ─────────────────────────────────────────────────────────────────── */}
        {/* STEP 2: VAO CERTIFICATE UPLOAD & VERIFICATION */}
        {/* ─────────────────────────────────────────────────────────────────── */}
        {stepIndex === 2 && (
          <div style={{
            background: 'linear-gradient(145deg, rgba(255, 253, 248, 0.98), rgba(251, 243, 220, 0.98))',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            borderRadius: 'var(--r-xl)',
            border: '2px solid var(--paddy-gold-400)',
            boxShadow: '0 16px 40px rgba(0,0,0,0.45)',
            padding: 'var(--sp-6)',
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              marginBottom: 'var(--sp-4)',
              paddingBottom: 'var(--sp-3)',
              borderBottom: '2px solid var(--paddy-gold-200)',
            }}>
              <span style={{
                width: 38, height: 38, borderRadius: '50%',
                background: 'var(--vermilion-500)', color: 'white',
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                fontWeight: 800, fontSize: 'var(--fs-lg)',
                boxShadow: '0 2px 6px rgba(194,37,28,0.3)'
              }}>3</span>
              <div>
                <h1 style={{
                  fontSize: 'var(--fs-xl)',
                  color: 'var(--earth-800)',
                  margin: 0,
                  fontFamily: 'var(--font-display)',
                  fontWeight: 800,
                }}>
                  {t('vao_title')}
                </h1>
                <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--earth-700)', fontWeight: 600, marginTop: 2 }}>
                  {t('vao_hint')}
                </div>
              </div>
            </div>

            <form onSubmit={(e) => {
              e.preventDefault();
              if (!canStep3) return;
              setStepIndex(3);
              // 📲 Fire registration SMS immediately
              setSmsState('sending');
              const farmerForSms = {
                id: form.farmerId,
                name: form.name,
                mobile: form.mobile,
                surveyNumber: form.surveyNumber,
                vaoCertNumber: form.vaoCertNumber,
              };
              sendRegistrationSMS(farmerForSms, lang)
                .then((receipt) => setSmsState(receipt))
                .catch(() => setSmsState({ status: 'failed' }));
            }} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-5)' }}>
              <FormField
                id="vaoCertNumber" required
                label={t('f_vao_cert_no')}
                placeholder={t('f_vao_cert_hint')}
                value={form.vaoCertNumber}
                onChange={(v) => set('vaoCertNumber', v)}
              />

              <FormField
                id="vaoOfficerName" required
                label={t('f_vao_officer')}
                placeholder="எ.கா: கே. ரவிச்சந்திரன் (VAO)"
                value={form.vaoOfficerName}
                onChange={(v) => set('vaoOfficerName', v)}
              />

              {/* Real Certificate Upload & Camera Box */}
              <div style={{
                background: '#FFFDF5',
                borderRadius: 'var(--r-lg)',
                border: '2px dashed var(--paddy-gold-500)',
                padding: 'var(--sp-5)',
                textAlign: 'center',
              }}>
                {/* Hidden Native File & Camera Inputs */}
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  ref={cameraInputRef}
                  style={{ display: 'none' }}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    setUploadedFileName(file.name || `VAO_Photo_${Date.now().toString().slice(-4)}.jpg`);
                    setUploadedFileSize(`${(file.size / (1024 * 1024)).toFixed(2)} MB`);
                    const reader = new FileReader();
                    reader.onload = (ev) => {
                      setUploadedPreview(ev.target.result);
                      set('vaoDocUploaded', true);
                      set('vaoVerified', true);
                    };
                    reader.readAsDataURL(file);
                  }}
                />

                <input
                  type="file"
                  accept="image/*,.pdf"
                  ref={fileInputRef}
                  style={{ display: 'none' }}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    setUploadedFileName(file.name);
                    setUploadedFileSize(`${(file.size / (1024 * 1024)).toFixed(2)} MB`);
                    const reader = new FileReader();
                    reader.onload = (ev) => {
                      setUploadedPreview(ev.target.result);
                      set('vaoDocUploaded', true);
                      set('vaoVerified', true);
                    };
                    reader.readAsDataURL(file);
                  }}
                />

                <div style={{ fontSize: 36, marginBottom: 8 }}>📄</div>
                <div style={{ fontWeight: 800, color: 'var(--earth-800)', marginBottom: 4, fontSize: 'var(--fs-md)' }}>
                  VAO அடங்கல் / சாகுபடி சான்றிதழ்
                </div>
                <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--ink-700)', marginBottom: 'var(--sp-4)', fontWeight: 600 }}>
                  கேமரா மூலம் படம் எடுக்கவும் அல்லது PDF/JPG கோப்பை பதிவேற்றவும் (Max 5 MB)
                </div>

                <div style={{ display: 'flex', justifyContent: 'center', gap: 'var(--sp-3)', flexWrap: 'wrap' }}>
                  {/* Smartphone / Native Camera button */}
                  <button
                    type="button"
                    onClick={() => {
                      if (cameraInputRef.current) {
                        cameraInputRef.current.click();
                      }
                    }}
                    style={{
                      padding: '12px 18px',
                      background: 'var(--white)',
                      border: '2px solid var(--paddy-gold-500)',
                      borderRadius: 'var(--r-md)',
                      color: 'var(--earth-800)',
                      fontWeight: 800,
                      fontSize: 'var(--fs-sm)',
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                      boxShadow: 'var(--sh-sm)'
                    }}
                  >
                    📷 {t('vao_take_photo')} (Camera)
                  </button>

                  {/* Web Live Camera Modal Trigger */}
                  <button
                    type="button"
                    onClick={async () => {
                      setShowWebcamModal(true);
                      setCameraError('');
                      try {
                        const stream = await navigator.mediaDevices.getUserMedia({
                          video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 } }
                        });
                        setCameraStream(stream);
                        if (videoRef.current) {
                          videoRef.current.srcObject = stream;
                        }
                      } catch (err) {
                        setCameraError('Camera access not supported or blocked. Please use the Camera / File button.');
                      }
                    }}
                    style={{
                      padding: '12px 18px',
                      background: 'var(--paddy-gold-100)',
                      border: '2px solid var(--paddy-gold-500)',
                      borderRadius: 'var(--r-md)',
                      color: 'var(--earth-800)',
                      fontWeight: 800,
                      fontSize: 'var(--fs-sm)',
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                      boxShadow: 'var(--sh-sm)'
                    }}
                  >
                    🎥 நேரலை கேமரா (Live View)
                  </button>

                  {/* File Upload button */}
                  <button
                    type="button"
                    onClick={() => {
                      if (fileInputRef.current) {
                        fileInputRef.current.click();
                      }
                    }}
                    style={{
                      padding: '12px 18px',
                      background: 'var(--white)',
                      border: '2px solid var(--tarpaulin-300)',
                      borderRadius: 'var(--r-md)',
                      color: 'var(--ink-900)',
                      fontWeight: 800,
                      fontSize: 'var(--fs-sm)',
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                      boxShadow: 'var(--sh-sm)'
                    }}
                  >
                    📁 {t('vao_upload_file')}
                  </button>
                </div>

                {/* Uploaded Certificate / Camera Snapshot Preview */}
                {form.vaoDocUploaded && (
                  <div style={{
                    marginTop: 'var(--sp-4)',
                    padding: 'var(--sp-3)',
                    background: '#F4F9F2',
                    border: '1.5px solid #81C784',
                    borderRadius: 'var(--r-md)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 10,
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, textAlign: 'left' }}>
                        <span style={{ fontSize: 24 }}>📑</span>
                        <div>
                          <div style={{ fontWeight: 800, fontSize: 'var(--fs-sm)', color: 'var(--ink-900)' }}>
                            {uploadedFileName || `VAO_Certificate_Survey_${form.surveyNumber.replace('/', '_')}.pdf`}
                          </div>
                          <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--ink-700)', fontWeight: 600 }}>
                            {uploadedFileSize || '1.4 MB'} · Verified Digital Copy
                          </div>
                        </div>
                      </div>
                      <span style={{ color: '#1B5E20', fontWeight: 800, fontSize: 'var(--fs-sm)' }}>✓ Uploaded</span>
                    </div>

                    {uploadedPreview && uploadedPreview.startsWith('data:image') && (
                      <div style={{ textAlign: 'center', marginTop: 4 }}>
                        <img
                          src={uploadedPreview}
                          alt="VAO Certificate Preview"
                          style={{
                            maxWidth: '100%',
                            maxHeight: 220,
                            borderRadius: 'var(--r-md)',
                            border: '1px solid var(--paddy-gold-300)',
                            objectFit: 'contain',
                            boxShadow: 'var(--sh-sm)',
                          }}
                        />
                        <div style={{ marginTop: 6 }}>
                          <button
                            type="button"
                            onClick={() => {
                              setUploadedPreview(null);
                              setUploadedFileName('');
                              set('vaoDocUploaded', false);
                              set('vaoVerified', false);
                            }}
                            style={{
                              background: 'none',
                              border: 'none',
                              color: 'var(--danger-500)',
                              fontWeight: 700,
                              fontSize: 'var(--fs-xs)',
                              cursor: 'pointer',
                              textDecoration: 'underline',
                            }}
                          >
                            🗑️ மறுபடியும் படம் எடு (Retake / Remove)
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Instant Verification Status */}
              <div style={{
                padding: 'var(--sp-4)',
                borderRadius: 'var(--r-lg)',
                background: form.vaoVerified ? '#E8F5E9' : '#FFFDF5',
                border: '2px solid',
                borderColor: form.vaoVerified ? '#4CAF50' : 'var(--paddy-gold-400)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}>
                <div>
                  <div style={{ fontWeight: 800, fontSize: 'var(--fs-sm)', color: form.vaoVerified ? '#1B5E20' : 'var(--earth-800)' }}>
                    {form.vaoVerified ? `✓ ${t('vao_status_verified')}` : `⏳ ${t('vao_status_pending')}`}
                  </div>
                  <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--ink-700)', marginTop: 2, fontWeight: 600 }}>
                    TN e-Sevai & Revenue Dept. Database Sync
                  </div>
                </div>

                {!form.vaoVerified && (
                  <button
                    type="button"
                    onClick={() => set('vaoVerified', true)}
                    style={{
                      padding: '8px 14px',
                      background: 'var(--success-500)',
                      color: 'white',
                      borderRadius: 'var(--r-md)',
                      fontWeight: 800,
                      fontSize: 'var(--fs-xs)',
                      border: 'none',
                      cursor: 'pointer',
                    }}
                  >
                    {t('vao_verify_db')}
                  </button>
                )}
              </div>

              <div style={{ display: 'flex', gap: 'var(--sp-3)', marginTop: 'var(--sp-4)' }}>
                <button
                  type="button"
                  onClick={handleBackStep}
                  style={{
                    minHeight: 56, padding: '0 var(--sp-5)',
                    background: 'var(--tarpaulin-100)', color: 'var(--ink-900)',
                    borderRadius: 'var(--r-md)', fontWeight: 700, fontSize: 'var(--fs-md)',
                    border: '2px solid var(--tarpaulin-300)', flex: 1, cursor: 'pointer',
                  }}
                >
                  ← {t('back')}
                </button>
                <button
                  type="submit"
                  disabled={!canStep3}
                  style={{
                    minHeight: 56, padding: '0 var(--sp-5)',
                    background: canStep3 ? 'var(--vermilion-500)' : 'var(--tarpaulin-300)',
                    color: 'var(--white)', borderRadius: 'var(--r-md)',
                    fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 'var(--fs-lg)',
                    flex: 2, cursor: canStep3 ? 'pointer' : 'not-allowed',
                    border: 'none',
                    boxShadow: canStep3 ? '0 4px 12px rgba(194,37,28,0.35)' : 'none',
                  }}
                >
                  {t('proceed')} →
                </button>
              </div>
            </form>
          </div>
        )}

        {/* ─────────────────────────────────────────────────────────────────── */}
        {/* STEP 3: DONE & DIGITAL FARMER ID CARD */}
        {/* ─────────────────────────────────────────────────────────────────── */}
        {stepIndex === 3 && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div style={{ fontSize: 56, marginBottom: 8 }}>🎉</div>
            <h1 style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'var(--fs-2xl)',
              fontWeight: 900,
              color: 'var(--paper)',
              textAlign: 'center',
              margin: '0 0 6px',
              textShadow: '0 2px 8px rgba(0,0,0,0.6)',
            }}>
              பதிவு வெற்றிகரமாக முடிந்தது!
            </h1>
            <p style={{
              textAlign: 'center',
              fontSize: 'var(--fs-sm)',
              color: 'var(--paddy-gold-200)',
              margin: '0 0 var(--sp-5)',
              textShadow: '0 1px 3px rgba(0,0,0,0.5)',
              fontWeight: 600,
            }}>
              உங்கள் உழவர் பதிவு எண் உருவாக்கப்பட்டு, VAO சர்வே எண் இணைக்கப்பட்டுள்ளது.
            </p>

            {/* ─── SMS NOTIFICATION STATUS BANNER ─── */}
            <div style={{
              width: '100%',
              borderRadius: 'var(--r-lg)',
              marginBottom: 'var(--sp-5)',
              overflow: 'hidden',
              boxShadow: '0 4px 16px rgba(0,0,0,0.3)',
              border: smsState === 'sending'
                ? '2px solid rgba(255,200,50,0.6)'
                : smsState?.status === 'delivered'
                ? '2px solid rgba(60,180,80,0.7)'
                : '2px solid rgba(200,60,40,0.5)',
            }}>
              {/* SMS Header */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: 'var(--sp-3) var(--sp-4)',
                background: smsState === 'sending'
                  ? 'linear-gradient(135deg, #7A5800, #A07200)'
                  : smsState?.status === 'delivered'
                  ? 'linear-gradient(135deg, #1B5E20, #2E7D32)'
                  : 'linear-gradient(135deg, #7f1d1d, #991b1b)',
              }}>
                <span style={{ fontSize: 22 }}>
                  {smsState === 'sending' ? '📤' : smsState?.status === 'delivered' ? '✅' : '⚠️'}
                </span>
                <div style={{ flex: 1 }}>
                  <div style={{ color: 'white', fontWeight: 800, fontSize: 'var(--fs-sm)', fontFamily: 'var(--font-display)' }}>
                    {smsState === 'sending'
                      ? 'SMS அனுப்பப்படுகிறது...'
                      : smsState?.status === 'delivered'
                      ? 'SMS வெற்றிகரமாக அனுப்பப்பட்டது ✓'
                      : 'SMS அனுப்ப முடியவில்லை'}
                  </div>
                  <div style={{ color: 'rgba(255,255,255,0.85)', fontSize: 'var(--fs-xs)', fontWeight: 600, marginTop: 2 }}>
                    {smsState === 'sending'
                      ? `${form.mobile} என்ற எண்ணிற்கு அனுப்பப்படுகிறது…`
                      : smsState?.status === 'delivered'
                      ? `To: ${smsState.to}  ·  ID: ${smsState.messageId?.slice(0,20)}`
                      : 'மறுமுயற்சி செய்யவும்'}
                  </div>
                </div>
                {smsState === 'sending' && (
                  <div style={{
                    width: 20, height: 20, borderRadius: '50%',
                    border: '3px solid rgba(255,255,255,0.3)',
                    borderTopColor: 'white',
                    animation: 'spin 0.8s linear infinite',
                  }} />
                )}
              </div>

              {/* SMS Preview Body */}
              {smsState?.message && (
                <div style={{
                  background: '#1a2a1a',
                  padding: 'var(--sp-4)',
                }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    marginBottom: 8,
                  }}>
                    <span style={{ fontSize: 14 }}>💬</span>
                    <span style={{ fontSize: 10, color: '#9CCC65', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1 }}>
                      SMS Preview — TNCSC
                    </span>
                  </div>
                  <div style={{
                    background: '#2d3d2d',
                    border: '1px solid rgba(100,180,80,0.3)',
                    borderRadius: 'var(--r-md)',
                    padding: 'var(--sp-3) var(--sp-4)',
                    fontFamily: 'var(--font-mono)',
                    fontSize: 12,
                    color: '#c8e6c9',
                    lineHeight: 1.7,
                    whiteSpace: 'pre-line',
                  }}>
                    {smsState.message}
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 6, gap: 12 }}>
                    <span style={{ fontSize: 10, color: '#81C784', fontWeight: 600 }}>📡 Fast2SMS · India</span>
                    <span style={{ fontSize: 10, color: '#81C784', fontWeight: 600 }}>✓ Delivered</span>
                  </div>
                </div>
              )}
            </div>

            {/* spin animation */}
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

            {/* 🪪 DIGITAL FARMER ID CARD */}
            <div style={{
              width: '100%',
              background: 'linear-gradient(145deg, #FFF9EC, #FBF3DC)',
              borderRadius: 'var(--r-xl)',
              border: '3px solid var(--paddy-gold-500)',
              boxShadow: '0 12px 32px rgba(92,58,22,.20)',
              overflow: 'hidden',
              marginBottom: 'var(--sp-6)',
            }}>
              {/* ID Top Header */}
              <div style={{
                background: 'linear-gradient(90deg, var(--earth-700), #2A1A06)',
                padding: 'var(--sp-3) var(--sp-4)',
                color: 'var(--paper)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                borderBottom: '3px solid var(--vermilion-500)',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 22 }}>🌾</span>
                  <div>
                    <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 'var(--fs-sm)', color: 'var(--paddy-gold-200)' }}>
                      தமிழ்நாடு அரசு · TNCSC
                    </div>
                    <div style={{ fontSize: 10, color: 'var(--paper)', opacity: 0.9 }}>
                      ஓ ஜி உழவன் · DIGITAL FARMER PASS
                    </div>
                  </div>
                </div>
                <div style={{
                  background: 'var(--success-500)',
                  color: 'white',
                  borderRadius: 12,
                  padding: '2px 8px',
                  fontSize: 10,
                  fontWeight: 800,
                }}>
                  VAO VERIFIED ✓
                </div>
              </div>

              {/* ID Body */}
              <div style={{ padding: 'var(--sp-5)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 'var(--sp-4)', marginBottom: 'var(--sp-4)' }}>
                  <div>
                    <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--ink-500)', fontWeight: 700 }}>
                      {t('farmer_id_num')}
                    </div>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-xl)', fontWeight: 900, color: 'var(--vermilion-500)' }}>
                      {form.farmerId}
                    </div>
                    <div style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--fs-lg)', fontWeight: 800, color: 'var(--earth-700)', marginTop: 4 }}>
                      {form.name}
                    </div>
                    <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--ink-700)' }}>
                      📱 {form.mobile} · 📍 {form.village}, {form.district}
                    </div>
                  </div>

                  {/* QR Code Placeholder */}
                  <div style={{
                    padding: 6,
                    background: 'white',
                    borderRadius: 'var(--r-md)',
                    border: '2px solid var(--paddy-gold-300)',
                    textAlign: 'center',
                    flexShrink: 0,
                  }}>
                    <img
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=90x90&data=${encodeURIComponent(JSON.stringify({ id: form.farmerId, survey: form.surveyNumber, name: form.name }))}&bgcolor=FFFFFF&color=5C3A16`}
                      alt="Farmer QR"
                      width={80}
                      height={80}
                      style={{ display: 'block', borderRadius: 4 }}
                    />
                    <div style={{ fontSize: 8, color: 'var(--ink-500)', marginTop: 2, fontWeight: 700 }}>SCAN @ DPC</div>
                  </div>
                </div>

                {/* Key Field Details Badges */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: 'var(--sp-2)',
                  background: 'rgba(255,255,255,0.7)',
                  padding: 'var(--sp-3)',
                  borderRadius: 'var(--r-md)',
                  border: '1px solid var(--paddy-gold-200)',
                  fontSize: 'var(--fs-xs)',
                }}>
                  <div>
                    <span style={{ color: 'var(--ink-500)' }}>சர்வே எண்: </span>
                    <strong style={{ color: 'var(--earth-700)' }}>#{form.surveyNumber}</strong>
                  </div>
                  <div>
                    <span style={{ color: 'var(--ink-500)' }}>பட்டா எண்: </span>
                    <strong style={{ color: 'var(--ink-900)' }}>{form.pattaNumber}</strong>
                  </div>
                  <div>
                    <span style={{ color: 'var(--ink-500)' }}>பரப்பளவு: </span>
                    <strong style={{ color: 'var(--ink-900)' }}>{form.cultivatedAcres} ஏக்கர்</strong>
                  </div>
                  <div>
                    <span style={{ color: 'var(--ink-500)' }}>பயிர் வகை: </span>
                    <strong style={{ color: 'var(--ink-900)' }}>{t(`crop_${form.cropVariety}`) || form.cropVariety}</strong>
                  </div>
                  <div>
                    <span style={{ color: 'var(--ink-500)' }}>ஆதார்: </span>
                    <strong style={{ color: 'var(--ink-900)' }}>{form.aadhaarMasked}</strong>
                  </div>
                  <div>
                    <span style={{ color: 'var(--ink-500)' }}>VAO சான்றிதழ்: </span>
                    <strong style={{ color: 'var(--success-500)' }}>{form.vaoCertNumber}</strong>
                  </div>
                </div>
              </div>

              {/* ID Card Footer */}
              <div style={{
                background: 'var(--paddy-gold-100)',
                padding: 'var(--sp-2) var(--sp-4)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                fontSize: 10,
                color: 'var(--earth-700)',
                fontWeight: 600,
              }}>
                <span>✓ Valid for 2025–26 Kharif/Rabi Procurement</span>
                <span>Government of Tamil Nadu</span>
              </div>
            </div>

            {downloadSuccess && (
              <div style={{
                width: '100%',
                background: '#EAF5EA',
                border: '2px solid var(--success-500)',
                color: 'var(--success-500)',
                padding: 'var(--sp-3)',
                borderRadius: 'var(--r-md)',
                textAlign: 'center',
                fontWeight: 700,
                fontSize: 'var(--fs-sm)',
                marginBottom: 'var(--sp-4)',
              }}>
                ✓ உழவர் அடையாள அட்டை சேமிக்கப்பட்டது! (ID Card Saved)
              </div>
            )}

            {/* Action Buttons */}
            <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 'var(--sp-3)' }}>
              <button
                type="button"
                onClick={() => {
                  setDownloadSuccess(true);
                  setTimeout(() => setDownloadSuccess(false), 4000);
                }}
                style={{
                  width: '100%',
                  minHeight: 50,
                  background: 'var(--paper)',
                  color: 'var(--earth-700)',
                  border: '2px solid var(--paddy-gold-500)',
                  borderRadius: 'var(--r-md)',
                  fontFamily: 'var(--font-display)',
                  fontWeight: 800,
                  fontSize: 'var(--fs-md)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                }}
              >
                💾 {t('download_id')}
              </button>

              <button
                type="button"
                onClick={handleFinishRegistration}
                style={{
                  width: '100%',
                  minHeight: 56,
                  background: 'var(--vermilion-500)',
                  color: 'white',
                  borderRadius: 'var(--r-md)',
                  fontFamily: 'var(--font-display)',
                  fontWeight: 800,
                  fontSize: 'var(--fs-lg)',
                  border: 'none',
                  cursor: 'pointer',
                  boxShadow: 'var(--sh-md)',
                }}
              >
                🏠 {t('go_to_dashboard')} →
              </button>

              <button
                type="button"
                onClick={() => {
                  handleFinishRegistration();
                  navigate('/farmer/booking');
                }}
                style={{
                  width: '100%',
                  minHeight: 50,
                  background: 'var(--earth-700)',
                  color: 'white',
                  borderRadius: 'var(--r-md)',
                  fontFamily: 'var(--font-display)',
                  fontWeight: 700,
                  fontSize: 'var(--fs-md)',
                  border: 'none',
                  cursor: 'pointer',
                }}
              >
                📅 {t('book_slot')} →
              </button>
            </div>
          </div>
        )}
      </div>
      </div>

      {/* ─── LIVE WEBCAM VIEWFINDER MODAL ─── */}
      {showWebcamModal && (
        <div style={{
          position: "fixed",
          inset: 0,
          zIndex: 1000,
          background: "rgba(0,0,0,0.8)",
          backdropFilter: "blur(8px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "var(--sp-4)",
        }}>
          <div style={{
            background: "var(--paper)",
            borderRadius: "var(--r-xl)",
            border: "2px solid var(--paddy-gold-400)",
            padding: "var(--sp-5)",
            maxWidth: 500,
            width: "100%",
            boxShadow: "0 20px 40px rgba(0,0,0,0.6)",
            textAlign: "center",
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <div style={{ fontWeight: 800, fontSize: "var(--fs-md)", color: "var(--earth-800)" }}>
                📷 VAO சான்றிதழ் நேரலை கேமரா
              </div>
              <button
                type="button"
                onClick={() => {
                  if (cameraStream) cameraStream.getTracks().forEach(t => t.stop());
                  setCameraStream(null);
                  setShowWebcamModal(false);
                }}
                style={{ background: "none", border: "none", fontSize: 20, cursor: "pointer", color: "var(--ink-700)" }}
              >
                ✕
              </button>
            </div>

            {cameraError ? (
              <div style={{ padding: "var(--sp-4)", background: "#FFF0F0", color: "#C2251C", borderRadius: "var(--r-md)", fontWeight: 700, fontSize: "var(--fs-sm)" }}>
                ⚠️ {cameraError}
              </div>
            ) : (
              <div>
                <div style={{
                  position: "relative",
                  width: "100%",
                  background: "#000",
                  borderRadius: "var(--r-md)",
                  overflow: "hidden",
                  marginBottom: 12,
                  aspectRatio: "4/3",
                }}>
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    style={{ width: "100%", height: "100%", objectFit: "cover" }}
                  />
                  <div style={{
                    position: "absolute",
                    inset: 20,
                    border: "2px dashed rgba(255,255,255,0.7)",
                    borderRadius: 8,
                    pointerEvents: "none",
                  }} />
                </div>
                <canvas ref={canvasRef} style={{ display: "none" }} />

                <div style={{ display: "flex", gap: 10 }}>
                  <button
                    type="button"
                    onClick={() => {
                      if (videoRef.current && canvasRef.current) {
                        const video = videoRef.current;
                        const canvas = canvasRef.current;
                        canvas.width = video.videoWidth || 640;
                        canvas.height = video.videoHeight || 480;
                        const ctx = canvas.getContext("2d");
                        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
                        const dataUrl = canvas.toDataURL("image/jpeg");
                        setUploadedPreview(dataUrl);
                        setUploadedFileName(`VAO_Cert_Live_${Date.now().toString().slice(-4)}.jpg`);
                        setUploadedFileSize("1.2 MB");
                        set('vaoDocUploaded', true);
                        set('vaoVerified', true);
                        if (cameraStream) cameraStream.getTracks().forEach(t => t.stop());
                        setCameraStream(null);
                        setShowWebcamModal(false);
                      }
                    }}
                    style={{
                      flex: 1,
                      minHeight: 48,
                      background: "var(--vermilion-500)",
                      color: "white",
                      border: "none",
                      borderRadius: "var(--r-md)",
                      fontFamily: "var(--font-display)",
                      fontWeight: 800,
                      fontSize: "var(--fs-md)",
                      cursor: "pointer",
                      boxShadow: "0 4px 12px rgba(194,37,28,0.4)",
                    }}
                  >
                    📸 படம் எடு (Capture Photo)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (cameraStream) cameraStream.getTracks().forEach(t => t.stop());
                      setCameraStream(null);
                      setShowWebcamModal(false);
                    }}
                    style={{
                      padding: "0 16px",
                      background: "var(--tarpaulin-100)",
                      color: "var(--ink-900)",
                      border: "1px solid var(--tarpaulin-300)",
                      borderRadius: "var(--r-md)",
                      fontWeight: 700,
                      cursor: "pointer",
                    }}
                  >
                    ரத்து
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
