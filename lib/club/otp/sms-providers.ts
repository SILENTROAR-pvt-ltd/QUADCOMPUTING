// SMS delivery behind one interface. CLUB_SMS_PROVIDER picks it: 'twilio', 'fast2sms', or 'console'
// (prints the code to the server log; refused in production so codes never leak there).
export interface SmsProvider { name: string; send(phone: string, text: string): Promise<void> }

const twilio: SmsProvider = {
  name: 'twilio',
  async send(phone, text) {
    const sid = process.env.TWILIO_ACCOUNT_SID, token = process.env.TWILIO_AUTH_TOKEN, from = process.env.TWILIO_FROM;
    if (!sid || !token || !from) throw new Error('Twilio is not configured.');
    const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
      method: 'POST',
      headers: { Authorization: `Basic ${Buffer.from(`${sid}:${token}`).toString('base64')}`, 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ To: `+${phone}`, From: from, Body: text }),
    });
    if (!res.ok) throw new Error(`Twilio refused the message (${res.status}).`);
  },
};

const fast2sms: SmsProvider = {
  name: 'fast2sms',
  async send(phone, text) {
    const key = process.env.FAST2SMS_API_KEY;
    if (!key) throw new Error('Fast2SMS is not configured.');
    const res = await fetch('https://www.fast2sms.com/dev/bulkV2', {
      method: 'POST',
      headers: { authorization: key, 'Content-Type': 'application/json' },
      body: JSON.stringify({ route: 'q', message: text, numbers: phone.slice(-10), flash: 0 }),
    });
    if (!res.ok) throw new Error(`Fast2SMS refused the message (${res.status}).`);
  },
};

const consoleProvider: SmsProvider = {
  name: 'console',
  async send(phone, text) {
    console.info(`[club:sms] to …${phone.slice(-4)}: ${text}`);
  },
};

/** The configured provider, or null when SMS is not set up for this environment. */
export function smsProvider(env: Record<string, string | undefined> = process.env): SmsProvider | null {
  const choice = (env.CLUB_SMS_PROVIDER || (env.NODE_ENV === 'production' ? '' : 'console')).toLowerCase();
  if (choice === 'twilio') return twilio;
  if (choice === 'fast2sms') return fast2sms;
  if (choice === 'console' && env.NODE_ENV !== 'production') return consoleProvider;
  return null;
}
