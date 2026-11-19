# Security Specification & Payload-First TDD

## 1. Data Invariants
1. **Admin Authority**: Only verified admins (`request.auth.token.email_verified == true` matching the bootstrapped admin email `pitertan0120@gmail.com` or an existing document in `/admins/{uid}`) may create, update, or delete portfolio content, media assets, navigation, sections, or SEO settings.
2. **PII Isolation**: Visitor `contact_messages` (name, email, subject, message) and `activity_logs` are strictly readable and listable only by verified admins. Public visitors may only `create` a `contact_messages` document with `status == 'unread'` and `createdAt == request.time`.
3. **Immutable Audit Trail**: `activity_logs` cannot be updated or deleted by any client, and `createdAt` is locked to `request.time`.
4. **Strict Schema & Bounds**: Every write validates required/allowed keys (`hasAll` + `hasOnly`), string `.size()` limits, bounded array sizes (`<= 20`), and valid IDs (`^[a-zA-Z0-9_-]+$`, `<= 128` chars).
5. **Email Verification Gate**: Unverified OAuth tokens (`email_verified == false`) are rejected from all admin operations even if the email string matches.

## 2. The "Dirty Dozen" Attack Payloads
1. **Shadow Field Injection on Contact**: `{ name: "Alice", email: "a@b.com", subject: "Hi", message: "Hello world testing", status: "unread", adminNotes: "", isAdmin: true, createdAt: serverTimestamp, updatedAt: serverTimestamp }` -> Denied (`hasOnly` rejects `isAdmin`).
2. **Pre-Approved Message Status Spoof**: Submitting `contact_messages` with `status: "replied"` -> Denied (`status == 'unread'` enforced on create).
3. **Public Visitor Reading Contact Messages**: Unauthenticated or non-admin `get`/`list` on `/contact_messages` -> Denied (`isAdmin()` required).
4. **Spoofed Admin Email Without Verification**: Auth token with `email: "pitertan0120@gmail.com"` and `email_verified: false` -> Denied (`email_verified == true` required).
5. **Self-Assigned Admin Escalation**: Non-admin authenticated user creating `/admins/{uid}` with `role: "super_admin"` -> Denied (`isSuperAdmin()` required).
6. **1MB String Resource Poisoning**: Creating `contact_messages` or `projects` with a 50KB `title` or `1.5KB` document ID -> Denied (`isValidId()` and `.size()` checks).
7. **Unbounded Array Injection**: Project with 500 `technologies` strings -> Denied (`technologies.size() <= 20`).
8. **Timestamp Tampering**: Creating `contact_messages` or `activity_logs` with backdated `createdAt` -> Denied (`createdAt == request.time`).
9. **Audit Log Tampering**: Admin attempting `update` or `delete` on `/activity_logs/{id}` -> Denied (`allow update, delete: if false`).
10. **Ghost Field on Project Update**: Admin or non-admin updating `projects` with undeclared field `secretFlag: true` -> Denied (`isValidProject` checks `hasOnly`).
11. **Non-Admin Mutation on Public Content**: Signed-in non-admin trying to update `/hero_contents/main` -> Denied (`isAdmin()` required).
12. **Client-Side Timestamp Forgery on Experience**: Writing `updatedAt` other than `request.time` -> Denied (`updatedAt == request.time`).
