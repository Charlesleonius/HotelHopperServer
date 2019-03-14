var express = require('express');
var router = express.Router();
var passport = require("passport");
let Validator = require('validatorjs');
let bcrypt = require('bcryptjs');
let jwt = require('jsonwebtoken');
let db = require('../models/index.js');

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
            db.user.findOne({ where: { email: req.body.email }}).exec(function(err, user) {
                if (user) {
                    done(err, user)
                } else {
                    done("User not found")
                }
            });
        },

        function(user, done) {
            // create the random token
            crypto.randomBytes(20, function(err, buffer) {
                var token = buffer.toString('hex');
                done(err, user, token);
            });
        },

        function(user, token, done) {
            db.user.findByIdAndUpdate({ _id: user._id }, { reset_password_token: token, reset_password_expires: Date.now() + 86400000 }, { upsert: true, new: true }).exec(function(err, new_user) {
                done(err, token, new_user);
            });
        },

        function(token, user, done) {
            var data = {
              to: db.user.email,
              from: email,
              template: 'forgot-password-email',
              subject: 'Reset Your Passwork from Hotel Hopper',
              context: {
                url: 'http://localhost:3000/auth/reset_password?token=' + token,
                name: db.user.fullName.split(' ')[0]
              }
            };

            smtpTransport.sendMail(data, function(err) {
                if (!err) {
                  return res.json({ message: "Check your email for further instructions" });
                } else {
                  return done(err);
                }
            });
        }
    ], function(err) {
        return res.status(422).json({ message: err });
    })
});

/*
* Reset the password
*/
router.post('/resetPassword', function(req, res) {
    
});

/*
* Route for testing auth functionality
*/
router.get("/secret", passport.authenticate('jwt', { session: false }), function (req, res) {
    res.json("Success! You can not see this without a token");
});

//Make routes available to app.js
module.exports = router;