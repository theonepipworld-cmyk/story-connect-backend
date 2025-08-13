var createError = require('http-errors');
var express = require('express');
const secretVariables = require('./config/secretVariables');
const authRoutes = require('./routes/v1/user/auth.routes.js')
const profileRoutes = require('./routes/v1/user/profile.routes.js')
const postRoutes = require('./routes/v1/user/post.routes.js');
const commentRoutes = require("./routes/v1/user/comments.routes.js")
const userStatsRoutes = require("./routes/v1/user/userActivityStats.routes.js")
require('./config/db'); 

var app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/api/v1/test', (req, res) => {
  console.log("Server is running successfully")
  res.status(200).json({
    success: true,
    message: 'Server is running successfully 🚀',
    timestamp: new Date().toISOString(),
  });
});


app.get('/api/v1/test', (req, res) => {
  console.log("Server is running successfully")
  res.status(200).json({
    success: true,
    message: 'Server is running successfully 🚀',
    timestamp: new Date().toISOString(),
  });
});


// user section routes
app.use('/api/v1/user/auth', authRoutes);
app.use('/api/v1/user/profile', profileRoutes);
app.use('/api/v1/user/post', postRoutes);
app.use('/api/v1/user/comment', commentRoutes);
app.use('/api/v1/user/stats', userStatsRoutes);



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
