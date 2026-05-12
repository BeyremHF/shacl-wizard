import { useState } from 'react'

interface CodeBlockProps {
  code: string
  lang: string
}

export function CodeBlock({ code, lang }: CodeBlockProps) {
  const [copied, setCopied] = useState(false)

  const handleCopy = () => {
    navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <div className="relative">
      {/* Controls sit inside the padding, not over the scrollbar */}
      <div className="absolute top-3 right-8 flex items-center gap-2 z-10">
        <span className="text-[10px] text-zinc-400 border border-zinc-700 px-1.5 py-0.5 rounded mono">
          {lang}
        </span>
        <button
          onClick={handleCopy}
          className="text-xs text-zinc-400 hover:text-white bg-zinc-800 hover:bg-zinc-700 px-2 py-1 rounded transition-colors"
        >
          {copied ? '✓' : 'Copy'}
        </button>
      </div>

      <pre className="bg-zinc-950 text-zinc-200 p-4 pt-10 rounded-xl overflow-x-auto text-[11px] leading-relaxed font-mono max-h-72 whitespace-pre">
        {code}
      </pre>
    </div>
  )
}