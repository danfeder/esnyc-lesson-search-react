# Data Protection & Privacy

> **⚠️ IMPORTANT**: This document contains templates and recommendations. Most privacy compliance features shown are NOT yet implemented and would need to be built based on your legal requirements.

## Overview

This document outlines recommended data protection practices and privacy compliance strategies for the ESYNYC Lesson Search platform.

## Data Classification

### Public Data
- Lesson content
- School names
- Published resources
- **Protection**: None required
- **Access**: Anyone

### Internal Data
- User names (teachers)
- School affiliations
- Lesson submissions (published)
- **Protection**: Basic access control
- **Access**: Authenticated users

### Sensitive Data
- Email addresses
- Phone numbers
- User preferences
- Draft submissions
- **Protection**: Encryption + RLS
- **Access**: Owner only

### Critical Data
- Passwords
- API keys
- Session tokens
- Payment information (future)
- **Protection**: Maximum security
- **Access**: System only

## Data Protection Measures

### Encryption

#### At Rest
```sql
-- Supabase automatically encrypts all data at rest
-- Additional application-level encryption for sensitive fields
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Example: Encrypt sensitive user data
UPDATE user_profiles 
SET phone = pgp_sym_encrypt(phone, current_setting('app.encryption_key'))
WHERE phone IS NOT NULL;
```

#### In Transit
- All connections use TLS 1.3
- HSTS enabled with max-age=31536000
- Certificate pinning for mobile apps (future)

#### Application Level
```typescript
// Encrypt sensitive data before storage
import crypto from 'crypto';

const algorithm = 'aes-256-gcm';
const key = Buffer.from(process.env.ENCRYPTION_KEY, 'hex');

export function encrypt(text: string): EncryptedData {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(algorithm, key, iv);
  
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  const authTag = cipher.getAuthTag();
  
  return {
    encrypted,
    iv: iv.toString('hex'),
    authTag: authTag.toString('hex')
  };
}

export function decrypt(data: EncryptedData): string {
  const decipher = crypto.createDecipheriv(
    algorithm,
    key,
    Buffer.from(data.iv, 'hex')
  );
  
  decipher.setAuthTag(Buffer.from(data.authTag, 'hex'));
  
  let decrypted = decipher.update(data.encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  
  return decrypted;
}
```

### Data Minimization

#### Collection Principles
1. Only collect necessary data
2. Delete data when no longer needed
3. Anonymous analytics where possible
4. Opt-in for additional data collection

#### Implementation
```typescript
// Minimal user registration
interface UserRegistration {
  email: string;        // Required for auth
  password: string;     // Required for auth
  full_name?: string;   // Optional
  school?: string;      // Optional
  // No phone, address, DOB, etc. unless needed
}

// Data retention policies
const DATA_RETENTION = {
  user_accounts: 'Until deletion requested',
  session_logs: '90 days',
  error_logs: '30 days',
  analytics: '1 year',
  submissions_draft: '6 months after last edit',
  submissions_rejected: '1 year'
};
```

### Access Control

#### Row Level Security (RLS)
```sql
-- Users can only see their own sensitive data
CREATE POLICY "Users read own data" ON user_profiles
  FOR SELECT USING (auth.uid() = user_id);

-- Admins can see all data
CREATE POLICY "Admins read all data" ON user_profiles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_id = auth.uid()
      AND role = 'admin'
    )
  );

-- No one can directly update sensitive fields
CREATE POLICY "Restricted updates" ON user_profiles
  FOR UPDATE USING (auth.uid() = user_id)
  WITH CHECK (
    -- Can't change these fields directly
    OLD.role = NEW.role AND
    OLD.email = NEW.email AND
    OLD.created_at = NEW.created_at
  );
```

#### API Access Control
```typescript
// Middleware to check data access
export async function checkDataAccess(
  userId: string,
  resourceId: string,
  action: 'read' | 'write' | 'delete'
): Promise<boolean> {
  // Check ownership
  const resource = await getResource(resourceId);
  if (resource.owner_id === userId) return true;
  
  // Check role-based access
  const user = await getUser(userId);
  if (user.role === 'admin') return true;
  
  // Check specific permissions
  const permission = await checkPermission(userId, resourceId, action);
  return permission.granted;
}
```

## Privacy Compliance ⚠️

> **Legal Notice**: The code examples below are templates only. Consult with legal counsel before implementing privacy compliance features. None of the GDPR/COPPA/CCPA compliance code shown is currently implemented.

### GDPR Compliance (EU Users) - NOT IMPLEMENTED

#### User Rights Implementation (Template Code)

1. **Right to Access**
```typescript
// Data export endpoint
app.get('/api/user/data-export', async (req, res) => {
  const userId = req.user.id;
  
  const userData = {
    profile: await getUserProfile(userId),
    submissions: await getUserSubmissions(userId),
    bookmarks: await getUserBookmarks(userId),
    activity_logs: await getUserActivityLogs(userId)
  };
  
  res.json({
    exported_at: new Date(),
    data: userData
  });
});
```

2. **Right to Rectification**
```typescript
// Update personal data
app.put('/api/user/profile', async (req, res) => {
  const updates = sanitizeUserInput(req.body);
  await updateUserProfile(req.user.id, updates);
  
  // Log the change
  await logDataChange(req.user.id, 'profile_update', updates);
});
```

3. **Right to Erasure**
```typescript
// Account deletion
app.delete('/api/user/account', async (req, res) => {
  const userId = req.user.id;
  
  // Anonymize rather than delete for data integrity
  await anonymizeUserData(userId);
  
  // Delete personal data
  await deletePersonalData(userId);
  
  // Log deletion
  await logDataDeletion(userId);
});
```

4. **Right to Data Portability**
```typescript
// Export in machine-readable format
app.get('/api/user/data-export/:format', async (req, res) => {
  const format = req.params.format; // json, csv, xml
  const userData = await getAllUserData(req.user.id);
  
  switch(format) {
    case 'csv':
      res.type('text/csv');
      res.send(convertToCSV(userData));
      break;
    case 'xml':
      res.type('application/xml');
      res.send(convertToXML(userData));
      break;
    default:
      res.json(userData);
  }
});
```

### COPPA Compliance (Children's Privacy) - NOT IMPLEMENTED

```typescript
// Age verification
const MIN_AGE = 13;

export async function verifyAge(birthDate: Date): boolean {
  const age = calculateAge(birthDate);
  
  if (age < MIN_AGE) {
    // Require parental consent
    return false;
  }
  
  return true;
}

// Parental consent flow
export async function requestParentalConsent(
  childEmail: string,
  parentEmail: string
): Promise<void> {
  // Generate consent token
  const token = generateConsentToken();
  
  // Store pending consent
  await storePendingConsent(childEmail, parentEmail, token);
  
  // Send consent email to parent
  await sendConsentEmail(parentEmail, token);
}
```

### CCPA Compliance (California Users) - NOT IMPLEMENTED

```typescript
// Do Not Sell My Information
app.post('/api/privacy/opt-out', async (req, res) => {
  const userId = req.user.id;
  
  // Update privacy preferences
  await updatePrivacySettings(userId, {
    do_not_sell: true,
    marketing_emails: false,
    analytics_tracking: false
  });
  
  // Remove from third-party services
  await removeFromAnalytics(userId);
  await removeFromMarketing(userId);
});
```

## Data Breach Response

### Detection
```typescript
// Monitor for suspicious activity
export async function detectDataBreach(): Promise<void> {
  // Check for unusual access patterns
  const suspiciousActivity = await checkAccessLogs({
    threshold: 1000, // requests per minute
    patterns: ['bulk_download', 'sequential_access', 'api_scanning']
  });
  
  if (suspiciousActivity.detected) {
    await triggerBreachResponse(suspiciousActivity);
  }
}
```

### Response Plan
1. **Immediate** (0-1 hour)
   - Isolate affected systems
   - Stop data leak
   - Preserve evidence

2. **Short-term** (1-24 hours)
   - Assess scope
   - Notify security team
   - Begin investigation

3. **Medium-term** (1-7 days)
   - Notify affected users
   - Report to authorities (if required)
   - Implement fixes

4. **Long-term** (7+ days)
   - Complete investigation
   - Update security measures
   - Provide final report

### Notification Template
```markdown
Subject: Important Security Update Regarding Your Account

Dear [User Name],

We are writing to inform you of a security incident that may have affected your account.

**What Happened:**
[Brief description of breach]

**Information Involved:**
[List of data types potentially affected]

**What We Are Doing:**
[Steps taken to address the breach]

**What You Should Do:**
1. Change your password immediately
2. Review your account activity
3. Enable two-factor authentication
4. Monitor for suspicious activity

**For More Information:**
Contact: security@esynyc.org
Reference: [Incident ID]

We take the security of your data seriously and apologize for any inconvenience.

Sincerely,
ESYNYC Security Team
```

## Data Retention

### Recommended Retention Policies ⚠️
> **Note**: These are recommendations. Actual retention policies need to be implemented.

| Data Type | Retention Period | Deletion Method |
|-----------|-----------------|-----------------|
| Active user accounts | Until deletion requested | Full deletion |
| Inactive accounts | 2 years | Anonymization |
| Session logs | 90 days | Automatic purge |
| Error logs | 30 days | Automatic purge |
| Audit logs | 7 years | Archive + encrypt |
| Lesson submissions | Permanent | Anonymize user link |
| Email logs | 6 months | Automatic purge |
| Analytics | 1 year | Aggregation |

### Automated Cleanup
```sql
-- Scheduled job to clean old data
CREATE OR REPLACE FUNCTION cleanup_old_data()
RETURNS void AS $$
BEGIN
  -- Delete old sessions
  DELETE FROM sessions 
  WHERE created_at < NOW() - INTERVAL '90 days';
  
  -- Delete old error logs
  DELETE FROM error_logs 
  WHERE created_at < NOW() - INTERVAL '30 days';
  
  -- Anonymize inactive accounts
  UPDATE user_profiles
  SET 
    email = CONCAT('deleted_', user_id, '@example.com'),
    full_name = 'Deleted User',
    phone = NULL
  WHERE 
    last_login < NOW() - INTERVAL '2 years'
    AND status = 'inactive';
END;
$$ LANGUAGE plpgsql;

-- Schedule daily cleanup
SELECT cron.schedule('cleanup-old-data', '0 2 * * *', 'SELECT cleanup_old_data()');
```

## Monitoring & Auditing

### Audit Log Requirements
```typescript
interface AuditLog {
  timestamp: Date;
  user_id: string;
  action: string;
  resource_type: string;
  resource_id: string;
  ip_address: string;
  user_agent: string;
  success: boolean;
  metadata?: Record<string, any>;
}

// Log all data access
export async function logDataAccess(
  userId: string,
  action: string,
  resourceId: string
): Promise<void> {
  await createAuditLog({
    timestamp: new Date(),
    user_id: userId,
    action,
    resource_type: getResourceType(resourceId),
    resource_id: resourceId,
    ip_address: getClientIP(),
    user_agent: getUserAgent(),
    success: true
  });
}
```

### Privacy Metrics
- Number of data access requests
- Data export requests
- Deletion requests
- Consent changes
- Breach incidents

## Best Practices

1. **Principle of Least Privilege**: Only access data you need
2. **Data Minimization**: Don't collect unnecessary data
3. **Purpose Limitation**: Use data only for stated purposes
4. **Transparency**: Clear privacy policy and notifications
5. **Security by Design**: Build security in from the start
6. **Privacy by Default**: Most restrictive settings by default
7. **Regular Audits**: Review data practices quarterly

---

*This document ensures comprehensive data protection and privacy compliance.*