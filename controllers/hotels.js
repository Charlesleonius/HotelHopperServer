const express = require('express');
const router = express.Router();
const Hotel = require('../models/index.js').Hotel;
const HotelRoom = require('../models/index.js').HotelRoom;
const { requireAdmin, requireAuth } = require('../middleware.js');

/**
 * @Protected
 * @Admin
 * @Description - Takes scraped hotel objects and converts them hotelhopper hotel objects
 */
router.put('/scraped_hotel', [requireAuth, requireAdmin], (req, res) => {
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

module.exports = router