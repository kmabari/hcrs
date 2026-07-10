async function check() {
  const urls = [
    'https://i.ibb.co/DHKT5DRn/1000072034-removebg-preview-1.png',
    'https://i.ibb.co/My4KQNbH/1000072034-removebg-preview-1.png'
  ];

  for (const url of urls) {
    try {
      const res = await fetch(url, { method: 'HEAD' });
      console.log(`URL: ${url} -> Status: ${res.status}`);
    } catch (e: any) {
      console.log(`URL: ${url} -> FAILED: ${e.message}`);
    }
  }
}

check().then(() => process.exit(0));
