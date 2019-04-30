require('dotenv').config();
const express = require('express');
const router = express.Router();
const Validator = require('validatorjs');
const moment = require('moment');
const {
    sendValidationErrors, requireAuth,
    sendErrorMessage, catchAll
} = require('../middleware.js');
const { Hotel, Reservation, ReservedRoom, HotelRoomm, User } = require('../models/index.js');
var stripe = require("stripe")(process.env.STRIPE_SK);
const nodemailer = require('nodemailer');
const { raw, transaction } = require('objection');

/**
 * @Protected
 * @Description - Creates a reservation based on the given hotel, rooms, and dates
 * This method is wrapped in a transaction such that if any event fails all
 * database changes will be rolled back.
 */
router.post('/', requireAuth, async (req, res) => {
    let validator = new Validator({
        hotelId: req.body.hotelId,
        rooms: req.body.rooms,
        startDate: req.body.startDate,
        endDate: req.body.endDate,
        stripeToken: req.body.stripeToken,
        usePoints: req.body.usePoints
    }, {
            hotelId: 'required|integer',
            rooms: 'required',
            'rooms.*.roomTypeId': 'required|integer',
            'rooms.*.count': 'required|integer',
            startDate: 'required|date|regex:/[0-9]{4}-[0-9]{2}-[0-9]{2}$/',
            endDate: 'required|date|regex:/[0-9]{4}-[0-9]{2}-[0-9]{2}$/',
            usePoints: 'boolean',
            stripeToken: 'required_without:usePoints|string',
        }, {
            "regex.startDate": "Please use the date format yyyy-mm-dd",
            "regex.endDate": "Please use the date format yyyy-mm-dd"
        });
    if (validator.fails()) return sendValidationErrors(res, validator);
    let usePoints = req.body.usePoints || false;
    let startDate = moment(req.body.startDate).format("YYYY-MM-DD");
    let endDate = moment(req.body.endDate).format('YYYY-MM-DD');
    let todaysDate = moment().format("YYYY-MM-DD");
    if (startDate < todaysDate || endDate < startDate) {
        return res.status(400).json({
            error: true,
            message: "Invalid date range. Make sure your reservation isn't in the past!"
        });
    }
    let trx;
    try {
        trx = await transaction.start(Hotel.knex());
        // Check whether the user requests different hotel on same date
        var [err, conflict] = await catchAll(Reservation.query(trx)
            .whereRaw('(start_date >= ? AND start_date <= ?)', [startDate, endDate])
            .whereNot('status', '=', 'cancelled')
            .orWhereRaw('(end_date >= ? AND end_date <= ?)', [startDate, endDate])
            .whereNot('status', '=', 'cancelled')
            .first()
        );
        if (conflict) {
            await trx.rollback();
            return sendErrorMessage(res, 400,
                "Sorry you already have a reservation at another hotel at this time. "
                + "Please select dates that don't conflict."
            );
        }
        let reservation = await Reservation.query(trx).insert({
            hotelId: req.body.hotelId,
            userId: req.user.userId,
            startDate: startDate,
            endDate: endDate,
            status: "pending",
            usePoints: usePoints
        });
        // Determine whether the rooms requested are available
        let totalCost = 0;
        let availableRooms = await Hotel.getAvailableRooms(req.body.hotelId,
            req.body.startDate, req.body.endDate);
        for (var requestedRoom of req.body.rooms) {
            for (var availableRoom of availableRooms.rows) {
                if (availableRoom.roomTypeId == requestedRoom.roomTypeId
                    && availableRoom.available < requestedRoom.count) {
                    await trx.rollback();
                    return sendErrorMessage(res, 400,
                        "Sorry you've requested more rooms than this hotel currently has available."
                    );
                } else if (availableRoom.roomTypeId == requestedRoom.roomTypeId) {
                    totalCost += availableRoom.price * requestedRoom.count;
                }
            }
        }
        // Create all the reserved rooms so they can be batch inserted
        let roomsForInseriton = [];
        for (var requestedRoom of req.body.rooms) {
            for (var i = 0; i < requestedRoom.count; i++) {
                roomsForInseriton.push({
                    reservationId: reservation.reservation_id,
                    hotelId: req.body.hotelId,
                    roomTypeId: requestedRoom.roomTypeId,
                    startDate: startDate,
                    endDate: endDate
                });
            }
        }
        await ReservedRoom.query(trx).insert(roomsForInseriton);
        if (usePoints) {
            if (req.user.rewardPoints < (totalCost * 2)) return sendErrorMessage(res, 400,
                "You don't have enough reward points yet. Keep booking with us to earn your free stay!"
            )
            await User.query(trx).where({
                userId: req.user.userId
            }).patch({ rewardPoints: req.user.rewardPoints - (totalCost * 2) });
        } else {
            var [err, charge] = await catchAll(stripe.charges.create({
                amount: totalCost * 100,
                currency: 'usd',
                description: 'Reservation id: ' + reservation.reservation_id,
                source: req.body.stripeToken,
                customer: req.user.stripeCustomerId
            }));
            if (err && err.type == 'StripeInvalidRequestError') {
                await trx.rollback();
                return sendErrorMessage(res, 400, err.message);
            } else if (err) {
                await trx.rollback();
                console.log(err);
                return sendErrorMessage(res, 500, "Could not complete charge. "
                    + "Please try again later.");
            }
            var [err, updated] = await catchAll(Reservation.query(trx).where({
                hotelId: req.body.hotelId,
                userId: req.user.userId
            }).patch({ 
                totalCost: totalCost, 
                stripe_token_id: req.body.stripeToken,
                stripe_charge_id: charge.id
            }));
            if (!updated) {
                await trx.rollback();
                console.log(err);
                return sendErrorMessage(res, 500, "Something went wrong. Please try again later.")
            }
        }
        let mailOptions = {
            from: "hotelhopperhelp@gmail.com",
            to: req.user.email,
            subject: "Congrats on your reservation!",
            text:
                "Thank you for using our webisite. You have successfully made your reservation. Enjoy!"
        };
        let emailTransporter = nodemailer.createTransport({
            service: 'Gmail',
            auth: {
                user: process.env.EMAIL_ADDRESS,
                pass: process.env.EMAIL_PASSWORD
            }
        });
        await trx.commit();
        emailTransporter.sendMail(mailOptions, function (err, response) {});
        return res.status(200).json({
            error: false,
            message: "Your reservation has been successfully created!",
            data: {
                reservationId: reservation.reservation_id
            }
        });
    } catch (err) {
        console.log(err);
        await trx.rollback();
        console.log(err)
        sendErrorMessage(res, 500, "Something went wrong, please try again later.")
    }
});

/**
 * @Protected
 * @Description - Updates the status of a given reservation
 * @TODO - Charge saved token from reservation
 */
router.post('/:id/cancel', requireAuth, async (req, res) => {
    let validator = new Validator({
        id: req.params.id
    }, {
        id: 'required|numeric|min:1'
    });
    if (validator.fails()) return sendValidationErrors(res, validator);

    let id = req.params.id;
    let reservation = await Reservation.query()
        .select()
        .from('reservation')
        .where({ reservation_id: id }).first();

    if (!reservation) {
        return res.status(404).json({
            error: true,
            message: `Reservation ID ${id} does not exist`
        });
    } else if (reservation.usePoints) {
        return res.status(401).json({
            error: true,
            message: `You're not allowed cancel a reservation made with points`
        });
    } 

    var trx;
    try {
        trx = await transaction.start(Reservation.knex());
        await Reservation.query(trx).where({ reservation_id: id }).update({ status: 'cancelled' });
        // refund
        var [err, refund] = await catchAll(stripe.refunds.create({
            charge: reservation.stripeChargeId,
        }));
        if (err && err.statusCode == 400) {
            trx.rollback();
            return sendErrorMessage(res, 400, err.message);
        } else if (err) {
            console.log(err);
            trx.rollback();
            return sendErrorMessage(res, 500, "Could not complete refund. "
                + "Please try again later.");
        }
        // cancellation fee
        var [err, charge] = await catchAll(stripe.charges.create({
            amount: 4500,
            currency: 'usd',
            description: 'Cancelled reservation id: ' + reservation.reservationId,
            source: reservation.stripeTokenId,
            customer: req.user.stripeCustomerId
        }));
        if (err && err.statusCode == 400) {
            trx.rollback();
            return sendErrorMessage(res, 400, err.message);
        } else if (err) {
            console.log(err);
            trx.rollback();
            return sendErrorMessage(res, 500, "Could not complete refund. "
                + "Please try again later.");
        }
        let mailOptions = {
            from: "hotelhopperhelp@gmail.com",
            to: req.user.email,
            subject: "Your reservation has been canceled",
            text: "Your reservation has been successfully canceled! We are sorry that we have to charge you $45."
        };
        let emailTransporter = nodemailer.createTransport({
            service: 'Gmail',
            auth: {
                user: process.env.EMAIL_ADDRESS,
                pass: process.env.EMAIL_PASSWORD
            }
        });
        emailTransporter.sendMail(mailOptions, function (err, response) {
            if (err) console.log("error: ", err);
        });
        await trx.commit()
        return res.status(200).json({
            error: false,
            message: "Your reservation has been successfully canceled! We are sorry that we have to charge you $45"
        }); 
    } catch(err) {
        console.log(err)
        return sendErrorMessage(res, 500, "Something went wrong! Please try again later.") 
    }

});

/**
 * @Protected
 * @Description - Get all of the users reservations
 */
router.get('/', requireAuth, async (req, res) => {
    let reservations = await Reservation.query().where('user_id', '=', req.user.userId)
        .eager('[reservedRooms.roomType, hotel]')
        .modifyEager('reservedRooms', builder => {
            builder.select(raw('room_type_id, CAST(count(*) as INTEGER) as count'));
            builder.groupBy(['roomTypeId', 'reservationId']);
        });
    return res.status(200).json({
        error: false,
        data: reservations
    });
});

/**
 * @Protected
 * @Description - Get all of the users reservations
 */
router.get('/:reservationId', requireAuth, async (req, res) => {
    let reservation = await Reservation.query()
        .where('reservation_id', '=', req.params.reservationId)
        .where('user_id', '=', req.user.userId)
        .eager('[reservedRooms.roomType, hotel]')
        .modifyEager('reservedRooms', builder => {
            builder.select(raw('room_type_id, CAST(count(*) as INTEGER) as count'));
            builder.groupBy(['roomTypeId', 'reservationId']);
        }).first();
    if (!reservation) return sendErrorMessage(res, 404,
        "No reservation found with id: " + req.params.reservationId
    );
    return res.status(200).json({
        error: false,
        data: reservation
    });
});

module.exports = router;
