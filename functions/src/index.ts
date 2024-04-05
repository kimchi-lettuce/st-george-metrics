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
import { db, admin } from '../utils/db'
import { z } from 'zod'

// Start writing functions
// https://firebase.google.com/docs/functions/typescript

export const helloWorld = onRequest(async (request, response) => {
	logger.info('Hello from Firebase!')
	response.send('Hello from Firebase! 🙂')
})

export const updateUsers = onRequest(async (request, response) => {
	if (request.method !== 'POST') {
		response
			.status(405)
			.send('Method Not Allowed. Needs to be a POST request')
		return
	}

	const UsersFromRequestSchema = z.array(
		z.object({
			QR: z.string(),
			name: z.string(),
			congregation: z.string(),
			dgroup: z.string()
		})
	)

	try {
		const requestBody = UsersFromRequestSchema.parse(request.body)

		// First get all the existing users
		const existingUsers = await db.users.getAllDocs()

		const test = await db.users
			.query()
			.where('dGroup', '==', '4pm')
			.where('cardQrCodes', '==', ['hi'])
			.get()

		// Attempt to parse and validate the request body against the schema

		// If successful, requestBody is now typed as UsersFromRequest
		for (const { QR, congregation, dgroup, name } of requestBody) {
			// Your logic here...
		}

		response.send('Processed POST request!!')
	} catch (error) {
		if (error instanceof z.ZodError) {
			// Handle validation errors
			logger.error('Validation of request.body failed', error.errors)
			response.status(400).send('Invalid request body')
		} else {
			// Handle other errors
			logger.error('An error occurred', error)
			response.status(500).send('Internal Server Error')
		}
	}
})
