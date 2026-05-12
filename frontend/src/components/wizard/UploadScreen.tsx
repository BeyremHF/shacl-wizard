import { useRef, useState } from 'react'
import type { WizardState } from '@/types'

function parseStub(filename: string) {
  const n = filename.toLowerCase()
  if (n.includes('person') || n.includes('social')) {
    return { classes: ['Person', 'Organization'], properties: ['name', 'email', 'birthDate', 'knows', 'address'] }
  }
  if (n.includes('car') || n.includes('vehicle')) {
    return { classes: ['Car', 'Owner'], properties: ['model', 'make', 'registrationDate', 'ownerName', 'color'] }
  }
  if (n.includes('product') || n.includes('shop')) {
    return { classes: ['Product', 'Category'], properties: ['name', 'price', 'description', 'sku', 'category'] }
  }
  return { classes: ['Entity'], properties: ['name', 'label', 'description', 'type', 'date'] }
}

interface Props {
  update: (patch: Partial<WizardState>) => void
  onBack: () => void
}

export function UploadScreen({ update, onBack }: Props) {
  const [parsing, setParsing] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const handleFile = (file: File) => {
    setParsing(true)
    setTimeout(() => {
      const { classes, properties } = parseStub(file.name)
      update({
        uploadedFileName:    file.name,
        suggestedClasses:    classes,
        suggestedProperties: properties,
        step:                0,
      })
      setParsing(false)
    }, 1200)
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold text-zinc-900">Upload your RDF data graph</h2>
        <p className="text-sm text-zinc-500 mt-1">
          This is your data file, not a shapes graph. The app will extract classes and properties
          to pre-fill the wizard.
        </p>
      </div>

      <div
        className="border-2 border-dashed border-zinc-200 rounded-xl p-8 text-center cursor-pointer hover:border-zinc-400 hover:bg-zinc-50 transition-all"
        onClick={() => fileRef.current?.click()}
        onDragOver={e => e.preventDefault()}
        onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleFile(f) }}
      >
        {parsing ? (
          <div className="space-y-3">
            <div className="flex justify-center gap-1.5">
              {[0, 1, 2].map(i => (
                <span key={i} className="w-2 h-2 rounded-full bg-zinc-400 pulse-dot inline-block" style={{ animationDelay: `${i * 0.2}s` }} />
              ))}
            </div>
            <p className="text-sm text-zinc-500">Parsing RDF file...</p>
            <p className="text-xs text-zinc-400 mono">Extracting classes and properties</p>
          </div>
        ) : (
          <div className="space-y-2">
            <p className="text-sm font-medium text-zinc-700">Drop your RDF file here</p>
            <p className="text-xs text-zinc-400">or click to browse</p>
            <p className="text-[11px] text-zinc-400 mono mt-2">.ttl · .jsonld · .rdf · .n3 · .trig</p>
          </div>
        )}
        <input ref={fileRef} type="file" accept=".ttl,.jsonld,.rdf,.n3,.trig,.xml" className="hidden"
          onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f) }} />
      </div>

      <div className="border-t border-zinc-100 pt-4">
        <p className="text-xs text-zinc-400 mb-2">Or paste raw Turtle text directly:</p>
        <textarea
          placeholder={'@prefix ex: <http://example.org/> .\nex:Alice a ex:Person ;\n    ex:name "Alice" .'}
          className="w-full min-h-[100px] px-3 py-2 text-xs mono rounded-md border border-zinc-200 resize-none focus:outline-none focus:border-zinc-400"
          onBlur={e => {
            if (e.target.value.trim()) {
              handleFile(new File([e.target.value], 'pasted-graph.ttl', { type: 'text/plain' }))
            }
          }}
        />
        <p className="text-[10px] text-zinc-400 mt-1">Click outside the text area after pasting.</p>
      </div>

      {/* Bottom nav — matches manual mode layout */}
      <div className="flex justify-between items-center px-6 py-4 border-t border-zinc-100 bg-zinc-50/50 -mx-6 -mb-6 mt-2 rounded-b-2xl">
        <button onClick={onBack} className="text-zinc-500 text-sm px-3 py-2 rounded hover:bg-zinc-100 transition-colors">
          ← Change mode
        </button>
        <div />
      </div>
    </div>
  )
}