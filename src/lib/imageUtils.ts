/**
 * Utility functions for image manipulation and HTML5 Canvas export
 */

export async function compressImage(file: File, maxWidth = 800, maxHeight = 800, quality = 0.7): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxWidth) {
            height *= maxWidth / width;
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width *= maxHeight / height;
            height = maxHeight;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(blob);
            } else {
              reject(new Error('Canvas to Blob conversion failed'));
            }
          },
          'image/jpeg',
          quality
        );
      };
      img.onerror = (error) => reject(error);
    };
    reader.onerror = (error) => reject(error);
  });
}

/**
 * OKLAB to sRGB converter
 */
export function oklabToRgb(L: number, a: number, b: number): [number, number, number] {
  const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = L - 0.0894841775 * a - 1.2914855480 * b;

  const l3 = l_ * l_ * l_;
  const m3 = m_ * m_ * m_;
  const s3 = s_ * s_ * s_;

  let rL = +4.0767416621 * l3 - 3.3077115913 * m3 + 0.2309699292 * s3;
  let gL = -1.2684380046 * l3 + 2.6097574011 * m3 - 0.3413193965 * s3;
  let bL = -0.0041960863 * l3 - 0.7034186147 * m3 + 1.7076147010 * s3;

  const f = (x: number) => {
    return x <= 0.0031308 ? 12.92 * x : 1.055 * Math.pow(Math.max(0, x), 1 / 2.4) - 0.055;
  };

  const r = Math.max(0, Math.min(255, Math.round(f(rL) * 255)));
  const g = Math.max(0, Math.min(255, Math.round(f(gL) * 255)));
  const b_val = Math.max(0, Math.min(255, Math.round(f(bL) * 255)));

  return [r, g, b_val];
}

/**
 * OKLCH to sRGB converter
 */
export function oklchToRgb(l: number, c: number, hDeg: number): [number, number, number] {
  const hRad = (hDeg * Math.PI) / 180;
  const a = c * Math.cos(hRad);
  const b = c * Math.sin(hRad);
  return oklabToRgb(l, a, b);
}

/**
 * CIELAB to sRGB converter
 */
export function labToRgb(l: number, a: number, b: number): [number, number, number] {
  const y = (l + 16) / 116;
  const x = a / 500 + y;
  const z = y - b / 200;

  const x3 = x * x * x;
  const z3 = z * z * z;
  const y3 = y * y * y;

  const X = (x3 > 0.008856 ? x3 : (x - 16 / 116) / 7.787) * 0.95047;
  const Y = (y3 > 0.008856 ? y3 : (y - 16 / 116) / 7.787) * 1.00000;
  const Z = (z3 > 0.008856 ? z3 : (z - 16 / 116) / 7.787) * 1.08883;

  let r = X * 3.2406 + Y * -1.5372 + Z * -0.4986;
  let g = X * -0.9689 + Y * 1.8758 + Z * 0.0415;
  let b_val = X * 0.0557 + Y * -0.2040 + Z * 1.0570;

  const f = (val: number) => {
    return val <= 0.0031308 ? 12.92 * val : 1.055 * Math.pow(Math.max(0, val), 1 / 2.4) - 0.055;
  };

  return [
    Math.max(0, Math.min(255, Math.round(f(r) * 255))),
    Math.max(0, Math.min(255, Math.round(f(g) * 255))),
    Math.max(0, Math.min(255, Math.round(f(b_val) * 255)))
  ];
}

/**
 * CIELCH to sRGB converter
 */
export function lchToRgb(l: number, c: number, hDeg: number): [number, number, number] {
  const hRad = (hDeg * Math.PI) / 180;
  const a = c * Math.cos(hRad);
  const b = c * Math.sin(hRad);
  return labToRgb(l, a, b);
}

// Reusable offscreen 2D canvas context for browser-native color evaluation
let _canvasCtx: CanvasRenderingContext2D | null = null;
function getCanvasCtx(): CanvasRenderingContext2D | null {
  if (typeof document === 'undefined') return null;
  if (!_canvasCtx) {
    try {
      const c = document.createElement('canvas');
      c.width = 1;
      c.height = 1;
      _canvasCtx = c.getContext('2d', { willReadFrequently: true });
    } catch {
      _canvasCtx = null;
    }
  }
  return _canvasCtx;
}

/**
 * Parse an individual color string into standard rgb/rgba/hex using browser native canvas
 * or mathematical fallback.
 */
export function parseIndividualColorToRgb(colorStr: string): string {
  if (!colorStr) return 'transparent';
  const trimmed = colorStr.trim();
  if (
    trimmed === 'transparent' || 
    trimmed === 'inherit' || 
    trimmed === 'initial' || 
    trimmed === 'currentColor' || 
    trimmed === 'unset'
  ) {
    return trimmed;
  }

  // 1. Try browser canvas 2D fillStyle conversion (exact sRGB mapping)
  const ctx = getCanvasCtx();
  if (ctx) {
    try {
      ctx.fillStyle = '#000000'; // reset
      ctx.fillStyle = trimmed;
      const res = ctx.fillStyle;
      if (res && (res.startsWith('#') || res.startsWith('rgb'))) {
        return res;
      }
    } catch {
      // fallback
    }
  }

  // 2. Mathematical fallback for modern color formats
  try {
    if (trimmed.startsWith('oklab(')) {
      const inner = trimmed.slice(6, -1).trim();
      const parts = inner.split(/[\s,/]+/).filter(Boolean);
      if (parts.length >= 3) {
        const lVal = parts[0];
        const L = lVal.endsWith('%') ? parseFloat(lVal) / 100 : parseFloat(lVal);
        const aVal = parts[1];
        const a = aVal.endsWith('%') ? (parseFloat(aVal) * 0.4) / 100 : parseFloat(aVal);
        const bVal = parts[2];
        const b = bVal.endsWith('%') ? (parseFloat(bVal) * 0.4) / 100 : parseFloat(bVal);
        const alpha = parts[3] ? (parts[3].endsWith('%') ? parseFloat(parts[3]) / 100 : parseFloat(parts[3])) : null;
        const [r, g, b_val] = oklabToRgb(L, a, b);
        return alpha !== null && !isNaN(alpha) ? `rgba(${r}, ${g}, ${b_val}, ${alpha})` : `rgb(${r}, ${g}, ${b_val})`;
      }
    }

    if (trimmed.startsWith('oklch(')) {
      const inner = trimmed.slice(6, -1).trim();
      const parts = inner.split(/[\s,/]+/).filter(Boolean);
      if (parts.length >= 3) {
        const lVal = parts[0];
        const l = lVal.endsWith('%') ? parseFloat(lVal) / 100 : parseFloat(lVal);
        const cVal = parts[1];
        const c = cVal.endsWith('%') ? parseFloat(cVal) / 100 : parseFloat(cVal);
        const hVal = parts[2];
        let h = parseFloat(hVal);
        if (hVal.endsWith('rad')) h = (parseFloat(hVal) * 180) / Math.PI;
        else if (hVal.endsWith('turn')) h = parseFloat(hVal) * 360;
        const alpha = parts[3] ? (parts[3].endsWith('%') ? parseFloat(parts[3]) / 100 : parseFloat(parts[3])) : null;
        const [r, g, b] = oklchToRgb(l, c, h);
        return alpha !== null && !isNaN(alpha) ? `rgba(${r}, ${g}, ${b}, ${alpha})` : `rgb(${r}, ${g}, ${b})`;
      }
    }

    if (trimmed.startsWith('lab(')) {
      const inner = trimmed.slice(4, -1).trim();
      const parts = inner.split(/[\s,/]+/).filter(Boolean);
      if (parts.length >= 3) {
        const l = parseFloat(parts[0]);
        const a = parseFloat(parts[1]);
        const b = parseFloat(parts[2]);
        const alpha = parts[3] ? (parts[3].endsWith('%') ? parseFloat(parts[3]) / 100 : parseFloat(parts[3])) : null;
        const [r, g, b_val] = labToRgb(l, a, b);
        return alpha !== null && !isNaN(alpha) ? `rgba(${r}, ${g}, ${b_val}, ${alpha})` : `rgb(${r}, ${g}, ${b_val})`;
      }
    }

    if (trimmed.startsWith('lch(')) {
      const inner = trimmed.slice(4, -1).trim();
      const parts = inner.split(/[\s,/]+/).filter(Boolean);
      if (parts.length >= 3) {
        const l = parseFloat(parts[0]);
        const c = parseFloat(parts[1]);
        let h = parseFloat(parts[2]);
        if (parts[2].endsWith('rad')) h = (h * 180) / Math.PI;
        const alpha = parts[3] ? (parts[3].endsWith('%') ? parseFloat(parts[3]) / 100 : parseFloat(parts[3])) : null;
        const [r, g, b] = lchToRgb(l, c, h);
        return alpha !== null && !isNaN(alpha) ? `rgba(${r}, ${g}, ${b}, ${alpha})` : `rgb(${r}, ${g}, ${b})`;
      }
    }

    if (trimmed.startsWith('color(')) {
      const inner = trimmed.slice(6, -1).trim();
      const parts = inner.split(/[\s/]+/).filter(Boolean);
      // format: srgb r g b / a
      if (parts.length >= 4 && (parts[0] === 'srgb' || parts[0] === 'srgb-linear' || parts[0] === 'display-p3')) {
        const r = Math.round(parseFloat(parts[1]) * 255);
        const g = Math.round(parseFloat(parts[2]) * 255);
        const b = Math.round(parseFloat(parts[3]) * 255);
        const alpha = parts[4] ? (parts[4].endsWith('%') ? parseFloat(parts[4]) / 100 : parseFloat(parts[4])) : null;
        return alpha !== null && !isNaN(alpha) ? `rgba(${r}, ${g}, ${b}, ${alpha})` : `rgb(${r}, ${g}, ${b})`;
      }
    }
  } catch {
    // ignore
  }

  return trimmed;
}

/**
 * Replace all oklab(...) with rgb/rgba
 */
export function replaceOklabWithRgb(cssText: string): string {
  if (!cssText) return '';
  return cssText.replace(/oklab\((?:[^)(]+|\((?:[^)(]+|\([^)(]*\))*\))*\)/gi, (match) => {
    return parseIndividualColorToRgb(match);
  });
}

/**
 * Replace all oklch(...) with rgb/rgba
 */
export function replaceOklchWithRgb(cssText: string): string {
  if (!cssText) return '';
  return cssText.replace(/oklch\((?:[^)(]+|\((?:[^)(]+|\([^)(]*\))*\))*\)/gi, (match) => {
    return parseIndividualColorToRgb(match);
  });
}

/**
 * Replaces modern color functions (oklab, oklch, lab, lch, color-mix, color) with standard rgb/rgba/hex
 */
export function sanitizeCssColors(cssText: string): string {
  if (!cssText) return '';
  let result = cssText;

  // 1. Remove interpolation color spaces from gradient functions e.g. "linear-gradient(in oklab, ...)"
  result = result.replace(/\b(linear|radial|conic)-gradient\s*\(\s*in\s+(oklab|oklch|lab|lch|srgb-linear)\s*,/gi, '$1-gradient(');

  // 2. Convert color-mix(...) functions with nested parens
  if (result.includes('color-mix')) {
    result = result.replace(/color-mix\((?:[^)(]+|\((?:[^)(]+|\([^)(]*\))*\))*\)/gi, (match) => {
      const parsed = parseIndividualColorToRgb(match);
      if (parsed && (parsed.startsWith('#') || parsed.startsWith('rgb'))) {
        return parsed;
      }
      // If unresolvable, convert interpolation space to standard srgb
      return match.replace(/in\s+(oklab|oklch|lab|lch)/gi, 'in srgb');
    });
  }

  // 3. Convert all oklab(...)
  if (result.includes('oklab')) {
    result = replaceOklabWithRgb(result);
  }

  // 4. Convert all oklch(...)
  if (result.includes('oklch')) {
    result = replaceOklchWithRgb(result);
  }

  // 5. Convert all lab(...)
  if (result.includes('lab(')) {
    result = result.replace(/lab\((?:[^)(]+|\((?:[^)(]+|\([^)(]*\))*\))*\)/gi, (match) => {
      return parseIndividualColorToRgb(match);
    });
  }

  // 6. Convert all lch(...)
  if (result.includes('lch(')) {
    result = result.replace(/lch\((?:[^)(]+|\((?:[^)(]+|\([^)(]*\))*\))*\)/gi, (match) => {
      return parseIndividualColorToRgb(match);
    });
  }

  // 7. Convert all color(srgb ...)
  if (result.includes('color(')) {
    result = result.replace(/color\((?:[^)(]+|\((?:[^)(]+|\([^)(]*\))*\))*\)/gi, (match) => {
      return parseIndividualColorToRgb(match);
    });
  }

  return result;
}

const MODERN_COLOR_KEYWORDS = ['oklab', 'oklch', 'lab(', 'lch(', 'color(', 'color-mix'];

function containsModernColor(str: string): boolean {
  if (!str) return false;
  return MODERN_COLOR_KEYWORDS.some((kw) => str.includes(kw));
}

const COLOR_STYLE_PROPS = [
  'color',
  'background-color',
  'border-top-color',
  'border-right-color',
  'border-bottom-color',
  'border-left-color',
  'outline-color',
  'box-shadow',
  'text-shadow',
  'fill',
  'stroke',
  'stop-color',
  'flood-color',
  'caret-color',
  'accent-color',
  'text-decoration-color'
];

/**
 * onclone handler for html2canvas to sanitize oklab/oklch/modern colors in cloned documents
 */
export function html2canvasOklchOnClone(clonedDoc: Document): void {
  // 1. Sanitize all <style> tags
  const styleTags = clonedDoc.querySelectorAll('style');
  styleTags.forEach((style) => {
    try {
      const content = style.textContent || style.innerHTML;
      if (content && containsModernColor(content)) {
        style.textContent = sanitizeCssColors(content);
      }
    } catch (err) {
      console.warn("Failed to sanitize style tag:", err);
    }
  });

  // 2. Sanitize all rules in clonedDoc.styleSheets
  try {
    const sheets = Array.from(clonedDoc.styleSheets || []);
    for (const sheet of sheets) {
      try {
        const rules = Array.from(sheet.cssRules || []);
        for (let i = 0; i < rules.length; i++) {
          const rule = rules[i];
          if (rule instanceof CSSStyleRule) {
            const css = rule.style.cssText;
            if (css && containsModernColor(css)) {
              rule.style.cssText = sanitizeCssColors(css);
            }
          }
        }
      } catch {
        // Ignore cross-origin stylesheet access restrictions
      }
    }
  } catch {
    // Ignore
  }

  // 3. Sanitize all elements: inline styles, computed color styles, and SVG attributes
  const allElements = clonedDoc.querySelectorAll('*');
  const win = clonedDoc.defaultView || (typeof window !== 'undefined' ? window : null);

  allElements.forEach((el) => {
    const htmlEl = el as HTMLElement;

    // Sanitize inline style.cssText
    if (htmlEl.style && htmlEl.style.cssText) {
      const css = htmlEl.style.cssText;
      if (containsModernColor(css)) {
        try {
          htmlEl.style.cssText = sanitizeCssColors(css);
        } catch (err) {
          console.warn("Failed to sanitize inline style:", err);
        }
      }
    }

    // Inspect and overwrite any computed modern color property
    if (win) {
      try {
        const comp = win.getComputedStyle(htmlEl);
        for (const prop of COLOR_STYLE_PROPS) {
          const val = comp.getPropertyValue(prop);
          if (val && containsModernColor(val)) {
            const sanitizedVal = sanitizeCssColors(val);
            htmlEl.style.setProperty(prop, sanitizedVal, 'important');
          }
        }
      } catch {
        // ignore
      }
    }

    // Sanitize SVG attributes
    const svgAttrs = ['fill', 'stroke', 'stop-color', 'flood-color', 'color'];
    for (const attr of svgAttrs) {
      const attrVal = el.getAttribute(attr);
      if (attrVal && containsModernColor(attrVal)) {
        el.setAttribute(attr, sanitizeCssColors(attrVal));
      }
    }
  });
}

/**
 * Convert any image URL (remote or local) to a Base64 data URL
 * to avoid canvas CORS / tainting issues during export
 */
export async function imageUrlToDataUrl(url: string): Promise<string> {
  if (!url) return '';
  if (url.startsWith('data:')) return url;
  
  try {
    const res = await fetch(url, { mode: 'cors' });
    if (res.ok) {
      const blob = await res.blob();
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve((reader.result as string) || url);
        reader.onerror = () => resolve(url);
        reader.readAsDataURL(blob);
      });
    }
  } catch (err) {
    // Ignore and attempt canvas fallback
  }

  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth || img.width || 100;
        canvas.height = img.naturalHeight || img.height || 100;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0);
          resolve(canvas.toDataURL('image/png'));
          return;
        }
      } catch {
        // Ignored
      }
      resolve(url);
    };
    img.onerror = () => resolve(url);
    img.src = url;
  });
}

/**
 * Safely trigger file download from blob or base64 data URL
 */
export function triggerFileDownload(dataUrlOrBlob: string | Blob, filename: string): boolean {
  try {
    const link = document.createElement('a');
    link.download = filename;
    if (typeof dataUrlOrBlob === 'string') {
      link.href = dataUrlOrBlob;
    } else {
      link.href = URL.createObjectURL(dataUrlOrBlob);
    }
    document.body.appendChild(link);
    link.click();
    setTimeout(() => {
      document.body.removeChild(link);
      if (typeof dataUrlOrBlob !== 'string') {
        URL.revokeObjectURL(link.href);
      }
    }, 200);
    return true;
  } catch (err) {
    console.error("triggerFileDownload failed:", err);
    return false;
  }
}


