/**
 * Import function triggers from their respective submodules:
 *
 * import {onCall} from "firebase-functions/v2/https";
 * import {onDocumentWritten} from "firebase-functions/v2/firestore";
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */

import { onRequest } from "firebase-functions/v2/https"
import * as logger from "firebase-functions/logger"
import { db, admin } from "../utils/db"
import { z } from "zod"

// Start writing functions
// https://firebase.google.com/docs/functions/typescript

export const helloWorld = onRequest(async (request, response) => {
  logger.info("Hello logs!", { structuredData: true })

  const ans = await admin.firestore().collection("attendance").get()
  logger.info("🥬", ans.docs)
  response.send("Hello from Firebase!")
})

const UsersFromRequestSchema = z.array(
  z.object({
    QR: z.string(),
    name: z.string(),
    congregation: z.string(),
    dgroup: z.string(),
  })
)

export const updateUsers = onRequest(async (request, response) => {
  if (request.method !== "POST") {
    response.status(405).send("Method Not Allowed")
    return
  }

  try {
    // Attempt to parse and validate the request body against the schema
    const requestBody = UsersFromRequestSchema.parse(request.body)

    // If successful, requestBody is now typed as UsersFromRequest
    for (const user of requestBody) {
      console.log(user)
      // Your logic here...
    }

    response.send("Processed POST request!!")
  } catch (error) {
    if (error instanceof z.ZodError) {
      // Handle validation errors
      logger.error("Validation of request.body failed", error.errors)
      response.status(400).send("Invalid request body")
    } else {
      // Handle other errors
      logger.error("An error occurred", error)
      response.status(500).send("Internal Server Error")
    }
  }
})
