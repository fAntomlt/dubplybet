// client/lib/subroles.js
import {
  FiUser, FiFlag, FiBookOpen, FiTrendingUp, FiZap, FiActivity,
  FiTarget, FiCrosshair, FiMap, FiBarChart2, FiCompass, FiAward,
  FiBriefcase, FiShield, FiAnchor, FiStar, FiCheckCircle, FiTool, FiBookmark
} from "react-icons/fi";
import { FaTrophy } from "react-icons/fa";

export const SUBROLES = [
  { key: "naujokas",        name: "Naujokas",        min: 0,   Icon: FiUser,       fg:"#0f172a", bg:"#e2e8f0" },
  { key: "debiutantas",     name: "Debiutantas",     min: 3,   Icon: FiFlag,       fg:"#1d4ed8", bg:"#e0e7ff" },
  { key: "mokinys",         name: "Mokinys",         min: 7,   Icon: FiBookOpen,   fg:"#0ea5e9", bg:"#e0f2fe" },
  { key: "pradedantysis",   name: "Pradedantysis",   min: 12,  Icon: FiTrendingUp, fg:"#059669", bg:"#d1fae5" },
  { key: "entuziastas",     name: "Entuziastas",     min: 18,  Icon: FiZap,        fg:"#a16207", bg:"#fef3c7" },
  { key: "aktyvus",         name: "Aktyvus narys",   min: 25,  Icon: FiActivity,   fg:"#7c3aed", bg:"#ede9fe" },
  { key: "spejikas",        name: "Spėjikas",        min: 35,  Icon: FiTarget,     fg:"#2563eb", bg:"#dbeafe" },
  { key: "taiklus",         name: "Taiklus spėjikas",min: 50,  Icon: FiCrosshair,  fg:"#0ea5e9", bg:"#e0f2fe" },
  { key: "strategas",       name: "Strategas",       min: 70,  Icon: FiMap,        fg:"#16a34a", bg:"#dcfce7" },
  { key: "analitikas",      name: "Analitikas",      min: 90,  Icon: FiBarChart2,  fg:"#1e293b", bg:"#e2e8f0" },
  { key: "taktikas",        name: "Taktikas",        min: 115, Icon: FiCompass,    fg:"#334155", bg:"#e2e8f0" },
  { key: "zinovas",         name: "Žinovas",         min: 140, Icon: FiAward,      fg:"#a16207", bg:"#fef3c7" },
  { key: "patyres",         name: "Patyręs",         min: 170, Icon: FiBriefcase,  fg:"#0f766e", bg:"#ccfbf1" },
  { key: "veteranas",       name: "Veteranas",       min: 200, Icon: FiShield,     fg:"#6b21a8", bg:"#f3e8ff" },
  { key: "uzkietejes",      name: "Užkietėjęs",      min: 230, Icon: FiAnchor,     fg:"#9a3412", bg:"#ffedd5" },
  { key: "grandas",         name: "Grandas",         min: 260, Icon: FiStar,       fg:"#b45309", bg:"#fef3c7" },
  { key: "ekspertas",       name: "Ekspertas",       min: 280, Icon: FiCheckCircle,fg:"#166534", bg:"#dcfce7" },
  { key: "profesionalas",   name: "Profesionalas",   min: 290, Icon: FiTool,       fg:"#1f2937", bg:"#e5e7eb" },
  { key: "legenda",         name: "Legenda",         min: 295, Icon: FiBookmark,   fg:"#7c2d12", bg:"#ffedd5" },
  { key: "meistras",        name: "Meistras",        min: 300, Icon: FaTrophy,     fg:"#7c2d12", bg:"#fde68a" },
];

export function subroleFor(correct = 0) {
  const sorted = [...SUBROLES].sort((a, b) => a.min - b.min);
  let cur = sorted[0];
  for (const s of sorted) if (correct >= s.min) cur = s; else break;
  return cur;
}