const express = require('express');

const PORT = process.env.PORT || 3000;
const GRIDID_PREFIX = 'AQUARIUS GRID ';
const app = express();

function gridIDForLocation(lat, long) {
  // TODO: Retrieve this from a legit source
  console.log('Retrieving grid for', lat, long);
  return GRIDID_PREFIX + '47ffc1c1-5772-44d0-a687-b8c812ef5264';
}

app.get('/grid/id/:lat/:long', (req, res) => {
  const { lat, long } = req.params;
  const gridID = gridIDForLocation(lat, long);
  res.set('Content-Type', 'application/json');
  res.send({ lat, long, grid_id: gridID });
});

app.listen(PORT, () => console.log(`Grid server listening on port ${PORT}`));
