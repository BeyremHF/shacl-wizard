import { useState } from 'react'
import type { WizardState, PropertyShape } from '@/types'

function uid() {
  return Math.random().toString(36).slice(2, 8)
}

interface Props {
  state:  WizardState
  update: (patch: Partial<WizardState>) => void
}

export function Step3Properties({ state, update }: Props) {
  const [input, setInput] = useState('')

  const suggestions = state.suggestedProperties.filter(
    p => !state.properties.find(prop => prop.path === p)
  )

  const addProperty = (path?: string) => {
    const p = (path ?? input).trim()
    if (!p || p.toLowerCase() === state.targetValue.toLowerCase()) return
    const prop: PropertyShape = { id: uid(), path: p, constraints: {} }
    update({ properties: [...state.properties, prop] })
    setInput('')
  }

  const removeProperty = (id: string) => {
    update({ properties: state.properties.filter(p => p.id !== id) })
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold text-zinc-900">
          Which properties do you want to constrain?
        </h2>
        <p className="text-sm text-zinc-500 mt-1">
          Add the predicates you want to validate on{' '}
          <span className="mono text-zinc-700">ex:{state.targetValue}</span> nodes.
        </p>
      </div>

      <div className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && addProperty()}
          placeholder="Property name, e.g. name, email, birthDate"
          className="flex-1 h-9 px-3 rounded-md border border-zinc-200 text-sm mono
            focus:outline-none focus:border-zinc-400"
        />
        <button
          onClick={() => addProperty()}
          className="px-4 h-9 rounded-md bg-zinc-900 text-white text-sm hover:bg-zinc-700 transition-colors shrink-0"
        >
          Add
        </button>
      </div>

      {state.mode === 'upload' && suggestions.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-[11px] text-zinc-400 font-medium uppercase tracking-wider">
            Detected in your file:
          </p>
          <div className="flex flex-wrap gap-1.5">
            {suggestions.map(s => (
              <button
                key={s}
                onClick={() => addProperty(s)}
                className="text-[11px] px-2.5 py-1 rounded-full border border-dashed border-zinc-300
                  text-zinc-600 hover:border-zinc-500 hover:bg-zinc-50 transition-colors mono"
              >
                + {s}
              </button>
            ))}
          </div>
        </div>
      )}

      {state.properties.length > 0 ? (
        <div className="space-y-2">
          {state.properties.map(prop => (
            <div
              key={prop.id}
              className="flex items-center justify-between p-3 rounded-lg border border-zinc-200"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="mono text-sm font-medium text-zinc-800">
                    ex:{prop.path}
                  </span>
                  {Object.keys(prop.constraints).length > 0 && (
                    <span className="text-[10px] bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded font-semibold">
                      {Object.keys(prop.constraints).length} rules
                    </span>
                  )}
                </div>
              </div>
              <button
                onClick={() => removeProperty(prop.id)}
                className="text-xs text-red-400 hover:text-red-600 px-2 py-1 rounded border border-zinc-200 hover:border-red-200 transition-colors ml-2 shrink-0"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-10 text-zinc-400 text-sm border border-dashed border-zinc-200 rounded-xl">
          No properties yet. Add at least one above.
        </div>
      )}
    </div>
  )
}