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

// Start writing functions
// https://firebase.google.com/docs/functions/typescript

export const helloWorld = onRequest({ region: 'australia-southeast1' }, async (request, response) => {
	logger.info('Hello from Firebase!')
	response.send('Hello from Firebase! 🙂')
})

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

export const updateAttendance = onRequest({ region: 'australia-southeast1' }, async (request, response) => {
	if (request.method !== 'POST') {
		response.status(405).send('Method Not Allowed. Needs to be a POST request')
		return
	}

	try {
		const requestBody = UpdateAttendanceZodSchema.parse(request.body)
		const users = await db.users.getAllDocs()
		const blacklist = (await db.config.get()).blacklistUsersForMetrics

		let latestAttendanceDate: Date | null = null
		for (const entry of requestBody) {
			const { timestamp, QRcode, fullnameLowercase } = entry

			let user: DocDataWithIdAndRef<Users> | null = null
			// Identify the user-id
			if (QRcode) {
				user = users.find(u => u.cardQrCode === QRcode) ?? null
			} else if (fullnameLowercase) {
				user = users.find(u => u.fullNameLowercase === fullnameLowercase) ?? null
			}
			if (!user) {
				// Check if they are already in the blacklist
				const blacklistNames = blacklist.filter(u => u.reason === 'ATTENDANCE_NOT_MATCHING_TO_USER').map(u => u.identity)
				const fullNameNotInBlackList = fullnameLowercase && !blacklistNames.includes(fullnameLowercase)
				const QRNotInBlackList = QRcode && !blacklistNames.includes(QRcode)

				let identity = ''
				if (fullNameNotInBlackList) {
					identity = fullnameLowercase
				} else if (QRNotInBlackList) {
					identity = QRcode
				}

				// TODO: potentially add a backlog of the error attendance
				// entries, so that we can retry them after a fix for their
				// identity is made

				await db.config.ref.update({
					blacklistUsersForMetrics: admin.firestore.FieldValue.arrayUnion({
						identity,
						reason: 'ATTENDANCE_NOT_MATCHING_TO_USER'
					} as Config['blacklistUsersForMetrics'][number])
				})
				continue
			}

			const date = new Date(timestamp)
			// Update the latest attendance date
			if (!latestAttendanceDate || date > latestAttendanceDate) {
				latestAttendanceDate = date
			}
			const { cardQrCode, fullNameLowercase } = user
			await db.attendance.add({
				date: admin.firestore.Timestamp.fromDate(date),
				uid: user.id,
				QRcode: cardQrCode,
				fullnameLowercase: fullNameLowercase
			})
		}
		await db.appSettings.ref.update({
			// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
			latestAttendanceDate: admin.firestore.Timestamp.fromDate(latestAttendanceDate!)
		})
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
