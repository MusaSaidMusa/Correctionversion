import express from 'express';
import type { Request, Response, NextFunction } from 'express';
import http from 'http';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function resolvePort(): number {
  const portArgIndex = process.argv.indexOf('--port');
  if (portArgIndex !== -1 && process.argv[portArgIndex + 1]) {
    const parsed = parseInt(process.argv[portArgIndex + 1], 10);
    if (!isNaN(parsed) && parsed > 0) return parsed;
  }
  return Number(process.env.PORT) || 3000;
}

const app = express();
const httpServer = http.createServer(app);
const PORT = resolvePort();
const isProd = process.env.NODE_ENV === 'production';
const isStandaloneApi = process.env.STANDALONE_API === 'true';

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Ensure public and uploads directories exist and serve them statically
const publicPath = path.resolve(__dirname, 'public');
if (!fs.existsSync(publicPath)) {
  fs.mkdirSync(publicPath, { recursive: true });
}
app.use(express.static(publicPath));

const uploadsPath = path.resolve(publicPath, 'uploads');
if (!fs.existsSync(uploadsPath)) {
  fs.mkdirSync(uploadsPath, { recursive: true });
}
app.use('/uploads', express.static(uploadsPath));

// Health check endpoint
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    uploadsDir: fs.existsSync(uploadsPath),
    timestamp: new Date().toISOString(),
  });
});

// File & Photo Upload Endpoint (handles documents and photos)
app.post('/api/upload', (req: Request, res: Response) => {
  try {
    const { fileName, fileData, fileType } = req.body;

    if (!fileData) {
      return res.status(400).json({ success: false, error: 'No file data received.' });
    }

    // Extract base64 payload
    let base64Data = fileData;
    let detectedMime = fileType || 'application/octet-stream';

    const match = fileData.match(/^data:([a-zA-Z0-9\/\+\.\-]+);base64,(.+)$/);
    if (match) {
      detectedMime = match[1];
      base64Data = match[2];
    }

    const buffer = Buffer.from(base64Data, 'base64');

    // Clean and sanitize file name
    const rawName = (fileName || `upload-${Date.now()}`).trim();
    const cleanExtMatch = rawName.match(/\.([a-zA-Z0-9]+)$/);
    let ext = cleanExtMatch ? cleanExtMatch[1].toLowerCase() : '';
    
    // Auto-detect extension from mime if missing
    if (!ext) {
      if (detectedMime.includes('jpeg') || detectedMime.includes('jpg')) ext = 'jpg';
      else if (detectedMime.includes('png')) ext = 'png';
      else if (detectedMime.includes('webp')) ext = 'webp';
      else if (detectedMime.includes('pdf')) ext = 'pdf';
      else if (detectedMime.includes('csv')) ext = 'csv';
      else if (detectedMime.includes('sheet') || detectedMime.includes('excel')) ext = 'xlsx';
      else if (detectedMime.includes('word') || detectedMime.includes('document')) ext = 'docx';
      else ext = 'bin';
    }

    const baseName = rawName.replace(/\.[^/.]+$/, '').replace(/[^a-zA-Z0-9_-]/g, '_').substring(0, 50);
    const uniqueFileName = `${Date.now()}_${baseName}.${ext}`;
    const destinationPath = path.join(uploadsPath, uniqueFileName);

    fs.writeFileSync(destinationPath, buffer);

    const fileUrl = `/uploads/${uniqueFileName}`;

    console.log(`[ExamGuard Pro] Successfully uploaded ${uniqueFileName} (${buffer.length} bytes, ${detectedMime})`);

    return res.status(200).json({
      success: true,
      url: fileUrl,
      fileName: uniqueFileName,
      originalName: rawName,
      size: buffer.length,
      fileType: detectedMime,
      uploadedAt: new Date().toISOString(),
    });
  } catch (err: any) {
    console.error('[ExamGuard Pro] Upload error:', err);
    return res.status(500).json({ success: false, error: err?.message || 'File upload failed.' });
  }
});

// List Uploaded Files for Audit Ledger
app.get('/api/uploads', (_req: Request, res: Response) => {
  try {
    if (!fs.existsSync(uploadsPath)) {
      return res.json({ success: true, files: [] });
    }
    const files = fs.readdirSync(uploadsPath).map((f) => {
      const stats = fs.statSync(path.join(uploadsPath, f));
      return {
        fileName: f,
        url: `/uploads/${f}`,
        size: stats.size,
        createdAt: stats.birthtime.toISOString(),
      };
    });
    return res.json({ success: true, count: files.length, files });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err?.message || 'Could not list uploads.' });
  }
});

// Teacher endpoints
app.get('/api/teachers/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  res.json({
    success: true,
    data: {
      id,
      faculty: 'Faculty of Computing & Information Technologies',
      department: 'Computer Science & Software Engineering',
      status: 'active',
    },
  });
});

app.post('/api/teachers', (req: Request, res: Response) => {
  res.json({ success: true, data: req.body });
});

// Student endpoints
app.get('/api/students/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  res.json({
    success: true,
    data: {
      id,
      faculty: 'Faculty of Computing & Information Technologies',
      department: 'Computer Science & Software Engineering',
      academicStanding: 'Dean’s Honor List',
      clearanceStatus: 'Clear',
      gpa: '3.88',
      attendanceRate: '98.5%',
    },
  });
});

app.post('/api/students', (req: Request, res: Response) => {
  res.json({ success: true, data: req.body });
});

// Password change endpoint
app.post('/api/users/change-password', (req: Request, res: Response) => {
  const { role, email } = req.body;
  res.json({
    success: true,
    message: `Password updated for ${role} ${email}`,
    timestamp: new Date().toISOString(),
  });
});

// Commit individual submission result
app.post('/api/submissions/:id/commit-result', (req: Request, res: Response) => {
  const { id } = req.params;
  const { instructorName, score, totalPoints, percentage } = req.body;
  res.json({
    success: true,
    message: `Submission ${id} result committed to student portal by ${instructorName || 'Instructor'}`,
    data: {
      submissionId: id,
      committedAt: new Date().toISOString(),
      score,
      totalPoints,
      percentage,
    },
  });
});

// Bulk commit exam results
app.post('/api/exams/:id/commit-results', (req: Request, res: Response) => {
  const { id } = req.params;
  const { instructorName, submissions } = req.body;
  res.json({
    success: true,
    message: `Committed ${submissions?.length || 0} submissions for exam ${id} by ${instructorName || 'Instructor'}`,
    data: {
      examId: id,
      committedAt: new Date().toISOString(),
      count: submissions?.length || 0,
    },
  });
});

// Review committed mark change
app.post('/api/submissions/:id/committed-mark-review', (req: Request, res: Response) => {
  const { id } = req.params;
  const { requestId, action, reviewedBy, note, score, totalPoints, percentage } = req.body;
  res.json({
    success: true,
    message: `Mark review request ${requestId} for ${id} ${action}ed by ${reviewedBy}`,
    data: {
      submissionId: id,
      requestId,
      action,
      reviewedBy,
      note,
      score,
      totalPoints,
      percentage,
      reviewedAt: new Date().toISOString(),
    },
  });
});

// Resit Requests endpoints
app.get('/api/resit-requests', (_req: Request, res: Response) => {
  res.json({ success: true, timestamp: new Date().toISOString() });
});

app.post('/api/resit-requests', (req: Request, res: Response) => {
  res.json({
    success: true,
    message: 'Resit request submitted successfully.',
    data: req.body,
  });
});

app.post('/api/resit-requests/:id/review', (req: Request, res: Response) => {
  const { id } = req.params;
  const { action, note, reviewedBy } = req.body;
  res.json({
    success: true,
    message: `Resit request ${id} ${action}ed by ${reviewedBy || 'Admin'}.`,
    data: { id, action, note, reviewedBy, reviewedAt: new Date().toISOString() },
  });
});

// -------------------------------------------------------------
// REAL-TIME EXAMINATION WAITING ROOM & INSTANT ADMISSION SSE
// -------------------------------------------------------------
interface RealtimeClient {
  id: string;
  res: Response;
}
const sseClients = new Set<RealtimeClient>();
const waitingRooms = new Map<string, Set<string>>(); // examId -> Set of studentIds
const admittedStudents = new Map<string, Set<string>>(); // examId -> Set of studentIds

function broadcastSSE(event: string, data: any) {
  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const client of sseClients) {
    try {
      client.res.write(payload);
    } catch {
      sseClients.delete(client);
    }
  }
}

// Server-Sent Events real-time event bus
app.get('/api/realtime/stream', (req: Request, res: Response) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders?.();

  const clientId = `client-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  const client: RealtimeClient = { id: clientId, res };
  sseClients.add(client);

  res.write(`event: connected\ndata: ${JSON.stringify({ clientId, timestamp: Date.now() })}\n\n`);

  const keepAlive = setInterval(() => {
    try {
      res.write(': keepalive\n\n');
    } catch {
      clearInterval(keepAlive);
      sseClients.delete(client);
    }
  }, 15000);

  req.on('close', () => {
    clearInterval(keepAlive);
    sseClients.delete(client);
  });
});

// Waiting Room Endpoints
app.get('/api/exams/:id/waiting-room', (req: Request, res: Response) => {
  const { id } = req.params;
  const set = waitingRooms.get(id) || new Set<string>();
  const list = Array.from(set).map((studentId) => ({ studentId, timestamp: Date.now() }));
  res.json({
    success: true,
    data: {
      examId: id,
      waitingCandidates: list,
    },
  });
});

app.post('/api/exams/:id/waiting-room', (req: Request, res: Response) => {
  const { id } = req.params;
  const { studentId, action } = req.body; // action: 'join' | 'leave'

  if (!waitingRooms.has(id)) {
    waitingRooms.set(id, new Set<string>());
  }
  const room = waitingRooms.get(id)!;

  if (action === 'leave') {
    if (studentId) room.delete(studentId);
  } else if (studentId) {
    room.add(studentId);
  }

  const waitingList = Array.from(room).map((s) => ({ studentId: s, timestamp: Date.now() }));

  // Broadcast in real-time
  broadcastSSE('waiting_room_updated', {
    examId: id,
    studentId,
    action: action || 'join',
    waitingCandidates: waitingList,
    count: waitingList.length,
    timestamp: Date.now(),
  });

  res.json({
    success: true,
    data: {
      examId: id,
      waitingCandidates: waitingList,
    },
  });
});

// Instant Admission Endpoints
app.get('/api/exams/:id/admissions', (req: Request, res: Response) => {
  const { id } = req.params;
  const set = admittedStudents.get(id) || new Set<string>();
  res.json({
    success: true,
    data: {
      examId: id,
      admittedStudentIds: Array.from(set),
    },
  });
});

app.post('/api/exams/:id/admit', (req: Request, res: Response) => {
  const { id } = req.params;
  const { studentId, studentIds, all } = req.body;

  if (!admittedStudents.has(id)) {
    admittedStudents.set(id, new Set<string>());
  }
  const admitted = admittedStudents.get(id)!;

  if (all && Array.isArray(studentIds)) {
    studentIds.forEach((sid: string) => admitted.add(sid));
  } else if (studentId) {
    admitted.add(studentId);
  }

  // Remove admitted from waiting room
  if (waitingRooms.has(id)) {
    const room = waitingRooms.get(id)!;
    if (all && Array.isArray(studentIds)) {
      studentIds.forEach((sid: string) => room.delete(sid));
    } else if (studentId) {
      room.delete(studentId);
    }
  }

  // Broadcast INSTANTLY to all connected students and teachers via SSE
  broadcastSSE('admission_updated', {
    examId: id,
    studentId,
    studentIds: Array.isArray(studentIds) ? studentIds : (studentId ? [studentId] : []),
    all: Boolean(all),
    admitted: true,
    timestamp: Date.now(),
  });

  res.json({
    success: true,
    message: 'Candidate admitted in real-time.',
    data: {
      examId: id,
      admittedStudentIds: Array.from(admitted),
      timestamp: Date.now(),
    },
  });
});

app.post('/api/exams/:id/revoke-admission', (req: Request, res: Response) => {
  const { id } = req.params;
  const { studentId } = req.body;

  if (admittedStudents.has(id) && studentId) {
    admittedStudents.get(id)!.delete(studentId);
  }

  broadcastSSE('admission_updated', {
    examId: id,
    studentId,
    revoked: true,
    admitted: false,
    timestamp: Date.now(),
  });

  res.json({
    success: true,
    message: 'Candidate admission revoked.',
    data: {
      examId: id,
      studentId,
      timestamp: Date.now(),
    },
  });
});

// Dev server Vite integration & SPA HTML serving
async function startServer() {
  if (!isStandaloneApi) {
    if (!isProd) {
      const { createServer } = await import('vite');
      const vite = await createServer({
        server: {
          middlewareMode: true,
          hmr: false,
          allowedHosts: true,
        },
        appType: 'spa',
      });
      app.use(vite.middlewares);

      // Serve index.html with Vite HTML transformations for all non-API routes
      app.use('*', async (req: Request, res: Response, next: NextFunction) => {
        if (req.originalUrl.startsWith('/api/')) return next();
        try {
          const indexPath = path.resolve(__dirname, 'index.html');
          let template = fs.readFileSync(indexPath, 'utf-8');
          template = await vite.transformIndexHtml(req.originalUrl, template);
          res.status(200).set({ 'Content-Type': 'text/html' }).end(template);
        } catch (e: any) {
          vite.ssrFixStacktrace(e);
          next(e);
        }
      });
    } else {
      const distPath = path.resolve(__dirname, 'dist');
      if (fs.existsSync(distPath)) {
        app.use(express.static(distPath));
        app.get('*', (_req: Request, res: Response) => {
          res.sendFile(path.join(distPath, 'index.html'));
        });
      }
    }
  }

  httpServer.on('error', (err: any) => {
    if (err.code === 'EADDRINUSE') {
      console.warn(`[ExamGuard Pro] Port ${PORT} busy, retrying in 1000ms...`);
      setTimeout(() => {
        httpServer.close();
        httpServer.listen(PORT, '0.0.0.0');
      }, 1000);
    } else {
      console.error('[ExamGuard Pro] Server listener error:', err);
    }
  });

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`\n  VITE v8.3.5  ready in 120 ms\n`);
    console.log(`  ➜  Local:   http://localhost:${PORT}/`);
    console.log(`  ➜  Network: http://0.0.0.0:${PORT}/\n`);
  });
}

startServer().catch((err) => {
  console.error('[ExamGuard Pro] Server start error:', err);
  process.exit(1);
});
