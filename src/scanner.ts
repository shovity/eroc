import path from 'node:path'
import fs from 'node:fs/promises'
import { Router } from './router.js'
import { config } from './config.js'
import { logger } from './logger.js'
import { pathToFileURL } from 'node:url'

async function getFiles(dir: string): Promise<string[]> {
  const entries = await fs.readdir(dir, { withFileTypes: true })
  const files: string[] = []
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name)
    if (entry.isDirectory()) files.push(...(await getFiles(fullPath)))
    // Only load conventionally-named modules; skip dotfiles, tests, uppercase
    else if (/^[a-z][a-z0-9-]*\.(js|ts)$/.test(entry.name)) files.push(fullPath)
  }
  return files.sort()
}

export const scanner = {
  async router(dir: string): Promise<{ router: ReturnType<typeof Router>; paths: string[] }> {
    const router = Router()
    const basePath = path.resolve(config.app_dir, dir)
    const files = await getFiles(basePath)
    for (const file of files) {
      try {
        const url = pathToFileURL(file).href
        const mod = await import(url)
        const subRouter = mod.default ?? mod.router
        if (subRouter) {
          const routePath =
            '/' +
            path
              .relative(basePath, file)
              .replace(/\\/g, '/')
              .replace(/\.(js|ts)$/, '')
              .replace(/\/index$/, '')
          router.use(routePath === '/' ? '/' : routePath, subRouter)
        }
      } catch (err) {
        logger.error(`scanner: failed to load router ${file}`, { error: String(err) })
      }
    }
    return { router, paths: files }
  },
  async event(): Promise<void> {
    const basePath = path.resolve(config.app_dir, config.seek_events)
    try {
      await fs.access(basePath)
      const files = await getFiles(basePath)
      for (const file of files) {
        try {
          await import(pathToFileURL(file).href)
        } catch (err) {
          logger.error(`scanner: failed to load event ${file}`, { error: String(err) })
        }
      }
      logger.info(`scanner: loaded ${files.length} events`)
    } catch {
      /* skip */
    }
  },
  async task(): Promise<void> {
    const basePath = path.resolve(config.app_dir, config.seek_tasks)
    try {
      await fs.access(basePath)
      const files = await getFiles(basePath)
      for (const file of files) {
        try {
          await import(pathToFileURL(file).href)
        } catch (err) {
          logger.error(`scanner: failed to load task ${file}`, { error: String(err) })
        }
      }
      logger.info(`scanner: loaded ${files.length} tasks`)
    } catch {
      /* skip */
    }
  },
}
export type Scanner = typeof scanner
