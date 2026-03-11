#!/usr/bin/env node
/**
 * Vapi Restaurant Reservation — Outbound Phone Call
 *
 * Creates an outbound call via Vapi API, polls until complete,
 * returns structured result. Zero external dependencies.
 *
 * Environment variables:
 *   VAPI_API_KEY          — Required. Your Vapi API key.
 *   VAPI_ASSISTANT_ID     — Required. Your Vapi phone assistant ID.
 *   VAPI_PHONE_NUMBER_ID  — Optional. Imported phone number ID (for international).
 *   RESERVATION_NAME      — Optional. Default name for reservations.
 *   CALLBACK_NUMBER       — Optional. Number to leave on voicemail.
 *
 * CLI usage:
 *   node vapi-call.js \
 *     --restaurant_name "Rijks Restaurant" \
 *     --restaurant_phone "+31205747450" \
 *     --date "Friday March 13" \
 *     --time "8pm" \
 *     --party_size 2 \
 *     --name "Jane Smith" \
 *     --notes "window table if possible"
 */

const VAPI_API_KEY = process.env.VAPI_API_KEY;
const VAPI_ASSISTANT_ID = process.env.VAPI_ASSISTANT_ID;
const VAPI_PHONE_NUMBER_ID = process.env.VAPI_PHONE_NUMBER_ID || null;
const DEFAULT_NAME = process.env.RESERVATION_NAME || null;
const CALLBACK_NUMBER = process.env.CALLBACK_NUMBER || null;

const POLL_INTERVAL_MS = 5000;
const MAX_POLL_MS = 180000; // 3 minutes

async function makeReservationAndWait(params) {
  const {
    restaurant_name,
    restaurant_phone,
    date,
    time,
    party_size,
    name = DEFAULT_NAME,
    notes = '',
  } = params;

  if (!VAPI_API_KEY) throw new Error('VAPI_API_KEY not set');
  if (!VAPI_ASSISTANT_ID) throw new Error('VAPI_ASSISTANT_ID not set');
  if (!restaurant_name) throw new Error('restaurant_name is required');
  if (!restaurant_phone) throw new Error('restaurant_phone is required');
  if (!date) throw new Error('date is required');
  if (!time) throw new Error('time is required');
  if (!party_size) throw new Error('party_size is required');
  if (!name) throw new Error('name is required (set RESERVATION_NAME env var or pass --name)');

  // Build context for the assistant
  const contextLines = [
    `Restaurant: ${restaurant_name}`,
    `Date: ${date}`,
    `Time: ${time}`,
    `Party size: ${party_size}`,
    `Reservation name: ${name}`,
    notes ? `Special requests: ${notes}` : '',
    CALLBACK_NUMBER ? `If voicemail, leave callback number: ${CALLBACK_NUMBER}` : '',
  ].filter(Boolean).join('\n');

  // Build call payload
  const callPayload = {
    assistantId: VAPI_ASSISTANT_ID,
    customer: {
      number: restaurant_phone,
    },
    assistantOverrides: {
      variableValues: {
        restaurant_name,
        date,
        time,
        party_size: String(party_size),
        reservation_name: name,
        notes,
      },
      model: {
        messages: [
          {
            role: 'system',
            content: `You are a polite personal assistant calling a restaurant to make a reservation.

LANGUAGE: Speak Dutch by default. Switch to English only if the restaurant staff speaks English first.

When someone picks up:
1. Confirm you reached the restaurant
2. Ask for availability on the requested date/time
3. Book for the requested party size under the name "${name}"
4. Confirm all details back to them
5. Thank them and end the call

If you reach voicemail, leave a brief message with the reservation request and callback number ${CALLBACK_NUMBER || '+31641783184'} so they can confirm. Then hang up.

RESERVATION DETAILS:
${contextLines}`,
          },
        ],
      },
    },
  };

  // Phone number: use imported number if available, otherwise Vapi routes via default
  if (VAPI_PHONE_NUMBER_ID) {
    callPayload.phoneNumberId = VAPI_PHONE_NUMBER_ID;
  }

  // Create the call
  const createRes = await fetch('https://api.vapi.ai/call/phone', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${VAPI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(callPayload),
  });

  if (!createRes.ok) {
    const err = await createRes.text();
    throw new Error(`Vapi create call failed (${createRes.status}): ${err}`);
  }

  const callData = await createRes.json();
  const callId = callData.id;
  console.error(`Call created: ${callId} → ${restaurant_phone}`);

  // Poll until call ends
  const startTime = Date.now();
  let finalCall = null;

  while (Date.now() - startTime < MAX_POLL_MS) {
    await sleep(POLL_INTERVAL_MS);

    const pollRes = await fetch(`https://api.vapi.ai/call/${callId}`, {
      headers: { 'Authorization': `Bearer ${VAPI_API_KEY}` },
    });

    if (!pollRes.ok) {
      console.error(`Poll error: ${pollRes.status}`);
      continue;
    }

    const poll = await pollRes.json();
    console.error(`Status: ${poll.status} (${Math.round((Date.now() - startTime) / 1000)}s)`);

    if (poll.status === 'ended') {
      finalCall = poll;
      break;
    }
  }

  if (!finalCall) {
    return {
      success: false,
      summary: `Call to ${restaurant_name} timed out after 3 minutes (call ID: ${callId})`,
      evaluation: false,
      duration: null,
      callId,
    };
  }

  // Extract result
  const duration = finalCall.endedAt && finalCall.startedAt
    ? `${Math.round((new Date(finalCall.endedAt) - new Date(finalCall.startedAt)) / 1000)}s`
    : 'unknown';

  const summary = finalCall.analysis?.summary
    || finalCall.summary
    || `Call completed in ${duration}`;

  const evaluation = finalCall.analysis?.successEvaluation === 'true'
    || finalCall.analysis?.successEvaluation === true
    || false;

  return {
    success: evaluation,
    summary,
    evaluation,
    duration,
    callId,
    endedReason: finalCall.endedReason || null,
    transcript: finalCall.transcript || null,
  };
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// CLI mode
if (require.main === module) {
  const args = process.argv.slice(2);
  const params = {};

  for (let i = 0; i < args.length; i += 2) {
    const key = args[i].replace(/^--/, '');
    params[key] = args[i + 1];
  }

  if (params.party_size) params.party_size = parseInt(params.party_size, 10);

  makeReservationAndWait(params)
    .then(result => {
      console.log(JSON.stringify(result, null, 2));
      process.exit(result.success ? 0 : 1);
    })
    .catch(err => {
      console.error(`Error: ${err.message}`);
      process.exit(2);
    });
}

module.exports = { makeReservationAndWait };
