const SHEET_NAME = 'All Responses'

function getUsers() {
	const spreadsheet = SpreadsheetApp.getActiveSpreadsheet()
	const sheet = spreadsheet.getSheetByName('test-users')

	// Start on
	// - 4th row
	// - 1st column
	// - for "x" rows
	// - grabbing the "y" columns
	const rows = sheet.getRange(4, 1, sheet.getLastRow() - 1, 3).getValues()

	const ans = []
	for (const row of rows) {
		if (row[1] === '') continue
		ans.push({
			QR: row[0],
			name: `${row[1]} ${row[2]}`.toLocaleLowerCase().trim(),
			congregation: 'st georges',
			dgroup: 'youth'
		})
	}
	return ans
}

function getAttendance() {
	const spreadsheet = SpreadsheetApp.getActiveSpreadsheet()
	const sheet = spreadsheet.getSheetByName('All Responses')

	const START_ROW = 2
	const START_COL = 1
	const NUM_ROWS = sheet.getLastRow() - 1
	const NUM_COLS = 4

	/** @type any[] */
	const rows = sheet.getRange(START_ROW, START_COL, NUM_ROWS, NUM_COLS).getValues()

	const ans = []

	// TODO: but what if the data was paused for a while. The question is, do I
	// need to explicity retrieve the latestAttendanceDate from the db?

	// Let's just grab two weeks of data from the first row
	const firstRowDate = new Date(rows[0][0])
	const twoWeeksBeforeFirstRowDate = new Date(firstRowDate.getTime() - 14 * 24 * 60 * 60 * 1000)

	for (const row of rows.splice(0, 10)) {
		/** @type Date */
		const date = row[0]
		if (date instanceof Date === false) throw new Error('row[0] is not a Date object')
		
		const QRcode = row[1]
		if (date < twoWeeksBeforeFirstRowDate) continue

		const fullnameLowercase = QRcode === '.' ? `${row[2]} ${row[3]}`.toLocaleLowerCase().trim() : null

		const rowData = {
			timestamp: date.getTime(),
			fullnameLowercase,
			QRcode: QRcode === '.' ? null : QRcode
		}
		ans.push(rowData)
	}
	console.log('Attendance Data Length for the 2 Weeks: ', ans.length)
	return ans
}

function writeToTestSheet(ans) {
	// Get the active spreadsheet
	var spreadsheet = SpreadsheetApp.getActiveSpreadsheet()

	// Try to get the "Test" sheet, if it doesn't exist, create it
	var testSheet = spreadsheet.getSheetByName('test')
	if (!testSheet) {
		testSheet = spreadsheet.insertSheet('test')
	} else {
		// Clear the existing content if the sheet already exists
		testSheet.clear()
	}

	// Prepare an array to write to the sheet. Start with headers.
	var dataToWrite = [['Time', 'Name']]

	// Fill the array with data from ans
	for (var i = 0; i < ans.length; i++) {
		dataToWrite.push([ans[i].time, ans[i].name])
	}

	// Write the data to the "Test" sheet, starting at the first row and first column
	testSheet.getRange(1, 1, dataToWrite.length, dataToWrite[0].length).setValues(dataToWrite)
}

async function main() {
	const users = getUsers()
	const attendance = getAttendance()

	try {
		// var options = {
		// 	method: 'post',
		// 	contentType: 'application/json',
		// 	// Convert the JavaScript object to a JSON string
		// 	payload: JSON.stringify(users),
		// 	// FIXME: ⚠️ Note that this prevents the error from being thrown.
		// 	// This is not a good practice.
		// 	muteHttpExceptions: true
		// }
		// const response = await UrlFetchApp.fetch(
		// 	'https://updateusers-llsapw72ka-ts.a.run.app/',
		// 	options
		// )
		// console.log(response.getContentText())

		var attendanceOptions = {
			method: 'post',
			contentType: 'application/json',
			payload: JSON.stringify(attendance),
			muteHttpExceptions: true
		}
		const attendanceResponse = await UrlFetchApp.fetch('https://updateattendance-llsapw72ka-ts.a.run.app', attendanceOptions)
		console.log(attendanceResponse.getContentText())
	} catch (err) {
		console.error(err.message)
	}

	// // Get the current active spreadsheet
	// http: var spreadsheet = SpreadsheetApp.getActiveSpreadsheet()

	// // Get the sheet named "All Responses"
	// var sheet = spreadsheet.getSheetByName(SHEET_NAME)

	// const START_ROW = 2
	// const NUM_ROWS = 10

	// // Read the first row's data
	// var rows = sheet
	// 	.getRange(START_ROW, 1, NUM_ROWS, sheet.getLastColumn())
	// 	.getValues()

	// const ans = []
	// for (const row of rows) {
	// 	const time = row[0]
	// 	const qrCode = row[1]
	// 	if (qrCode === '.') continue
	// 	const name = users[qrCode]

	// 	console.log({ time, name })
	// 	ans.push({
	// 		time,
	// 		name
	// 	})
	// }
	// writeToTestSheet(ans)
	// return ans
}
