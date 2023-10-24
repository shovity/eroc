const User = require('../models/User')
const Order = require('../models/Order')

const main = async () => {
    test.start('create user')
    const user = await User.create({ username: 'Mina' })
    test.check('create user')

    test.start('create order')
    const order = await Order.create({ user, item: 'Black T-Shirt' })
    test.check('create order')

    await test.sleep(3000)

    test.start('auto sync Order.user')
    user.username = 'Minamoto'
    await user.save()

    await test.sleep(200)

    const orderAfterUserUpdated = await Order.findOne({ _id: order._id })
    test.check('auto sync Order.user', orderAfterUserUpdated.user.username === 'Minamoto')
}

main().catch(console.error)
