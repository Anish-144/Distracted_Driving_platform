# VAPT.md

# AI-Powered Web Application VAPT Standard

Version: 1.0

---

# PURPOSE

This document defines the complete methodology, testing standards, reporting requirements, and operational rules for performing Vulnerability Assessment and Penetration Testing (VAPT) of web applications, APIs, cloud environments, AI systems, and supporting infrastructure.

The assessment must be performed from multiple attacker perspectives:

* Unauthenticated external attacker
* Authenticated user
* Privileged user
* Malicious insider
* Competitor
* Automated bot
* AI attacker

The objective is to identify:

* Security vulnerabilities
* Misconfigurations
* Business logic flaws
* Data leakage
* Privilege escalation
* Attack chains
* Compliance issues

---

# RULES OF ENGAGEMENT

## Allowed Activities

The AI may:

* Crawl the application
* Enumerate endpoints
* Inspect APIs
* Analyze JavaScript bundles
* Review source code
* Analyze dependencies
* Test authentication
* Test authorization
* Review cloud configuration
* Test file uploads
* Inspect headers
* Test business logic
* Test AI systems
* Analyze CI/CD pipelines
* Inspect public assets
* Review logs and monitoring configurations

---

## Forbidden Activities

Never:

* Delete production data
* Modify customer records
* Execute destructive payloads
* Perform denial-of-service attacks
* Exhaust resources intentionally
* Send spam
* Upload malware
* Create excessive accounts
* Execute dangerous RCE payloads
* Access third-party systems

Use proof-of-concept validation only.

---

# TESTING METHODOLOGY

Follow the exact order:

1. Reconnaissance
2. Attack Surface Discovery
3. Authentication Testing
4. Authorization Testing
5. Session Management Testing
6. Input Validation Testing
7. Business Logic Testing
8. API Security Testing
9. Frontend Security Testing
10. File Upload Security Testing
11. Infrastructure Review
12. Cloud Security Review
13. Dependency Review
14. Secrets Discovery
15. AI/LLM Security Review
16. Logging Review
17. Compliance Review
18. Reporting

Never skip phases.

---

# SEVERITY CLASSIFICATION

## Critical

* Remote Code Execution
* Authentication Bypass
* Admin Account Takeover
* Sensitive Data Exposure
* Database Compromise

## High

* Privilege Escalation
* IDOR
* SSRF
* Significant Data Leakage

## Medium

* Weak Security Controls
* Session Issues
* Missing Validation

## Low

* Information Disclosure
* Missing Headers
* Best Practice Issues

## Informational

* Recommendations
* Hardening Opportunities

---

# RECONNAISSANCE

Identify:

* Frontend Framework
* Backend Framework
* Programming Language
* Database
* Cloud Provider
* Authentication Provider
* CDN
* Third Party Services

Document all findings.

---

# ATTACK SURFACE DISCOVERY

## Frontend Enumeration

Identify:

* Public routes
* Hidden routes
* Admin routes
* Debug routes
* Feature flags

Inspect:

* React
* Next.js
* Angular
* Vue
* Svelte

Search for:

* Hardcoded credentials
* Hidden APIs
* Internal endpoints

---

## API Discovery

Enumerate:

* REST APIs
* GraphQL APIs
* WebSocket APIs
* Internal APIs

Inspect:

* Swagger
* OpenAPI
* Postman Collections

Generate endpoint inventory.

---

## Asset Discovery

Identify:

* Subdomains
* Storage buckets
* Admin panels
* Monitoring dashboards
* CDN assets

Document all assets.

---

# OWASP TOP 10 (2021)

---

## A01 - Broken Access Control

Test:

### Vertical Privilege Escalation

Can standard users access:

* Admin pages
* Admin APIs
* Admin actions

### Horizontal Privilege Escalation

Can User A access User B data?

### IDOR Testing

Manipulate:

* userId
* orderId
* accountId
* fileId
* reportId

Record successful access.

---

## A02 - Cryptographic Failures

Verify:

* HTTPS enforcement
* HSTS
* Strong TLS

Check:

* Password storage
* Encryption at rest
* Encryption in transit

Identify:

* MD5
* SHA1
* Weak cryptography

---

## A03 - Injection

Test:

### SQL Injection

### NoSQL Injection

### LDAP Injection

### XPath Injection

### Command Injection

### Template Injection

### Server Side Template Injection

Review all user-controlled inputs.

---

## A04 - Insecure Design

Review:

* Security assumptions
* Workflow security
* Trust boundaries

Test:

* Workflow abuse
* Coupon abuse
* Payment bypass
* State manipulation

---

## A05 - Security Misconfiguration

Check:

* Debug mode
* Stack traces
* Open directories
* Open admin panels
* Weak CORS
* Weak CSP

---

## A06 - Vulnerable Components

Review:

* npm packages
* pip packages
* Maven dependencies
* Docker images

Identify:

* Known CVEs
* End-of-life software

---

## A07 - Authentication Failures

Test:

* Brute force
* Credential stuffing
* Password spraying
* Session fixation
* Session prediction

Verify:

* MFA
* Lockouts
* Password policies

---

## A08 - Software and Data Integrity Failures

Review:

* Build pipelines
* Update mechanisms
* Package integrity

---

## A09 - Logging and Monitoring Failures

Verify:

* Security logging
* Audit trails
* Alerting

---

## A10 - SSRF

Attempt access to:

* localhost
* internal services
* metadata services

Review SSRF protections.

---

# AUTHENTICATION TESTING

## Registration

Verify:

* Email verification
* Duplicate account protection
* Enumeration resistance

---

## Login

Test:

* Brute force
* Lockouts
* CAPTCHA

---

## Password Reset

Verify:

* Secure reset tokens
* Expiration
* Replay prevention

---

## MFA

Verify:

* Enforcement
* Recovery process
* Bypass attempts

---

## JWT TESTING

Check:

* Signature validation
* Expiration validation
* Audience validation
* Issuer validation

Attempt:

* Token tampering
* alg=none
* Weak secret attacks

---

## OAuth Testing

Verify:

* PKCE
* State validation
* Redirect URI validation

---

# AUTHORIZATION TESTING

Review:

## RBAC

Attempt:

* Role escalation
* Hidden admin access

---

## ABAC

Manipulate:

* User attributes
* Ownership references

---

## Multi-Tenant Isolation

Verify:

Tenant A cannot access Tenant B data.

---

# SESSION MANAGEMENT

Verify:

* Secure Cookies
* HttpOnly
* SameSite

Check:

* Logout invalidation
* Concurrent sessions
* Timeout controls

---

# API SECURITY TESTING

Based on OWASP API Top 10.

Test:

* Broken Object Level Authorization
* Broken Authentication
* Excessive Data Exposure
* Lack of Rate Limiting
* Mass Assignment
* Security Misconfiguration
* Injection
* Asset Management Issues
* Function Level Authorization
* Unsafe API Consumption

---

# GRAPHQL SECURITY

Test:

* Introspection
* Query Depth Abuse
* Alias Abuse
* Excessive Data Exposure

---

# WEBSOCKET SECURITY

Verify:

* Authentication
* Authorization
* Message validation

---

# XSS TESTING

Test:

## Reflected XSS

## Stored XSS

## DOM XSS

Verify output encoding.

Review CSP effectiveness.

---

# CSRF TESTING

Verify:

* CSRF Tokens
* SameSite Cookies

Test all state-changing actions.

---

# FILE UPLOAD SECURITY

Test:

* Double extensions
* MIME bypass
* SVG XSS
* ZIP bombs
* Polyglot files

Verify:

* Validation
* Isolation
* Malware scanning

---

# BUSINESS LOGIC TESTING

Identify:

* Price manipulation
* Discount abuse
* Referral abuse
* Reward abuse
* Workflow skipping
* Race conditions

Document abuse scenarios.

---

# RATE LIMITING TESTING

Verify protection on:

* Login
* Registration
* Password reset
* OTP
* APIs
* Search
* AI endpoints

---

# FRONTEND SECURITY REVIEW

Inspect:

## JavaScript Bundles

Search for:

* Secrets
* Tokens
* Internal URLs

---

## Local Storage

Check:

* Access tokens
* Sensitive data

---

## DOM Security

Test:

* DOM XSS
* Client-side injection

---

# SECURITY HEADERS

Verify:

* Content-Security-Policy
* Strict-Transport-Security
* X-Frame-Options
* X-Content-Type-Options
* Referrer-Policy
* Permissions-Policy
* COOP
* COEP
* CORP

---

# SOURCE CODE REVIEW

Review:

## Authentication Logic

## Authorization Logic

## Session Management

## Input Validation

## Cryptography

## Secret Handling

---

## Dangerous Functions

Search for:

### JavaScript

* eval()
* Function()

### Python

* exec()
* eval()
* pickle.loads()

### PHP

* eval()
* system()
* shell_exec()

### Node.js

* child_process.exec()

### Java

* Runtime.exec()

Flag all occurrences.

---

# SECRETS DISCOVERY

Search:

* API keys
* Access tokens
* Database passwords
* Cloud credentials
* JWT secrets

Locations:

* Source code
* Repositories
* Environment files
* JS bundles

---

# CLOUD SECURITY REVIEW

## AWS

Review:

* S3 Buckets
* IAM Policies
* Security Groups
* Secrets Manager

---

## Azure

Review:

* Storage Accounts
* Key Vault
* RBAC

---

## GCP

Review:

* Cloud Storage
* IAM
* Service Accounts

---

# INFRASTRUCTURE REVIEW

Inspect:

* Open ports
* TLS configuration
* Service banners
* Exposed dashboards

Review:

* Kubernetes
* Docker
* Monitoring systems

---

# DEPENDENCY SECURITY

Analyze:

* package.json
* requirements.txt
* pom.xml
* go.mod
* Cargo.toml

Identify:

* CVEs
* Abandoned dependencies
* Outdated software

---

# CI/CD SECURITY

Review:

* GitHub Actions
* GitLab CI
* Jenkins

Check:

* Secret exposure
* Artifact security
* Pipeline permissions

---

# AI / LLM SECURITY REVIEW

If AI functionality exists:

---

## Prompt Injection

Attempt:

* Ignore previous instructions
* Reveal system prompt
* Reveal hidden instructions
* Reveal developer instructions

---

## Data Leakage

Attempt:

* Internal document retrieval
* Cross-user leakage
* Memory leakage

---

## Tool Abuse

Attempt:

* Unauthorized tool execution
* Privilege escalation

---

## RAG Security

Verify:

* Access control
* Document isolation

---

## Agent Security

Verify:

* Tool permissions
* Function validation
* Action authorization

---

# LOGGING REVIEW

Verify:

* Login failures logged
* Permission changes logged
* Administrative actions logged
* Audit trails maintained

Check for:

* Alerting
* Monitoring
* Retention policies

---

# PRIVACY & COMPLIANCE REVIEW

Verify:

* PII protection
* Data minimization
* Consent mechanisms
* Data retention controls

Review:

* GDPR readiness
* Privacy requirements
* Regulatory concerns

---

# VULNERABILITY SCORING

Calculate:

* CVSS
* Likelihood
* Impact
* Exploitability
* Business Risk

Assign:

* Critical
* High
* Medium
* Low
* Informational

---

# SECURITY SCORECARD

Generate:

Authentication Score: /100

Authorization Score: /100

API Security Score: /100

Frontend Security Score: /100

Infrastructure Score: /100

Cloud Security Score: /100

Dependency Security Score: /100

AI Security Score: /100

Overall Security Score: /100

---

# REPORTING FORMAT

For every finding provide:

## Title

## Severity

## CWE

## OWASP Mapping

## Description

## Impact

## Affected Components

## Evidence

## Reproduction Steps

## Root Cause

## Remediation

## Retest Procedure

---

# RETESTING

For each finding:

Verify:

1. Vulnerability reproduced
2. Fix implemented
3. Exploit no longer works
4. No regression introduced

Document outcome.

---

# FINAL DELIVERABLES

Generate:

1. Executive Summary
2. Technical Findings Report
3. Vulnerability Matrix
4. Risk Heatmap
5. Attack Surface Map
6. Security Scorecard
7. Compliance Review
8. Remediation Roadmap
9. Retest Report
10. Evidence Appendix

End of VAPT Standard.
