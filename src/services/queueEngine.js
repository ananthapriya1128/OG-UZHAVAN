/**
 * TNCSC DPC Paddy Procurement Realtime Queue Calculation Engine
 * 
 * Process Stages per Farmer:
 * 1. Token Verification (2 min)
 * 2. Vehicle Unloading (5 min)
 * 3. Winnowing / Cleaning Machine (3 min)
 * 4. Moisture Meter Check <=17% (3 min)
 * 5. Electronic Weighment (4 min)
 * 6. Packing into standard TNCSC bags at DPC (1.5 min per bag)
 * 7. Data Entry in System (2 min)
 * 8. Vendor Receipt Printing (2 min)
 * 
 * Base Time = 21 minutes per farmer
 * Bag packing time = num_bags * 1.5 minutes
 * Total Estimated Time = 21 + (num_bags * 1.5)
 */

export const DPC_STAGES = [
  { id: 1, nameTa: 'டோக்கன் சரிபார்ப்பு', nameEn: 'Token Verification', durationMin: 2, icon: '🎫' },
  { id: 2, nameTa: 'வாகனம் இறக்குதல்', nameEn: 'Vehicle Unloading', durationMin: 5, icon: '🚛' },
  { id: 3, nameTa: 'நெல் தூற்றுதல் / சுத்தம்', nameEn: 'Winnowing & Cleaning', durationMin: 3, icon: '🌪️' },
  { id: 4, nameTa: 'ஈரப்பதம் சரிபார்ப்பு (≤17%)', nameEn: 'Moisture Check (≤17%)', durationMin: 3, icon: '💧' },
  { id: 5, nameTa: 'மின்னணு எடைபோடுதல்', nameEn: 'Electronic Weighment', durationMin: 4, icon: '⚖️' },
  { id: 6, nameTa: 'TNCSC மூட்டை கட்டுதல்', nameEn: 'TNCSC Bag Packing', durationMinPerBag: 1.5, icon: '🎒' },
  { id: 7, nameTa: 'கணினி தரவுப் பதிவு', nameEn: 'System Data Entry', durationMin: 2, icon: '💻' },
  { id: 8, nameTa: 'ரசீது அச்சிடுதல்', nameEn: 'Vendor Receipt Print', durationMin: 2, icon: '🖨️' }
];

/**
 * Calculates total estimated processing time for a single farmer based on bag count
 */
export function calculateFarmerProcessingTime(numBags = 40) {
  const bags = Math.max(1, Number(numBags) || 40);
  const packingTime = bags * 1.5;
  const baseTime = 21; // 2+5+3+3+4+2+2 = 21 min
  return Math.round(baseTime + packingTime);
}

/**
 * Calculates remaining processing time for a farmer currently at a specific stage
 */
export function calculateRemainingStageTime(currentStage = 1, numBags = 40) {
  const bags = Math.max(1, Number(numBags) || 40);
  let remaining = 0;

  for (let s = currentStage; s <= 8; s++) {
    if (s === 6) {
      remaining += bags * 1.5;
    } else {
      const stageObj = DPC_STAGES.find(st => st.id === s);
      remaining += stageObj ? stageObj.durationMin : 3;
    }
  }

  return Math.round(remaining);
}

/**
 * Main Queue Waiting Time Calculator for Farmer at Target Token
 * 
 * @param {Array} queueList List of active queue items with farmer details
 * @param {Number} targetToken The farmer's own token number
 * @returns {Object} Calculated queue position, farmers ahead, estimated wait time, current active stage
 */
export function calculateQueueMetrics(queueList = [], targetToken) {
  if (!queueList || queueList.length === 0) {
    return {
      position: 1,
      farmersAhead: 0,
      estimatedWaitMin: 0,
      currentActiveFarmer: null,
      currentActiveStage: 1,
      totalBagsAhead: 0
    };
  }

  // Sort queue by token number
  const sortedQueue = [...queueList].sort((a, b) => a.token_number - b.token_number);
  const currentActive = sortedQueue.find(item => item.farmers?.status === 'in_progress') || sortedQueue[0];

  const targetIndex = sortedQueue.findIndex(item => Number(item.token_number) === Number(targetToken));
  
  if (targetIndex === -1) {
    // If farmer is not in queue yet or completed
    const waitingFarmers = sortedQueue.filter(item => item.farmers?.status !== 'completed');
    const totalWait = waitingFarmers.reduce((acc, f) => acc + calculateFarmerProcessingTime(f.farmers?.num_bags), 0);
    return {
      position: sortedQueue.length + 1,
      farmersAhead: waitingFarmers.length,
      estimatedWaitMin: totalWait,
      currentActiveFarmer: currentActive?.farmers || null,
      currentActiveStage: currentActive?.current_stage || 1,
      totalBagsAhead: waitingFarmers.reduce((acc, f) => acc + (f.farmers?.num_bags || 0), 0)
    };
  }

  // Farmers ahead of target
  const farmersAheadList = sortedQueue.slice(0, targetIndex);
  let totalWaitMin = 0;
  let totalBagsAhead = 0;

  farmersAheadList.forEach((item, index) => {
    const numBags = item.farmers?.num_bags || 40;
    totalBagsAhead += numBags;

    if (index === 0 && item.farmers?.status === 'in_progress') {
      // Current active farmer — calculate remaining time from current stage
      totalWaitMin += calculateRemainingStageTime(item.current_stage || 1, numBags);
    } else {
      // Full processing time for waiting farmers ahead
      totalWaitMin += calculateFarmerProcessingTime(numBags);
    }
  });

  return {
    position: targetIndex + 1,
    farmersAhead: farmersAheadList.length,
    estimatedWaitMin: Math.round(totalWaitMin),
    currentActiveFarmer: currentActive?.farmers || null,
    currentActiveStage: currentActive?.current_stage || 1,
    totalBagsAhead
  };
}
