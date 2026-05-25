# HCRS Society Security Specification

## 1. Data Invariants
- A User document must have a `mobile` number that matches their username logic.
- `membershipId` format must be `[State]/[District]/[Constituency]/[Serial]`.
- `isApproved` and `isAdmin` can ONLY be modified by an existing admin.
- A user can only read their own profile, unless they are an admin.
- `registrationDate` must be a valid server timestamp on creation.
- `status` can only transition through defined states (pending -> active).

## 2. The "Dirty Dozen" Payloads (Deny Targets)

1. **Identity Spoofing**: Attempt to create a user profile with a `uid` that doesn't match `request.auth.uid`.
2. **Privilege Escalation**: Attempt to set `isAdmin: true` during registration.
3. **Ghost Fields**: Attempt to add `verifiedBy: "self"` to the user document.
4. **ID Poisoning**: Use a 2KB string as a `uid` or `membershipId`.
5. **State Shortcut**: Create a user with `status: "active"` without admin approval.
6. **Relational Break**: Create a user with a non-existent `districtCode`.
7. **Immortality Breach**: Attempt to change `registrationDate` after creation.
8. **PII Leak**: An unauthenticated user attempting to list the `users` collection.
9. **Update Gap**: A user attempting to update their own `isPaid` status to `true` after initial registration.
10. **Serial Hijack**: Attempting to set an arbitrary `serialNo` instead of the one assigned by the system.
11. **Sponsor Spoof**: Modifying `sponsorMobile` after it has been set.
12. **Cross-User Read**: User A attempting to `get` the document of User B.

## 3. Test Runner (Mock Logic)
The `firestore.rules` will be verified to ensure all the above payloads return `PERMISSION_DENIED`.
