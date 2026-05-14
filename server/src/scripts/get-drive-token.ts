/**
 * One-time script to get OAuth2 refresh token for Google Drive.
 * 
 * Steps:
 * 1. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in .env
 * 2. Run: npx tsx src/scripts/get-drive-token.ts
 * 3. A browser will open for authorization
 * 4. After authorizing, the refresh token will be printed
 * 5. Copy it into .env as GOOGLE_REFRESH_TOKEN
 */
import { google } from 'googleapis';
import http from 'http';
import { URL } from 'url';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { exec } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '..', '..', '.env') });

const CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '';
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || '';
const PORT = 3456;
const REDIRECT_URI = `http://localhost:${PORT}/callback`;

if (!CLIENT_ID || !CLIENT_SECRET) {
  console.error('❌ Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in .env first!');
  process.exit(1);
}

const oauth2Client = new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI);

const authUrl = oauth2Client.generateAuthUrl({
  access_type: 'offline',
  scope: ['https://www.googleapis.com/auth/drive'],
  prompt: 'consent',
});

// Start a temporary local server to catch the OAuth callback
const server = http.createServer(async (req, res) => {
  if (!req.url?.startsWith('/callback')) {
    res.writeHead(404);
    res.end();
    return;
  }

  const url = new URL(req.url, `http://localhost:${PORT}`);
  const code = url.searchParams.get('code');
  const error = url.searchParams.get('error');

  if (error) {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(`<h1>❌ Authorization failed</h1><p>${error}</p>`);
    console.error(`\n❌ Authorization failed: ${error}`);
    server.close();
    process.exit(1);
  }

  if (!code) {
    res.writeHead(400, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end('<h1>❌ No code received</h1>');
    return;
  }

  try {
    const { tokens } = await oauth2Client.getToken(code);
    
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(`
      <html><body style="font-family:sans-serif;text-align:center;padding:50px;">
        <h1>✅ Authorization successful!</h1>
        <p>You can close this tab and go back to the terminal.</p>
      </body></html>
    `);

    console.log('\n✅ Authorization successful!\n');
    console.log('📋 Add this line to your server/.env file:\n');
    console.log(`GOOGLE_REFRESH_TOKEN=${tokens.refresh_token}`);
    console.log('\n🎉 Done! You can now run the migration or start the app.');
  } catch (err) {
    res.writeHead(500, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end('<h1>❌ Error exchanging code for token</h1>');
    console.error('\n❌ Error getting token:', err);
  }

  server.close();
  setTimeout(() => process.exit(0), 1000);
});

server.listen(PORT, () => {
  console.log(`\n🌐 Temporary server listening on http://localhost:${PORT}`);
  console.log('\n🔗 Opening browser for authorization...\n');
  console.log(`If browser doesn't open, manually visit:\n${authUrl}\n`);

  // Open browser
  const cmd = process.platform === 'win32' ? 'start' :
              process.platform === 'darwin' ? 'open' : 'xdg-open';
  exec(`${cmd} "${authUrl.replace(/&/g, '^&')}"`);
});
