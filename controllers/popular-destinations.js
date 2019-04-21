const express = require('express');
const router = express.Router();
const PopularDestination = require('../models/hotels/popular-destinations');
const knex = require('../knex.js');

router.use(express.json());

router.get('/', async (req, res) => {

    // get all cities
    let cities = await knex.raw('SELECT city FROM popular_destinations');
    if (cities) {
        var citiesArray = new Array();
        cities.rows.forEach(city => {
            citiesArray.push(city);
        });
    }

    // choose four random cities
    let fourRandomCities = new Array();
    let count = 0;
    while (count < 4) {
        let aRandomCity = citiesArray[getRandomInt(citiesArray.length)];
        if (!fourRandomCities.includes(aRandomCity)) {
            fourRandomCities.push(aRandomCity);
            count++;
        }
    };
    // get city and url
    let popularDestinations = await knex.select('city', 'url', 'lat', 'lng')
                                        .from('popular_destinations')
                                        .where({city: fourRandomCities[0].city})
                                        .orWhere({city: fourRandomCities[1].city})
                                        .orWhere({city: fourRandomCities[2].city})
                                        .orWhere({city: fourRandomCities[3].city});
    res.status(200).json({
        error: false,
        data: popularDestinations
    });

});

function getRandomInt(max) {
    return Math.floor(Math.random() * Math.floor(max));
}


module.exports = router
