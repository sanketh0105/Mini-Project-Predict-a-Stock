export interface CsvValidationResult {
  valid: boolean;
  error?: string;
  details?: string[];
  detectedColumns: string[];
  mappedColumns: {
    productId?: string;
    unitsSold?: string;
    date?: string;
    currentStock?: string;
    leadTime?: string;
  };
  validRowCount: number;
}

const SKU_ALIASES = [
  'productid',
  'sku',
  'skuid',
  'itemid',
  'itemcode',
  'productcode',
  'partnumber',
  'product',
  'item',
  'id',
];

const UNITS_ALIASES = [
  'unitssold',
  'units',
  'quantitysold',
  'quantity',
  'qty',
  'sold',
  'sales',
  'demand',
  'dailydemand',
  'avgdailydemand',
  'volume',
];

const DATE_ALIASES = [
  'date',
  'orderdate',
  'salesdate',
  'transactiondate',
  'day',
  'timestamp',
  'period',
];

const STOCK_ALIASES = [
  'currentstock',
  'stock',
  'onhand',
  'onhandstock',
  'inventory',
  'availablestock',
  'available',
];

const LEAD_TIME_ALIASES = ['leadtime', 'leadtimedays', 'lt'];

function normalizeHeader(header: string): string {
  return String(header)
    .replace(/^\uFEFF/, '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

function findMatchingHeader(headers: string[], aliases: string[]): string | undefined {
  for (const alias of aliases) {
    const match = headers.find((h) => normalizeHeader(h) === alias);
    if (match) return match;
  }
  return undefined;
}

function parseNumericValue(raw: unknown): number | null {
  if (typeof raw === 'number') {
    return Number.isFinite(raw) ? raw : null;
  }
  const str = String(raw ?? '').replace(/,/g, '').trim();
  if (!str) return null;
  if (!/^-?\d+(\.\d+)?$/.test(str)) return null;
  const num = Number(str);
  return Number.isFinite(num) ? num : null;
}

function isValidDateString(raw: unknown): boolean {
  const str = String(raw ?? '').trim();
  if (!str) return true;
  // Reject pure numbers that Date.parse might interpret unexpectedly (e.g., "123")
  if (/^\d+$/.test(str)) return false;
  if (/^\d{4}[-/]\d{1,2}[-/]\d{1,2}$/.test(str)) return true;
  if (/^\d{1,2}[-/]\d{1,2}[-/]\d{2,4}$/.test(str)) return true;
  const parsed = Date.parse(str);
  return !Number.isNaN(parsed);
}

/**
 * Validates parsed CSV headers and row data types prior to submitting inventory data.
 */
export function validateInventoryCsv(
  rows: Record<string, unknown>[],
  fields?: string[]
): CsvValidationResult {
  const rawHeaders =
    fields && fields.length > 0
      ? fields
      : rows.length > 0 && rows[0] && typeof rows[0] === 'object'
        ? Object.keys(rows[0])
        : [];

  const detectedColumns = rawHeaders
    .map((h) => String(h).replace(/^\uFEFF/, '').trim())
    .filter(Boolean);

  if (detectedColumns.length === 0) {
    return {
      valid: false,
      error:
        "No column headers were detected. Ensure the first row of your CSV defines headers such as 'Product_ID', 'Units_Sold', and 'Date'.",
      detectedColumns: [],
      mappedColumns: {},
      validRowCount: 0,
    };
  }

  const productIdCol = findMatchingHeader(detectedColumns, SKU_ALIASES);
  const unitsSoldCol = findMatchingHeader(detectedColumns, UNITS_ALIASES);
  const dateCol = findMatchingHeader(detectedColumns, DATE_ALIASES);
  const stockCol = findMatchingHeader(detectedColumns, STOCK_ALIASES);
  const leadTimeCol = findMatchingHeader(detectedColumns, LEAD_TIME_ALIASES);

  const mappedColumns = {
    productId: productIdCol,
    unitsSold: unitsSoldCol,
    date: dateCol,
    currentStock: stockCol,
    leadTime: leadTimeCol,
  };

  const missingMessages: string[] = [];
  if (!productIdCol) {
    missingMessages.push(
      "Missing required column 'Product_ID' (also accepts 'SKU' or 'Item_ID')."
    );
  }
  if (!unitsSoldCol) {
    missingMessages.push(
      "Missing required column 'Units_Sold' (also accepts 'Quantity', 'Qty', or 'Sales')."
    );
  }

  if (missingMessages.length > 0) {
    const missingNames = [
      !productIdCol ? "'Product_ID'" : null,
      !unitsSoldCol ? "'Units_Sold'" : null,
    ]
      .filter(Boolean)
      .join(' and ');

    return {
      valid: false,
      error: `Missing required ${missingNames.includes('and') ? 'columns' : 'column'} ${missingNames}.`,
      details: [
        ...missingMessages,
        `Detected columns in file: ${detectedColumns.join(', ')}`,
      ],
      detectedColumns,
      mappedColumns,
      validRowCount: 0,
    };
  }

  if (!Array.isArray(rows) || rows.length === 0) {
    return {
      valid: false,
      error:
        'The CSV file contains headers but no data rows. Add at least one sales record and try again.',
      detectedColumns,
      mappedColumns,
      validRowCount: 0,
    };
  }

  const rowIssues: string[] = [];
  let validRowCount = 0;

  rows.forEach((row, index) => {
    if (!row || typeof row !== 'object') return;
    const csvLine = index + 2; // +1 for 0-index, +1 for header row

    const rawSku = productIdCol ? row[productIdCol] : undefined;
    const rawUnits = unitsSoldCol ? row[unitsSoldCol] : undefined;
    const rawDate = dateCol ? row[dateCol] : undefined;
    const rawStock = stockCol ? row[stockCol] : undefined;
    const rawLeadTime = leadTimeCol ? row[leadTimeCol] : undefined;

    const skuStr = String(rawSku ?? '').trim();
    const unitsStr = String(rawUnits ?? '').trim();

    // Skip completely empty rows
    const allBlank = Object.values(row).every(
      (val) => val === undefined || val === null || String(val).trim() === ''
    );
    if (allBlank) return;

    let rowHasError = false;

    if (!skuStr) {
      rowIssues.push(`Row ${csvLine}: '${productIdCol}' cannot be empty.`);
      rowHasError = true;
    }

    if (!unitsStr) {
      rowIssues.push(`Row ${csvLine}: '${unitsSoldCol}' is missing a numeric value.`);
      rowHasError = true;
    } else {
      const parsedUnits = parseNumericValue(rawUnits);
      if (parsedUnits === null || parsedUnits < 0) {
        rowIssues.push(
          `Row ${csvLine}: '${unitsSoldCol}' must be a non-negative number (received "${unitsStr}").`
        );
        rowHasError = true;
      }
    }

    if (dateCol && rawDate !== undefined && String(rawDate).trim() !== '') {
      if (!isValidDateString(rawDate)) {
        rowIssues.push(
          `Row ${csvLine}: '${dateCol}' has an invalid date value ("${String(rawDate).trim()}").`
        );
        rowHasError = true;
      }
    }

    if (stockCol && rawStock !== undefined && String(rawStock).trim() !== '') {
      const parsedStock = parseNumericValue(rawStock);
      if (parsedStock === null || parsedStock < 0) {
        rowIssues.push(
          `Row ${csvLine}: '${stockCol}' must be a non-negative number (received "${String(rawStock).trim()}").`
        );
        rowHasError = true;
      }
    }

    if (leadTimeCol && rawLeadTime !== undefined && String(rawLeadTime).trim() !== '') {
      const parsedLt = parseNumericValue(rawLeadTime);
      if (parsedLt === null || parsedLt < 0) {
        rowIssues.push(
          `Row ${csvLine}: '${leadTimeCol}' must be a non-negative number (received "${String(rawLeadTime).trim()}").`
        );
        rowHasError = true;
      }
    }

    if (!rowHasError) {
      validRowCount += 1;
    }
  });

  if (rowIssues.length > 0) {
    const maxDisplayed = 5;
    const truncatedDetails = rowIssues.slice(0, maxDisplayed);
    if (rowIssues.length > maxDisplayed) {
      truncatedDetails.push(
        `...and ${rowIssues.length - maxDisplayed} more row validation issue(s).`
      );
    }

    return {
      valid: false,
      error: `Found ${rowIssues.length} data validation ${rowIssues.length === 1 ? 'issue' : 'issues'} in the CSV file.`,
      details: truncatedDetails,
      detectedColumns,
      mappedColumns,
      validRowCount,
    };
  }

  if (validRowCount === 0) {
    return {
      valid: false,
      error: 'No valid non-empty data rows were found in the CSV file.',
      detectedColumns,
      mappedColumns,
      validRowCount: 0,
    };
  }

  return {
    valid: true,
    detectedColumns,
    mappedColumns,
    validRowCount,
  };
}
