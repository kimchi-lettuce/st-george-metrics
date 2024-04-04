import * as dotenv from "dotenv"
import { db } from "../utils/db"

// Needed so that we get the service account from the
// 'GOOGLE_APPLICATION_CREDENTIALS' stored in the .env file
dotenv.config()

async function myFirstScript() {
  const test = await db.users.getAllDocs()
  console.log("❤️", test[0].id, { ...test[0] })
}

async function testUpdateUsers() {
  const url =
    "http://127.0.0.1:8888/stgeorges-attendance-metrics/us-central1/updateUsers" // Replace with your local or deployed function URL
  const body = [{ hi: "yo" }, { yo: "true" }]
  try {
    const response = await fetch(url, {
      method: "POST",
      body: JSON.stringify(body),
      headers: { "Content-Type": "application/json" },
    })

    // const data = await response.json()
    console.log(await response.text())
  } catch (error) {
    console.error("Error:", error)
  }
}

testUpdateUsers()
