const User = require('../../models/user.model');
const { uploadFileToS3 } = require('../../utils/s3.util');
const { DEFAULT_AVATAR_URL } = require('../../constants/variables.constants');
const resMessages = require('../../constants/resMessages.constants');
const { checkFieldExists } = require("../../helpers/dbHelpers.js")
const CountryList = require("../../models/countryList.model.js")
const professionalSymbol = require("../../models/professionalSymbolModel.js")

exports.getProfile = async (userId) => {
    const user = await User.findById(userId)
        .select('-passwordHash -resetPasswordExpires -resetPasswordToken')
        .lean();
    if (!user) {
        throw new Error(resMessages.notFound.userNotFound);
    }
    return user;
};


exports.updateProfile = async (userId, payload, files) => {
    const patch = {};
       console.log(payload)
    if (payload.username) patch.username = payload.username;
    if (payload.bio) patch.bio = payload.bio;
    if (payload.profession) patch.profession = payload.profession;    
    if (payload.education) patch.education = payload.education;
    if (payload.relationship) patch.relationship = payload.relationship;
           
      if (payload.countryOfOrigin) {
        const countryOrigin = await CountryList.findById(payload.countryOfOrigin).lean();
        console.log("origin-",countryOrigin);
        if (countryOrigin) {
            patch.countryOfOrigin = {
                _id:countryOrigin._id,
                code: countryOrigin.code,
                name: countryOrigin.name
            };
        }
    }
    if (payload.currentCountry) {
         const currentCounrty = await CountryList.findById(payload.currentCountry).lean();
        if (currentCounrty) {
            patch.currentCountry = {
                _id:currentCounrty._id,
                code: currentCounrty.code,
                name: currentCounrty.name
            };
        }
    }
    if (payload.entryYear) patch.entryYear = payload.entryYear;
    if (payload.phone) patch.phone = payload.phone;
    if (payload.dateOfBirth) patch.dateOfBirth = payload.dateOfBirth;
    if (payload.status) patch.status = payload.status;
    if (payload.relationshipDescription) patch.relationshipDescription = payload.relationshipDescription;
    if (payload.email) patch.email = payload.email;
    if (payload.professionSymbol){
       const professionalSymbols = await professionalSymbol.findById(payload.professionSymbol)
       if(professionalSymbols){
        patch.professionSymbol = {
            _id:professionSymbol._id,
            name:professionalSymbols.name,
            iconUrl:professionalSymbols.iconUrl
        }
       }
    } 
    const [emailExist, usernameExist] = await Promise.all([
        checkFieldExists('email', payload.email),
        checkFieldExists('username', payload.username),
    ]);

    if (emailExist) {
        const err = new Error(resMessages.validation.emailAlreadyExist);
        err.statusCode = 400;
        throw err;
    }

    if (usernameExist) {
        const err = new Error(resMessages.validation.usernameAlreadyExist);
        err.statusCode = 400;
        throw err;
    }



    if (payload.dateOfBirth) {
        const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
        if (!dateRegex.test(payload.dateOfBirth)) {
            throw new Error(resMessages.validation.invalidDateOfBirthFormat);
        }
        patch.dateOfBirth = payload.dateOfBirth;
    }
    if (files && files.avatar?.[0]) {
        try {
            const avatarFile = files.avatar[0];
            const s3Res = await uploadFileToS3(avatarFile, "profile");
            patch.avatarUrl = s3Res?.Location || DEFAULT_AVATAR_URL;
        } catch (uploadErr) {
            patch.avatarUrl = DEFAULT_AVATAR_URL;
        }
    }  
    if (files && files.profileCoverImage?.[0]) {
        try {
            const profileCoverImage = files.profileCoverImage[0];
            const s3Res = await uploadFileToS3(profileCoverImage, "profileCoverImage");
            patch.profileCoverImage = s3Res?.Location || DEFAULT_AVATAR_URL;
        } catch (uploadErr) {
            patch.profileCoverImage = DEFAULT_AVATAR_URL;
        }
    }
    console.log("pathc-------",patch)
    const updated = await User.findByIdAndUpdate(
        userId,
        { $set: patch },
        { new: true, runValidators: true, select: 'name email profile profession' }
    ).lean();

    if (!updated) {
        throw new Error(resMessages.notFound.userNotFound);
    }

    return { message: resMessages.success.updateSuccessful };
};

exports.deleteProfile = async (userId) => {
    const deleted = await User.findByIdAndUpdate(userId, {
        $set: { status: 'deleted' }
    }, { new: true, select: 'status' });
    if (!deleted) {
        throw new Error(resMessages.notFound.userNotFound);
    }
    return { message: resMessages.success.deleteSuccessful };
};
