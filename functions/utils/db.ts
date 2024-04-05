import {
	DocumentData,
	CollectionReference,
	Query,
	OrderByDirection
} from 'firebase-admin/firestore'
import * as admin from 'firebase-admin'

admin.initializeApp()

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
	get(): Promise<
		(T & {
			id: string
			ref: admin.firestore.DocumentReference<T>
		})[]
	>
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
	}) as (T & { id: string; ref: admin.firestore.DocumentReference<T> })[]
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
		collectionRef,
		getAllDocs,
		query: () => createTypeSafeQueryBuilder(collectionRef)
	}
}

type Users = {
	/** The user's full name in lowercase. Keeping the case consistent allows us
	 * to be able to query with an agreed format */
	fullNameLowercase: string
	/** Card numbers associated with the user */
	cardQrCodes: string[]
	/** TODO: can potentially add this in the future */
	dGroup?: string
}

const db = {
	users: createCollection<Users>('users')
}

export { db, admin }
