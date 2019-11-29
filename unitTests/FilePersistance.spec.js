'use strict'

const FilePersistance = require('../modules/FilePersistance.js')
const mock = require('mock-fs')

describe('writeFile()', () => {

	beforeEach(async() => {
		mock({
			'test/directory': 'test.jpeg'
		})
	})

	afterEach(async() => {
		afterEach(mock.restore)
	})

	test('successfully write file', async done => {
		expect.assertions(2)
		//ARRANGE
		const persist = await new FilePersistance()
		//ACT
		const file = await persist.writeFile('test/directory','test.jpeg', 'user', 1000, 'image/jpeg')
		const user = file.getUser()
		const filename = file.getFilename()
		//ASSERT
		expect(user).toEqual('user')
		expect(filename).toEqual('test.jpeg')
		done()
	})

	test('throw error if file already exists', async done => {
		expect.assertions(1)
		//ARRANGE
		const persist = await new FilePersistance()
		//ACT
		await persist.writeFile('test/directory','test.jpeg', 'user', 1000, 'image/jpeg')
		//ASSERT
		await expect( persist.writeFile('test/directory','test.jpeg','user',1000,'image/jpeg') )
			.rejects.toEqual( Error('File already exists') )
		done()
	})
})

describe('readFile()', () => {
	beforeEach(async() => {
		mock({
			'test/directory': 'test.jpeg'
		})
	})

	afterEach(async() => {
		afterEach(mock.restore)
	})

	test('successfully read file', async done => {
		expect.assertions(1)
		//ARRANGE
		const persist = await new FilePersistance()
		//ACT
		const file = await persist.writeFile('test/directory','test.jpeg', 'user', 1000, 'image/jpeg')
		const resFile = await persist.readFile(file.getHashedName(),'user')
		//ASSERT
		expect(resFile.directory).toEqual(file.path)
		done()
	})

	test('throw error if file does not exists', async done => {
		expect.assertions(1)
		//ARRANGE
		const persist = await new FilePersistance()
		//ACT
		await persist.writeFile('test/directory','test.jpeg','user',1000,'image/jpeg')
		//ASSERT
		await expect( persist.readFile('files/user/fake.jpeg','user') )
			.rejects.toEqual( Error('File does not exist') )
		done()
	})
})

describe('deleteFile()', () => {

	beforeEach(async() => {
		mock({
			'test/directory': 'test.jpeg'
		})
	})

	afterEach(async() => {
		afterEach(mock.restore)
	})

	test('successfully delete file', async done => {
		expect.assertions(1)
		//ARRANGE
		const persist = await new FilePersistance()
		//ACT
		const file = await persist.writeFile('test/directory','test.jpeg', 'user', 1000, 'image/jpeg')
		const data = await persist.readFile(file.getHashedName(),file.getUser())
		await persist.deleteFile(data.id)
		//ASSERT
		await expect( persist.readFile(file.getFilename(),file.getUser()) )
			.rejects.toEqual( Error('File does not exist') )
		done()
	})

	test('throw error if file does not exists', async done => {
		expect.assertions(1)
		//ARRANGE
		const persist = await new FilePersistance()
		//ACT
		//ASSERT
		await expect( persist.deleteFile(1) )
			.rejects.toEqual( Error('File does not exist') )
		done()
	})
})

describe('deleteStaleFile()', () => {

	beforeEach(async() => {
		mock({
			'test/directory': 'test.jpeg'
		})
	})

	afterEach(async() => {
		afterEach(mock.restore)
	})

	test('throw error if time passed is negative - large number', async done => {
		expect.assertions(1)
		//ARRANGE
		const persist = await new FilePersistance()
		const timepassed = -9241212
		//ACT
		//ASSERT
		await expect( persist.deleteStaleFiles(timepassed) )
			.rejects.toEqual( Error('Invalid time passed') )
		done()
	})

	test('throw error if time passed is negative - edge case', async done => {
		expect.assertions(1)
		//ARRANGE
		const persist = await new FilePersistance()
		const timepassed = -1
		//ACT
		//ASSERT
		await expect( persist.deleteStaleFiles(timepassed) )
			.rejects.toEqual( Error('Invalid time passed') )
		done()
	})

	test('successfully delete file', async done => {
		expect.assertions(1)
		//ARRANGE
		const persist = await new FilePersistance()
		const timepassed = 0
		//ACT
		const file = await persist.writeFile('test/directory','test.jpeg', 'user', 1000, 'image/jpeg')
		await persist.deleteStaleFiles(timepassed)
		//ASSERT
		await expect( persist.readFile(file.getHashedName(),file.getUser()) )
			.rejects.toEqual( Error('File does not exist') )
		done()
	})

	test('successfully run but dont delete', async done => {
		expect.assertions(1)
		//ARRANGE
		const persist = await new FilePersistance()
		const timepassed = 259200 // <- 3 Days in seconds
		//ACT
		const file = await persist.writeFile('test/directory','test.jpeg', 'user', 1000, 'image/jpeg')
		await persist.deleteStaleFiles(timepassed)
		//ASSERT
		await expect( persist.readFile(file.getHashedName(),file.getUser()) )
			.resolves.toMatchObject( {directory: 'files/user/test.jpeg'} )
		done()
	})
})

describe('readAllFiles()', () => {

	beforeEach(async() => {
		mock({
			'test/directory': 'test.jpeg'
		})
	})

	afterEach(async() => {
		afterEach(mock.restore)
	})
	test('correctly get 3 objects', async done => {
		expect.assertions(1)
		//ARRANGE
		const persist = await new FilePersistance()
		//ACT
		await persist.writeFile('test/directory','test1.jpeg', 'user', 1000, 'image/jpeg')
		await persist.writeFile('test/directory','test2.jpeg', 'user', 1000, 'image/jpeg')
		await persist.writeFile('test/directory','test3.jpeg', 'user', 1000, 'image/jpeg')
		//ASSERT
		await expect(persist.readAllFiles('user'))
			.resolves.toHaveLength(3)
		done()
	})

	test('throw error if user has no files', async done => {
		expect.assertions(1)
		//ARRANGE
		const persist = await new FilePersistance()
		//ACT
		//ASSERT
		await expect(persist.readAllFiles('user'))
			.rejects.toEqual( Error('You have no files') )
		done()
	})
})


describe('writeSharedFile()', () => {

	beforeEach(async() => {
		mock({
			'test/directory': 'test.jpeg'
		})
	})

	afterEach(async() => {
		afterEach(mock.restore)
	})
	test('successfully write file', async done => {
		expect.assertions(1)
		//ARRANGE
		const persist = await new FilePersistance()
		//ACT
		const val = await persist.writeSharedFile('test/directory','test.jpeg', 'user', 1000, 'image/jpeg','original')
		//ASSERT
		expect(val).toBe(true)
		done()
	})

	test('throw error if file already exists', async done => {
		expect.assertions(1)
		//ARRANGE
		const persist = await new FilePersistance()
		//ACT
		await persist.writeSharedFile('test/directory','test.jpeg', 'user', 1000, 'image/jpeg','original')
		//ASSERT
		await expect( persist.writeSharedFile('test/directory','test.jpeg','user',1000,'image/jpeg','original') )
			.rejects.toEqual( Error('That user already has that file') )
		done()
	})

	test('return false if user = false', async done => {
		expect.assertions(1)
		//ARRANGE
		const persist = await new FilePersistance()
		//ACT
		//ASSERT
		await expect(persist.writeSharedFile('test/directory','test.jpeg', false, 1000, 'image/jpeg'))
			.resolves.toBe(false)
		done()
	})

	test('error if user is sharing with themself', async done => {
		expect.assertions(1)
		//ARRANGE
		const persist = await new FilePersistance()
		//ACT
		//ASSERT
		await expect(persist.writeSharedFile('test/directory','test.jpeg', 'user', 1000, 'image/jpeg','user'))
			.rejects.toEqual(Error('Cannot share to yourself'))
		done()
	})
})
