/**
 * Import function triggers from their respective submodules:
 *
 * import {onCall} from "firebase-functions/v2/https";
 * import {onDocumentWritten} from "firebase-functions/v2/firestore";
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */

import { onRequest } from 'firebase-functions/v2/https'
import * as logger from 'firebase-functions/logger'
import { admin, Config, db, DocDataWithIdAndRef, Users } from './utils/db'
import { z } from 'zod'

// TODO: note, the first column is often not just the ".", but other different
// characters too. Hence, I'll need to update the google-scripts

// Ensure that the request body is an array of objects with the following
// schema. If not, return a 400 response with an error message.
const UpdateUsersZodSchema = z.array(
	z.object({
		QR: z.string(),
		name: z.string(),
		congregation: z.string(),
		dgroup: z.string()
	})
)

export type UpdateUsersRequestBody = z.infer<typeof UpdateUsersZodSchema>

/** This is needed so that the google-scripts function knows from which entry,
 * to send the attendance data for */
export const getLatestAttendanceEntryDate = onRequest({ region: 'australia-southeast1' }, async (request, response) => {
	const latestAttendanceDate = (await db.attendance.query().orderBy('date', 'desc').limit(1).get())?.at(0)?.date
	if (!latestAttendanceDate) {
		// Add error handling here
		response.status(500).send('No latest attendance date found')
		return
	}
	response.send({ message: 'Processed GET request!!', latestAttendanceDate: latestAttendanceDate })
	return
})

/** Called by the google-scripts function to update the users in the database */
export const updateUsers = onRequest({ region: 'australia-southeast1' }, async (request, response) => {
	if (request.method !== 'POST') {
		response.status(405).send('Method Not Allowed. Needs to be a POST request')
		return
	}

	try {
		const requestBody = UpdateUsersZodSchema.parse(request.body)

		// Check for conflicting users
		const uniqueUserNames = new Set()
		const conflictingUsers = new Set()

		/** Get the config blacklist */
		const configBlacklist = await (await db.config.get()).blacklistUsersForMetrics.filter(u => u.reason === 'DUPLICATE_FULLNAME_IN_USER_LIST').map(u => u.identity)

		for (const user of requestBody) {
			const username = user.name.toLocaleLowerCase().trim()
			// If the user is in the blacklist, then we skip them
			if (configBlacklist.includes(username)) {
				continue
			}

			// If the user is already in the set, then we have a conflict
			if (uniqueUserNames.has(username)) {
				conflictingUsers.add(username)
				continue
			}
			uniqueUserNames.add(username)
		}
		if (conflictingUsers.size > 0) {
			const conflictUsersStr = JSON.stringify([...conflictingUsers])
			logger.error(`Conflicting users found: ${conflictUsersStr}`)
			throw new Error(`Conflicting users found: ${conflictUsersStr}`)
		}

		// First get all the existing users
		const existingUsers = await db.users.getAllDocs()

		// We create the user doc based on their full name in lowercase

		// If successful, requestBody is now typed as UsersFromRequest
		for (const { QR, congregation, dgroup, name } of requestBody) {
			// Your logic here...

			// If the user exists, then we are running an update
			if (existingUsers.find(user => user.fullNameLowercase === name)) {
				// TODO: handle the case to see if the user has changed
				logger.log('User already found!')
				continue
			}

			// Otherwise, we are running an insert
			await db.users.add({
				cardQrCode: QR,
				fullNameLowercase: name.toLowerCase().trim()
			})
		}
		response.send('Processed POST request!!')
	} catch (error) {
		if (error instanceof z.ZodError) {
			// Handle validation errors
			logger.error('Validation of request.body failed', error.errors)
			response.status(400).send(`Invalid request body ${error.errors}`)
		} else {
			// Handle other errors
			logger.error('An error occurred', error)
			response.status(500).send(`Internal Server Error ${error}`)
		}
	}
})

// Ensure that the request body is an array of objects with the following
// schema. If not, return a 400 response with an error message.
const UpdateAttendanceZodSchema = z.array(
	z.object({
		timestamp: z.number(),
		QRcode: z.string().nullable(),
		fullnameLowercase: z.string().nullable()
	})
)

/** Used to take the attendance data from the excel sheet and update the
 * attendance records in the database
 *
 * Known Bug: Full names are not unique. This means if a newcomer has the exact
 * same name as someone already in the list, then their attendance entry will go
 * to the user with that same full name */
export const updateAttendance = onRequest({ region: 'australia-southeast1' }, async (request, response) => {
	if (request.method !== 'POST') {
		response.status(405).send('Method Not Allowed. Needs to be a POST request')
		return
	}
	// Note we don't need to wrap this in a transaction. It's fine if we have an
	// error in the middle of the process. We can just start from the latest
	// attendance date and go from there
	try {
		const requestBody = UpdateAttendanceZodSchema.parse(request.body)
		const users = await db.users.getAllDocs()

		for (const entry of requestBody) {
			// Note: The entry is often either just the
			const { timestamp, QRcode, fullnameLowercase } = entry

			let user: DocDataWithIdAndRef<Users> | null = null

			// Identify the user-id. Either by the QR code or the full name
			// provided
			if (QRcode) {
				user = users.find(u => u.cardQrCode === QRcode) ?? null
			} else if (fullnameLowercase) {
				user = users.find(u => u.fullNameLowercase === fullnameLowercase) ?? null
			}

			// Here if the user is not currently found (most likely a newcomer),
			// since they aren't in the main list of users. And so, we want to
			// add them to the list. But if a name is already in the list, then
			// we want to add them to the blacklist
			if (!user) {
				await db.config.ref.update({
					attendanceEntryUserNotFound: admin.firestore.FieldValue.arrayUnion({
						timestamp,
						fullnameLowercase,
						QRcode
					} as Config['attendanceEntryUserNotFound'][number])
				})
				continue
			}

			const { cardQrCode, fullNameLowercase } = user
			await db.attendance.add({
				date: admin.firestore.Timestamp.fromMillis(timestamp),
				uid: user.id,
				// The QRcode and fullnameLowercase are optional, but as
				// additional info to help with debugging when looking at the
				// attendance document
				QRcode: cardQrCode,
				fullnameLowercase: fullNameLowercase
			})
		}
		response.send('Processed updateAttendance successfully!')
	} catch (error) {
		if (error instanceof z.ZodError) {
			// Handle validation errors
			logger.error('Validation of request.body failed', error.errors)
			response.status(400).send(`Invalid request body ${error.errors}`)
		} else {
			// Handle other errors
			logger.error('An error occurred', error)
			response.status(500).send(`Internal Server Error ${error}`)
		}
	}
})

/** Called by the google-scripts function to update the users in the database */
export const generateMetrics = onRequest({ region: 'australia-southeast1' }, async (request, response) => {
	if (request.method !== 'POST') {
		response.status(405).send('Method Not Allowed. Needs to be a POST request')
		return
	}

	// Ensure that the request body is an array of objects with the following
	// schema. If not, return a 400 response with an error message.
	const UsersFromRequestSchema = z.array(
		z.object({
			QR: z.string(),
			name: z.string(),
			congregation: z.string(),
			dgroup: z.string()
		})
	)

	try {
		//
	} catch (error) {
		if (error instanceof z.ZodError) {
			// Handle validation errors
			logger.error('Validation of request.body failed', error.errors)
			response.status(400).send('Invalid request body')
		} else {
			// Handle other errors
			logger.error('An error occurred', error)
			response.status(500).send(`Internal Server Error ${error}`)
		}
	}
})
