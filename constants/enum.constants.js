const friend_Request_status = {
  ACCEPTED: "accepted",
  REJECTED: "rejected",
  PENDING: "pending"
}

const notification_Types = {
  LIKE: "like",
  FRIEND_REQUEST: "friend_request",
  FRIEND_REQUEST_ACCEPTED: "friend_request_accepted",
  FRIEND_REQUEST_REJECTED:"friend_request_rejected",
  COMMENT: "comment",
  COMMENTLIKE:"commentLike"
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

const userAccountState ={
  NORMAL:"normal",
  WARNING:"warning",
  SUSPENDED:"suspended"
}

const userRole ={
  USER:"user",
  ADMIN:"admin",
}


module.exports = {
  friend_Request_status,
  notification_Types,
  typePost,
  messages_Status,
  reportStatus,
  userAccountState,
  userRole
};

