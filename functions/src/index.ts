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

// Start writing functions
// https://firebase.google.com/docs/functions/typescript

export const helloWorld = onRequest(async (request, response) => {
  logger.info("Hello logs!", { structuredData: true })

  const ans = await admin.firestore().collection("attendance").get()
  logger.info("🥬", ans.docs)
  response.send("Hello from Firebase!")
})

export const updateUsers = onRequest(async (request, response) => {
  // Grab all users from the user collection
  const existingUsers = db.users.getAllDocs()
  logger.info(existingUsers, { structuredData: true })

  // Receive the array of users from the google-script.

  // Decide whether we want to update any user info

  // Send the output information to a firestore doc to send for the week
  response.send("testin123")
})
