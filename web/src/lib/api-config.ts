let baseUrl = "";
export const API_BASE = import.meta.env.VITE_API_URL ?? "http://localhost:8000/api/v1";

let authTokenGetter: ( () => Promise<string | null> ) | null = null;

export function setBaseUrl ( url: string | null ): void
{
	baseUrl = url ?? ""
}

export function setAuthTokenGetter ( getter: ( () => Promise<string | null>) | null ): void
{
	authTokenGetter = getter
}

export function getBaseUrl (): string
{
	return baseUrl ?? API_BASE
}

export async function getAuthToken (): Promise<string | null>
{
	return authTokenGetter ? authTokenGetter() : null
}