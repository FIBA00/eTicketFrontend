let baseUrl = "";
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
	return baseUrl
}

export async function getAuthToken (): Promise<string | null>
{
	return authTokenGetter ? authTokenGetter() : null
}