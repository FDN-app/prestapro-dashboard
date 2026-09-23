import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDateDisplay(dateStr: string | null | undefined, short = false): string {
  if (!dateStr) return '';
  const cleanDateStr = dateStr.includes('T') ? dateStr.split('T')[0] : dateStr;
  const parts = cleanDateStr.split('-');
  if (parts.length !== 3) return dateStr;
  const [year, month, day] = parts;
  if (short) {
    return `${day}/${month}`;
  }
  return `${Number(day)}/${Number(month)}/${year}`;
}

export function parseDateLocal(dateStr: string): Date {
  const [y, m, d] = dateStr.split('-');
  return new Date(Number(y), Number(m) - 1, Number(d));
}

export function formatDateLocal(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export type Frecuencia = 'diario' | 'semanal' | 'quincenal' | 'mensual' | 'personalizado';

export function addLoanInterval(baseDate: Date, freq: Frecuencia, count: number, customDays?: number): Date {
  const d = new Date(baseDate.getTime());
  if (freq === 'diario') d.setDate(d.getDate() + count);
  else if (freq === 'semanal') d.setDate(d.getDate() + count * 7);
  else if (freq === 'quincenal') d.setDate(d.getDate() + count * 15);
  else if (freq === 'mensual') d.setMonth(d.getMonth() + count);
  else if (freq === 'personalizado') d.setDate(d.getDate() + count * (customDays || 1));
  return d;
}

export function generarCronogramaCuotas(params: {
  monto: number;
  tasa: number;
  cuotas: number;
  frecuencia: Frecuencia;
  customDays?: number;
  fechaInicio: Date;
}) {
  const total = params.monto * (1 + params.tasa / 100);
  const perInstallment = params.cuotas > 0 ? Math.round(total / params.cuotas) : 0;
  return Array.from({ length: params.cuotas }, (_, i) => {
    const d = addLoanInterval(params.fechaInicio, params.frecuencia, i + 1, params.customDays);
    return { num: i + 1, monto: perInstallment, fecha_vto: formatDateLocal(d) };
  });
}
