const { lock } = require('eroc')

const main = async () => {
  // Aquire success

  test.start('lock aquire success')
  const aquireSuccess = await lock.aquire('test', 1000)

  if (aquireSuccess) {
    test.check('lock aquire success')
  }

  // Aquire fail

  test.start('lock aquire fail')
  const aquireFail = await lock.aquire(['test'], 1000)

  if (aquireFail) {
    test.check('lock aquire fail', false)
  }

  setTimeout(() => {
    test.check('lock aquire fail')
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
