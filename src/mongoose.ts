// src/mongoose.ts
import mongoose, {
  Schema as MongooseSchema,
  model as mongooseModel,
  type Model,
  type SchemaDefinition,
  type SchemaOptions,
} from 'mongoose'
import { config } from './config.js'
import { logger } from './logger.js'

let connected = false

async function connect(): Promise<void> {
  if (connected) return

  if (!config.mongo_uri) {
    throw new Error('mongoose: config.mongo_uri is required')
  }

  await mongoose.connect(config.mongo_uri, { authSource: 'admin' })
  connected = true
  logger.info(`mongoose: connected - ${config.mongo_uri}`)
}

export function Schema<T>(
  definition: SchemaDefinition<T>,
  options?: SchemaOptions,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): MongooseSchema<any> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return new MongooseSchema<any>(
    definition as SchemaDefinition<any>,
    {
      timestamps: true,
      ...options,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any,
  )
}

export function model<T>(name: string, schema: MongooseSchema<T>, collection?: string): Model<T> {
  connect().catch((err) => logger.error('mongoose: auto-connect failed', { error: String(err) }))
  return mongooseModel<T>(name, schema, collection)
}

export async function disconnect(): Promise<void> {
  if (connected) {
    await mongoose.disconnect()
    connected = false
    logger.info('mongoose: disconnected')
  }
}

export { mongoose }
export type { Model, SchemaDefinition, SchemaOptions }
