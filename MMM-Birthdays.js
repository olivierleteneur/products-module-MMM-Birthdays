Module.register('MMM-Birthdays', {
	// Default module config
	defaults: {
		updateInterval: 24 * 60 * 60 * 1000, // Update daily
		animationSpeed: 1000,
		birthdays: [
			// Example birthday entries
			{ name: "John Doe", date: "1990-05-15" },
			{ name: "Jane Smith", date: "1985-11-22" }
		]
	},

	// Define required scripts
	getScripts: function() {
		return [];
	},

	// Define required styles
	getStyles: function() {
		return ['MMM-Birthdays.css'];
	},

	// Override dom generator
	getDom: function() {
		const wrapper = document.createElement('div');
		wrapper.className = 'birthday-container';

		// If no birthdays, show a message
		if (this.config.birthdays.length === 0) {
			wrapper.innerHTML = 'No upcoming birthdays';
			return wrapper;
		}

		// Create birthday list
		const table = document.createElement('table');
		table.className = 'birthday-table';

		// Table header
		const headerRow = table.insertRow();
		const nameHeader = headerRow.insertCell();
		const dateHeader = headerRow.insertCell();
		nameHeader.textContent = 'Name';
		dateHeader.textContent = 'Birthday';
		nameHeader.className = 'birthday-name-header';
		dateHeader.className = 'birthday-date-header';

		// Populate birthdays
		this.config.birthdays.forEach(birthday => {
			const row = table.insertRow();
			const nameCell = row.insertCell();
			const dateCell = row.insertCell();

			nameCell.textContent = birthday.name;
			dateCell.textContent = this.formatBirthday(birthday.date);

			nameCell.className = 'birthday-name';
			dateCell.className = 'birthday-date';
		});

		wrapper.appendChild(table);
		return wrapper;
	},

	// Helper method to format birthday
	formatBirthday: function(dateString) {
		const date = new Date(dateString);
		return date.toLocaleDateString('en-US', { 
			month: 'long', 
			day: 'numeric' 
		});
	},

	// Optional: Notification handler
	socketNotificationReceived: function(notification, payload) {
		// Handle any socket notifications if needed
		console.log('Notification received:', notification, payload);
	},

	// Module init
	start: function() {
		// Optional: Set up any initial processes
		console.log('Birthday module started');
	}
});