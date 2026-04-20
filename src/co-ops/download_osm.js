import { lifecyclePrefixes, fetchOsmData } from '../utils.js';

// wikidata IDs for both CO-OPS and TCOONS 
const query = "(" +
    lifecyclePrefixes
        .map(prefix => `node["${prefix}man_made"="monitoring_station"]["operator:wikidata"~"^Q123032876$|^Q130375316$"];`)
        .join('\n') +
    ");";

fetchOsmData('co-ops', query);
