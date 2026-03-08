# 📞 Vapi Restaurant Reservation Skill

An [OpenClaw](https://github.com/openclaw/openclaw) skill that makes restaurant reservations by having an AI agent call the restaurant on your behalf using [Vapi](https://vapi.ai).

> "Hey Boba, book a table for 2 at Rijks tonight at 8pm"
>
> *Your AI assistant picks up the phone, calls the restaurant, and books the table.*

## How It Works

1. You tell your AI assistant you want a reservation
2. The skill calls the restaurant via Vapi's phone API
3. An AI voice agent speaks with the restaurant staff
4. You get a confirmation (or retry suggestion) back in chat

## Quick Start

### 1. Install the skill

Copy `SKILL.md` and `vapi-call.js` to your OpenClaw skills directory:

```bash
# In your OpenClaw workspace
mkdir -p skills/vapi-reservation
cp SKILL.md vapi-call.js skills/vapi-reservation/
```

### 2. Set up Vapi

1. Create an account at [vapi.ai](https://vapi.ai)
2. Create a phone assistant (see [SKILL.md](./SKILL.md#setup-guide) for the recommended prompt)
3. Get your API key from the dashboard

### 3. Configure environment

Add to your OpenClaw config (`env.vars`):

```json
{
  "VAPI_API_KEY": "your-vapi-api-key",
  "VAPI_ASSISTANT_ID": "your-assistant-id",
  "VAPI_PHONE_NUMBER_ID": "your-phone-number-id",
  "RESERVATION_NAME": "Your Name",
  "CALLBACK_NUMBER": "+1234567890"
}
```

### 4. Use it

Just ask your assistant to make a reservation! The skill triggers on natural language like:
- "Book a table at [restaurant] for [date/time]"
- "Call [restaurant] and reserve a table"
- "Make a dinner reservation for 4 on Friday"

## Standalone Usage

Works without OpenClaw too:

```bash
export VAPI_API_KEY="your-key"
export VAPI_ASSISTANT_ID="your-assistant-id"

node vapi-call.js \
  --restaurant_name "Rijks Restaurant" \
  --restaurant_phone "+31205747450" \
  --date "Friday March 13" \
  --time "8pm" \
  --party_size 2 \
  --name "Jane Smith"
```

## Requirements

- Node.js 18+ (uses native `fetch`)
- Vapi account with a phone assistant
- For international calls: a Telnyx or Twilio number imported into Vapi

## Phone Number Options

| Setup | Calls to | Cost |
|---|---|---|
| No phone number configured | US only (Vapi free number) | Free |
| Telnyx number imported | International | Telnyx rates |
| Twilio number imported | International | Twilio rates |

## License

MIT
