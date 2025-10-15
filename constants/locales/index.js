const en = require('./en.json');
const fr = require('./fr.json');
const es = require('./es.json');
const ht = require('./ht.json');

const languages = { en, fr, es, ht };

function getMessage(lang = 'en', category, key) {

  const selectedLang = languages[lang] || languages['en'];
 // console.log("selectedLang---------------",selectedLang)
  console.log(category)
  return (
    selectedLang?.[category]?.[key] ||
    languages['en']?.[category]?.[key] ||
    `${category}.${key}`
  );
}

module.exports = { getMessage };
