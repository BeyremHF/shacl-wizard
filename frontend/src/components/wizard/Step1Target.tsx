// Step 1 — Target declaration.
// The user picks what kind of resources they want to validate and names them.

import { TargetCard } from './TargetCard'
import { TARGET_OPTIONS } from '@/types'
import type { WizardState } from '@/types'

interface Props {
  state:  WizardState
  update: (patch: Partial<WizardState>) => void
}

export function Step1Target({ state, update }: Props) {
  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold text-zinc-900">
          What do you want to validate?
        </h2>
        <p className="text-sm text-zinc-500 mt-1">
          This defines which nodes in your data graph will be checked against the shape.
        </p>
      </div>

      {/* Target type cards */}
      <div className="space-y-2.5">
        {TARGET_OPTIONS.map(opt => (
          <TargetCard
            key={opt.value}
            label={opt.label}
            description={opt.description}
            badge={opt.shacl}
            selected={state.targetType === opt.value}
            onClick={() => update({ targetType: opt.value, targetValue: '' })}
          />
        ))}
      </div>

      {/* Value input — shown once a type is selected */}
      {state.targetType && (
        <div className="space-y-1.5 fade-up">
          <label className="text-xs font-semibold text-zinc-600 uppercase tracking-wider">
            {state.targetType === 'class'      ? 'Class name' :
             state.targetType === 'node'       ? 'Individual name (e.g. Alice)' :
                                                 'Property name'}
          </label>

          {/* Suggested class pills (upload mode) */}
          {state.mode === 'upload' && state.targetType === 'class' && state.suggestedClasses.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-2">
              {state.suggestedClasses.map(cls => (
                <button
                  key={cls}
                  onClick={() => update({ targetValue: cls })}
                  className={`text-xs px-3 py-1 rounded-full border transition-colors mono
                    ${state.targetValue === cls
                      ? 'bg-zinc-900 text-white border-zinc-900'
                      : 'bg-white text-zinc-600 border-zinc-200 hover:border-zinc-400'}
                  `}
                >
                  ex:{cls}
                </button>
              ))}
            </div>
          )}

          <input
            autoFocus
            type="text"
            value={state.targetValue}
            onChange={e => update({ targetValue: e.target.value })}
            placeholder={
              state.targetType === 'class'      ? 'e.g. Person, Car, Product' :
              state.targetType === 'node'       ? 'e.g. Alice, Product_123' :
                                                  'e.g. email, name'
            }
            className="w-full h-10 px-3 rounded-md border border-zinc-200 text-sm mono
              focus:outline-none focus:border-zinc-400"
          />

          {state.targetValue && (
            <p className="text-[11px] text-zinc-400 mono">
              → {TARGET_OPTIONS.find(o => o.value === state.targetType)?.shacl} ex:{state.targetValue}
            </p>
          )}
        </div>
      )}
    </div>
  )
}
