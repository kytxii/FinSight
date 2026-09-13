import client from './client'
import * as demo from './demoStore'

const isDemo = () => localStorage.getItem('demo') === 'true'

export const sendChatMessage = (message, history) =>
  isDemo() ? demo.sendChatMessage(message, history) : client.post('/assistant/chat', { message, history })

export const getAssistantUsage = () =>
  isDemo() ? demo.getAssistantUsage() : client.get('/assistant/usage')
