/**
 * Layout HTML AsuncIA pour tous les emails envoyés par l'app.
 */

const BRAND = {
  name: "AsuncIA",
  tagline: "CRM intelligent piloté par IA",
  bg: "#0a0a0f",
  surface: "#12121a",
  border: "#00fff5",
  borderMuted: "rgba(0, 255, 245, 0.3)",
  accent: "#00fff5",
  text: "#f0f0f5",
  textMuted: "#8888a0",
};

export function wrapAsuncIAHtml(content: string, title?: string): string {
  const titleBlock = title
    ? `<h1 style="margin:0 0 16px 0;font-size:20px;font-weight:700;color:${BRAND.text};font-family:sans-serif;">${escapeHtml(title)}</h1>`
    : "";
  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${escapeHtml(title || BRAND.name)}</title>
</head>
<body style="margin:0;padding:0;background-color:#1a1a26;font-family:sans-serif;font-size:15px;line-height:1.5;color:${BRAND.text};">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:${BRAND.bg};min-height:100vh;">
    <tr>
      <td align="center" style="padding:32px 16px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background-color:${BRAND.surface};border:1px solid ${BRAND.borderMuted};border-radius:12px;overflow:hidden;">
          <tr>
            <td style="padding:24px 24px 16px 24px;border-bottom:1px solid ${BRAND.borderMuted};">
              <p style="margin:0;font-size:22px;font-weight:700;color:${BRAND.accent};letter-spacing:-0.02em;">${BRAND.name}</p>
              <p style="margin:4px 0 0 0;font-size:12px;color:${BRAND.textMuted};">${BRAND.tagline}</p>
            </td>
          </tr>
          <tr>
            <td style="padding:24px;">
              ${titleBlock}
              <div style="color:${BRAND.text};">
                ${content}
              </div>
            </td>
          </tr>
          <tr>
            <td style="padding:16px 24px;border-top:1px solid ${BRAND.borderMuted};">
              <p style="margin:0;font-size:11px;color:${BRAND.textMuted};">Cet email a été envoyé par ${BRAND.name}.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function textToHtml(text: string): string {
  return text
    .split(/\n\n+/)
    .map((p) => `<p style="margin:0 0 12px 0;">${escapeHtml(p).replace(/\n/g, "<br>")}</p>`)
    .join("");
}
