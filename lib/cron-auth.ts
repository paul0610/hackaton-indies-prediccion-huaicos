// Autorización de los endpoints /api/cron/*.
// En producción exige el CRON_SECRET (Vercel Cron lo envía como Bearer).
// En desarrollo permite el acceso para poder probar en local.

export function authorizeCron(req: Request): boolean {
  if (process.env.NODE_ENV !== "production") return true;
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  return req.headers.get("authorization") === `Bearer ${secret}`;
}
