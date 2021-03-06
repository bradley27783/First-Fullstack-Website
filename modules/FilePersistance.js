/* eslint-disable no-unused-vars */
'use strict'

const bcrypt = require('bcrypt-promise')
const fs = require('fs-extra')
const mime = require('mime-types')
const sqlite = require('sqlite-async')
const saltRounds = 10

const File = require('./file')
const List = require('./list')


/**
 * Class that handles processing of files.
 * @class
 * @name FilePersistance
 */
module.exports = class FilePersistance {

	constructor(dbName = ':memory:') {

		return (async() => {
			this.db = await sqlite.open(dbName)
			const sql = 'CREATE TABLE IF NOT EXISTS files(id INTEGER PRIMARY KEY AUTOINCREMENT,' +
				'filename TEXT, directory TEXT, user TEXT, filesize INTEGER,'
				+'timestamp TEXT DEFAULT CURRENT_TIMESTAMP, hashedname TEXT)'
			await this.db.run(sql)
			return this
		})()
	}

	/**
	 * Storing file in the db
	 *
	 * @async
	 * @param {File} file - File object that was uploaded
	 * @returns {boolean} - Returns true when the function completes
	 */

	async writeFile(path,name,user,size,type) {
		try {
			const file = await new File()
			await file.init(name,user,size,type)
			let sql = `SELECT * FROM files WHERE filename = "${file.getFilename()}" AND user = "${file.getUser()}"`
			const data = await this.db.all(sql)

			if(data.length === 0) {
				sql = 'INSERT INTO files(filename, directory, user, filesize, hashedname)' +
                    `VALUES("${file.getFilename()}", "${file.getDirectory()}","${file.getUser()}",`+
                    `${file.getFilesize()}, "${file.getHashedName()}");`

				await this.db.run(sql)
				await fs.copy(path, file.getDirectory())
				return file
			} else throw new Error('File already exists')
		} catch(err) {
			throw err
		}
	}


	async readFile(filename,user) {
		try {
			const sql = `SELECT * FROM files WHERE hashedname = "${filename}" AND user = "${user}"`
			const data = await this.db.get(sql)
			if(data === undefined) {
				throw new Error('File does not exist')
			}
			return data
		} catch(err) {
			throw err
		}
	}

	async downloadFile(path) {
		try {
			if (path === undefined || path.length === 0) throw new Error('Path not defined')
			return await fs.createReadStream(path)
		} catch (err) {
			throw err
		}
	}

	async listFiles(user,maxDays) {
		try {
			if (maxDays <= 0) throw new Error('Must be atleast one day')
			const sql = `SELECT * FROM files WHERE user = "${user}"`
			const data = await this.db.all(sql)
			if(data === undefined || data.length === 0) {
				throw new Error('You have no files')
			}
			const list = new List()
			const currentDate = new Date()
			list.formatTimeLeft(data,currentDate,maxDays)
			list.formatFiletype(data)
			return list.files
		} catch(err) {
			throw err
		}
	}

	async deleteFile(id) {
		try {
			let sql = `SELECT * FROM files WHERE id = ${id}`
			const data = await this.db.get(sql)

			if(data === undefined) throw new Error('File does not exist')
			else {
				sql = `DELETE FROM files WHERE id = ${id}`
				await this.db.run(sql)
				fs.unlink(data.directory)
			}
		} catch (err) {
			throw err
		}
	}


	// eslint-disable-next-line complexity
	async deleteStaleFiles(timepassed) {
		try {
			if(timepassed === undefined || timepassed === null || timepassed < 0) throw new Error('Invalid time passed')
			else {
				let sql = 'SELECT * FROM files WHERE'+
					`(strftime('%s',CURRENT_TIMESTAMP) - strftime('%s', timestamp)) >= ${timepassed}`
				const data = await this.db.all(sql)
				if (data === undefined || data.length === 0) return false

				sql = 'DELETE FROM files WHERE'+
					`(strftime('%s',CURRENT_TIMESTAMP) - strftime('%s', timestamp)) >= ${timepassed}`
				await this.db.run(sql)
				data.forEach(file => fs.unlink(file.directory))
				return true
			}
		} catch (err) {
			throw err
		}
	}

	// eslint-disable-next-line max-params
	async writeSharedFile(path,name,user,size,type,originalUser) {
		try {
			if(!user) return false
			if(user === originalUser) throw new Error('Cannot share to yourself')
			const file = await new File()
			await file.init(name,user,size,type)
			let sql = `SELECT * FROM files WHERE filename = "${file.getFilename()}" AND user = "${user}"`
			const data = await this.db.all(sql)
			if(data.length === 0) {
				sql = 'INSERT INTO files(filename, directory, user, filesize, hashedname)' +
                    `VALUES("${file.getFilename()}", "${file.getDirectory()}","${user}",`+
                    `${file.getFilesize()}, "${file.getHashedName()}");`
				await this.db.run(sql)
				await fs.copy(path, file.getDirectory())
				return true
			} else throw new Error('That user already has that file')
		} catch(err) {
			throw err
		}
	}
}
