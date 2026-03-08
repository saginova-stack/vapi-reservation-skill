# SKILL: Restaurant Reservation via Phone Call (Vapi)

Make restaurant reservations by having an AI agent call the restaurant on your behalf using [Vapi](https://vapi.ai).

## When to Use

Trigger this skill when the user asks to:
- Book or reserve a table at a restaurant
- Call a restaurant on their behalf
- Make a lunch or dinner reservation
- "Call [restaurant] and book a table for..."

## Prerequisites

1. **Vapi account** — Sign up at [vapi.ai](https://vapi.ai)
2. **Vapi Assistant** — Create a phone assistant in the Vapi dashboard (see [Setup Guide](#setup-guide) below)
3. **Phone number** — Either:
   - Vapi's free US number (US restaurants only)
   - Your own number via Telnyx/Twilio imported into Vapi (international)

## Configuration

Set these environment variables (in OpenClaw config `env.vars` or `.env`):

| Variable | Required | Description |
|---|---|---|
| `VAPI_API_KEY` | ✅ | Your Vapi API key |
| `VAPI_ASSISTANT_ID` | ✅ | ID of your Vapi phone assistant |
| `VAPI_PHONE_NUMBER_ID` | ❌ | Your imported phone number ID (for international calls) |
| `RESERVATION_NAME` | ❌ | Name for the booking (default: asks user) |
| `CALLBACK_NUMBER` | ❌ | Number to leave on voicemail |

## Required Inputs

Before making the call, confirm you have all of these:

1. `restaurant_name` — e.g. "Rijks Restaurant"
2. `restaurant_phone` — international format e.g. `+31201234567`
3. `date` — e.g. "Friday March 13"
4. `time` — e.g. "8pm"
5. `party_size` — number of people
6. `name` — name for the reservation (uses `RESERVATION_NAME` env var if set)
7. `notes` — optional, e.g. "window table", "birthday"

If any required inputs are missing, ask the user before proceeding.

## Execution

```bash
node vapi-call.js \
  --restaurant_name "Rijks Restaurant" \
  --restaurant_phone "+31205747450" \
  --date "Friday March 13" \
  --time "8pm" \
  --party_size 2 \
  --name "Jane Smith" \
  --notes "window table if possible"
```

Or use as a module:

```javascript
const { makeReservationAndWait } = require('./vapi-call');
const result = await makeReservationAndWait({
  restaurant_name: "Rijks Restaurant",
  restaurant_phone: "+31205747450",
  date: "Friday March 13",
  time: "8pm",
  party_size: 2,
  name: "Jane Smith",
  notes: "window table if possible"
});
```

## After the Call

The function returns:

```json
{
  "success": true,
  "summary": "Called Rijks, confirmed table for 2 at 8pm Friday under Jane",
  "evaluation": true,
  "duration": "47s",
  "callId": "...",
  "transcript": [...]
}
```

- If `success: true` → confirm reservation details to user
- If `success: false` → explain what happened (voicemail, unavailable, no answer) and ask if they want to retry or try a different time
- Always include the transcript summary so user knows exactly what was said

## Phone Number Routing

- If `VAPI_PHONE_NUMBER_ID` is set → uses that number (international capable)
- If not set → uses Vapi's free US number (US restaurants only)
- For international calls, you need to import a number from Telnyx or Twilio into Vapi

## Setup Guide

### 1. Create a Vapi Assistant

In the [Vapi Dashboard](https://dashboard.vapi.ai), create a new assistant with:

**First Message:**
> Hi, I'm calling to make a dinner reservation. Am I speaking with the restaurant?

**System Prompt:**
```
You are a polite personal assistant calling a restaurant to make a reservation.

When someone picks up:
1. Confirm you reached the restaurant
2. Ask for availability on the requested date/time
3. Book for the requested party size under the given name
4. Confirm all details back to them
5. Thank them and end the call

If you reach voicemail, leave a brief message with a callback number (if provided) and hang up.

Details will be provided at the start of each call.
```

**Model:** Any supported model (Claude Sonnet, GPT-4, etc.)

### 2. Get Your API Key

Go to [Vapi Dashboard → API Keys](https://dashboard.vapi.ai) and copy your key.

### 3. (Optional) Import a Phone Number

For international calls, import a number from Telnyx or Twilio in the Vapi dashboard under Phone Numbers.

## Gotchas

- Restaurant phone must be in international format (e.g. `+31` for Netherlands, `+1` for US)
- Call polling waits up to 3 minutes — don't timeout early
- If the restaurant doesn't answer, Vapi will leave a voicemail — report this back to user
- The free Vapi number cannot make international calls
- The assistant speaks English by default — configure your Vapi assistant for other languages if needed

## Files

| File | Description |
|---|---|
| `SKILL.md` | This file — skill documentation |
| `vapi-call.js` | Phone call script (Node.js, zero dependencies) |
