// 최소한의 Cloudflare Workers 런타임 타입 선언.
// @cloudflare/workers-types 전체를 설치하지 않고 이 프로젝트에서 쓰는
// 표면만 선언한다.

declare module "cloudflare:workers" {
  export const env: {
    DB?: D1Database;
    [binding: string]: unknown;
  };
}

declare type Fetcher = {
  fetch: (request: Request) => Promise<Response>;
};

declare type D1Database = {
  prepare(query: string): unknown;
  batch(statements: unknown[]): Promise<unknown>;
  exec(query: string): Promise<unknown>;
};
