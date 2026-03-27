const Country = require("../../../models/countryList.model")
const resMessages = require("../../../constants/resMessages.constants.js");
const { successResponse, errorResponse } = require('../../../utils/responseHandler.util.js');
const connectDB = require("../../../config/db");

exports.countryList = async (req, res) => {
    try {
            await connectDB();
        const { search } = req.query;
        if (!search) {
            const countries = await Country.find().sort({ name: 1 });
           return res.status(200).json(
                 successResponse(resMessages.success.fetchSuccessfully, countries)
               );
        }

        const filteredCountries = await Country.find({
            name: { $regex: search, $options: 'i' }
        }).sort({ name: 1 });

          return res.status(200).json(
                 successResponse(resMessages.success.fetchSuccessfully, filteredCountries)
               );
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch countries' });
    }
}