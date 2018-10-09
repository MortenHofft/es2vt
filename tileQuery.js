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
    console.log(url);
    field = field || 'location';
    resolution = typeof resolution !== 'undefined' ? resolution : 2;

    var templateQuery = {
        "size": 0,
        "query": {
            "bool": {
                "must": {
                    "query_string": { "query": "", "analyze_wildcard": true }
                },
                "filter": {
                    "geo_bounding_box": {
                        // "location": {
                        //     "top": 76.25,
                        //     "left": 0.4375,
                        //     "bottom": 14.84375,
                        //     "right": 9.84375
                        // }
                    }
                }
            }
        },
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

    var density = {
        "cardinality": {
            "field": "species.keyword",
            "precision_threshold": 50
        }
    };

    let bb = coordinateConverter.tile2boundingBox(x, y, z);
    let query = templateQuery;

    query.aggs.geo.geohash_grid.precision = precisionLookUp[z] || 2;
    query.query.bool.filter.geo_bounding_box[field] = {
        "top": bb.north,
        "left": bb.west,
        "bottom": bb.south,
        "right": bb.east
    };
    query.query.bool.must.query_string.query = q;
    if (!q || q === '*') {
        query.query.bool.must = {
            "match_all": {}
        };
    }

    if (countBy && countBy !== '') {
        query.aggs.geo.aggs.density = density;
        query.aggs.geo.aggs.density.cardinality.field = countBy;
    }

    let queryKey = hash(query);
    let data = cache.get(queryKey);
    if (!data) {
        data = await getFromES(query, url);
        cache.set(queryKey, data);
    }
    console.log(JSON.stringify(query, null, 2));
    // console.log(data);
    let tile = tileGenerator(data, x, y, z, 4096);
    let buff = tile2pbf(tile);

    return buff;
}

async function getFilteredTile(x, y, z, q, countBy, url, resolution, field) {
    url = url || defaultUrl;
    field = field || 'location';
    resolution = typeof resolution !== 'undefined' ? resolution : 2;

    let userQuery = {
        "bool": {
            "filter": {
                "bool": {
                    "must": [
                        {
                            "terms": {
                                "basisOfRecord": [
                                    "OBSERVATION"
                                ]
                            }
                        }
                    ]
                }
            }
        }
    };
    if (!_.has(userQuery, 'bool.filter.bool.must')) {
        _.set(userQuery, 'bool.filter.bool.must', []);
    }

    var templateQuery = {
        "size": 0,
        "query": userQuery,
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
    let query = templateQuery;

    query.aggs.geo.geohash_grid.precision = precisionLookUp[z] || 2;
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
    query.query.bool.filter.bool.must.push(geoBoundingBox);

    let queryKey = hash(query);
    let data = cache.get(queryKey);
    if (!data) {
        data = await getFromES(query, url);
        cache.set(queryKey, data);
    }
    console.log(JSON.stringify(query, null, 2));
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
    getTile: getTile,
    getFilteredTile: getFilteredTile
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