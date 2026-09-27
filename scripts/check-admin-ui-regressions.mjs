import { readFileSync } from 'node:fs';

const checks = [
  {
    file: 'src/components/DuplicateSerialDryRunReport.tsx',
    required: [
      'data-scroll-lock="serial-correction-report"',
      'max-h-[420px]',
      'overflow-auto',
      'sticky top-0'
    ]
  },
  {
    file: 'src/components/JanamailAdminReport.tsx',
    required: [
      "from '../eledger/lib/firebaseEledger'",
      "collection(eledgerDb,'janamail_submissions')",
      'data-scroll-lock="janamail-admin-report"',
      'max-h-[360px]',
      'overflow-auto'
    ]
  },
  {
    file: 'src/components/JanamailSubmissionsPanel.tsx',
    required: [
      "from '../eledger/lib/firebaseEledger'",
      "collection(eledgerDb, 'janamail_submissions')",
      "row.recordType === 'janamail_submission'"
    ],
    forbidden: [
      "collection(db, 'claims')",
      "from '../lib/firebase'"
    ]
  },
  {
    file: 'server.ts',
    required: [
      "replace(/\\D/g, '').slice(-10)",
      "/^\\d{4}-\\d{2}-\\d{2}$/",
      "CAPTURED_MEMBER_UNRESOLVED",
      "paymentStatus: 'VERIFICATION_PENDING'"
    ],
    forbidden: [
      "replace(/\\\\D/g, '').slice(-10)",
      "/^\\\\d{4}-\\\\d{2}-\\\\d{2}$/"
    ]
  },
  {
    file: 'src/RenewalForm.tsx',
    required: [
      "String(data.membershipId || '').trim()",
      "genuineMobileMember"
    ]
  }
];

const failures = [];

for (const check of checks) {
  const source = readFileSync(check.file, 'utf8');
  for (const marker of check.required) {
    if (!source.includes(marker)) failures.push(`${check.file}: missing ${marker}`);
  }
  for (const marker of check.forbidden || []) {
    if (source.includes(marker)) failures.push(`${check.file}: forbidden ${marker}`);
  }
}

if (failures.length > 0) {
  console.error('Protected admin UI regression detected:');
  failures.forEach(failure => console.error(`- ${failure}`));
  process.exit(1);
}

console.log('Protected admin UI regression checks passed.');
