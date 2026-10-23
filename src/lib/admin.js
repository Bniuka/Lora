// Admin / Founder access configuration for Lora
export const DEFAULT_ADMIN_EMAILS = [
  'binukadin2009@gmail.com',
];

export function isUserAdmin(email) {
  if (!email) return false;
  const normalized = email.trim().toLowerCase();
  
  // Check default admin emails
  if (DEFAULT_ADMIN_EMAILS.some(admin => admin.toLowerCase() === normalized)) {
    return true;
  }
  
  // Check env variable if set
  const envAdmins = import.meta.env.VITE_ADMIN_EMAILS;
  if (envAdmins) {
    const list = envAdmins.split(',').map(e => e.trim().toLowerCase());
    if (list.includes(normalized)) return true;
  }
  
  return false;
}
