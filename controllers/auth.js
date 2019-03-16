var express = require('express');
var router = express.Router();
var passport = require("passport");
var crypto = require('crypto');
var flash = require('express-flash');
let Validator = require('validatorjs');
let bcrypt = require('bcryptjs');
let jwt = require('jsonwebtoken');
let db = require('../models/index.js');
let nodemailer = require('nodemailer');
let async = require('async');

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
* Handle when the registered user forgets the password and send the password reset link to the registered email
*/
router.post('/forgotPassword', function(req, res) {
    async.waterfall([ // ensure each function is executed one after another
        function(done) {
            // create the random token
            crypto.randomBytes(20, function(err, buffer) {
                let token = buffer.toString('hex');
                done(err, token);
            });
        },
        function(token, done) {
            db.user.findOne({ where: { email: req.body.email }}, function(user, err) {
                if (!user) {
                    req.flash('Error', 'User not found');
                    return res.redirect('/forgotPassword')
                }

                user.resetPasswordToken = token;

                user.save(function(err) {
                    done(err, token, user);
                });
            });
        },
        function(token, done) {
            // Maybe we should define the variable user at the beginning so it's easy to use
            let user = db.user.findOne({ where: { email: req.body.email }});

            let smtpTransport = nodemailer.createTransport({
                service: process.env.MAIL_SERVICE_NAME || 'Gmail',
                host: process.env.MAIL_HOST,
                port: process.env.MAIN_PORT,
                auth: {
                    user: process.env.MAIL_USER,
                    pass: process.env.MAIL_PASS
                }
            });
            let mailOption = {
                to: user.email,
                from: process.env.FROM_EMAIL,
                subject: 'Reset Your Password from Hotel Hopper',
                text: 'http://' + req.headers.host + '/resetPassword/' + token + '\n'
            };
            smtpTransport.sendMail(mailOption, function(err) {
                if (!err) {
                    req.flash('info', 'An e-mail has been sent to ' + user.email + ' with a link to change the password.');
                } else {
                    done(err, 'done!');
                }
            });
        }
    ], function (err) {
        if (err) return next(err);
        res.redirect('/forgotPassword');
    });
});

/*
* Reset the password
*/
router.post('/resetPassword/:token', function(req, res) {
    async.waterfall([
        function(done) {
            db.user.findOne({ where: { resetPasswordToken: req.params.token }}, function(err, user) {
                if (!user) {
                    req.flash('error', 'Password reset token is invalid or has expired.');
                    return res.redirect('back');
                }

                user.password = req.body.password;
                user.resetPasswordToken = null; // reset the token

                user.save(function(err) {
                    req.logIn(user, function(err) {
                        done(err, user);
                    }); 
                });
            });
        },
        function(done) {
            let user = db.user.findOne({ where: { email: req.body.email }});
            let smtpTransport = nodemailer.createTransport({
                service: process.env.MAIL_SERVICE_NAME,
                host: process.env.MAIL_HOST,
                port: process.env.MAIN_PORT,
                secure: true,
                auth: {
                    user: process.env.MAIL_USER,
                    pass: process.env.MAIL_PASS
                }
            });
            let mailOption = {
                to: user.email,
                from: process.env.FROM_EMAIL,
                subject: 'Congratulations! Your password has been reset.',
                text: 'This is a confirmation that the password for your account ' + user.email + ' has just been changed.\n'
            };
            smtpTransport.sendMail(mailOption, function(err) {
                req.flash('success', 'Your password has been reset.');
                done(err);
            });
        }
    ], function(err) {
        res.redirect('/');
    });
});

/*
* User logout
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