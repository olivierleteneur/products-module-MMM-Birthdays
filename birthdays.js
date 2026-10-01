/* Pure birthday logic: no DOM, no MagicMirror, no clock (`today` is always a parameter).
 * Loaded by the module in the browser (global `BirthdayLogic`) and by node:test (CommonJS). */
(function (root, factory) {
	if (typeof module === "object" && module.exports) module.exports = factory();
	else root.BirthdayLogic = factory();
}(typeof self !== "undefined" ? self : this, function () {
	const DAY_MS = 24 * 60 * 60 * 1000;
	const PATTERN = /^(\d{4}|-)-(\d{2})-(\d{2})$/;

	const isLeap = (year) => (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
	const daysInMonth = (year, month) => new Date(year, month, 0).getDate();

	/** "YYYY-MM-DD" or "--MM-DD" (no year) into numbers, read as written: no time zone shift. */
	function parseBirthday(value) {
		if (typeof value !== "string") return null;
		const match = PATTERN.exec(value);
		if (!match) return null;
		const year = match[1] === "-" ? null : Number(match[1]);
		const month = Number(match[2]);
		const day = Number(match[3]);
		if (month < 1 || month > 12 || day < 1) return null;
		const maxDay = month === 2 && year === null ? 29 : daysInMonth(year ?? 2001, month);
		return day <= maxDay ? { year, month, day } : null;
	}

	/** Next local date of the birthday, today included. Feb 29 falls on Feb 28 in common years. */
	function nextOccurrence({ month, day }, today) {
		const at = (year) => new Date(year, month - 1, month === 2 && day === 29 && !isLeap(year) ? 28 : day);
		const start = new Date(today.getFullYear(), today.getMonth(), today.getDate());
		const thisYear = at(start.getFullYear());
		return thisYear >= start ? thisYear : at(start.getFullYear() + 1);
	}

	/** Calendar days between two local dates, unaffected by daylight saving changes. */
	function daysBetween(from, to) {
		const utc = (d) => Date.UTC(d.getFullYear(), d.getMonth(), d.getDate());
		return Math.round((utc(to) - utc(from)) / DAY_MS);
	}

	/**
	 * Birthdays within `maxDays`, closest first (then by name), at most `limit` (0 = no limit).
	 * Invalid entries are returned apart so the module can log them instead of crashing.
	 */
	function upcomingBirthdays(list, today, { maxDays = 30, limit = 5 } = {}) {
		const items = [];
		const invalid = [];
		for (const entry of Array.isArray(list) ? list : []) {
			const parsed = entry && typeof entry.name === "string" && entry.name.trim() ? parseBirthday(entry.date) : null;
			if (!parsed) {
				invalid.push(entry);
				continue;
			}
			const date = nextOccurrence(parsed, today);
			const days = daysBetween(today, date);
			if (days <= maxDays) {
				items.push({ name: entry.name.trim(), date, days, age: parsed.year === null ? null : date.getFullYear() - parsed.year });
			}
		}
		items.sort((a, b) => a.days - b.days || a.name.localeCompare(b.name));
		return { items: limit > 0 ? items.slice(0, limit) : items, invalid };
	}

	/** Translation key (and variables) describing when the birthday is. */
	function whenLabel(days) {
		if (days === 0) return { key: "TODAY", vars: {} };
		if (days === 1) return { key: "TOMORROW", vars: {} };
		return { key: "IN_DAYS", vars: { n: days } };
	}

	function msUntilMidnight(now) {
		const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
		return midnight - now;
	}

	return { parseBirthday, nextOccurrence, daysBetween, upcomingBirthdays, whenLabel, msUntilMidnight };
}));
