export const URL_BASE_SITE = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://repasselivre.com").replace(/\/$/, "");

export function urlOportunidade(id: string): string {
  return `${URL_BASE_SITE}/oportunidade/${id}`;
}
