import {
  DocumentData,
  CollectionReference,
  Firestore,
  FieldValue,
} from "firebase-admin/firestore"
import * as admin from "firebase-admin"

// This is just a helper to add the type to the db responses
const createCollection = <T = DocumentData>(collectionName: string) => {
  return admin.firestore().collection(collectionName) as CollectionReference<T>
  //   return collection(admin.firestore(), collectionName) as CollectionReference<T>
}

type Users = {
  name: string
  height: number
}

const usersCol = createCollection<Users>("Users")

const ans = await usersCol.doc().update({
  height: FieldValue.delete(),
})
