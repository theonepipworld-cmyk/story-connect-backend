const ProfessionSymbol = require("../../../models/professionalSymbolModel");
const resMessages = require("../../../constants/resMessages.constants.js");
const { successResponse, errorResponse } = require('../../../utils/responseHandler.util.js');
const connectDB = require("../../../config/db");

exports.professionSymbolList = async (req, res) => {
  try {
     await connectDB();
    const symbols = await ProfessionSymbol.find().sort({ name: 1 }) || [];
    return res.status(200).json(
      successResponse(resMessages.success.fetchProfessionalSymbol, symbols)
    );
  } catch (err) {
    console.error("Error fetching Profession Symbols:", err);
    res.status(500).json({ error: "Failed to fetch symbols" });
  }
};
