exports.successResponse = (message = 'success', data = null, pagination = null) => ({
  type: "success",
  message,
  data,
    ...(pagination && { pagination }) 
});

exports.errorResponse = (message, loggedError = null) => ({
  type: "error",
  message,
  loggedError
});
