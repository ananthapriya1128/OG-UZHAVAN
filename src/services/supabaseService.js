/**
 * Unified Supabase Backend Service for OG Uzhavan
 * Handles all database CRUD operations with seamless local fallback
 */

import { supabase, isSupabaseConfigured } from '../supabaseClient';
import * as localDb from '../firebase/firestoreService';

// ─── 1. FARMERS ─────────────────────────────────────────────────────────────

export async function saveFarmerProfile(farmerData) {
  if (isSupabaseConfigured && supabase) {
    try {
      const payload = {
        name: farmerData.name,
        mobile: farmerData.mobile,
        aadhaar_masked: farmerData.aadhaarMasked || farmerData.aadhaar,
        ration_card_number: farmerData.rationCardNumber,
        ration_card_type: farmerData.rationCardType,
        village: farmerData.village,
        district: farmerData.district,
        survey_number: farmerData.surveyNumber,
        patta_number: farmerData.pattaNumber,
        taluk: farmerData.taluk,
        cultivated_acres: parseFloat(farmerData.cultivatedAcres) || 3.5,
        paddy_variety: farmerData.cropVariety || 'whiteponni',
        cultivation_type: farmerData.cultivationType || 'owner',
        harvest_date: farmerData.harvestDate || null,
        vao_cert_number: farmerData.vaoCertNumber,
        vao_officer_name: farmerData.vaoOfficerName,
        vao_verified: farmerData.vaoVerified ?? true
      };

      const { data, error } = await supabase
        .from('farmers')
        .upsert(payload, { onConflict: 'mobile' })
        .select()
        .single();

      if (!error && data) return data;
    } catch (err) {
      console.warn('[SupabaseService] saveFarmerProfile fallback:', err);
    }
  }

  // Local fallback
  return localDb.saveCurrentFarmer(farmerData);
}

export async function getFarmerProfile(mobileOrId) {
  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase
        .from('farmers')
        .select('*')
        .or(`id.eq.${mobileOrId},mobile.eq.${mobileOrId}`)
        .single();

      if (!error && data) return data;
    } catch (err) {
      console.warn('[SupabaseService] getFarmerProfile fallback:', err);
    }
  }

  return localDb.getCurrentFarmer();
}

// ─── 2. DPC CENTRES ─────────────────────────────────────────────────────────

export async function fetchDpcCentres() {
  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase
        .from('dpc_centers')
        .select('*')
        .eq('is_active', true);

      if (!error && data && data.length > 0) return data;
    } catch (err) {
      console.warn('[SupabaseService] fetchDpcCentres fallback:', err);
    }
  }

  return localDb.getDpcCentres();
}

// ─── 3. MSP RATES ───────────────────────────────────────────────────────────

export async function fetchMspRates() {
  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase
        .from('msp_rates')
        .select('*');

      if (!error && data && data.length > 0) {
        const ratesMap = {};
        data.forEach(r => {
          ratesMap[r.id] = {
            id: r.id,
            cropName: r.crop_name_ta,
            cropNameEn: r.crop_name_en,
            ratePerQuintal: r.total_rate_per_qtl,
            centralMsp: r.central_msp_per_qtl,
            tnBonus: r.tn_bonus_per_qtl
          };
        });
        return ratesMap;
      }
    } catch (err) {
      console.warn('[SupabaseService] fetchMspRates fallback:', err);
    }
  }

  return localDb.getAllMspRates();
}

// ─── 4. SLOT BOOKINGS & TOKENS ──────────────────────────────────────────────

export async function createSlotBooking(bookingData) {
  if (isSupabaseConfigured && supabase) {
    try {
      const tokenNumber = Math.floor(Math.random() * 40) + 15;
      const numBags = parseInt(bookingData.numBags) || 40;
      const qtl = (numBags * 40) / 100;
      const rate = bookingData.ratePerQuintal || 2310;
      const totalAmount = qtl * rate;

      const payload = {
        token_number: tokenNumber,
        farmer_id: bookingData.farmerId || 'farmer_001',
        dpc_id: bookingData.dpcId || 'dpc_ponneri',
        slot_date: bookingData.slotDate || new Date().toISOString().split('T')[0],
        slot_time: bookingData.slotTime || '09:00 AM - 10:00 AM',
        num_bags: numBags,
        crop_variety_id: bookingData.cropVariety || 'whiteponni',
        estimated_quantity_qtl: qtl,
        estimated_total_amount: totalAmount,
        status: 'booked'
      };

      const { data, error } = await supabase
        .from('slot_bookings')
        .insert(payload)
        .select()
        .single();

      if (!error && data) {
        // Also insert into queue
        await supabase.from('queue').insert({
          token_number: tokenNumber,
          farmer_id: data.farmer_id,
          dpc_id: data.dpc_id,
          booking_id: data.id,
          current_stage: 1
        });
        return data;
      }
    } catch (err) {
      console.warn('[SupabaseService] createSlotBooking fallback:', err);
    }
  }

  return localDb.saveBooking(bookingData);
}

// ─── 5. GRIEVANCES ──────────────────────────────────────────────────────────

export async function createFarmerGrievance(grievanceData) {
  if (isSupabaseConfigured && supabase) {
    try {
      const payload = {
        farmer_id: grievanceData.farmerId || 'farmer_001',
        booking_id: grievanceData.bookingId || 'booking_001',
        dpc_id: grievanceData.dpcId || 'dpc_ponneri',
        category: grievanceData.category,
        description: grievanceData.description,
        status: 'open'
      };

      const { data, error } = await supabase
        .from('grievance')
        .insert(payload)
        .select()
        .single();

      if (!error && data) return data;
    } catch (err) {
      console.warn('[SupabaseService] createFarmerGrievance fallback:', err);
    }
  }

  return localDb.createGrievance(grievanceData);
}

export async function fetchGrievances(dpcIdOrFarmerId) {
  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase
        .from('grievances')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error && data) return data;
    } catch (err) {
      console.warn('[SupabaseService] fetchGrievances fallback:', err);
    }
  }

  return [];
}

// ─── 6. STATE ADMIN ANALYTICS ──────────────────────────────────────────────

export async function fetchStateAdminAnalytics() {
  if (isSupabaseConfigured && supabase) {
    try {
      const { data: dpcs } = await supabase.from('dpc_centers').select('id');
      const { data: farmers } = await supabase.from('farmers').select('id');
      const { data: bookings } = await supabase.from('slot_bookings').select('estimated_quantity_qtl, estimated_total_amount');

      if (dpcs && farmers) {
        const totalQtl = (bookings || []).reduce((acc, b) => acc + (b.estimated_quantity_qtl || 0), 0);
        const totalAmount = (bookings || []).reduce((acc, b) => acc + (b.estimated_total_amount || 0), 0);

        return {
          totalDpcs: dpcs.length || 154,
          totalFarmers: farmers.length || 12840,
          totalProcuredTons: Math.round(totalQtl / 10) || 48500,
          totalDisbursedAmount: totalAmount || 112000000
        };
      }
    } catch (err) {
      console.warn('[SupabaseService] fetchStateAdminAnalytics fallback:', err);
    }
  }

  return {
    totalDpcs: 154,
    totalFarmers: 12840,
    totalProcuredTons: 48500,
    totalDisbursedAmount: 112000000
  };
}
