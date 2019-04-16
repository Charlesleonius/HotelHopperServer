const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const Validator = require('validatorjs');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const moment = require('moment');
const { sendValidationErrors, requireAuth, sendErrorMessage } = require('../middleware.js');
const { User, PasswordResetToken } = require('../models/index.js');
const nodemailer = require('nodemailer');
var stripe = require("stripe")(process.env.STRIPE_SK);

//Recommended rounds for password hashing
const SALT_ROUNDS = 10;

/**
* @Description - Creates a new user and returns a JWT
*/
router.post('/register', async function(req, res) {
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
    if (validator.fails()) return sendValidationErrors(res, validator);
    let existingUser = await User.query().where('email', '=', req.body.email).first();
    if (existingUser) return sendErrorMessage(res, 400, "User already exists with that email.");
    let hash = await bcrypt.hash(req.body.password, SALT_ROUNDS);
    await User.query().insert({
        firstName: req.body.firstName,
        lastName: req.body.lastName,
        email: req.body.email, 
        password: String(hash) 
    }); //Create a new user
    let stripeCustomer = await stripe.customers.create({
        email: req.body.email,
    });
    await User.query().where('email', '=', req.body.email).patch({
        stripeCustomerId: stripeCustomer.id
    });
    var payload = { email: req.body.email };
    var token = jwt.sign(payload, global.jwtOptions.secretOrKey); //Create JWT token with email claim
    return res.json({
        error: false,
        message: "OK",
        data: { 
            token: token 
        }
    });
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
    if (validator.fails()) return sendValidationErrors(res, validator);
    let user = await User.query().where('email', '=', req.body.email).first();
    if (!user) return sendErrorMessage(res, 400, "No user exists with that email. Try signing up!");
    let passwordMatch = await bcrypt.compare(req.body.password, user.password); //Check password hash against stored hash
    if (!passwordMatch) return sendErrorMessage(res, 400, "Invalid username or password");
    var payload = { email: req.body.email };
    delete user.password;
    return res.json({
        error: false, 
        message: "OK", 
        data: { 
            token: jwt.sign(payload, global.jwtOptions.secretOrKey),
            user: user
        }
    });
});


/**
* @Description - Create a token and send the unique password-reset-link to the registered user
*/
router.post('/forgotPassword', async function(req, res, next) {
    let validator = new Validator({
        email: req.body.email,
      }, {
        email: 'required|email'
    });
    if (validator.fails()) return sendValidationErrors(res, validator);
    let user = await User.query().where('email', '=', req.body.email).first();
    if (!user) return sendErrorMessage(res, 400, "We couldn't find a user with that email. Please try again.")
    let token = crypto.randomBytes(20).toString('hex');
    PasswordResetToken.query().delete().where('user_id', '=', user.userId); //Asynchronously destroy old tokens
    await PasswordResetToken.query().insert({ token: token, expires: moment().add(1, 'days'), userId: user.userId });
    if (process.env.NODE_ENV != "test") { // Send email in staging or production environments
        let  resetURL = (`https://` + process.env.APP_URL + `/reset/${token}`)
        const mailOptions = {
            from: `hotelhopperhelp@gmail.com`,
            to: `${user.email}`,
            subject: `Reset Your Password from Hotel Hopper!`,
            text: 
                `You are receiving this email because you have requested to reset the password for your account.\n\n` +
                `Please go to the following link to complete the password reset process within an hour:\n` + resetURL + 
                `\n\nIf you believe you've received this email in error, please contact support and delete this email.`
        };
        let emailTransporter = nodemailer.createTransport({
            service: 'Gmail',
            auth: {
                user: `${process.env.EMAIL_ADDRESS}`,
                pass: `${process.env.EMAIL_PASSWORD}`
            }
        });
        emailTransporter.sendMail(mailOptions, function(err, response) {
            if (err) console.log('error: ', err);
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
});


/**
* @Description - The unique reset-password-link
*/
router.get('/resetPassword/:token', async function(req, res, next) {
    console.log(moment().format('YYYY-MM-DD HH:mm:ss'));
    let passwordResetToken = await PasswordResetToken.query()
                            .where('token', '=', req.params.token)
                            .where('expires', '>', moment().format('YYYY/MM/DD HH:mm:ss'))
                            .first();
    if (!passwordResetToken) return sendErrorMessage(res, 400, 
        "Your token is expired or invalid. "
        + "Please request a new one"
    );
    // If the password reset token is valid just return it
    res.status(200).json({
        error: false,
        data: {
            token: passwordResetToken.token
        }
    });
});


/**
* @Description - Reset the password
*/
router.patch('/resetPassword', async function(req, res, next) {
    let validator = new Validator({
        password: req.body.password,
        confirmPassword: req.body.confirmPassword,
        token: req.body.token
      }, {
        password: 'required|regex:/((?=.*[0-9])(?=.*[a-z])(?=.*[A-Z]).{8,20})/',
        confirmPassword: 'required',
        token: 'required'
    });
    if (validator.fails()) return sendValidationErrors(res, validator);
    if (req.body.confirmPassword != req.body.password) return sendErrorMessage(res, 400, 
        "Password and password confirmation don't match. \
        For your security please resubmit with matching passwords."
    );
    let passwordResetToken = await PasswordResetToken.query()
                                    .where('token', '=', req.body.token)
                                    .where('expires', '>', moment().format())
                                    .eager('user')
                                    .first();
    if (!passwordResetToken || !passwordResetToken.user) {
        res.status(400).json({
            error: true,
            message: "Your password reset token has expired or isn't valid. Please request a new one."
        });
        return await PasswordResetToken.query().delete().where("token", '=', req.body.token);
    }
    let hashedPassword = await bcrypt.hash(req.body.password, SALT_ROUNDS)
    let updated = await User.query().patch({ password: hashedPassword })
                                    .where('userId', '=', passwordResetToken.user.userId);
    if (!updated) {
        return sendErrorMessage(res, 500, "We couldn't update your password. Please try again later.");
    } else {
        res.status(200).json({
            error: false,
            message: "Your password has been succesfully updated. Please log in to get a new token."
        })
        await PasswordResetToken.query().delete().where("token", '=', req.body.token);
    }
});


/**
* @Protected
* @Description - Gets the users full account details
*/
router.get("/userDetails", requireAuth, function (req, res) {
    delete req.user.password;
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