var express = require('express');
var router = express.Router();
var passport = require("passport");
var crypto = require('crypto');
let Validator = require('validatorjs');
let bcrypt = require('bcryptjs');
let jwt = require('jsonwebtoken');
let moment = require('moment');
let nodemailer = require('nodemailer');
require('../models/index.js').PasswordResetToken;
require('../models/index.js').User;

//Recommended rounds for password hashing
const SALT_ROUNDS = 10;

/*
* Creates a new user and returns a JWT
*/
router.post('/register', function(req, res) {
    let validator = new Validator({
        email: req.body.email,
        password: req.body.password
      }, {
        email: 'required|email',
        password: 'required|min:8'
    });
    if (validator.fails()) {
        res.status(400).json({ error: true, message: validator.errors["errors"] });
    }
    User.findOne({ where: { email: req.body.email }}).then(user => {
        if (user) {
            return Promise.reject("Email already in use");
        } else {
            return bcrypt.hash(req.body.password, SALT_ROUNDS) //Do the password hashing
        }
    }).then(hash => {
        return User.create({ email: req.body.email, password: String(hash) }) //Create a new user
    }).then(() => {
        var payload = { email: req.body.email };
        var token = jwt.sign(payload, global.jwtOptions.secretOrKey); //Create JWT token with email claim
        return res.json({
            error: false, 
            message: "OK", 
            data: { token: token }
        });
    }).catch(err => {
        res.status(200).json({ 
            error: true, 
            message: err || "Something went wrong, please try again later" 
        });
    })
})

/*
* Takes username and password and create a JWT Token
*/
router.post('/login', function (req, res) {
    let validator = new Validator({
        email: req.body.email,
        password: req.body.password
      }, {
        email: 'required|email',
        password: 'required'
    });
    if (validator.fails()) {
        res.status(400).json({ error: true, message: validator.errors["errors"] });
    }
    User.findOne({where: { email: req.body.email }}).then(user => {
        if (!user) {
            return Promise.reject("Invalid username or password");
        } else {
            return bcrypt.compare(req.body.password, user.password); //Check password hash against stored hash
        }
    }).then(same => {
        if (same) {
            var payload = { email: req.body.email };
            return res.json({
                error: false, 
                message: "OK", 
                data: { token: jwt.sign(payload, global.jwtOptions.secretOrKey) }
            }); //Return a new JWT with email claim
        } else {
            return Promise.reject("Invalid username or password");
        }
    }).catch(err => {
        console.log(err);
        res.status(200).json({ error: true, message: err || "Invalid username or password" });
    })
});

/*
* Create a token and send the unique password-reset-link to the registered user
*/
router.post('/forgotPassword', function(req, res, next) {
    let validator = new Validator({
        email: req.body.email,
      }, {
        email: 'required|email'
    });
    if (validator.fails()) {
        res.status(400).json({ error: true, message: validator.errors["errors"] });
    }
    User.findOne({ where: { email: req.body.email } }).then(async user => {
        if (!user) {
            res.status(400).json({ 
                error: true, 
                message: 'We couldn\'t find a user with that email. Please try again.'
            });
        } else {
            const token = crypto.randomBytes(20).toString('hex');
            PasswordResetToken.destroy({ where: { 'user_id': user.id }}); //Asynchronously destroy old tokens
            await PasswordResetToken.create({ token: token, expires: moment().add(1, 'days'), user_id: user.user_id });
            const transporter = nodemailer.createTransport({
                service: 'Gmail', // Assume we will be using gmail here; subject to change
                auth: {
                    user: `${process.env.EMAIL_ADDRESS}`,
                    pass: `${process.env.EMAIL_PASSWORD}`
                }
            });
            const mailOption = {
                from: `support@hotelhopper.com`,
                to: `${user.email}`,
                subject: `Reset Your Password from Hotel Hopper!`,
                text: 
                    `You are receiving this email because you have requested to reset the password for your account.\n\n` +
                    `Please go to the following link to complete the password reset process within an hour:\n` +
                     process.env.APP_URL + `/resetPassword/${token}\n\n` + 
                    `If you believe you've received this email in error, please contact support and delete this email.`
            };
            transporter.sendMail(mailOption, function(err, response) {
                if (err) { console.log('error: ', err); }
            });
            return res.status(200).json({ 
                error: false, 
                email: user.email,
                resetPasswordToken: token 
            });
        }
    });
});

/*
* Get: The unique reset-password-link
*/
router.get('/resetPassword/:token', function(req, res, next) {
    PasswordResetToken.findOne({
        where: {
            "token": req.params.token, 
            "expires": { $gte: Date.now() }
        }
    }).then(passwordResetToken => {
        if (passwordResetToken) {
            return passwordResetToken.getUser()
        } else {
            PasswordResetToken.destroy({ where: { 'user_id': user.id }}); //Asynchronously destroy old tokens
            res.status(400).json({
                error: true,
                message: "Your password reset token has expired. Please request a new one."
            });
        }
    }).then(user => {
        res.status(200).json({
            error: false,
            token: user.reset_password_token
        });
    }).catch(err => {
        console.log(err);
        res.status(500).json({
            error: true,
            message: err,
        });
    });
});

/*
* Put: Reset the password
*/
router.put('/resetPassword', function(req, res, next) {
    User.findOne({ where: { email: req.body.email } }).then(user => {
        if (!user) {
            res.status(404).json({
                err: true,
                message: 'user not existed in the database'
            })
        } else {
            bcrypt.hash(req.body.password, SALT_ROUNDS).then(hashedPassword => {
                user.update({
                    password: hashedPassword,
                    reset_password_token: null,
                    password_token_expires: null
                });
            }).then(() => {
                res.status(200).json({
                    err: false,
                    id: user.user_id,
                    email: user.email,
                    password: user.password,
                    resetPasswordToken: user.reset_password_token,
                    password_token_expires: user.password_token_expires
                })
            });
        }
    });
});

/*
* Route for testing auth functionality
*/
router.get("/secret", passport.authenticate('jwt', { session: false }), function (req, res) {
    res.json("Success! You can not see this without a token");
});

//Make routes available to app.js
module.exports = router;