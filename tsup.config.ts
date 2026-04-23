import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/*.ts'],
  format: ['esm'],
  dts: true,
  clean: true,
  target: 'node22',
  splitting: false,
  sourcemap: false,
})
