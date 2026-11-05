import nodemailer from 'nodemailer';
import { config } from '../config.js';
import { prisma } from '../db.js';

const transport = config.smtp.host
  ? nodemailer.createTransport({
      host: config.smtp.host,
      port: config.smtp.port,
      secure: config.smtp.port === 465,
      auth: config.smtp.user ? { user: config.smtp.user, pass: config.smtp.pass } : undefined,
    })
  : null;

const escape = (s) =>
  String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

/** Large-type, single-button email layout that is easy to read for older users. */
function renderHtml({ heading, text, link, linkLabel }) {
  const paragraphs = text
    .split('\n\n')
    .map((p) => `<p style="font-size:19px;line-height:1.6;margin:0 0 18px">${escape(p).replace(/\n/g, '<br>')}</p>`)
    .join('');
  const button = link
    ? `<p style="margin:28px 0"><a href="${escape(link)}" style="background:#1d4ed8;color:#fff;font-size:20px;font-weight:bold;padding:16px 28px;border-radius:10px;text-decoration:none;display:inline-block">${escape(linkLabel || 'Open')}</a></p>
       <p style="font-size:15px;color:#475569">If the button does not work, copy this address into your browser:<br>${escape(link)}</p>`
    : '';
  return `<div style="font-family:Arial,Helvetica,sans-serif;color:#0f172a;max-width:600px;margin:auto;padding:24px">
    <h1 style="font-size:26px;margin:0 0 20px">${escape(heading)}</h1>${paragraphs}${button}
    <hr style="border:none;border-top:1px solid #e2e8f0;margin:28px 0">
    <p style="font-size:14px;color:#64748b">Digital Legacy Manager — this is an automatic message.</p></div>`;
}

/**
 * Send an email. Every message is also saved in EmailLog so it can be shown in
 * the development mailbox when no SMTP server is configured.
 */
export async function sendMail({ to, subject, heading, text, link, linkLabel }) {
  const fullText = link ? `${text}\n\n${linkLabel || 'Open'}: ${link}` : text;
  let delivered = false;
  if (transport) {
    try {
      await transport.sendMail({
        from: config.smtp.from,
        to,
        subject,
        text: fullText,
        html: renderHtml({ heading: heading || subject, text, link, linkLabel }),
      });
      delivered = true;
    } catch (err) {
      console.error(`[mail] could not deliver "${subject}" to ${to}:`, err.message);
    }
  } else if (!config.isTest) {
    console.log(`[mail] (dev mailbox) to=${to} subject="${subject}"${link ? ` link=${link}` : ''}`);
  }
  await prisma.emailLog.create({ data: { to, subject, text: fullText, link: link || null, delivered } });
}

export const appLink = (path) => `${config.clientUrl.replace(/\/$/, '')}${path}`;
