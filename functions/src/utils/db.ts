import {
	DocumentData,
	CollectionReference,
	Query,
	OrderByDirection
} from 'firebase-admin/firestore'
import * as admin from 'firebase-admin'
import { generateWeekId } from './week'

admin.initializeApp()

type DocDataWithIdAndRef<T> = T & {
	/** (non-enumerable) - Id of the firestore document */
	id: string
	/** (non-enumerable) - Reference of the firestore document, for easy
	 * access to perform any firestore actions like `.update()` */
	ref: admin.firestore.DocumentReference<T>
}

// Type-safe query builder interface
interface TypeSafeQueryBuilder<T> {
	where<K extends keyof T>(
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

async function prettifyQueryData<T = DocumentData>(query: Query<T>) {
	return (await query.get()).docs.map(doc => {
		const output = { ...doc.data() }
		Object.defineProperty(output, 'id', {
			value: doc.id,
			enumerable: false
		})
		Object.defineProperty(output, 'ref', {
			value: doc.ref,
			enumerable: false
		})
		return output
	}) as DocDataWithIdAndRef<T>[]
}

// Implementing the type-safe query builder
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
		async get() {
			return prettifyQueryData(query)
		}
	}
}

// This is just a helper to add the type to the db responses
const createCollection = <T = DocumentData>(collectionName: string) => {
	const collectionRef = admin
		.firestore()
		.collection(collectionName) as CollectionReference<T>

	async function getAllDocs() {
		return prettifyQueryData(collectionRef)
	}

	return {
		/** Gets the firestore collection ref for any custom actions that this
		 * db helper does not provide for you */
		collectionRef,
		/** Returns all prettified document data for this collection */
		getAllDocs,
		/** Specify the document id to get a firestore DocumentReference with
		 * types applied to it. So that your chained actions have typesafety */
		doc: (id: string) =>
			collectionRef.doc(id) as admin.firestore.DocumentReference<T>,

		add: async (data: T) => {
			const docRef = await collectionRef.add(data)
			return { id: docRef.id, ref: docRef, ...data }
		},
		/** Allows you to create typesafe queries */
		query: () => createTypeSafeQueryBuilder(collectionRef)
	}
}

type Users = {
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

const dbCollections = {
	users: createCollection<Users>('users'),
	output: createCollection<Output>('output')
}

const db = {
	...dbCollections,
	currentWeekOutputDoc: dbCollections.output.doc(generateWeekId())
}

export { db, admin }
