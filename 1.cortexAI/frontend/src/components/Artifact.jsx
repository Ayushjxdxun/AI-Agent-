import React, { useMemo, useState } from 'react'
import { useSelector } from 'react-redux'
import { Eye, FileCode2, MonitorPlay, Copy, FileText, Braces, Code2 } from 'lucide-react'

const isPreviewableFile = (fileName = '') => /\.(html?|css|js)$/i.test(fileName)

const getFileMeta = (fileName = '') => {
  const ext = (fileName.split('.').pop() || '').toLowerCase()

  if (['html', 'htm'].includes(ext)) return { label: 'HTML', color: 'text-emerald-300', icon: FileText }
  if (['css'].includes(ext)) return { label: 'CSS', color: 'text-cyan-300', icon: Braces }
  if (['js', 'jsx', 'ts', 'tsx'].includes(ext)) return { label: ext.toUpperCase(), color: 'text-yellow-300', icon: Code2 }
  if (['cpp', 'cxx', 'cc'].includes(ext)) return { label: 'CPP', color: 'text-violet-300', icon: FileCode2 }
  return { label: ext.toUpperCase() || 'TXT', color: 'text-slate-300', icon: FileText }
}

function Artifact() {
  const { messages } = useSelector((state) => state.message)
  const [selectedFileName, setSelectedFileName] = useState('')
  const [showPreview, setShowPreview] = useState(false)

  const extractFilesFromMessage = (msg) => {
    if (Array.isArray(msg?.artifacts)) {
      const fromArtifacts = msg.artifacts.flatMap((artifact) =>
        Array.isArray(artifact?.files)
          ? artifact.files.map((file) => ({ ...file, artifactType: artifact?.type || 'Project' }))
          : []
      )
      if (fromArtifacts.length) return fromArtifacts
    }

    if (typeof msg?.content === 'string') {
      try {
        const parsed = JSON.parse(msg.content)
        if (parsed && Array.isArray(parsed.files)) {
          return parsed.files.map((file) => ({ ...file, artifactType: 'Project' }))
        }
      } catch {
        // ignore invalid JSON payloads
      }
    }

    return []
  }

  const artifactFiles = useMemo(() => {
    const assistantMessages = [...messages].reverse()
    for (const msg of assistantMessages) {
      if (msg?.role !== 'assistant') continue

      const files = extractFilesFromMessage(msg)
      if (files.length) return files
    }

    return []
  }, [messages])

  const selectedFile = artifactFiles.find((file) => file.name === selectedFileName) || artifactFiles[0] || null

  React.useEffect(() => {
    if (!selectedFileName && artifactFiles.length) {
      setSelectedFileName(artifactFiles[0].name)
    }
  }, [artifactFiles, selectedFileName])

  const hasPreview = artifactFiles.some((file) => isPreviewableFile(file.name))

  const buildPreviewDoc = () => {
    const previewFiles = artifactFiles.filter((file) => isPreviewableFile(file.name))
    const htmlFile = previewFiles.find((file) => /\.html?$/i.test(file.name)) || previewFiles[0] || artifactFiles[0]
    const cssFile = previewFiles.find((file) => /\.css$/i.test(file.name))
    const jsFile = previewFiles.find((file) => /\.js$/i.test(file.name))

    const htmlContent = typeof htmlFile?.content === 'string' ? htmlFile.content : '<!doctype html><html><body><div style="font-family: sans-serif; padding: 24px;">Preview unavailable.</div></body></html>'
    const cssContent = typeof cssFile?.content === 'string' ? cssFile.content : ''
    const jsContent = typeof jsFile?.content === 'string' ? jsFile.content : ''

    return `<!doctype html>
      <html>
        <head>
          <meta charset="UTF-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <style>${cssContent}</style>
        </head>
        <body>
          ${htmlContent.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')}
          <script>${jsContent}</script>
        </body>
      </html>`
  }

  const copyFile = async (content) => {
    try {
      await navigator.clipboard.writeText(content || '')
    } catch (error) {
      console.error('Copy failed:', error)
    }
  }

  return (
    <aside className="hidden xl:flex w-[440px] min-w-[440px] max-w-[440px] shrink-0 flex-[0_0_440px] flex-col border-l border-white/10 bg-[#0b0f17] text-slate-200 overflow-hidden">
      <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
        <div className="flex items-center gap-2">
          <FileCode2 size={16} className="text-violet-300" />
          <span className="text-sm font-semibold tracking-wide text-slate-200">Artifacts</span>
        </div>

        {hasPreview && (
          <button
            type="button"
            onClick={() => setShowPreview(true)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-violet-400/30 bg-violet-500/10 px-2.5 py-1.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-violet-100 transition hover:bg-violet-500/15"
          >
            <MonitorPlay size={12} />
            Preview
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-3">
        <div className="space-y-2">
          {artifactFiles.length === 0 ? (
            <div className="rounded-xl border border-dashed border-white/10 bg-slate-900/50 p-4 text-center text-xs text-slate-500">
              No generated files yet.
            </div>
          ) : (
            artifactFiles.map((file, index) => {
              const isActive = selectedFile?.name === file.name
              const meta = getFileMeta(file.name)
              const Icon = meta.icon

              return (
                <button
                  type="button"
                  key={`${file.name}-${index}`}
                  onClick={() => setSelectedFileName(file.name)}
                  className={`flex w-full items-center justify-between rounded-xl border px-3 py-2.5 text-left transition ${
                    isActive
                      ? 'border-violet-400/40 bg-violet-500/10 text-violet-100 shadow-[0_0_0_1px_rgba(168,85,247,0.15)]'
                      : 'border-white/8 bg-slate-900/60 text-slate-300 hover:border-white/15 hover:bg-slate-800/70'
                  }`}
                >
                  <div className="flex min-w-0 items-center gap-2.5">
                    <div className={`rounded-md border border-white/10 bg-slate-950/60 p-1.5 ${meta.color}`}>
                      <Icon size={12} />
                    </div>
                    <span className="truncate text-[12px] font-medium">{file.name}</span>
                  </div>

                  <span className="ml-2 rounded-full border border-white/10 bg-slate-950/60 px-1.5 py-0.5 text-[9px] uppercase tracking-[0.08em] text-slate-400">
                    {meta.label}
                  </span>
                </button>
              )
            })
          )}
        </div>

        {selectedFile && (
          <div className="mt-4 overflow-hidden rounded-2xl border border-white/10 bg-slate-950/80 shadow-[0_12px_30px_rgba(15,23,42,0.3)]">
            <div className="flex items-center justify-between border-b border-white/10 bg-slate-900/80 px-3 py-2">
              <span className="truncate text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-200">{selectedFile.name}</span>
              <button
                type="button"
                onClick={() => copyFile(typeof selectedFile.content === 'string' ? selectedFile.content : JSON.stringify(selectedFile.content, null, 2))}
                className="inline-flex items-center gap-1 rounded border border-white/10 bg-slate-950 px-2 py-1 text-[10px] text-slate-200 hover:border-violet-400/40 hover:text-violet-100"
              >
                <Copy size={11} />
                Copy
              </button>
            </div>

            <pre className="max-h-[420px] overflow-auto p-3 text-[12px] leading-6 text-slate-200 whitespace-pre-wrap">
              <code>{typeof selectedFile.content === 'string' ? selectedFile.content : JSON.stringify(selectedFile.content, null, 2)}</code>
            </pre>
          </div>
        )}
      </div>

      {showPreview && hasPreview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 p-4 backdrop-blur-sm">
          <div className="relative h-[85vh] w-[90vw] overflow-hidden rounded-2xl border border-white/10 bg-[#0b0f17] shadow-2xl shadow-violet-950/30">
            <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-200">
                <Eye size={16} className="text-violet-300" />
                Preview
              </div>
              <button
                type="button"
                onClick={() => setShowPreview(false)}
                className="rounded-full border border-white/10 bg-slate-900 px-2 py-1 text-xs text-slate-200 hover:bg-slate-800"
              >
                Close
              </button>
            </div>

            <iframe
              title="artifact-preview"
              srcDoc={buildPreviewDoc()}
              className="h-[calc(100%-57px)] w-full border-0 bg-white"
            />
          </div>
        </div>
      )}
    </aside>
  )
}

export default Artifact