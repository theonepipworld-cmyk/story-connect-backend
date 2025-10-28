var createError = require('http-errors');
var express = require('express');
const http = require("http");

const { initIo } = require("./socket");
const secretVariables = require('./config/secretVariables');
const authRoutes = require('./routes/v1/user/auth.routes.js')
const profileRoutes = require('./routes/v1/user/profile.routes.js')
const postRoutes = require('./routes/v1/user/post.routes.js');
const commentRoutes = require("./routes/v1/user/comments.routes.js")
const userStatsRoutes = require("./routes/v1/user/userActivityStats.routes.js")
const countryListRoutes = require("./routes/v1/user/countryList.routes.js")
const professionalSymbolRoutes = require("./routes/v1/user/professionalSymbol.routes.js")
const communityRoutes = require("./routes/v1/user/community.routes.js")
const friendRoutes = require("./routes/v1/user/friend.routes.js")
const blockRoutes = require("./routes/v1/user/block.routes.js")
const chatRoutes = require("./routes/v1/user/chat.routes.js")
const reportRoutes = require("./routes/v1/user/report.routes.js")
const notificationRoutes = require("./routes/v1/user/notification.routes.js")
const faqRoutes = require("./routes/v1/user/faq.routes.js");
const connectDB = require("./config/db.js")
const fileUpload = require("express-fileupload")
const cors = require("cors")
const {languageMiddleware} =require("./middlewares/requestValidations/user/lang.middleware.js")

//admin routes
const adminPostRoutes = require("./routes/v1/admin/post.routes.js")
const dashboardRoutes = require("./routes/v1/admin/dashboard.routes.js")
const adminReportRoutes = require("./routes/v1/admin/report.routes.js")

require('./config/db');

var app = express();

connectDB();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());

app.use(languageMiddleware)
// app.use(fileUpload());
app.get('/api/v1/test', (req, res) => {
  console.log("Server is running successfully")
  res.status(200).json({
    success: true,
    message: 'Server is running successfully backend api is working',
    timestamp: new Date().toISOString(),
  });
});

// user section routes
app.use('/api/v1/user/auth', authRoutes);
app.use('/api/v1/user/profile', profileRoutes);
app.use('/api/v1/user/post', postRoutes);
app.use('/api/v1/user/comment', commentRoutes);
app.use('/api/v1/user/stats', userStatsRoutes);
app.use('/api/v1/user/countryList', countryListRoutes);
app.use('/api/v1/user/professionalSymbol', professionalSymbolRoutes);
app.use('/api/v1/user/community', communityRoutes);
app.use('/api/v1/user/friend', friendRoutes);
app.use("/api/v1/user/block", blockRoutes);
app.use("/api/v1/user/chat", chatRoutes);
app.use("/api/v1/user/report", reportRoutes);
app.use("/api/v1/user/notification", notificationRoutes);
app.use('/api/v1/user/faq',faqRoutes);


//adminRoutes
app.use('/api/v1/admin/post',adminPostRoutes);
app.use('/api/v1/admin/dashboard',dashboardRoutes);
app.use('/api/v1/admin/report',adminReportRoutes)



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

require("./utils/resetDailyStats.js")

const server = http.createServer(app);
const io = initIo(server);




const PORT = secretVariables.port;
server.listen(PORT, () => { console.log(`Server running on port ${PORT}`); });
module.exports = { app, server };


