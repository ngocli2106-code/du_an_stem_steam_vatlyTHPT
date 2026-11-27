import { destroySession, assertSameOrigin } from '@/lib/auth';
import { handle } from '@/lib/api';

export async function POST() {
  return handle(async () => {
    await assertSameOrigin();
    await destroySession();
    return { ok: true };
  });
}
