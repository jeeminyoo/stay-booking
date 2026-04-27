<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# UI 규칙

## 셀렉트박스 (Select)

모든 `<select>` 요소는 반드시 아래 패턴을 사용한다. 브라우저 기본 화살표를 제거하고 커스텀 chevron SVG를 사용한다.

```tsx
<div className="relative inline-block">
  <select className="appearance-none border border-gray-200 rounded-xl pl-3 pr-10 py-2 text-sm text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent">
    ...
  </select>
  <svg className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="6 9 12 15 18 9" />
  </svg>
</div>
```

- 래퍼: `relative inline-block` (레이아웃에 따라 `block` 또는 `w-full` 조정 가능)
- `appearance-none` 필수 — 없으면 브라우저 기본 화살표와 커스텀 화살표가 겹침
- `pl-3 pr-10` 필수 — `px-3` 사용 시 우측 화살표 아이콘이 텍스트와 겹침
- SVG에 `pointer-events-none` 필수 — 클릭이 select로 통과되어야 함
