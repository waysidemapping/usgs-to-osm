import { fetchOsmData, lifecyclePrefixes } from '../utils.js';
import { downloadItems } from './download_stations.js';
import { formatItems } from './format_stations.js';
import { diffItems } from './diff.js';

function formatString(str) {
    return str
        .trim()
        .replaceAll(/\s+/gi, ' '); // replace each run of whitespace with single space 
}

const definitions = {
    'indego': {
        // https://www.rideindego.com/stations/
        sourceFileUrl: `https://bts-status.bicycletransit.workers.dev/phl`,
        overpassQuery: "(" + lifecyclePrefixes.map(prefix => `node["${prefix}amenity"="bicycle_rental"]["network:wikidata"="Q19876452"];`).join('\n') + ");",
        filter: function(item) {
            return !item.properties.isEventBased && !item.properties.isVirtual;
        },
        tags: function(item) {
            let hasInteractiveKiosk = item.properties.kioskType === 1; // 10 for "energy saving stations" with no kiosk
            let tags = {
                "amenity": "bicycle_rental",
                "bicycle_rental": "docking_station",
                "rental": "city_bike;ebike",
                "self_service": "yes",
                "capacity": item.properties.totalDocks.toString(),
                "wheelchair": "no",
                "min_age": "14",
                "opening_hours": "24/7",

                "name": formatString(item.properties.name),
                "official_name": formatString(item.properties.name),
                "ref": item.properties.id.toString(),
                "addr:city": formatString(item.properties.addressCity),
                "addr:state": formatString(item.properties.addressState),
                "addr:postcode": formatString(item.properties.addressZipCode),

                "brand": "Indego",
                "brand:wikidata": "Q19876452",
                "network": "Indego",
                "network:wikidata": "Q19876452",

                "operator": "Bicycle Transit Systems",
                "operator:wikidata": "Q104005517",
                "operator:type": "private",
                "owner": "City of Philadelphia",
                "owner:wikidata": "Q1345",
                "ownership": "municipal",
                "sponsor": "Independence Blue Cross",
                "sponsor:wikidata": "Q6015932",
                
                "website": "https://www.rideindego.com",
                "email": "support@rideindego.com",
                "phone": "+1 844-446-3346",
                "contact:facebook": "RideIndego",
                "contact:instagram": "rideindego",
                
                "kiosk": hasInteractiveKiosk ? "yes" : "no",
                "fee": "yes",
                // cash never accepted at bike station itself
                "payment:cash": "no",
                // can only unlock bike with card (without phone) if kiosk is interactive 
                "payment:credit_cards": hasInteractiveKiosk ? "yes" : "no",
                "payment:debit_cards": hasInteractiveKiosk ? "yes" : "no",
                // can always unlock bike with Indego app
                "payment:app": "yes"
            };
            
            let addr = formatString(item.properties.addressStreet);
            // Only add the address if in the form 1234 or 1234-1236 followed by the street name
            if (/^\d+(?:-\d+)? .+/.test(addr)) {
                let houseNum = addr.substring(0, addr.indexOf(' ')).trim();
                let street = addr.substring(addr.indexOf(' ') + 1).trim();
                street = street
                    .replaceAll(',', '')
                    .replaceAll(/\bSt(?:\.|\b)/g, 'Street')
                    .replaceAll(/\bAve(?:\.|\b)/g, 'Avenue')
                    .replaceAll(/\bBlvd(?:\.|\b)/g, 'Boulevard')
                    .replaceAll(/\bPkwy(?:\.|\b)/g, 'Parkway')
                    .replaceAll(/\bPl(?:\.|\b)/g, 'Place')
                    .replaceAll(/\bS(?:\.|\b)/g, 'South')
                    .replaceAll(/\bN(?:\.|\b)/g, 'North')
                    .replaceAll(/\bE(?:\.|\b)/g, 'East')
                    .replaceAll(/\bW(?:\.|\b)/g, 'West');

                tags["addr:housenumber"] = houseNum;
                tags["addr:street"]= street;
            }
            return tags;
        }
    },
    'rtc-bike-share': {
        sourceFileUrl: `https://bts-status.bicycletransit.workers.dev/las`,
        overpassQuery: "(" + lifecyclePrefixes.map(prefix => `node["${prefix}amenity"="bicycle_rental"]["network:wikidata"="Q104727968"];`).join('\n') + ");",
        tags: function(item) {
            return {
                "name": formatString(item.properties.name),
                "official_name": formatString(item.properties.name),
                "addr:city": formatString(item.properties.addressCity),
                "addr:state": formatString(item.properties.addressState),
                "addr:postcode": formatString(item.properties.addressZipCode),
                "ref": item.properties.id.toString(),
                "capacity": item.properties.totalDocks.toString(),
                "amenity": "bicycle_rental",
                "bicycle_rental": "docking_station",
                "brand": "RTC Bike Share",
                "brand:wikidata": "Q104727968",
                "network": "RTC Bike Share",
                "network:wikidata": "Q104727968",
                "operator": "Bicycle Transit Systems",
                "operator:wikidata": "Q104005517",
                "fee": "yes",
                "rental": "city_bike;ebike",
                "website": "https://bikeshare.rtcsnv.com",
                "email": "support@bikeshare.rtcsnv.com",
                "phone": "+1 844-641-7823",
            };
        }
    }
};


for (let id in definitions) {
    let def = definitions[id];
    await downloadItems(id, def.sourceFileUrl);
    formatItems(id, def.filter, def.tags);
    await fetchOsmData(id, def.overpassQuery);
    diffItems(id);
}