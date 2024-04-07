import * as dotenv from 'dotenv'
import { db } from '../src/utils/db'
import { UpdateUsersRequestBody } from '../src/index'

// Needed so that we get the service account from the
// 'GOOGLE_APPLICATION_CREDENTIALS' stored in the .env file
dotenv.config()

async function myFirstScript() {
	const test = await db.users.getAllDocs()
	console.log('❤️', test[0].id, { ...test[0] })
}

async function testUpdateUsers() {
	const url = 'https://updateusers-llsapw72ka-ts.a.run.app/' // Replace with your local or deployed function URL

	const body: UpdateUsersRequestBody = [
		{
			QR: 'E005',
			name: 'nancy tung',
			congregation: 'st georges',
			dgroup: 'youth'
		},
		{
			QR: 'E006',
			name: 'carmen nguyen',
			congregation: 'st georges',
			dgroup: 'youth'
		},
		{
			QR: 'E007',
			name: 'erwin candrawigunadi',
			congregation: 'st georges',
			dgroup: 'youth'
		}
	]
	try {
		const response = await fetch(url, {
			method: 'POST',
			body: JSON.stringify(body),
			headers: { 'Content-Type': 'application/json' }
		})

		// const data = await response.json()
		console.log(await response.text())
	} catch (error) {
		console.error('Error:', error)
	}
}

