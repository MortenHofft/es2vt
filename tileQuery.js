let tileGenerator = require('./esAgg2tile'),
    coordinateConverter = require('./coordinateConverter'),
    request = require('requestretry'),
    tile2pbf = require('./tile2pbf'),
    defaultUrl = 'http://es1.gbif-dev.org:9200/occurrence_v1/_search?',
    hash = require('object-hash'),
    _ = require('lodash'),
    LRU = require('lru-cache');

const cache = new LRU({ max: 10000 });

//9 ≈ 2.4 meters
let precisionLookUp = [
    3, 3, 3, 4, 4, 5, 6, 6, 6, 7, 7, 8, 9, 9, 9, 9
];
precisionLookUp = [
    2, 2, 3, 4, 4, 4, 5, 5, 5, 5, 6, 6, 7, 7, 8, 8, 9, 9
];

async function getTile(x, y, z, q, countBy, url, resolution, field) {
    url = url || defaultUrl;
    field = field || 'location';
    resolution = typeof resolution !== 'undefined' ? resolution : 2;

    let userQuery = q;

    var templateQuery = {
        "size": 0,
        "aggs": {
            "geo": {
                "geohash_grid": { "field": field, "precision": 2, "size": 40000 },
                "aggs": {
                    "geo": {
                        "geo_centroid": { "field": field }
                    }
                }
            }
        }
    };


    let bb = coordinateConverter.tile2boundingBox(x, y, z);
    templateQuery.aggs.geo.geohash_grid.precision = precisionLookUp[z] || 2;
    let geoBoundingBox = {
        geo_bounding_box: {
        }
    };
    geoBoundingBox.geo_bounding_box[field] = {
        "top": bb.north,
        "left": bb.west,
        "bottom": bb.south,
        "right": bb.east
    };

    let filterArray = _.get(userQuery, 'bool.filter.bool.must');
    let plainFilter = _.get(userQuery, 'bool.filter');
    if (!plainFilter && !filterArray) {
        _.set(userQuery, 'bool.filter', geoBoundingBox);
    } else if (plainFilter && !filterArray) {
        _.set(userQuery, 'bool.filter', {});
        _.set(userQuery, 'bool.filter.bool.must', [plainFilter, geoBoundingBox]);
    } else {
        //is array
        userQuery.bool.filter.bool.must.push(geoBoundingBox);
    }
    templateQuery.query = userQuery;

    let queryKey = hash({templateQuery, url, countBy});
    let data = cache.get(queryKey);
    if (!data) {
        data = await getFromES(templateQuery, url);
        cache.set(queryKey, data);
    }
    // console.log(JSON.stringify(templateQuery, null, 2));
    // console.log(data);
    let tile = tileGenerator(data, x, y, z, 4096);
    let buff = tile2pbf(tile);

    return buff;
}

async function getFromES(query, url) {
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


let exampleQuery = {
    "bool": {
        "filter": {
            "bool": {
                "must": [
                    {
                        "terms": {
                            "issue": [
                                "RECORDED_DATE_INVALID"
                            ]
                        }
                    },
                    {
                        "terms": {
                            "datasetKey": [
                                "1d8ade61-ffe9-4950-a3d2-26c99ca28b15",
                                "f577c9f3-ae71-4278-b6bf-512ba1dfaa21"
                            ]
                        }
                    }
                ]
            }
        }
    }
};