import { and, asc, desc, eq } from "drizzle-orm";
import { getDb } from "../../../db";
import { rankings } from "../../../db/schema";

const VALID_CATEGORIES = new Set(["cha1", "cha2"]);
const MAX_NAME_LENGTH = 12;
const RANKING_LIMIT = 20;

function toRouteErrorMessage(error: unknown) {
  const message = error instanceof Error ? error.message : "Unexpected error";
  const detail =
    error instanceof Error && error.cause instanceof Error ? error.cause.message : "";
  const combined = `${message}\n${detail}`;

  if (combined.includes("no such table") || combined.includes('from "rankings"')) {
    return "랭킹 테이블이 아직 준비되지 않았습니다. 배포 후 마이그레이션이 적용되면 사용할 수 있습니다.";
  }

  return message;
}

export async function GET(request: Request) {
  try {
    const category = new URL(request.url).searchParams.get("category") ?? "";
    if (!VALID_CATEGORIES.has(category)) {
      return Response.json({ error: "category가 올바르지 않습니다." }, { status: 400 });
    }

    const db = await getDb();
    const rows = await db
      .select()
      .from(rankings)
      .where(eq(rankings.category, category))
      .orderBy(desc(rankings.percent), desc(rankings.total), asc(rankings.createdAt))
      .limit(RANKING_LIMIT);

    return Response.json({ rankings: rows });
  } catch (error) {
    return Response.json({ error: toRouteErrorMessage(error) }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as {
      name?: string;
      category?: string;
      correct?: number;
      total?: number;
    };

    const name = payload.name?.trim() ?? "";
    const category = payload.category ?? "";
    const correct = payload.correct;
    const total = payload.total;

    if (!name || name.length > MAX_NAME_LENGTH) {
      return Response.json(
        { error: `이름은 1~${MAX_NAME_LENGTH}자로 입력해 주세요.` },
        { status: 400 },
      );
    }
    if (!VALID_CATEGORIES.has(category)) {
      return Response.json({ error: "category가 올바르지 않습니다." }, { status: 400 });
    }
    if (
      typeof correct !== "number" ||
      typeof total !== "number" ||
      !Number.isInteger(correct) ||
      !Number.isInteger(total) ||
      total <= 0 ||
      total > 1000 ||
      correct < 0 ||
      correct > total
    ) {
      return Response.json({ error: "점수 정보가 올바르지 않습니다." }, { status: 400 });
    }

    const percent = Math.round((correct / total) * 100);
    const db = await getDb();
    const [entry] = await db
      .insert(rankings)
      .values({ name, category, correct, total, percent })
      .returning();

    const rows = await db
      .select()
      .from(rankings)
      .where(and(eq(rankings.category, category)))
      .orderBy(desc(rankings.percent), desc(rankings.total), asc(rankings.createdAt))
      .limit(RANKING_LIMIT);

    return Response.json({ entry, rankings: rows }, { status: 201 });
  } catch (error) {
    return Response.json({ error: toRouteErrorMessage(error) }, { status: 500 });
  }
}
