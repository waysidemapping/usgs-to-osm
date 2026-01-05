import { readFileSync, writeFileSync, existsSync } from 'fs';
import { getString, clearDirectory, scratchDir } from '../utils.js';

// https://api.water.noaa.gov/nwps/v1/docs/#/

// Don't delete existing since these are time-intensive to query and the data we care about doesn't change much
// clearDirectory(scratchDir + 'nwps/full/');

console.log('Fetching National Water Prediction Service stations. This may take quite awhile…');

const indexGauges = JSON.parse(readFileSync(scratchDir + 'nwps/index/all.json')).gauges;

for (let i in indexGauges) {
    let indexGauge = indexGauges[i];
    let id = indexGauge.lid;
    const localPath = scratchDir + `nwps/full/${id}.json`;

    if (existsSync(localPath)) continue;

    const remotePath = `https://api.water.noaa.gov/nwps/v1/gauges/${id}`;
    console.log(`Fetching: ${remotePath}`);
    let jsonString = await getString(remotePath, { returnNullOnBadStatus: true });

    if (jsonString) {
        console.log(`Writing data to '${localPath}'`);
        writeFileSync(localPath, jsonString);
    } else {
        console.log(`No string returned`);
    }

}
