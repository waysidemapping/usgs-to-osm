import { lifecyclePrefixes, fetchOsmData } from '../utils.js';

// Do not limit selection area to the US since some sites are in Canada
const query = lifecyclePrefixes.map(prefix => `nwr["${prefix}man_made"="monitoring_station"]["operator:wikidata"="Q193755"];`).join('\n');

fetchOsmData('usgs', query);
