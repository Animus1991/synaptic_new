import { Router } from 'express';
import {
  createStudyRoomPersisted,
  persistStudyRoom,
} from '../store/studyRoomPgStore';
import { config } from '../config';
import {
  bumpStudyRoomWhiteboard,
  getStudyRoom,
  getStudyRoomByInvite,
  joinStudyRoom,
  leaveStudyRoom,
  updateStudyRoomPresence,
  type StudyRoomSnapshot,
} from '../store/studyRoomStore';

export const studyRoomsRouter = Router();

type StreamClient = {
  roomId: string;
  res: import('express').Response;
};

const streamClients = new Set<StreamClient>();

function broadcast(room: StudyRoomSnapshot): void {
  const line = `data: ${JSON.stringify(room)}\n\n`;
  for (const c of streamClients) {
    if (c.roomId === room.id) c.res.write(line);
  }
}

function registerStream(roomId: string, res: import('express').Response): void {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders?.();
  const client: StreamClient = { roomId, res };
  streamClients.add(client);
  const snap = getStudyRoom(roomId);
  if (snap) res.write(`data: ${JSON.stringify(snap)}\n\n`);
}

studyRoomsRouter.post('/study-rooms', (req, res) => {
  const courseId = typeof req.body?.courseId === 'string' ? req.body.courseId : '';
  const name = typeof req.body?.name === 'string' ? req.body.name : 'Study room';
  if (!courseId) {
    res.status(400).json({ error: 'courseId required' });
    return;
  }
  const room = createStudyRoomPersisted(config.databaseUrl, courseId, name);
  res.status(201).json(room);
});

studyRoomsRouter.get('/study-rooms/invite/:code', (req, res) => {
  const room = getStudyRoomByInvite(req.params.code);
  if (!room) {
    res.status(404).json({ error: 'Room not found' });
    return;
  }
  res.json(room);
});

studyRoomsRouter.get('/study-rooms/:roomId', (req, res) => {
  const room = getStudyRoom(req.params.roomId);
  if (!room) {
    res.status(404).json({ error: 'Room not found' });
    return;
  }
  res.json(room);
});

studyRoomsRouter.post('/study-rooms/:roomId/join', (req, res) => {
  const displayName = typeof req.body?.displayName === 'string' ? req.body.displayName : 'Learner';
  const memberId = typeof req.body?.memberId === 'string' ? req.body.memberId : undefined;
  const result = joinStudyRoom(req.params.roomId, displayName, memberId);
  if (!result) {
    res.status(404).json({ error: 'Room not found' });
    return;
  }
  broadcast(result.room);
  res.json(result);
});

studyRoomsRouter.post('/study-rooms/:roomId/presence', (req, res) => {
  const memberId = typeof req.body?.memberId === 'string' ? req.body.memberId : '';
  if (!memberId) {
    res.status(400).json({ error: 'memberId required' });
    return;
  }
  const room = updateStudyRoomPresence(req.params.roomId, memberId, {
    tool: typeof req.body?.tool === 'string' ? req.body.tool : undefined,
    concept: typeof req.body?.concept === 'string' ? req.body.concept : undefined,
    displayName: typeof req.body?.displayName === 'string' ? req.body.displayName : undefined,
    cursorX: typeof req.body?.cursorX === 'number' ? req.body.cursorX : undefined,
    cursorY: typeof req.body?.cursorY === 'number' ? req.body.cursorY : undefined,
    heartbeat: req.body?.heartbeat === true,
  });
  if (!room) {
    res.status(404).json({ error: 'Room or member not found' });
    return;
  }
  persistStudyRoom(config.databaseUrl, room);
  broadcast(room);
  res.json(room);
});

studyRoomsRouter.post('/study-rooms/:roomId/whiteboard', (req, res) => {
  const room = bumpStudyRoomWhiteboard(req.params.roomId);
  if (!room) {
    res.status(404).json({ error: 'Room not found' });
    return;
  }
  persistStudyRoom(config.databaseUrl, room);
  broadcast(room);
  res.json(room);
});

studyRoomsRouter.post('/study-rooms/:roomId/leave', (req, res) => {
  const memberId = typeof req.body?.memberId === 'string' ? req.body.memberId : '';
  if (!memberId) {
    res.status(400).json({ error: 'memberId required' });
    return;
  }
  const room = leaveStudyRoom(req.params.roomId, memberId);
  if (!room) {
    res.status(404).json({ error: 'Room not found' });
    return;
  }
  broadcast(room);
  res.json(room);
});

studyRoomsRouter.get('/study-rooms/:roomId/stream', (req, res) => {
  const room = getStudyRoom(req.params.roomId);
  if (!room) {
    res.status(404).json({ error: 'Room not found' });
    return;
  }
  registerStream(room.id, res);
  req.on('close', () => {
    for (const c of streamClients) {
      if (c.res === res) streamClients.delete(c);
    }
  });
});
