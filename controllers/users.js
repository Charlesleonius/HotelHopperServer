const express = require('express');
const router = express.Router();
const { 
    requireAdmin, requireAuth, 
    catchAll, sendValidationErrors,
    sendErrorMessage
} = require('../middleware.js');
const knex = require('../knex.js');
const { raw } = require('objection');
const Validator = require('validatorjs');

var stripe = require("stripe")("sk_test_lyj0xstSef5PGon2fg0QpwiU00UDirsAvk");

router.post('/paymentMethods', requireAuth, async (req, res) => {
    let validator = new Validator({ token: req.body.token, }, {
        token: 'required|string',
    });
    if (validator.fails()) return sendValidationErrors(res, validator);
    console.log("req:" + req.user.stripeCustomerId)
    let [err, source] = await catchAll(stripe.customers.createSource(req.user.stripeCustomerId, { 
        source: req.body.token, 
    }));
    if (err && err.statusCode == 400) {
        return sendErrorMessage(res, 400, err.message);
    } else if (err) {
        console.log(err);
        return sendErrorMessage(res, 500, "Could not add card. Please try again later.");
    }
    res.status(200).json({
        error: false,
        message: 'Card added successfully'
    });
});

router.get('/paymentMethods', requireAuth, async (req, res) => {
    let [err, sources] = await catchAll(stripe.customers.listCards(req.user.stripeCustomerId));
    if (err) return sendErrorMessage(res, 500, err.message);
    res.status(200).json({
        error: false,
        data: sources.data
    });
});

router.delete('/paymentMethods', requireAuth, async (req, res) => {
    let validator = new Validator({ paymentMethodId: req.body.paymentMethodId, }, {
        paymentMethodId: 'required|string',
    });
    if (validator.fails()) return sendValidationErrors(res, validator);
    let [err, result] = await catchAll(stripe.customers.deleteSource(
        req.user.stripeCustomerId,
        req.body.paymentMethodId
    ));
    if (err) return sendErrorMessage(res, 500, err.message);
    res.status(200).json({
        error: false,
        message: "Card successfully removed"
    });
});

module.exports = router;