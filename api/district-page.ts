import { resolveDistrictFromSlugOrCode, getDistrictName } from "../src/lib/districtUtils.js";

// Serves the normal app shell for district admin links (/?distLogin=<slug>) with a
// district-specific link preview (WhatsApp/Facebook read these tags, not the app).
export default async function handler(req: any, res: any) {
  const host = String(req.headers['x-forwarded-host'] || req.headers.host || '');
  const proto = String(req.headers['x-forwarded-proto'] || 'https');
  const origin = `${proto}://${host}`;
  try {
    const raw = String(new URL(req.url || '/', origin).searchParams.get('distLogin') || '');
    const code = resolveDistrictFromSlugOrCode(raw);
    const upstream = await fetch(`${origin}/index.html`);
    let html = await upstream.text();
    if (code) {
      const name = String(getDistrictName(code) || '').replace(/[<>&"]/g, '');
      const title = `HCRS ${name} District Admin`;
      const desc = 'നിങ്ങളുടെ ജില്ലയിലെ എല്ലാ കാര്യങ്ങളും നിങ്ങൾക്ക് ഈ ലിങ്ക് വഴി മാനേജ് ചെയ്യാം.';
      html = html
        .replace(/<title>[\s\S]*?<\/title>/, `<title>${title}</title>`)
        .replace(/(<meta name="description" content=")[^"]*(")/, `$1${desc}$2`)
        .replace(/(<meta property="og:title" content=")[^"]*(")/, `$1${title}$2`)
        .replace(/(<meta property="og:description" content=")[^"]*(")/, `$1${desc}$2`)
        .replace(/(<meta name="twitter:title" content=")[^"]*(")/, `$1${title}$2`)
        .replace(/(<meta name="twitter:description" content=")[^"]*(")/, `$1${desc}$2`);
    }
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600');
    res.status(200).send(html);
  } catch (e) {
    res.statusCode = 302;
    res.setHeader('Location', '/index.html');
    res.end();
  }
}
