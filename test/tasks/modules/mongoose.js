const User = require('../../models/User')
const Order = require('../../models/Order')

const main = async () => {
  test.start('mongoose create user')
  const user = await User.create({ username: 'Mina' })
  test.check('mongoose create user')

  test.start('mongoose create order')

  const order = await Order.create({
    item: 'Black T-Shirt',
    user: user,
    embedded: user,
    embedded2: user,
    array: [user],
  })

  test.check('mongoose create order')

  await test.sleep(3000)

  test.start('mongoose auto sync Order.user')
  user.username = 'Minamoto'
  await user.save()

  await test.sleep(200)

  const orderAfterUserUpdated = await Order.findOne({ _id: order._id })

  test.check(
    'mongoose auto sync Order.user',
    orderAfterUserUpdated.user.username === 'Minamoto' &&
      orderAfterUserUpdated.embedded.username === 'Minamoto' &&
      orderAfterUserUpdated.embedded2.username === 'Minamoto' &&
      orderAfterUserUpdated.array[0].username === 'Minamoto',
  )
}

main().catch(console.error)
