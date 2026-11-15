const { errorResponse } = require('../utils/apiResponse');

/**
 * Restrict endpoint access to designated roles (e.g. 'ADMIN')
 */
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return errorResponse(
        res,
        403,
        `Forbidden: Role '${req.user?.role || 'Guest'}' is not authorized to access this resource`
      );
    }
    next();
  };
};

module.exports = {
  authorize,
};
