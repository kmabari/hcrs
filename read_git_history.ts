import fs from 'fs';
import path from 'path';

function findGitLogs() {
  const gitLogPath = '.git/logs/refs/heads/main';
  if (fs.existsSync(gitLogPath)) {
    console.log("Git logs for main branch found!");
    const content = fs.readFileSync(gitLogPath, 'utf8');
    console.log(content);
  } else {
    console.log("Git logs for main branch NOT found.");
    // Try scanning .git directory
    if (fs.existsSync('.git')) {
      console.log(".git directory exists.");
    }
  }
}

findGitLogs();
