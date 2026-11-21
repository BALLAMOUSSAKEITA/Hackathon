import data from "../../fixtures/sprint-01.json";

import type { Fixture } from "./types";

export const fixture = data as Fixture;

export const API_URL = process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:8000";
