import { type PublicGame } from "../../game/types";

export async function request<T = PublicGame>(
  path: string,
  body?: unknown,
): Promise<T> {
  const res = await fetch(
    `/api${path}`,
    body === undefined
      ? undefined
      : {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        },
  );
  const data = await res.json();
  if (!res.ok)
    throw Object.assign(
      new Error(data.error ?? "Не удалось связаться с ареной."),
      { status: res.status, game: data.game },
    );
  return data;
}
