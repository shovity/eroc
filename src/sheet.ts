import { config } from './config.js'
export const sheet = {
  async doc(id: string): Promise<unknown> {
    if (!config.sheet_credential) throw new Error('sheet: config.sheet_credential is required')
    return { id, credential: config.sheet_credential }
  },
}
export type Sheet = typeof sheet
