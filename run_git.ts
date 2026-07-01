import { execSync } from 'child_process';

try {
  console.log("--- Git Status ---");
  console.log(execSync('git status').toString());
  
  console.log("\n--- Git Log (last 10 commits) ---");
  console.log(execSync('git log -n 10 --oneline').toString());

  console.log("\n--- Git Show of firebase-applet-config.json history ---");
  console.log(execSync('git log -p -n 1 -- firebase-applet-config.json').toString());
} catch (err: any) {
  console.error("Exec failed:", err.message);
  if (err.stdout) console.log("Stdout:", err.stdout.toString());
  if (err.stderr) console.log("Stderr:", err.stderr.toString());
}
