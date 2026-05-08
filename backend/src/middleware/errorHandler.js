// Central error handler — must be registered last in app.js
function errorHandler(err, req, res, next) {
  console.error(err.stack || err.message);

  const status  = err.status  || 500;
  const message = err.message || 'Internal Server Error';

  res.status(status).json({ message });
}

module.exports = errorHandler;
