/* eslint-disable @typescript-eslint/no-explicit-any */
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
  logger.info('mongoose: connected')
}

// Extra schema options driving the cross-service sync system
export interface SyncOptions {
  /** Publish modified top-level paths on save to task 'mongoose.<service>.<model>' */
  publish?: boolean
  /** Sync embedded copies: { localPath: 'service.Model' | ['service.Model', ...] } */
  subscribe?: Record<string, string | string[]>
}

const QUERY_METHODS = [
  'updateOne',
  'deleteOne',
  'deleteMany',
  'replaceOne',
  'updateMany',
  'findOneAndReplace',
  'findOneAndUpdate',
  'findOneAndDelete',
] as const

/**
 * Event sourcing: emit every write of selected models to task 'mongoose.event'.
 * Model.insertMany and Model.bulkWrite are NOT covered.
 */
function registerEventStore(name: string, schema: MongooseSchema<any>): void {
  if (config.event_sourcing_model !== '*' && !config.event_sourcing_model?.split(',').includes(name)) return
  if (config.event_sourcing_model_exclude?.split(',').includes(name)) return

  const emit = async (event: Record<string, unknown>) => {
    try {
      const { task } = await import('./task.js')
      await task.emit('mongoose.event', event)
    } catch (error) {
      logger.error('mongoose: event sourcing emit error', { error: String(error) })
    }
  }

  schema.pre('save', async function (this: any) {
    await emit({
      service: config.service,
      model: name,
      method: 'save',
      target: { _id: this._id },
      command: this.getChanges?.(),
    })
  })

  for (const method of QUERY_METHODS) {
    schema.pre(method as any, async function (this: any) {
      await emit({
        service: config.service,
        model: name,
        method,
        target: this.getQuery(),
        command: this.getUpdate(),
        options: this.options,
      })
    })
  }
}

const subscribePool: Record<string, Array<(data: Record<string, unknown>) => Promise<void>>> = {}

/**
 * Cross-service data sync:
 * - publish: on save, emit modified top-level paths to task 'mongoose.<service>.<model>'
 * - subscribe: listen to those topics and $set the embedded copies locally
 */
function registerSyncSystem(name: string, schema: MongooseSchema<any>, options: SchemaOptions & SyncOptions): void {
  if (options.publish) {
    const topic = `mongoose.${config.service}.${name}`

    schema.pre('save', async function (this: any) {
      try {
        if (this.isNew) return

        const paths = this.modifiedPaths().filter((p: string) => !p.includes('.'))
        if (!paths.length) return

        const data: Record<string, unknown> = { _id: this._id }
        for (const path of paths) data[path] = this[path]

        const { task } = await import('./task.js')
        await task.emit(topic, data)
      } catch (error) {
        logger.error('mongoose: publish error', { error: String(error) })
      }
    })
  }

  if (options.subscribe) {
    // Group local paths by source topic
    const group: Record<string, string[]> = {}
    for (const [path, topic] of Object.entries(options.subscribe)) {
      for (const t of Array.isArray(topic) ? topic : [topic]) {
        ;(group[t] ??= []).push(path)
      }
    }

    for (const [topic, paths] of Object.entries(group)) {
      if (!subscribePool[topic]) {
        subscribePool[topic] = []

        import('./task.js').then(({ task }) =>
          task.on(`mongoose.${topic}`, async (data: Record<string, unknown>) => {
            for (const handle of subscribePool[topic]) {
              await handle(data)
            }
          }),
        )
      }

      subscribePool[topic].push(async (data) => {
        for (const path of paths) {
          const query = { [`${path}._id`]: data._id }
          const update: { $set: Record<string, unknown> } = { $set: {} }
          const updateOptions: Record<string, unknown> = {}

          for (const [key, value] of Object.entries(data)) {
            if (schema.paths[path]?.instance === 'Array') {
              update.$set[`${path}.$[filter].${key}`] = value
              updateOptions.arrayFilters = [{ 'filter._id': data._id }]
            } else {
              update.$set[`${path}.${key}`] = value
            }
          }

          await mongoose.models[name].updateMany(query, update, updateOptions)
        }
      })
    }
  }
}

export function Schema<T>(definition: SchemaDefinition<T>, options?: SchemaOptions & SyncOptions): MongooseSchema<any> {
  return new MongooseSchema<any>(definition as SchemaDefinition<any>, {
    timestamps: true,
    ...options,
  } as any)
}

export function model<T>(name: string, schema: MongooseSchema<T>, collection?: string): Model<T> {
  connect().catch((err) => logger.error('mongoose: auto-connect failed', { error: String(err) }))

  registerEventStore(name, schema as MongooseSchema<any>)
  registerSyncSystem(name, schema as MongooseSchema<any>, (schema as any).options ?? {})

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
