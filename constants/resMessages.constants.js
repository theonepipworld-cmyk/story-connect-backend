module.exports = {
    success: {
        loginSuccessful: "Success",
        updateSuccessful:"update successfully",
        createSuccessful:"create Sucessfully",
        getSuccessful:"get Sucessfully",
        deleteSuccessful:"delete Sucessfully",
        likeOrviewSuccessful:"like or View Sucessfully",
        fetchSuccessfully:"fetch successfully",
        joinSuccessfully:"User joined successfully",
        sendReqSuccessfully:"friend Request Send Successfully",
        acceptReqSuccessfully:"friend Request Accept Successfully",
        rejectReqSuccessfully:"friend request rejected Successfully",
        unFriendSuccessfully:"Unfriend user Successfully "
    },
    notFound: {
        emailNotFound: "Email not found",
        postNotFound: "post not found",
        userNotFound: "User not found",
        ReqUser:"user which we requesting frined not found",
        commentNotFound:"Comment not found",
        communityNotFound:"community not found",
        communityCategoryNotFound:"community category not found",
        memberNotFound:"member not found",
        userOrFriendIdNotFound:"either friend or user id is missing",
        noMutualFriend:"No mutual friend",
        noTrendingTags:"No trending Tags found"
    },
    validation: {
        missingFields: "Missing required fields",
        incorrectPassword: "Incorrect Password.",
        emailAlreadyExist: "This email is already in use.",
        passwordsDoNotMatch: "Confirm password must be the same as the password",
        emailValidate: "Please enter a valid email address.",
        passwordMinLength: "Password must be at least 6 characters long.",
        invalidPhoneNumber: "Phone number invalid",
        invalidDateOfBirth: "DOB invalid",
        authTokenMissing: "Authorization token missing",
        invalidDateOfBirthFormat: "Invalid date format. Please use YYYY-MM-DD.",
        typeError: "Type must be either 'video' or 'image'",
        invalidDateOfBirthFormat: "Invalid date format. Please use YYYY-MM-DD.",
        categoryName:"category name is required for others",
        invalidCategory:"category name is invalid",
        invalidFileType:"invalid file Type",
        alreadyCommunityMember:"user is already a community member",
        invalidId:"invalidId",
          typeUserStatsError: "Type not defeined properly",
          inValidRole:"role shuld be admin or user",
          invalidFriendAction:"action must be accept or reject"
    },
    auth: {
        unauthorizedAccess: "Unauthorized access",
        invalidToken: "Invalid token",
    },
    serverError: {
        internalError: "Internal server error",
        processingError: "Error while processing request",
        limitExccessedError: "You can upload up to 5 media files only."
    },
    generalError: {
        somethingWentWrong: "Something went wrong. Please try again later.",
        idMissMatch: "Id miss-matched.",
        calledFunctionError: "Getting error from called Function",
        uploading: "Error uploading file"

    },
    customError:{
         commentError:"commentId required for comment actions",
         parentCommentIdInvalid:"parentComment is invalid",
         commentIdNotMatch:"commentId not match .",
         NotAuthorized:"user not have authorized to delete or update",
         NotAuthorizedRemove:"user dont have authorization to remove the member",
         ownerNotRemove:"owner cant remove from Community",
         commentNotDeleted:"comment not deleted because of not found record of the id's",
         noUserStatsFound:"No user-stats found",
         notFound:"no  comments found",
         friendReqSent:"friend Request already Sent",
         alreadyFriend:"you are already a friend",
         alreadyRejected:"friendReq already rejected",
         notSendReqYourself:"you cant send a request to yourself",
         noPendingReq:"No pending Request",
         noFriends:"No friends"
    }

};

