import React, { useState } from 'react'
import Markdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

const CopyCodeButton = ({ code }) => {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code)
      setCopied(true)
      setTimeout(() => setCopied(false), 1200)
    } catch (error) {
      console.error('Copy failed:', error)
    }
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="absolute right-2 top-2 rounded-md border border-white/10 bg-slate-900/80 px-2 py-1 text-[10px] font-medium text-slate-200 shadow-sm transition hover:border-violet-400/60 hover:text-white"
    >
      {copied ? 'Copied' : 'Copy'}
    </button>
  )
}

const normalizeTableLikeMarkdown = (text = '') => {
  if (typeof text !== 'string') return text

  const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean)
  if (lines.length < 2) return text

  const tableCandidateLines = lines.filter((line) => line.includes('|'))
  if (tableCandidateLines.length < 2) return text

  const rows = tableCandidateLines.map((line) => line.split('|').map((cell) => cell.trim()).filter(Boolean))
  if (rows.length < 2) return text

  const hasHeaderSeparator = rows.some((row) => row.some((cell) => /^:?-{3,}:?$/.test(cell)))
  if (!hasHeaderSeparator && rows[0].length >= 2) {
    const header = rows[0]
    const body = rows.slice(1)
    const tableRows = [header, ...body]
    return tableRows.map((row) => `| ${row.join(' | ')} |`).join('\n')
  }

  const firstRow = rows[0]
  const secondRow = rows[1]
  if (firstRow.length !== secondRow.length) return text

  const headerLine = `| ${firstRow.join(' | ')} |`
  const separatorLine = `| ${secondRow.map(() => '---').join(' | ')} |`
  const bodyLines = rows.slice(2).map((row) => `| ${row.join(' | ')} |`)

  return [headerLine, separatorLine, ...bodyLines].join('\n')
}

function MessageBubble({ role, content, images }) {
  const isUser = role === 'user'
  const safeImages = Array.isArray(images) ? images.filter(Boolean) : []
  const safeContent = typeof content === 'string' ? content : ''
  const normalizedContent = normalizeTableLikeMarkdown(safeContent)
  const [selectedImage, setSelectedImage] = useState(null)

  const markdownComponents = {
    h1: ({ children }) => <h1 className="mt-5 mb-3 text-xl font-bold text-violet-200 tracking-tight">{children}</h1>,
    h2: ({ children }) => <h2 className="mt-5 mb-2 text-lg font-bold text-violet-200 tracking-tight">{children}</h2>,
    h3: ({ children }) => <h3 className="mt-4 mb-2 text-base font-bold text-violet-100 tracking-tight">{children}</h3>,
    h4: ({ children }) => <h4 className="mt-4 mb-2 text-sm font-bold uppercase tracking-[0.08em] text-violet-300">{children}</h4>,
    p: ({ children }) => <p className="mb-3 leading-7 text-[13.5px] text-slate-200">{children}</p>,
    ul: ({ children }) => <ul className="mb-3 list-disc space-y-1.5 pl-5 text-[13.5px] text-slate-200">{children}</ul>,
    ol: ({ children }) => <ol className="mb-3 list-decimal space-y-1.5 pl-5 text-[13.5px] text-slate-200">{children}</ol>,
    li: ({ children }) => <li className="leading-6">{children}</li>,
    a: ({ href, children }) => (
      <a href={href} target="_blank" rel="noreferrer" className="text-violet-300 underline decoration-violet-400/60 underline-offset-4 hover:text-violet-200">
        {children}
      </a>
    ),
    code: ({ inline, className, children }) => {
      if (inline) {
        return <code className="rounded-md border border-white/10 bg-slate-900/70 px-1.5 py-0.5 text-[12px] text-violet-200">{children}</code>
      }
      return <code className={className}>{children}</code>
    },
    pre: ({ children, ...props }) => {
      const codeText = Array.isArray(children)
        ? children.map((child) => (typeof child === 'string' ? child : child?.props?.children || '')).join('')
        : (typeof children === 'string' ? children : '')

      return (
        <div className="relative mb-4">
          <CopyCodeButton code={codeText} />
          <pre {...props} className="overflow-x-auto rounded-xl border border-white/10 bg-slate-950/80 p-3 pt-10 text-[12.5px] leading-6 text-slate-100">
            {children}
          </pre>
        </div>
      )
    },
    table: ({ children }) => (
      <div className="mb-4 overflow-hidden rounded-xl border border-white/10 bg-slate-950/60">
        <div className="overflow-x-auto">
          <table className="min-w-full border-collapse text-left text-[12.5px] text-slate-200">{children}</table>
        </div>
      </div>
    ),
    thead: ({ children }) => <thead className="bg-violet-500/15 text-violet-100">{children}</thead>,
    th: ({ children }) => <th className="border-b border-white/10 px-3 py-2 font-semibold">{children}</th>,
    td: ({ children }) => <td className="border-b border-white/10 px-3 py-2 align-top">{children}</td>,
    blockquote: ({ children }) => (
      <blockquote className="mb-4 border-l-2 border-violet-400/80 bg-violet-500/5 pl-3 text-slate-200 italic">
        {children}
      </blockquote>
    ),
    hr: () => <hr className="my-4 border-white/10" />
  }

  return (
    <>
      <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
        <div
          className={`max-w-[78%] rounded-[22px] border px-4 py-3 shadow-[0_10px_30px_rgba(15,23,42,0.22)] ${
            isUser
              ? 'border-violet-500/40 bg-gradient-to-br from-violet-600 to-indigo-600 text-white rounded-tr-md'
              : 'border-white/10 bg-slate-900/80 text-slate-200 rounded-tl-md backdrop-blur-sm'
          }`}
        >
          {safeImages.length > 0 && (
            <div className="mb-4 overflow-x-auto pb-2">
              <div className="flex min-w-max gap-3">
                {safeImages.map((image, index) => (
                  <button
                    key={`${image}-${index}`}
                    type="button"
                    onClick={() => setSelectedImage(image)}
                    className="group relative block shrink-0 overflow-hidden rounded-xl border border-white/10 bg-slate-950/80 transition-transform duration-200 hover:scale-[1.01]"
                    aria-label="Open image"
                  >
                    <img
                      src={image}
                      alt="message attachment"
                      className="h-28 w-32 object-cover sm:h-32 sm:w-40"
                      loading="lazy"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none'
                      }}
                    />
                    <span className="absolute inset-0 bg-slate-950/0 transition-colors duration-200 group-hover:bg-slate-950/10" />
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="markdown-content text-[13.5px] leading-7 break-words">
            <Markdown remarkPlugins={[remarkGfm]} components={markdownComponents}>{normalizedContent}</Markdown>
          </div>
        </div>
      </div>

      {selectedImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-md"
          onClick={() => setSelectedImage(null)}
        >
          <div className="relative max-h-[90vh] max-w-[85vw] overflow-hidden rounded-2xl border border-white/10 bg-slate-950/90 shadow-2xl">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                setSelectedImage(null)
              }}
              className="absolute right-3 top-3 z-10 flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-slate-950/60 text-xl text-white hover:bg-slate-800"
              aria-label="Close image"
            >
              ×
            </button>
            <img
              src={selectedImage}
              alt="Expanded attachment"
              className="max-h-[90vh] max-w-[85vw] object-contain"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>
      )}
    </>
  )
}

export default MessageBubble