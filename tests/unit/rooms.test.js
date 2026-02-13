const express = require('express');
const request = require('supertest');
const { router, clearRooms } = require('../../rooms');

describe('rooms API', () => {
  let app;

  beforeEach(() => {
    clearRooms();
    app = express();
    app.use(express.json());
    app.use((req, _res, next) => {
      req.session = { user: { id: 'host-1', displayName: 'Host', email: 'host@example.com' } };
      next();
    });
    app.use('/api', router);
  });

  test('creates room, joins guest, updates playback', async () => {
    const createRes = await request(app).post('/api/rooms');
    expect(createRes.status).toBe(201);
    expect(createRes.body.id).toHaveLength(8);

    const roomId = createRes.body.id;

    const joinRes = await request(app)
      .post(`/api/rooms/${roomId}/join`)
      .send({ name: 'Alice' });
    expect(joinRes.status).toBe(200);
    expect(joinRes.body.participants).toHaveLength(1);
    expect(joinRes.body.participants[0].name).toBe('Alice');

    const playbackRes = await request(app)
      .post(`/api/rooms/${roomId}/playback`)
      .send({ time: 12.5, playing: true, videoUrl: 'https://cdn.example.com/video.mp4' });

    expect(playbackRes.status).toBe(200);
    expect(playbackRes.body.ok).toBe(true);
    expect(playbackRes.body.playback.playing).toBe(true);
    expect(playbackRes.body.playback.time).toBe(12.5);
  });
});
