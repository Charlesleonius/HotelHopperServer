require('dotenv').config();
const express = require('express');
const router = express.Router();
const Validator = require('validatorjs');
const {
    sendValidationErrors, requireAuth,
    sendErrorMessage, catchAll
} = require('../middleware.js');
const { Reservation, ReservedRoom } = require('../models/index.js');
const moment = require('moment')
var stripe = require("stripe")(process.env.STRIPE_SK);




module.exports = router;