var createError = require('http-errors');
var express = require('express');
const authRoutes = require('./routes/v1/auth.routes.js')
const profileRoutes = require('./routes/v1/profile.routes.js')
const secretVariables = require('./config/secretVariables');
require('./config/db'); 

var app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/profile', profileRoutes);

// Global 404 handler (for unknown routes)
app.use((req, res, next) => {
  next(createError(404, 'Route not found'));
});

// Global error handler
app.use((err, req, res, next) => {
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal Server Error',
  });
});

const PORT = secretVariables.port;
app.listen(PORT, () => {
console.log(`Server running on port ${PORT}`);
});
module.exports = app;
