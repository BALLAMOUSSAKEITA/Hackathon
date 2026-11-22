import { NativeModules, Platform } from "react-native";

const API_PORT = 8001;

/**
 * Adresse de l'API.
 * 1. EXPO_PUBLIC_API_URL si elle est définie.
 * 2. Sur le web : même machine que la page, port API_PORT.
 * 3. Sur téléphone : même machine que le serveur Metro (Expo Go), port API_PORT.
 *    Sur l'émulateur Android, localhost devient 10.0.2.2.
 */
function resoudreApi(): string {
  const env = process.env.EXPO_PUBLIC_API_URL;
  if (env) {
    return env.replace(/\/$/, "");
  }
  if (Platform.OS === "web") {
    const hote = typeof window !== "undefined" && window.location?.hostname ? window.location.hostname : "localhost";
    return `http://${hote}:${API_PORT}`;
  }
  let hote = "localhost";
  try {
    const source = NativeModules.SourceCode as
      | { scriptURL?: string; getConstants?: () => { scriptURL?: string } }
      | undefined;
    const script = source?.getConstants?.().scriptURL ?? source?.scriptURL ?? "";
    const trouve = script.match(/^https?:\/\/([^/:]+)/);
    if (trouve) {
      hote = trouve[1];
    }
  } catch {
    // On garde localhost.
  }
  if (Platform.OS === "android" && (hote === "localhost" || hote === "127.0.0.1")) {
    hote = "10.0.2.2";
  }
  return `http://${hote}:${API_PORT}`;
}

export const API_URL = resoudreApi();

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

type Options = {
  method?: "GET" | "POST" | "PATCH";
  body?: unknown;
  timeoutMs?: number;
  signal?: AbortSignal;
};

/**
 * Appel JSON avec délai maximal. Lève ApiError (status 0 si le réseau ne répond pas).
 */
export async function api<T>(chemin: string, options: Options = {}): Promise<T> {
  const controleur = new AbortController();
  const minuterie = setTimeout(() => controleur.abort(), options.timeoutMs ?? 8000);
  const relais = () => controleur.abort();
  options.signal?.addEventListener("abort", relais);
  try {
    const reponse = await fetch(`${API_URL}${chemin}`, {
      method: options.method ?? (options.body !== undefined ? "POST" : "GET"),
      headers: options.body !== undefined ? { "Content-Type": "application/json" } : undefined,
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
      signal: controleur.signal,
    });
    if (!reponse.ok) {
      throw new ApiError(reponse.status, `HTTP ${reponse.status}`);
    }
    return (await reponse.json()) as T;
  } catch (erreur) {
    if (erreur instanceof ApiError) {
      throw erreur;
    }
    if (options.signal?.aborted) {
      throw erreur;
    }
    throw new ApiError(0, "réseau");
  } finally {
    clearTimeout(minuterie);
    options.signal?.removeEventListener("abort", relais);
  }
}

export function estAnnule(erreur: unknown): boolean {
  return erreur instanceof Error && erreur.name === "AbortError";
}
