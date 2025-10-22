const friend_Request_status = {
  ACCEPTED: "accepted",
  REJECTED: "rejected",
  PENDING: "pending"
}

const notification_Types = {
  LIKE: "like",
  FRIEND_REQUEST: "friend_request",
  FRIEND_REQUEST_ACCEPTED: "friend_request_accepted",
  comment: "comment"
}

const messages_Status = {
  SENT:"sent",
  DELIVERED:"delivered",
  SEEN:"seen"
}

const typePost = {
  IMAGE:"image",
  VIDEO:"video"
}

const reportStatus ={
  PENDING:"pending",
  UNDERREVIEW:"under-review",
  RESOLVED:"resolved",
  ONHOLD:"on-hold",
  DISMISSED:"dismissed"
}


module.exports = {
  friend_Request_status,
  notification_Types,
  typePost,
  messages_Status,
  reportStatus
};

