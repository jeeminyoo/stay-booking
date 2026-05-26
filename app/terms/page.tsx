import Link from "next/link";
import Logo from "@/components/Logo";

export const metadata = { title: "이용약관 | Staypick" };

const SECTIONS = [
  {
    title: "제1조 (목적)",
    content: `이 약관은 Staypick(이하 "서비스")이 제공하는 숙소 예약 플랫폼 서비스의 이용조건 및 절차, 이용자와 서비스 간의 권리·의무 및 책임사항을 규정함을 목적으로 합니다.`,
  },
  {
    title: "제2조 (정의)",
    content: `① "서비스"란 호스트가 숙소를 등록하고 게스트가 해당 숙소를 예약할 수 있도록 Staypick이 제공하는 온라인 플랫폼을 말합니다.
② "호스트"란 카카오 계정으로 로그인하여 숙소를 등록·관리하는 이용자를 말합니다.
③ "게스트"란 서비스를 통해 숙소를 조회하고 예약하는 이용자를 말합니다.
④ "예약"이란 게스트가 원하는 날짜와 객실을 선택하고 예약자 정보를 입력하여 예약 요청을 완료한 상태를 말합니다.`,
  },
  {
    title: "제3조 (약관의 효력 및 변경)",
    content: `① 이 약관은 서비스 화면에 게시하거나 기타 방법으로 공지함으로써 효력을 발생합니다.
② 서비스는 관련 법령을 위배하지 않는 범위 내에서 약관을 변경할 수 있으며, 변경 시 적용일자 및 변경 사유를 명시하여 7일 전부터 공지합니다.
③ 이용자가 변경된 약관에 동의하지 않는 경우 서비스 이용을 중단할 수 있습니다.`,
  },
  {
    title: "제4조 (서비스의 성격 및 범위)",
    content: `① 서비스는 호스트와 게스트를 연결하는 플랫폼으로, 실제 숙박 계약의 당사자는 호스트와 게스트입니다.
② 서비스는 결제를 직접 처리하지 않습니다. 게스트는 호스트가 등록한 계좌로 직접 입금하며, 서비스는 이 과정에 개입하지 않습니다.
③ 서비스는 예약 생성, 상태 관리, 알림 발송 등의 기능을 제공하며 수수료를 부과하지 않습니다.
④ 서비스는 플랫폼 이용료로 호스트에게 구독 요금을 부과할 수 있습니다.`,
  },
  {
    title: "제5조 (예약 및 결제)",
    content: `① 게스트는 원하는 숙소·객실·날짜를 선택하고 예약자 정보(성명, 휴대폰번호)를 입력하여 예약을 완료합니다.
② 예약 완료 후 상태는 '입금 대기'이며, 게스트는 호스트 계좌로 직접 이체해야 합니다.
③ 게스트가 입금 후 '입금확인 요청'을 전송하면 호스트가 확인 후 예약을 확정합니다.
④ 입금 대기 상태에서 설정된 시간 내 입금확인 요청이 없으면 예약이 자동 취소됩니다.
⑤ 입금확인 요청 상태에서는 자동 취소가 발생하지 않으며, 호스트가 직접 확정 또는 취소해야 합니다.`,
  },
  {
    title: "제6조 (취소 및 환불)",
    content: `① 예약 취소는 호스트 또는 게스트의 요청에 의해 처리됩니다.
② 환불은 호스트와 게스트 간 직접 협의하여 처리하며, 서비스는 환불 과정에 개입하지 않습니다.
③ 서비스는 호스트의 환불 이행을 보증하지 않으며, 분쟁 발생 시 당사자 간 해결을 원칙으로 합니다.`,
  },
  {
    title: "제7조 (호스트의 의무)",
    content: `① 호스트는 실제 운영 가능한 숙소 정보만 등록해야 합니다.
② 호스트는 등록한 계좌 정보를 정확하게 유지해야 합니다.
③ 호스트는 예약 확정 후 게스트가 정상적으로 숙소를 이용할 수 있도록 해야 합니다.
④ 호스트는 서비스를 통해 알게 된 게스트의 개인정보를 예약 목적 이외에 사용할 수 없습니다.`,
  },
  {
    title: "제8조 (게스트의 의무)",
    content: `① 게스트는 정확한 예약자 정보를 입력해야 합니다.
② 게스트는 예약 확정 후 숙소 이용 규정을 준수해야 합니다.
③ 게스트는 서비스를 통해 알게 된 호스트의 정보를 예약 목적 이외에 사용할 수 없습니다.`,
  },
  {
    title: "제9조 (서비스의 책임 제한)",
    content: `① 서비스는 호스트와 게스트 간의 거래에 직접 관여하지 않으며, 거래로 인한 손해에 대해 책임을 지지 않습니다.
② 서비스는 천재지변, 서버 장애 등 불가항력적 사유로 인한 서비스 중단에 대해 책임을 지지 않습니다.
③ 서비스는 호스트가 등록한 숙소 정보의 정확성을 보증하지 않습니다.`,
  },
  {
    title: "제10조 (분쟁 해결)",
    content: `① 서비스 이용과 관련한 분쟁이 발생한 경우, 당사자 간 협의로 해결을 우선합니다.
② 협의가 이루어지지 않을 경우 관련 법령에 따른 관할 법원에서 해결합니다.
③ 서비스와 이용자 간의 분쟁에 관한 소송은 대한민국 법률을 준거법으로 합니다.`,
  },
  {
    title: "부칙",
    content: `이 약관은 2025년 1월 1일부터 시행합니다.`,
  },
];

export default function TermsPage() {
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
          <h1 className="text-2xl font-black text-gray-900 mb-1">이용약관</h1>
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

        <p className="text-center text-xs text-gray-300 mt-8 pb-4">© 2025 Staypick. All rights reserved.</p>
      </main>
    </div>
  );
}
