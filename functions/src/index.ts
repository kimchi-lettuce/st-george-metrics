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
import { db, admin } from './utils/db'
import { z } from 'zod'

// Start writing functions
// https://firebase.google.com/docs/functions/typescript

export const helloWorld = onRequest(
	{ region: 'australia-southeast1' },
	async (request, response) => {
		logger.info('Hello from Firebase!')
		response.send('Hello from Firebase! 🙂')
	}
)

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
export const updateUsers = onRequest(
	{ region: 'australia-southeast1' },
	async (request, response) => {
		if (request.method !== 'POST') {
			response
				.status(405)
				.send('Method Not Allowed. Needs to be a POST request')
			return
		}

		try {
			const requestBody = UpdateUsersZodSchema.parse(request.body)

			// Check for conflicting users
			const uniqueUserNames = new Set()
			const conflictingUsers = new Set()

			for (const user of requestBody) {
				const username = user.name.toLocaleLowerCase().trim()
				if (uniqueUserNames.has(username)) {
					conflictingUsers.add(username)
					continue
				}
				uniqueUserNames.add(username)
			}
			if (conflictingUsers.keys.length > 0) {
				logger.error(
					`Conflicting users found: ${JSON.stringify([
						...conflictingUsers
					])}`
				)
				throw new Error('Conflicting users found')
			}

			// First get all the existing users
			const existingUsers = await db.users.getAllDocs()

			// We create the user doc based on their full name in lowercase

			// If successful, requestBody is now typed as UsersFromRequest
			for (const { QR, congregation, dgroup, name } of requestBody) {
				// Your logic here...

				// If the user exists, then we are running an update
				if (
					existingUsers.find(user => user.fullNameLowercase === name)
				) {
					// TODO: handle the case to see if the user has changed
					logger.log('User already found!')
					continue
				}

				db.users.query().where('', '==', 'yo').get()

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
				response
					.status(400)
					.send(`Invalid request body ${error.errors}`)
			} else {
				// Handle other errors
				logger.error('An error occurred', error)
				response.status(500).send(`Internal Server Error ${error}`)
			}
		}
	}
)

/** Called by the google-scripts function to update the users in the database */
export const generateMetrics = onRequest(
	{ region: 'australia-southeast1' },
	async (request, response) => {
		if (request.method !== 'POST') {
			response
				.status(405)
				.send('Method Not Allowed. Needs to be a POST request')
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
	}
)
