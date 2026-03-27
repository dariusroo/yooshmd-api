const express = require('express');
const { drchronoAuth } = require('../middleware/drchrono');

const router = express.Router();

// Hardcoded defaults matching your DrChrono office setup
const DEFAULTS = {
  doctor: 523137,
  office: 555620,
  examRoom: 1,
  profileId: 969506,       // "Initial Consultation"
  duration: 30,            // minutes per slot
  startHour: 8,            // office opens 8:00 AM
  endHour: 18,             // office closes 6:00 PM
  timezone: 'America/Los_Angeles',
};

/**
 * GET /api/slots
 *
 * Query params:
 *   ?date=YYYY-MM-DD   — date to check (defaults to tomorrow)
 *   ?duration=30       — slot length in minutes (defaults to 30)
 *   ?doctor=<id>       — override doctor (defaults to Dr. Roohani)
 *   ?office=<id>       — override office
 *
 * Logic:
 *   1. Generate all slots between office open/close at `duration` intervals
 *   2. Fetch appointments?date= from DrChrono to get booked times
 *   3. Skip any slot whose start time overlaps a booked appointment
 *   4. Skip slots in the past (if date is today)
 *   5. Return remaining available slots
 */
router.get('/', drchronoAuth, async (req, res) => {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const targetDate = req.query.date || tomorrow.toISOString().split('T')[0];
  const duration = parseInt(req.query.duration || DEFAULTS.duration, 10);
  const doctor = req.query.doctor || DEFAULTS.doctor;
  const office = req.query.office || DEFAULTS.office;

  try {
    // Fetch all appointments on this date for this doctor
    let bookedIntervals = [];
    try {
      const apptResp = await req.drchrono.get('/appointments', {
        params: { date: targetDate, doctor, office },
      });
      const booked = (apptResp.data.results || []).filter(
        (a) => !a.deleted_flag && a.status !== 'Cancelled'
      );

      // Build booked intervals: { start: Date, end: Date }
      bookedIntervals = booked.map((a) => {
        const start = new Date(a.scheduled_time);
        const end = new Date(start.getTime() + a.duration * 60000);
        return { start, end, reason: a.reason };
      });
    } catch (apptErr) {
      // If DrChrono is down, return slots without blocking (best effort)
      console.warn('Could not fetch appointments for slot blocking:', apptErr.message);
    }

    // Generate candidate slots from office hours
    const slots = generateSlots(targetDate, duration, bookedIntervals);

    res.json({
      date: targetDate,
      doctor: Number(doctor),
      office: Number(office),
      exam_room: DEFAULTS.examRoom,
      appointment_profile: DEFAULTS.profileId,
      duration,
      count: slots.length,
      slots,
    });
  } catch (err) {
    const status = err.response?.status || 500;
    res.status(status).json({ error: err.response?.data || err.message });
  }
});

// GET /api/appointment_profiles — proxy to DrChrono
router.get('/profiles', drchronoAuth, async (req, res) => {
  try {
    const response = await req.drchrono.get('/appointment_profiles', { params: req.query });
    res.json(response.data);
  } catch (err) {
    const status = err.response?.status || 500;
    res.status(status).json({ error: err.response?.data || err.message });
  }
});

// GET /api/appointment_templates — proxy to DrChrono
router.get('/templates', drchronoAuth, async (req, res) => {
  try {
    const response = await req.drchrono.get('/appointment_templates', { params: req.query });
    res.json(response.data);
  } catch (err) {
    const status = err.response?.status || 500;
    res.status(status).json({ error: err.response?.data || err.message });
  }
});

// ── Helpers ────────────────────────────────────────────────────────────────

function generateSlots(date, duration, bookedIntervals) {
  const slots = [];
  const now = new Date();

  // Build start/end boundaries in Pacific time by constructing naive local strings
  // DrChrono stores scheduled_time in the practice timezone (US/Pacific)
  const open = new Date(`${date}T${pad(DEFAULTS.startHour)}:00:00`);
  const close = new Date(`${date}T${pad(DEFAULTS.endHour)}:00:00`);

  let cursor = new Date(open);

  while (cursor < close) {
    const slotEnd = new Date(cursor.getTime() + duration * 60000);

    // Don't generate slots that extend past closing time
    if (slotEnd > close) break;

    // Skip slots in the past
    if (cursor > now) {
      const overlaps = bookedIntervals.some(
        ({ start, end }) => cursor < end && slotEnd > start
      );

      if (!overlaps) {
        slots.push({
          datetime: formatLocal(cursor),
          display: formatDisplay(cursor),
        });
      }
    }

    cursor = new Date(cursor.getTime() + duration * 60000);
  }

  return slots;
}

function pad(n) {
  return String(n).padStart(2, '0');
}

/** Format as "YYYY-MM-DDTHH:MM:SS" — what DrChrono expects for scheduled_time */
function formatLocal(d) {
  return (
    `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` +
    `T${pad(d.getHours())}:${pad(d.getMinutes())}:00`
  );
}

/** Human-readable label for the widget, e.g. "9:00 AM" */
function formatDisplay(d) {
  const h = d.getHours();
  const m = d.getMinutes();
  const ampm = h >= 12 ? 'PM' : 'AM';
  const hour = h % 12 || 12;
  return `${hour}:${pad(m)} ${ampm}`;
}

module.exports = router;
