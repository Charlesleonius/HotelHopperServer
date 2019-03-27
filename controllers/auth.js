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
        first_name: req.body.first_name,
        last_name: req.body.last_name,
        email: req.body.email,
        password: req.body.password
      }, {
        first_name: 'required|string',
        last_name: 'required|string',
        email: 'required|email',
        password: 'required|regex:/((?=.*[0-9])(?=.*[a-z])(?=.*[A-Z]).{8,20})/'
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
        return User.create({
            first_name: req.body.first_name,
            last_name: req.body.last_name,
            email: req.body.email, 
            password: String(hash) 
        }) //Create a new user
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
router.post('/login', async function (req, res) {
    let validator = new Validator({
        email: req.body.email,
        password: req.body.password
      }, {
        email: 'required|email',
        password: 'required'
    });
    if (validator.fails()) {
        return res.status(400).json({ error: true, message: validator.errors["errors"] });
    }
    let user = await User.findOne({where: { email: req.body.email }})
    if (!user) {
        return res.status(400).json({ error: true, message: "Invalid username or password" });
    }
    let same = await bcrypt.compare(req.body.password, user.password); //Check password hash against stored hash
    if (same) {
        var payload = { email: req.body.email };
        return res.json({
            error: false, 
            message: "OK", 
            data: { 
                token: jwt.sign(payload, global.jwtOptions.secretOrKey),
                user: user
            }
        });
    } else {
        return res.status(400).json({ error: true, message: "Invalid username or password" });
    }
});

/*
* Create a token and send the unique password-reset-link to the registered user
*/
router.post('/forgot_password', function(req, res, next) {
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
            await PasswordResetToken.create({ token: token, expires: moment().utc().add(1, 'days'), user_id: user.user_id });
            const transporter = nodemailer.createTransport({
                service: 'Gmail', // Assume we will be using gmail here; subject to change
                auth: {
                    user: `${process.env.EMAIL_ADDRESS}`,
                    pass: `${process.env.EMAIL_PASSWORD}`
                }
            });
            if (process.env.NODE_ENV != "test") { // Send email in staging or production environments
                let  resetURL = (`https://` + process.env.APP_URL + `/reset/${token}`)
                const mailOption = {
                    from: `hotelhopperhelp@gmail.com`,
                    to: `${user.email}`,
                    subject: `Reset Your Password from Hotel Hopper!`,
                    text: 
                        `You are receiving this email because you have requested to reset the password for your account.\n\n` +
                        `Please go to the following link to complete the password reset process within an hour:\n` + resetURL + 
                        `\n\nIf you believe you've received this email in error, please contact support and delete this email.`
                };
                transporter.sendMail(mailOption, function(err, response) {
                    if (err) { console.log('error: ', err); }
                });
                return res.status(200).json({ 
                    error: false, 
                    message: "We've sent a link to your email to reset your password. It expires in 24 hours."
                });
            } else { // For testing purposes just return the token rather than send an email
                return res.status(200).json({ 
                    error: false, 
                    token: token
                });
            }
        }
    });
});

/*
* Get: The unique reset-password-link
*/
router.get('/reset_password/:token', async function(req, res, next) {
    let passwordResetToken = await PasswordResetToken.findOne({
        where: {
            "token": req.params.token,
            "expires": { $gte: moment().format() }
        }
    })
    if (passwordResetToken) { // If the password reset token is valid just return it
        res.status(200).json({
            error: false,
            token: passwordResetToken.token
        });
    } else { // Otherwise return an error
        res.status(400).json({
            error: true,
            message: "Your password reset token has expired or isn't valid. Please request a new one."
        });
        let expired_token = await PasswordResetToken.findOne({ where: { "token": req.params.token }});
        if (expired_token) {
            let user = await expired_token.getUser();
            PasswordResetToken.destroy({ where: { 'user_id': user.user_id }}); //Asynchronously destroy old tokens
        }
    }
});

/*
* Put: Reset the password
*/
router.put('/reset_password', async function(req, res, next) {
    let validator = new Validator({
        password: req.body.password,
        confirm_password: req.body.confirm_password,
        token: req.body.token
      }, {
        password: 'required|regex:/((?=.*[0-9])(?=.*[a-z])(?=.*[A-Z]).{8,20})/',
        confirm_password: 'required',
        token: 'required'
    });
    if (validator.fails()) {
        return res.status(400).json({ error: true, message: validator.errors["errors"] });
    } else if (req.body.confirm_password != req.body.password) {
        return res.status(400).json({ error: true, message: "Password and password confirmation don't match. For your security please resubmit with matching passwords." });
    }
    let passwordResetToken = await PasswordResetToken.findOne({
        where: {
            "token": req.body.token,
            "expires": { $gte: moment().format() }
        }
    })
    if (passwordResetToken != null) {
        let user = await passwordResetToken.getUser();
        if (!user) {
            res.status(400).json({
                err: true,
                message: 'This user no longer exists or the email you sent was invalid.'
            })
        } else {    
            let hashedPassword = await bcrypt.hash(req.body.password, SALT_ROUNDS)
            let updated = await user.update({ password: hashedPassword });
            if (updated) {
                PasswordResetToken.destroy({ where: { 'token': req.body.token }});
                res.status(200).json({
                    error: false,
                    message: "Your password has been succesfully updated. Please log in to get a new token."
                })
            } else {
                res.status(500).json({ error: true, message: "We couldn't update your password. Please try again later." })
            }
        }
    } else {
        res.status(400).json({
            error: true,
            message: "Your password reset token has expired or isn't valid. Please request a new one."
        });
        let expired_token = await PasswordResetToken.findOne({ where: { "token": req.params.token }});
        if (expired_token) { //Asynchronously destroy old tokens
            let user = await expired_token.getUser();
            PasswordResetToken.destroy({ where: { 'user_id': user.user_id }});
        }
    }
});


router.get("/user_details", passport.authenticate('jwt', { session: false }), function (req, res) {
    res.status(200).json(req.user);
});


/*
* Route for testing auth functionality
*/
router.get("/secret", passport.authenticate('jwt', { session: false }), function (req, res) {
    res.json("Success! You can not see this without a token");
});

//Make routes available to app.js
module.exports = router;