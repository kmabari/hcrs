export function getYouTubeVideoId(input?: string): string | null {
  const value = (input || '').trim();
  if (!value) return null;

  try {
    const url = new URL(value.startsWith('http') ? value : `https://${value}`);
    const host = url.hostname.toLowerCase().replace(/^www\./, '');
    let candidate = '';

    if (host === 'youtu.be') {
      candidate = url.pathname.split('/').filter(Boolean)[0] || '';
    } else if (host === 'youtube.com' || host.endsWith('.youtube.com')) {
      if (url.pathname === '/watch') candidate = url.searchParams.get('v') || '';
      else {
        const parts = url.pathname.split('/').filter(Boolean);
        if (['embed', 'shorts', 'live'].includes(parts[0])) candidate = parts[1] || '';
      }
    }

    return /^[A-Za-z0-9_-]{11}$/.test(candidate) ? candidate : null;
  } catch {
    return null;
  }
}

export function getYouTubeThumbnail(input?: string): string | null {
  const id = getYouTubeVideoId(input);
  return id ? `https://i.ytimg.com/vi/${id}/hqdefault.jpg` : null;
}

export function getYouTubeEmbedUrl(input?: string): string | null {
  const id = getYouTubeVideoId(input);
  return id
    ? `https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0&modestbranding=1`
    : null;
}
