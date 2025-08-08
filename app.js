var createError = require('http-errors');
var express = require('express');
const authRoutes = require('./routes/v1/auth.routes.js')
const secretVariables = require('./config/secretVariables');
require('./config/db'); 

var app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/api/v1/', authRoutes);

const PORT = secretVariables.port;
app.listen(PORT, () => {
console.log(`Server running on port ${PORT}`);
});
module.exports = app;
