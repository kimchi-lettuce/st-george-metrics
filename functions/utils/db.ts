import { DocumentData, CollectionReference } from "firebase-admin/firestore"
import * as admin from "firebase-admin"

admin.initializeApp()

// This is just a helper to add the type to the db responses
const createCollection = <T = DocumentData>(collectionName: string) => {
  const collectionRef = admin
    .firestore()
    .collection(collectionName) as CollectionReference<T>

  async function getAllDocs() {
    return (await collectionRef.get()).docs.map((doc) => {
      const output = { ...doc.data() }
      // Add non-enumerable properties for the id and ref for ease of using
      // document data
      Object.defineProperty(output, "id", { value: doc.id, enumerable: false })
      Object.defineProperty(output, "ref", {
        value: doc.ref,
        enumerable: false,
      })
      return output
    }) as (T & { id: string; ref: admin.firestore.DocumentReference<T> })[]
  }

  return {
    getAllDocs,
  }
}

type Users = {
  /** The user's full name in lowercase. Keeping the case consistent allows us
   * to be able to query with an agreed format */
  fullNameLowercase: string
  /** Card numbers associated with the user */
  cardQrCodes: []
  /** TODO: can potentially add this in the future */
  dGroup?: string
}

const db = {
  users: createCollection<Users>("users"),
}

export { db, admin }
