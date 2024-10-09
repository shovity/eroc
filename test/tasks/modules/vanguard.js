const { request, jwt } = require('eroc')

const main = async () => {
  test.start('vanguard success')
  request
    .get(
      'example/vanguard',
      {},
      {
        header: {
          token: await jwt.sign({ username: 'Yuta', roles: ['staff'] }),
        },
      },
    )
    .then(({ data }) => {
      test.check('vanguard success', data.username === 'Yuta')
    })
    .catch((error) => {
      test.check('vanguard success', false, error)
    })

  test.start('vanguard insufficient permission')
  request
    .get(
      'example/vanguard',
      {},
      {
        header: {
          token: await jwt.sign({ username: 'Yuta', roles: [] }),
        },
      },
    )
    .then(() => {
      test.check('vanguard insufficient permission', false)
    })
    .catch(() => {
      test.check('vanguard insufficient permission')
    })

  test.start('vanguard not login')
  request
    .get('example/vanguard')
    .then(() => {
      test.check('vanguard not login', false)
    })
    .catch(() => {
      test.check('vanguard not login')
    })

  test.start('vanguard signature verification failed')
  request
    .get(
      'example/vanguard',
      {},
      {
        header: {
          token: (await jwt.sign({ username: 'Yuta', roles: ['staff'] })) + '1',
        },
      },
    )
    .then(() => {
      test.check('vanguard signature verification failed', false)
    })
    .catch((error) => {
      test.check('vanguard signature verification failed', error.logout, error)
    })
}

main().catch(console.log)
