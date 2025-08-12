var createError = require('http-errors');
var express = require('express');
const secretVariables = require('./config/secretVariables');
const authRoutes = require('./routes/v1/user/auth.routes.js')
const profileRoutes = require('./routes/v1/user/profile.routes.js')
const postRoutes = require('./routes/v1/user/post.routes.js');
const commentRoutes = require("./routes/v1/user/comments.routes.js")
require('./config/db'); 

var app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));



// user section routes
app.use('/api/v1/user/auth', authRoutes);
app.use('/api/v1/user/profile', profileRoutes);
app.use('/api/v1/user/post', postRoutes);
app.use('/api/v1/user/comment', commentRoutes);




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
