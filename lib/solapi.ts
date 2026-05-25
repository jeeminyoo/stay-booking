import crypto from "crypto";

const API_KEY = process.env.SOLAPI_API_KEY ?? "";
const API_SECRET = process.env.SOLAPI_API_SECRET ?? "";
export const PF_ID = "KA01PF260422090459268VeGHdNJQUNE";

const TEMPLATE = {
  HOST_DEPOSIT_REQUESTED: "KA01TP260422120046523hNUJ7yahdvK",
  GUEST_BOOKING_CONFIRMED: "KA01TP260516151323426BPAlfpDYlDO",
  GUEST_DEPOSIT_REQUEST:   "KA01TP2604281611290012L8YcvFUtho",
  GUEST_CHECKIN_REMINDER:  "KA01TP260428162539155zCzicCGSy87",
} as const;

export { TEMPLATE };

function makeAuthHeader(): string {
  const date = new Date().toISOString();
  const salt = crypto.randomBytes(8).toString("hex");
  const sig = crypto.createHmac("sha256", API_SECRET).update(date + salt).digest("hex");
  return `HMAC-SHA256 apiKey=${API_KEY}, date=${date}, salt=${salt}, signature=${sig}`;
}

interface Button {
  buttonType: "WL" | "AL" | "BK" | "MD";
  buttonName: string;
  linkMo?: string;
  linkPc?: string;
}

export async function sendAlimtalk(
  to: string,
  templateId: string,
  variables: Record<string, string>,
  buttons?: Button[],
): Promise<void> {
  if (!API_KEY || !API_SECRET) {
    console.warn("[Solapi] API key not set, skipping alimtalk");
    return;
  }

  const cleanTo = to.replace(/[^0-9]/g, "");

  const kakaoOptions: Record<string, unknown> = { pfId: PF_ID, templateId, variables };
  if (buttons?.length) kakaoOptions.buttons = buttons;

  const res = await fetch("https://api.solapi.com/messages/v4/send", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: makeAuthHeader() },
    body: JSON.stringify({ message: { to: cleanTo, kakaoOptions } }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    console.error("[Solapi] failed:", JSON.stringify(err));
  }
}
