const SHEET_NAME = "All Responses"

function getUsers() {
  var spreadsheet = SpreadsheetApp.getActiveSpreadsheet()

  // Get the sheet named "All Responses"
  var sheet = spreadsheet.getSheetByName("2024 - AZ")

  // Start on
  // - 4th row
  // - 1st column
  // - for "x" rows
  // - grabbing the "y" columns
  var rows = sheet.getRange(4, 1, sheet.getLastRow() - 1, 2).getValues()

  const ans = {}
  for (const row of rows) {
    if (row[0] === "") continue
    ans[row[0]] = row[1]
  }
  return ans
}

function writeToTestSheet(ans) {
  // Get the active spreadsheet
  var spreadsheet = SpreadsheetApp.getActiveSpreadsheet()

  // Try to get the "Test" sheet, if it doesn't exist, create it
  var testSheet = spreadsheet.getSheetByName("test")
  if (!testSheet) {
    testSheet = spreadsheet.insertSheet("test")
  } else {
    // Clear the existing content if the sheet already exists
    testSheet.clear()
  }

  // Prepare an array to write to the sheet. Start with headers.
  var dataToWrite = [["Time", "Name"]]

  // Fill the array with data from ans
  for (var i = 0; i < ans.length; i++) {
    dataToWrite.push([ans[i].time, ans[i].name])
  }

  // Write the data to the "Test" sheet, starting at the first row and first column
  testSheet
    .getRange(1, 1, dataToWrite.length, dataToWrite[0].length)
    .setValues(dataToWrite)
}

function main() {
  const users = getUsers()

  // Get the current active spreadsheet
  var spreadsheet = SpreadsheetApp.getActiveSpreadsheet()

  // Get the sheet named "All Responses"
  var sheet = spreadsheet.getSheetByName(SHEET_NAME)

  const START_ROW = 2
  const NUM_ROWS = 10

  // Read the first row's data
  var rows = sheet
    .getRange(START_ROW, 1, NUM_ROWS, sheet.getLastColumn())
    .getValues()

  const ans = []
  for (const row of rows) {
    const time = row[0]
    const qrCode = row[1]
    if (qrCode === ".") continue
    const name = users[qrCode]

    console.log({ time, name })
    ans.push({
      time,
      name,
    })
  }
  writeToTestSheet(ans)
  return ans
}
