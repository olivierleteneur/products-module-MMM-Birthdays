const { test } = require("node:test");
const assert = require("node:assert/strict");
const {
	parseBirthday, nextOccurrence, daysBetween, upcomingBirthdays, whenLabel, msUntilMidnight,
} = require("../birthdays.js");

// Fixed local dates: tests never depend on the real clock.
const day = (y, m, d) => new Date(y, m - 1, d);
const ymd = (date) => [date.getFullYear(), date.getMonth() + 1, date.getDate()];
// Assigning undefined to process.env.TZ would store the string "undefined" (read as UTC).
const restoreTz = (saved) => { if (saved === undefined) delete process.env.TZ; else process.env.TZ = saved; };

// --- parseBirthday ----------------------------------------------------------------

test("parseBirthday lit une date complète", () => {
	assert.deepEqual(parseBirthday("1990-05-15"), { year: 1990, month: 5, day: 15 });
});

test("parseBirthday accepte une date sans année", () => {
	assert.deepEqual(parseBirthday("--05-15"), { year: null, month: 5, day: 15 });
});

test("parseBirthday accepte le 29 février d'une année bissextile, et lui seul", () => {
	assert.deepEqual(parseBirthday("2000-02-29"), { year: 2000, month: 2, day: 29 });
	assert.equal(parseBirthday("2001-02-29"), null);
	assert.deepEqual(parseBirthday("--02-29"), { year: null, month: 2, day: 29 });
});

test("parseBirthday rejette les dates invalides", () => {
	for (const value of ["2023-02-30", "1990-13-01", "1990-00-10", "15/05/1990", "abc", "", null, 19900515]) {
		assert.equal(parseBirthday(value), null, String(value));
	}
});

test("parseBirthday ne décale jamais le jour, quel que soit le fuseau (bug de la v1)", () => {
	const saved = process.env.TZ;
	try {
		for (const tz of ["Europe/Paris", "America/New_York", "Pacific/Auckland"]) {
			process.env.TZ = tz;
			const { month, day: d } = parseBirthday("1990-05-15");
			assert.deepEqual([month, d], [5, 15], tz);
		}
	} finally {
		restoreTz(saved);
	}
});

// --- nextOccurrence / daysBetween ------------------------------------------------------

test("nextOccurrence : plus tard dans l'année, aujourd'hui même, ou l'an prochain", () => {
	const may15 = { month: 5, day: 15 };
	assert.deepEqual(ymd(nextOccurrence(may15, day(2026, 1, 10))), [2026, 5, 15]);
	assert.deepEqual(ymd(nextOccurrence(may15, day(2026, 5, 15))), [2026, 5, 15]);
	assert.deepEqual(ymd(nextOccurrence(may15, day(2026, 5, 16))), [2027, 5, 15]);
});

test("nextOccurrence : un 29 février se fête le 28 les années non bissextiles", () => {
	const feb29 = { month: 2, day: 29 };
	assert.deepEqual(ymd(nextOccurrence(feb29, day(2027, 1, 10))), [2027, 2, 28]);
	assert.deepEqual(ymd(nextOccurrence(feb29, day(2028, 1, 10))), [2028, 2, 29]);
});

test("daysBetween compte des jours calendaires, même au passage à l'heure d'été", () => {
	const saved = process.env.TZ;
	try {
		process.env.TZ = "Europe/Paris";
		assert.equal(daysBetween(day(2026, 3, 28), day(2026, 3, 30)), 2);
		assert.equal(daysBetween(day(2026, 12, 31), day(2027, 1, 1)), 1);
		assert.equal(daysBetween(day(2026, 5, 15), day(2026, 5, 15)), 0);
	} finally {
		restoreTz(saved);
	}
});

// --- upcomingBirthdays ---------------------------------------------------------------------

const people = [
	{ name: "Winston Churchill", date: "1874-11-30" },
	{ name: "Barack Obama", date: "1961-08-04" },
	{ name: "Ana", date: "1990-08-04" },
	{ name: "Sans année", date: "--08-10" },
	{ name: "Charles de Gaulle", date: "1890-11-22" },
];
const aug4 = () => day(2026, 8, 4); // built inside each test, in the current time zone

test("upcomingBirthdays trie par proximité puis par nom, avec jours restants et âge atteint", () => {
	const { items } = upcomingBirthdays(people, aug4(), { maxDays: 365, limit: 0 });
	assert.deepEqual(items.map((b) => [b.name, b.days, b.age]), [
		["Ana", 0, 36],
		["Barack Obama", 0, 65],
		["Sans année", 6, null],
		["Charles de Gaulle", 110, 136],
		["Winston Churchill", 118, 152],
	]);
	assert.deepEqual(ymd(items[3].date), [2026, 11, 22]);
});

test("upcomingBirthdays respecte la fenêtre maxDays et la limite", () => {
	assert.deepEqual(upcomingBirthdays(people, aug4(), { maxDays: 10, limit: 0 }).items.map((b) => b.name),
		["Ana", "Barack Obama", "Sans année"]);
	assert.deepEqual(upcomingBirthdays(people, aug4(), { maxDays: 365, limit: 2 }).items.map((b) => b.name),
		["Ana", "Barack Obama"]);
});

test("upcomingBirthdays passe le cap du 31 décembre", () => {
	const { items } = upcomingBirthdays([{ name: "Jour de l'an", date: "2000-01-01" }], day(2026, 12, 31));
	assert.deepEqual([items[0].days, items[0].age, ymd(items[0].date)], [1, 27, [2027, 1, 1]]);
});

test("upcomingBirthdays écarte et signale les entrées invalides sans planter", () => {
	const { items, invalid } = upcomingBirthdays([
		{ name: "Ok", date: "2000-06-01" },
		{ name: "Date fausse", date: "2000-02-30" },
		{ name: "", date: "2000-06-01" },
		{ date: "2000-06-01" },
		null,
		"texte",
	], day(2026, 5, 1), { maxDays: 365, limit: 0 });
	assert.deepEqual(items.map((b) => b.name), ["Ok"]);
	assert.equal(invalid.length, 5);
});

test("upcomingBirthdays avec une liste vide ou absente", () => {
	assert.deepEqual(upcomingBirthdays([], day(2026, 1, 1)), { items: [], invalid: [] });
	assert.deepEqual(upcomingBirthdays(undefined, day(2026, 1, 1)), { items: [], invalid: [] });
});

// --- whenLabel / msUntilMidnight -------------------------------------------------------------

test("whenLabel choisit la clé de traduction selon le nombre de jours", () => {
	assert.deepEqual(whenLabel(0), { key: "TODAY", vars: {} });
	assert.deepEqual(whenLabel(1), { key: "TOMORROW", vars: {} });
	assert.deepEqual(whenLabel(12), { key: "IN_DAYS", vars: { n: 12 } });
});

test("msUntilMidnight compte jusqu'au prochain minuit local", () => {
	assert.equal(msUntilMidnight(new Date(2026, 4, 15, 23, 59, 30)), 30_000);
	assert.equal(msUntilMidnight(new Date(2026, 4, 15, 0, 0, 0, 0)), 86_400_000);
});
