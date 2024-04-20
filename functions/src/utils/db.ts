import {
	DocumentData,
	CollectionReference,
	Query,
	OrderByDirection,
	DocumentReference,
	Timestamp
} from 'firebase-admin/firestore'
import * as admin from 'firebase-admin'
import { generateWeekId } from './week'

// This should only be called once as it initializes the firebase admin sdk
admin.initializeApp()

export type DocDataWithIdAndRef<T> = T & {
	/** (non-enumerable) - Id of the firestore document */
	id: string
	/** (non-enumerable) - Reference of the firestore document, for easy
	 * access to perform any firestore actions like `.update()` */
	ref: admin.firestore.DocumentReference<T>
}

/** Helper function to prettify the firestore snapshot. It returns the document
 * data with the non-enumerable properties `id` and `ref` added to it */
function prettifyFirestoreSnapshot<T>(
	doc:
		| admin.firestore.QueryDocumentSnapshot<T>
		| admin.firestore.DocumentSnapshot<T>
) {
	const output = { ...doc.data() }
	Object.defineProperty(output, 'id', {
		value: doc.id,
		enumerable: false
	})
	Object.defineProperty(output, 'ref', {
		value: doc.ref,
		enumerable: false
	})
	return output as DocDataWithIdAndRef<T>
}

/** Helper function to prettify the query data. It returns the document data as
 * an array and adds the non-enumerable properties `id` and `ref` to each
 * document */
async function prettifyQueryData<T = DocumentData>(query: Query<T>) {
	return (await query.get()).docs.map(doc => {
		return prettifyFirestoreSnapshot(doc)
	}) as DocDataWithIdAndRef<T>[]
}

/** Helper function to prettify the document data. It returns the document data
 * with the non-enumerable properties `id` and `ref` added to it */
async function prettifyDocData<T = DocumentData>(docRef: DocumentReference<T>) {
	return prettifyFirestoreSnapshot(await docRef.get())
}

/** Used by {@link createTypeSafeQueryBuilder} to create a typesafe query
 * builder */
interface TypeSafeQueryBuilder<T> {
	where<K extends keyof T>(
		/** TODO: Only works for top-level fields. Need to add support for
		 * nested fields chained with a dot. Found it difficult to implement
		 * with typescript */
		fieldPath: K,
		opStr: FirebaseFirestore.WhereFilterOp,
		value: T[K]
	): TypeSafeQueryBuilder<T>
	orderBy<K extends keyof T>(
		fieldPath: K,
		directionStr?: OrderByDirection
	): TypeSafeQueryBuilder<T>
	limit(limit: number): TypeSafeQueryBuilder<T>
	get(): Promise<DocDataWithIdAndRef<T>[]>
}

/** Helper function to create a typesafe query builder */
function createTypeSafeQueryBuilder<T>(
	query: Query<T>
): TypeSafeQueryBuilder<T> {
	return {
		where(fieldPath, opStr, value) {
			return createTypeSafeQueryBuilder(
				query.where(fieldPath as string, opStr, value)
			)
		},
		orderBy(fieldPath, directionStr) {
			return createTypeSafeQueryBuilder(
				query.orderBy(fieldPath as string, directionStr)
			)
		},
		limit(limit) {
			return createTypeSafeQueryBuilder(query.limit(limit))
		},
		/** Promise resolving to the document data for the query */
		async get() {
			return prettifyQueryData(query)
		}
	}
}

/** Helper function to create a collection with typesafe actions */
const createCollection = <T = DocumentData>(collectionName: string) => {
	const collectionRef = admin
		.firestore()
		.collection(collectionName) as CollectionReference<T>

	return {
		/** Gets the firestore collection ref for any custom actions that this
		 * db helper does not provide for you */
		collectionRef,
		/** Returns all prettified document data for this collection */
		getAllDocs: () => prettifyQueryData(collectionRef),
		/** Specify the document id to get a firestore DocumentReference with
		 * types applied to it. So that your chained actions have typesafety */
		doc: (id: string) =>
			collectionRef.doc(id) as admin.firestore.DocumentReference<T>,
		/** Add a new document to the collection. Returns a promise with the
		 * document id and reference */
		add: async (data: T, id?: string) => {
			if (id) {
				// Check that the document with the id does not already exist.
				// If it does, throw an error
				const docRef = collectionRef.doc(id)
				const docSnapshot = await docRef.get()
				if (docSnapshot.exists) {
					throw new Error(`Document with ID ${id} already exists.`)
				}
				await docRef.set(data)
				return { id, ref: docRef, ...data }
			} else {
				const docRef = await collectionRef.add(data)
				return { id: docRef.id, ref: docRef, ...data }
			}
		},
		/** Allows you to create typesafe queries */
		query: () => createTypeSafeQueryBuilder(collectionRef)
	}
}

export type Users = {
	/** The user's full name in lowercase. Keeping the case consistent allows us
	 * to be able to query with an agreed format */
	fullNameLowercase: string
	/** Card number associated with the user */
	cardQrCode: string
	/** TODO: can potentially add this in the future */
	dGroup?: string
}

type Output = {
	/** Record number of function invocations, and we can then attach a watch
	 * trigger on the `output` collection, such that if the invocations exceeds
	 * a certain number then we email the developers a warning */
	[functionName: string]: number
}

/** This is what stores the individual attendance records */
type Attendance = {
	/** The date of the attendance record */
	date: Timestamp
	/** The user id of the person who attended */
	uid: string
}

/** Data to persist in the `all` document of the `settings` firestore collection */
type Settings = {
	/** What the latest attendance entry date is. So we know where to pick up
	 * from and not have duplicate entries for the same attendance entry */
	latestAttendanceDate: Timestamp
}

const UserBlacklistReasons = {
	'DUPLICATE_FULLNAME_IN_USER_LIST': 'For the specific user, the fullname is a duplicate in the user list',
	'ATTENDANCE_NOT_MATCHING_TO_USER': 'For the specific attendance entry, the manual fullname provided does not match any user in the user list',
}

type Config = {
	/** Church staff email recipients of our attendance metrics */
	emailRecipients: string[]
	/** Developer email recipients to send the warning email to */
	emailOfDevelopers: string[]
	/** Names of users to not run metrics for */
	blacklistUsersForMetrics: {name: string, reason: keyof typeof UserBlacklistReasons}[]
	/** If the number of function calls exceeds this, a warning email is sent to
	 * the developers */
	maxWeeklyFunctionCalls: number
}

const dbCollections = {
	users: createCollection<Users>('users'),
	/** Collection for storing the output to send to the email recipients */
	output: createCollection<Output>('output'),
	attendance: createCollection<Attendance>('attendance')
}

/** Reference to the `config/all` document in the firestore. It is a single
 * document where we store all the configuration settings for the app */
const configAllDocRef = admin
	.firestore()
	.collection('config')
	.doc('all') as admin.firestore.DocumentReference<Config>

const settingsAllDocRef = admin
	.firestore()
	.collection('settings')
	.doc('all') as admin.firestore.DocumentReference<Settings>

const db = {
	...dbCollections,
	/** Helper reference to get the current week's output document */
	currentWeekOutputDoc: dbCollections.output.doc(generateWeekId()),
	/** Reference to the `config/all` document in the firestore. It is
	 * a single document where we store all the configuration settings for the
	 * app */
	config: {
		/** Reference to the `config/all` document in the firestore. It is a
		 * single document where we store all the configuration settings for the
		 * app */
		ref: configAllDocRef,
		/** Get the document data for the `config/all` document */
		get: () => prettifyDocData(configAllDocRef)
	},
	appSettings: {
		/** Reference to the `settings` document in the firestore. It is a single
		 * document where we store all the settings for the app */
		ref: settingsAllDocRef,
		/** Get the document data for the `settings` document */
		get: () => prettifyDocData(settingsAllDocRef)
	}
}

export { db, admin }
