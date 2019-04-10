const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const Validator = require('validatorjs');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const moment = require('moment');
const nodemailer = require('nodemailer');
const { sendValidationErrors, requireAuth } = require('../middleware.js');
const { User, PasswordResetToken } = require('../models/index.js');

//Recommended rounds for password hashing
const SALT_ROUNDS = 10;

/**
* @Description - Creates a new user and returns a JWT
*/
router.post('/register', function(req, res) {
    let validator = new Validator({
        firstName: req.body.firstName,
        lastName: req.body.lastName,
        email: req.body.email,
        password: req.body.password
      }, {
        firstName: 'required|string',
        lastName: 'required|string',
        email: 'required|email',
        password: 'required|regex:/((?=.*[0-9])(?=.*[a-z])(?=.*[A-Z]).{8,20})/'
    });
    if (validator.fails()) {
        return sendValidationErrors(res, validator);
    }
    User.findOne({ where: { email: req.body.email }}).then(user => {
        if (user) {
            return Promise.reject("Email already in use");
        } else {
            return bcrypt.hash(req.body.password, SALT_ROUNDS) //Do the password hashing
        }
    }).then(hash => {
        return User.create({
            firstName: req.body.firstName,
            lastName: req.body.lastName,
            email: req.body.email, 
            password: String(hash) 
        }) //Create a new user
    }).then(() => {
        var payload = { email: req.body.email };
        var token = jwt.sign(payload, global.jwtOptions.secretOrKey); //Create JWT token with email claim
        return res.json({
            error: false,
            message: "OK",
            data: { 
                token: token 
            }
        });
    }).catch(err => {
        
        return res.status(200).json({ 
            error: true, 
            message: err || "Something went wrong, please try again later" 
        });
    })
})


/**
* @Description - Takes username and password and create a JWT Token
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
        return sendValidationErrors(res, validator);
    }
    let user = await User.findOne({where: { email: req.body.email }})
    if (!user) {
        return res.status(400).json({ error: true, message: "Invalid username or password" });
    }
    let passwordMatch = await bcrypt.compare(req.body.password, user.password); //Check password hash against stored hash
    if (passwordMatch) {
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


/**
* @Description - Create a token and send the unique password-reset-link to the registered user
*/
router.post('/forgotPassword', function(req, res, next) {
    let validator = new Validator({
        email: req.body.email,
      }, {
        email: 'required|email'
    });
    if (validator.fails()) {
        return sendValidationErrors(res, validator);
    }
    User.findOne({ where: { email: req.body.email } }).then(async user => {
        if (!user) {
            res.status(400).json({ 
                error: true, 
                message: 'We couldn\'t find a user with that email. Please try again.'
            });
        } else {
            const token = crypto.randomBytes(20).toString('hex');
            PasswordResetToken.destroy({ where: { 'user_id': user.userID }}); //Asynchronously destroy old tokens
            await PasswordResetToken.create({ token: token, expires: moment().utc().add(1, 'days'), user_id: user.userID });
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
                    data: {
                        token: token
                    }
                });
            }
        }
    });
});


/**
* @Description - The unique reset-password-link
*/
router.get('/resetPassword/:token', async function(req, res, next) {
    let passwordResetToken = await PasswordResetToken.findOne({
        where: {
            "token": req.params.token,
            "expires": { $gte: moment().format() }
        }
    })
    if (passwordResetToken) { // If the password reset token is valid just return it
        res.status(200).json({
            error: false,
            data: {
                token: passwordResetToken.token
            }
        });
    } else { // Otherwise return an error
        res.status(400).json({
            error: true,
            message: "Your password reset token has expired or isn't valid. Please request a new one."
        });
        let expiredToken = await PasswordResetToken.findOne({ where: { "token": req.params.token }});
        if (expiredToken) {
            let user = await expiredToken.getUser();
            PasswordResetToken.destroy({ where: { 'user_id': user.userID }}); //Asynchronously destroy old tokens
        }
    }
});


/**
* @Description - Reset the password
*/
router.put('/resetPassword', async function(req, res, next) {
    let validator = new Validator({
        password: req.body.password,
        confirmPassword: req.body.confirmPassword,
        token: req.body.token
      }, {
        password: 'required|regex:/((?=.*[0-9])(?=.*[a-z])(?=.*[A-Z]).{8,20})/',
        confirmPassword: 'required',
        token: 'required'
    });
    if (validator.fails()) {
        return sendValidationErrors(res, validator);
    } else if (req.body.confirmPassword != req.body.password) {
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
        let expiredToken = await PasswordResetToken.findOne({ where: { "token": req.params.token }});
        if (expiredToken) { //Asynchronously destroy old tokens
            let user = await expiredToken.getUser();
            PasswordResetToken.destroy({ where: { 'user_id': user.userID }});
        }
    }
});


/**
* @Protected
* @Description - Gets the users full account details
*/
router.get("/userDetails", requireAuth, function (req, res) {
    res.status(200).json({
        error: false,
        data: req.user
    });
});


/**
* @Protected
* @Description - Route for testing auth functionality
*/
router.get("/secret", requireAuth, function (req, res) {
    res.json("Success! You can not see this without a token");
});

//Make routes available to app.js
module.exports = router;