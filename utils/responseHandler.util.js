exports.successResponse = (message = 'success', data = null, pagination = null) => ({
  type: "success",
  message,
  data,
  ...(pagination && { pagination })
});

exports.errorResponse = (message, data = null, loggedError = null) => ({
  type: "error",
  message,
  ...(data && { data }),       
  ...(loggedError && { loggedError }) 
});