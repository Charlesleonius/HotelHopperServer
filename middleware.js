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

module.exports = {
    requireAuth,
    requireAdmin
};

