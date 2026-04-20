import { existsSync, writeFileSync, mkdirSync } from 'fs';
import { getString, clearDirectory, scratchDir } from '../utils.js';

// https://api.water.noaa.gov/nwps/v1/docs/#/

const baseDir = scratchDir + 'nwps/index/';

// Don't delete existing since this is time-intensive to query and the data we care about doesn't change much
// clearDirectory(baseDir);

if (!existsSync(baseDir)) mkdirSync(baseDir, { recursive: true });

const localPath = scratchDir + 'nwps/index/all.json';

if (!existsSync(localPath)) {
  console.log('Fetching National Water Prediction Service station index. This may take some time…');

  const url = `https://api.water.noaa.gov/nwps/v1/gauges`;
  console.log(`Fetching: ${url}`);
  let jsonString = await getString(url);

  let json = JSON.parse(jsonString);
  console.log(json?.gauges?.length);

  console.log(`Writing data to '${localPath}'`);
  writeFileSync(localPath, jsonString);
} else {
  console.log(`File already exists at ${localPath}. Manually delete it if you want new data.`);
}

