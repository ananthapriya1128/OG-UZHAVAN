import { useState, useEffect } from 'react';
import { useI18n } from '../i18n/I18nContext';
import { supabase, isSupabaseConfigured } from '../supabaseClient';
import { DPC_STAGES, calculateQueueMetrics, calculateFarmerProcessingTime } from '../services/queueEngine';
import { getCurrentBooking, subscribeToQueue } from '../firebase/firestoreService';

export default function FarmerQueueTracker({ tokenNumber, dpcId = 'dpc_ponneri' }) {
  const { t, lang } = useI18n();
  const booking = getCurrentBooking();
  const myToken = tokenNumber || booking?.tokenNumber || 44;

  const [queueData, setQueueData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(new Date());

  // Fetch queue from Supabase or Fallback Local Database
  const fetchQueue = async () => {
    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase
          .from('queue')
          .select(`
            id,
            token_number,
            current_stage,
            dpc_id,
            farmers (
              id,
              name,
              village,
              num_bags,
              paddy_variety,
              status
            )
          `)
          .eq('dpc_id', dpcId)
          .order('token_number', { ascending: true });

        if (!error && data) {
          setQueueData(data);
          setLastUpdated(new Date());
          setLoading(false);
          return;
        }
      } catch (err) {
        console.warn('[QueueTracker] Supabase fetch error, fallback active:', err);
      }
    }

    // Local / Firebase Fallback Queue Store
    setLoading(false);
  };

  useEffect(() => {
    fetchQueue();

    // 1. Supabase Realtime subscription if available
    let realtimeChannel = null;
    if (isSupabaseConfigured && supabase) {
      realtimeChannel = supabase
        .channel('queue-realtime-changes')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'queue' },
          () => {
            fetchQueue();
          }
        )
        .subscribe();
    }

    // 2. Local fallback sync via firestoreService
    const unsubLocal = subscribeToQueue(dpcId, (state) => {
      if (!isSupabaseConfigured) {
        const mockQueue = (state.queue || []).map(f => ({
          token_number: f.tokenNumber,
          current_stage: f.tokenNumber === state.currentServingToken ? 4 : 1,
          dpc_id: dpcId,
          farmers: {
            id: `f_${f.tokenNumber}`,
            name: f.farmerName,
            village: 'TN Village',
            num_bags: parseInt(f.qty) || 40,
            paddy_variety: f.crop || 'White Ponni',
            status: f.tokenNumber === state.currentServingToken ? 'in_progress' : (f.tokenNumber < state.currentServingToken ? 'completed' : 'waiting')
          }
        }));
        setQueueData(mockQueue);
        setLastUpdated(new Date());
        setLoading(false);
      }
    });

    // 3. 30-Second Polling interval safety fallback
    const intervalId = setInterval(() => {
      fetchQueue();
    }, 30000);

    return () => {
      if (realtimeChannel) supabase?.removeChannel(realtimeChannel);
      if (unsubLocal) unsubLocal();
      clearInterval(intervalId);
    };
  }, [dpcId]);

  const metrics = calculateQueueMetrics(queueData, myToken);
  const myFarmerData = queueData.find(item => Number(item.token_number) === Number(myToken))?.farmers;
  const myBags = myFarmerData?.num_bags || 40;
  const myProcTime = calculateFarmerProcessingTime(myBags);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-4)', width: '100%' }}>
      {/* Metrics Banner Header */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
        gap: 'var(--sp-3)',
      }}>
        {/* Token Position Card */}
        <div style={{
          background: 'rgba(251, 243, 220, 0.95)',
          backdropFilter: 'blur(12px)',
          borderRadius: 'var(--r-xl)',
          padding: 'var(--sp-4)',
          border: '2px solid var(--paddy-gold-400)',
          boxShadow: 'var(--sh-md)',
          textAlign: 'center',
        }}>
          <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--earth-700)', fontWeight: 700 }}>
            {lang === 'ta' ? 'உங்கள் டோக்கன்' : 'Your Token'}
          </div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 38, fontWeight: 900, color: 'var(--vermilion-500)', lineHeight: 1.1 }}>
            #{myToken}
          </div>
          <div style={{ fontSize: 11, color: 'var(--ink-700)', marginTop: 4, fontWeight: 600 }}>
            {myBags} {lang === 'ta' ? 'மூட்டைகள்' : 'Bags'} ({myProcTime} {lang === 'ta' ? 'நிமி' : 'min'})
          </div>
        </div>

        {/* Farmers Ahead Card */}
        <div style={{
          background: 'rgba(251, 243, 220, 0.95)',
          backdropFilter: 'blur(12px)',
          borderRadius: 'var(--r-xl)',
          padding: 'var(--sp-4)',
          border: '2px solid var(--paddy-gold-400)',
          boxShadow: 'var(--sh-md)',
          textAlign: 'center',
        }}>
          <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--earth-700)', fontWeight: 700 }}>
            {lang === 'ta' ? 'முன்னால் உள்ளோர்' : 'Farmers Ahead'}
          </div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 38, fontWeight: 900, color: 'var(--earth-800)', lineHeight: 1.1 }}>
            {metrics.farmersAhead}
          </div>
          <div style={{ fontSize: 11, color: 'var(--ink-700)', marginTop: 4, fontWeight: 600 }}>
            {metrics.totalBagsAhead} {lang === 'ta' ? 'மொத்த மூட்டைகள்' : 'Bags Ahead'}
          </div>
        </div>

        {/* Estimated Waiting Time Card */}
        <div style={{
          background: 'linear-gradient(135deg, var(--earth-800), #2A1A06)',
          color: 'var(--paper)',
          borderRadius: 'var(--r-xl)',
          padding: 'var(--sp-4)',
          border: '2px solid var(--paddy-gold-500)',
          boxShadow: 'var(--sh-md)',
          textAlign: 'center',
        }}>
          <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--paddy-gold-300)', fontWeight: 700 }}>
            ⏱ {lang === 'ta' ? 'எதிர்பார்க்கும் காத்திருப்பு' : 'Est. Wait Time'}
          </div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 36, fontWeight: 900, color: 'var(--paddy-gold-400)', lineHeight: 1.1 }}>
            ~{metrics.estimatedWaitMin} {lang === 'ta' ? 'நிமி' : 'mins'}
          </div>
          <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.75)', marginTop: 4 }}>
            21 {lang === 'ta' ? 'நிமி அடிப்படை + 1.5 நிமி/மூட்டை' : 'min base + 1.5m/bag'}
          </div>
        </div>
      </div>

      {/* Currently Active Farmer Stage Tracker */}
      <div style={{
        background: 'rgba(255, 255, 255, 0.95)',
        backdropFilter: 'blur(16px)',
        borderRadius: 'var(--r-xl)',
        padding: 'var(--sp-5)',
        border: '2px solid var(--paddy-gold-300)',
        boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--sp-4)' }}>
          <div>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 'var(--fs-md)', color: 'var(--earth-800)' }}>
              🔄 {lang === 'ta' ? 'தற்போது நடைபெறும் DPC செயல்முறை (8 நிலைகள்)' : 'Active DPC Processing Stage (8 Stages)'}
            </div>
            <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--ink-700)', fontWeight: 600 }}>
              {metrics.currentActiveFarmer
                ? `${lang === 'ta' ? 'தற்போது DPC-யில்:' : 'Currently Serving:'} #${metrics.currentActiveFarmer.token_number || 42} - ${metrics.currentActiveFarmer.name || 'Farmer'}`
                : (lang === 'ta' ? 'DPC மைய நிலவரம்' : 'Live DPC Status')}
            </div>
          </div>
          <div style={{
            fontSize: 11,
            fontWeight: 800,
            background: 'var(--vermilion-500)',
            color: 'white',
            padding: '3px 10px',
            borderRadius: 12,
            display: 'inline-flex',
            alignItems: 'center',
            gap: 4
          }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'white', animation: 'blink 1s infinite' }} />
            LIVE
          </div>
        </div>

        {/* 8-Stage Stepper Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
          gap: 'var(--sp-2)',
        }}>
          {DPC_STAGES.map(stage => {
            const isCompleted = stage.id < metrics.currentActiveStage;
            const isActive = stage.id === metrics.currentActiveStage;

            return (
              <div
                key={stage.id}
                style={{
                  background: isActive ? '#FFF8E1' : isCompleted ? '#EAF5EA' : '#F9F9F9',
                  border: isActive ? '2px solid var(--vermilion-500)' : isCompleted ? '1.5px solid #3A7A1E' : '1px solid #E0E0E0',
                  borderRadius: 'var(--r-md)',
                  padding: '10px 12px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  transition: 'all 0.3s ease'
                }}
              >
                <div style={{
                  width: 28,
                  height: 28,
                  borderRadius: '50%',
                  background: isActive ? 'var(--vermilion-500)' : isCompleted ? '#3A7A1E' : '#9E9E9E',
                  color: 'white',
                  fontSize: 12,
                  fontWeight: 800,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}>
                  {isCompleted ? '✓' : stage.id}
                </div>

                <div style={{ overflow: 'hidden' }}>
                  <div style={{
                    fontSize: 11,
                    fontWeight: isActive || isCompleted ? 800 : 600,
                    color: isActive ? 'var(--vermilion-500)' : isCompleted ? '#2E7D32' : '#616161',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis'
                  }}>
                    {stage.icon} {lang === 'ta' ? stage.nameTa : stage.nameEn}
                  </div>
                  <div style={{ fontSize: 9, color: 'var(--ink-500)', fontWeight: 500 }}>
                    {stage.id === 6
                      ? `${stage.durationMinPerBag} ${lang === 'ta' ? 'நிமி/மூட்டை' : 'm/bag'}`
                      : `${stage.durationMin} ${lang === 'ta' ? 'நிமிடங்கள்' : 'mins'}`}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Live Auto-Refresh Notice */}
        <div style={{
          marginTop: 'var(--sp-4)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontSize: 'var(--fs-xs)',
          color: 'var(--ink-700)',
          borderTop: '1px dashed var(--paddy-gold-300)',
          paddingTop: 'var(--sp-3)'
        }}>
          <div>
            🔄 Supabase Realtime: <strong>{lang === 'ta' ? 'தானியங்கி 30 விநாடி நேரடி புதுப்பிப்பு' : 'Auto 30s Live Sync'}</strong>
          </div>
          <div>
            {lang === 'ta' ? 'கடைசியாக புதுப்பிக்கப்பட்டது:' : 'Updated:'} {lastUpdated.toLocaleTimeString()}
          </div>
        </div>
      </div>
    </div>
  );
}
