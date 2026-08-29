import { initializeApp } from "firebase-admin/app";
import { FieldValue, getFirestore } from "firebase-admin/firestore";
import { HttpsError, onCall } from "firebase-functions/v2/https";
import { logger } from "firebase-functions";

initializeApp();
const db = getFirestore();
const MAX_REQUESTS_PER_MINUTE = 8;

function requiredString(value, name) {
  if (typeof value !== "string" || !value.trim()) throw new HttpsError("invalid-argument", `${name} is required.`);
  return value.trim();
}

async function enforceRateLimit(uid, action) {
  const ref = db.doc(`rate_limits/${uid}_${action}`);
  const now = Date.now();
  await db.runTransaction(async (transaction) => {
    const previous = (await transaction.get(ref)).data();
    const windowStart = previous?.windowStart?.toMillis?.() || 0;
    const inWindow = now - windowStart < 60_000;
    const count = inWindow ? (previous?.count || 0) + 1 : 1;
    if (count > MAX_REQUESTS_PER_MINUTE) throw new HttpsError("resource-exhausted", "Too many requests. Please wait a minute.");
    transaction.set(ref, { count, windowStart: inWindow ? previous.windowStart : FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp() });
  });
}

async function reportFailure(name, error, context) {
  logger.error(`${name} failed`, { message:error.message, code:error.code, ...context });
  // Configure FUNCTION_ALERT_WEBHOOK as a secret/environment variable after deployment.
  const webhook = process.env.FUNCTION_ALERT_WEBHOOK;
  if (webhook) {
    try { await fetch(webhook, { method:"POST", headers:{ "content-type":"application/json" }, body:JSON.stringify({ text:`OG Uzhavan ${name} failed: ${error.message}` }) }); }
    catch (notificationError) { logger.error("Failure alert could not be delivered", notificationError); }
  }
}

export const createBooking = onCall({ region:"asia-south1", enforceAppCheck:true }, async (request) => {
  if (!request.auth) throw new HttpsError("unauthenticated", "Sign in before booking a slot.");
  const data = request.data || {};
  const idempotencyKey = requiredString(data.idempotencyKey, "idempotencyKey");
  const dpcId = requiredString(data.dpcId, "dpcId");
  const slotDate = requiredString(data.slotDate, "slotDate");
  const slotTime = requiredString(data.slotTime, "slotTime");
  const idempotencyRef = db.doc(`idempotency/${request.auth.uid}_${idempotencyKey}`);
  try {
    await enforceRateLimit(request.auth.uid, "booking");
    return await db.runTransaction(async (transaction) => {
      const existing = await transaction.get(idempotencyRef);
      if (existing.exists) return existing.data().response;
      const centreRef = db.doc(`dpc_centres/${dpcId}`);
      const centre = await transaction.get(centreRef);
      if (!centre.exists) throw new HttpsError("not-found", "Procurement centre not found.");
      const nextToken = Math.max((centre.data().nextToken || 0) + 1, (centre.data().currentServingToken || 0) + 1);
      const bookingRef = db.collection("bookings").doc();
      const response = { id:bookingRef.id, farmerId:request.auth.uid, dpcId, dpcName:data.dpcName || centre.data().name || "DPC", slotDate, slotTime, tokenNumber:nextToken, status:"booked", channel:"app", createdAt:new Date().toISOString() };
      transaction.create(bookingRef, { ...response, createdAt:FieldValue.serverTimestamp() });
      transaction.update(centreRef, { nextToken, updatedAt:FieldValue.serverTimestamp() });
      transaction.create(idempotencyRef, { response, action:"createBooking", createdAt:FieldValue.serverTimestamp(), expiresAt:new Date(Date.now() + 24 * 60 * 60 * 1000) });
      return response;
    });
  } catch (error) { await reportFailure("createBooking", error, { uid:request.auth.uid, idempotencyKey }); throw error; }
});

export const getStateOverview = onCall({ region:"asia-south1", enforceAppCheck:true }, async (request) => {
  if (request.auth?.token?.role !== "state_admin") throw new HttpsError("permission-denied", "State administrator access is required.");
  try {
    const districts = (await db.collection("districts").get()).docs.map((doc) => ({ id:doc.id, ...doc.data() }));
    const totalFarmers = districts.reduce((sum, district) => sum + (district.farmers || 0), 0);
    const totalVolumeQuintals = districts.reduce((sum, district) => sum + (district.volumeQuintals || 0), 0);
    const totalValue = districts.reduce((sum, district) => sum + (district.value || 0), 0);
    const grievanceBacklog = districts.reduce((sum, district) => sum + (district.grievanceBacklog || 0), 0);
    const channels = await db.collection("analytics").doc("channel_mix").get();
    return { districts, totalFarmers, totalVolumeQuintals, totalValue, grievanceBacklog, channelMix:channels.data() || { app:0, whatsapp:0, ivr:0, voice_assistant:0 } };
  } catch (error) { await reportFailure("getStateOverview", error, { uid:request.auth.uid }); throw error; }
});

export const checkInBooking = onCall({ region:"asia-south1", enforceAppCheck:true }, async (request) => {
  const role = request.auth?.token?.role;
  if (!request.auth || !["dpc_officer", "district_officer", "state_admin"].includes(role)) throw new HttpsError("permission-denied", "Officer access is required.");
  const dpcId = requiredString(request.data?.dpcId, "dpcId");
  const tokenNumber = Number(request.data?.tokenNumber);
  if (!Number.isInteger(tokenNumber) || tokenNumber < 1) throw new HttpsError("invalid-argument", "A valid token number is required.");
  try {
    const results = await db.collection("bookings").where("dpcId", "==", dpcId).where("tokenNumber", "==", tokenNumber).limit(1).get();
    if (results.empty) throw new HttpsError("not-found", "Token was not found at this DPC.");
    const booking = results.docs[0];
    await booking.ref.update({ status:"arrived", checkedInAt:FieldValue.serverTimestamp(), checkedInBy:request.auth.uid });
    return { tokenNumber, status:"arrived", farmerName:booking.data().farmerName || "Farmer" };
  } catch (error) { await reportFailure("checkInBooking", error, { uid:request.auth.uid, dpcId, tokenNumber }); throw error; }
});
