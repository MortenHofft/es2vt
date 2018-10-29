/**
 * get tile from source
 *   parse vector tile
 * build tile query
 * add aggregation to query
 * get data from ES
 * 
 * decorate tile with data from ES.
 * 
 * return decorated tile
 */
const axios = require('axios');
var hash = require('object-hash');
const LRU = require('lru-cache');
const bodybuilder = require('bodybuilder');
const composeTileQuery = require('../util/composeTileQuery');
const addCountsToTile = require('./addCountsToTile');
const cache = new LRU({ max: 10000 });
const mbtiles = require('../mbtiles/mbtiles');
const zlib = require("zlib");

async function getdecoratedTile(options) {
    try {
        // get tile from options.source
        const { x, y, z, source, sourceUrl, query, esLocationField, esAggField, tileField, aggregationSize, esEndpoint, tileLayerName } = options;
        let sourceTile = getVectorTileFromDisc(x, y, z, source);
        // let sourceTile = getVectorTileFromURL(x, y, z, sourceUrl);
        
        // console.log('compose tile');
        // get elastic search query to get tile information
        let tileQuery = composeTileQuery(0, 0, 0, query, esLocationField);// merge tile query and user query
        let esQuery = bodybuilder()
            .size(0)
            .aggregation('terms', esAggField, { size: aggregationSize || 1000 })
            .build();
        esQuery.query = tileQuery;

        // create hash and test if we already have the response it in cache
        let esCounts = cache.get(hash(esQuery));
        if (!esCounts) {
            // console.log('get data');
            esCounts = getEsCounts(esEndpoint, esAggField, esQuery);
        }

        // console.log('wait for data');
        // get tile data and ES data
        let results = await Promise.all([sourceTile, esCounts]);

        // update cache with data - i guess there is no need to do that in cases where it was already there.
        cache.set(hash(esQuery), results[1])

        // merge the 2 - that is add counts from ES to the tile features.
        let decoratedTile = await addCountsToTile(results[0], results[1], tileField, tileLayerName);

        return decoratedTile;
    } catch (err) {
        throw err;
    }
}

/**
 * get parsed vector tile
 * @param {number} x 
 * @param {number} y 
 * @param {number} z 
 * @param {string} source [name].mbtiles
 */
async function getVectorTileFromURL(x, y, z, tileSource) {
    let url = `${tileSource}/${z}/${x}/${y}`;
    let response = await axios.get(url, {
        responseType: 'arraybuffer'
    });
    return response.data;
}

function getVectorTileFromDisc(x, y, z, tileSource) {
    return new Promise(function (resolve, reject) {
        mbtiles[tileSource].getTile(z, x, y, function (err, tile, headers) {
            if (err) {
                reject(err);
            } else {
                zlib.unzip(tile, {}, (err, buffer) => {
                    if (err) {
                        reject(err);
                    }
                    resolve(buffer);
                });
            }
        });
    });
}

async function getEsCounts(endpoint, esAggField, query) {
    let response = await axios.post(endpoint, query);
    return response.data.aggregations['agg_terms_' + esAggField].buckets;
}

// TEST
// setTimeout(x => {
//     getdecoratedTile({
//         x: 0,
//         y: 0,
//         z: 0,
//         source: 'denmark',
//         sourceURL: 'http://localhost:3000/api/tile/raw/country',
//         locationField: 'coordinate_point',
//         tileProperty: 'GID_2',
//         esAggField: 'gadm.GID_2',
//         esEndpoint: 'http://es1.gbif-dev.org:9200/gadm/_search'
//     });
// }, 200);

module.exports = getdecoratedTile;