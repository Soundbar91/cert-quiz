import { drizzle } from "drizzle-orm/d1";
import * as schema from "./schema";

// `cloudflare:workers`를 정적으로 import하면 워커 번들 최상위에 포함되어
// Node 기반 테스트가 dist를 로드할 수 없다. DB를 실제로 쓰는 시점에만
// 동적으로 불러온다.
export async function getDb() {
  let env: { DB?: D1Database };
  try {
    ({ env } = await import("cloudflare:workers"));
  } catch {
    // Node 프리뷰(vinext start)처럼 Cloudflare 런타임이 아닌 환경.
    throw new Error(
      "이 환경에서는 데이터베이스를 사용할 수 없습니다. Cloudflare 런타임(dev/배포)에서 랭킹 기능이 활성화됩니다."
    );
  }

  if (!env.DB) {
    throw new Error(
      "Cloudflare D1 binding `DB` is unavailable. Set the `d1` field in .openai/hosting.json to `DB` or let your control plane inject the real binding values before using the database."
    );
  }

  return drizzle(env.DB, { schema });
}
