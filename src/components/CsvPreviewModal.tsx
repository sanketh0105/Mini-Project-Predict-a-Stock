import React from 'react';
import { X, FileSpreadsheet, CheckCircle2, AlertCircle, Upload, Table } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { CsvValidationResult } from '../utils/csvValidator';

interface CsvPreviewModalProps {
  isOpen: boolean;
  fileName: string;
  headers: string[];
  rows: Record<string, unknown>[];
  validation: CsvValidationResult | null;
  isProcessing: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export const CsvPreviewModal: React.FC<CsvPreviewModalProps> = ({
  isOpen,
  fileName,
  headers,
  rows,
  validation,
  isProcessing,
  onConfirm,
  onCancel,
}) => {
  if (!isOpen) return null;

  const previewRows = rows.slice(0, 5);
  const displayHeaders =
    headers.length > 0
      ? headers
      : previewRows[0]
        ? Object.keys(previewRows[0])
        : [];
  const isValid = Boolean(validation?.valid);

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={isProcessing ? undefined : onCancel}
          className="absolute inset-0 bg-app-bg/80 backdrop-blur-md"
        />

        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative w-full max-w-4xl bg-app-card rounded-3xl shadow-2xl overflow-hidden border border-app-border flex flex-col max-h-[90vh]"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 md:p-8 border-b border-app-border bg-app-subtle-bg/30 shrink-0">
            <div className="flex items-center gap-4 min-w-0">
              <div className="w-12 h-12 vibrant-gradient rounded-xl flex items-center justify-center shadow-lg shadow-brand/30 shrink-0">
                <FileSpreadsheet className="text-white" size={24} />
              </div>
              <div className="min-w-0">
                <h3 className="text-xl font-black text-app-text tracking-tight">CSV Upload Preview</h3>
                <p className="text-xs text-app-muted font-bold tracking-wider uppercase mt-1 truncate">
                  {fileName} &bull; {rows.length.toLocaleString()} {rows.length === 1 ? 'row' : 'rows'} parsed (showing first {previewRows.length})
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onCancel}
              disabled={isProcessing}
              className="p-2 hover:bg-app-subtle-bg rounded-full transition-colors text-app-muted hover:text-app-text disabled:opacity-50 cursor-pointer"
              aria-label="Close preview"
            >
              <X size={22} />
            </button>
          </div>

          {/* Body */}
          <div className="p-6 md:p-8 space-y-6 overflow-y-auto flex-1">
            {/* Validation Banner */}
            {validation && (
              <div
                className={`p-4 rounded-2xl border flex items-start gap-3 ${
                  isValid
                    ? 'bg-emerald-500/10 border-emerald-500/30'
                    : 'bg-red-500/10 border-red-500/30'
                }`}
              >
                {isValid ? (
                  <CheckCircle2 className="text-emerald-500 shrink-0 mt-0.5" size={18} />
                ) : (
                  <AlertCircle className="text-red-500 shrink-0 mt-0.5" size={18} />
                )}
                <div className="space-y-1.5 min-w-0 flex-1">
                  <p
                    className={`text-xs font-black uppercase tracking-widest ${
                      isValid ? 'text-emerald-500' : 'text-red-500'
                    }`}
                  >
                    {isValid ? 'Schema & Data Types Verified' : 'Validation Issues Detected'}
                  </p>
                  {isValid ? (
                    <p className="text-xs text-app-text font-medium leading-relaxed">
                      Detected {validation.validRowCount.toLocaleString()} valid {validation.validRowCount === 1 ? 'record' : 'records'}. Mapped columns:{' '}
                      <span className="font-bold text-brand">
                        Product_ID ({validation.mappedColumns.productId})
                      </span>
                      ,{' '}
                      <span className="font-bold text-brand">
                        Units_Sold ({validation.mappedColumns.unitsSold})
                      </span>
                      {validation.mappedColumns.date && (
                        <>
                          , <span className="font-bold text-app-text">Date ({validation.mappedColumns.date})</span>
                        </>
                      )}
                      {validation.mappedColumns.currentStock && (
                        <>
                          , <span className="font-bold text-app-text">Stock ({validation.mappedColumns.currentStock})</span>
                        </>
                      )}
                      .
                    </p>
                  ) : (
                    <>
                      <p className="text-xs text-app-text font-semibold leading-relaxed">
                        {validation.error}
                      </p>
                      {validation.details && validation.details.length > 0 && (
                        <ul className="list-disc list-inside space-y-0.5 text-xs text-app-muted">
                          {validation.details.map((detail, idx) => (
                            <li key={idx}>{detail}</li>
                          ))}
                        </ul>
                      )}
                    </>
                  )}
                </div>
              </div>
            )}

            {/* Preview Table */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-app-muted">
                  <Table size={14} className="text-brand" />
                  <span>First {previewRows.length} Parsed Rows</span>
                </div>
                <span className="text-[11px] font-semibold text-app-muted">
                  {displayHeaders.length} {displayHeaders.length === 1 ? 'column' : 'columns'}
                </span>
              </div>

              <div className="border border-app-border rounded-2xl overflow-hidden bg-app-bg">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-app-subtle-bg/70 border-b border-app-border">
                        <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-app-muted w-12">
                          #
                        </th>
                        {displayHeaders.map((header) => (
                          <th
                            key={header}
                            className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-app-text whitespace-nowrap"
                          >
                            {header}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-app-border/60">
                      {previewRows.length === 0 ? (
                        <tr>
                          <td
                            colSpan={Math.max(1, displayHeaders.length + 1)}
                            className="px-4 py-8 text-center text-xs text-app-muted font-medium"
                          >
                            No data rows available to preview.
                          </td>
                        </tr>
                      ) : (
                        previewRows.map((row, rowIndex) => (
                          <tr key={rowIndex} className="hover:bg-brand/[0.03] transition-colors">
                            <td className="px-4 py-3 text-xs font-mono text-app-muted">
                              {rowIndex + 1}
                            </td>
                            {displayHeaders.map((header) => {
                              const rawVal = row[header];
                              const displayVal =
                                rawVal !== undefined && rawVal !== null && String(rawVal).trim() !== ''
                                  ? String(rawVal)
                                  : null;
                              return (
                                <td
                                  key={header}
                                  className="px-4 py-3 text-xs text-app-text font-medium whitespace-nowrap"
                                >
                                  {displayVal !== null ? (
                                    displayVal
                                  ) : (
                                    <span className="text-app-muted/50 italic">—</span>
                                  )}
                                </td>
                              );
                            })}
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between gap-4 p-6 md:px-8 border-t border-app-border bg-app-subtle-bg/20 shrink-0">
            <p className="text-xs text-app-muted font-medium hidden sm:block">
              {isValid
                ? 'Verify your columns and sample values look right before processing.'
                : 'Fix the CSV issues above and re-select your file to continue.'}
            </p>
            <div className="flex items-center gap-3 ml-auto">
              <button
                type="button"
                onClick={onCancel}
                disabled={isProcessing}
                className="px-5 py-2.5 rounded-xl text-xs font-black text-app-muted hover:text-app-text hover:bg-app-subtle-bg transition-all uppercase tracking-widest cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={onConfirm}
                disabled={!isValid || isProcessing}
                className="px-6 py-2.5 bg-brand hover:bg-brand/90 disabled:bg-app-border disabled:text-app-muted text-white rounded-xl text-xs font-black transition-all flex items-center gap-2 shadow-lg shadow-brand/20 uppercase tracking-widest cursor-pointer disabled:cursor-not-allowed"
              >
                <Upload size={15} />
                <span>{isProcessing ? 'Processing...' : 'Confirm & Process'}</span>
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
