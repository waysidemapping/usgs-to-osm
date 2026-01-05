import { request } from 'https';
import { existsSync, readdirSync, rmSync, mkdirSync, writeFileSync } from 'fs';
import { readFile } from 'fs/promises';
import { dirname } from 'path';
import { fileURLToPath } from 'url';

export function dirForUrl(url) {
  return dirname(fileURLToPath(url));
}

export const scratchDir = dirForUrl(import.meta.url) + '/../scratch/';

export async function iterateFilesInDirectory(dir, withFunction) {
  return Promise.all(readdirSync(dir).map(file => {
      return readFile(dir + file).then(result => withFunction(result, file));
  }));
}

export function clearDirectory(dir) {
  if (existsSync(dir)) readdirSync(dir).forEach(f => rmSync(`${dir}${f}`, { recursive: true }));
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
}

export function getString(url, opts) {
  return get(url, opts).then(result => result?.toString());
}

export function get(url, opts) {

  const options = {
    method: 'GET',
    timeout: 60000, // in ms
  }

  return new Promise((resolve, reject) => {
    const req = request(url, options, (res) => {
      if (res.statusCode < 200 || res.statusCode > 299) {
        if (opts?.returnNullOnBadStatus) {
          resolve(null)
        } else {
          return reject(new Error(`HTTP status code ${res.statusCode}`))
        }
      } else {
        const body = []
        res.on('data', (chunk) => body.push(chunk))
        res.on('end', () => {
          resolve(Buffer.concat(body))
        })
      }
    })

    req.on('error', (err) => {
      reject(err)
    })

    req.on('timeout', () => {
      req.destroy()
      reject(new Error('Request time out'))
    })

    req.end()
  })
}

export function post(url, dataString) {

  const options = {
    method: 'POST',
    headers: {
      'Content-Type': 'x-www-form-urlencoded',
      'Content-Length': dataString.length,
    },
    timeout: 60000, // in ms
  }

  return new Promise((resolve, reject) => {
    const req = request(url, options, (res) => {
      if (res.statusCode < 200 || res.statusCode > 299) {
        return reject(new Error(`HTTP status code ${res.statusCode}`))
      }

      const body = []
      res.on('data', (chunk) => body.push(chunk))
      res.on('end', () => {
        const resString = Buffer.concat(body).toString()
        resolve(resString)
      })
    })

    req.on('error', (err) => {
      reject(err)
    })

    req.on('timeout', () => {
      req.destroy()
      reject(new Error('Request time out'))
    })

    req.write(dataString)
    req.end()
  })
}

export function toTitleCase(str) {
  return str.replace(
    /\b\D+?\b/g,
    function(txt) {
      return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
    }
  );
}

export const lifecyclePrefixes = ['', 'disused:', 'abandoned:', 'ruins:', 'demolished:', 'destroyed:', 'razed:', 'removed:', 'was:'];

export async function fetchOsmData(id, queryInner) {

  // do not limit to the US since some sites are in Canada
  const query = `
  [out:json][timeout:60];
  (
  ${queryInner}
  );
  (._;>;); out meta;
  `;

  clearDirectory(scratchDir + `osm/${id}/`);
  
  let postData = "data="+encodeURIComponent(query);
  
  console.log(`Running Overpass query for '${id}'. This may take some time…`);
  await post('https://overpass-api.de/api/interpreter', postData).then(function(response) {
    console.log(`${JSON.parse(response)?.elements?.length} OSM entities returned`);
    let localPath = scratchDir + `osm/${id}/all.json`;
    console.log(`Writing data to '${localPath}'`);
    writeFileSync(localPath, response);
  });
}

export function locHash(obj) {
  let lon = obj.lon || obj.geometry.coordinates[0];
  let lat = obj.lat || obj.geometry.coordinates[1];
  return Math.round(lon*500000)/500000 + "," + Math.round(lat*500000)/500000;
}

export function osmChangeXmlForFeatures(features) {
  function xmlForFeature(feature) {
      let xml = `<node id="${feature.id}" version="${feature.version}" lat="${feature.lat}" lon="${feature.lon}">\n`;
      for (let key in feature.tags) {
          xml += `<tag k="${key}" v="${feature.tags[key].replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('"', '&quot;')}"/>\n`;
      }
      xml += '</node>\n';
      return xml;
  }
  
  let xml = `<osmChange version="0.6">\n<modify>\n`;
  features.forEach(function(feature) {
      xml += xmlForFeature(feature);
  });
  xml += `</modify>\n</osmChange>\n`;
  return xml;
}

export function geoJsonForFeatures(features) {
  return {
      "type": "FeatureCollection",
      "features": features
  };
}