module.exports = {
    success: {
        loginSuccessful: "Success",
        updateSuccessful:"update successfully",
        createSuccessful:"create Sucessfully",
        getSuccessful:"get Sucessfully",
        deleteSuccessful:"delete Sucessfully",
        addSuccessful:"added Sucessfully",
        deleteSuccessful:"deleted Sucessfully",
        fetchSuccessfully:"fetch successfully"
    },
    notFound: {
        emailNotFound: "Email not found",
        postNotFound: "post not found",
        userNotFound: "User not found",
        commentNotFound:"Comment not found"
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
        invalidId:"invalidId",
          typeUserStatsError: "Type not defeined properly",
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
         commentNotDeleted:"comment not deleted because of not found record of the id's",
         noUserStatsFound:"No user-stats found",
         notFound:"no  comments found"
    }

};

