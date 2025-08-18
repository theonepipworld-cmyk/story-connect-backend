const Country = require("../../../models/countryList.model")

exports.countryList = async (req, res) => {
    try {
        const { search } = req.query;
        if (!search) {
            const countries = await Country.find().sort({ name: 1 });
            return res.json(countries);
        }

        const filteredCountries = await Country.find({
            name: { $regex: search, $options: 'i' }
        }).sort({ name: 1 });

        res.json(filteredCountries);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch countries' });
    }
}