const express = require('express');
const { drchronoAuth } = require('../middleware/drchrono');

const router = express.Router();

// GET /api/appointments
// Supported query params (passed through to DrChrono):
//   ?date=YYYY-MM-DD        — appointments on this date
//   ?date_range=YYYY-MM-DD/YYYY-MM-DD
//   ?doctor=<id>
//   ?office=<id>
//   ?patient=<id>
//   ?status=<status>
router.get('/', drchronoAuth, async (req, res) => {
  try {
    const response = await req.drchrono.get('/appointments', { params: req.query });
    res.json(response.data);
  } catch (err) {
    const status = err.response?.status || 500;
    res.status(status).json({ error: err.response?.data || err.message });
  }
});

// GET /api/appointments/:id
router.get('/:id', drchronoAuth, async (req, res) => {
  try {
    const response = await req.drchrono.get(`/appointments/${req.params.id}`);
    res.json(response.data);
  } catch (err) {
    const status = err.response?.status || 500;
    res.status(status).json({ error: err.response?.data || err.message });
  }
});

// POST /api/appointments
// Required body fields (DrChrono):
//   doctor, office, patient, scheduled_time (ISO 8601), exam_room, duration
//   appointment_profile or reason
router.post('/', drchronoAuth, async (req, res) => {
  try {
    const response = await req.drchrono.post('/appointments', req.body);
    const appt = response.data;

    // Immediately PATCH to set telehealth fields after creation
    try {
      await req.drchrono.patch(`/appointments/${appt.id}`, {
        is_telehealth: true,
        is_virtual_base: true,
      });
    } catch (patchErr) {
      console.warn('Could not patch telehealth fields:', patchErr.message);
    }

    res.status(201).json(appt);
  } catch (err) {
    const status = err.response?.status || 500;
    res.status(status).json({ error: err.response?.data || err.message });
  }
});

// PATCH /api/appointments/:id  — partial update (e.g. cancel)
router.patch('/:id', drchronoAuth, async (req, res) => {
  try {
    const response = await req.drchrono.patch(`/appointments/${req.params.id}`, req.body);
    res.json(response.data);
  } catch (err) {
    const status = err.response?.status || 500;
    res.status(status).json({ error: err.response?.data || err.message });
  }
});

module.exports = router;
