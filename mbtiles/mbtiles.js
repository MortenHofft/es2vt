const MBTiles = require('@mapbox/mbtiles');
const path = require("path");

const sources = ['country', 'denmark'];
let tiles = {};

sources.forEach(function(source){
  new MBTiles(path.join(__dirname, 'sources', `${source}.mbtiles`), function (err, mbtiles) {
    if (err) {
      console.error(`Error opening data source: ${source}.mbtiles`)
    } else {
      tiles[source] = mbtiles;
    }
  });
});

module.exports = tiles;