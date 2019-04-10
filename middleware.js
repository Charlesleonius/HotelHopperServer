let passport = require("passport");

let requireAuth = passport.authenticate('jwt', { session: false });

let requireAdmin = function (req, res, next) {
    if (!req.user || !req.user.isAdmin) {
        res.status(401).json({
            error: true,
            message: "This API requires admin privelages"
        });
    } else {
        next()
    }
};

let sendValidationErrors = function(res, validator) {
    let validationError = Object.keys(validator.errors["errors"]).map(function(k) { return validator.errors["errors"][k][0]; })[0];
    return res.status(400).json({ 
            error: true, 
            validationErrors: validator.errors["errors"],
            message: validationError
    });
}

module.exports = {
    requireAuth,
    requireAdmin,
    sendValidationErrors
};

