import { useState, useRef } from 'react'
import { Paperclip, Mic, Send, Zap, MessageSquare, Code2, FileText, Presentation, ImageIcon, Globe, X } from 'lucide-react'
import sendMessage from '../features/sendMessage'
import { useSelector, useDispatch } from 'react-redux'
import { addMessage } from '../redux/messageSlice'
import { addConversation, setSelectedConversation, setConvTitle } from '../redux/conversationSlice'
import { createConversation } from '../features/createConversation'
import { updateConversation } from '../features/updateConversation'

const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024
const MAX_ATTACHMENT_COUNT = 5

const readFileAsDataUrl = (file) => new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = () => reject(reader.error || new Error(`Could not read ${file.name}.`))
    reader.readAsDataURL(file)
})

const sanitizeImageList = (images = []) => {
    if (!Array.isArray(images)) return [];

    const unique = new Set();
    return images
        .map((image) => {
            const raw = typeof image === 'string' ? image : image?.url || image?.src || image?.image_url?.url || '';
            if (typeof raw !== 'string') return '';

            const trimmed = raw.trim();
            if (!trimmed || !/^https?:\/\//i.test(trimmed) || /\b(?:null|undefined)\b/i.test(trimmed)) return '';

            try {
                const parsed = new URL(trimmed);
                if (!['http:', 'https:'].includes(parsed.protocol)) return '';
                const pathname = parsed.pathname.toLowerCase();
                const hasImageExt = /\.(png|jpe?g|gif|webp|bmp|svg|avif|heic|heif)(\?.*)?$/i.test(pathname);
                const hasImageFolder = /\/(?:images?|photos?|media|uploads?|files?|attachments?|content)\//i.test(pathname);
                if (!hasImageExt && !hasImageFolder) return '';
                return trimmed;
            } catch {
                return '';
            }
        })
        .filter(Boolean)
        .filter((url) => {
            if (unique.has(url)) return false;
            unique.add(url);
            return true;
        });
};

const extractImageUrls = (text) => {
    if (!text || typeof text !== "string") return [];
    const urls = text.match(/https?:\/\/[^\s)"'>]+(?:\.(?:png|jpe?g|gif|webp|bmp|svg|avif|heic|heif))(?:\?[^\s)"'>]*)?/gi) || [];
    return sanitizeImageList(urls);
};
const extractArtifactFiles = (payload) => {
    if (!payload) return [];

    let candidate = payload;
    if (typeof payload === 'string') {
        let text = payload.trim();

        if (text.startsWith('```')) {
            text = text.replace(/^```(?:json|javascript|js|ts|typescript)?\s*/i, '').replace(/```\s*$/i, '').trim();
        }

        if ((text.startsWith('"') && text.endsWith('"')) || (text.startsWith("'") && text.endsWith("'"))) {
            try {
                const unwrapped = JSON.parse(text);
                if (typeof unwrapped === 'string') text = unwrapped;
            } catch {
                text = text.slice(1, -1);
            }
        }

        const firstBrace = text.indexOf('{');
        const lastBrace = text.lastIndexOf('}');
        if (firstBrace >= 0 && lastBrace > firstBrace) {
            text = text.slice(firstBrace, lastBrace + 1);
        }

        try {
            candidate = JSON.parse(text);
        } catch {
            const match = text.match(/"name"\s*:\s*"((?:\\.|[^"\\])*)"\s*,\s*"content"\s*:\s*"((?:\\.|[^"\\])*)"/gs);
            if (!match) return [];

            return match.map((entry) => {
                const fileMatch = entry.match(/"name"\s*:\s*"((?:\\.|[^"\\])*)"\s*,\s*"content"\s*:\s*"((?:\\.|[^"\\])*)"/s);
                if (!fileMatch) return null;
                return {
                    name: fileMatch[1].replace(/\\n/g, '\n').replace(/\\"/g, '"').replace(/\\r/g, '\r').replace(/\\t/g, '\t'),
                    content: fileMatch[2].replace(/\\n/g, '\n').replace(/\\r/g, '\r').replace(/\\t/g, '\t').replace(/\\"/g, '"').replace(/\\\\/g, '\\')
                };
            }).filter(Boolean);
        }
    }

    if (candidate && Array.isArray(candidate.files)) {
        return candidate.files.filter((file) => file && typeof file.name === 'string' && typeof file.content === 'string');
    }

    return [];
};
function ChatInput() {
    const [value,setValue]=useState("")
    const [selectedAgent,setSelectedAgent]=useState("Auto")
    const [attachments, setAttachments] = useState([])
    const [uploadError, setUploadError] = useState("")
    const [isLoading, setIsLoading] = useState(false) // Added loading guard
    const fileInputRef = useRef(null)
    const {selectedConversation}=useSelector((state)=>state.conversation)
    const dispatch=useDispatch()

    const handleFileChange = async (e) => {
        const files = Array.from(e.target.files || [])
        e.target.value = ""
        if (files.length === 0) return

        const totalBytes = attachments.reduce((total, file) => total + file.size, 0)
        if (attachments.length + files.length > MAX_ATTACHMENT_COUNT) {
            setUploadError(`Attach up to ${MAX_ATTACHMENT_COUNT} files at a time.`)
            return
        }
        if (files.some((file) => !(file.type.startsWith("image/") || file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")))) {
            setUploadError("Only image files and PDFs are supported.")
            return
        }
        if (files.some((file) => file.size === 0 || file.size > MAX_ATTACHMENT_BYTES) || totalBytes + files.reduce((total, file) => total + file.size, 0) > MAX_ATTACHMENT_BYTES) {
            setUploadError("Attachments must be non-empty and total no more than 10 MB.")
            return
        }

        try {
            const loadedFiles = await Promise.all(files.map(async (file) => ({
                id: `${file.name}-${file.lastModified}-${Math.random()}`,
                name: file.name,
                type: file.type.startsWith("image/") ? file.type : "application/pdf",
                size: file.size,
                data: await readFileAsDataUrl(file)
            })))
            setAttachments((current) => [...current, ...loadedFiles])
            setUploadError("")
        } catch (error) {
            console.error("Failed to read attachment:", error)
            setUploadError(error.message || "Could not read the selected file.")
        }
    }

    const handleSendMessage=async()=>{
      if ((!value.trim() && attachments.length === 0) || isLoading) return
      
      setIsLoading(true) // Lock sending until response finishes
        try {
            let conversation=selectedConversation
            if(!conversation) {
                let conv=await createConversation()
                conv=conv?.conversation || conv?.data || conv
                if (!conv?._id) throw new Error("Could not create a conversation.")
                dispatch(setSelectedConversation(conv))
                dispatch(addConversation(conv))
                conversation=conv
            }
            const prompt = value.trim() || (attachments.some((file) => file.type === "application/pdf")
                ? "Please analyze the attached document."
                : "Please analyze the attached image(s).")
            if(conversation.title=="New Chat") {
                await updateConversation({id:conversation?._id,title:prompt})
                dispatch(setConvTitle({conversationId:conversation?._id,title:prompt.slice(0,40)}))
            }
            const images = attachments
                .filter((file) => file.type.startsWith("image/"))
                .map((file) => file.data)
            const documents = attachments
                .filter((file) => file.type === "application/pdf")
                .map(({name, data}) => ({name, data}))
            const attachmentNames = attachments.map((file) => file.name)
            const payload={
                prompt,
                conversationId:conversation?._id,
                agent:selectedAgent.toLowerCase(),
                images,
                documents
            }
            const userMessage = {
                _id: Date.now(),
                conversationId: conversation?._id,
                role: "user",
                content: `${prompt}${attachmentNames.length ? `\n\nAttached: ${attachmentNames.join(", ")}` : ""}`,
                images
            }
            dispatch(addMessage(userMessage))

            const data = await sendMessage(payload)
            if (!data) throw new Error("The server returned an empty response.")
            const aiResponseData = data?.data || data;
            const aiContent = typeof aiResponseData?.content === "string"
                ? aiResponseData.content
                : (typeof aiResponseData?.aiResponse === "string" ? aiResponseData.aiResponse : "");
            const aiImages = sanitizeImageList(
                Array.isArray(aiResponseData?.images) && aiResponseData.images.length
                    ? aiResponseData.images
                    : extractImageUrls(aiContent)
            );
            const aiArtifacts = Array.isArray(aiResponseData?.artifacts) && aiResponseData.artifacts.length
                ? aiResponseData.artifacts
                : extractArtifactFiles(aiContent);

            const assistantMessage = {
                _id: Date.now() + 1,
                conversationId: conversation?._id,
                role: "assistant",
                content: aiContent || (aiImages.length ? "Here are the images you asked for." : ""),
                images: aiImages,
                artifacts: aiArtifacts
            }

            if (aiContent || aiImages.length) {
                dispatch(addMessage(assistantMessage))
            }

            const activeConversationId = conversation?._id || aiResponseData?.conversationId || aiResponseData?.conversation?._id || aiResponseData?._id;

            if (!conversation?._id) {
                dispatch(setSelectedConversation({ 
                    _id: activeConversationId, 
                    title: payload.prompt || "Image Chat"
                }))
            }
            setValue("")
            setAttachments([])
            setUploadError("")
        } catch (err) {
            console.error("Failed to send message:", err)
            setUploadError(err.response?.data?.message || err.message || "Failed to send the message. Please try again.")
        } finally {
            setIsLoading(false) // Unlock sending
        }
    }
    const agents=[
      {
        id:"auto",
        icon:Zap,
        label:"Auto"
      },{
        id:"chat",
        icon:MessageSquare,
        label:"Chat"
      },{
        id:"coding",
        icon:Code2,
        label:"coding"
      },{
        id:"pdf",
        icon:FileText,
        label:"PDF"
      },{
        id:"ppt",
        icon:Presentation,
        label:"PPT"
      },{
        id:"image",
        icon:ImageIcon,
        label:"Image"
      },{
        id:"serach",
        icon:Globe,
        label:"search"
      }
    ]
  return (
    <div className='w-full overflow-hidden px-3 md:px-5 py-4 border-t border-white/[0.06] bg-[#0d0f14]'>
      <div className='flex flex-col gap-2 bg-white/[0.03] border border-white/[0.07] rounded-2xl px-4 pt-3.5 pb-3'>
        <div className='flex w-[80%] gap-2 pr-2 flex-wrap'>
          {agents.map((agent) => {
            const isActive = selectedAgent === agent.label
            const Icon = agent.icon
            return (
              <div
                onClick={() => setSelectedAgent(agent.label)}
                key={agent.id}
                className={`
                  flex-shrink-0
                  cursor-pointer
                  inline-flex
                  items-center
                  gap-1.5
                  px-3
                  py-2
                  rounded-full
                  text-xs
                  font-medium
                  border
                  transition-all
                  
                  ${
                    isActive
                      ? "bg-gradient-to-r from-indigo-500 to-violet-600 text-white border-transparent shadow-[0_1px_8px_rgba(99,102,241,.35)]"
                      : "bg-white/[0.03] text-slate-400 border-white/[0.06] hover:bg-white/[0.07]"
                  }
                `}>

                <Icon size={14} 
                  className={
                    isActive 
                      ? "text-white" 
                      : "text-slate-500"
                  } />

                {agent.label}

              </div>
            )
          })}
        </div>
        
        {attachments.length > 0 && (
          <div className="flex gap-2 flex-wrap py-1">
            {attachments.map((file) => (
              <div key={file.id} className="relative flex h-16 max-w-56 items-center gap-2 rounded-lg border border-white/10 bg-white/[0.04] p-2 pr-8">
                {file.type.startsWith("image/") ? (
                  <img src={file.data} alt={file.name} className="h-12 w-12 shrink-0 rounded object-cover" />
                ) : (
                  <FileText size={20} className="shrink-0 text-violet-300" />
                )}
                <span className="truncate text-xs text-slate-300" title={file.name}>{file.name}</span>
                <button 
                  type="button"
                  aria-label={`Remove ${file.name}`}
                  onClick={() => setAttachments((current) => current.filter((attachment) => attachment.id !== file.id))}
                  className="absolute right-1 top-1 rounded-full bg-black/60 p-0.5 text-white hover:bg-black cursor-pointer"
                >
                  <X size={12} />
                </button>
              </div>
            ))}
          </div>
        )}
        {uploadError && <p role="alert" className="text-xs text-red-300">{uploadError}</p>}

        <textarea
          placeholder={isLoading ? "AI is thinking..." : "Ask Anything..."}
          disabled={isLoading}
          onChange={(e)=>setValue(e.target.value)} 
          value={value}
          className="w-full bg-transparent outline-none resize-none text-[14px] text-slate-200 placeholder:text-slate-600 leading-relaxed [scrollbar-width:none] [&::-webkit-scrollbar]:hidden disabled:opacity-50"
          rows={3}
        />
        <div className='flex items-center justify-between'>
        <div className='flex items-center gap-1'>
        {/* Hidden file input */}
        <input 
          type="file" 
          ref={fileInputRef} 
          onChange={handleFileChange} 
          multiple 
          accept="image/*,.pdf,application/pdf"
          disabled={isLoading}
          className="hidden" 
        />
        <button 
          type="button"
          disabled={isLoading}
          onClick={() => fileInputRef.current?.click()}
          className='flex items-center justify-center w-8 h-8 rounded-lg text-slate-600 hover:text-slate-400 hover:bg-white/[0.05] border border-transparent hover:border-white/[0.06] transition-all duration-150 bg-transparent cursor-pointer'
        >
            <Paperclip size={16} />
        </button>
        <button className='flex items-center justify-center w-8 h-8 rounded-lg text-slate-600 hover:text-slate-400 hover:bg-white/[0.05] border border-transparent hover:border-white/[0.06] transition-all duration-150 bg-transparent cursor-pointer'>
            <Mic size={16} />
        </button>
        </div>
        <button
        disabled={(!value.trim() && attachments.length === 0) || isLoading}
        onClick={handleSendMessage}
        className={`flex items-center justify-center w-8 h-8 rounded-lg border-none cursor-pointer transition-all duration-150 ${
            (value.trim() || attachments.length > 0) && !isLoading
            ? "bg-linear-to-br from-indigo-500 to-violet-700 hover:opacity-90 text-white"
            : "bg-white/[0.05] text-slate-600 cursor-not-allowed"
        }`}
        >
        <Send size={15} />
        </button>
        </div>
      </div>
    </div>
  )
}

export default ChatInput