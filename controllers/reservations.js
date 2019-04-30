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
 * @TODO - Ensure user does not have a confilicting reservation
 */
router.post('/', requireAuth, async (req, res) => {
    let validator = new Validator({
        hotelId: req.body.hotelId,
        rooms: req.body.rooms,
        startDate: req.body.startDate,
        endDate: req.body.endDate,
        stripeToken: req.body.stripeToken
    }, {
            hotelId: 'required|integer',
            rooms: 'required',
            'rooms.*.roomTypeId': 'required|integer',
            'rooms.*.count': 'required|integer',
            startDate: 'required|date|regex:/[0-9]{4}-[0-9]{2}-[0-9]{2}$/',
            endDate: 'required|date|regex:/[0-9]{4}-[0-9]{2}-[0-9]{2}$/',
            stripeToken: 'required|string'
        }, {
            "regex.startDate": "Please use the date format yyyy-mm-dd",
            "regex.endDate": "Please use the date format yyyy-mm-dd"
        });
    if (validator.fails()) return sendValidationErrors(res, validator);
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
        let reservation = await Reservation.query(trx).insert({
            hotelId: req.body.hotelId,
            userId: req.user.userId,
            startDate: startDate,
            endDate: endDate,
            status: "pending",
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
        var [err, updated] = await catchAll(Reservation.query(trx).where({
            hotelId: req.body.hotelId,
            userId: req.user.userId
        }).patch({ totalCost: totalCost }));
        if (!updated) {
            await trx.rollback();
            console.log(err);
            return sendErrorMessage(res, 500, "Something went wrong. Please try again later.")
        }
        var [err, charge] = await catchAll(stripe.charges.create({
            amount: 999,
            currency: 'usd',
            description: 'Reservation id: ' + reservation,
            source: req.body.stripeToken
        }));
        if (err && err.statusCode == 400) {
            await trx.rollback();
            return sendErrorMessage(res, 400, err.message);
        } else if (err) {
            await trx.rollback();
            console.log(err);
            return sendErrorMessage(res, 500, "Could not complete charge. "
                + "Please try again later.");
        }
        const mailOptions = {
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
        emailTransporter.sendMail(mailOptions, function (err, response) { });
        return res.status(200).json({
            error: false,
            message: "Your reservation has been successfully created!",
            data: {
                reservationId: reservation.reservation_id
            }
        });
    } catch (err) {
        await trx.rollback();
        console.log(err)
        sendErrorMessage(res, 500, "Something went wrong, please try again later.")
    }
});

/**
 * @Protected
 * @Description - Creates a reservation based on the given hotel, rooms, and dates
 * @TODO - Add validation to ensure the proper amount of each room is available. 
 * Add stripe, rewards points, and a confirmation email.
 */
router.post('/', requireAuth, async (req, res) => {
    let validator = new Validator({
        hotelID: req.body.hotelID,
        rooms: req.body.rooms,
        startDate: req.body.startDate,
        endDate: req.body.endDate,
        stripeToken: req.body.stripeToken
    }, {
            hotelID: 'required|integer',
            rooms: 'required',
            'rooms.*.roomTypeID': 'required|integer',
            'rooms.*.count': 'required|integer',
            startDate: 'required|date|regex:/[0-9]{4}-[0-9]{2}-[0-9]{2}$/',
            endDate: 'required|date|regex:/[0-9]{4}-[0-9]{2}-[0-9]{2}$/',
            stripeToken: 'required|string'
        }, {
            "regex.startDate": "Please use the date format yyyy-mm-dd",
            "regex.endDate": "Please use the date format yyyy-mm-dd"
        });
    if (validator.fails()) return sendValidationErrors(res, validator);
    let startDate = moment(req.body.startDate).format("YYYY-MM-DD");
    let endDate = moment(req.body.endDate).format('YYYY-MM-DD');
    let todaysDate = moment().format("YYYY-MM-DD");
    if (startDate < todaysDate || endDate < startDate) {
        return res.status(400).json({
            error: true,
            message: "Invalid date range. Make sure your reservation isn't in the past!"
        });
    }
    Reservation.query().insert({
        hotelID: req.body.hotelID,
        userID: req.user.userId,
        startDate: startDate,
        endDate: endDate,
        status: 'pending'
    }).then(reservation => {
        let promises = [];
        for (var i in req.body.rooms) {
            let room = req.body.rooms[i];
            for (j = 0; j < room.count; j++) {
                let promise = ReservedRoom.query().insert({
                    reservationId: reservation.reservationId,
                    hotelId: req.body.hotelID,
                    roomTypeId: room.roomTypeID,
                    startDate: startDate,
                    endDate: endDate
                })
                promises.push(promise);
            }
        }
        Promise.all(promises).then(async () => {
            var [err, charge] = await catchAll(stripe.charges.create({
                amount: 999,
                currency: 'usd',
                description: 'Reservation id: ' + reservation,
                source: req.body.stripeToken,
                customer: req.user.stripeCustomerId
            }));
            if (err && err.statusCode == 400) {
                return sendErrorMessage(res, 400, err.message);
            } else if (err) {
                console.log(err);
                return sendErrorMessage(res, 500, "Could not complete charge. "
                    + "Please try again later.");
            }
            return res.status(200).json({
                error: false,
                message: "Your reservation has been successfully created!"
            })
        })
    }).catch(err => {
        console.log(err);
        return res.status(500).json({
            error: true,
            message: err.message
        });
    })
});

/**
 * @Protected
 * @Description - Updates the status of a given reservation
 * @TODO - Charge saved token from reservation
 */
router.patch('/:id/:status', requireAuth, async (req, res) => {
    let validator = new Validator({
        id: req.params.id,
        status: req.params.status,
        stripeToken: req.body.stripeToken
    }, {
            id: 'required|numeric|min:1',
            status: 'required|string',
            stripeToken: 'required|string'
        });
    if (validator.fails()) return sendValidationErrors(res, validator);
    const id = req.params.id;
    const status = req.params.status;

    if (!(status == 'pending' || status == 'completed' || status == 'cancelled')) {
        return res.status(404).json({
            error: true,
            message: 'Status can only be pending, completed, or cancelled'
        });
    }

    let reservation = await Reservation.query()
        .select()
        .from('reservation')
        .where({ reservation_id: id }).first();

    if (!reservation) {
        return res.status(404).json({
            error: true,
            message: `Reservation ID ${id} does not exist`
        });
    } else if (reservation.status == 'cancelled') {
        return res.status(401).json({
            error: true,
            message: `You're not allowed to change a cancelled reservation`
        });
    }

    await Reservation.query().where({ reservation_id: id }).update({ status: status });

    if (status == 'cancelled') {

        // refund
        var [err, refund] = await catchAll(stripe.refunds.create({
            charge: reservation.charge,
        }));
        if (err && err.statusCode == 400) {
            return sendErrorMessage(res, 400, err.message);
        } else if (err) {
            console.log(err);
            return sendErrorMessage(res, 500, "Could not complete refund. "
                + "Please try again later.");
        }

        // cancellation fee
        var [err, charge] = await catchAll(stripe.charges.create({
            amount: 4500,
            currency: 'usd',
            description: 'Cancelled reservation id: ' + reservation.reservationId,

            source: req.body.stripeToken,
            //customer: req.user.stripeCustomerId
        }));
        if (err && err.statusCode == 400) {
            return sendErrorMessage(res, 400, err.message);
        } else if (err) {
            console.log(err);
            return sendErrorMessage(res, 500, "Could not complete refund. "
                + "Please try again later.");
        }

        const mailOptions = {
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
        return res.status(200).json({
            error: false,
            message: "Your reservation has been successfully canceled! We are sorry that we have to charge you $45"
        });

    } else {
        return res.status(200).json({
            error: false,
            message: `Your reservation has been updated to ${status}.`
        });
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
