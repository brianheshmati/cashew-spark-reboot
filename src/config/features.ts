// export const FEATURES = {
//   paymentMethods: true,
// }
// src/config/features.ts

const ADMIN_EMAILS = [
  'brian.heshmat@gmail.com',
];

export const isAdminEmail = (email?: string | null) =>
  !!email && ADMIN_EMAILS.includes(email.toLowerCase());

export const FEATURES = {
  paymentMethods: (email?: string | null) =>
    isAdminEmail(email),

  impersonation: (email?: string | null) =>
    isAdminEmail(email),
  
  paymentMethodTypes: {
    payroll: true,
    card: true,
    ach: true,
  },
};