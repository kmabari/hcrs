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
  }
];

const failures = [];

for (const check of checks) {
  const source = readFileSync(check.file, 'utf8');
  for (const marker of check.required) {
    if (!source.includes(marker)) failures.push(`${check.file}: missing ${marker}`);
  }
}

if (failures.length > 0) {
  console.error('Protected admin UI regression detected:');
  failures.forEach(failure => console.error(`- ${failure}`));
  process.exit(1);
}

console.log('Protected admin UI regression checks passed.');
