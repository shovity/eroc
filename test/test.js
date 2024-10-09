module.exports = {
  pool: {},
  total: 0,
  passed: 0,
  shouldFinishTimer: null,

  start(name, timeout = 3000) {
    if (this.pool[name]) {
      return console.log(`⛔ Test name already exists: ${name}`)
    }

    const test = {}
    this.pool[name] = test

    test.name = name
    test.status = 'pending'
    test.start = Date.now()

    test.timer = setTimeout(() => {
      this.check(name, false, 'timeout')
    }, timeout)

    this.total++
  },

  check(name, condition, error) {
    const test = this.pool[name]

    if (!test) {
      throw Error(`Test name not found: ${name}`)
    }

    if (test.timer) {
      clearTimeout(test.timer)
      delete test.timer
    }

    if (test.status !== 'pending') {
      return
    }

    if (condition || condition === undefined) {
      this.passed++
      test.status = '✅ passed'
    } else {
      test.error = error
      test.status = '❌ failed'
    }

    console.log(
      `${test.status}: ${(Date.now() - test.start + 'ms').padEnd(5)} 🔬 ${
        test.name
      }`,
    )
    test.error && console.log('   ', test.error)

    if (this.shouldFinishTimer) {
      clearTimeout(this.shouldFinishTimer)
    }

    this.shouldFinishTimer = setTimeout(() => {
      if (!Object.values(this.pool).find((t) => t.status === 'pending')) {
        this.finish()
      }
    }, 5000)
  },

  finish() {
    console.log(`Test completed: ${this.passed}/${this.total} passed`)
    process.exit(this.passed === this.total ? 0 : 1)
  },

  sleep(ms) {
    return new Promise((resolve) => {
      setTimeout(resolve, ms)
    })
  },
}
