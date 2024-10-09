const { request } = require('eroc')

test.start('api/v1/users')

const main = async () => {
  const username = `sho ${Date.now()}`

  test.start('api/v1/users POST /')
  const { data: created } = await request.post('/example/v1/users', {
    username,
  })
  test.check('api/v1/users POST /', created.username === username)

  test.start('api/v1/users GET /')
  const { data: user } = await request.get('/example/v1/users', { username })
  test.check('api/v1/users GET /', user.username === username)

  test.check('api/v1/users')
}

main().catch((error) => {
  test.check('api/v1/users', false, error)
})
