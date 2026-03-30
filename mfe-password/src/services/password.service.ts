const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";
const CLIENT_ID = process.env.NEXT_PUBLIC_CLIENT_ID ?? "mfe-password-client";
const CLIENT_SECRET =
  process.env.NEXT_PUBLIC_CLIENT_SECRET ?? "mfe-password-secret";

// Cache do token em memória para não pedir um novo a cada validação
// Em produção, você pode usar localStorage com controle de expiração
let cachedToken: string | null = null;

async function getAccessToken(): Promise<string> {
  // Se já temos um token em cache, reutilizamos
  // (em produção: verificar se o token não expirou com jwt-decode)
  if (cachedToken) return cachedToken;

  const response = await fetch(`${API_URL}/auth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
    }),
  });

  if (!response.ok) {
    throw new Error("Failed to obtain access token");
  }

  const data = await response.json();
  cachedToken = data.access_token;
  return cachedToken as string;
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

export async function validatePassword(
  password: string,
): Promise<ValidationResult> {
  const token = await getAccessToken();

  const response = await fetch(`${API_URL}/password/validate`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      // O token JWT vai no header Authorization como "Bearer <token>"
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ password }),
  });

  // Se o token expirou (401), limpa o cache e tenta uma vez mais
  if (response.status === 401) {
    cachedToken = null;
    return validatePassword(password);
  }

  return response.json();
}
