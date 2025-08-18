// controllers/professionSymbol.controller.js
const ProfessionSymbol = require("../../../models/professionalSymbolModel")

exports.professionSymbolList = async (req, res) => {
  try {
    const symbols = await ProfessionSymbol.find().sort({ name: 1 });
    res.json(symbols);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch symbols" });
  }
};
