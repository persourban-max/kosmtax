import { createClient } from "@/lib/supabase/server"
import Link from "next/link"
import SyncOrdersButton from "./sync-button"

type Board = { id: string; name: string; description: string | null }

export default async function ProductionPage() {
  const supabase = createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: boards } = await (supabase as any)
    .from("production_boards")
    .select("*")
    .eq("is_active", true)
    .order("created_at") as { data: Board[] | null }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Producción</h1>
          <p className="text-gray-500 text-sm mt-1">Vista Kanban de tu flujo de trabajo</p>
        </div>
        <div className="flex items-center gap-3">
          <SyncOrdersButton />
          <Link
            href="/app/production/new"
            className="bg-[#2563EB] hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
          >
            + Nuevo tablero
          </Link>
        </div>
      </div>

      {!boards?.length ? (
        <div className="bg-white rounded-xl border border-gray-200 p-16 text-center">
          <div className="text-5xl mb-4">🏭</div>
          <h3 className="font-semibold text-gray-900 mb-2">Sin tableros de producción</h3>
          <p className="text-gray-500 text-sm mb-4">Crea un tablero Kanban para visualizar tu flujo de trabajo</p>
          <Link href="/app/production/new" className="text-[#2563EB] text-sm hover:underline font-medium">
            Crear primer tablero →
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {boards.map((board) => (
            <Link
              key={board.id}
              href={`/app/production/${board.id}`}
              className="bg-white rounded-xl border border-gray-200 p-5 hover:border-[#2563EB]/50 transition-colors"
            >
              <h3 className="font-semibold text-gray-900 mb-1">{board.name}</h3>
              {board.description && (
                <p className="text-gray-500 text-sm">{board.description}</p>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
