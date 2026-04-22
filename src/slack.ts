import { config } from './config.js'
import { request } from './request.js'
interface SlackOptions {
  channel?: string
}
export const slack = {
  async send(message: string, options: SlackOptions = {}): Promise<void> {
    if (!config.slack_token) throw new Error('slack: config.slack_token is required')
    const channel = options.channel ?? config.slack_default_channel
    if (!channel) throw new Error('slack: channel is required')
    await request.post(
      'https://slack.com/api/chat.postMessage',
      { channel, text: message },
      { headers: { Authorization: `Bearer ${config.slack_token}` } },
    )
  },
}
export type Slack = typeof slack
