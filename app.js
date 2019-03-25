
//Imports
require('dotenv').config()
let express = require("express");
let bodyParser = require("body-parser");
let passport = require("passport");
let passportJWT = require("passport-jwt");

/*
* The db object contains a reference to the database connection pool as well as all of the models
* To access the connection pool use db.sequelize
* To access a model use db.<model name>
*/
let db = require('./models/index.js');

//Controllers
var auth = require('./controllers/auth.js');
var popDest = require('./controllers/popular-destinations.js');

const app = express();
const PORT = process.env.PORT || 3000;

//JWT Helpers
var ExtractJwt = passportJWT.ExtractJwt;
var JwtStrategy = passportJWT.Strategy;
global.jwtOptions = {};
jwtOptions.jwtFromRequest = ExtractJwt.fromAuthHeaderAsBearerToken();
jwtOptions.secretOrKey = 'wEKNYENCpc4HvogKJs0pa1XPD5vbx4ZsxaYzZ8SUwMGBrgOv0A4zK2ZZni2jfFOAkGPdrj7gwJI4j6W2IOI3fT0gYjBmjOKu7FWK';

//Define authentication strategy for JWT
var strategy = new JwtStrategy(jwtOptions, function(jwt_payload, next) {
    db.user.findOne({ email: jwt_payload.email }).then(user => {
        if (user) {
            next(null, user);
        } else {
            res.status(401);
        }
    });
});
passport.use(strategy);

//Load middleware
app.use(passport.initialize());
app.use(bodyParser.json({
    extended: true
}));

//Start the application if a database connection is successfull and the schema is sychronized
db.sequelize.authenticate().then(() => {
    return db.sequelize.sync()
}).then(() => {
    return app.listen(PORT);
}).then(() => {
    console.log("Database synchronized and server listening on port: " + PORT)
}).catch(err => {
    throw new Error('Database connection failed with error: ' + err);
});
/*
* Define routes
* Controllers should have their own route prefix. 
* For example endpoints in auth.js should be prefixed with /auth
* To do this just import the controller `require(./controllers/<controller name>.js)`
* then set the controller as middleware with `app.use('/<controller name>', <imported controller>)`
*/
app.use('/auth', auth);
app.use('/popular-destinations', popDest);
app.get('/', (req, res) => res.send('Hello World!'));

module.exports = app