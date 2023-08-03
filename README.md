# Extract Files from Salesforce

A nodejs app that lets you configure a query of ContentVersion records to extract from Salesforce and put the files into folders based on the LinkedEntity's Name. The tool saves all the files into a `files` folder in the app's folder structure

## Prep

1. Make sure that node is downloaded onto your machine, this app was written with node v19.3.0
3. run `npm install` to install the node modules defined in the `package.json`
2. Use the `.env.example` to create a `.env` file which has the specific details for your org populated. You will need your org's domain name, username, password, and security token
3. Edit the query to filter the linked entity records queried (could be Accounts or any parent record of a file type of object), if left as is, this app will query all ContentVersion records related to any Account and download all files in the org.

## To Run

Once the `.env` is configured, run the app in the command line via `node server.js`
