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
app.use(express.json({ limit: '25mb' }));

// Serve static assets from public/ immediately
const publicPath = path.resolve(__dirname, 'public');
if (fs.existsSync(publicPath)) {
  app.use(express.static(publicPath));
}

// Health check endpoint
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
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
