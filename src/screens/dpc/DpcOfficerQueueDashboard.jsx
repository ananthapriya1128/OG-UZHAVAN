import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useI18n } from '../../i18n/I18nContext';
import { supabase, isSupabaseConfigured } from '../../supabaseClient';
import { DPC_STAGES, calculateFarmerProcessingTime } from '../../services/queueEngine';
import { getDpcSession, advanceQueue } from '../../firebase/firestoreService';

export default function DpcOfficerQueueDashboard() {
  const { t, lang } = useI18n();
  const navigate = useNavigate();
  const session = getDpcSession() || { dpcId: 'dpc_ponneri', dpcName: 'பொன்னேரி DPC மையம்' };

  const [queueList, setQueueList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState(null);

  // Fetch queue items
  const fetchOfficerQueue = async () => {
    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase
          .from('queue')
          .select(`
            id,
            token_number,
            current_stage,
            dpc_id,
            entry_time,
            farmers (
              id,
              name,
              village,
              num_bags,
              paddy_variety,
              status
            )
          `)
          .eq('dpc_id', session.dpcId || 'dpc_ponneri')
          .order('token_number', { ascending: true });

        if (!error && data) {
          setQueueList(data);
          setLoading(false);
          return;
        }
      } catch (err) {
        console.warn('[DpcOfficerQueue] Supabase query error:', err);
      }
    }

    // Default Mock Data for local offline dev mode
    const mockList = [
      { id: 'q_42', token_number: 42, current_stage: 4, farmers: { id: 'f_42', name: 'சுப்ரமணியன் அ', village: 'பொன்னேரி', num_bags: 40, paddy_variety: 'White Ponni', status: 'in_progress' } },
      { id: 'q_43', token_number: 43, current_stage: 1, farmers: { id: 'f_43', name: 'முருகன் கே', village: 'மீஞ்சூர்', num_bags: 30, paddy_variety: 'Co 51', status: 'waiting' } },
      { id: 'q_44', token_number: 44, current_stage: 1, farmers: { id: 'f_44', name: 'ராமசாமி ப', village: 'அத்திப்பட்டு', num_bags: 50, paddy_variety: 'CR 1009', status: 'waiting' } },
      { id: 'q_45', token_number: 45, current_stage: 1, farmers: { id: 'f_45', name: 'செல்வம் வே', village: 'காட்டுப்பள்ளி', num_bags: 25, paddy_variety: 'White Ponni', status: 'waiting' } },
      { id: 'q_46', token_number: 46, current_stage: 1, farmers: { id: 'f_46', name: 'கணேசன் ஆர்', village: 'பழவேற்காடு', num_bags: 60, paddy_variety: 'Aduthurai', status: 'waiting' } },
    ];
    setQueueList(mockList);
    setLoading(false);
  };

  useEffect(() => {
    fetchOfficerQueue();

    let channel = null;
    if (isSupabaseConfigured && supabase) {
      channel = supabase
        .channel('dpc-officer-realtime')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'queue' }, () => {
          fetchOfficerQueue();
        })
        .subscribe();
    }

    const intervalId = setInterval(fetchOfficerQueue, 30000);

    return () => {
      if (channel) supabase?.removeChannel(channel);
      clearInterval(intervalId);
    };
  }, [session.dpcId]);

  // Advance Stage for specific farmer token
  const handleNextStage = async (item) => {
    setUpdatingId(item.id);
    const nextStage = item.current_stage + 1;

    if (isSupabaseConfigured && supabase) {
      try {
        if (nextStage > 8) {
          // Mark farmer completed
          await supabase.from('queue').delete().eq('id', item.id);
          await supabase.from('farmers').update({ status: 'completed' }).eq('id', item.farmers?.id);
        } else {
          await supabase
            .from('queue')
            .update({ current_stage: nextStage, updated_at: new Date() })
            .eq('id', item.id);

          await supabase.from('farmers').update({ status: 'in_progress' }).eq('id', item.farmers?.id);
        }
        await fetchOfficerQueue();
      } catch (err) {
        console.error('Failed to advance stage in Supabase:', err);
      }
    } else {
      // Local state update fallback
      setQueueList(prev => prev.map(q => {
        if (q.id === item.id) {
          if (nextStage > 8) return null;
          return { ...q, current_stage: nextStage };
        }
        return q;
      }).filter(Boolean));
      advanceQueue(session.dpcId);
    }
    setUpdatingId(null);
  };

  // Metrics Calculation
  const totalBagsToday = queueList.reduce((acc, q) => acc + (q.farmers?.num_bags || 0), 0);
  const totalKgToday = totalBagsToday * 40; // 40kg standard TNCSC gunny bag weight
  const activeFarmer = queueList.find(q => q.current_stage > 1 && q.current_stage <= 8) || queueList[0];
  const avgProcessingTime = Math.round(
    queueList.reduce((acc, q) => acc + calculateFarmerProcessingTime(q.farmers?.num_bags), 0) / (queueList.length || 1)
  );

  return (
    <div style={{
      minHeight: '100vh',
      background: 'rgba(20,12,3,0.88)',
      color: 'var(--paper)',
      paddingBottom: 80,
      position: 'relative'
    }}>
      {/* Background Image */}
      <img
        src="/images/dpc_mandi_bg.jpg"
        alt=""
        aria-hidden
        style={{
          position: 'fixed', inset: 0, width: '100%', height: '100%',
          objectFit: 'cover', objectPosition: 'center 30%', zIndex: 0, opacity: 0.2
        }}
      />

      <div style={{ position: 'relative', zIndex: 2, maxWidth: 880, margin: '0 auto', padding: 'var(--sp-6) var(--sp-4)' }}>
        
        {/* Header */}
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          marginBottom: 'var(--sp-6)', background: 'rgba(22, 60, 90, 0.9)',
          padding: 'var(--sp-4) var(--sp-5)', borderRadius: 'var(--r-xl)',
          border: '1px solid rgba(255,255,255,0.2)', boxShadow: 'var(--sh-md)'
        }}>
          <div>
            <div style={{ fontSize: 11, color: 'var(--paddy-gold-300)', fontWeight: 700, textTransform: 'uppercase' }}>
              🏢 TNCSC Direct Purchase Centre (DPC)
            </div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--fs-xl)', fontWeight: 900, color: 'white' }}>
              {session.dpcName || 'பொன்னேரி DPC கொள்முதல் மையம்'}
            </div>
          </div>
          <button
            onClick={() => navigate('/dpc')}
            style={{
              background: 'rgba(255,255,255,0.15)', color: 'white', border: '1px solid rgba(255,255,255,0.3)',
              padding: '6px 14px', borderRadius: 'var(--r-md)', fontWeight: 700, cursor: 'pointer'
            }}
          >
            ← {lang === 'ta' ? 'வெளியேறு' : 'Exit'}
          </button>
        </div>

        {/* TODAY'S METRICS CARDS */}
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: 'var(--sp-4)', marginBottom: 'var(--sp-6)'
        }}>
          {/* Card 1: Total Paddy Collected */}
          <div style={{
            background: 'rgba(251, 243, 220, 0.95)', color: 'var(--earth-900)',
            padding: 'var(--sp-4)', borderRadius: 'var(--r-xl)', border: '2px solid var(--paddy-gold-400)'
          }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--earth-700)' }}>
              🌾 {lang === 'ta' ? 'இன்றைய கொள்முதல் நெல்' : 'Today Total Paddy'}
            </div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 26, fontWeight: 900, color: 'var(--earth-900)', marginTop: 2 }}>
              {(totalKgToday / 1000).toFixed(1)} {lang === 'ta' ? 'டன்கள்' : 'Tons'}
            </div>
            <div style={{ fontSize: 11, color: 'var(--ink-700)', fontWeight: 600 }}>
              {totalBagsToday} {lang === 'ta' ? 'மூட்டைகள் (40கிலோ)' : 'Bags (40kg)'}
            </div>
          </div>

          {/* Card 2: Avg Processing Time */}
          <div style={{
            background: 'rgba(251, 243, 220, 0.95)', color: 'var(--earth-900)',
            padding: 'var(--sp-4)', borderRadius: 'var(--r-xl)', border: '2px solid var(--paddy-gold-400)'
          }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--earth-700)' }}>
              ⏱ {lang === 'ta' ? 'சராசரி செயல்முறை நேரம்' : 'Avg Processing Time'}
            </div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 26, fontWeight: 900, color: 'var(--earth-900)', marginTop: 2 }}>
              {avgProcessingTime} {lang === 'ta' ? 'நிமி/உழவர்' : 'min/farmer'}
            </div>
            <div style={{ fontSize: 11, color: 'var(--ink-700)', fontWeight: 600 }}>
              21m {lang === 'ta' ? 'அடிப்படை + மூட்டை நேரம்' : 'base + bag multiplier'}
            </div>
          </div>

          {/* Card 3: Currently Serving Token */}
          <div style={{
            background: 'linear-gradient(135deg, var(--vermilion-500), #9A1C1C)', color: 'white',
            padding: 'var(--sp-4)', borderRadius: 'var(--r-xl)', border: '2px solid var(--paper)',
            boxShadow: 'var(--sh-md)'
          }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--paddy-gold-300)' }}>
              🎯 {lang === 'ta' ? 'தற்போதைய டோக்கன்' : 'Serving Token'}
            </div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 32, fontWeight: 900, color: 'white', marginTop: 2 }}>
              #{activeFarmer?.token_number || 42}
            </div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.9)', fontWeight: 600 }}>
              {activeFarmer?.farmers?.name || 'Farmer'} ({activeFarmer?.farmers?.num_bags || 40} bags)
            </div>
          </div>
        </div>

        {/* FULL QUEUE LIST WITH STAGE CONTROLS */}
        <div style={{
          background: 'rgba(255, 255, 255, 0.95)', color: 'var(--ink-900)',
          padding: 'var(--sp-5)', borderRadius: 'var(--r-xl)', border: '2px solid var(--paddy-gold-300)',
          boxShadow: '0 12px 32px rgba(0,0,0,0.3)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--sp-4)' }}>
            <div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--fs-lg)', fontWeight: 800, color: 'var(--earth-900)' }}>
                📋 {lang === 'ta' ? 'அலுவலர் நேரலை வரிசைப் பட்டியல்' : 'Officer Live Queue Management'}
              </div>
              <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--ink-700)', fontWeight: 600 }}>
                {lang === 'ta' ? 'ஒவ்வொரு விவசாயியின் மூட்டை எண்ணிக்கையின் அடிப்படையில் நேரக் கணக்கீடு' : 'Calculated estimated processing per farmer'}
              </div>
            </div>

            <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--vermilion-500)' }}>
              {queueList.length} {lang === 'ta' ? 'விவசாயிகள் வரிசையில்' : 'Farmers in Queue'}
            </div>
          </div>

          {/* Queue Rows */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-3)' }}>
            {queueList.map((item, idx) => {
              const f = item.farmers || {};
              const numBags = f.num_bags || 40;
              const procTimeMin = calculateFarmerProcessingTime(numBags);
              const curStageObj = DPC_STAGES.find(s => s.id === item.current_stage) || DPC_STAGES[0];
              const isUpdating = updatingId === item.id;

              return (
                <div
                  key={item.id || idx}
                  style={{
                    background: item.current_stage > 1 ? '#FFF8E1' : '#FFFFFF',
                    border: item.current_stage > 1 ? '2px solid var(--vermilion-500)' : '1px solid var(--paddy-gold-300)',
                    borderRadius: 'var(--r-lg)', padding: 'var(--sp-4)',
                    display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 'var(--sp-3)',
                    boxShadow: 'var(--sh-sm)'
                  }}
                >
                  {/* Token & Farmer Info */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-3)' }}>
                    <div style={{
                      width: 44, height: 44, borderRadius: '50%',
                      background: item.current_stage > 1 ? 'var(--vermilion-500)' : 'var(--earth-700)',
                      color: 'white', fontFamily: 'var(--font-display)', fontWeight: 900,
                      fontSize: 18, display: 'flex', alignItems: 'center', justifyContent: 'center'
                    }}>
                      #{item.token_number}
                    </div>

                    <div>
                      <div style={{ fontWeight: 800, fontSize: 'var(--fs-md)', color: 'var(--earth-900)' }}>
                        {f.name} <span style={{ fontSize: 11, color: 'var(--ink-500)', fontWeight: 600 }}>({f.village})</span>
                      </div>
                      <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--ink-700)', fontWeight: 600 }}>
                        {f.paddy_variety} · <strong>{numBags} {lang === 'ta' ? 'மூட்டைகள்' : 'Bags'}</strong> ({numBags * 40} kg)
                      </div>
                    </div>
                  </div>

                  {/* Processing Time & Current Stage */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-4)' }}>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: 11, color: 'var(--earth-700)', fontWeight: 700 }}>
                        {curStageObj.icon} {lang === 'ta' ? curStageObj.nameTa : curStageObj.nameEn}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--vermilion-500)', fontWeight: 800 }}>
                        {lang === 'ta' ? 'மதிப்பிடப்பட்ட நேரம்:' : 'Est time:'} {procTimeMin} {lang === 'ta' ? 'நிமி' : 'mins'}
                      </div>
                    </div>

                    {/* Action Button: Next Stage */}
                    <button
                      onClick={() => handleNextStage(item)}
                      disabled={isUpdating}
                      style={{
                        background: item.current_stage >= 8 ? '#2E7D32' : 'var(--vermilion-500)',
                        color: 'white',
                        border: 'none',
                        borderRadius: 'var(--r-md)',
                        padding: '10px 16px',
                        fontWeight: 800,
                        fontSize: 'var(--fs-xs)',
                        cursor: isUpdating ? 'not-allowed' : 'pointer',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                        opacity: isUpdating ? 0.6 : 1
                      }}
                    >
                      {isUpdating
                        ? '...'
                        : item.current_stage >= 8
                          ? `✓ ${lang === 'ta' ? 'நிறைவு செய்க' : 'Complete'}`
                          : `${lang === 'ta' ? 'அடுத்த நிலை' : 'Next Stage'} (${item.current_stage}/8) →`}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
