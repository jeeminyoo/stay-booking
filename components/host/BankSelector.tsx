"use client";

// All bank logos are inline SVGs — zero external requests, zero DB storage.
// Official paths sourced from Wikimedia Commons (public domain mark).
// Geometric marks for 신한/우리/하나 are brand-inspired approximations.

interface Bank {
  name: string;
  abbr: string;
  bg: string;
  fg: string;
}

const BANKS: Bank[] = [
  { name: "KB국민",    abbr: "KB",   bg: "#FFFFFF", fg: "#FCAF16" },
  { name: "신한",      abbr: "신한",  bg: "#004A97", fg: "#FFFFFF" },
  { name: "우리",      abbr: "우리",  bg: "#0076CE", fg: "#FFFFFF" },
  { name: "하나",      abbr: "하나",  bg: "#009E60", fg: "#FFFFFF" },
  { name: "NH농협",    abbr: "NH",   bg: "#009B3A", fg: "#FFFFFF" },
  { name: "IBK기업",   abbr: "IBK",  bg: "#0066B3", fg: "#FFFFFF" },
  { name: "카카오뱅크", abbr: "카카오", bg: "#FEE500", fg: "#1C1C1C" },
  { name: "케이뱅크",  abbr: "K",    bg: "#0F0060", fg: "#FFFFFF" },
  { name: "토스뱅크",  abbr: "toss", bg: "#1B64DA", fg: "#FFFFFF" },
  { name: "새마을금고", abbr: "MG",   bg: "#CF1313", fg: "#FFFFFF" },
  { name: "신협",      abbr: "신협",  bg: "#0033A0", fg: "#FFFFFF" },
  { name: "우체국",    abbr: "우체",  bg: "#E60012", fg: "#FFFFFF" },
  { name: "수협",      abbr: "수협",  bg: "#0070C0", fg: "#FFFFFF" },
  { name: "SC제일",    abbr: "SC",   bg: "#00AAAD", fg: "#FFFFFF" },
  { name: "부산",      abbr: "부산",  bg: "#00318A", fg: "#FFFFFF" },
  { name: "대구",      abbr: "대구",  bg: "#006EAF", fg: "#FFFFFF" },
  { name: "경남",      abbr: "경남",  bg: "#003F8F", fg: "#FFFFFF" },
  { name: "광주",      abbr: "광주",  bg: "#00539B", fg: "#FFFFFF" },
  { name: "전북",      abbr: "전북",  bg: "#002F87", fg: "#FFFFFF" },
  { name: "제주",      abbr: "제주",  bg: "#005BAC", fg: "#FFFFFF" },
  { name: "씨티",      abbr: "Citi", bg: "#003B87", fg: "#FFFFFF" },
  { name: "SBI저축",   abbr: "SBI",  bg: "#E2001A", fg: "#FFFFFF" },
];

// ─── KB국민 ─────────────────────────────────────────────────────────────────
// Official KB leaf/star mark — KB_logo.svg (Wikimedia Commons, public domain)
// viewBox trimmed to icon-only portion (0 0 51 36.2)
function KBIcon() {
  return (
    <svg viewBox="0 0 51 36.2" width="28" height="20" xmlns="http://www.w3.org/2000/svg">
      <path fill="#FCAF16" d="M49.975,18.568c0-0.001-0.439-0.28-0.439-0.28c-1.498-1.495-3.584-2.143-6.373-1.98
        c-2.322,0.142-4.164,1.063-5.57,1.918c0-0.021-0.002-0.042-0.002-0.063c0-0.728,0.082-1.516,0.164-2.282
        c0.08-0.778,0.164-1.57,0.164-2.319c0-0.765-0.086-1.49-0.35-2.11c-0.066-0.159-0.213-0.254-0.398-0.254
        c-0.75,0.017-2.215,0.53-2.57,0.842c0,0.002-0.193,0.423-0.193,0.423c-0.012,0.831-0.195,3.15-0.381,3.432
        c0.008-0.01-0.098,0.28-0.098,0.28c-0.316,3.313-0.322,6.226-0.031,8.727c0.033,0.25,0.516,0.625,0.887,0.761
        c0.408,0.151,1.684-0.191,2.42-0.467c-0.01,0.003,0.275-0.044,0.275-0.044c0.232-0.025,0.369-0.221,0.359-0.486
        c-0.004-0.006,0.018-0.72,0.018-0.72c0.531-2.158,2.68-4.734,5.223-5.121c1.438-0.228,2.572,0.142,3.469,1.118
        c0.121,0.176,0.383,1.729-0.564,3.514c-0.705,1.321-2.115,2.436-3.971,3.131c-1.756,0.668-3.688,0.937-6.074,0.855
        c-0.1-0.064-2.234-1.511-2.234-1.511c-1.893-1.329-4.244-2.982-6.375-3.791c-0.375-0.144-1.045-0.701-1.449-1.035
        l-0.221-0.181c-1.229-0.985-3.568-2.546-5.447-3.796c0,0-0.848-0.569-1.012-0.679c0.002-0.07,0.002-0.212,0.002-0.212
        c0.055-0.06,1.236-0.768,1.236-0.768c1.652-0.967,2.416-1.441,2.578-1.686c-0.033,0.04,0.219-0.129,0.219-0.129
        c0.016-0.007,4.098-2.318,4.098-2.318c3.934-2.16,8.389-4.613,10.729-7.036c0.004-0.003,0.115-0.371,0.115-0.371
        L38.227,3.6c0.156-0.519,0.164-0.915,0.033-1.376c-0.033-0.132-0.154-0.284-0.316-0.313
        c-1.828-0.183-4.184,0.913-6.33,2.926c-0.484,0.453-0.891,0.676-1.32,0.909L29.965,5.93
        c-2.365,1.345-7.693,4.652-10.484,6.437c0.184-3,0.738-7.267,1.422-10.824l-0.076-0.425
        c-0.008-0.014-0.289-0.538-0.289-0.538L20.32,0.195l-0.063-0.017c-0.557-0.281-1.012-0.167-1.346-0.084
        l-0.557,0.206l-0.744,0.27c-0.146,0.029-0.25,0.12-0.307,0.262c-1.332,3.22-2.443,8.516-2.707,12.753
        c-2.662-1.693-5.123-2.911-6.33-3.499l-0.033-0.019l-0.143-0.031C7.656,9.98,7.127,9.661,6.619,9.353
        C6.564,9.32,5.605,8.696,5.605,8.696L4.059,7.705C4.07,7.715,3.65,7.612,3.65,7.612
        C2.986,7.727,1.711,8.584,1.332,9.168c-0.049,0.078-0.07,0.161-0.07,0.248c0,0.124,0.039,0.247,0.07,0.368
        L1.4,10.099l0.072,0.189c0.742,0.76,2.613,2.026,4.447,3.013l2.127,1.127l3.256,1.778
        c0,0.015,0.555,0.441,0.555,0.441l0.383,0.22c0,0,0.045,0.026,0.07,0.043
        c-0.867,0.581-5.922,3.955-5.922,3.955l-3.113,2.063c-0.295,0.2-1.523,0.75-1.795,0.859
        c-0.674,0.275-1.186,0.697-1.396,1.155L0,25.123l0.084,0.119l0.238,0.181
        c-0.012,0,0.318,0.208,0.318,0.208l0.344,0.235c0.008,0.003,0.324,0.052,0.324,0.052
        c0.547,0.021,1.357-0.291,2.873-0.955c1.393-0.616,5.174-2.898,6.791-3.872l0.689-0.413
        c0.285,0.023,0.598-0.218,0.879-0.429c0.324-0.259,1.029-0.692,1.459-0.882
        c0.014-0.004,0.258-0.141,0.49-0.27c-0.002,0.071-0.004,0.185-0.004,0.185
        c0.072,4.946,0.355,8.541,0.896,11.313l0.008,0.047l0.053,0.112
        c0.266,0.39,0.568,1.563,0.838,2.596l0.615,2.064c0.014,0.025,0.174,0.194,0.174,0.194
        c0.352,0.239,1.424,0.65,2.139,0.565l0.178-0.021L19.5,35.9c0.061-0.309,0.082-0.612,0.082-0.946
        c0-0.377-0.027-0.792-0.061-1.302l-0.049-0.744c-0.227-3.452-0.453-8.437-0.453-11.751
        c0-0.093,0-0.177,0-0.264c0.588,0.367,3.152,1.984,3.152,1.984
        c4.367,2.833,10.963,7.112,14.949,8.243c0.207,0.063,0.426,0.015,0.578-0.132
        c0.006-0.008,0.613-0.394,0.613-0.394l0.115-0.047c0.229-0.109,0.381-0.494,0.408-0.912
        c3.359-0.169,8.045-1.463,10.553-4.615c0.971-1.223,1.406-2.719,1.406-4
        C50.795,19.972,50.504,19.066,49.975,18.568"/>
    </svg>
  );
}

// ─── 신한 ────────────────────────────────────────────────────────────────────
// Brand-inspired S-curve mark (two-arc motif from Shinhan's brand identity)
function ShinhanIcon() {
  return (
    <svg viewBox="0 0 24 26" width="18" height="20" xmlns="http://www.w3.org/2000/svg">
      <path fill="white" d="M12,1C7.2,1,3.5,4.2,3.5,8.2c0,3.2,2.2,5.4,6,6l3,0.4
        c2.2,0.4,3.2,1.4,3.2,2.8c0,1.8-1.6,3-4.2,3c-2.8,0-4.4-1.4-4.4-3.2H4.4
        C4.4,21.2,7.8,24,12,24c5,0,8.5-2.8,8.5-6.8c0-3.2-2.2-5.4-6-6l-3-0.4
        C9.3,10.4,8.3,9.4,8.3,8c0-1.8,1.6-3,4-3c2.6,0,4.2,1.4,4.2,3H20
        C20,4.2,16.6,1,12,1Z"/>
    </svg>
  );
}

// ─── 우리 ────────────────────────────────────────────────────────────────────
// Brand-inspired two-petal/leaf mark (Woori's community/people motif)
function WooriIcon() {
  return (
    <svg viewBox="0 0 24 26" width="20" height="22" xmlns="http://www.w3.org/2000/svg">
      <path fill="white" d="M12,2 C9.5,2 7.5,4 7.5,6.5 C7.5,9 9.5,11 12,11
        C14.5,11 16.5,9 16.5,6.5 C16.5,4 14.5,2 12,2Z"/>
      <path fill="white" d="M5,13 C3,13.5 2,15 2,17 L2,22 L7,22 L7,17.5
        C7,16.5 7.8,15.8 8.5,15.5 C9.5,17.5 11,18.5 12,18.5
        C13,18.5 14.5,17.5 15.5,15.5 C16.2,15.8 17,16.5 17,17.5
        L17,22 L22,22 L22,17 C22,15 21,13.5 19,13
        C17.5,12.5 15.5,13.5 14,15 C13.5,14.2 12.8,13.5 12,13.5
        C11.2,13.5 10.5,14.2 10,15 C8.5,13.5 6.5,12.5 5,13Z"/>
    </svg>
  );
}

// ─── 하나 ────────────────────────────────────────────────────────────────────
// Brand-inspired wing/sprout mark (Hana's growth motif — two upward arcs)
function HanaIcon() {
  return (
    <svg viewBox="0 0 24 26" width="20" height="22" xmlns="http://www.w3.org/2000/svg">
      <path fill="none" stroke="white" strokeWidth="2.8" strokeLinecap="round"
        d="M8.5,21 C8.5,15 10,8 12,5"/>
      <path fill="none" stroke="white" strokeWidth="2.8" strokeLinecap="round"
        d="M15.5,21 C15.5,15 14,8 12,5"/>
      <circle fill="white" cx="12" cy="23" r="1.4"/>
    </svg>
  );
}

// ─── NH농협 ──────────────────────────────────────────────────────────────────
// Official NH mark — NACF_(NongHyup)_Logo.svg (Wikimedia Commons, public domain)
// Transforms preserved from original SVG; fill changed to white
function NHIcon() {
  return (
    <svg viewBox="0 0 21.458813 26.506565" width="18" height="22" xmlns="http://www.w3.org/2000/svg">
      <g transform="translate(-131.5632,-112.8046)">
        <g transform="matrix(0.35277778,0,0,0.35277778,37.560323,-3.7857059)">
          <path fill="white" d="m 311.69531,330.49219 -14.8164,7.4375 -14.8086,-7.4375 14.8086,28.16797 z"/>
          <path fill="white" d="m 316.87891,352.26172 -0.22657,-0.19922 10.57422,-4.44141 v -14.85937
            l -18.36719,7.82422 c 0,0 -9.94921,18.84765 -10.17578,19.28125
            7.79297,0.92968 13.64063,7.46484 13.64063,15.33203
            0,8.52344 -6.92188,15.46484 -15.44531,15.46484
            -8.52344,0 -15.45313,-6.9414 -15.45313,-15.46484
            0,-7.86719 5.84766,-14.40235 13.64063,-15.33203
            -0.22657,-0.4336 -10.16407,-19.28125 -10.16407,-19.28125
            l -18.33984,-7.82422 v 14.85937 l 10.5625,4.44141 -0.23438,0.19922
            c -6.625,5.79297 -10.42578,14.15234 -10.42578,22.9375
            0,16.77734 13.64453,30.42969 30.41407,30.42969
            16.76953,0 30.41406,-13.65235 30.41406,-30.42969
            0,-8.77735 -3.78906,-17.13672 -10.41406,-22.9375"/>
        </g>
      </g>
    </svg>
  );
}

// ─── 카카오뱅크 ───────────────────────────────────────────────────────────────
// Official Kakaobank icon mark — KakaoBank_logo.svg (Wikimedia Commons, public domain)
// Only the dark icon paths (x < 37); yellow bg comes from circle bg color
function KakaoIcon() {
  return (
    <svg viewBox="5 5 28 28" width="22" height="22" xmlns="http://www.w3.org/2000/svg">
      <g fill="#1c1c1c">
        <path d="m19.547 23.421h-1.9031v-10.104h1.9031z
          m4.9747-5.0519c1.6412-1.0818 2.7244-2.9394 2.7244-5.0519
          0-3.339-2.7078-6.0455-6.0468-6.0455h-10.134
          c-0.19431 0-0.35002 0.15572-0.35002 0.35002v21.495
          c0 0.1943 0.15572 0.3514 0.35002 0.3514h10.134
          c3.339 0 6.0468-2.7065 6.0468-6.0468
          0-2.1125-1.0831-3.9715-2.7244-5.0519"/>
      </g>
    </svg>
  );
}

// ─── 케이뱅크 ─────────────────────────────────────────────────────────────────
// Official K letterform — Kbank_logo.svg (Wikimedia Commons, public domain)
// Fill changed to white; viewBox trimmed to K glyph (0 0 29 34)
function KBankIcon() {
  return (
    <svg viewBox="0 0 29 34" width="18" height="21" xmlns="http://www.w3.org/2000/svg">
      <polygon fill="white"
        points="6.6495526,0 0,0 0,33.211679 6.6495526,33.211679 6.6495526,18.225332
          19.919107,33.211679 28.467153,33.211679 13.78579,16.605839 28.069724,0
          19.654958,0 6.6495526,15.11929"/>
    </svg>
  );
}

// ─── 토스뱅크 ─────────────────────────────────────────────────────────────────
// Toss-style forward-arrow mark (Toss brand motif)
function TossIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" xmlns="http://www.w3.org/2000/svg">
      <path fill="none" stroke="white" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round"
        d="M7,4 L17,12 L7,20"/>
    </svg>
  );
}

// ─── BankLogo dispatcher ─────────────────────────────────────────────────────
function BankLogo({ bank }: { bank: Bank }) {
  switch (bank.name) {
    case "KB국민":    return <KBIcon />;
    case "신한":      return <ShinhanIcon />;
    case "우리":      return <WooriIcon />;
    case "하나":      return <HanaIcon />;
    case "NH농협":    return <NHIcon />;
    case "카카오뱅크": return <KakaoIcon />;
    case "케이뱅크":  return <KBankIcon />;
    case "토스뱅크":  return <TossIcon />;
    default:
      return (
        <span
          style={{ color: bank.fg }}
          className="text-[11px] font-bold leading-none tracking-tight"
        >
          {bank.abbr}
        </span>
      );
  }
}

interface Props {
  value: string;
  onChange: (name: string) => void;
}

export default function BankSelector({ value, onChange }: Props) {
  return (
    <div className="w-full">
      <div className="grid grid-cols-4 gap-2">
        {BANKS.map((bank) => {
          const selected = value === bank.name;
          return (
            <button
              key={bank.name}
              type="button"
              onClick={() => onChange(selected ? "" : bank.name)}
              className={`flex flex-col items-center gap-1.5 py-3 px-1 rounded-2xl border transition-all
                ${selected
                  ? "border-indigo-500 bg-indigo-50 ring-2 ring-indigo-200"
                  : "border-gray-100 bg-white hover:border-gray-200 hover:bg-gray-50"}`}
            >
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 overflow-hidden"
                style={{ backgroundColor: bank.bg }}
              >
                <BankLogo bank={bank} />
              </div>
              <span className={`text-[11px] leading-tight text-center font-medium ${selected ? "text-indigo-700" : "text-gray-600"}`}>
                {bank.name}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
