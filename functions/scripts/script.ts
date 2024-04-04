import * as dotenv from "dotenv"
import { db } from "../utils/db"

// Needed so that we get the service account from the
// 'GOOGLE_APPLICATION_CREDENTIALS' stored in the .env file
dotenv.config()

async function myFirstScript() {
  const test = await db.users.getAllDocs()
  console.log("❤️", test[0].id, { ...test[0] })
}

myFirstScript()
