import React from 'react'
import { PanelLeftIcon, PenBoxIcon, PenSquare, Plus } from "lucide-react";
import { useState } from 'react';
import {useEffect} from 'react';
import { createConversation } from '../features/createConversation';
import { getConversations } from '../features/getConversations';
import { useDispatch } from 'react-redux';
import { addConversation, setConversations } from '../redux/conversationSlice';
function SideBar() {
  const [collapsed, setCollapsed] = useState(false);
  const dispatch=useDispatch();
  useEffect(() => {
      const getConv=async ()=>{
        const data=await getConversations();
        dispatch(setConversations(data));
      }
      getConv();
  },[])
const handleCreateConversation = async () => {
    const data=await createConversation();
    dispatch(addConversation(data));
}

  return (
    <div className='fixed lg:static inset-y-0 left-0 z-50 w-[270px] h-screen shrink-0 bg-[#0d0f14] border-r border-white/[0.06]'>
      <div className='flex flex-col h-full'>
        <div className='flex items-center gap-2.5 px-4 py-4 border-b border-white/[0.06]'>
          <div 
            className='hidden lg:flex items-center justify-center w-7 h-7 rounded-lg text-slate-500 hover:text-slate-200 hover:bg-white/[0.05] transition-colors duration-150 bg-transparent border-none cursor-pointer'
            onClick={() => setCollapsed(true)}
          >
            <PanelLeftIcon />
          </div>
          <span className='text-[16px] font-semibold text-slate-100 tracking-tight flex-1'>
            CortexAI
          </span>
          <span className='text-[10px] font-medium text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-2 py-0.5 rounded-full tracking-wide'>
            free
          </span>
          <button className='flex items-center justify-center w-7 h-7 rounded-lg text-slate-500 hover:text-slate-200 hover:bg-white/[0.05] transition-colors duration-150 bg-transparent border-none cursor-pointer' onClick={handleCreateConversation}>
            <PenSquare size={14} />
          </button>
        </div>
      <div className='px-4 pt-4 pb-1'>
        <button className='w-full flex items-center justify-center gap-2 text-sm font-medium text-white bg-linear-to-br from-indigo-500 to-violet-700 rounded-xl py-[10px] border-none cursor-pointer hover:opacity-90 transition-opacity duration-150' onClick={handleCreateConversation}>
            <Plus size={15} />
            New Chat
        </button>
      </div>


      </div>
    </div>
  );
}

export default SideBar;