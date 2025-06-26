const { lock } = require('eroc')

const main = async () => {
  // Acquire success

  test.start('lock acquire success')
  const acquireSuccess = await lock.acquire('test', 1000)

  if (acquireSuccess) {
    test.check('lock acquire success')
  }

  // Acquire fail

  test.start('lock acquire fail')
  const acquireFail = await lock.acquire(['test'], 1000)

  if (acquireFail) {
    test.check('lock acquire fail', false)
  }

  setTimeout(() => {
    test.check('lock acquire fail')
  }, 1010)

  // Using
  const startDate = Date.now()

  test.start('lock using success')
  test.start('lock using await')

  lock
    .using('test', async () => {
      await new Promise((resovle) => setTimeout(resovle, 1000))
      return 1
    })
    .then((data) => {
      test.check('lock using success', data === 1 && Date.now() - startDate < 1100)
    })

  lock
    .using('test', async () => {
      await new Promise((resovle) => setTimeout(resovle, 1000))
      return 1
    })
    .then((data) => {
      test.check('lock using await', data === 1 && Date.now() - startDate > 2000)
    })
}

main().catch(console.log)
