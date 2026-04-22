import { config } from './config.js'
import { request } from './request.js'
export const telegram = {
  async send(chatId: string, text: string, params?: Record<string, unknown>): Promise<unknown> {
    if (!config.telegram_token) throw new Error('telegram: config.telegram_token is required')
    return telegram.method('sendMessage', { chat_id: chatId, text, ...params })
  },
  async method(method: string, params?: Record<string, unknown>): Promise<unknown> {
    if (!config.telegram_token) throw new Error('telegram: config.telegram_token is required')
    const url = `https://api.telegram.org/bot${config.telegram_token}/${method}`
    return request.post(url, params)
  },
}
export type Telegram = typeof telegram
