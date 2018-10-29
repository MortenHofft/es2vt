let tileGenerator = require('./esAgg2tile'),
    //coordinateConverter = require('../util/coordinateConverter'),
    composeTileQuery = require('../util/composeTileQuery'),
    request = require('requestretry'),
    tile2pbf = require('./tile2pbf'),
    defaultUrl = 'http://es1.gbif-dev.org:9200/occurrence_v1/_search?',
    hash = require('object-hash'),
    _ = require('lodash'),
    LRU = require('lru-cache'),
    axios = require('axios');

const cache = new LRU({ max: 10000 });

//9 ≈ 2.4 meters
let precisionLookUp = [
    3, 3, 3, 4, 4, 5, 6, 6, 6, 7, 7, 8, 9, 9, 9, 9
];
precisionLookUp = [
    2, 2, 3, 4, 4, 4, 5, 5, 5, 6, 6, 7, 7, 8, 8, 9, 9, 10
];

async function getTile(x, y, z, q, countBy, url, resolution, field) {
    let userQuery = q;
    url = url || defaultUrl;
    field = field || 'location';
    resolution = typeof resolution !== 'undefined' ? resolution : 2;

    let tileQuery = composeTileQuery(x, y, z, userQuery, field);// merge tile query and user query
    let esQuery = {
        size: 0,
        query: tileQuery,
        aggs: {
            geo: {
                geohash_grid: { 
                    field: field, 
                    precision: precisionLookUp[z] || 11, 
                    size: 40000 
                },
                aggs: {
                    geo: {
                        geo_centroid: { field: field }
                    }
                }
            }
        }
    };

    let queryKey = hash({esQuery, url, countBy});
    let data = cache.get(queryKey);
    if (!data) {
        data = await getFromES(esQuery, url);
        cache.set(queryKey, data);
    }
    
    let tile = tileGenerator(data, x, y, z, 4096);
    let buff = tile2pbf(tile);

    return buff;
}

async function getFromES(query, endpoint) {
    // console.log(JSON.stringify(query, null, 2));
    let response = await axios.post(endpoint, query);
    return response.data;
}

async function getFromES_old(query, url) {
    let response = await request({
        url: url,
        json: true,
        method: 'POST',
        body: query
    });
    if (response.statusCode == 200) {
        return response.body;
    } else {
        throw query;
    }
}

module.exports = {
    getTile: getTile
};