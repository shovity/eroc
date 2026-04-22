export function query() {
  return {
    filter: {} as Record<string, unknown>,
    sort: {} as Record<string, 1 | -1>,
    limit: 20,
    skip: 0,
    where(field: string, value: unknown) {
      this.filter[field] = value
      return this
    },
    orderBy(field: string, direction: 'asc' | 'desc' = 'asc') {
      this.sort[field] = direction === 'asc' ? 1 : -1
      return this
    },
    take(n: number) {
      this.limit = n
      return this
    },
    offset(n: number) {
      this.skip = n
      return this
    },
    build() {
      return { filter: this.filter, sort: this.sort, limit: this.limit, skip: this.skip }
    },
  }
}
export type Query = ReturnType<typeof query>
