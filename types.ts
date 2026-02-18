
export enum PrintStatus {
  PENDING = 'PENDING',
  PRINTING = 'PRINTING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED'
}

export interface Product {
  id: string;
  name: string;
  description: string;
  imageUrl: string;
  estimatedTime: number; // em minutos
  material: string;
  price: number;
}

export interface Printer {
  id: string;
  name: string;
  status: 'Idle' | 'Printing';
  currentJobId?: string;
}

export interface QueueItem {
  id: string;
  productId: string;
  productName: string;
  productImage: string;
  status: PrintStatus;
  createdAt: number;
  startedAt?: number;
  printerId?: string;
  printerName?: string;
  estimatedDuration: number;
  completedAt?: number;
  failedAt?: number;
  priority: 'Low' | 'Medium' | 'High';
}

export interface AppState {
  products: Product[];
  queue: QueueItem[];
  printers: Printer[];
}
