# MMM-Birthdays

A [MagicMirror²](https://magicmirror.builders/) module showing **upcoming** birthdays: closest first, with the number of days left and the age people are turning. Displayed in the mirror's language (English and French included) and date format.

![MMM-Birthdays on a mirror](screenshot.png)

## Installation

```bash
cd ~/MagicMirror/modules
git clone https://github.com/olivierleteneur/products-MagicMirror-Modules-Birthdays.git MMM-Birthdays
```

No dependency, nothing to build.

## Configuration

Add the module to `config/config.js`:

```js
{
  module: "MMM-Birthdays",
  position: "top_right",
  header: "Birthdays",
  config: {
    maxDays: 30,
    limit: 5,
    birthdays: [
      { name: "Ada", date: "1815-12-10" },
      { name: "Grace", date: "--12-09" }   // year unknown: no age shown
    ]
  }
},
```

| Option | Default | Description |
|---|---|---|
| `birthdays` | `[]` | `{ name, date }` entries. `date` is `YYYY-MM-DD`, or `--MM-DD` when the year is unknown |
| `maxDays` | `30` | Only show birthdays within this many days |
| `limit` | `5` | Maximum number of lines, `0` for no limit |
| `showAge` | `true` | Show the age people are turning (needs the birth year) |

Behaviour worth knowing:

- Today's birthday is highlighted, tomorrow's says "Tomorrow", later ones show the date.
- Someone born on February 29 is celebrated on February 28 in common years.
- Dates are read as written, so the day never shifts with the time zone.
- The list refreshes itself just after midnight.
- Invalid entries (`2023-02-30`, missing name...) are skipped and reported in the MagicMirror log instead of breaking the module.

## Development

```
birthdays.js        Pure logic: parsing, next occurrence, days left, age, sorting (no DOM)
MMM-Birthdays.js    MagicMirror module: builds the DOM with textContent only
translations/       en.json, fr.json
test/               node:test tests
```

```bash
npm test
```

Node 22+, no dependency. The tests cover date parsing (including leap years and time zones), year boundaries, daylight saving changes, sorting, limits, invalid entries and translation consistency. CI runs them on every push.

Released under the MIT License, see [LICENSE](LICENSE).
