import { NextResponse } from "next/server";
import { verifyDashboardPassword } from "@/lib/auth/dashboardSession";
import { checkLock, recordFail, recordSuccess, getClientIp } from "@/lib/auth/loginLimiter";

// POST /api/second-brain/monitor/verify — re-check the dashboard password
// before unlocking the Live or Not page. Session auth is enforced by the
// dashboard guard (all /api/* routes require the dashboard JWT), so this
// only ever runs for an already logged-in user. Failed attempts share the
// login lockout (5 fails → 30s, then 2m / 10m / 30m).
export async function POST(request) {
  try {
    const ip = getClientIp(request);
    const lock = checkLock(ip);
    if (lock.locked) {
      return NextResponse.json(
        { error: `Terlalu banyak percobaan salah. Coba lagi dalam ${lock.retryAfter} detik.`, retryAfter: lock.retryAfter },
        { status: 429, headers: { "Retry-After": String(lock.retryAfter) } }
      );
    }

    const { password } = await request.json().catch(() => ({}));
    if (await verifyDashboardPassword(password)) {
      recordSuccess(ip);
      return NextResponse.json({ ok: true });
    }

    const { remainingBeforeLock } = recordFail(ip);
    const postLock = checkLock(ip);
    if (postLock.locked) {
      return NextResponse.json(
        { error: `Terlalu banyak percobaan salah. Coba lagi dalam ${postLock.retryAfter} detik.`, retryAfter: postLock.retryAfter },
        { status: 429, headers: { "Retry-After": String(postLock.retryAfter) } }
      );
    }
    return NextResponse.json(
      { error: `Password salah. ${remainingBeforeLock} percobaan tersisa sebelum terkunci.`, remainingBeforeLock },
      { status: 401 }
    );
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
