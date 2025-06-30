const errorHandler = (err, _req, res, _next) => {
  console.error(err);
  const status = err.status || 500;
  res.status(status).json({
    success: false,
    code: 'SERVER_ERROR',
    message: err.message || 'Internal Server Error'
  });
};

module.exports = errorHandler; 