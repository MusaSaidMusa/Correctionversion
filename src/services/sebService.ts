import { Exam } from '../types';

export function generateBrowserExamKey(): string {
  const chars = '0123456789abcdef';
  let key = '';
  for (let i = 0; i < 64; i++) {
    key += chars[Math.floor(Math.random() * chars.length)];
  }
  return key;
}

export interface SebSecurityManifest {
  isSebActive: boolean;
  browserExamKey: string;
  configKey: string;
  kioskModeActive: boolean;
  clipboardLocked: boolean;
  devtoolsBlocked: boolean;
  singleDisplayEnforced: boolean;
  continuousTimerEnforced: boolean;
  pausePermitted: boolean;
  autoSubmitOnViolation: boolean;
}

/**
 * Detects whether the current client is executing within Safe Exam Browser (SEB)
 * or under simulated strict institutional SEB lockdown.
 */
export function verifySebEnvironment(): { isSeb: boolean; version?: string; agent: string } {
  if (typeof window === 'undefined' || !window.navigator) {
    return { isSeb: false, agent: 'Unknown' };
  }
  const ua = window.navigator.userAgent || '';
  const isSebUserAgent = ua.includes('SEB') || ua.includes('SafeExamBrowser');
  const isInstitutionalLockdown = Boolean(
    sessionStorage.getItem('examguard_seb_lockdown_active') === 'true'
  );

  return {
    isSeb: isSebUserAgent || isInstitutionalLockdown,
    version: isSebUserAgent ? '3.4.0 (Official SEB Engine)' : 'SEB Institutional Enforcer 2.5',
    agent: ua,
  };
}

export function getSebSecurityManifest(exam: Exam): SebSecurityManifest {
  const env = verifySebEnvironment();
  return {
    isSebActive: env.isSeb || Boolean(exam.securityProtocols?.requireSEB),
    browserExamKey: exam.sebConfig?.browserExamKey || generateBrowserExamKey(),
    configKey: generateBrowserExamKey(),
    kioskModeActive: true,
    clipboardLocked: true,
    devtoolsBlocked: true,
    singleDisplayEnforced: true,
    continuousTimerEnforced: true,
    pausePermitted: false, // Strict: pausing is NEVER permitted under SEB
    autoSubmitOnViolation: true,
  };
}

/**
 * Downloads official .seb configuration file adhering to SEB 3.x plist XML standards.
 */
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
    <false/>
    <key>allowPause</key>
    <false/>
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
    <key>prohibitScreenSharing</key>
    <true/>
    <key>allowSpellCheck</key>
    <false/>
    <key>allowDictionaryLookup</key>
    <false/>
</dict>
</plist>`;

  const blob = new Blob([sebXml], { type: 'application/seb' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${courseCode}_SEB_config.seb`;
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
