"use client";
export default function PrintButton() {
  return (
    <button onClick={() => window.print()} className="no-print text-sm text-white/70 hover:text-white underline cursor-pointer">
      Print / save as PDF
    </button>
  );
}
