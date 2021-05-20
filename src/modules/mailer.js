const nodemailer = require('nodemailer')
const hbs = require('nodemailer-express-handlebars')
const path = require('path')

const { host, port, user, pass } = require('../app/config/mail.json')

var transport = nodemailer.createTransport({
    host: host,
    port: port,
    auth: {
        user: user,
        pass: pass
    }
});

transport.use('compile', hbs({
    viewEngine: 'handlebars',
    viewPath: path.resolve('./src/resources/'),
    // layoutsDir: path.resolve('./src/resources/mail/auth/'),
    defaultLayout: 'forgot_password',
    extName: '.html'
}))

module.exports = transport