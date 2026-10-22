import { Exam } from '../types';

export function downloadSebConfigFile(
  examOrTitle: Exam | string,
  origin?: string,
  sebConfig?: any
): void {
  const title = typeof examOrTitle === 'string' ? examOrTitle : examOrTitle.title;
  const courseCode = typeof examOrTitle === 'string' ? 'EXAM' : examOrTitle.courseCode;
  const baseUrl = origin || (typeof window !== 'undefined' ? window.location.origin : 'https://examguard.university.edu');

  const sebXml = `<?xml version="1.0" encoding="utf-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>originatorVersion</key>
    <string>SEB_Win_3.4.0</string>
    <key>startURL</key>
    <string>${baseUrl}</string>
    <key>hashedAdminPassword</key>
    <string></string>
    <key>allowPreferencesWindow</key>
    <false/>
    <key>examTitle</key>
    <string>${escapeXml(title)}</string>
    <key>courseCode</key>
    <string>${escapeXml(courseCode)}</string>
    <key>allowQuit</key>
    <true/>
    <key>quitURL</key>
    <string>${baseUrl}/exam-completed</string>
    <key>browserWindowAllowReload</key>
    <false/>
    <key>enableAltEsc</key>
    <false/>
    <key>enableCtrlEsc</key>
    <false/>
    <key>enableF1</key>
    <false/>
    <key>enableF2</key>
    <false/>
    <key>enableF3</key>
    <false/>
    <key>enableF4</key>
    <false/>
    <key>enableF5</key>
    <false/>
    <key>enableF11</key>
    <false/>
    <key>enableF12</key>
    <false/>
    <key>enablePrintScreen</key>
    <false/>
</dict>
</plist>`;

  const blob = new Blob([sebXml], { type: 'application/seb' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${courseCode}_config.seb`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function escapeXml(unsafe: string): string {
  return (unsafe || '').replace(/[<>&'"]/g, (c) => {
    switch (c) {
      case '<': return '&lt;';
      case '>': return '&gt;';
      case '&': return '&amp;';
      case '\'': return '&apos;';
      case '"': return '&quot;';
      default: return c;
    }
  });
}
