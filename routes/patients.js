const express = require('express');
const { drchronoAuth } = require('../middleware/drchrono');

const router = express.Router();

// GET /api/patients
// Supported query params: ?first_name=&last_name=&date_of_birth=YYYY-MM-DD&email=
router.get('/', drchronoAuth, async (req, res) => {
  try {
    const response = await req.drchrono.get('/patients', { params: req.query });
    res.json(response.data);
  } catch (err) {
    const status = err.response?.status || 500;
    res.status(status).json({ error: err.response?.data || err.message });
  }
});

// GET /api/patients/:id
router.get('/:id', drchronoAuth, async (req, res) => {
  try {
    const response = await req.drchrono.get(`/patients/${req.params.id}`);
    res.json(response.data);
  } catch (err) {
    const status = err.response?.status || 500;
    res.status(status).json({ error: err.response?.data || err.message });
  }
});

// POST /api/patients — create a new patient
// Required: first_name, last_name, date_of_birth, gender
// Optional: email, cell_phone, home_phone, address, city, state, zip_code
router.post('/', drchronoAuth, async (req, res) => {
  try {
    const response = await req.drchrono.post('/patients', req.body);
    res.status(201).json(response.data);
  } catch (err) {
    const status = err.response?.status || 500;
    res.status(status).json({ error: err.response?.data || err.message });
  }
});

// PATCH /api/patients/:id — partial update
router.patch('/:id', drchronoAuth, async (req, res) => {
  try {
    const response = await req.drchrono.patch(`/patients/${req.params.id}`, req.body);
    res.json(response.data);
  } catch (err) {
    const status = err.response?.status || 500;
    res.status(status).json({ error: err.response?.data || err.message });
  }
});

module.exports = router;
