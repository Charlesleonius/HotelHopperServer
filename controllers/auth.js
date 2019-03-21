var express = require('express');
var router = express.Router();
var passport = require("passport");
var crypto = require('crypto');
let Validator = require('validatorjs');
let bcrypt = require('bcryptjs');
let jwt = require('jsonwebtoken');
let db = require('../models/index.js');
let nodemailer = require('nodemailer');

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
    db.user.findOne({ where: { email: req.body.email }}).then(user => {
        if (user) {
            return Promise.reject("Email already in use");
        } else {
            return bcrypt.hash(req.body.password, SALT_ROUNDS) //Do the password hashing
        }
    }).then(hash => {
        return db.user.create({ email: req.body.email, password: String(hash) }) //Create a new user
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
    db.user.findOne({where: { email: req.body.email }}).then(user => {
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
    if (req.body.email === '') {
        return res.status(400).json({ 
            error: true, 
            message: 'email required'
        });
    }
    db.user.findOne({ where: { email: req.body.email } }).then(user => {
        if (!user) {
            res.status(404).json({ 
                error: true, 
                message: 'User not found; invalid user email' 
            });
        } else {
            const token = crypto.randomBytes(20).toString('hex');
            user.update({ 
                reset_password_token: token,
                password_token_expires: Date.now() + 180000 // 30 mins expiration
            });
            const transporter = nodemailer.createTransport({
                service: 'Gmail', // Assume we will be using gmail here; subject to change
                auth: {
                    user: `${process.env.EMAIL_ADDRESS}`,
                    pass: `${process.env.EMAIL_PASSWORD}`
                }
            });
            const mailOption = {
                from: `demo@hotelhopper.com`, // placeholder email; subject to change
                to: `${user.email}`,
                subject: `Reset Your Password from Hotel Hopper!`,
                text: 
                    `You are receiving this email because you have requested to reset the password for your account.\n\n` +
                    `Please go to the following link to complete the password reset process within an hour:\n` +
                    `http://localhost:3000/resetPassword/${token}\n\n`
            };
            console.log('Sending the email...');
            transporter.sendMail(mailOption, function(err, response) {
                if (err) {
                    console.log('error: ', err);
                } else {
                    console.log('res: ', response);
                    res.status(200).json({
                        err: false,
                        message: 'email sent'
                    });
                }
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
    db.user.findOne({ 
        where: { 
            reset_password_token: req.params.token,
            password_token_expires: { $gt: Date.now() }
        }}).then(user => {
        if (!user) {
            console.log('Password reset link is invalid or has expired');
            return res.status(400).json({
                err: true,
                message: 'password reset link is invalid or has expired'
            });
        } else {
            console.log('password reset link is working');
            res.status(200).json({
                err: false,
                email: user.email,
                message: 'password reset link is working',
                token: user.reset_password_token
            });
        }
    })
});

/*
* Put: Reset the password
*/
router.put('/resetPassword', function(req, res, next) {
    db.user.findOne({ where: { email: req.body.email } }).then(user => {
        if (!user) {
            console.log('Invalid user email');
            res.status(404).json({
                err: true,
                message: 'user not existed in the database'
            })
        } else {
            console.log('Confirm: user is in the database');
            bcrypt.hash(req.body.password, SALT_ROUNDS).then(hashedPassword => {
                user.update({
                    password: hashedPassword,
                    reset_password_token: null,
                    password_token_expires: null
                });
            })
            .then(() => {
                console.log('Password is successfully updated!');
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
* User logout and redirect to the home page
*/
router.get('/logout', function(req, res) {
    req.logOut();
    res.redirect('/');
});

/*
* Route for testing auth functionality
*/
router.get("/secret", passport.authenticate('jwt', { session: false }), function (req, res) {
    res.json("Success! You can not see this without a token");
});

//Make routes available to app.js
module.exports = router;