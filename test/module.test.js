const { test } = require("node:test");
const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { join } = require("node:path");

const root = join(__dirname, "..");
const source = readFileSync(join(root, "MMM-Birthdays.js"), "utf8");
const load = (lang) => JSON.parse(readFileSync(join(root, "translations", `${lang}.json`), "utf8"));

test("les traductions fr et en ont les mêmes clés", () => {
	assert.deepEqual(Object.keys(load("fr")).sort(), Object.keys(load("en")).sort());
});

test("chaque clé traduite dans le module existe dans les traductions", () => {
	const used = new Set([...source.matchAll(/translate\("([A-Z_]+)"/g)].map((m) => m[1]));
	used.add("TODAY").add("TOMORROW").add("IN_DAYS"); // produced by whenLabel()
	for (const lang of ["fr", "en"]) {
		const keys = load(lang);
		for (const key of used) assert.ok(keys[key], `${lang}: ${key} manquante`);
	}
});

test("les variables des traductions correspondent à celles fournies par le module", () => {
	for (const lang of ["fr", "en"]) {
		const t = load(lang);
		assert.match(t.IN_DAYS, /\{n\}/, lang);
		assert.match(t.TURNS, /\{age\}/, lang);
	}
});

test("le module n'insère jamais de HTML (textContent uniquement)", () => {
	assert.doesNotMatch(source, /innerHTML|insertAdjacentHTML|outerHTML/);
});

test("le module enregistre ses fichiers de logique, de style et de traduction", () => {
	assert.match(source, /this\.file\("birthdays\.js"\)/);
	assert.match(source, /"MMM-Birthdays\.css"/);
	assert.match(source, /translations\/fr\.json/);
});
