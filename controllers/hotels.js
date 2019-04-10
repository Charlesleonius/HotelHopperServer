const express = require('express');
const router = express.Router();
const { Hotel, HotelRoom, sequelize } = require('../models/index.js');
const { requireAdmin, requireAuth, sendValidationErrors } = require('../middleware.js');
const Sequelize = require("sequelize");
let Validator = require('validatorjs');

/**
 * @Protected
 * @Admin
 * @Description - Takes scraped hotel objects and converts them hotelhopper hotel objects
 */
router.put('/scrapedHotel', [requireAuth, requireAdmin], (req, res) => {
    let geoLocation = {
        type: 'Point',
        coordinates: [req.body.longitude, req.body.latitude],
        crs: { type: 'name', properties: { name: 'EPSG:4326'} }
    }
    Hotel.create({
        title: req.body.name,
        state: req.body.address.addressRegion,
        country: req.body.address.addressCountry,
        street: req.body.address.addressLocality,
        city: req.body.city,
        zip: req.body.address.postalCode,
        imageURL: req.body.image,
        rating: req.body.aggregateRating.ratingValue,
        rating_count: req.body.aggregateRating.reviewCount,
        mapURL: req.body.hasMap,
        description: req.body.description,
        latitude: req.body.latitude,
        longitude: req.body.longitude,
        position: geoLocation,
        address: req.body.address.streetAddress,
        stars: req.body.stars
    }).then(result => {
        req.body.rooms.forEach(room => {
            HotelRoom.create({
                hotelID: result.hotelID,
                roomTypeID: room.room_type_id,
                price: room.price,
                roomCount: room.count
            })
        });
        res.status(200).send("OK");
    }).catch(err => {
        res.status(400);
    });
});


/**
 * @Protected
 * @Description - Returns hotels that meet the users travel plans
 */
router.get('/', requireAuth, async (req, res) =>{
    let validator = new Validator({
        longitude: req.query.longitude,
        latitude: req.query.latitude,
        startDate: req.query.startDate,
        endDate: req.query.endDate,
        persons: req.query.persons,
        perPage: req.query.perPage,
        page: req.query.page
      }, {
        longitude: 'required|numeric',
        latitude: 'required|numeric',
        startDate: 'required|date|regex:/[0-9]{4}-[0-9]{2}-[0-9]{2}$/',
        endDate: 'required|date|regex:/[0-9]{4}-[0-9]{2}-[0-9]{2}$/',
        persons: 'required|numeric|min:1',
        perPage: 'numeric|min:1',
        page: 'numeric|min:1'
    },{
        "regex.startDate": "Please use the date format yyyy-mm-dd"
    });
    if (validator.fails()) {
        return sendValidationErrors(res, validator);
    }
    let perPage = req.query.perPage || 15;
    let page = req.query.page || 1;
    let startDate = req.query.startDate;
    let endDate = req.query.endDate;
    // Make a geometric point from the given lat and long
    let searchPoint = Sequelize.fn('ST_MakePoint', 
                        req.query.longitude, 
                        req.query.latitude
                    );
    // Find all hotels within a 5 mile radius of the given point
    let hotels = await Hotel.findAll({
        offset: (page - 1) * perPage, // Converts page to zero indexing and then gets the total offset
        limit: perPage, // Only return the requested amount of objects
        where: Sequelize.where(
            Sequelize.fn('ST_DWithin',
                Sequelize.col('position'),
                Sequelize.fn('ST_SetSRID', searchPoint, 4326),
                0.1 // Distance in degress lat, long. Conversion: 1.0 | 111 km
            ), true
        )
    })
    // For each hotel room, run a seperate query to get the available rooms
    let fullHotels = [];
    for (var i in hotels) {
        let hotel = hotels[i];
        // The following query finds the amount of each room type that is not taken during the requested time period.
        let rooms = await sequelize.query(
            `(
                SELECT room_type.title, room_type.description, room_type.persons, room_type.beds,
                (
                    CAST((hotel_room.room_count - (
                        SELECT count(*) FROM reservation
                        WHERE (
                            (start_date >= :search_start_date AND start_date <=:search_start_date)
                            OR (end_date >= :search_end_date AND end_date <= :search_end_date)
                        )
                        AND reservation.hotel_id = hotel_room.hotel_id
                        AND reservation.room_type_id = hotel_room.room_type_id
                        AND reservation.hotel_id = hotel.hotel_id
                    )) as INTEGER)
                ) as available
                from hotel
                join hotel_room on hotel_room.hotel_id = hotel.hotel_id
                join room_type on room_type.room_type_id = hotel_room.room_type_id
                where hotel.hotel_id = ` + hotel.hotelID + `
            )`,
            { 
                replacements: { search_start_date: startDate, search_end_date: endDate },
                type: sequelize.QueryTypes.SELECT
            }
        );
        // Add up the total people the available rooms can accomodate.
        var totalPersons = 0;
        for (var i in rooms) {
            totalPersons += rooms[i].persons * rooms[i].available;
        }
        // If the hotel can accomodate the requested persons then add it to the return
        if (totalPersons >= req.query.persons) {
            hotel.dataValues.rooms = rooms
            fullHotels.push(hotel);
        }
    }
    return res.status(200).json({
        error: false,
        data: fullHotels
    });
});

/**
 * @Protected
 * @Description - Returns the details of a specific hotel
 */
router.get('/:id', requireAuth, async (req, res) =>{
    let validator = new Validator({
        id: req.params.id
      }, {
        id: 'required|numeric|min:1'
    });
    if (validator.fails()) {
        return sendValidationErrors(res, validator);
    }
    // Find the hotel given the id
    let hotel = await Hotel.findOne({
        where: { hotelID: req.params.id }
    })
    return res.status(200).json({
        error: false,
        data: hotel
    });
});

/**
 * @Protected
 * @Description - Returns the details of a specific hotel and the available rooms in the time frame
 */
router.get('/:id/rooms', requireAuth, async (req, res) =>{
    let validator = new Validator({
        id: req.params.id,
        startDate: req.query.startDate,
        endDate: req.query.endDate
      }, {
        id: 'required|numeric|min:1',
        startDate: 'required|date|regex:/[0-9]{4}-[0-9]{2}-[0-9]{2}$/',
        endDate: 'required|date|regex:/[0-9]{4}-[0-9]{2}-[0-9]{2}$/'
    });
    if (validator.fails()) {
        return sendValidationErrors(res, validator);
    }
    // Find the hotel given the id
    let hotel = await Hotel.findOne({
        where: { hotelID: req.params.id }
    })
    // Find the number of available rooms of each type given the time frame
    let rooms = await sequelize.query(
        `(
            SELECT room_type.title, room_type.description, room_type.persons, room_type.beds,
            (
                CAST((hotel_room.room_count - (
                    SELECT count(*) FROM reservation
                    WHERE (
                        (start_date >= :search_start_date AND start_date <=:search_start_date)
                        OR (end_date >= :search_end_date AND end_date <= :search_end_date)
                    )
                    AND reservation.hotel_id = hotel_room.hotel_id
                    AND reservation.room_type_id = hotel_room.room_type_id
                    AND reservation.hotel_id = hotel.hotel_id
                )) as INTEGER)
            ) as available
            from hotel
            join hotel_room on hotel_room.hotel_id = hotel.hotel_id
            join room_type on room_type.room_type_id = hotel_room.room_type_id
            where hotel.hotel_id = ` + req.params.id + `
        )`,
        { 
            replacements: { search_start_date: req.query.startDate, search_end_date: req.query.endDate },
            type: sequelize.QueryTypes.SELECT
        }
    );
    hotel.dataValues.rooms = rooms;
    return res.status(200).json({
        error: false,
        data: hotel
    });
});

module.exports = router