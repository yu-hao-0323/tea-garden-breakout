import {env} from 'cloudflare:workers';
export function rawDb(){if(!env.DB)throw new Error('Database unavailable');return env.DB;}
