//Imports
require('dotenv').config();
const express = require("express");
const bodyParser = require("body-parser");
const passport = require("passport");
const passportJWT = require("passport-jwt");
const cors = require('cors');
const YAML = require('yamljs');
const swaggerUi = require('swagger-ui-express');
const User = require('./models/auth/user.js');

//Constants || Singletons
const app = express();
const PORT = process.env.PORT || 3000;

//JWT Helpers
var ExtractJwt = passportJWT.ExtractJwt;
var JwtStrategy = passportJWT.Strategy;
global.jwtOptions = {};
jwtOptions.jwtFromRequest = ExtractJwt.fromAuthHeaderAsBearerToken();
jwtOptions.secretOrKey = 'wEKNYENCpc4HvogKJs0pa1XPD5vbx4ZsxaYzZ8SUwMGBrgOv0A4zK2ZZni2jfFOAkGPdrj7gwJI4j6W2IOI3fT0gYjBmjOKu7FWK';

//Define authentication strategy for JWT
var strategy = new JwtStrategy(jwtOptions, async function(jwt_payload, next) {
    let user = await User.query().where('email', '=', jwt_payload.email).first();
    if (user) return next(null, user);
    next(null, null);
});

//Load middleware
app.use(cors())
passport.use(strategy);
app.use(passport.initialize());
app.use(bodyParser.json({
    extended: true
}));
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(YAML.load('./swagger.yaml')));

//Controllers
var authController = require('./controllers/auth.js');
var popularDestinationsController = require('./controllers/popular-destinations.js');
var hotelController = require('./controllers/hotels.js');
var reservationsController = require('./controllers/reservations.js');

/*
* Define routes
* Controllers should have their own route prefix. 
* For example endpoints in auth.js should be prefixed with /auth
* To do this just import the controller `require(./controllers/<controller name>.js)`
* then set the controller as middleware with `app.use('/<controller name>', <imported controller>)`
*/
app.use('/auth', authController);
app.use('/popularDestinations', popularDestinationsController);
app.use('/hotels', hotelController);
app.use('/reservations', reservationsController);
app.get('/', (req, res) => res.send('Hello World!'));

const server = app.listen(PORT, () => {
    console.log('Example app listening at port %s', server.address().port);
});

module.exports = {
    app,
    server
}
