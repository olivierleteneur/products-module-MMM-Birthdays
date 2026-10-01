/* MagicMirror² module: upcoming birthdays. The logic lives in birthdays.js (tested with node:test);
 * this file only builds the DOM, with textContent only. */
Module.register("MMM-Birthdays", {
	defaults: {
		birthdays: [], // [{ name: "Ada", date: "1815-12-10" }], or "--12-10" when the year is unknown
		maxDays: 30,   // only show birthdays within this many days
		limit: 5,      // maximum number of lines, 0 for no limit
		showAge: true
	},

	getScripts() {
		return [this.file("birthdays.js")];
	},

	getStyles() {
		return ["MMM-Birthdays.css"];
	},

	getTranslations() {
		return { en: "translations/en.json", fr: "translations/fr.json" };
	},

	start() {
		this.scheduleMidnightUpdate();
	},

	// Refresh just after midnight: "tomorrow" becomes "today", ages change.
	scheduleMidnightUpdate() {
		setTimeout(() => {
			this.updateDom();
			this.scheduleMidnightUpdate();
		}, BirthdayLogic.msUntilMidnight(new Date()) + 1000);
	},

	getDom() {
		const wrapper = document.createElement("div");
		wrapper.className = "birthday-container small";
		const { items, invalid } = BirthdayLogic.upcomingBirthdays(this.config.birthdays, new Date(), {
			maxDays: this.config.maxDays,
			limit: this.config.limit
		});
		if (invalid.length > 0) {
			Log.warn(`${this.name}: ${invalid.length} invalid entr${invalid.length > 1 ? "ies" : "y"} ignored`, invalid);
		}

		if (items.length === 0) {
			wrapper.classList.add("dimmed");
			wrapper.textContent = this.translate("NO_UPCOMING");
			return wrapper;
		}

		const locale = config.locale || config.language;
		const table = document.createElement("table");
		table.className = "birthday-table";
		for (const birthday of items) {
			const row = table.insertRow();
			if (birthday.days === 0) row.className = "birthday-today bright";

			const name = row.insertCell();
			name.className = "birthday-name";
			name.textContent = birthday.name;
			if (this.config.showAge && birthday.age !== null) {
				const age = document.createElement("span");
				age.className = "birthday-age dimmed";
				age.textContent = ` ${this.translate("TURNS", { age: birthday.age })}`;
				name.appendChild(age);
			}

			const when = BirthdayLogic.whenLabel(birthday.days);
			const date = row.insertCell();
			date.className = "birthday-date";
			date.textContent = birthday.days > 1
				? birthday.date.toLocaleDateString(locale, { day: "numeric", month: "long" })
				: this.translate(when.key, when.vars);
			date.title = this.translate(when.key, when.vars);
		}
		wrapper.appendChild(table);
		return wrapper;
	}
});
