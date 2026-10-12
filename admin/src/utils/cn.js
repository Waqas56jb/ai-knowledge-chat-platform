/** Join class names, skipping falsy values: cn('a', cond && 'b'). */
export const cn = (...xs) => xs.flat().filter(Boolean).join(' ');
