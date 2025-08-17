// src/lib/flags.js
import React from "react";
import ReactCountryFlag from "react-country-flag";

/** Lithuanian country names -> ISO 3166-1 alpha-2 codes */
export const TEAM_TO_ISO = {
  "Belgija": "BE",
  "Bosnija ir Hercegovina": "BA",
  "Kipras": "CY",
  "Čekija": "CZ",
  "Estija": "EE",
  "Suomija": "FI",
  "Prancūzija": "FR",
  "Sakartvelas": "GE",
  "Vokietija": "DE",
  "Didžioji Britanija": "GB",
  "Graikija": "GR",
  "Islandija": "IS",
  "Izraelis": "IL",
  "Italija": "IT",
  "Latvija": "LV",
  "Lietuva": "LT",
  "Juodkalnija": "ME",
  "Lenkija": "PL",
  "Portugalija": "PT",
  "Serbija": "RS",
  "Slovėnija": "SI",
  "Ispanija": "ES",
  "Švedija": "SE",
  "Turkija": "TR",
};

export function codeForTeam(name) {
  return TEAM_TO_ISO[String(name || "").trim()] || null;
}

/** Returns a React element (SVG flag from react-country-flag or a 🏀 fallback) */
export function flagForTeam(name, size = 18) {
  const code = codeForTeam(name);
  if (code) {
    return React.createElement(ReactCountryFlag, {
      svg: true,
      countryCode: code,
      title: name,
      style: {
        width: size,
        height: size,
        display: "inline-block",
        borderRadius: 3,
        lineHeight: 1,
      },
    });
  }
  return React.createElement(
    "span",
    { role: "img", "aria-label": name || "team", style: { fontSize: size } },
    "🏀"
  );
}

/** Labels & helpers kept as you had them */
export function stageLabel(stage) {
  return stage === "playoff" ? "Atkrintamųjų Etapas" : "Grupių Etapas";
}

export function bandFromDiff(d) {
  return d > 5 ? "> 5" : d === 5 ? "= 5" : "< 5";
}