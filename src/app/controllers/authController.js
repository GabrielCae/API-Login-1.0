const express = require('express')
const User = require("../models/user")
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const crypto = require('crypto')
const mailer = require('../../modules/mailer')

const router = express.Router()
const { secret } = require('../config/auth.json')

function generateToken (params = {}) {
    return jwt.sign(params, secret, {
        expiresIn: 86400
    })
}

router.post('/register', async (req, res) => {
    const { email } = req.body
    
    try {
        if (await User.findOne({ email }))
            return res.status(400).send({ error: 'User already exists' })

        const user = await User.create(req.body)
        
        user.password = undefined

        return res.send({ 
            user,
            token: generateToken({ id: user.id }) 
        })
    } catch (e) {
        return res.status(400).send({ error: 'Registration failed' })
    }
})

router.post('/authenticate', async (req, res) => {
    const { email, password } = req.body

    const user = await User.findOne({ email }).select('+password')

    if (!user) 
        return res.status(400).send({ error: 'User not found!' })

    if (!await bcrypt.compare(password, user.password))
        return res.status(400).send({ error: 'Invalid password' })
    
    user.password = undefined

    res.send({ 
        user, 
        token: generateToken({ id: user.id }) 
    })
})

router.post('/forgot_password', async (req, res) => {
    const { email } = req.body

    try {
        const user = await User.findOne({ email })

        if (!user) 
            return res.status(400).send({ error: 'User not found' })

        const token = crypto.randomBytes(20).toString('hex')

        const now = new Date()
        now.setHours(now.getHours() + 1)

        await User.findByIdAndUpdate(user.id, {
            '$set': {
                passwordResetToken: token,
                passwordResetExpires: now,
            }
        })

        mailer.sendMail({
            to: email,
            from: 'bielcaetan@gmail.com',
            template: 'mail/forgot_password',
            context: { token },
        }, (err) => {
            if (err) {
                console.log(err)
                return res.status(400).send({ error: 'Cannot send forgot password email!' })
            }
            // console.log('OK')
            return res.status(200).send({ response: 'All ok!' })
        })
    } catch (err) {
        res.send(err)
        res.status(400).send({ error: 'Error on forgot password, try again!' })
    }


})

router.post('/reset_password', async (req, res) => {
    const { email, token, new_password, old_password } = req.body

    try {
        const user = await User.findOne({ email })
            .select('+passwordResetToken passwordResetExpires password')

        if (!user)
            return res.status(400).send({ error: "User not found!" })
        
        if (token !== user.passwordResetToken)
            return res.status(400).send({ error: 'Invalid token!' })
        
        const now = new Date()
        if (now > user.passwordResetExpires)
            return res.status(400).send({ error: 'Token expired, generate a new one' })
        
        // if (!await bcrypt.compare(old_password, user.password))
        //     return res.status(400).send({ error: 'Old password is incorrect!' })

        user.password = new_password

        await user.save()
        res.send()

    } catch (e) {
        console.log(e)
        res.status(400).send({ error: 'Cannot reset password, try again!' })
    }
})

module.exports = app => app.use('/auth', router)