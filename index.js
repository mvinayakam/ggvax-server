const express = require("express");
const bodyParser = require("body-parser");
const app = express();
const path = require("path");
const cors = require("cors");
const fs = require("fs");
const csv = require("csvtojson");

const dateOptions = {
	year: "numeric",
	month: "short",
	day: "numeric",
	hour12: false,
	hour: "2-digit",
	minute: "2-digit",
};
const variables = {
	vaccinationDate: "06/11/2021",
	lastUpdatedTime: new Date().toLocaleString("en-US", dateOptions),
	gap: { Covaxin: 28, Covishield: 84, recovery: 84 },
};

const dataList = { json: {} };

//app.use(bodyParser.urlencoded({ extended: true }));

app.use(bodyParser.json());

app.use(cors());

app.use("/server/data", express.static(__dirname + "/data"));

let currDir = "";

function readJsonFileSync(filepath, encoding) {
	if (typeof encoding == "undefined") {
		encoding = "utf8";
	}
	var file = fs.readFileSync(filepath, encoding);
	return JSON.parse(file);
}

async function readAndManipulate(file) {
	const csvFilePath = __dirname + "/" + file + ".csv";
	const data = await csv().fromFile(csvFilePath);
	const dataJson = data.map((item) => {
		let eligible = false;
		let aadharEntered = false;
		if (item.Aaadhar.trim() === "") {
			item.Aaadhar = "Not Entered";
		} else {
			item.Aaadhar = "Entered";
			aadharEntered = true;
		}

		if (item.slot.trim() === "") {
			item.slot = "Not Scheduled";
		}

		if (item.Age.trim() === "") {
			item.Age = "Not Entered";
		} else {
			item.Age = "Entered";
		}

		if (item["Mobile#"].trim() === "") {
			item["Mobile#"] = "Not Entered";
		} else {
			item["Mobile#"] = "Entered";
		}
		if (item.whichDose == "2nd") {
			const diffTime =
				new Date(variables.vaccinationDate) - new Date(item["1stDoseDate"]);
			item["DaysSince1stDose"] = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
		}

		if (
			aadharEntered === true &&
			(item.DaysSinceRecovery.trim() === "" ||
				item.DaysSinceRecovery.trim() === "0" ||
				(parseInt(item.DaysSinceRecovery, 10) > 0 &&
					parseInt(item.DaysSinceRecovery, 10) >= variables.gap.recovery))
		) {
			if (item.WhichDose == "2nd") {
				if (item["DaysSince1stDose"] >= variables.gap[item.Vaccine]) {
					eligible = true;
				}
			} else {
				eligible = true;
			}
		}
		const obj = {
			Apartment: item.Apartment,
			Name: item.Name,
			Age: item.Age,
			Aaadhar: item.Aaadhar,
			"Mobile#": item["Mobile#"],
			WhichDose: item.WhichDose,
			"1stDoseDate": item["1stDoseDate"],
			DaysSince1stDose: item["DaysSince1stDose"],
			Vaccine: item.Vaccine,
			eligible: eligible ? "Eligible" : "Not Eligible",
			slot: item.slot,
		};
		return obj;
	});
	return dataJson;
}

async function refresh() {
	dataList.json = await readAndManipulate("data/rawData");
	let data = JSON.stringify({
		parameters: {
			vaccinationDate: variables.vaccinationDate,
			lastUpdatedTime: variables.lastUpdatedTime,
		},
		data: dataList.json,
	});

	fs.writeFileSync("data/data.json", data);
	console.log("File Updated");
}

function returnData() {
	return dataList.json;
}

app.get(currDir + "/", (req, res) => {
	res.send(
		JSON.stringify({
			status: 200,
			error: null,
			data: "Site is working fine",
		})
	);
});
app.get(currDir + "/api/details/:flatnum/", (req, res) => {
	const flatnum = req.params.flatnum;

	const dataList = returnData();

	const aptFound = dataList.filter((member) => {
		return member.Apartment.toUpperCase() === flatnum;
	});

	res.send(
		JSON.stringify({
			status: 200,
			error: null,
			parameters: {
				vaccinationDate: variables.vaccinationDate,
				lastUpdatedTime: variables.lastUpdatedTime,
			},
			data: aptFound,
		})
	);
});

refresh();
