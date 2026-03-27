const express = require('express');
const { drchronoAuth } = require('../middleware/drchrono');

const router = express.Router();

// GET /api/doctors
// Proxies DrChrono /doctors endpoint
// Optional query params: ?office=<id> filters by office
router.get('/', drchronoAuth, async (req, res) => {
  try {
    const response = await req.drchrono.get('/doctors', { params: req.query });
    res.json(response.data);
  } catch (err) {
    const status = err.response?.status || 500;
    res.status(status).json({ error: err.response?.data || err.message });
  }
});

// GET /api/doctors/:id
router.get('/:id', drchronoAuth, async (req, res) => {
  try {
    const response = await req.drchrono.get(`/doctors/${req.params.id}`);
    res.json(response.data);
  } catch (err) {
    const status = err.response?.status || 500;
    res.status(status).json({ error: err.response?.data || err.message });
  }
});

module.exports = router;
