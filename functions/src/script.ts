import * as admin from "firebase-admin"
import * as dotenv from "dotenv"
dotenv.config()

admin.initializeApp()

async function myFirstScript() {
  const ans = await admin.firestore().collection("attendance").get()
  console.log("🥬", ans.docs)

  console.log("hello")
}

myFirstScript()
