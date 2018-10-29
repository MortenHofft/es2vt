const TileDecorator = require('./tile-decorator');

function addCounts(sourceTile, counts, tileField, tileLayerName) {
  let tile = TileDecorator.read(sourceTile);
  let layer = tile.layers[0];
  if (tileLayerName) {
    for (var i = 0; i < tile.layers.length; i++) {
      layer = tile.layers[i];
      if (layer.name === tileLayerName) {
        layer = tile.layers[i];
        break;
      }
    }
  }
  tile.layers = [layer];

  let countMap = {};
  counts.forEach(function (e) {
    countMap[e.key] = e.doc_count;
  });

  TileDecorator.updateLayerPropertiesWithCounts(layer, countMap, tileField);
  TileDecorator.mergeLayer(layer);
  layer.name = 'Decorated';
  let vt = TileDecorator.write(tile);
  return new Buffer(vt);
}

module.exports = addCounts;