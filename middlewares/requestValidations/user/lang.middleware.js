const allowedLanguages = ["en", "fr", "es", "cr"];

exports.languageMiddleware = (req, res, next) => {

    let lang = req.body.lang || req.headers["accept-language"] || "en";

    
    if (lang.includes(",")) {
        lang = lang.split(",")[0];
    }

    if (lang.includes("-")) {
        lang = lang.split("-")[0];
    }

    // validate language
    if (!allowedLanguages.includes(lang)) {
        lang = "en";
    }

    req.lang = lang;

    next();
};