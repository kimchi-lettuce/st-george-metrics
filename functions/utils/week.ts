import { formatISO, startOfWeek } from 'date-fns'

/** Generate a week ID for the given date */
export function generateWeekId(date = new Date()) {
	// Get the start of the week for the given date according to ISO 8601 (Monday)
	const startOfWeekDate = startOfWeek(date, { weekStartsOn: 1 })
	// Format the date as `YYYY-WW`
	const weekId =
		formatISO(startOfWeekDate, { representation: 'date' }).slice(0, 4) +
		'-' +
		formatISO(startOfWeekDate, { representation: 'date' }).slice(5, 7)

	return weekId
}
