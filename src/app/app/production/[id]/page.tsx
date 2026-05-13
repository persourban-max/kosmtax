"use client"

import { useState, useEffect, useRef } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"

type WorkOrderInfo = {
  order_number: string
  title: string
  description: string | null
  price: number | null
  status: string
  priority: string
  due_date: string | null
  created_at: string
  customers: { full_name: string; phone: string | null } | null
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
  created_at: string
}

type Column = { id: string; name: string; color: string; position: number; cards: Card[] }

type FullOrder = {
  id: string
  order_number: string
  title: string
  description: string | null
  status: string
  priority: string
  price: number | null
  due_date: string | null
  created_at: string
  started_at: string | null
  completed_at: string | null
  notes: string | null
  customers: {
    full_name: string
    email: string | null
    phone: string | null
    city: string | null
  } | null
  work_order_items: Array<{
    id: string
    description: string
    quantity: number
    unit_price: number
  }>
}

const STATUS_MAP: Record<string, { label: string; class: string }> = {
  pending: { label: "Recibido", class: "bg-yellow-100 text-yellow-700" },
  in_progress: { label: "En proceso", class: "bg-blue-100 text-blue-700" },
  completed: { label: "Terminado", class: "bg-green-100 text-green-700" },
  cancelled: { label: "Cancelado", class: "bg-red-100 text-red-700" },
}

const PRIORITY_MAP: Record<string, { label: string; class: string }> = {
  low: { label: "Baja", class: "bg-gray-100 text-gray-500" },
  normal: { label: "Normal", class: "bg-gray-100 text-gray-600" },
  high: { label: "Alta", class: "bg-orange-100 text-orange-600" },
  urgent: { label: "Urgente", class: "bg-red-100 text-red-600" },
}

const PRIORITY_COLORS: Record<string, string> = {
  low: "text-gray-400",
  normal: "text-blue-500",
  high: "text-orange-500",
  urgent: "text-red-600 font-bold",
}

export default function KanbanBoardPage() {
  const { id } = useParams<{ id: string }>()
  const [board, setBoard] = useState<{ name: string } | null>(null)
  const [columns, setColumns] = useState<Column[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [dragging, setDragging] = useState<string | null>(null)
  const [showNewCard, setShowNewCard] = useState<string | null>(null)
  const [newCardTitle, setNewCardTitle] = useState("")
  const dragCardId = useRef<string | null>(null)
  const dragFromColId = useRef<string | null>(null)
  const wasDragged = useRef(false)

  // Modal state
  const [modalOrderId, setModalOrderId] = useState<string | null>(null)
  const [modalOrder, setModalOrder] = useState<FullOrder | null>(null)
  const [modalLoading, setModalLoading] = useState(false)

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/production/boards/${id}`)
        if (!res.ok) { setError("No se pudo cargar el tablero"); setLoading(false); return }
        const { board: b, columns: cols, cards } = await res.json()
        if (b) setBoard(b)
        setColumns((cols ?? []).map((col: Column) => ({
          ...col,
          cards: (cards ?? [])
            .filter((c: Card) => c.column_id === col.id)
            .sort((a: Card, b: Card) => a.position - b.position),
        })))
      } catch {
        setError("Error de conexión")
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [id])

  // Close modal on Escape
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setModalOrderId(null)
    }
    document.addEventListener("keydown", onKey)
    return () => document.removeEventListener("keydown", onKey)
  }, [])

  async function openOrderModal(orderId: string) {
    setModalOrderId(orderId)
    setModalOrder(null)
    setModalLoading(true)
    try {
      const res = await fetch(`/api/orders/${orderId}`)
      if (res.ok) setModalOrder(await res.json())
    } finally {
      setModalLoading(false)
    }
  }

  function onDragStart(cardId: string, colId: string) {
    wasDragged.current = true
    dragCardId.current = cardId
    dragFromColId.current = colId
    setDragging(cardId)
  }

  function onDragEnd() {
    setDragging(null)
    dragCardId.current = null
    dragFromColId.current = null
    setTimeout(() => { wasDragged.current = false }, 100)
  }

  async function onDrop(targetColId: string) {
    const cardId = dragCardId.current
    const fromColId = dragFromColId.current
    if (!cardId || fromColId === targetColId) return
    await moveCard(cardId, targetColId)
  }

  async function moveCard(cardId: string, targetColId: string) {
    setColumns((prev) => {
      const updated = prev.map((c) => ({ ...c, cards: [...c.cards] }))
      let moved: Card | undefined
      for (const col of updated) {
        const idx = col.cards.findIndex((c) => c.id === cardId)
        if (idx !== -1) {
          moved = { ...col.cards[idx], column_id: targetColId }
          col.cards.splice(idx, 1)
          break
        }
      }
      if (moved) {
        const tCol = updated.find((c) => c.id === targetColId)
        if (tCol) { moved.position = tCol.cards.length; tCol.cards.push(moved) }
      }
      return updated
    })

    await fetch(`/api/production/cards/${cardId}/move`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ column_id: targetColId, position: 0 }),
    })
  }

  async function toggleUrgent(cardId: string, currentLabels: string[]) {
    const isUrgent = currentLabels.includes("urgente")
    const newLabels = isUrgent
      ? currentLabels.filter((l) => l !== "urgente")
      : [...currentLabels, "urgente"]

    setColumns((prev) =>
      prev.map((col) => ({
        ...col,
        cards: col.cards.map((c) =>
          c.id === cardId ? { ...c, labels: newLabels } : c
        ),
      }))
    )

    await fetch(`/api/production/cards/${cardId}/label`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ labels: newLabels }),
    })
  }

  async function createCard(colId: string) {
    if (!newCardTitle.trim()) return
    const res = await fetch(`/api/production/boards/${id}/cards`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ column_id: colId, title: newCardTitle.trim() }),
    })
    if (res.ok) {
      const data = await res.json()
      setColumns((prev) => prev.map((c) =>
        c.id === colId ? { ...c, cards: [...c.cards, data as Card] } : c
      ))
    }
    setNewCardTitle("")
    setShowNewCard(null)
  }

  if (loading) return <div className="p-6 text-gray-400 text-sm">Cargando tablero...</div>
  if (error) return <div className="p-6 text-red-500 text-sm">{error}</div>

  const totalCards = columns.reduce((s, c) => s + c.cards.length, 0)
  const urgentCount = columns.reduce((s, c) => s + c.cards.filter(card => card.labels?.includes("urgente")).length, 0)

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 bg-white border-b border-gray-200 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <Link href="/app/production" className="text-gray-400 hover:text-gray-600 text-sm">← Tableros</Link>
          <span className="text-gray-300">/</span>
          <h1 className="font-bold text-gray-900">{board?.name ?? "Tablero"}</h1>
        </div>
        <div className="flex items-center gap-3">
          {urgentCount > 0 && (
            <span className="text-xs font-semibold bg-red-100 text-red-600 px-2.5 py-1 rounded-full flex items-center gap-1">
              🚨 {urgentCount} urgente{urgentCount !== 1 ? "s" : ""}
            </span>
          )}
          <span className="text-sm text-gray-400">{totalCards} tarjeta{totalCards !== 1 ? "s" : ""}</span>
          <Link href="/app/orders/new"
            className="bg-[#2563EB] hover:bg-blue-700 text-white text-xs font-medium px-3 py-1.5 rounded-lg transition-colors">
            + Nueva orden
          </Link>
        </div>
      </div>

      {/* Board */}
      <div className="flex-1 overflow-x-auto p-6 bg-gray-50">
        {columns.length === 0 ? (
          <div className="flex items-center justify-center h-full text-gray-400 text-sm">
            Sin columnas en este tablero
          </div>
        ) : (
          <div className="flex gap-5 h-full items-start min-w-max">
            {columns.map((col, colIdx) => {
              const prevCol = columns[colIdx - 1]
              const nextCol = columns[colIdx + 1]
              const urgentCards = col.cards.filter(c => c.labels?.includes("urgente"))
              const normalCards = col.cards.filter(c => !c.labels?.includes("urgente"))
              const sortedCards = [...urgentCards, ...normalCards]

              return (
                <div key={col.id} className="flex flex-col rounded-xl bg-gray-100 shrink-0"
                  style={{ width: "330px" }}
                  onDragOver={(e) => e.preventDefault()} onDrop={() => onDrop(col.id)}>

                  {/* Column header */}
                  <div className="px-4 py-3 flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: col.color }} />
                    <span className="font-bold text-gray-800 text-sm flex-1">{col.name}</span>
                    {urgentCards.length > 0 && (
                      <span className="text-xs text-red-500 font-bold">🚨 {urgentCards.length}</span>
                    )}
                    <span className="text-xs text-gray-400 bg-gray-200 rounded-full px-2 py-0.5 ml-1">{col.cards.length}</span>
                  </div>

                  {/* Cards */}
                  <div className="px-3 pb-3 space-y-3 flex-1 min-h-16">
                    {sortedCards.map((card) => {
                      const wo = card.work_orders
                      const isUrgent = card.labels?.includes("urgente")
                      const statusInfo = wo ? STATUS_MAP[wo.status] : null
                      const priorityColor = wo?.priority ? PRIORITY_COLORS[wo.priority] : "text-gray-400"

                      return (
                        <div key={card.id} draggable
                          onDragStart={() => onDragStart(card.id, col.id)}
                          onDragEnd={onDragEnd}
                          onClick={() => {
                            if (!wasDragged.current && card.work_order_id) {
                              openOrderModal(card.work_order_id)
                            }
                          }}
                          className={`bg-white rounded-xl shadow-sm border transition-all cursor-pointer
                            ${isUrgent ? "border-red-400 ring-1 ring-red-200" : "border-gray-200 hover:border-blue-200"}
                            ${dragging === card.id ? "opacity-40 scale-95" : "hover:shadow-md"}`}>

                          {/* Urgent banner */}
                          {isUrgent && (
                            <div className="bg-red-500 text-white text-xs font-bold px-3 py-1.5 rounded-t-xl flex items-center gap-1.5">
                              🚨 URGENTE — Atención inmediata
                            </div>
                          )}

                          <div className="p-3">
                            {/* Order number row */}
                            {wo && (
                              <div className="flex items-center justify-between mb-2">
                                <Link
                                  href={`/app/orders/${card.work_order_id}`}
                                  className="text-xs font-mono font-bold text-blue-600 hover:underline bg-blue-50 px-2 py-0.5 rounded"
                                  onClick={(e) => e.stopPropagation()}>
                                  {wo.order_number}
                                </Link>
                                <div className="flex items-center gap-1.5">
                                  {wo.priority && wo.priority !== "normal" && (
                                    <span className={`text-xs font-medium ${priorityColor}`}>
                                      {wo.priority === "urgent" ? "Urgente" : wo.priority === "high" ? "Alta" : "Baja"}
                                    </span>
                                  )}
                                  {statusInfo && (
                                    <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${statusInfo.class}`}>
                                      {statusInfo.label}
                                    </span>
                                  )}
                                </div>
                              </div>
                            )}

                            {/* Title */}
                            <p className="text-sm font-semibold text-gray-900 leading-snug mb-1.5">
                              {wo?.title || card.title}
                            </p>

                            {/* Description */}
                            {(wo?.description || card.description) && (
                              <p className="text-xs text-gray-500 mb-2 line-clamp-2 leading-relaxed">
                                {wo?.description || card.description}
                              </p>
                            )}

                            {/* Customer */}
                            {wo?.customers?.full_name && (
                              <div className="flex items-center gap-1.5 text-xs text-gray-700 mb-2 bg-gray-50 rounded-lg px-2 py-1.5">
                                <span className="text-base">👤</span>
                                <div>
                                  <span className="font-semibold">{wo.customers.full_name}</span>
                                  {wo.customers.phone && (
                                    <span className="text-gray-400 ml-1">· {wo.customers.phone}</span>
                                  )}
                                </div>
                              </div>
                            )}

                            {/* Dates + Price */}
                            <div className="flex items-center justify-between text-xs flex-wrap gap-1 mb-1">
                              <div className="flex items-center gap-2 text-gray-400">
                                {wo?.created_at && (
                                  <span className="flex items-center gap-0.5">
                                    📋 {new Date(wo.created_at).toLocaleDateString("es-CO", { day: "numeric", month: "short", year: "numeric" })}
                                  </span>
                                )}
                                {(card.due_date || wo?.due_date) && (
                                  <span className="flex items-center gap-0.5 text-orange-500 font-medium">
                                    ⏰ {new Date(((card.due_date || wo?.due_date)!) + "T00:00:00").toLocaleDateString("es-CO", { day: "numeric", month: "short" })}
                                  </span>
                                )}
                              </div>
                              {wo?.price && (
                                <span className="font-bold text-gray-800 text-sm">
                                  ${Number(wo.price).toLocaleString("es-CO")}
                                </span>
                              )}
                            </div>

                            {/* Other labels */}
                            {card.labels?.filter((l) => l !== "urgente").length > 0 && (
                              <div className="flex gap-1 mt-1.5 flex-wrap">
                                {card.labels.filter((l) => l !== "urgente").map((l, i) => (
                                  <span key={i} className="text-xs bg-blue-100 text-blue-700 rounded-full px-2 py-0.5 font-medium">{l}</span>
                                ))}
                              </div>
                            )}

                            {/* Action buttons */}
                            <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-gray-100 gap-1 flex-wrap">
                              <div className="flex items-center gap-1">
                                {prevCol && (
                                  <button
                                    onClick={(e) => { e.stopPropagation(); moveCard(card.id, prevCol.id) }}
                                    title={`Mover a ${prevCol.name}`}
                                    className="text-xs text-gray-500 hover:text-blue-700 hover:bg-blue-50 px-2 py-1 rounded-lg transition-colors border border-transparent hover:border-blue-200 font-medium">
                                    ← {prevCol.name}
                                  </button>
                                )}
                                {nextCol && (
                                  <button
                                    onClick={(e) => { e.stopPropagation(); moveCard(card.id, nextCol.id) }}
                                    title={`Mover a ${nextCol.name}`}
                                    className="text-xs text-gray-500 hover:text-green-700 hover:bg-green-50 px-2 py-1 rounded-lg transition-colors border border-transparent hover:border-green-200 font-medium">
                                    {nextCol.name} →
                                  </button>
                                )}
                              </div>

                              <button
                                onClick={(e) => { e.stopPropagation(); toggleUrgent(card.id, card.labels ?? []) }}
                                className={`text-xs px-2.5 py-1 rounded-lg transition-all font-semibold border
                                  ${isUrgent
                                    ? "bg-red-100 text-red-600 border-red-200 hover:bg-red-200"
                                    : "bg-gray-50 text-gray-400 border-gray-200 hover:bg-red-50 hover:text-red-500 hover:border-red-200"}`}>
                                🚨 {isUrgent ? "Urgente ✓" : "Urgente"}
                              </button>
                            </div>
                          </div>
                        </div>
                      )
                    })}

                    {/* Add card */}
                    {showNewCard === col.id ? (
                      <div className="bg-white rounded-xl p-2.5 border border-blue-300 shadow-sm">
                        <textarea
                          autoFocus
                          value={newCardTitle}
                          onChange={(e) => setNewCardTitle(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); createCard(col.id) }
                            if (e.key === "Escape") { setShowNewCard(null); setNewCardTitle("") }
                          }}
                          placeholder="Título de la tarjeta... (Enter para guardar)"
                          className="w-full text-sm resize-none focus:outline-none p-1 min-h-14"
                        />
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
                      <button
                        onClick={() => setShowNewCard(col.id)}
                        className="w-full text-left text-sm text-gray-400 hover:text-gray-600 px-2 py-1.5 hover:bg-gray-200 rounded-lg transition-colors">
                        + Agregar tarjeta
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Order detail modal */}
      {modalOrderId && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          onClick={() => setModalOrderId(null)}
        >
          <div className="absolute inset-0 bg-black/40" />
          <div
            className="relative bg-white rounded-2xl w-full max-w-xl max-h-[88vh] overflow-y-auto shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {modalLoading ? (
              <div className="p-10 text-center text-gray-400 text-sm">Cargando orden...</div>
            ) : modalOrder ? (
              <OrderModal order={modalOrder} onClose={() => setModalOrderId(null)} />
            ) : (
              <div className="p-10 text-center text-red-400 text-sm">No se pudo cargar la orden.</div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function OrderModal({ order, onClose }: { order: FullOrder; onClose: () => void }) {
  const statusInfo = STATUS_MAP[order.status] ?? { label: order.status, class: "bg-gray-100 text-gray-600" }
  const priorityInfo = PRIORITY_MAP[order.priority] ?? { label: order.priority, class: "bg-gray-100 text-gray-500" }
  const total = order.work_order_items.reduce((s, i) => s + i.quantity * i.unit_price, 0)

  return (
    <div className="flex flex-col">
      {/* Modal header */}
      <div className="flex items-start justify-between p-5 border-b border-gray-100">
        <div className="flex-1 min-w-0 pr-3">
          <p className="text-xs font-mono text-gray-400 mb-1">{order.order_number}</p>
          <h2 className="text-lg font-bold text-gray-900 leading-snug">{order.title}</h2>
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-medium ${statusInfo.class}`}>
              {statusInfo.label}
            </span>
            <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-medium ${priorityInfo.class}`}>
              {priorityInfo.label}
            </span>
          </div>
        </div>
        <button
          onClick={onClose}
          className="shrink-0 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg p-1.5 transition-colors text-lg leading-none"
          aria-label="Cerrar"
        >
          ✕
        </button>
      </div>

      {/* Details grid */}
      <div className="p-5 border-b border-gray-100">
        <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
          {order.customers && (
            <div>
              <dt className="text-gray-500 text-xs mb-0.5">Cliente</dt>
              <dd className="font-medium text-gray-900">{order.customers.full_name}</dd>
              {order.customers.phone && <dd className="text-gray-500 text-xs">{order.customers.phone}</dd>}
              {order.customers.email && <dd className="text-gray-500 text-xs">{order.customers.email}</dd>}
            </div>
          )}
          {order.price != null && (
            <div>
              <dt className="text-gray-500 text-xs mb-0.5">Precio</dt>
              <dd className="font-bold text-gray-900 text-base">${Number(order.price).toLocaleString("es-CO")}</dd>
            </div>
          )}
          <div>
            <dt className="text-gray-500 text-xs mb-0.5">Creado</dt>
            <dd className="font-medium text-gray-900">{new Date(order.created_at).toLocaleDateString("es-CO")}</dd>
          </div>
          {order.due_date && (
            <div>
              <dt className="text-gray-500 text-xs mb-0.5">Fecha límite</dt>
              <dd className="font-medium text-orange-600">{new Date(order.due_date + "T00:00:00").toLocaleDateString("es-CO")}</dd>
            </div>
          )}
          {order.started_at && (
            <div>
              <dt className="text-gray-500 text-xs mb-0.5">Iniciado</dt>
              <dd className="font-medium text-gray-900">{new Date(order.started_at).toLocaleDateString("es-CO")}</dd>
            </div>
          )}
          {order.completed_at && (
            <div>
              <dt className="text-gray-500 text-xs mb-0.5">Completado</dt>
              <dd className="font-medium text-green-700">{new Date(order.completed_at).toLocaleDateString("es-CO")}</dd>
            </div>
          )}
        </dl>
      </div>

      {/* Description & notes */}
      {(order.description || order.notes) && (
        <div className="p-5 border-b border-gray-100 space-y-3">
          {order.description && (
            <div>
              <p className="text-xs text-gray-500 mb-1">Descripción</p>
              <p className="text-sm text-gray-700 whitespace-pre-wrap">{order.description}</p>
            </div>
          )}
          {order.notes && (
            <div>
              <p className="text-xs text-gray-500 mb-1">Notas internas</p>
              <p className="text-sm text-gray-600 bg-yellow-50 rounded-lg p-3 whitespace-pre-wrap">{order.notes}</p>
            </div>
          )}
        </div>
      )}

      {/* Items */}
      {order.work_order_items.length > 0 && (
        <div className="p-5 border-b border-gray-100">
          <p className="text-xs text-gray-500 mb-3">Items / Materiales</p>
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-gray-100 text-left">
                <th className="pb-2 font-medium text-gray-600">Descripción</th>
                <th className="pb-2 font-medium text-gray-600 text-right">Cant.</th>
                <th className="pb-2 font-medium text-gray-600 text-right">Precio</th>
                <th className="pb-2 font-medium text-gray-600 text-right">Subtotal</th>
              </tr>
            </thead>
            <tbody>
              {order.work_order_items.map((item) => (
                <tr key={item.id} className="border-b border-gray-50">
                  <td className="py-1.5 text-gray-900">{item.description}</td>
                  <td className="py-1.5 text-gray-600 text-right">{item.quantity}</td>
                  <td className="py-1.5 text-gray-600 text-right">${Number(item.unit_price).toLocaleString("es-CO")}</td>
                  <td className="py-1.5 font-medium text-gray-900 text-right">${(item.quantity * item.unit_price).toLocaleString("es-CO")}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={3} className="pt-2 font-semibold text-gray-900 text-right text-sm">Total:</td>
                <td className="pt-2 font-bold text-gray-900 text-right text-sm">${total.toLocaleString("es-CO")}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      {/* Footer actions */}
      <div className="p-4 flex items-center justify-between gap-3">
        <button
          onClick={onClose}
          className="text-sm text-gray-500 hover:text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-100 transition-colors"
        >
          Cerrar
        </button>
        <div className="flex gap-2">
          <Link
            href={`/app/orders/${order.id}/edit`}
            className="text-sm border border-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Editar
          </Link>
          <Link
            href={`/app/orders/${order.id}`}
            className="text-sm bg-[#2563EB] hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors font-medium"
          >
            Ver completo →
          </Link>
        </div>
      </div>
    </div>
  )
}
