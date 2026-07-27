const fs = require("fs");
const path = require("path");

const configPath = process.argv[2];

if (!configPath) {
    console.error("Keine Config angegeben");
    process.exit(1);
}

const buildMode  = process.argv[3];

if (!buildMode) {
	console.error("Keinen buildMode angegeben");
	process.exit(1);
}
if (!["main", "dev"].includes(buildMode)) {
	console.error("Ungültiger Buildmodus");
	process.exit(1)
}

const absoluteConfigPath = path.resolve(configPath);

console.log("Config:", absoluteConfigPath);

const config = JSON.parse(
    fs.readFileSync(absoluteConfigPath, "utf8")
);

const buildDate = new Date()
    .toISOString()
    .replace(/[-:TZ]/g, "")
    .slice(0,12);

console.log("Builddate = ", buildDate);

console.log("Name:", config.name);
console.log("Version:", config.version);
console.log("Header:", config.headers[buildMode]);
console.log("Dateien:", config.files);

const variables = {
	"${NAME}": config.name,
	"${VERSION}": config.version,
	"${MODE}": buildMode,
	"${BUILD}": buildDate
};

/*
const headerPath = path.join(
	root,
	config.header[buildMode]
);
*/
console.log(__dirname)



