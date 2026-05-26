import Link from "next/link";
import Logo from "@/components/Logo";

export const metadata = { title: "개인정보처리방침 | Staypick" };

const SECTIONS = [
  {
    title: "제1조 (개인정보의 처리 목적)",
    content: `Staypick은 다음의 목적을 위해 개인정보를 처리합니다. 처리한 개인정보는 아래 목적 이외의 용도로 사용되지 않으며, 목적이 변경되는 경우 별도의 동의를 받을 예정입니다.

① 호스트 회원 관리
카카오 계정을 통한 로그인, 본인 확인, 서비스 이용에 따른 본인 식별

② 숙소 예약 서비스 제공
게스트의 예약 처리, 예약 상태 안내, 호스트와의 예약 정보 공유

③ 서비스 운영 및 개선
서비스 이용 기록 분석, 서비스 품질 향상`,
  },
  {
    title: "제2조 (처리하는 개인정보의 항목)",
    content: `① 호스트
- 필수: 카카오 회원번호(고유 식별자), 카카오톡 알림 수신 가능 여부
- 선택: 이름, 휴대폰번호 (알림 수신용)

② 게스트 (예약 시 수집)
- 필수: 예약자 성명, 휴대폰번호
- 선택: 예약 메모(요청사항), 입금 확인 메모

③ 자동 수집 정보
- 서비스 이용 기록, 접속 로그, 쿠키, IP 주소`,
  },
  {
    title: "제3조 (개인정보의 처리 및 보유 기간)",
    content: `① 호스트 정보: 서비스 탈퇴 시까지 보유. 탈퇴 후 즉시 삭제합니다.
② 게스트 예약 정보: 예약 완료일로부터 3년간 보유 후 삭제합니다. 단, 관련 법령에 따라 일정 기간 보관이 필요한 경우 해당 기간 동안 보관합니다.

관련 법령에 의한 보관 기간:
- 계약 또는 청약철회 등에 관한 기록: 5년 (전자상거래 등에서의 소비자보호에 관한 법률)
- 소비자 불만 또는 분쟁처리에 관한 기록: 3년 (동 법률)`,
  },
  {
    title: "제4조 (개인정보의 제3자 제공)",
    content: `① Staypick은 원칙적으로 이용자의 개인정보를 제3자에게 제공하지 않습니다.
② 다음의 경우에는 예외적으로 개인정보를 제공할 수 있습니다.
- 이용자가 사전에 동의한 경우
- 법령의 규정에 의거하거나 수사 목적으로 법령에 정해진 절차와 방법에 따라 수사기관의 요구가 있는 경우

③ 예약 서비스 제공을 위해 게스트의 예약 정보(성명, 휴대폰번호, 예약 내역)는 해당 숙소의 호스트에게 공개됩니다. 이에 동의하지 않는 경우 예약이 불가합니다.`,
  },
  {
    title: "제5조 (개인정보처리의 위탁)",
    content: `① Staypick은 원활한 서비스 제공을 위해 아래와 같이 개인정보 처리 업무를 위탁합니다.

- 수탁사: 카카오 (주)
  위탁 업무: 카카오 계정 인증, 알림톡 발송
  개인정보 보유 기간: 위탁 계약 종료 시까지

② 위탁 계약 시 개인정보 보호 관련 법규 준수, 개인정보에 관한 제3자 제공 금지 등 안전한 관리를 위한 사항을 규정합니다.`,
  },
  {
    title: "제6조 (정보주체의 권리·의무 및 행사방법)",
    content: `이용자는 개인정보주체로서 다음과 같은 권리를 행사할 수 있습니다.

① 개인정보 열람 요구
② 오류 등이 있을 경우 정정 요구
③ 삭제 요구
④ 처리 정지 요구

위 권리 행사는 서비스 내 문의 기능 또는 카카오 채널을 통해 요청할 수 있으며, 지체 없이 처리하겠습니다.`,
  },
  {
    title: "제7조 (개인정보의 안전성 확보 조치)",
    content: `Staypick은 개인정보 보호법 제29조에 따라 다음과 같이 안전성 확보에 필요한 기술적·관리적 조치를 취하고 있습니다.

① 개인정보에 대한 접근 권한 최소화
② HTTPS를 통한 데이터 암호화 전송
③ 외부 침입 차단을 위한 보안 시스템 운영
④ 개인정보 취급자 대상 교육 실시`,
  },
  {
    title: "제8조 (쿠키의 운영 및 거부)",
    content: `① Staypick은 서비스 이용 편의를 위해 브라우저의 로컬 스토리지에 최근 본 숙소, 알림 확인 여부 등의 정보를 저장합니다.
② 이 정보는 서버로 전송되지 않으며 기기 내에서만 처리됩니다.
③ 브라우저 설정에서 로컬 스토리지를 초기화하여 저장된 정보를 삭제할 수 있습니다.`,
  },
  {
    title: "제9조 (개인정보 보호책임자)",
    content: `Staypick은 개인정보 처리에 관한 업무를 총괄하고, 개인정보 처리와 관련한 이용자의 불만 처리 및 피해 구제를 위해 개인정보 보호책임자를 지정하고 있습니다.

개인정보 보호책임자
- 서비스명: Staypick
- 문의: 서비스 내 카카오 채널 '문의하기'

개인정보 처리와 관련한 문의사항은 카카오 채널을 통해 접수해 주시면 신속하게 답변 드리겠습니다.`,
  },
  {
    title: "제10조 (권익침해 구제방법)",
    content: `개인정보 침해에 대한 신고나 상담은 아래 기관에 문의할 수 있습니다.

- 개인정보 침해신고센터: privacy.kisa.or.kr / (국번없이) 118
- 개인정보 분쟁조정위원회: www.kopico.go.kr / 1833-6972
- 대검찰청 사이버수사과: www.spo.go.kr / (국번없이) 1301
- 경찰청 사이버수사국: ecrm.cyber.go.kr / (국번없이) 182`,
  },
  {
    title: "부칙",
    content: `이 개인정보처리방침은 2026년 1월 1일부터 시행합니다.`,
  },
];

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white sticky top-0 z-10 border-b border-gray-100">
        <div className="max-w-2xl mx-auto px-4 py-2 flex items-center justify-between">
          <Link href="/"><Logo /></Link>
          <Link href="/login" className="text-xs text-gray-400 hover:text-gray-600 transition-colors">← 돌아가기</Link>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-black text-gray-900 mb-1">개인정보처리방침</h1>
          <p className="text-sm text-gray-400">최종 수정일: 2026년 5월 26일</p>
        </div>

        <div className="space-y-6">
          {SECTIONS.map((s, i) => (
            <div key={i} className="bg-white rounded-2xl border border-gray-100 px-5 py-5">
              <h2 className="font-bold text-gray-900 text-sm mb-3">{s.title}</h2>
              <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-line">{s.content}</p>
            </div>
          ))}
        </div>

        <p className="text-center text-xs text-gray-300 mt-8 pb-4">© 2026 Staypick. All rights reserved.</p>
      </main>
    </div>
  );
}
