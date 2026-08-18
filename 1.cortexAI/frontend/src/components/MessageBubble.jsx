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

const cleanCodeBlock = (text = '') => {
  if (typeof text !== 'string') return ''

  return text
    .replace(/^\s*```(?:json|javascript|js|typescript|ts|html|css|cpp|c\+\+|python)?\s*/i, '')
    .replace(/\s*```\s*$/i, '')
    .trim()
}

const sanitizeImageList = (images = []) => {
  if (!Array.isArray(images)) return []

  const unique = new Set()
  return images
    .map((image) => {
      const raw = typeof image === 'string' ? image : image?.url || image?.src || image?.image_url?.url || ''
      if (typeof raw !== 'string') return ''

      const trimmed = raw.trim()
      if (!trimmed || !/^https?:\/\//i.test(trimmed) || /\b(?:null|undefined)\b/i.test(trimmed)) return ''

      try {
        const parsed = new URL(trimmed)
        if (!['http:', 'https:'].includes(parsed.protocol)) return ''
        const pathname = parsed.pathname.toLowerCase()
        const hasImageExt = /\.(png|jpe?g|gif|webp|bmp|svg|avif|heic|heif)(\?.*)?$/i.test(pathname)
        const hasImageFolder = /\/(?:images?|photos?|media|uploads?|files?|attachments?|content)\//i.test(pathname)
        if (!hasImageExt && !hasImageFolder) return ''
        return trimmed
      } catch {
        return ''
      }
    })
    .filter(Boolean)
    .filter((url) => {
      if (unique.has(url)) return false
      unique.add(url)
      return true
    })
}

function MessageBubble({ role, content, images, artifacts = [] }) {
  const isUser = role === 'user'
  const safeImages = sanitizeImageList(images)
  const safeArtifacts = Array.isArray(artifacts) ? artifacts.filter(Boolean) : []
  const safeContent = typeof content === 'string' ? content : typeof content === 'object' ? JSON.stringify(content, null, 2) : ''
  const isJsonLike = typeof safeContent === 'string' && safeContent.trim().startsWith('{')
  const normalizedContent = normalizeTableLikeMarkdown(safeContent)
  const formattedContent = isJsonLike ? `\n\n\`\`\`json\n${cleanCodeBlock(safeContent)}\n\`\`\`\n` : normalizedContent
  const [selectedImage, setSelectedImage] = useState(null)

  const getCodeContentFromNode = (node) => {
    if (typeof node === 'string') return node
    if (Array.isArray(node)) return node.map(getCodeContentFromNode).join('')
    if (node && typeof node === 'object') {
      if (typeof node.props?.children === 'string') return node.props.children
      if (Array.isArray(node.props?.children)) return node.props.children.map(getCodeContentFromNode).join('')
      if (typeof node.children === 'string') return node.children
      if (Array.isArray(node.children)) return node.children.map(getCodeContentFromNode).join('')
      if (node.value) return String(node.value)
    }
    return ''
  }

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
      const text = getCodeContentFromNode(children)
      if (inline) {
        return <code className="rounded-md border border-white/10 bg-slate-900/70 px-1.5 py-0.5 text-[12px] text-violet-200">{text}</code>
      }
      return <code className={className || 'block rounded-md bg-[#0a1222] px-3 py-2 text-[12.5px] text-slate-100'}>{text}</code>
    },
    pre: ({ children, ...props }) => {
      const codeText = getCodeContentFromNode(children)
      const cleanedCode = cleanCodeBlock(codeText)

      return (
        <div className="relative mb-4 overflow-hidden rounded-2xl border border-[#2a3350] bg-[#050c1d] shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
          <div className="flex items-center justify-between border-b border-[#1d2740] bg-[#0d152b] px-3 py-2">
            <span className="text-[10px] font-medium uppercase tracking-[0.12em] text-slate-400">Code</span>
            <CopyCodeButton code={cleanedCode} />
          </div>
          <pre {...props} className="overflow-x-auto p-4 text-[12.5px] leading-6 text-slate-100">
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
            <Markdown remarkPlugins={[remarkGfm]} components={markdownComponents}>{formattedContent}</Markdown>
          </div>

          {safeArtifacts.length > 0 && (
            <div className="mt-4 space-y-3 border-t border-white/10 pt-4">
              {safeArtifacts.map((artifact, index) => {
                const files = Array.isArray(artifact?.files) ? artifact.files : []
                return (
                  <div key={artifact?.id || index} className="rounded-xl border border-violet-500/20 bg-slate-950/70 p-3">
                    <div className="mb-2 flex items-center justify-between">
                      <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-violet-300">
                        {artifact?.type || 'Artifact'}
                      </span>
                    </div>

                    <div className="space-y-3">
                      {files.map((file, fileIndex) => {
                        const fileName = file?.name || `file-${fileIndex + 1}`
                        const fileContent = typeof file?.content === 'string' ? file.content : JSON.stringify(file?.content ?? file, null, 2)

                        return (
                          <div key={`${fileName}-${fileIndex}`} className="overflow-hidden rounded-lg border border-white/10 bg-slate-900/80">
                            <div className="flex items-center justify-between border-b border-white/10 bg-slate-950/80 px-3 py-2">
                              <span className="text-[11px] font-medium text-slate-200">{fileName}</span>
                              <button
                                type="button"
                                onClick={() => navigator.clipboard?.writeText?.(fileContent).catch(() => {})}
                                className="rounded border border-white/10 bg-slate-900 px-2 py-1 text-[10px] text-slate-200 hover:border-violet-400/50 hover:text-white"
                              >
                                Copy
                              </button>
                            </div>
                            <pre className="max-h-72 overflow-auto p-3 text-[12px] leading-6 text-slate-100">
                              <code>{fileContent}</code>
                            </pre>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
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
              className="absolute left-3 top-3 z-10 flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-slate-950/70 text-xl text-white shadow-lg transition hover:bg-slate-800"
              aria-label="Close image"
            >
              ×
            </button>
            <div className="flex max-h-[90vh] max-w-[85vw] items-center justify-center p-4 pt-12">
              <img
                src={selectedImage}
                alt="Expanded attachment"
                className="max-h-[84vh] max-w-[80vw] rounded-xl object-contain shadow-[0_20px_50px_rgba(15,23,42,0.6)]"
                onClick={(e) => e.stopPropagation()}
              />
            </div>
          </div>
        </div>
      )}
    </>
  )
}

export default MessageBubble