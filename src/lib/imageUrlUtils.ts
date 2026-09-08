/**
 * Advanced Image URL Resolution & Normalization Utility
 * Supports Google Drive, ImgBB, PostImages, Imgur, Dropbox, OneDrive,
 * Google Search image snippets, GitHub/GitLab, Discord, and cleans
 * pasted HTML/BBCode/Markdown/Quotes embed codes.
 */

// Known direct mappings or special static assets
const KNOWN_URL_MAPPINGS: Record<string, string> = {
  'ibb.co/N2jHFKdP': 'https://i.ibb.co/d42zfDwq/782447521-1074313911653476-2779143939229298450-n.gif',
  'ibb.co/whWxd4FX': 'https://i.ibb.co/whWxd4FX/782447521-1074313911653476-2779143939229298450-n.gif',
  'ibb.co/My4KQNbH': 'https://i.ibb.co/My4KQNbH/1000072034-removebg-preview-1.png'
};

/**
 * Normalizes any image URL (including Google Drive, Dropbox, PostImages, Imgur, etc.)
 * so that it can be displayed directly inside standard <img> elements without CORS or redirect blocks.
 */
export function normalizeImageUrl(rawUrl?: string): string {
  if (!rawUrl || typeof rawUrl !== 'string') return '';
  let url = rawUrl.trim();
  if (!url) return '';

  // 1. Clean HTML tags (e.g. <img src="https://..."> or <a href="...">)
  if (url.includes('<img') || url.includes('src=')) {
    const srcMatch = url.match(/src=["']([^"']+)["']/i);
    if (srcMatch && srcMatch[1]) {
      url = srcMatch[1].trim();
    }
  }

  // 2. Clean BBCode tags (e.g. [img]https://...[/img] or [url=...][img]...[/img][/url])
  if (url.includes('[img]') || url.includes('[/img]')) {
    const bbMatch = url.match(/\[img\](.*?)\[\/img\]/i);
    if (bbMatch && bbMatch[1]) {
      url = bbMatch[1].trim();
    }
  }

  // 3. Clean Markdown syntax (e.g. ![alt](https://...) or [link](https://...))
  if (url.startsWith('!') || url.includes('](')) {
    const mdMatch = url.match(/\]\((https?:\/\/[^\s)]+)\)/i);
    if (mdMatch && mdMatch[1]) {
      url = mdMatch[1].trim();
    }
  }

  // 4. Remove wrapping quotes, brackets, or angle brackets
  url = url.replace(/^["'<(\[]+|[>"')\]]+$/g, '').trim();

  // 5. Check known hardcoded mappings
  for (const [key, val] of Object.entries(KNOWN_URL_MAPPINGS)) {
    if (url.includes(key)) {
      return val;
    }
  }

  // 6. Google Search Image result URL (e.g. google.com/imgres?imgurl=https%3A%2F%2F... or images.app.goo.gl)
  if (url.includes('google.com/imgres') && url.includes('imgurl=')) {
    try {
      const parsed = new URL(url);
      const directImgUrl = parsed.searchParams.get('imgurl');
      if (directImgUrl) {
        url = decodeURIComponent(directImgUrl);
      }
    } catch {
      const match = url.match(/[?&]imgurl=([^&]+)/);
      if (match && match[1]) {
        url = decodeURIComponent(match[1]);
      }
    }
  }

  // 7. Google Drive links:
  // Format A: https://drive.google.com/file/d/FILE_ID/view?usp=sharing
  // Format B: https://drive.google.com/open?id=FILE_ID
  // Format C: https://drive.google.com/uc?id=FILE_ID
  // Format D: https://docs.google.com/file/d/FILE_ID/...
  if (url.includes('drive.google.com') || url.includes('docs.google.com')) {
    const fileIdMatch = url.match(/\/d\/([a-zA-Z0-9_-]+)/) || url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
    if (fileIdMatch && fileIdMatch[1]) {
      const fileId = fileIdMatch[1];
      // Google user content CDN is the primary direct image renderer
      return `https://lh3.googleusercontent.com/d/${fileId}`;
    }
  }

  // 8. Dropbox links:
  // https://www.dropbox.com/s/.../image.jpg?dl=0 -> raw=1
  // https://www.dropbox.com/scl/fi/.../image.jpg?rlkey=...&dl=0 -> raw=1
  if (url.includes('dropbox.com')) {
    try {
      const parsed = new URL(url);
      parsed.searchParams.set('raw', '1');
      parsed.searchParams.delete('dl');
      return parsed.toString();
    } catch {
      return url.replace('dl=0', 'raw=1').replace('dl=1', 'raw=1');
    }
  }

  // 9. OneDrive links:
  if (url.includes('1drv.ms') || url.includes('onedrive.live.com')) {
    if (url.includes('redir?')) {
      return url.replace('redir?', 'download?');
    }
  }

  // 10. Imgur links:
  // https://imgur.com/abcde -> https://i.imgur.com/abcde.jpg
  if (url.includes('imgur.com/') && !url.includes('i.imgur.com') && !url.includes('/a/') && !url.includes('/gallery/')) {
    const match = url.match(/imgur\.com\/([a-zA-Z0-9]+)/);
    if (match && match[1]) {
      return `https://i.imgur.com/${match[1]}.jpg`;
    }
  }

  // 11. GitHub blob to raw links:
  if (url.includes('github.com') && url.includes('/blob/')) {
    return url.replace('github.com', 'raw.githubusercontent.com').replace('/blob/', '/');
  }

  // 12. GitLab blob to raw links:
  if (url.includes('gitlab.com') && url.includes('/-/blob/')) {
    return url.replace('/-/blob/', '/-/raw/');
  }

  return url;
}

/**
 * Returns a fallback proxy URL using wsrv.nl CDN if direct image fails to load due to hotlink/CORS blocks.
 */
export function getProxiedImageUrl(rawUrl: string): string {
  const clean = normalizeImageUrl(rawUrl);
  if (!clean || clean.startsWith('data:') || clean.startsWith('blob:')) {
    return clean;
  }
  // Avoid re-proxying wsrv
  if (clean.includes('wsrv.nl')) return clean;

  // Encode URL for wsrv.nl proxy (handles TLS/CORS/Anti-hotlink headers automatically)
  return `https://wsrv.nl/?url=${encodeURIComponent(clean)}&default=${encodeURIComponent(clean)}&n=-1`;
}

/**
 * Extracts Google Drive File ID if present
 */
export function extractDriveFileId(url: string): string | null {
  if (!url) return null;
  if (!url.includes('drive.google.com') && !url.includes('docs.google.com') && !url.includes('googleusercontent.com/d/')) {
    return null;
  }
  const match = url.match(/\/d\/([a-zA-Z0-9_-]+)/) || url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  return match && match[1] ? match[1] : null;
}

/**
 * Generates alternative URL fallbacks for resilient multi-layer loading
 */
export function getImageFallbackUrls(url: string): string[] {
  const clean = normalizeImageUrl(url);
  if (!clean) return [];
  const list: string[] = [clean];

  const driveId = extractDriveFileId(url);
  if (driveId) {
    list.push(`https://drive.google.com/thumbnail?id=${driveId}&sz=w1600`);
    list.push(`https://drive.google.com/uc?export=view&id=${driveId}`);
    list.push(`https://lh3.googleusercontent.com/u/0/d/${driveId}`);
  }

  const proxied = getProxiedImageUrl(clean);
  if (proxied && !list.includes(proxied)) {
    list.push(proxied);
  }

  return list;
}

/**
 * Async resolution: resolves webpage / host viewer links (e.g. ibb.co/XYZ, postimg.cc/XYZ)
 * into direct renderable image URLs by calling our server resolver API.
 */
export async function resolveImageUrlAsync(rawUrl: string): Promise<{ resolvedUrl: string; isPageResolved: boolean }> {
  const clean = normalizeImageUrl(rawUrl);
  if (!clean) return { resolvedUrl: '', isPageResolved: false };

  // If already standard image format or direct CDN, return early
  if (clean.match(/\.(png|jpe?g|gif|webp|svg|bmp)(\?.*)?$/i) || clean.includes('i.ibb.co') || clean.includes('i.imgur.com') || clean.includes('i.postimg.cc')) {
    return { resolvedUrl: clean, isPageResolved: false };
  }

  // Attempt backend resolution for webpages like ibb.co, postimg.cc, imgur, etc.
  try {
    const res = await fetch(`/api/resolve-image-url?url=${encodeURIComponent(clean)}`);
    if (res.ok) {
      const data = await res.json();
      if (data.resolvedUrl && data.resolvedUrl !== clean) {
        return { resolvedUrl: data.resolvedUrl, isPageResolved: true };
      }
    }
  } catch (err) {
    console.warn("Async image resolution notice:", err);
  }

  return { resolvedUrl: clean, isPageResolved: false };
}

/**
 * Validates whether an image URL is syntactically sound and non-empty.
 */
export function isValidImageUrl(url: string): boolean {
  if (!url) return false;
  const clean = normalizeImageUrl(url);
  if (clean.startsWith('data:image/')) return true;
  if (clean.startsWith('blob:')) return true;
  if (!clean.startsWith('http://') && !clean.startsWith('https://')) return false;
  return clean.length > 10;
}

