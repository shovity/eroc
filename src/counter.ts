import { model, Schema } from './mongoose.js'
interface ICounter {
  _id: string
  value: number
}
const counterSchema = Schema<ICounter>(
  { _id: { type: String, required: true }, value: { type: Number, default: 0 } },
  { timestamps: false },
)
const Counter = model<ICounter>('Counter', counterSchema, 'counters')
export const counter = {
  async get(key: string): Promise<number> {
    const doc = await Counter.findByIdAndUpdate(key, { $inc: { value: 1 } }, { upsert: true, new: true })
    return doc.value
  },
  async set(key: string, value: number): Promise<void> {
    await Counter.findByIdAndUpdate(key, { value }, { upsert: true })
  },
}
export type CounterType = typeof counter
