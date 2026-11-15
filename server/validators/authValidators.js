/**
 * Input validators for Auth and User management
 */

const validateRegister = (req, res, next) => {
  const { businessName, name, email, password } = req.body;
  const errors = [];

  if (!businessName || !businessName.trim()) errors.push('Business name is required');
  if (!name || !name.trim()) errors.push('User name is required');
  if (!email || !/^\S+@\S+\.\S+$/.test(email)) errors.push('A valid email address is required');
  if (!password || password.length < 6) errors.push('Password must be at least 6 characters long');

  if (errors.length > 0) {
    return res.status(400).json({ success: false, message: 'Validation failed', errors });
  }
  next();
};

const validateLogin = (req, res, next) => {
  const { email, password } = req.body;
  const errors = [];

  if (!email || !/^\S+@\S+\.\S+$/.test(email)) errors.push('A valid email address is required');
  if (!password) errors.push('Password is required');

  if (errors.length > 0) {
    return res.status(400).json({ success: false, message: 'Validation failed', errors });
  }
  next();
};

module.exports = {
  validateRegister,
  validateLogin,
};
