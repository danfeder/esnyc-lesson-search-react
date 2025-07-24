#!/usr/bin/env node

/**
 * Helper script to set up Google Docs API integration
 * Guides through the process and generates necessary code
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🔧 Google Docs API Setup Helper\n');

console.log('This script will help you set up Google Docs API integration.\n');

console.log('📋 Prerequisites:');
console.log('1. Google Cloud account');
console.log('2. A Google Cloud project');
console.log('3. Billing enabled (API has generous free tier)\n');

console.log('🚀 Setup Steps:\n');

console.log('Step 1: Create/Select Google Cloud Project');
console.log('----------------------------------------');
console.log('1. Go to: https://console.cloud.google.com');
console.log('2. Create a new project or select existing');
console.log('3. Note your Project ID\n');

console.log('Step 2: Enable Google Docs API');
console.log('------------------------------');
console.log('Run this command (replace YOUR_PROJECT_ID):');
console.log('gcloud config set project YOUR_PROJECT_ID');
console.log('gcloud services enable docs.googleapis.com\n');
console.log('Or via Console: APIs & Services > Enable APIs > Search "Google Docs API" > Enable\n');

console.log('Step 3: Create Service Account');
console.log('------------------------------');
console.log('Run these commands:');
console.log(`
# Create service account
gcloud iam service-accounts create esnyc-docs-reader \\
  --display-name="ESNYC Docs Reader" \\
  --description="Service account for reading Google Docs in lesson submissions"

# Get the service account email
gcloud iam service-accounts list | grep esnyc-docs-reader
`);

console.log('\nStep 4: Generate Service Account Key');
console.log('-----------------------------------');
console.log('Run this command (replace YOUR_PROJECT_ID):');
console.log(`
gcloud iam service-accounts keys create google-credentials.json \\
  --iam-account=esnyc-docs-reader@YOUR_PROJECT_ID.iam.gserviceaccount.com
`);

console.log('\n⚠️  IMPORTANT: Keep google-credentials.json secure and add to .gitignore!\n');

console.log('Step 5: Add Credentials to Supabase');
console.log('-----------------------------------');
console.log('Option A: As a single JSON string:');
console.log(`
# Read the credentials
cat google-credentials.json

# Copy the entire JSON and run:
npx supabase secrets set GOOGLE_SERVICE_ACCOUNT_JSON='<paste-json-here>'
`);

console.log('\nOption B: As individual secrets (more secure):');
console.log(`
# Extract values from google-credentials.json and set individually:
npx supabase secrets set GOOGLE_SA_PROJECT_ID='your-project-id'
npx supabase secrets set GOOGLE_SA_PRIVATE_KEY='-----BEGIN PRIVATE KEY-----\\n...'
npx supabase secrets set GOOGLE_SA_CLIENT_EMAIL='esnyc-docs-reader@...'
`);

console.log('\n📝 Generating helper functions...\n');

// Generate JWT helper function
const jwtHelperCode = `/**
 * JWT Helper for Google Service Account Authentication
 * Add this to your Edge Function
 */

// Base64URL encode
function base64url(source: ArrayBuffer): string {
  const bytes = new Uint8Array(source);
  let binary = '';
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  const base64 = btoa(binary);
  return base64.replace(/\\+/g, '-').replace(/\\//g, '_').replace(/=+$/, '');
}

// Create JWT for Google service account
async function createGoogleJWT(serviceAccount: any): Promise<string> {
  const header = {
    alg: 'RS256',
    typ: 'JWT',
    kid: serviceAccount.private_key_id
  };

  const now = Math.floor(Date.now() / 1000);
  const payload = {
    iss: serviceAccount.client_email,
    scope: 'https://www.googleapis.com/auth/documents.readonly',
    aud: 'https://oauth2.googleapis.com/token',
    exp: now + 3600, // 1 hour
    iat: now
  };

  // Encode header and payload
  const encodedHeader = base64url(new TextEncoder().encode(JSON.stringify(header)));
  const encodedPayload = base64url(new TextEncoder().encode(JSON.stringify(payload)));
  const signatureInput = \`\${encodedHeader}.\${encodedPayload}\`;

  // Import private key
  const privateKeyPem = serviceAccount.private_key
    .replace(/\\\\n/g, '\\n')
    .replace('-----BEGIN PRIVATE KEY-----', '')
    .replace('-----END PRIVATE KEY-----', '')
    .replace(/\\n/g, '');
  
  const binaryKey = Uint8Array.from(atob(privateKeyPem), c => c.charCodeAt(0));
  
  const cryptoKey = await crypto.subtle.importKey(
    'pkcs8',
    binaryKey,
    {
      name: 'RSASSA-PKCS1-v1_5',
      hash: 'SHA-256'
    },
    false,
    ['sign']
  );

  // Sign the JWT
  const signature = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    cryptoKey,
    new TextEncoder().encode(signatureInput)
  );

  return \`\${signatureInput}.\${base64url(signature)}\`;
}

// Get access token using service account
async function getGoogleAccessToken(serviceAccount: any): Promise<string> {
  const jwt = await createGoogleJWT(serviceAccount);
  
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt
    })
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(\`Failed to get access token: \${error}\`);
  }

  const data = await response.json();
  return data.access_token;
}`;

// Generate document extraction function
const extractionCode = `/**
 * Extract content from Google Docs
 */

// Extract plain text from Google Doc structure
function extractTextFromGoogleDoc(doc: any): string {
  let text = '';
  
  if (doc.body?.content) {
    for (const element of doc.body.content) {
      if (element.paragraph?.elements) {
        for (const textRun of element.paragraph.elements) {
          if (textRun.textRun?.content) {
            text += textRun.textRun.content;
          }
        }
      } else if (element.table) {
        // Handle tables
        text += '\\n[Table]\\n';
        if (element.table.tableRows) {
          for (const row of element.table.tableRows) {
            if (row.tableCells) {
              for (const cell of row.tableCells) {
                if (cell.content) {
                  for (const cellElement of cell.content) {
                    if (cellElement.paragraph?.elements) {
                      for (const textRun of cellElement.paragraph.elements) {
                        if (textRun.textRun?.content) {
                          text += textRun.textRun.content.trim() + ' | ';
                        }
                      }
                    }
                  }
                }
              }
              text = text.slice(0, -3) + '\\n'; // Remove last ' | '
            }
          }
        }
      } else if (element.sectionBreak) {
        text += '\\n\\n---\\n\\n';
      }
    }
  }
  
  return text.trim();
}

// Extract structured metadata from content
function extractMetadataFromContent(content: string): any {
  const metadata: any = {};
  
  // Extract grade levels
  const gradeMatch = content.match(/Grade(?:s|\\s+Level(?:s)?)?:?\\s*([^\\n]+)/i);
  if (gradeMatch) {
    const grades = gradeMatch[1].match(/\\d+|K|PreK|3K/gi);
    if (grades) {
      metadata.gradeLevels = grades.map(g => g.toUpperCase());
    }
  }
  
  // Extract theme
  const themeMatch = content.match(/Theme:?\\s*([^\\n]+)/i);
  if (themeMatch) {
    metadata.theme = themeMatch[1].trim();
  }
  
  // Extract skills
  const skillsMatch = content.match(/Skills?:?\\s*([^\\n]+)/i);
  if (skillsMatch) {
    metadata.skills = skillsMatch[1].split(/[,;]/).map(s => s.trim());
  }
  
  return metadata;
}`;

// Write helper files
const helpersDir = path.join(__dirname, '..', 'supabase', 'functions', '_shared');
if (!fs.existsSync(helpersDir)) {
  fs.mkdirSync(helpersDir, { recursive: true });
}

fs.writeFileSync(
  path.join(helpersDir, 'google-auth.ts'),
  jwtHelperCode
);

fs.writeFileSync(
  path.join(helpersDir, 'google-docs-parser.ts'),
  extractionCode
);

console.log('✅ Generated helper functions in supabase/functions/_shared/\n');

console.log('📄 Sample Implementation:');
console.log('-------------------------');
console.log(`
// In your extract-google-doc function:
import { getGoogleAccessToken } from '../_shared/google-auth.ts';
import { extractTextFromGoogleDoc, extractMetadataFromContent } from '../_shared/google-docs-parser.ts';

// Inside your function:
const googleServiceAccount = Deno.env.get('GOOGLE_SERVICE_ACCOUNT_JSON');
if (googleServiceAccount) {
  try {
    const credentials = JSON.parse(googleServiceAccount);
    const accessToken = await getGoogleAccessToken(credentials);
    
    // Get document
    const docResponse = await fetch(
      \`https://docs.googleapis.com/v1/documents/\${docId}\`,
      {
        headers: {
          'Authorization': \`Bearer \${accessToken}\`
        }
      }
    );
    
    if (!docResponse.ok) {
      throw new Error(\`Google Docs API error: \${docResponse.status}\`);
    }
    
    const doc = await docResponse.json();
    const content = extractTextFromGoogleDoc(doc);
    const metadata = extractMetadataFromContent(content);
    
    return {
      docId,
      title: doc.title,
      content,
      metadata,
      extractedAt: new Date().toISOString()
    };
  } catch (error) {
    console.error('Google Docs extraction failed:', error);
    // Fall back to mock
  }
}
`);

console.log('\n🧪 Testing Instructions:');
console.log('----------------------');
console.log('1. Create a test Google Doc');
console.log('2. Make it publicly readable OR');
console.log('3. Share it with your service account email');
console.log('4. Test with: curl -X POST ... (see test scripts)');

console.log('\n✅ Setup helper complete!');
console.log('Follow the steps above to enable Google Docs API integration.');