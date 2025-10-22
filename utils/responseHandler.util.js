exports.successResponse = (message = 'success', data = null, pagination = null) => ({
  type: "success",
  message,
  data,
  ...(pagination && { pagination })
});

exports.errorResponse = (message, data = null, loggedError = null) => ({
  type: "error",
  message,
  ...(data && { data }),       // attach extra data if present
  ...(loggedError && { loggedError }) // keep loggedError if present
});