exports.successResponse = (message = 'success', data = null, pagination = null, extraData = null) => ({
  type: "success",
  message,
  data,
  ...(pagination && { pagination }),
  extraData
});

exports.errorResponse = (message, data = null, loggedError = null) => ({
  type: "error",
  message,
  ...(data && { data }),       
  ...(loggedError && { loggedError }) 
});