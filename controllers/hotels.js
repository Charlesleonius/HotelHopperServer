const express = require('express');
const router = express.Router();
const { Hotel, HotelRoom, HotelAmenity } = require('../models/index.js');
const { requireAdmin, requireAuth,
    sendErrorMessage, sendValidationErrors } = require('../middleware.js');
const { raw, ref } = require('objection');
const Validator = require('validatorjs');
const moment = require('moment');


/**
 * @Protected
 * @Admin
 * @Description - Takes scraped hotel objects and converts them hotelhopper hotel objects
 */
router.put('/scrapedHotel', [requireAuth, requireAdmin], async (req, res) => {
    let stPoint = raw("ST_SetSRID(ST_MakePoint(??, ??),4326)",
        req.body.longitude, req.body.latitude)
    let hotel = await Hotel.query().insert({
        title: req.body.name,
        state: req.body.address.addressRegion,
        country: req.body.address.addressCountry,
        street: req.body.address.addressLocality,
        city: req.body.city,
        zip: req.body.address.postalCode,
        image_url: req.body.image,
        rating: req.body.aggregateRating.ratingValue,
        rating_count: req.body.aggregateRating.reviewCount,
        map_url: req.body.hasMap,
        description: req.body.description,
        latitude: req.body.latitude,
        longitude: req.body.longitude,
        position: stPoint,
        address: req.body.address.streetAddress,
        stars: req.body.stars
    });
    req.body.rooms.forEach(async room => {
        await HotelRoom.query().insert({
            hotel_id: hotel.hotelId,
            room_type_id: room.roomTypeId,
            price: room.price,
            room_count: room.count
        })
    });
    req.body.amenities.forEach(async amenityId => {
        await HotelAmenity.query().insert({
            hotel_id: hotel.hotelId,
            amenity_id: amenityId
        });
    });
    res.status(200).send("OK");
});


/**
 * @Protected
 * @Description - Returns hotels that meet the users travel plans
 */
router.get('/', async (req, res) => {
    let validator = new Validator({
        longitude: req.query.longitude,
        latitude: req.query.latitude,
        startDate: req.query.startDate,
        endDate: req.query.endDate,
        persons: req.query.persons,
        perPage: req.query.perPage,
        page: req.query.page,
        requestedAmenities: req.query.requestedAmenities, // string of amenitiy ID numbers, "1,2,3..."
        sortBy: req.query.sortBy, // rating, price. distance, star
        orderBy: req.query.orderBy, // desc, asc
        minPrice: req.query.minPrice, // if the case is "less than 75", just put 0 as the min
        maxPrice: req.query.maxPrice, // if case is "bigger than 300", just put 10000 as the max
    }, {
        longitude: 'required|numeric',
        latitude: 'required|numeric',
        startDate: 'required|date|regex:/[0-9]{4}-[0-9]{2}-[0-9]{2}$/',
        endDate: 'required|date|regex:/[0-9]{4}-[0-9]{2}-[0-9]{2}$/',
        persons: 'required|numeric|min:1',
        perPage: 'numeric|min:1',
        page: 'numeric|min:1',
        sortBy: 'required|string',
        minPrice: 'numeric',
        maxPrice: 'numeric'
    }, {
        "regex.startDate": "Please use the date format yyyy-mm-dd",
        "regex.endDate": "Please use the date format yyyy-mm-dd"
    });
    let startDate = moment(req.query.startDate).format("YYYY-MM-DD");
    let endDate = moment(req.query.endDate).format('YYYY-MM-DD');
    let todaysDate = moment().format("YYYY-MM-DD");
    if (validator.fails()) {
        return sendValidationErrors(res, validator);
    } else if (startDate < todaysDate || endDate < startDate) {
        return res.status(400).json({
            error: true,
            message: "Invalid date range. Make sure your reservation isn't in the past!"
        });
    }
    let perPage = req.query.perPage || 15;
    let page = req.query.page || 1;
    let requestedAmenities = null;
    let hotels = await Hotel.query()
        .where(
            raw("ST_DWithin( \
                                ST_SetSRID(ST_MakePoint(?, ?), 4326), \
                                hotel.position, ?)",
                req.query.longitude, req.query.latitude, 0.2
            ), true)
        .limit(perPage)
        .offset((page - 1) * perPage)
        .modify(function (queryBuilder) {
            queryBuilder.select([
                '*',
                HotelRoom.query().where('hotelId', ref('hotel.hotel_id'))
                .select('price').orderBy('price', 'asc')
                .limit(1).as('lowPrice')
            ]);
            switch (req.query.sortBy) {
                case 'stars':
                    queryBuilder.orderBy('stars', 'desc')
                case 'distance':
                    queryBuilder.orderBy(
                        raw('ST_Distance(ST_SetSRID(ST_MakePoint(?, ?),4326), hotel.position)',
                            req.query.longitude, req.query.latitude
                        ), 'asc'
                    )
                case 'priceLow':
                    queryBuilder.orderBy('lowPrice', 'asc')
                case 'priceHigh':
                    queryBuilder.orderBy('lowPrice', 'desc')
                default:
                    queryBuilder.orderBy('rating', 'desc')
            }
            if (req.query.minPrice) {
                queryBuilder.whereExists(
                    HotelRoom.query().where('hotelId', '=', ref('hotel.hotel_id'))
                    .select(raw('MIN(price)').as('min_price'))
                    .havingRaw('MIN(price) >= ?', [req.query.minPrice]))
            }
            if (req.query.maxPrice) {
                queryBuilder.whereExists(
                    HotelRoom.query().where('hotelId', '=', ref('hotel.hotel_id'))
                    .select(raw('MIN(price)').as('min_price'))
                    .havingRaw('MIN(price) <= ?', [req.query.maxPrice]))
            }
            if (req.query.requestedAmenities) {
                requestedAmenities = req.query.requestedAmenities.split(',').map(Number);
                queryBuilder.whereExists(
                    HotelAmenity.query().whereIn('amenity_id', requestedAmenities)
                    .select(raw('COUNT(*)'))
                    .where('hotel_id', ref('hotel.hotel_id'))
                    .havingRaw('COUNT(*) = ?', [requestedAmenities.length])
                )
            }
        });
    // For each hotel room, run a seperate query to get the available rooms
    let fullHotels = [];
    for (var i in hotels) {
        let hotel = hotels[i];
        // The following query finds the amount of each room type
        // that is not taken during the requested time period.
        let availableRooms = await Hotel.getAvailableRooms(hotel.hotelId, startDate, endDate);
        var totalPersons = 0;
        var lowestCost;
        // Add up the total people the available rooms can accomodate.
        availableRooms.rows.forEach(room => {
            totalPersons += room.persons * room.available;
            if (!lowestCost || room.price < lowestCost) lowestCost = room.price;
        });
        if (totalPersons >= req.query.persons) fullHotels.push(hotel)
    }
    return res.status(200).json({
        error: false,
        data: fullHotels
    });
});

/**
 * @Protected
 * @Description - Returns the details of a specific hotel
 * plus the available rooms and amenities. Rooms depend on the given dates.
 */
router.get('/:id', async (req, res) => {
    let validator = new Validator({
        id: req.params.id,
        startDate: req.query.startDate,
        endDate: req.query.endDate
    }, {
            id: 'required|numeric|min:1',
            startDate: 'required|date|regex:/[0-9]{4}-[0-9]{2}-[0-9]{2}$/',
            endDate: 'required|date|regex:/[0-9]{4}-[0-9]{2}-[0-9]{2}$/'
        }, {
            "regex.startDate": "Please use the date format yyyy-mm-dd",
            "regex.endDate": "Please use the date format yyyy-mm-dd"
        });
    if (validator.fails()) return sendValidationErrors(res, validator);
    let startDate = moment(req.query.startDate).format("YYYY-MM-DD");
    let endDate = moment(req.query.endDate).format('YYYY-MM-DD');
    let todaysDate = moment().format("YYYY-MM-DD");
    if (startDate < todaysDate || endDate < startDate) {
        return res.status(400).json({
            error: true,
            message: "Invalid date range. Make sure your reservation isn't in the past!"
        });
    }
    // Find the hotel given the id
    let hotel = await Hotel.query().findById(req.params.id).eager('hotelAmenities.amenity');
    if (!hotel) return sendErrorMessage(res, 404, "No hotel found with id: " + req.params.id);
    // The following query finds the amount of each room type
    // that is not taken during the requested time period.
    let availableRooms = await Hotel.getAvailableRooms(req.params.id, startDate, endDate);
    hotel.rooms = availableRooms.rows;
    return res.status(200).json({
        error: false,
        data: hotel
    });
});

module.exports = router
