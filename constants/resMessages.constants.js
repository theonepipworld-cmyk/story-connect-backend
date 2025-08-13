module.exports = {
    success: {
        loginSuccessful: "Success",
        deleteSuccessful: "delete successfully"

    },
    notFound: {
        emailNotFound: "Email not found",
        userNotFound: "User not found",
        postNotFound: "Post Not Found"
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
        postForError: "Type must be either 'profile' or 'community'",
        invalidFileType: "invalid type",

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
};
