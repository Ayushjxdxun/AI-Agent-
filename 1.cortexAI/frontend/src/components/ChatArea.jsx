import React from 'react'
import Nav from './Nav'
import MessageList from './MessageList'
import ChatInput from './ChatInput'
import { useSelector,useDispatch } from 'react-redux'
import getMessages from '../features/getMessages'
import { setMessages } from '../redux/messageSlice'
import { useEffect } from 'react'

function ChatArea() {
  const { selectedConversation } = useSelector((state) => state.conversation)
  const dispatch=useDispatch();
  useEffect(() => {

    const getMesg=async()=>{
      if(selectedConversation?._id)
      {
        const data=await getMessages(selectedConversation?._id)
        const messageList = Array.isArray(data) ? data : (data?.messages || [])
        dispatch(setMessages(messageList));
    }
    }
    getMesg();
  },[selectedConversation])
  return (
    <div className='flex-1 flex flex-col'>
      <Nav/>
      <MessageList/>
      <ChatInput/>
    </div>
  )
}

export default ChatArea