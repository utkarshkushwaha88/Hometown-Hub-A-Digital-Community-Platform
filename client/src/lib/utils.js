import { clsx } from 'clsx'; import { twMerge } from 'tailwind-merge';
export function cn(...inputs){return twMerge(clsx(inputs));}
export function initials(name='Hometown User'){return name.split(' ').map(x=>x[0]).slice(0,2).join('').toUpperCase();}
