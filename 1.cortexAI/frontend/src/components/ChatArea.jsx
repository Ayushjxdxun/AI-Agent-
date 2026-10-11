import Nav from './Nav'
import MessageList from './MessageList'
import ChatInput from './ChatInput'
import getMessages from '../features/getMessages'
import { setMessages } from '../redux/messageSlice'
import { useDispatch, useSelector } from 'react-redux'
import { useEffect } from 'react'

function ChatArea() {
  const { selectedConversation } = useSelector((state) => state.conversation)
  const dispatch = useDispatch()

  useEffect(() => {
    let isCurrent = true
    const conversationId = selectedConversation?._id

    dispatch(setMessages([]))

    if (!conversationId) return () => { isCurrent = false }

    const loadMessages = async () => {
      const data = await getMessages(conversationId)
      if (isCurrent) {
        dispatch(setMessages(Array.isArray(data?.messages) ? data.messages : []))
      }
    }

    loadMessages()
    return () => { isCurrent = false }
  }, [dispatch, selectedConversation?._id])

  return (
    <div className='flex-1 min-w-0 flex flex-col'>
      <Nav/>
      <MessageList/>
      <ChatInput/>
    </div>
  )
}

export default ChatArea