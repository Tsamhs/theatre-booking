const JWT_CONFIG = {
  secret:            process.env.JWT_SECRET,
  expiresIn:         process.env.JWT_EXPIRES_IN         || '1h',
  refreshExpiresIn:  process.env.JWT_REFRESH_EXPIRES_IN || '7d',
};

module.exports = JWT_CONFIG;
