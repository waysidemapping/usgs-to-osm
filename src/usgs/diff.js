import { readFileSync, writeFileSync } from 'fs';
import { clearDirectory, iterateFilesInDirectory, lifecyclePrefixes, locHash, osmChangeXmlForFeatures, geoJsonForFeatures, scratchDir, tagDiff } from '../utils.js';

console.log(`Diffing OSM features with USGS source features`);

clearDirectory(scratchDir + 'usgs/diffed/');
clearDirectory(scratchDir + 'usgs/diffed/modified/bystate/');
clearDirectory(scratchDir + 'usgs/diffed/usgs_only/bystate/');
clearDirectory(scratchDir + 'usgs/diffed/osm_only/');

const webcamKeys = [
    'contact:webcam',
    'contact:webcam:1',
    'contact:webcam:2',
    'contact:webcam:3',
    'contact:webcam:4',
    'contact:webcam:5',
    'contact:webcam:6',
    'contact:webcam:7',
    'contact:webcam:8',
    'contact:webcam:9',
    'contact:webcam:10',
    'contact:webcam:11',
    'contact:webcam:12',
    'contact:webcam:13',
    'contact:webcam:14',
    'contact:webcam:15',
];

function cleanupWebcamValues(feature, nwisValues) {
    const beforeWebcamTags = {};
    webcamKeys.forEach(function(key) {
        if (feature.tags[key]) {
            beforeWebcamTags[key] = feature.tags[key];
            delete feature.tags[key];
        }
    });
    let cleanedValues = Object.values(beforeWebcamTags).filter(value => nwisValues.includes(value) || !value.startsWith('https://apps.usgs.gov/hivis/camera/'));
    cleanedValues = Array.from(new Set(cleanedValues.concat(nwisValues)));
    cleanedValues.forEach(value => addWebcamValue(feature, value));

    const afterWebcamTags = {};
    webcamKeys.forEach(function(key) {
        if (feature.tags[key]) afterWebcamTags[key] = feature.tags[key];
    });
}

function addWebcamValue(feature, value) {
    let osmWebcamValues = webcamKeys.map(key => feature.tags[key]).filter(val => val);
    let suffix = osmWebcamValues.length === 0 ? "" : ":" + osmWebcamValues.length;
    let targetKey = "contact:webcam" + suffix;
    feature.tags[targetKey] = value;
}

const conversionMap = JSON.parse(readFileSync(import.meta.dirname + '/data/monitoring_types.json'));

const statesByRegion = {
    "Northeast": [
        'ME', 'NH', 'VT', 'CT', 'MA', 'RI', 'NY', 'NJ', 'PA', "NB", "QC"
    ],
    "MidAtlantic": [
        'DE', 'MD', 'DC', 'WV', 'VA', "NC", "KY", "TN",
    ],
    "FourCorners": [
        'CO', 'UT', 'NM', 'AZ',
    ],
    "PacificNorthwest": [
        'WA', 'OR',
    ],
    "NorthernRockies": [
        'ID', 'MT', 'WY'
    ],
    "SouthCentral": [
        'TX', 'OK', 'AR', 'LA'
    ],
    "Southeast": [
        "MS", 'AL', "SC", "GA", "FL"
    ],
    "GreatLakes": [
        "IL", "IN", "OH", "MI", "WI"
    ],
    "NorthernPrairie": [
        "SD", "ND", "MN"
    ],
    "Central": [
        "NE", "IA", "KS", "MO"
    ],
    "CaliforniaNevada": [
        "CA", "NV"
    ]
};
const regionsByState = {};
for (let region in statesByRegion) {
    statesByRegion[region].forEach(state => {
        regionsByState[state] = region;
    });
}


let keysToAddIfMissing = {
    'depth':{},
    'ele':{},
    'ele:accuracy':{ ifAlsoAdding: 'ele' },
    'ele:datum':{ ifAlsoAdding: 'ele' },
    'name':{},
    'official_name':{},
    'operator':{},
    'operator:type':{},
    'operator:short':{},
    'operator:wikidata':{},
    'ref':{},
    'shef:location_id':{},
    'start_date':{},
    'website':{},
    'website:1':{}
};
lifecyclePrefixes.forEach(prefix => keysToAddIfMissing[`${prefix}man_made`] = {});
[...new Set(Object.values(conversionMap).map(obj => Object.keys(obj.tags)).flat())].forEach(key => keysToAddIfMissing[key] = {});

const featureTypeTags = lifecyclePrefixes.map(prefix => `${prefix}man_made`);

const keysToRemoveIfNotSpecified = featureTypeTags;

const keysToOverwrite = featureTypeTags
    .concat([
        'official_name',
        // 'shef:location_id',
        // 'website',
        // 'website:1'
    ]);

const osm = JSON.parse(readFileSync(scratchDir + 'osm/usgs/all.json'));

let osmByRef = {};
let osmByLoc = {};
osm.elements.forEach(function(feature) {

    if (feature.tags.name && feature.tags.noname) console.log(`Both "name" and "noname" present on ${feature.id}`);
    if (feature.tags.noname && feature.tags.noname !== "yes") console.log(`Unexpected "noname" value ${feature.tags.noname} on ${feature.id}`);

    if (feature.tags.ref) {
        if (!(/^\d{8,15}$/.test(feature.tags.ref))) console.log(`Unexpected "ref" for ${feature.id}`);
        if (osmByRef[feature.tags.ref]) console.log(`Duplicate OSM elements for "ref=${feature.tags.ref}": ${osmByRef[feature.tags.ref].id} and ${feature.id}`);
        osmByRef[feature.tags.ref] = feature;
    } else {
        console.log(`Missing "ref" for https://openstreetmap.org/${feature.type}/${feature.id}`);
    }

    if (feature.type === 'node') {
        let loc = locHash(feature);
        if (osmByLoc[loc]) console.log(`OSM elements have the same location: ${osmByLoc[loc].id} and ${feature.id}`);
        osmByLoc[loc] = feature;
    }
});

let usgsRefsSeen = {};

await iterateFilesInDirectory(scratchDir + 'usgs/formatted/bystate/', function(result, filename) {
    const state = filename.slice(0, 2);
    console.log(`Diffing ${state}...`);

    const usgsFeatures = JSON.parse(result).features;
    const usgsByRefInState = {};
    usgsFeatures.forEach(function(feature) {
        usgsRefsSeen[feature.properties.ref] = true;
        if (usgsByRefInState[feature.properties.ref]) console.log('Duplicate USGS elements for: ' + feature.properties.ref);
        usgsByRefInState[feature.properties.ref] = feature;
    });

    const osmByRefInState = {};
    for (let ref in osmByRef) {
        if (usgsByRefInState[ref]) {
            osmByRefInState[ref] = osmByRef[ref];
        }
    }

    let updatedInState = [];
    for (let ref in osmByRefInState) {
        let osmFeature = osmByRefInState[ref];
        let latest = usgsByRefInState[ref];

        let beforeTags = Object.assign({}, osmFeature.tags);

        let nwisWebcamValues = webcamKeys.map(key => latest.properties[key]).filter(val => val);
        cleanupWebcamValues(osmFeature, nwisWebcamValues);
        
        for (let key in keysToAddIfMissing) {
            
            // If a feature is marked as not having a name, don't add one
            if (key === 'name' && osmFeature.tags.noname === 'yes') continue;
            
            if (!osmFeature.tags[key] && latest.properties[key]) {
                let opts = keysToAddIfMissing[key];
                if (opts.ifAlsoAdding && (beforeTags[opts.ifAlsoAdding] || !latest.properties[opts.ifAlsoAdding])) {
                    continue;
                }
                osmFeature.tags[key] = latest.properties[key];
            }
        }
        for (let i in keysToOverwrite) {
            let key = keysToOverwrite[i];
            if (osmFeature.tags[key] && latest.properties[key] &&
                osmFeature.tags[key] !== latest.properties[key]) {
                osmFeature.tags[key] = latest.properties[key];
            }
        }
        for (let i in keysToRemoveIfNotSpecified) {
            let key = keysToRemoveIfNotSpecified[i];
            if (osmFeature.tags[key] && !latest.properties[key]) {
                delete osmFeature.tags[key];
            }
        }

        let diff = tagDiff(beforeTags, osmFeature.tags);

        if (Object.keys(diff.added).length || Object.keys(diff.deleted).length) {
            if (updatedInState.length === 0) {
                console.log(`  To update:`);
            }
            console.log(`  ${osmFeature.tags.name} (${osmFeature.tags.ref}) https://openstreetmap.org/${osmFeature.type}/${osmFeature.id}`);
            for (let key in diff.deleted) {
                console.log(`      - ${key}=${diff.deleted[key]}`);
            }
            for (let key in diff.added) {
                console.log(`      + ${key}=${diff.added[key]}`);
            }
            updatedInState.push(osmFeature);
        }
    }
    if (updatedInState.length) {
        writeFileSync(scratchDir + 'usgs/diffed/modified/bystate/' + state + '.osc', osmChangeXmlForFeatures(updatedInState));
        console.log(`  ${updatedInState.length} to update`);
    }

    let usgsOnlyFeatures = [];

    for (let ref in usgsByRefInState) {
        let usgsFeature = usgsByRefInState[ref];
        if (usgsFeature.isActive && !osmByRef[ref]) {

            let loc = locHash(usgsFeature);
            if (osmByLoc[loc]) {
                console.log(`Offsetting coordinates to avoid overlapping nodes: ${ref}`);
                usgsFeature.geometry.coordinates[0] += 0.00001;
                loc = locHash(usgsFeature);
            }
            osmByLoc[loc] = true;
            usgsOnlyFeatures.push(usgsFeature);
        }
    }
    if (usgsOnlyFeatures.length) {
        writeFileSync(scratchDir + 'usgs/diffed/usgs_only/bystate/' + state + '.geojson', JSON.stringify(geoJsonForFeatures(usgsOnlyFeatures), null, 2));
        console.log(`  ${usgsOnlyFeatures.length} new to add`);
    }
});

let osmOnlyFeatures = [];
for (let ref in osmByRef) {
    if (!usgsRefsSeen[ref]) {
        osmOnlyFeatures.push(osmByRef[ref]);
    }
}

if (osmOnlyFeatures.length) {
    writeFileSync(scratchDir + 'usgs/diffed/osm_only/all.json', JSON.stringify(osmOnlyFeatures, null, 2));
    console.log(`${osmOnlyFeatures.length} features in OSM only, require manual review`);
}

console.log(`Diffing complete!`);
