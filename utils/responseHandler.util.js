exports.successResponse = (message = 'success', data = null) => ({
  type: "success",
  message,
  data,
});

exports.errorResponse = (message, loggedError = null) => ({
  type: "error",
  message,
  loggedError
});
