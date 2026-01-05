import { readFileSync, writeFileSync } from 'fs';
import { getString, clearDirectory, scratchDir } from '../utils.js';

const conversionMap = JSON.parse(readFileSync(import.meta.dirname + '/data/monitoring_types.json'));

clearDirectory(scratchDir + 'usgs/nwis/current/');

function buildUrl(codesString) {
  if (!codesString) codesString = '';
  return `https://nwis.waterdata.usgs.gov/nwis/current?index_pmcode_STATION_NM=1${codesString}&group_key=NONE&format=sitefile_output&sitefile_output_format=rdb_file&column_name=agency_cd&column_name=site_no&column_name=station_nm&column_name=site_tp_cd&column_name=lat_va&column_name=long_va&column_name=dec_lat_va&column_name=dec_long_va&column_name=coord_meth_cd&column_name=coord_acy_cd&column_name=coord_datum_cd&column_name=dec_coord_datum_cd&column_name=district_cd&column_name=state_cd&column_name=county_cd&column_name=country_cd&column_name=land_net_ds&column_name=map_nm&column_name=map_scale_fc&column_name=alt_va&column_name=alt_meth_cd&column_name=alt_acy_va&column_name=alt_datum_cd&column_name=huc_cd&column_name=basin_cd&column_name=topo_cd&column_name=data_types_cd&column_name=instruments_cd&column_name=construction_dt&column_name=inventory_dt&column_name=drain_area_va&column_name=contrib_drain_area_va&column_name=tz_cd&column_name=local_time_fg&column_name=reliability_cd&column_name=gw_file_cd&column_name=nat_aqfr_cd&column_name=aqfr_cd&column_name=aqfr_type_cd&column_name=well_depth_va&column_name=hole_depth_va&column_name=depth_src_cd&column_name=project_no&column_name=rt_bol&column_name=peak_begin_date&column_name=peak_end_date&column_name=peak_count_nu&column_name=qw_begin_date&column_name=qw_end_date&column_name=qw_count_nu&column_name=gw_begin_date&column_name=gw_end_date&column_name=gw_count_nu&column_name=sv_begin_date&column_name=sv_end_date&column_name=sv_count_nu&sort_key_2=site_no&html_table_group_key=NONE&rdb_compression=file&list_of_search_criteria=realtime_parameter_selection`;
}

console.log('Fetching latest data for the 16,000+ currently active USGS NWIS sites…');
async function getAndSave(remoteUrl, localUrl) {
  await getString(remoteUrl).then(function(response) {
    // expect a commented description above data
    if (response[0] === "#") {
      // remove the description
      response = response.split('\n').slice(75);
      // remove string length row below headers
      response.splice(1, 1);
      // join back together
      response = response.join('\n');
    } else {
      // otherwise only an error page was returned
      response = "";
    }
    console.log(`Writing data to ${localUrl}`);
    writeFileSync(localUrl, response);
  });
}
await getAndSave(buildUrl(), scratchDir + `usgs/nwis/current/all.csv`);

for (let filename in conversionMap) {
  let codes = conversionMap[filename].codes;
  let codesString = '';
  for (let i in codes) {
    let code = codes[i];
    codesString += `&index_pmcode_${code}=${i+1}`;
  }
  await getAndSave(buildUrl(codesString), scratchDir + `usgs/nwis/current/${filename}.csv`)
}
