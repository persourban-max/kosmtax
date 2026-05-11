"use client"

export default function PrintButton() {
  return (
    <button
      onClick={() => window.print()}
      className="bg-[#2563EB] hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
    >
      🖨️ Imprimir / PDF
    </button>
  )
}
