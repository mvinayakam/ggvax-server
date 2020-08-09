const express = require("express");
const bodyParser = require("body-parser");
const app = express();
const mysql = require("mysql");
const path = require("path");
const cors = require("cors");
const fs = require("fs");
const zip = require('express-easy-zip');


app.use(bodyParser.json());
app.use(zip());

var allowedOrigins = ["http://localhost:3001", "http://yourapp.com"];

app.use(
	cors({
		origin: function (origin, callback) {
			// allow requests with no origin
			// (like mobile apps or curl requests)
			if (!origin) return callback(null, true);
			if (allowedOrigins.indexOf(origin) === -1) {
				var msg =
					"The CORS policy for this site does not " +
					"allow access from the specified Origin.";
				return callback(new Error(msg), false);
			}
			return callback(null, true);
		},
	})
);
app.use("/media", express.static(__dirname + "/media"));

const conn = mysql.createConnection({
	host: "localhost",
	user: "root",
	password: "yourpasswd",
	database: "homeListing",
});

conn.connect((err) => {
	if (err) throw err;
	console.log("Mysql Connected");
});

app.get("/api/listings", (req, res) => {
	let sql = "select * from listings";
	let query = conn.query(sql, (err, results) => {
		if (err) throw err;
		res.send(JSON.stringify({ status: 200, error: null, data: results }));
	});
});

app.get("/api/listingVideos/:listId", (req, res) => {
	let sql =
		"select * from media where listingid=" +
		req.params.listId +
		" and mediatype='video'";
	let query = conn.query(sql, (err, results) => {
		if (err) throw err;
		res.send(JSON.stringify({ status: 200, error: null, data: results }));
	});
});

app.get("/api/listingPhotos/:listId", (req, res) => {
	//joining path of directory
	const mediaPath = "media";
	const listId = req.params.listId;
	const dynamicPath = listId + "/photos";
	const directoryPath = path.join(__dirname, mediaPath, dynamicPath);

	//passsing directoryPath and callback function
	fs.readdir(directoryPath, function (err, files) {
		//handling error
		if (err) {
			return console.log("Unable to scan directory: " + err);
		}

		fileData = [];
		//listing all files using forEach
		let ctr = 0;
		files.forEach(function (file) {
			// Do whatever you want to do with the file
			ctr++;
			let id = req.params.listId + "_" + ctr;
			let picFile =
				req.protocol +
				"://" +
				req.get("host") +
				"/media/" +
				dynamicPath +
				"/" +
				file;
			fileData.push({ key: id, img: picFile });
		});
		res.send(JSON.stringify({ status: 200, error: null, data: fileData }));
	});
});

app.get("/api/downloadPhotos/:listId", (req, res) => {
	//joining path of directory
    const mediaPath = "media";
    const outputDir="uploads"
	const listId = req.params.listId;
    const dynamicPath = listId + "/photos";
    const zipFileName=listId + "_photos.zip";
    const directoryPath = path.join(__dirname, mediaPath, dynamicPath);
    const zipdirPath = path.join(__dirname, mediaPath,listId);
    


    res.zip({
        files: [
            { path: mediaPath + "/" + dynamicPath, name: outputDir +"/"+listId+"_photos.zip" }    
        ],
        
          filename: zipFileName
    
     }).then(function(obj){
        var zipFileSizeInBytes = obj.size;
        var ignoredFileArray = obj.ignored;
        console.log(obj)
    })
    .catch(function(err){
        console.log(err);	//if zip failed
    });
     /*
     .then((dataFile)=>{
        console.log(dataFile);
        res.download(zipFileName;
    });*/

});


app.listen(3000, () => {
	console.log("Server started on port 3000");
});
