require('dotenv').config();
var jsforce = require('jsforce');
const https = require('https');
const fs = require('fs');

const userName = process.env.USERNAME;
const passwordWithToken = process.env.PASSWORD + process.env.SECURITY_TOKEN;

async function main() {
	const conn = await logIn(userName, passwordWithToken);

	const linkedEntityMapByContentDocumentId = await queryContentDocumentLinks(conn);
	console.log(linkedEntityMapByContentDocumentId)

	// make folder directories and get content versions
	const contentVersions = await makeFoldersAndQueryContentVersionsForLinkedEntities(conn, 'files', linkedEntityMapByContentDocumentId);
	console.log(contentVersions);

	// download files into folders
	for (i in contentVersions) {
		var record = contentVersions[i];
		var linkedEntityName = linkedEntityMapByContentDocumentId.get(record.ContentDocumentId);
		console.log(linkedEntityName);
		var contentFilePath = 'files' + '/' + linkedEntityName + '/' + record.Title + '.' + record.FileExtension;

		await downloadFile(conn, contentFilePath, record.VersionData);
	}
}

function logIn(userName, passwordWithToken) {
	var conn = new jsforce.Connection({
		loginUrl : process.env.BASE_URL
	});

	console.log('logging in...');
	let promise = new Promise(function(resolve, reject) {
		conn.login(userName, passwordWithToken, function(err, userInfo) {
			if (err) { reject(console.error(err)); }
			// Now you can get the access token and instance URL information.
			// Save them to establish connection next time.
			console.log(conn.accessToken);
			console.log(conn.instanceUrl);
			// logged in user property
			console.log("User ID: " + userInfo.id);
			console.log("Org ID: " + userInfo.organizationId);
			resolve(conn);
		});
	});

	return promise;
}

function queryContentDocumentLinks(conn) {
	var linkedEntityMapByContentDocumentId = new Map();

	let promise = new Promise(function(resolve, reject) {

		// if making changes, don't change the fields retrieved, just change the where clause, or maintain those fields retrieved
		conn.query("SELECT Id, LinkedEntityId, LinkedEntity.Name, ContentDocumentID, ContentDocument.LatestPublishedVersionID FROM ContentDocumentLink WHERE LinkedEntityId IN (SELECT Id FROM Account)",
		function(err, result) {
			if (err) { reject(console.error(err)); }

			console.log("total content documents related to accounts : " + result.totalSize);
			console.log("fetched : " + result.records.length);

			var record;
			for (recordIndex in result.records) {
				record = result.records[recordIndex];
				linkedEntityMapByContentDocumentId.set(record.ContentDocumentId, record.LinkedEntity.Name);
			}

			resolve(linkedEntityMapByContentDocumentId);
		});
	});

	return promise;
}

function makeFoldersAndQueryContentVersionsForLinkedEntities(conn, parentFolderName, linkedEntityMapByContentDocumentId) {
	const folderName = parentFolderName;
	if (!fs.existsSync(folderName)) {
		fs.mkdirSync(folderName);
	}

	for (var linkedEntity of linkedEntityMapByContentDocumentId.entries()) {
		var value = linkedEntity[1];
		var filePath = folderName + '/' + value;

		if (!fs.existsSync(filePath)) {
			fs.mkdirSync(filePath);
		}
	}

	let promise = new Promise(function(resolve, reject) {
		var records = [];
		var idList = '';
		var contentDocumentIdList = Array.from(linkedEntityMapByContentDocumentId.keys());
		for (i in contentDocumentIdList) {
			idList += "'" + contentDocumentIdList[i] + "',";
		}
		idList = idList.slice(0,-1);

		var queryString = "SELECT Id, Title, FileExtension, ContentDocumentId, VersionData FROM ContentVersion WHERE ContentDocumentId IN (" + idList + ")";
		conn.query(queryString, function(err, result) {
			if (err) { reject(console.error(err)); }

			console.log("total : " + result.totalSize);
			console.log("fetched : " + result.records.length);
			records = result.records;
			resolve(records);
		});
	})

	return promise;
}

function downloadFile(conn, filePath, contentVersionData) {
	let promise = new Promise(function(resolve, reject) {
		const options = {
			hostname: process.env.DOMAIN_NAME,
			port: 443,
			path: contentVersionData,
			method: 'GET',
			headers: {
				'Content-Type': 'application/octet-stream',
				'Authorization': 'OAuth '+conn.accessToken
			}
		}

		https.get(options, (resp) => {
			let data = '';

			// A chunk of data has been received.
			resp.on('data', (chunk) => {
				console.log(chunk);
				data += chunk;

				fs.appendFile(filePath, chunk, function (err) {
					if (err) throw err;
					console.log('chunk updated');
				});

			});

			// The whole response has been received. Print out the result.
			resp.on('end', () => {
				resolve('data downloaded');
			});

		}).on("error", (err) => {
			reject(console.log("Error: " + err.message));
		});
	});

	return promise;
}

main();