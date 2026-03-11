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
- If `success: false` → check `endedReason` and follow the table below
- Always include the transcript summary so user knows exactly what was said

### `endedReason` Handling

| `endedReason` | Action |
|---|---|
| `voicemail` | The voicemail message was left with callback +31641783184. Tell user: "Left a voicemail, they should call back Anelya." |
| `customer-busy` | Tell user the line was busy. Offer to retry in 15 minutes. |
| `customer-did-not-answer` | Restaurant didn't pick up. Look up their business hours (Google) and suggest calling when they open. |
| `silence-timed-out` | Call connected but no one spoke. Offer to retry. |
| `exceeded-max-duration` | Call ran too long (3 min cap). Likely on hold — suggest calling back at a less busy time. |
| `assistant-ended-call` | The AI agent completed the call normally. Check `success` field. |
| `customer-ended-call` | Restaurant hung up. Check transcript for context — they may have said they're full. |
| Other / `unknown-error` | Something went wrong. Show the raw `endedReason` and offer to retry. |

## Phone Number Routing

- If `VAPI_PHONE_NUMBER_ID` is set → uses that number (international capable)
- If not set → uses Vapi's free US number (US restaurants only)
- For international calls, you need to import a number from Telnyx or Twilio into Vapi

## Setup Guide

### 1. Create a Vapi Assistant

In the [Vapi Dashboard](https://dashboard.vapi.ai), create a new assistant with:

**First Message:**
> Hallo, ik bel om een reservering te maken. Spreek ik met het restaurant?

**System Prompt:**
```
You are a polite personal assistant calling a restaurant to make a reservation.

LANGUAGE: Speak Dutch by default. Switch to English only if the restaurant staff speaks English first.

When someone picks up:
1. Confirm you reached the restaurant
2. Ask for availability on the requested date/time
3. Book for the requested party size under the given name
4. Confirm all details back to them
5. Thank them and end the call

If you reach voicemail, leave a brief message with the reservation request and callback number +31641783184. Then hang up.

Details will be provided at the start of each call.
```

**Model:** Any supported model (Claude Sonnet, GPT-4, etc.)

### 2. Get Your API Key

Go to [Vapi Dashboard → API Keys](https://dashboard.vapi.ai) and copy your key.

### 3. Import Your Telnyx Number into Vapi

Your Telnyx number (+31251443084) needs to be imported into Vapi so it can make outbound calls to NL restaurants.

**Method A — Direct Import (try this first):**

1. Go to [Vapi Dashboard → Phone Numbers](https://dashboard.vapi.ai)
2. Click **Create a Phone Number**
3. Select the **Telnyx** tab
4. Enter your Telnyx API key and phone number `+31251443084`
5. Click **Import from Telnyx**
6. If successful, copy the returned **Phone Number ID** — this is your `VAPI_PHONE_NUMBER_ID`

**Method B — SIP Trunk (if direct import fails with credential errors):**

Some users report 401 errors with direct import. The SIP trunk method is more reliable:

1. **In Telnyx Portal** ([portal.telnyx.com](https://portal.telnyx.com)):
   - Go to **Voice → SIP Trunking** → Create a new SIP Trunk
   - Set FQDN to `sip.vapi.ai`, port `5060`
   - Under **Numbers**, assign `+31251443084` to this trunk
   - Go to **Outbound Voice Profiles** → create/select a profile → add Vapi as a connection
   - Under **Authentication**, create SIP credentials (username + password) — save these

2. **Create a Vapi credential** (via API):
   ```bash
   curl -X POST https://api.vapi.ai/credential \
     -H "Content-Type: application/json" \
     -H "Authorization: Bearer $VAPI_API_KEY" \
     -d '{
       "provider": "byo-sip-trunk",
       "name": "telnyx-nl",
       "sipTrunkConfig": {
         "uri": "sip.telnyx.com",
         "authenticationPlan": {
           "type": "sip-authentication",
           "sipUsername": "YOUR_SIP_USERNAME",
           "sipPassword": "YOUR_SIP_PASSWORD"
         }
       }
     }'
   ```
   Save the returned credential `id`.

3. **Register the phone number in Vapi** (via API):
   ```bash
   curl -X POST https://api.vapi.ai/phone-number \
     -H "Content-Type: application/json" \
     -H "Authorization: Bearer $VAPI_API_KEY" \
     -d '{
       "provider": "byo-phone-number",
       "number": "+31251443084",
       "credentialId": "YOUR_CREDENTIAL_ID"
     }'
   ```
   The returned `id` is your `VAPI_PHONE_NUMBER_ID`.

4. **Set the env var:**
   ```
   VAPI_PHONE_NUMBER_ID=<the id from step 3>
   ```

## Gotchas

- Restaurant phone must be in international format (e.g. `+31` for Netherlands, `+1` for US)
- Call polling waits up to 3 minutes — don't timeout early
- The free Vapi number cannot make international calls — you must use Method A or B above
- The assistant speaks Dutch by default and switches to English if the restaurant speaks English first
- Vapi's voicemail detection works best with `voicemailDetectionEnabled: true` on the assistant
- Note: some users report audio quality issues with direct Telnyx import — SIP trunk method (Method B) generally has better quality

## Files

| File | Description |
|---|---|
| `SKILL.md` | This file — skill documentation |
| `vapi-call.js` | Phone call script (Node.js, zero dependencies) |
