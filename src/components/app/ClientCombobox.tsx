"use client"

import { useState, useRef, useEffect } from "react"

type Customer = { id: string; full_name: string }

type Props = {
  customers: Customer[]
  value: string
  onChange: (id: string) => void
  placeholder?: string
}

export default function ClientCombobox({ customers, value, onChange, placeholder = "Buscar cliente..." }: Props) {
  const [query, setQuery] = useState("")
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const selected = customers.find((c) => c.id === value) ?? null

  const filtered = query.trim()
    ? customers.filter((c) => c.full_name.toLowerCase().includes(query.toLowerCase()))
    : customers

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
        setQuery("")
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  function handleSelect(customer: Customer | null) {
    onChange(customer?.id ?? "")
    setQuery("")
    setOpen(false)
  }

  function handleInputClick() {
    setOpen(true)
    if (selected) setQuery("")
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    setQuery(e.target.value)
    setOpen(true)
    if (!e.target.value) onChange("")
  }

  const displayValue = open ? query : (selected?.full_name ?? "")

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <input
          type="text"
          value={displayValue}
          onChange={handleInputChange}
          onClick={handleInputClick}
          onFocus={() => setOpen(true)}
          placeholder={selected ? selected.full_name : placeholder}
          className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white pr-8"
        />
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none text-xs">▾</span>
      </div>

      {open && (
        <div className="absolute z-50 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-52 overflow-y-auto">
          <button
            type="button"
            onMouseDown={() => handleSelect(null)}
            className="w-full text-left px-3 py-2 text-sm text-gray-400 hover:bg-gray-50 border-b border-gray-100"
          >
            Sin cliente
          </button>
          {filtered.length === 0 ? (
            <div className="px-3 py-2 text-sm text-gray-400 italic">Sin resultados</div>
          ) : (
            filtered.map((c) => (
              <button
                key={c.id}
                type="button"
                onMouseDown={() => handleSelect(c)}
                className={`w-full text-left px-3 py-2 text-sm hover:bg-blue-50 hover:text-blue-700 transition-colors ${
                  c.id === value ? "bg-blue-50 text-blue-700 font-medium" : "text-gray-800"
                }`}
              >
                {c.full_name}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  )
}
