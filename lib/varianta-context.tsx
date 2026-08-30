"use client";

import { createContext, useContext } from "react";
import { getVarianta, type Varianta } from "./variants";

// Varianta proiectului selectată de utilizator, disponibilă în toate
// componentele calculatorului (Wizard, Calculator și pașii lor) fără
// prop-drilling. Implicit: ultimul text oficial (lib/variants.ts).
const VariantaContext = createContext<Varianta>(getVarianta());

export const VariantaProvider = VariantaContext.Provider;

export function useVarianta(): Varianta {
  return useContext(VariantaContext);
}
