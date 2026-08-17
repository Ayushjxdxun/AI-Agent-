import React from 'react'
import Markdown from 'react-markdown'
function MessageBubble({role,content,images}) {
    const isUser=role==="user"
    const safeImages = Array.isArray(images) ? images.filter(Boolean) : []
    const safeContent = typeof content === "string" ? content : ""
  return (
  <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
    <div className={`max-w-[72%] px-4 py-2.5 rounded-2xl text-[13.5px] leading-relaxed
      ${
        isUser
          ? "bg-linear-to-br from-indigo-500 to-violet-700 text-white rounded-tr-sm"
          : "bg-white/[0.04] border border-white/[0.07] text-slate-200 rounded-tl-sm"
      }`}>
        {safeImages.length>0&& (
          <div className="flex flex-wrap gap-1.5 mt-2">
            {safeImages.map((image, index) => (
              <img
                key={`${image}-${index}`}
                src={image}
                alt="message attachment"
                className="max-h-52 rounded-lg border border-white/10 object-cover"
                loading="lazy"
                onError={(e) => e.currentTarget.remove()}/>
            ))}
          </div>
        )}
        <Markdown>
            {safeContent}
        </Markdown>
    </div>
  </div>
  )
}

export default MessageBubble