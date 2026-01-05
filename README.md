# usgs-to-osm

_A tool to keep USGS monitoring sites fresh and accurate in OpenStreetMap._

There are over 16,000 active water monitoring sites operated by the United States Geological Survey (USGS). These provide real-time data on surface water, groundwater, and atmospheric conditions across the US. It is useful to map detailed USGS site information in OpenStreetMap (OSM) so that people can easily query and compile sites within and between monitoring networks, as well as link the data to other databases.

Converting and maintaining USGS data is not trivial. USGS does not appear to distribute detailed, up-to-date spatial data of its sites. Official USGS site names can often be highly abbreviated, verbose, all-caps, outdated, incomplete, or simply innacurate. USGS coordinate information is relatively coarse (sometimes off by 100 ft or more). The site inventory itself changes frequently, as new stations are constructed and old stations are temporarily or permanently taken offline. Sometimes there are multiple sites at the same location monitoring different phenomena. This tool tries to reconcile these issues to the extent possible.

## Installing

1. Clone the repository
2. `cd` to the repo in your terminal
3. Run `npm install` to install dependencies

## To update OpenStreetMap

Run `npm run usgs`. This executes the following steps:

1. `usgs:download:nwis` fetches the latest USGS National Water Information System data
2. `usgs:download:cameras` fetches the latest USGS webcam data
3. `usgs:download:osm` downloads existing USGS sites from OSM.
4. `usgs:format` compliles the source USGS datasets into GeoJSON with OSM tags
5. `usgs:diff` compares the source data to OSM and output change files to `diff/`.
      
At this point three directories are created.

1. `diffed/modified/` – osmChange files that modify existing OSM features, adding missing tags and updating tags where USGS is the source of truth (e.g. `official_name`).
   1. Review the changes to make sure the added tags make sense. If any `official_name` name tags have changed, check if the corresponding `name` need to be updated.
   1. Upload with JOSM. If the changeset has a large bounding box, upload by state or region instead.
   2. Note: The upload will fail if any of the OSM features have been edited since running `npm run refresh_osm`.
1. `diffed/usgs_only/` – GeoJSON files containing USGS sites not present in OSM.
   1. Manually review the `name` tag of each site (expand abbreviations, add missing words, remove cruft, etc.) If the site has some nonsensical name, remove `name` and add `noname=yes` intead.
   2. Upload with JOSM. If the changeset has a large bounding box, upload by state or region instead.
   3. Manually review each uploaded site in JOSM or iD.
      1. If someone already mapped the same monitoring station, reconcile the tags and remove the duplicate.
      2. If the location looks off, try to determine the proper location through aerial and street-level imagery.
2. `diffed/usgs_only/` – an OSM JSON file containing features linked to USGS in OSM that are not found in current USGS data.
   1. Manually review each feature and look for data errors, such as a bad `ref` tag.
   2. Open the `website` link to see if the site is still active. Note that some sites are seasonal or have temporary outages due to equpiment malfunction or funding shortfall.
   3. If the site is not active, add an appropriate lifecycle tag to `man_made=monitoring_station`. Please do not delete the feature as it may later come back online or someone may erroneously re-add it. Supported lifecycle tags are:
      - `disused:man_made=monitoring_station` – not operational
      - `abandoned:man_made=monitoring_station` – not maintained
      - `ruins:man_made=monitoring_station` – in a state of significant decay 
      - `demolished:man_made=monitoring_station` – intentionally demolished
      - `destroyed:man_made=monitoring_station` – unintentionally demolished
      - `razed:man_made=monitoring_station` – somehow demolished
      - `removed:man_made=monitoring_station` – no longer extant
      - `was:man_made=monitoring_station` – now used for something else

## Example

USGS site [14162500](https://waterdata.usgs.gov/monitoring-location/14162500/) is OpenStreetMap [node/12092695009](https://www.openstreetmap.org/node/12092695009/). The tool sets the following tags from USGS data:

```
ele=260.82
ele:accuracy=3.048
ele:datum=NGVD29
man_made=monitoring_station
monitoring:dissolved_oxygen=yes
monitoring:flow_rate=yes
monitoring:water_conductivity=yes
monitoring:water_level=yes
monitoring:water_pH=yes
monitoring:water_temperature=yes
monitoring:water_turbidity=yes
name=Mckenzie River near Vida
official_name=MCKENZIE RIVER NEAR VIDA, OR
operator=United States Geological Survey
operator:short=USGS
operator:type=government
operator:wikidata=Q193755
ref=14162500
website=https://waterdata.usgs.gov/monitoring-location/14162500
```

It is incumbent upon the mapper to double check the name prior to uploading, i.e. `Mckenzie River near Vida` -> `McKenzie River near Vida`.

If, in the future, USGS adds another instrument to this site such as a rain gage, the tool with create an OSM Change file adding a tag like `monitoring:precipitation=yes`. The tool will not create changes that remove or modify existing tags since a mapper may have intentionally changed them.

## License

This repository is subject to the [ISC License](./LICENSE.md).

USGS data is made publicly available by the U.S. federal government and is [assumed to be in the public domain](https://en.wikipedia.org/wiki/Copyright_status_of_works_by_the_federal_government_of_the_United_States).

OpenStreetMap data, including USGS data extracted from OSM, is subject to the [ODbL license](https://www.openstreetmap.org/copyright/).