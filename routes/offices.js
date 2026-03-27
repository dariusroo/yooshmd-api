const express = require('express');
const { drchronoAuth } = require('../middleware/drchrono');

const router = express.Router();

// GET /api/offices
router.get('/', drchronoAuth, async (req, res) => {
  try {
    const response = await req.drchrono.get('/offices', { params: req.query });
    res.json(response.data);
  } catch (err) {
    const status = err.response?.status || 500;
    res.status(status).json({ error: err.response?.data || err.message });
  }
});

// GET /api/offices/:id
router.get('/:id', drchronoAuth, async (req, res) => {
  try {
    const response = await req.drchrono.get(`/offices/${req.params.id}`);
    res.json(response.data);
  } catch (err) {
    const status = err.response?.status || 500;
    res.status(status).json({ error: err.response?.data || err.message });
  }
});

module.exports = router;
