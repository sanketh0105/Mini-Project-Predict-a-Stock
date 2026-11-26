export interface SalesRow {
  Date: string;
  Product_ID: string;
  Units_Sold: string;
}

export interface InventoryResult {
  sku: string;
  avgDailyDemand: number;
  safetyStock: number;
  reorderPoint: number;
  currentStock: number;
  leadTime: number;
}

export interface BurnDownData {
  day: number;
  stock: number;
  safetyStock: number;
}
