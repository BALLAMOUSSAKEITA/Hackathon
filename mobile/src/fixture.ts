import data from "../../fixtures/sprint-01.json";
import profilsDemo from "../../fixtures/sprint-02.json";

import type { Fixture } from "./types";
import type { Role } from "./session";
import type { Localized } from "./types";

export const fixture = data as Fixture;

export type ProfilDemo = {
  id: string;
  nom: string;
  telephone: string;
  role: Role;
  libelle: Localized;
};

export const sprint02 = profilsDemo as {
  code_sms: string;
  profils: ProfilDemo[];
};

export const API_URL = process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:8000";
