"use client"

import { useState, useEffect, useRef } from "react"
import { useParams } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import Link from "next/link"

type WorkOrderInfo = {
  order_number: string
  price: number | null
  status: string
  customers: { full_name: string } | null
}

type Card = {
  id: string
  title: string
  description: string | null
  position: number
  column_id: string
  due_date: string | null
  labels: string[]
  work_order_id: string | null
  work_orders: WorkOrderInfo | null
}

type Column = { id: string; name: string; color: string; position: number; cards: Card[] }

const STATUS_MAP: Record<string, { label: string; class: string }> = {
  pending: { label: "Pendiente", class: "bg-yellow-100 text-yellow-700" },
  in_progress: { label: "En proceso", class: "bg-blue-100 text-blue-700" },
  completed: { label: "Completado", class: "bg-green-100 text-green-700" },
  cancelled: { label: "Cancelado", class: "bg-red-100 text-red-700" },
}

export default function KanbanBoardPage() {
  const { id } = useParams<{ id: string }>()
  const [board, setBoard] = useState<{ name: string } | null>(null)
  const [columns, setColumns] = useState<Column[]>([])
  const [loading, setLoading] = useState(true)
  const [dragging, setDragging] = useState<string | null>(null)
  const [showNewCard, setShowNewCard] = useState<string | null>(null)
  const [newCardTitle, setNewCardTitle] = useState("")
  const dragCardId = useRef<string | null>(null)
  const dragFromColId = useRef<string | null>(null)

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const sb = supabase as any
      const [{ data: b }, { data: cols }, { data: cardsRaw }] = await Promise.all([
        supabase.from("production_boards").select("name").eq("id", id).single(),
        supabase.from("production_columns").select("*").eq("board_id", id).order("position"),
        sb
          .from("production_cards")
          .select("*, work_orders(order_number, price, status, customers(full_name))")
          .eq("board_id", id)
          .order("position"),
      ])
      const cards = (cardsRaw ?? []) as Card[]
      if (b) setBoard(b)
      if (cols) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const typedCols = cols as any[]
        setColumns(typedCols.map((col) => ({
          ...col,
          cards: cards
            .filter((c) => c.column_id === col.id)
            .sort((a, b) => a.position - b.position),
        })))
      }
      setLoading(false)
    }
    load()
  }, [id])

  function onDragStart(cardId: string, colId: string) {
    dragCardId.current = cardId
    dragFromColId.current = colId
    setDragging(cardId)
  }

  function onDragEnd() {
    setDragging(null)
    dragCardId.current = null
    dragFromColId.current = null
  }

  async function onDrop(targetColId: string) {
    const cardId = dragCardId.current
    const fromColId = dragFromColId.current
    if (!cardId || fromColId === targetColId) return

    setColumns((prev) => {
      const updated = prev.map((c) => ({ ...c, cards: [...c.cards] }))
      let moved: Card | undefined
      for (const col of updated) {
        const idx = col.cards.findIndex((c) => c.id === cardId)
        if (idx !== -1) { moved = { ...col.cards[idx], column_id: targetColId }; col.cards.splice(idx, 1); break }
      }
      if (moved) {
        const tCol = updated.find((c) => c.id === targetColId)
        if (tCol) { moved.position = tCol.cards.length; tCol.cards.push(moved) }
      }
      return updated
    })

    const supabase = createClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase.from("production_cards") as any).update({ column_id: targetColId }).eq("id", cardId)
  }

  async function createCard(colId: string) {
    if (!newCardTitle.trim()) return
    const supabase = createClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = supabase as any
    const { data: tu } = await sb.from("tenant_users").select("tenant_id").single()
    const tCol = columns.find((c) => c.id === colId)
    const { data } = await sb.from("production_cards").insert({
      board_id: id, column_id: colId, title: newCardTitle.trim(),
      position: tCol?.cards.length ?? 0, tenant_id: tu?.tenant_id, labels: [],
    }).select("*, work_orders(order_number, price, status, customers(full_name))").single()
    if (data) {
      setColumns((prev) => prev.map((c) =>
        c.id === colId ? { ...c, cards: [...c.cards, data as Card] } : c
      ))
    }
    setNewCardTitle("")
    setShowNewCard(null)
  }

  if (loading) return <div className="p-6 text-gray-400 text-sm">Cargando tablero...</div>

  const totalCards = columns.reduce((s, c) => s + c.cards.length, 0)

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <div className="px-6 py-4 bg-white border-b border-gray-200 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <Link href="/app/production" className="text-gray-400 hover:text-gray-600 text-sm">← Tableros</Link>
          <span className="text-gray-300">/</span>
          <h1 className="font-bold text-gray-900">{board?.name}</h1>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-400">{totalCards} tarjeta{totalCards !== 1 ? "s" : ""}</span>
          <Link href="/app/orders/new"
            className="bg-[#2563EB] hover:bg-blue-700 text-white text-xs font-medium px-3 py-1.5 rounded-lg transition-colors">
            + Nueva orden
          </Link>
        </div>
      </div>

      <div className="flex-1 overflow-x-auto p-6 bg-gray-50">
        <div className="flex gap-4 h-full items-start min-w-max">
          {columns.map((col) => (
            <div key={col.id} className="w-76 flex flex-col rounded-xl bg-gray-100 shrink-0"
              style={{ width: "300px" }}
              onDragOver={(e) => e.preventDefault()} onDrop={() => onDrop(col.id)}>
              <div className="px-4 py-3 flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: col.color }} />
                <span className="font-semibold text-gray-700 text-sm flex-1">{col.name}</span>
                <span className="text-xs text-gray-400 bg-gray-200 rounded-full px-2 py-0.5">{col.cards.length}</span>
              </div>

              <div className="px-3 pb-3 space-y-2 flex-1 min-h-16">
                {col.cards.map((card) => {
                  const wo = card.work_orders
                  const statusInfo = wo ? STATUS_MAP[wo.status] : null
                  return (
                    <div key={card.id} draggable
                      onDragStart={() => onDragStart(card.id, col.id)}
                      onDragEnd={onDragEnd}
                      className={`bg-white rounded-lg p-3 shadow-sm cursor-grab active:cursor-grabbing border transition-all
                        ${dragging === card.id ? "opacity-40 rotate-1 border-blue-300" : "border-gray-200 hover:border-blue-200 hover:shadow-md"}`}>

                      {/* Si tiene orden vinculada */}
                      {wo && (
                        <div className="flex items-center justify-between mb-2">
                          <Link href={`/app/orders/${card.work_order_id}`}
                            className="text-xs font-mono text-blue-600 hover:underline">
                            {wo.order_number}
                          </Link>
                          {statusInfo && (
                            <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${statusInfo.class}`}>
                              {statusInfo.label}
                            </span>
                          )}
                        </div>
                      )}

                      <p className="text-sm font-medium text-gray-900 leading-snug">{card.title}</p>

                      {wo?.customers?.full_name && (
                        <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                          <span>👤</span> {wo.customers.full_name}
                        </p>
                      )}

                      {card.description && !wo && (
                        <p className="text-xs text-gray-500 mt-1 line-clamp-2">{card.description}</p>
                      )}

                      <div className="flex items-center justify-between mt-2 flex-wrap gap-1">
                        {card.due_date && (
                          <div className="flex items-center gap-1 text-xs text-gray-400">
                            <span>📅</span>
                            <span>{new Date(card.due_date + "T00:00:00").toLocaleDateString("es-CO")}</span>
                          </div>
                        )}
                        {wo?.price && (
                          <span className="text-xs text-gray-500 font-medium">
                            ${Number(wo.price).toLocaleString("es-CO")}
                          </span>
                        )}
                      </div>

                      {card.labels?.length > 0 && (
                        <div className="flex gap-1 mt-2 flex-wrap">
                          {card.labels.map((l, i) => (
                            <span key={i} className="text-xs bg-blue-100 text-blue-700 rounded px-1.5 py-0.5">{l}</span>
                          ))}
                        </div>
                      )}
                    </div>
                  )
                })}

                {showNewCard === col.id ? (
                  <div className="bg-white rounded-lg p-2 border border-blue-300 shadow-sm">
                    <textarea autoFocus value={newCardTitle} onChange={(e) => setNewCardTitle(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); createCard(col.id) }
                        if (e.key === "Escape") { setShowNewCard(null); setNewCardTitle("") }
                      }}
                      placeholder="Título de la tarjeta... (Enter para guardar)"
                      className="w-full text-sm resize-none focus:outline-none p-1 min-h-14" />
                    <div className="flex gap-2 mt-1">
                      <button onClick={() => createCard(col.id)}
                        className="bg-[#2563EB] text-white text-xs px-3 py-1.5 rounded-lg font-medium">
                        Agregar
                      </button>
                      <button onClick={() => { setShowNewCard(null); setNewCardTitle("") }}
                        className="text-gray-500 text-xs px-2 py-1.5 hover:bg-gray-100 rounded-lg">
                        Cancelar
                      </button>
                    </div>
                  </div>
                ) : (
                  <button onClick={() => setShowNewCard(col.id)}
                    className="w-full text-left text-sm text-gray-400 hover:text-gray-600 px-2 py-1.5 hover:bg-gray-200 rounded-lg transition-colors">
                    + Agregar tarjeta
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
