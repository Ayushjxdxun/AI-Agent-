import React ,{ useState, useRef } from 'react'
import { Paperclip, Mic, Send, Zap, MessageSquare, Code2, FileText, Presentation, ImageIcon, Globe, X } from 'lucide-react'
import sendMessage from '../features/sendMessage'
import { useSelector, useDispatch } from 'react-redux'
import { addMessage } from '../redux/messageSlice'
import { addConversation, setSelectedConversation, setConvTitle } from '../redux/conversationSlice'
import { createConversation } from '../features/createConversation'
import { updateConversation } from '../features/updateConversation'

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
    const [images, setImages] = useState([])
    const [isLoading, setIsLoading] = useState(false) // Added loading guard
    const fileInputRef = useRef(null)
    const {selectedConversation}=useSelector((state)=>state.conversation)
    const { messages } = useSelector((state) => state.message)
    const dispatch=useDispatch()

    const handleFileChange = (e) => {
        const files = Array.from(e.target.files)
        files.forEach(file => {
            const reader = new FileReader()
            reader.onloadend = () => {
                setImages(prev => [...prev, reader.result])
            }
            reader.readAsDataURL(file)
        })
    }

    const handleSendMessage=async()=>{
      if ((!value.trim() && images.length === 0) || isLoading) return
      
      setIsLoading(true) // Lock sending until response finishes
      let conversation=selectedConversation
      if(!conversation) {
        let conv=await createConversation()
        conv=conv?.conversation || conv?.data || conv
        dispatch(setSelectedConversation(conv))
        dispatch(addConversation(conv))
        conversation=conv
      }
      if(conversation.title=="New Chat") {
        const conv=await updateConversation({id:conversation?._id,title:value.trim() || "Image Chat"})
        dispatch(setConvTitle({conversationId:conversation?._id,title:(value.trim() || "Image Chat").slice(0,40)}))
      }
        const payload={
            prompt:value.trim(),conversationId:conversation?._id,agent:selectedAgent.toLowerCase(),images
        }
        const userMessage = {
            _id: Date.now(),
            conversationId: conversation?._id,
            role: "user",
            content: payload.prompt,
            images
        }
        dispatch(addMessage(userMessage))
        setValue("")
        setImages([])
        
        try {
            const data = await sendMessage(payload)
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
        } catch (err) {
            console.error("Failed to send message:", err)
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
        
        {/* Image Preview Area */}
        {images.length > 0 && (
          <div className="flex gap-2 flex-wrap py-1">
            {images.map((img, idx) => (
              <div key={idx} className="relative w-16 h-16 rounded-lg overflow-hidden border border-white/10">
                <img src={img} alt="preview" className="w-full h-full object-cover" />
                <button 
                  onClick={() => setImages(images.filter((_, i) => i !== idx))}
                  className="absolute top-1 right-1 bg-black/60 rounded-full p-0.5 text-white hover:bg-black cursor-pointer"
                >
                  <X size={12} />
                </button>
              </div>
            ))}
          </div>
        )}

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
          accept="image/*" 
          className="hidden" 
        />
        <button 
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
        disabled={(!value.trim() && images.length === 0) || isLoading}
        onClick={handleSendMessage}
        className={`flex items-center justify-center w-8 h-8 rounded-lg border-none cursor-pointer transition-all duration-150 ${
            (value.trim() || images.length > 0) && !isLoading
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