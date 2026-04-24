export interface Client {
  id: string;
  name: string;
  phone: string;
  dni: string;
  address: string;
  notes: string;
  activeLoans: number;
  totalBalance: number;
  status: 'al_dia' | 'por_vencer' | 'en_mora' | 'pagado';
}

export interface Installment {
  number: number;
  dueDate: string;
  amount: number;
  status: 'pagada' | 'por_vencer' | 'pendiente' | 'vencida';
  paidDate?: string;
}

export interface Loan {
  id: string;
  clientId: string;
  clientName: string;
  amount: number;
  rate: number;
  rateType: 'fijo' | 'variable';
  frequency: 'semanal' | 'quincenal' | 'mensual';
  totalInstallments: number;
  startDate: string;
  promissoryNote: boolean;
  status: 'activo' | 'pagado';
  progress: number;
  totalToPay: number;
  installments: Installment[];
}

export interface Collector {
  id: string;
  name: string;
  email: string;
  status: 'activo' | 'inactivo';
}

export interface AuditEntry {
  id: string;
  dateTime: string;
  user: string;
  action: string;
  detail: string;
}

export interface RecentPayment {
  client: string;
  amount: number;
  date: string;
  registeredBy: string;
}

export const clients: Client[] = [
  { id: '1', name: 'Juan Pérez', phone: '+54 11 5555-0001', dni: '30.555.001', address: 'Av. Rivadavia 1234, CABA', notes: 'Cliente desde 2020. Muy cumplidor.', activeLoans: 1, totalBalance: 450000, status: 'al_dia' },
  { id: '2', name: 'María López', phone: '+54 11 5555-0002', dni: '30.555.002', address: 'Calle Corrientes 567, CABA', notes: 'Tiene dos préstamos activos.', activeLoans: 2, totalBalance: 320000, status: 'por_vencer' },
  { id: '3', name: 'Roberto Díaz', phone: '+54 11 5555-0003', dni: '30.555.003', address: 'Av. San Martín 890, CABA', notes: 'Pagar atención a fechas.', activeLoans: 1, totalBalance: 180000, status: 'en_mora' },
  { id: '4', name: 'Ana Gómez', phone: '+54 11 5555-0004', dni: '30.555.004', address: 'Calle Florida 321, CABA', notes: 'Préstamo cancelado.', activeLoans: 1, totalBalance: 0, status: 'pagado' },
  { id: '5', name: 'Luis Fernández', phone: '+54 11 5555-0005', dni: '30.555.005', address: 'Av. Belgrano 654, CABA', notes: '', activeLoans: 1, totalBalance: 560000, status: 'al_dia' },
  { id: '6', name: 'Carla Ruiz', phone: '+54 11 5555-0006', dni: '30.555.006', address: 'Calle Lavalle 789, CABA', notes: 'Recordar llamar antes del vencimiento.', activeLoans: 1, totalBalance: 95000, status: 'por_vencer' },
  { id: '7', name: 'Diego Martínez', phone: '+54 11 5555-0007', dni: '30.555.007', address: 'Av. Callao 456, CABA', notes: 'Dos préstamos, uno en mora.', activeLoans: 2, totalBalance: 720000, status: 'en_mora' },
  { id: '8', name: 'Sofía Torres', phone: '+54 11 5555-0008', dni: '30.555.008', address: 'Calle Tucumán 123, CABA', notes: '', activeLoans: 1, totalBalance: 200000, status: 'al_dia' },
];

export const loans: Loan[] = [
  {
    id: '001', clientId: '1', clientName: 'Juan Pérez', amount: 500000, rate: 10, rateType: 'fijo',
    frequency: 'semanal', totalInstallments: 10, startDate: '15/01/2025', promissoryNote: true,
    status: 'pagado', progress: 100, totalToPay: 550000,
    installments: Array.from({ length: 10 }, (_, i) => ({
      number: i + 1, dueDate: `${15 + i * 7 > 28 ? '0' + ((i * 7 + 15) % 28) : i * 7 + 15}/01/2025`,
      amount: 55000, status: 'pagada' as const, paidDate: `${15 + i * 7 > 28 ? '0' + ((i * 7 + 15) % 28) : i * 7 + 15}/01/2025`
    }))
  },
  {
    id: '002', clientId: '1', clientName: 'Juan Pérez', amount: 600000, rate: 10, rateType: 'fijo',
    frequency: 'semanal', totalInstallments: 12, startDate: '01/02/2026', promissoryNote: true,
    status: 'activo', progress: 65, totalToPay: 660000,
    installments: [
      { number: 1, dueDate: '01/02/2026', amount: 55000, status: 'pagada', paidDate: '01/02/2026' },
      { number: 2, dueDate: '08/02/2026', amount: 55000, status: 'pagada', paidDate: '07/02/2026' },
      { number: 3, dueDate: '15/02/2026', amount: 55000, status: 'pagada', paidDate: '15/02/2026' },
      { number: 4, dueDate: '22/02/2026', amount: 55000, status: 'pagada', paidDate: '22/02/2026' },
      { number: 5, dueDate: '01/03/2026', amount: 55000, status: 'pagada', paidDate: '28/02/2026' },
      { number: 6, dueDate: '08/03/2026', amount: 55000, status: 'pagada', paidDate: '08/03/2026' },
      { number: 7, dueDate: '15/03/2026', amount: 55000, status: 'pagada', paidDate: '16/03/2026' },
      { number: 8, dueDate: '22/03/2026', amount: 55000, status: 'por_vencer' },
      { number: 9, dueDate: '29/03/2026', amount: 55000, status: 'pendiente' },
      { number: 10, dueDate: '05/04/2026', amount: 55000, status: 'pendiente' },
      { number: 11, dueDate: '12/04/2026', amount: 55000, status: 'pendiente' },
      { number: 12, dueDate: '19/04/2026', amount: 55000, status: 'pendiente' },
    ]
  },
  {
    id: '003', clientId: '2', clientName: 'María López', amount: 400000, rate: 12, rateType: 'fijo',
    frequency: 'quincenal', totalInstallments: 8, startDate: '01/01/2026', promissoryNote: false,
    status: 'activo', progress: 50, totalToPay: 448000,
    installments: [
      { number: 1, dueDate: '01/01/2026', amount: 56000, status: 'pagada', paidDate: '01/01/2026' },
      { number: 2, dueDate: '15/01/2026', amount: 56000, status: 'pagada', paidDate: '15/01/2026' },
      { number: 3, dueDate: '01/02/2026', amount: 56000, status: 'pagada', paidDate: '02/02/2026' },
      { number: 4, dueDate: '15/02/2026', amount: 56000, status: 'pagada', paidDate: '15/02/2026' },
      { number: 5, dueDate: '01/03/2026', amount: 56000, status: 'por_vencer' },
      { number: 6, dueDate: '15/03/2026', amount: 56000, status: 'pendiente' },
      { number: 7, dueDate: '01/04/2026', amount: 56000, status: 'pendiente' },
      { number: 8, dueDate: '15/04/2026', amount: 56000, status: 'pendiente' },
    ]
  },
  {
    id: '004', clientId: '3', clientName: 'Roberto Díaz', amount: 300000, rate: 15, rateType: 'fijo',
    frequency: 'mensual', totalInstallments: 10, startDate: '01/11/2025', promissoryNote: true,
    status: 'activo', progress: 40, totalToPay: 345000,
    installments: [
      { number: 1, dueDate: '01/11/2025', amount: 34500, status: 'pagada', paidDate: '01/11/2025' },
      { number: 2, dueDate: '01/12/2025', amount: 34500, status: 'pagada', paidDate: '03/12/2025' },
      { number: 3, dueDate: '01/01/2026', amount: 34500, status: 'pagada', paidDate: '05/01/2026' },
      { number: 4, dueDate: '01/02/2026', amount: 34500, status: 'pagada', paidDate: '01/02/2026' },
      { number: 5, dueDate: '01/03/2026', amount: 34500, status: 'vencida' },
      { number: 6, dueDate: '01/04/2026', amount: 34500, status: 'pendiente' },
      { number: 7, dueDate: '01/05/2026', amount: 34500, status: 'pendiente' },
      { number: 8, dueDate: '01/06/2026', amount: 34500, status: 'pendiente' },
      { number: 9, dueDate: '01/07/2026', amount: 34500, status: 'pendiente' },
      { number: 10, dueDate: '01/08/2026', amount: 34500, status: 'pendiente' },
    ]
  },
];

export const collectors: Collector[] = [
  { id: '1', name: 'Carlos Rodríguez', email: 'carlos@prestapro.com', status: 'activo' },
  { id: '2', name: 'Laura Sánchez', email: 'laura@prestapro.com', status: 'inactivo' },
];

export const recentPayments: RecentPayment[] = [
  { client: 'Juan Pérez', amount: 50000, date: '05/04/2026', registeredBy: 'Admin' },
  { client: 'María López', amount: 35000, date: '05/04/2026', registeredBy: 'Carlos (cobrador)' },
  { client: 'Roberto Díaz', amount: 80000, date: '04/04/2026', registeredBy: 'Admin' },
  { client: 'Ana Gómez', amount: 25000, date: '04/04/2026', registeredBy: 'Carlos (cobrador)' },
  { client: 'Luis Fernández', amount: 60000, date: '03/04/2026', registeredBy: 'Admin' },
];

export const auditLog: AuditEntry[] = [
  { id: '1', dateTime: '05/04 14:32', user: 'Admin', action: 'Pago registrado', detail: 'Juan Pérez - Cuota 7 - $55.000' },
  { id: '2', dateTime: '05/04 11:15', user: 'Carlos', action: 'Pago registrado', detail: 'María López - Cuota 3 - $35.000' },
  { id: '3', dateTime: '04/04 16:45', user: 'Admin', action: 'Préstamo creado', detail: 'Roberto Díaz - $300.000 - 10 cuotas' },
  { id: '4', dateTime: '04/04 10:00', user: 'Admin', action: 'Cliente creado', detail: 'Sofía Torres' },
  { id: '5', dateTime: '03/04 09:30', user: 'Admin', action: 'Mora configurada', detail: 'Diego Martínez - 5% activada' },
  { id: '6', dateTime: '02/04 17:00', user: 'Admin', action: 'Refinanciamiento', detail: 'María López - Préstamo #003 → #005' },
];

export const collectorPendingPayments = [
  { clientName: 'Juan Pérez', installmentNum: 8, dueDate: '22/03/2026', amount: 55000, status: 'por_vencer' as const },
  { clientName: 'Roberto Díaz', installmentNum: 5, dueDate: '20/03/2026', amount: 30000, status: 'vencida' as const },
  { clientName: 'María López', installmentNum: 4, dueDate: '25/03/2026', amount: 35000, status: 'pendiente' as const },
];

export const formatCurrency = (n: number) => '$' + Number(n).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export const statusLabel = (s: string) => {
  switch (s) {
    case 'al_dia': return '🟢 Al día';
    case 'por_vencer': return '🟡 Por vencer';
    case 'en_mora': return '🔴 En mora';
    case 'pagado': return '✅ Pagado';
    case 'pagada': return '✅ Pagada';
    case 'pendiente': return '⏳ Pendiente';
    case 'vencida': return '🔴 Vencida';
    default: return s;
  }
};

export const statusColor = (s: string) => {
  switch (s) {
    case 'al_dia': case 'pagado': case 'pagada': return 'status-green';
    case 'por_vencer': return 'status-yellow';
    case 'en_mora': case 'vencida': return 'status-red';
    default: return 'text-muted-foreground';
  }
};

export const statusBgColor = (s: string) => {
  switch (s) {
    case 'pagada': return 'bg-status-green-soft';
    case 'por_vencer': return 'bg-status-yellow-soft';
    case 'vencida': case 'en_mora': return 'bg-status-red-soft';
    default: return '';
  }
};
