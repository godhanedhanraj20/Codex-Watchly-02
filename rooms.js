const express = require('express');
const { nanoid } = require('nanoid');

const router = express.Router();
const rooms = new Map();

function validRoomId(id) {
  return typeof id === 'string' && /^[A-Za-z0-9_-]{6,24}$/.test(id);
}

function getSafeRoom(room) {
  return {
    id: room.id,
    participants: room.participants,
    playback: room.playback
  };
}

router.post('/rooms', (req, res) => {
  if (!req.session?.user?.id) {
    return res.status(401).json({ error: 'Host login required.' });
  }

  const id = nanoid(8);
  const room = {
    id,
    hostId: req.session.user.id,
    participants: [],
    playback: { time: 0, playing: false, videoUrl: '' }
  };

  rooms.set(id, room);
  return res.status(201).json({ id, link: `/public/room.html?id=${id}` });
});

router.get('/rooms/:id', (req, res) => {
  const { id } = req.params;
  if (!validRoomId(id)) {
    return res.status(400).json({ error: 'Invalid room id format.' });
  }

  const room = rooms.get(id);
  if (!room) {
    return res.status(404).json({ error: 'Room not found.' });
  }

  return res.json(getSafeRoom(room));
});

router.post('/rooms/:id/join', (req, res) => {
  const { id } = req.params;
  if (!validRoomId(id)) {
    return res.status(400).json({ error: 'Invalid room id format.' });
  }

  const room = rooms.get(id);
  if (!room) {
    return res.status(404).json({ error: 'Room not found.' });
  }

  const rawName = typeof req.body?.name === 'string' ? req.body.name : '';
  const name = rawName.trim();

  if (name.length < 1 || name.length > 32) {
    return res.status(400).json({ error: 'Name must be between 1 and 32 characters.' });
  }

  const exists = room.participants.some((p) => p.name.toLowerCase() === name.toLowerCase());
  if (!exists) {
    room.participants.push({ name, joinedAt: Date.now() });
  }

  return res.json({ participants: room.participants });
});

router.post('/rooms/:id/playback', (req, res) => {
  const { id } = req.params;
  if (!validRoomId(id)) {
    return res.status(400).json({ error: 'Invalid room id format.' });
  }

  const room = rooms.get(id);
  if (!room) {
    return res.status(404).json({ error: 'Room not found.' });
  }

  const userId = req.session?.user?.id;
  if (!userId) {
    return res.status(401).json({ error: 'Host login required.' });
  }

  if (room.hostId !== userId) {
    return res.status(403).json({ error: 'Only host can update playback.' });
  }

  const time = Number(req.body?.time);
  const playing = Boolean(req.body?.playing);
  const videoUrl = typeof req.body?.videoUrl === 'string' ? req.body.videoUrl.trim() : '';

  if (!Number.isFinite(time) || time < 0) {
    return res.status(400).json({ error: 'Invalid playback time.' });
  }

  room.playback = {
    time,
    playing,
    videoUrl
  };

  return res.json({ ok: true, playback: room.playback });
});

router.get('/rooms/:id/playback', (req, res) => {
  const { id } = req.params;
  if (!validRoomId(id)) {
    return res.status(400).json({ error: 'Invalid room id format.' });
  }

  const room = rooms.get(id);
  if (!room) {
    return res.status(404).json({ error: 'Room not found.' });
  }

  return res.json({ playback: room.playback, serverTime: Date.now() });
});

function clearRooms() {
  rooms.clear();
}

module.exports = { router, rooms, clearRooms };
