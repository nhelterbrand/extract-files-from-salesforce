require('dotenv').config();
var jsforce = require('jsforce');
const https = require('https');
const fs = require('fs');

const userName = process.env.USERNAME;
const passwordWithToken = process.env.PASSWORD + process.env.SECURITY_TOKEN;

var conn = new jsforce.Connection({
	loginUrl : process.env.BASE_URL
});

console.log('logging in...');
conn.login(userName, passwordWithToken, function(err, userInfo) {
	if (err) { return console.error(err); }

	console.log('token ', conn.accessToken);
	console.log('instance url ', conn.instanceUrl);
	// logged in user property
	console.log("User ID: " + userInfo.id);
	console.log("Org ID: " + userInfo.organizationId);

	var records = [];
	conn.query("SELECT Id, Title, FileExtension, ContentDocumentId, VersionData FROM ContentVersion", function(err, result) {
		if (err) { return console.error(err); }
		console.log("total : " + result.totalSize);
		console.log("fetched : " + result.records.length);
		records = result.records;

		var record;
		for (recordIndex in records) {
			record = records[recordIndex];
			console.log(record);

			downloadFile(record.Title + '.' + record.FileExtension, record.VersionData);
		}
	});
});


function downloadFile(contentVersionFileName, path) {

    const options = {
        hostname: process.env.DOMAIN_NAME,
        port: 443,
        path: path,
        method: 'GET',
        headers: {
            'Content-Type': 'application/octet-stream',
            'Authorization': 'OAuth '+conn.accessToken
        }
    }

	const folderName = 'files';
	const filePath = folderName + '/' + contentVersionFileName

    https.get(options, (resp) => {
        let data = '';
		if (!fs.existsSync('files')){
			fs.mkdirSync('files');
		}

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
            console.log('data downloaded');
        });

    }).on("error", (err) => {
        console.log("Error: " + err.message);
    });
}