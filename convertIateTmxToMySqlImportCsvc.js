"use strict";

const fs = require('fs');
const fastXmlParser = require('fast-xml-parser');

// when a fastXmlParser tag has attributes
const options = {
	attrPrefix: '@_',
	textNodeName: '#text',
	ignoreNonTextNodeAttr: false,
	ignoreTextNodeAttr: false,
	ignoreNameSpace: true,
	ignoreRootElement: false,
	textNodeConversion: true,
	textAttrConversion: true,
	arrayMode: false,
};

const regex = new RegExp(/[\0\x08\x09\x1a\n\r"'\\\%]/g);
const escaper = function escaper(char) {
	const m = ['\\0', '\\x08', '\\x09', '\\x1a', '\\n', '\\r', "'", '"', "\\", '\\\\', "%"];
	const r = ['\\\\0', '\\\\b', '\\\\t', '\\\\z', '\\\\n', '\\\\r', "''", '""', '\\\\', '\\\\\\\\', '\\%'];
	return r[m.indexOf(char)];
};

const languages = [
	{ "language_id": 1, "language_pretty": "English", "language_code": "en" },
	{ "language_id": 2, "language_pretty": "Bulgarian", "language_code": "bg" },
	{ "language_id": 3, "language_pretty": "Croatian", "language_code": "hr" },
	{ "language_id": 4, "language_pretty": "Czech", "language_code": "cs" },
	{ "language_id": 5, "language_pretty": "Danish", "language_code": "da" },
	{ "language_id": 6, "language_pretty": "German", "language_code": "de" },
	{ "language_id": 7, "language_pretty": "Greek", "language_code": "el" },
	{ "language_id": 8, "language_pretty": "Spanish", "language_code": "es" },
	{ "language_id": 9, "language_pretty": "Estonian", "language_code": "et" },
	{ "language_id": 10, "language_pretty": "Finnish", "language_code": "fi" },
	{ "language_id": 11, "language_pretty": "French", "language_code": "fr" },
	{ "language_id": 12, "language_pretty": "Irish", "language_code": "ga" },
	{ "language_id": 13, "language_pretty": "Italian", "language_code": "it" },
	{ "language_id": 14, "language_pretty": "Hungarian", "language_code": "hu" },
	{ "language_id": 15, "language_pretty": "Lithuanian", "language_code": "lt" },
	{ "language_id": 16, "language_pretty": "Latvian", "language_code": "lv" },
	{ "language_id": 17, "language_pretty": "Maltese", "language_code": "mt" },
	{ "language_id": 18, "language_pretty": "Dutch", "language_code": "nl" },
	{ "language_id": 19, "language_pretty": "Polish", "language_code": "pl" },
	{ "language_id": 20, "language_pretty": "Portuguese", "language_code": "pt" },
	{ "language_id": 21, "language_pretty": "Romanian", "language_code": "ro" },
	{ "language_id": 22, "language_pretty": "Slovak", "language_code": "sk" },
	{ "language_id": 23, "language_pretty": "Slovene", "language_code": "sl" },
	{ "language_id": 24, "language_pretty": "Swedish", "language_code": "sv" },
	{ "language_id": 25, "language_pretty": "Latin", "language_code": "la" },
	{ "language_id": 26, "language_pretty": "Multilingual", "language_code": "mul" }
];

function getLanguageIdFromLanguageCode(languageCode) {
	const languageId = languages.filter(
		el => el.language_code.toLowerCase() === languageCode.toLowerCase(),
	)[0].language_id;
	return languageId;
}

function getLanguageIdFromLanguagePretty(languagePretty) {
	const languageId = languages.filter(
		el => el.language_pretty.toLowerCase() === languagePretty.toLowerCase(),
	)[0].language_id;
	return languageId;
}

function getLanguagePrettyFromLanguageCode(languageCode) {
	const languagePretty = languages.filter(
		el => el.language_code.toLowerCase() === languageCode.toLowerCase(),
	)[0].language_pretty;
	return languagePretty;
}

function getAttribute(object) {
	attribute_id++;
	let name = null;
	let value = null;

	if(object['@_type'] === 'termType') {
		name = object['@_type'];
		value = object['#text'];
	} else if (typeof object.descrip !== 'undefined') {
		name = object.descrip['@_type'];
		value = object.descrip['#text'];
	} else if (typeof object.note !== 'undefined') {
		name = 'note';
		value = object.note;
	}

	let queryParameters = `${concept_id}, ${term_id}, '${name}', '${value}'`;
	let queryParametersConcept = `${concept_id}, ${term_id}, '${attribute_id}'`;
	if (context === 'concept' || context === 'concept attribute') {
		queryParameters = `${concept_id}, NULL, '${name}', '${value}'`;
		queryParametersConcept = `${concept_id}, NULL, '${attribute_id}'`;
	}
	wsAttributes.write(`${queryParameters}\n`);
	wsConcepts.write(`${queryParametersConcept}\n`);
}

function getAttributes(object) {
	if (typeof object.descripGrp !== 'undefined') {
		if (context === 'concept') {
			context = 'concept attribute';
		} else if (context === 'term') {
			context = 'term attribute';
		}
		if (object.descripGrp instanceof Array === false) {
			getAttribute(object.descripGrp);
		} else {
			object.descripGrp.forEach((item) => {
				getAttribute(item);
			});
		}
	} else if(typeof object.termNote !== 'undefined') {
		context = 'term attribute';
		if (object.termNote instanceof Array === false) {
			getAttribute(object.termNote);
		} else {
			object.termNote.forEach((item) => {
				getAttribute(item);
			});
		}
	}
}

function getLanguageGroup(object) {
	currentLanguage = object['@_lang'];
	currentLanguageTableId = getLanguageIdFromLanguageCode(currentLanguage);
	getTermGroups(object);
}

function getLanguageGroups(object) {
	if (typeof object.langSet !== 'undefined') {
		if (object.langSet instanceof Array === false) {
			getLanguageGroup(object.langSet);
		} else {
			object.langSet.forEach((item) => {
				getLanguageGroup(item);
			});
		}
	}
}

function getTerm(object) {
	// const term = object.term.replace(regex, escaper);
	const term = object.term;
	const language_table_id = currentLanguageTableId;
	term_id++;
	// const queryParameters = `'${term_id}', '${concept_id}', '${term}', ${language_table_id}`;
	const queryParameters = `'${concept_id}', '${term}', ${language_table_id}`;
	wsConcepts.write(`${concept_id}, ${term_id}, NULL\n`);
	wsTerms.write(`${queryParameters}\n`);
	getAttributes(object);
}

function getTermGroups(object) {
	if (typeof object.tig !== 'undefined') {
		// attribute_id = null;
		context = 'term';

		if (object.tig instanceof Array === false) {
			getTerm(object.tig);
		} else {
			object.tig.forEach((item) => {
				getTerm(item);
			});
		}
	}
}

function getConcept(object) {
	if (typeof object.termEntry !== 'undefined') {
		context = 'concept';
		concept_id++;

		getAttributes(object.termEntry);
		getLanguageGroups(object.termEntry);

		// Hier müssen alle Zuordnungen auf Konzeptebene wieder aufgehoben werden
		context = null;
		currentLanguage = null;
	}
}

function getConcepts(text) {
	// const conceptRegex = new RegExp(/<termEntry.*?>([\s\S]+?)<\/termEntry>/mg);
	const arrMatches = text.match(conceptRegex);
	arrMatches.forEach((conceptGrp) => {
		const jsonObj = fastXmlParser.parse(conceptGrp, options);
		getConcept(jsonObj);
	});
}



function processFile(file) {
	let data = '';
	const readerStream = fs.createReadStream(file);
	// Handle stream events --> data, end, and error
	readerStream.on('data', (chunk) => {
		data += chunk;
		// data = chunk.toString('utf8');

		getConcepts(data);

		// data bleibt nur nach dem letzten Eintrag erhalten
		var dataSplit = data.split(/<\/termEntry>/);
		data = dataSplit[dataSplit.length-1];
	});

	readerStream.on('end', () => {
		return "concept_id";
	});

	wsConcepts.on('close', () => { console.log('Ende Konzeptst'); });
	wsAttributes.on('close', () => { console.log('Ende Attributstrom'); });

	readerStream.on('error', (err) => {
		console.log(err.stack);
	});
}

//const file = "../data/IATE_export_29012018.tbx";
const file = "../data/export.xml";
const wsConcepts = fs.createWriteStream(`${file}.concepts.csv`);
const wsTerms = fs.createWriteStream(`${file}.terms.csv`);
const wsAttributes = fs.createWriteStream(`${file}.attributes.csv`);

const conceptRegex = new RegExp(/<termEntry.*?>([\s\S]+?)<\/termEntry>/mg);

let context = '';
let currentLanguage = null;
let currentLanguageTableId = null;
let concept_id = null;
let term_id = null;
let attribute_id = null;

processFile(file);	