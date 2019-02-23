var express = require('express');
var router = express.Router();
var passport = require("passport");
let Validator = require('validatorjs');
let bcrypt = require('bcryptjs')
let User = require('../models/auth/user.js').User
let jwt = require('jsonwebtoken')

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
    User.findOne({ email: req.body.email }).then(user => {
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
    User.findOne({ email: req.body.email }).then(user => {
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
* Route for testing auth functionality
*/
router.get("/secret", passport.authenticate('jwt', { session: false }), function (req, res) {
    res.json("Success! You can not see this without a token");
});

//Make routes available to app.js
module.exports = router;