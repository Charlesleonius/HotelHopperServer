let passport = require("passport");

let requireAuth = passport.authenticate('jwt', { session: false });

let requireAdmin = function (req, res, next) {
    if (!req.user || !req.user.is_admin) {
        res.status(401).json({
            error: true,
            message: "This API requires admin privelages"
        });
    } else {
        next()
    }
};

/**
 * Helper functions
 */

let sendValidationErrors = function(res, validator) {
    let validationError = Object.keys(validator.errors["errors"]).map(function(k) { return validator.errors["errors"][k][0]; })[0];
    return res.status(400).json({ 
            error: true, 
            validationErrors: validator.errors["errors"],
            message: validationError
    });
}

let sendErrorMessage = function(res, status, message) {
    return res.status(status).json({ 
            error: true, 
            message: message
    });
}

const catchAll = function (promise) {
    return promise.then(data => {
       return [null, data];
    })
    .catch(err => [err]);
 }

module.exports = {
    requireAuth,
    requireAdmin,
    sendValidationErrors,
    sendErrorMessage,
    catchAll
};

