import nodemailer from "nodemailer";
import { googleCalendarUrl, yandexCalendarUrl } from "./calendar-links";

const port = parseInt(process.env.SMTP_PORT || "465");

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "smtp.yandex.ru",
  port,
  secure: port === 465,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

type EmailParams = {
  to: string;
  userName: string;
  expertName: string;
  programName: string;
  dateTime: Date;
  meetingLink: string;
};

function formatDateRu(dateTime: Date) {
  return dateTime.toLocaleDateString("ru-RU", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Europe/Moscow",
  });
}

function formatTimeRu(dateTime: Date) {
  return dateTime.toLocaleTimeString("ru-RU", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Moscow",
  });
}

function emailWrapper(content: string) {
  return `
    <div style="font-family: 'Montserrat', Arial, sans-serif; max-width: 560px; margin: 0 auto;">
      <div style="background: #123194; padding: 24px 32px; color: #fff;">
        <h1 style="margin: 0; font-size: 20px; font-weight: 700;">МФТИ Консультации</h1>
      </div>
      <div style="padding: 32px; background: #ffffff; border: 1px solid #e8ecf4;">
        ${content}
      </div>
      <div style="padding: 16px 32px; background: #f5f5f5; text-align: center;">
        <p style="color: #999; font-size: 12px; margin: 0;">МФТИ — Онлайн-магистратура «Разработка IT-продукта»</p>
      </div>
    </div>
  `;
}

function detailsTable(programName: string, expertName: string, dateStr: string, timeStr: string) {
  return `
    <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">
      <tr>
        <td style="padding: 10px 0; border-bottom: 1px solid #e8ecf4; color: #999; font-size: 13px;">Программа</td>
        <td style="padding: 10px 0; border-bottom: 1px solid #e8ecf4; font-weight: 600; color: #123194; text-align: right; font-size: 14px;">${programName}</td>
      </tr>
      <tr>
        <td style="padding: 10px 0; border-bottom: 1px solid #e8ecf4; color: #999; font-size: 13px;">Эксперт</td>
        <td style="padding: 10px 0; border-bottom: 1px solid #e8ecf4; font-weight: 600; color: #123194; text-align: right; font-size: 14px;">${expertName}</td>
      </tr>
      <tr>
        <td style="padding: 10px 0; border-bottom: 1px solid #e8ecf4; color: #999; font-size: 13px;">Дата</td>
        <td style="padding: 10px 0; border-bottom: 1px solid #e8ecf4; font-weight: 600; color: #123194; text-align: right; font-size: 14px;">${dateStr}</td>
      </tr>
      <tr>
        <td style="padding: 10px 0; color: #999; font-size: 13px;">Время</td>
        <td style="padding: 10px 0; font-weight: 600; color: #123194; text-align: right; font-size: 14px;">${timeStr} (МСК)</td>
      </tr>
    </table>
  `;
}

function btnStyle(bg: string) {
  return `display: inline-block; text-align: center; padding: 12px 24px; background: ${bg}; color: #fff; font-weight: 700; font-size: 14px; text-decoration: none; margin: 0 8px 8px 0;`;
}

// 1. Registration confirmation email
export async function sendBookingConfirmation(params: EmailParams) {
  const { to, userName, expertName, programName, dateTime, meetingLink } = params;
  const dateStr = formatDateRu(dateTime);
  const timeStr = formatTimeRu(dateTime);

  const calTitle = `Консультация: ${programName}`;
  const calDesc = `Эксперт: ${expertName}\nСсылка: ${meetingLink}`;

  const googleUrl = googleCalendarUrl({ title: calTitle, description: calDesc, start: dateTime });
  const yandexUrl = yandexCalendarUrl({ title: calTitle, description: calDesc, start: dateTime });

  const html = emailWrapper(`
    <h2 style="color: #123194; font-size: 22px; margin: 0 0 16px 0;">Вы записаны!</h2>
    <p style="color: #333; font-size: 15px; line-height: 1.6; margin: 0 0 8px 0;">
      Здравствуйте, ${userName}!
    </p>
    <p style="color: #555; font-size: 15px; line-height: 1.6; margin: 0 0 24px 0;">
      Вы успешно записались на консультацию.
    </p>
    ${detailsTable(programName, expertName, dateStr, timeStr)}
    <p style="color: #555; font-size: 14px; margin: 0 0 12px 0; font-weight: 600;">Добавить в календарь:</p>
    <div style="margin-bottom: 20px;">
      <a href="${googleUrl}" target="_blank" style="${btnStyle("#003092")}">Google Календарь</a>
      <a href="${yandexUrl}" target="_blank" style="${btnStyle("#E8375A")}">Яндекс Календарь</a>
    </div>
    <p style="color: #999; font-size: 12px; margin: 0;">
      Ссылка на встречу будет отправлена дополнительно перед началом консультации.
    </p>
  `);

  await transporter.sendMail({
    from: `"МФТИ Консультации" <${process.env.SMTP_USER}>`,
    to,
    subject: `Запись на консультацию: ${programName}`,
    html,
  });
}

// 2. Reminder email (before the meeting)
export async function sendReminder(params: EmailParams) {
  const { to, userName, expertName, programName, dateTime, meetingLink } = params;
  const dateStr = formatDateRu(dateTime);
  const timeStr = formatTimeRu(dateTime);

  const html = emailWrapper(`
    <h2 style="color: #123194; font-size: 22px; margin: 0 0 16px 0;">Напоминание о консультации</h2>
    <p style="color: #333; font-size: 15px; line-height: 1.6; margin: 0 0 8px 0;">
      Здравствуйте, ${userName}!
    </p>
    <p style="color: #555; font-size: 15px; line-height: 1.6; margin: 0 0 24px 0;">
      Скоро начнётся ваша консультация.
    </p>
    ${detailsTable(programName, expertName, dateStr, timeStr)}
    <a href="${meetingLink}" target="_blank" style="display: block; text-align: center; padding: 16px; background: #003092; color: #fff; font-weight: 700; font-size: 16px; text-decoration: none; margin-bottom: 12px;">
      Перейти на встречу
    </a>
    <p style="color: #999; font-size: 12px; text-align: center; margin: 0;">
      Ссылка: ${meetingLink}
    </p>
  `);

  await transporter.sendMail({
    from: `"МФТИ Консультации" <${process.env.SMTP_USER}>`,
    to,
    subject: `Напоминание: консультация "${programName}" скоро начнётся`,
    html,
  });
}
