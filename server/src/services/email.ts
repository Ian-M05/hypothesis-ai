import nodemailer from 'nodemailer';

const SMTP_HOST = process.env.SMTP_HOST;
const SMTP_PORT = parseInt(process.env.SMTP_PORT || '587');
const SMTP_USER = process.env.SMTP_USER;
const SMTP_PASS = process.env.SMTP_PASS;
const SMTP_FROM = process.env.SMTP_FROM || 'noreply@hypothesis.ai';
const APP_URL = process.env.CLIENT_URL || 'http://localhost:3000';

let transporter: nodemailer.Transporter | null = null;

// Initialize transporter if SMTP credentials are provided
if (SMTP_HOST && SMTP_USER && SMTP_PASS) {
  transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: SMTP_PORT === 465,
    auth: {
      user: SMTP_USER,
      pass: SMTP_PASS,
    },
  });
}

export function isEmailConfigured(): boolean {
  return transporter !== null;
}

export async function sendPasswordResetEmail(email: string, resetToken: string): Promise<void> {
  if (!transporter) {
    throw new Error('Email service not configured');
  }

  const resetUrl = `${APP_URL}/reset-password?token=${resetToken}`;

  await transporter.sendMail({
    from: SMTP_FROM,
    to: email,
    subject: 'Password Reset - Hypothesis.AI',
    html: `
      <h1>Password Reset Request</h1>
      <p>You requested a password reset for your Hypothesis.AI account.</p>
      <p>Click the link below to reset your password (valid for 1 hour):</p>
      <a href="${resetUrl}" style="padding: 12px 24px; background: #3b82f6; color: white; text-decoration: none; border-radius: 6px;">Reset Password</a>
      <p>Or copy this link: ${resetUrl}</p>
      <p>If you didn't request this, please ignore this email.</p>
      <hr>
      <p><small>Hypothesis.AI - Collaborative research platform</small></p>
    `,
    text: `
      Password Reset Request
      
      You requested a password reset for your Hypothesis.AI account.
      
      Visit this link to reset your password (valid for 1 hour):
      ${resetUrl}
      
      If you didn't request this, please ignore this email.
      
      Hypothesis.AI - Collaborative research platform
    `,
  });
}

export async function sendVerificationEmail(email: string, verificationToken: string): Promise<void> {
  if (!transporter) {
    throw new Error('Email service not configured');
  }

  const verifyUrl = `${APP_URL}/verify-email?token=${verificationToken}`;

  await transporter.sendMail({
    from: SMTP_FROM,
    to: email,
    subject: 'Verify Your Email - Hypothesis.AI',
    html: `
      <h1>Welcome to Hypothesis.AI!</h1>
      <p>Please verify your email address to complete your registration.</p>
      <p>Click the link below to verify your email (valid for 24 hours):</p>
      <a href="${verifyUrl}" style="padding: 12px 24px; background: #3b82f6; color: white; text-decoration: none; border-radius: 6px;">Verify Email</a>
      <p>Or copy this link: ${verifyUrl}</p>
      <hr>
      <p><small>Hypothesis.AI - Collaborative research platform</small></p>
    `,
    text: `
      Welcome to Hypothesis.AI!
      
      Please verify your email address to complete your registration.
      
      Visit this link to verify your email (valid for 24 hours):
      ${verifyUrl}
      
      Hypothesis.AI - Collaborative research platform
    `,
  });
}

export async function sendPasswordChangedConfirmation(email: string): Promise<void> {
  if (!transporter) {
    throw new Error('Email service not configured');
  }

  await transporter.sendMail({
    from: SMTP_FROM,
    to: email,
    subject: 'Password Changed - Hypothesis.AI',
    html: `
      <h1>Password Changed</h1>
      <p>Your Hypothesis.AI password has been successfully changed.</p>
      <p>If you didn't make this change, please contact support immediately.</p>
      <hr>
      <p><small>Hypothesis.AI - Collaborative research platform</small></p>
    `,
    text: `
      Password Changed
      
      Your Hypothesis.AI password has been successfully changed.
      
      If you didn't make this change, please contact support immediately.
      
      Hypothesis.AI - Collaborative research platform
    `,
  });
}
