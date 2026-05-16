import { useState } from "react";
import { format } from "date-fns";

export type TransactionType = "INCOME" | "EXPENSE";

export interface Transaction {
  date: string;
  month: string;
  quarter: string;
  category: string;
  accountType: string;
  description: string;
  debit: number;
  kredit: number;
  timestamp: string;
}

export interface SheetData {
  spreadsheetId: string;
  transactions: Transaction[];
}

export const CATEGORIES_LIST = ["JASA", "OPERASIONAL", "KANTOR MATERIAL", "KAS"];

export const ACCOUNT_TYPES = [
  "PENDAPATAN LAIN", 
  "JASA DESIGN", 
  "KONTRAKTOR", 
  "SEWA", 
  "BEBAN PERLENGKAPAN (WIFI/TOKEN/DLL)", 
  "GAJI", 
  "LEMBUR", 
  "IKLAN", 
  "MOBILITAS", 
  "KONSUMSI", 
  "SEDEKAH & ZAKAT", 
  "ASSET MARKETING", 
  "JASA DRAFTER", 
  "MODAL DISETOR", 
  "LABA DITAHAN"
];

export const MONTHS = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];

export const QUARTERS_LIST = ["Q1", "Q2", "Q3", "Q4"];

export function getQuarter(dateStr: string): string {
  const date = new Date(dateStr);
  const month = date.getMonth() + 1;
  if (month <= 3) return "Q1";
  if (month <= 6) return "Q2";
  if (month <= 9) return "Q3";
  return "Q4";
}

export function getMonthName(dateStr: string): string {
  const date = new Date(dateStr);
  return MONTHS[date.getMonth()];
}
