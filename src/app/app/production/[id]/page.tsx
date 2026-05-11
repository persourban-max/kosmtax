"use client"

import { useState, useEffect, useRef } from "react"
import { useParams } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import Link from "next/link"

type Card = {
  id: string; title: string; description: string | null; position: number
  column_id: string; due_date: string | null; labels: string[]
}
type Column = { id: string; name: string; color: string; position: number; cards: Card[] }

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
      const [{ data: b }, { data: cols }, { data: cards }] = await Promise.all([
        supabase.from("production_boards").select("name").eq("id", id).single(),
        supabase.from("production_columns").select("*").eq("board_id", id).order("position"),
        supabase.from("production_cards").select("*").eq("board_id", id).order("position"),
      ])
      if (b) setBoard(b)
      if (cols) setColumns(cols.map((col) => ({
        ...col,
        cards: (cards ?? []).filter((c) => c.column_id === col.id).sort((a, b) => a.position - b.position),
      })))
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
    await supabase.from("production_cards").update({ column_id: targetColId }).eq("id", cardId)
  }

  async function createCard(colId: string) {
    if (!newCardTitle.trim()) return
    const supabase = createClient()
    const { data: tu } = await supabase.from("tenant_users").select("tenant_id").single()
    const tCol = columns.find((c) => c.id === colId)
    const { data } = await supabase.from("production_cards").insert({
      board_id: id, column_id: colId, title: newCardTitle.trim(),
      position: tCol?.cards.length ?? 0, tenant_id: tu?.tenant_id, labels: [],
    }).select().single()
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
        <span className="text-sm text-gray-400">{totalCards} tarjeta{totalCards !== 1 ? "s" : ""}</span>
      </div>

      <div className="flex-1 overflow-x-auto p-6 bg-gray-50">
        <div className="flex gap-4 h-full items-start min-w-max">
          {columns.map((col) => (
            <div key={col.id} className="w-72 flex flex-col rounded-xl bg-gray-100 shrink-0"
              onDragOver={(e) => e.preventDefault()} onDrop={() => onDrop(col.id)}>
              <div className="px-4 py-3 flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: col.color }} />
                <span className="font-semibold text-gray-700 text-sm flex-1">{col.name}</span>
                <span className="text-xs text-gray-400 bg-gray-200 rounded-full px-2 py-0.5">{col.cards.length}</span>
              </div>

              <div className="px-3 pb-3 space-y-2 flex-1 min-h-16">
                {col.cards.map((card) => (
                  <div key={card.id} draggable
                    onDragStart={() => onDragStart(card.id, col.id)}
                    onDragEnd={onDragEnd}
                    className={`bg-white rounded-lg p-3 shadow-sm cursor-grab active:cursor-grabbing border transition-all
                      ${dragging === card.id ? "opacity-40 rotate-1 border-blue-300" : "border-gray-200 hover:border-blue-200 hover:shadow-md"}`}>
                    <p className="text-sm font-medium text-gray-900 leading-snug">{card.title}</p>
                    {card.description && (
                      <p className="text-xs text-gray-500 mt-1 line-clamp-2">{card.description}</p>
                    )}
                    {card.due_date && (
                      <div className="mt-2 flex items-center gap-1 text-xs text-gray-400">
                        <span>📅</span>
                        <span>{new Date(card.due_date + "T00:00:00").toLocaleDateString("es-CO")}</span>
                      </div>
                    )}
                    {card.labels?.length > 0 && (
                      <div className="flex gap-1 mt-2 flex-wrap">
                        {card.labels.map((l, i) => (
                          <span key={i} className="text-xs bg-blue-100 text-blue-700 rounded px-1.5 py-0.5">{l}</span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}

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
