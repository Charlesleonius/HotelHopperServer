const express = require('express');
const router = express.Router();
const Validator = require('validatorjs');
const { sendValidationErrors, requireAuth } = require('../middleware.js');
const { Reservation, ReservedRoom } = require('../models/index.js');
const moment = require('moment')


/**
 * @Protected
 * @Description - Creates a reservation based on the given hotel, rooms, and dates
 * @TODO - Add validation to ensure the proper amount of each room is available. 
 * Add stripe, rewards points, and a confirmation email.
 */
router.post('/', requireAuth, async (req, res) =>{
    let validator = new Validator({
        hotelID: req.body.hotelID,
        rooms: req.body.rooms,
        startDate: req.body.startDate,
        endDate: req.body.endDate,
      }, {
        hotelID: 'required|integer',
        rooms: 'required',
        'rooms.*.roomTypeID': 'required|integer',
        'rooms.*.count': 'required|integer',
        startDate: 'required|date|regex:/[0-9]{4}-[0-9]{2}-[0-9]{2}$/',
        endDate: 'required|date|regex:/[0-9]{4}-[0-9]{2}-[0-9]{2}$/'
    },{
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
        endDate: endDate
    }).then(reservation => {
        let promises = [];
        for (var i in req.body.rooms) {
            let room = req.body.rooms[i];
            for (j = 0; j < room.count; j++) {
                let promise = ReservedRoom.query().insert({
                    reservationID: reservation.reservationID,
                    hotelID: req.body.hotelID,
                    roomTypeID: room.roomTypeID,
                    startDate: startDate,
                    endDate: endDate
                })
                promises.push(promise);
            }
        }
        Promise.all(promises).then(() => {
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

module.exports = router;