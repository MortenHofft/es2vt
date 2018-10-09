let coordinateConverter = require('./coordinateConverter');

module.exports = agg2tile;

function agg2tile(results, x, y, z, extent) {
    let z2 = 1 << z;

    var buckets = results.aggregations.geo.buckets;
    var features = [];
    buckets.forEach(function (e) {
        addFeature(e, x, y, z2, extent, features);
    });

    var tile = {
        layers: [
            {
                name: 'occurrences',
                version: 2,
                extent: 4096,
                features: features
            }
        ]
    };

    return tile;
}

function addFeature(e, x, y, z, extent, features) {
    //transform to tile coordinate
    let tileCoordinates = coordinateConverter.getTileCoordinates(e.geo.location.lat, e.geo.location.lon, x, y, z, extent);
    if (!tileCoordinates) {
        // console.log('lat lon outside tile - this shouldn\'t happen'); //TODO investigate why this is in fact happening
        return;
    }
    var prop = {
        geometry: [ [ { x: tileCoordinates.x, y: tileCoordinates.y} ] ],
        properties: {
            count: e.geo.count,
            geohash: e.key,
            precision: e.key.length
        },
        type: 1
    };
    if (e.density) {
        prop.properties.count = e.density.value;
    }

    features.push(prop);
}