"use client";

import Link from "next/link";
import { useState } from "react";
import Logo from "@/components/Logo";

interface Section {
  id: string;
  emoji: string;
  title: string;
  items: { q: string; a: string | React.ReactNode }[];
}

const SECTIONS: Section[] = [
  {
    id: "flow",
    emoji: "🔄",
    title: "예약 흐름",
    items: [
      {
        q: "게스트가 예약하면 어떻게 되나요?",
        a: "게스트가 날짜·인원을 선택하고 예약자 정보를 입력하면 예약이 생성됩니다. 이때 상태는 '입금 대기'이며, 호스트에게 카카오톡 알림이 전송됩니다.",
      },
      {
        q: "예약 확정까지의 전체 흐름은?",
        a: (
          <ol className="list-decimal list-inside space-y-1.5 text-gray-600">
            <li><strong>입금 대기</strong> — 게스트가 예약 완료, 계좌이체 안내 화면 확인</li>
            <li><strong>입금확인요청</strong> — 게스트가 입금 후 확인 요청 메시지 전송</li>
            <li><strong>예약 확정</strong> — 호스트가 입금 확인 후 확정 버튼 클릭</li>
          </ol>
        ),
      },
      {
        q: "수수료가 있나요?",
        a: "플랫폼 수수료는 없습니다. 게스트가 호스트 계좌로 직접 이체하는 방식이며, 결제 중간 정산 기능은 제공하지 않습니다.",
      },
    ],
  },
  {
    id: "status",
    emoji: "📋",
    title: "예약 상태",
    items: [
      {
        q: "입금 대기란?",
        a: "게스트가 예약을 완료했지만 아직 입금 전인 상태입니다. 설정한 자동취소 시간 내에 호스트가 확정하지 않으면 자동으로 취소됩니다.",
      },
      {
        q: "입금확인요청이란?",
        a: "게스트가 입금했다고 직접 메시지를 보낸 상태입니다. 호스트가 실제 입금을 확인하고 '예약 확정' 버튼을 눌러야 합니다.",
      },
      {
        q: "자동취소란?",
        a: "자동취소 시간(기본 1시간) 내에 호스트가 확정하지 않은 경우 시스템이 자동으로 취소한 상태입니다. 응답 불가 시간대에는 타이머가 멈춥니다.",
      },
      {
        q: "취소된 예약은 어떻게 처리되나요?",
        a: "자동취소·직접취소 모두 해당 날짜의 블락이 해제되어 다른 게스트가 예약할 수 있게 됩니다. 환불은 호스트가 직접 처리해야 합니다.",
      },
    ],
  },
  {
    id: "settings",
    emoji: "⚙️",
    title: "설정",
    items: [
      {
        q: "자동취소 시간은 어떻게 설정하나요?",
        a: "설정 탭에서 30분 / 1시간 / 3시간 / 6시간 / 24시간 중 선택할 수 있습니다. 두 상태(입금 대기, 입금확인요청) 모두 동일한 시간이 적용됩니다.",
      },
      {
        q: "응답 불가 시간이란?",
        a: "새벽·심야처럼 호스트가 확인하기 어려운 시간대를 설정하면, 해당 시간에는 자동취소 타이머가 멈춥니다. 기본값은 오후 9시 ~ 오전 8시입니다.",
      },
    ],
  },
  {
    id: "property",
    emoji: "🏡",
    title: "숙소 관리",
    items: [
      {
        q: "숙소를 등록하려면 무엇이 필요한가요?",
        a: "숙소 이름, 주소, 대표 이미지, 단축 링크(슬러그), 계좌 정보, 객실 정보(이미지·요금 포함)가 필요합니다. 모두 입력해야 게시할 수 있습니다.",
      },
      {
        q: "게시중 / 비노출이란?",
        a: "게시중 상태여야 게스트가 링크로 숙소 페이지에 접근할 수 있습니다. 비노출로 전환하면 링크가 비활성화되어 새 예약을 받을 수 없습니다. 기존 확정된 예약에는 영향 없습니다.",
      },
      {
        q: "이용 유의사항을 등록해야 게시할 수 있나요?",
        a: "네. 게스트가 예약 완료 후 확인하는 필수 안내 페이지입니다. 유의사항을 등록하지 않으면 게시중으로 전환할 수 없습니다.",
      },
      {
        q: "객실별 개별 유의사항이란?",
        a: "객실이 2개 이상인 숙소는 유의사항을 공통으로 하나만 쓰거나, 객실마다 다르게 작성할 수 있습니다. 게스트는 예약한 객실에 해당하는 유의사항 링크를 받게 됩니다.",
      },
      {
        q: "단축 링크(슬러그)란?",
        a: "게스트에게 공유하는 숙소 URL의 마지막 경로입니다. 예: /s/my-stay. 영문 소문자·숫자·하이픈만 사용 가능하며, 한 번 게시 후에는 변경 시 기존 링크가 무효화되니 신중하게 설정하세요.",
      },
      {
        q: "요금은 어떻게 설정하나요?",
        a: "월~목 / 금 / 토 / 일 요일별로 기본 요금을 설정하고, 추가 인원 요금(성인·어린이)을 별도로 지정할 수 있습니다. 성수기 등 특정 기간에는 시즌 요금을 별도로 추가할 수 있습니다.",
      },
    ],
  },
  {
    id: "block",
    emoji: "🚫",
    title: "날짜 블락",
    items: [
      {
        q: "수동 블락이란?",
        a: "호스트가 직접 특정 날짜를 선택해 예약을 막는 기능입니다. 개인 일정, 청소일 등으로 날짜를 막을 때 사용합니다.",
      },
      {
        q: "정기 요일 블락이란?",
        a: "매주 특정 요일을 반복적으로 차단합니다. 예를 들어 매주 월요일을 청소일로 설정하면 해당 요일은 항상 예약 불가 상태가 됩니다.",
      },
      {
        q: "정기 블락의 예외 날짜는?",
        a: "정기 요일 블락이 설정되어 있어도, 특정 날짜만 예외적으로 열어둘 수 있습니다. 명절·특수일에 활용할 수 있습니다.",
      },
    ],
  },
  {
    id: "tips",
    emoji: "💡",
    title: "운영 팁",
    items: [
      {
        q: "게스트에게 링크를 공유하는 방법은?",
        a: "내 숙소 탭에서 '링크 복사' 버튼을 누르면 클립보드에 복사됩니다. 카카오톡, 문자 등으로 자유롭게 공유하세요.",
      },
      {
        q: "예약 알림은 어떻게 받나요?",
        a: "카카오톡 알림톡으로 예약 생성·입금확인요청 시 알림이 전송됩니다. 알림을 받으려면 사용 중인 카카오 계정의 알림톡 수신이 허용되어 있어야 합니다.",
      },
      {
        q: "문의는 어디서 하나요?",
        a: "화면 우측 하단의 카카오 채널 '문의하기' 버튼으로 운영팀에 문의할 수 있습니다.",
      },
    ],
  },
];

function AccordionItem({ q, a }: { q: string; a: string | React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-gray-100 last:border-0">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between gap-3 px-5 py-4 text-left hover:bg-gray-50 transition-colors">
        <span className="text-sm font-medium text-gray-800">{q}</span>
        <svg
          className={`shrink-0 text-gray-400 transition-transform ${open ? "rotate-180" : ""}`}
          width="16" height="16" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>
      {open && (
        <div className="px-5 pb-4 text-sm text-gray-600 leading-relaxed">
          {typeof a === "string" ? <p>{a}</p> : a}
        </div>
      )}
    </div>
  );
}

export default function HelpPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white">
        <div className="max-w-2xl mx-auto px-4 py-2 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Logo />
            <span className="text-gray-300">|</span>
            <span className="text-gray-600 text-sm">도움말</span>
          </div>
          <Link href="/host" className="text-xs text-gray-400 hover:text-gray-600 transition-colors">← 돌아가기</Link>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-8 space-y-4">
        <div className="mb-6">
          <h1 className="text-xl font-bold text-gray-900 mb-1">호스트 도움말</h1>
          <p className="text-sm text-gray-400">서비스 이용 정책과 기능 안내입니다.</p>
        </div>

        {SECTIONS.map(section => (
          <div key={section.id} className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
              <span className="text-base">{section.emoji}</span>
              <h2 className="font-bold text-gray-900 text-sm">{section.title}</h2>
            </div>
            {section.items.map((item, i) => (
              <AccordionItem key={i} q={item.q} a={item.a} />
            ))}
          </div>
        ))}

        <p className="text-center text-xs text-gray-300 pb-4">
          추가 문의는 화면 우측 하단 카카오 채널을 이용해주세요.
        </p>
      </main>
    </div>
  );
}
