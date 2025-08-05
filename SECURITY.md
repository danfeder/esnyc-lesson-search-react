# Security Policy

> **Note**: This is a template security policy. Some contact emails and procedures described below need to be configured for your organization.

## Supported Versions

We release patches for security vulnerabilities. Currently supported versions:

| Version | Supported          |
| ------- | ------------------ |
| 2.x.x   | :white_check_mark: |
| 1.x.x   | :x:                |

## Reporting a Vulnerability

We take the security of the ESYNYC Lesson Search platform seriously. If you believe you have found a security vulnerability, please report it to us as described below.

### Please DO:
- Email us at security@esynyc.org with details [NOTE: Configure this email address]
- Include steps to reproduce the issue
- Allow us reasonable time to fix the issue before public disclosure
- Include your GitHub username for attribution (optional)

### Please DO NOT:
- Open a public GitHub issue
- Exploit the vulnerability beyond proof of concept
- Access or modify other users' data
- Perform actions that could harm service availability

## Response Timeline

- **Initial Response**: Within 48 hours
- **Status Update**: Within 7 days
- **Resolution Target**: Based on severity (see below)

## Severity Levels

### Critical (Resolution: 24-48 hours)
- Authentication bypass
- SQL injection vulnerabilities
- Remote code execution
- Exposure of sensitive user data
- Complete system compromise

### High (Resolution: 3-5 days)
- Privilege escalation
- Cross-site scripting (XSS) with user impact
- Unauthorized data access
- Session hijacking vulnerabilities

### Medium (Resolution: 7-14 days)
- Limited XSS vulnerabilities
- CSRF vulnerabilities
- Information disclosure (non-sensitive)
- Denial of service vulnerabilities

### Low (Resolution: 30 days)
- Best practice violations
- Minor information leaks
- Issues requiring unlikely user interaction
- Performance issues with security implications

## Security Measures

### Current Implementation
> **Status**: Most of these are implemented via Supabase defaults. Items marked with ⚠️ need verification or configuration.

#### Authentication & Authorization
- Supabase Auth with JWT tokens
- Row Level Security (RLS) on all tables
- Role-based access control (RBAC)
- Secure session management

#### Data Protection
- All data transmitted over HTTPS
- Sensitive data encrypted at rest
- API keys stored in environment variables
- No sensitive data in client-side code

#### Input Validation
- Server-side validation on all inputs
- SQL injection prevention via parameterized queries
- XSS prevention via React's built-in escaping
- File upload restrictions and validation

#### Infrastructure Security
- Regular dependency updates
- Security headers configured
- Rate limiting on API endpoints
- CORS properly configured

### Security Headers

⚠️ **TODO**: Configure these headers in your hosting platform (Netlify/Vercel):

```
Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net; style-src 'self' 'unsafe-inline';
X-Frame-Options: SAMEORIGIN
X-Content-Type-Options: nosniff
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: camera=(), microphone=(), geolocation=()
```

## Security Checklist for Contributors

Before submitting a PR:

- [ ] No hardcoded credentials or API keys
- [ ] Input validation implemented
- [ ] SQL queries use parameterization
- [ ] Authentication checked where required
- [ ] Authorization verified for data access
- [ ] Error messages don't leak sensitive info
- [ ] Logging doesn't include sensitive data
- [ ] Dependencies are up to date
- [ ] Security tests included where applicable

## Known Security Considerations

### Third-Party Services
- **Supabase**: Database and authentication
- **Algolia**: Search functionality
- **Resend**: Email notifications
- **Google Docs API**: Document extraction
- **OpenAI API**: Embeddings generation

All third-party services are accessed via secure APIs with proper authentication.

### Data Classification

| Data Type | Classification | Protection Level |
|-----------|---------------|------------------|
| User passwords | Critical | Hashed with bcrypt |
| User emails | Sensitive | Encrypted, limited access |
| API keys | Critical | Environment variables only |
| Lesson content | Public | No special protection |
| User preferences | Private | RLS protected |
| Session tokens | Critical | Secure, httpOnly cookies |

## Security Tools

### Automated Scanning
- GitHub Dependabot for dependency vulnerabilities
- npm audit on every build
- CodeQL analysis via GitHub Actions

### Manual Testing
- Regular penetration testing (annually)
- Code reviews for security implications
- Security-focused test cases

## Compliance

While not required for our use case, we follow best practices from:
- OWASP Top 10
- NIST Cybersecurity Framework
- GDPR principles for data protection

## Security Contacts

- **Security Team**: security@esynyc.org
- **Project Lead**: Dan Feder (df@esynyc.org)
- **Emergency**: [Include 24/7 contact if available]

## Acknowledgments

We thank the following researchers for responsibly disclosing security issues:
- [Your name here - report vulnerabilities!]

## Resources

- [OWASP Cheat Sheet Series](https://cheatsheetseries.owasp.org/)
- [Supabase Security Best Practices](https://supabase.com/docs/guides/auth/security)
- [React Security Best Practices](https://react.dev/learn/security)

---

*Last Updated: August 2025*
*Next Security Review: February 2026*