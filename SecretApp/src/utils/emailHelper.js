/**
 * Mask email address for secure UI display.
 * e.g., "testuser@gmail.com" -> "t***r@gmail.com"
 * e.g., "ab@domain.com" -> "a*@domain.com"
 */
export const maskEmail = (email) => {
    if (!email || typeof email !== 'string') return '';
    
    const parts = email.split('@');
    if (parts.length !== 2) return email;
    
    const [local, domain] = parts;
    
    let maskedLocal;
    if (local.length <= 2) {
        maskedLocal = local[0] + '*'.repeat(Math.max(0, local.length - 1));
    } else {
        maskedLocal = local[0] + '*'.repeat(local.length - 2) + local[local.length - 1];
    }
    
    return `${maskedLocal}@${domain}`;
};

export default maskEmail;
