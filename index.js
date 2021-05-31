const express = require("express");
const bodyParser = require("body-parser");
const app = express();
const path = require("path");
const cors = require("cors");
const fs = require("fs");
const dateOptions = {
	year: "numeric",
	month: "short",
	day: "numeric",
	hour12: false,
	hour: "2-digit",
	minute: "2-digit",
};
const variables = {
	vaccinationDate: "06/02/2021",
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

function readAndManipulate(file) {
	var filepath = __dirname + "/" + file;
	let data = readJsonFileSync(filepath);

	const dataJson = data.map((item) => {
		let eligible = false;
		if (item.Aaadhar.trim() === "") {
			item.Aaadhar = "Not Entered";
		} else {
			item.Aaadhar = "Entered";
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
			item.DaysSinceRecovery.trim() === "" ||
			item.DaysSinceRecovery.trim() === "0" ||
			(parseInt(item.DaysSinceRecovery, 10) > 0 &&
				parseInt(item.DaysSinceRecovery, 10) >= variables.gap.recovery)
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
		};
		return obj;
	});
	return dataJson;
}

function refresh() {
	dataList.json = readAndManipulate("data/rawData.json");

	let data = JSON.stringify({
		parameters: {
			vaccinationDate: variables.vaccinationDate,
			lastUpdatedTime: variables.lastUpdatedTime,
		},
		data: dataList.json,
	});

	fs.writeFileSync("data/data.json", data);
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

app.listen(3000, () => {
	console.log("Server started on port 3000");
});
