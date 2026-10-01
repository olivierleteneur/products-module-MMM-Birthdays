const { test } = require("node:test");
const assert = require("node:assert/strict");
const {
	parseBirthday, nextOccurrence, daysBetween, upcomingBirthdays, whenLabel, msUntilMidnight,
} = require("../birthdays.js");

// Fixed local dates: tests never depend on the real clock.
const day = (y, m, d) => new Date(y, m - 1, d);
const ymd = (date) => [date.getFullYear(), date.getMonth() + 1, date.getDate()];

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
		process.env.TZ = saved;
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
		process.env.TZ = saved;
	}
});

// --- upcomingBirthdays ---------------------------------------------------------------------

const people = [
	{ name: "Yvonne", date: "1980-08-28" },
	{ name: "Basile", date: "2016-03-19" },
	{ name: "Ana", date: "1990-03-19" },
	{ name: "Sans année", date: "--03-25" },
	{ name: "Hector", date: "2019-04-17" },
];

test("upcomingBirthdays trie par proximité puis par nom, avec jours restants et âge atteint", () => {
	const { items } = upcomingBirthdays(people, day(2026, 3, 19), { maxDays: 365, limit: 0 });
	assert.deepEqual(items.map((b) => [b.name, b.days, b.age]), [
		["Ana", 0, 36],
		["Basile", 0, 10],
		["Sans année", 6, null],
		["Hector", 29, 7],
		["Yvonne", 162, 46],
	]);
	assert.deepEqual(ymd(items[3].date), [2026, 4, 17]);
});

test("upcomingBirthdays respecte la fenêtre maxDays et la limite", () => {
	const today = day(2026, 3, 19);
	assert.deepEqual(upcomingBirthdays(people, today, { maxDays: 10, limit: 0 }).items.map((b) => b.name),
		["Ana", "Basile", "Sans année"]);
	assert.deepEqual(upcomingBirthdays(people, today, { maxDays: 365, limit: 2 }).items.map((b) => b.name),
		["Ana", "Basile"]);
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
