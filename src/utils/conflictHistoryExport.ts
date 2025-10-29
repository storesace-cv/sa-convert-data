import { ConflictResolutionHistoryEntry } from '@/types/conflictHistory';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import { createPieChart, createBarChart } from './pdfChartGenerator';

export interface ExportOptions {
  format: 'csv' | 'pdf';
  includeDetails: boolean;
  dateFrom?: Date;
  dateTo?: Date;
  resolutionType?: string;
  userName?: string;
}

export interface HistoryStatistics {
  totalResolutions: number;
  conflictTypeBreakdown: Record<string, number>;
  strategyBreakdown: Record<string, number>;
  averageResolutionTime: number;
  resolutionsByUser: Record<string, number>;
}

export function calculateStatistics(entries: ConflictResolutionHistoryEntry[]): HistoryStatistics {
  const stats: HistoryStatistics = {
    totalResolutions: entries.length,
    conflictTypeBreakdown: {},
    strategyBreakdown: {},
    averageResolutionTime: 0,
    resolutionsByUser: {}
  };

  entries.forEach(entry => {
    stats.conflictTypeBreakdown[entry.conflictType] = 
      (stats.conflictTypeBreakdown[entry.conflictType] || 0) + 1;
    stats.strategyBreakdown[entry.resolutionStrategy] = 
      (stats.strategyBreakdown[entry.resolutionStrategy] || 0) + 1;
    stats.resolutionsByUser[entry.userName] = 
      (stats.resolutionsByUser[entry.userName] || 0) + 1;
  });

  return stats;
}

export function exportToCSV(
  entries: ConflictResolutionHistoryEntry[],
  options: ExportOptions,
  stats: HistoryStatistics
): void {
  const rows: any[] = [];
  rows.push({ Section: 'SUMMARY STATISTICS' });
  rows.push({ Metric: 'Total Resolutions', Value: stats.totalResolutions });
  rows.push({});

  rows.push({ Section: 'CONFLICT TYPES' });
  Object.entries(stats.conflictTypeBreakdown).forEach(([type, count]) => {
    rows.push({ Type: type, Count: count });
  });
  rows.push({});

  rows.push({ Section: 'RESOLUTION STRATEGIES' });
  Object.entries(stats.strategyBreakdown).forEach(([strategy, count]) => {
    rows.push({ Strategy: strategy, Count: count });
  });
  rows.push({});

  entries.forEach(entry => {
    const row: any = {
      Date: new Date(entry.timestamp).toLocaleString(),
      User: entry.userName,
      'Conflict Type': entry.conflictType,
      Strategy: entry.resolutionStrategy,
      Description: entry.afterState.resolutionDescription
    };
    if (options.includeDetails) {
      row['Rules Before'] = entry.beforeState.rules.map(r => r.name).join('; ');
      row['Rules After'] = entry.afterState.rules.map(r => r.name).join('; ');
    }
    rows.push(row);
  });

  const ws = XLSX.utils.json_to_sheet(rows, { skipHeader: false });
  const csv = XLSX.utils.sheet_to_csv(ws);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `conflict-history-${Date.now()}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export async function exportToPDF(
  entries: ConflictResolutionHistoryEntry[],
  options: ExportOptions,
  stats: HistoryStatistics
): Promise<void> {
  const doc = new jsPDF('p', 'pt', 'a4');
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  let yPos = 40;

  const addHeader = () => {
    doc.setFillColor(30, 58, 138);
    doc.rect(0, 0, pageWidth, 30, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(14);
    doc.text('Conflict Resolution History Report', pageWidth / 2, 20, { align: 'center' });
  };

  const addFooter = (pageNum: number) => {
    doc.setFontSize(8);
    doc.setTextColor(100, 100, 100);
    doc.text(`Page ${pageNum} | Generated: ${new Date().toLocaleString()}`, pageWidth / 2, pageHeight - 20, { align: 'center' });
  };

  const checkPageBreak = (requiredSpace: number) => {
    if (yPos + requiredSpace > pageHeight - 40) {
      addFooter(doc.getCurrentPageInfo().pageNumber);
      doc.addPage();
      yPos = 40;
      addHeader();
      yPos = 50;
    }
  };

  addHeader();
  yPos = 50;

  // Summary Statistics
  doc.setFontSize(16);
  doc.setTextColor(0, 0, 0);
  doc.text('Summary Statistics', 40, yPos);
  yPos += 25;

  doc.setFontSize(11);
  doc.text(`Total Resolutions: ${stats.totalResolutions}`, 40, yPos);
  yPos += 30;

  // Generate charts
  const canvas = document.createElement('canvas');
  canvas.width = 400;
  canvas.height = 300;

  // Conflict Types Chart
  checkPageBreak(320);
  const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];
  createPieChart(canvas, stats.conflictTypeBreakdown, 'Conflict Types Distribution', colors);
  const chartImg = canvas.toDataURL('image/png');
  doc.addImage(chartImg, 'PNG', 40, yPos, 250, 190);
  yPos += 210;

  // Resolution Strategies Chart
  checkPageBreak(320);
  createBarChart(canvas, stats.strategyBreakdown, 'Resolution Strategies Used', '#10b981');
  const strategyImg = canvas.toDataURL('image/png');
  doc.addImage(strategyImg, 'PNG', 40, yPos, 250, 190);
  yPos += 210;

  // User Contributions Chart
  checkPageBreak(320);
  createBarChart(canvas, stats.resolutionsByUser, 'Resolutions by User', '#3b82f6');
  const userImg = canvas.toDataURL('image/png');
  doc.addImage(userImg, 'PNG', 40, yPos, 250, 190);
  yPos += 230;

  // Resolution Details
  if (options.includeDetails && entries.length > 0) {
    checkPageBreak(50);
    doc.setFontSize(16);
    doc.setTextColor(0, 0, 0);
    doc.text('Resolution Details', 40, yPos);
    yPos += 25;

    entries.forEach((entry, index) => {
      checkPageBreak(120);
      doc.setFontSize(12);
      doc.setTextColor(30, 58, 138);
      doc.text(`Resolution #${index + 1}`, 40, yPos);
      yPos += 20;

      doc.setFontSize(9);
      doc.setTextColor(0, 0, 0);
      doc.text(`Date: ${new Date(entry.timestamp).toLocaleString()}`, 40, yPos);
      yPos += 15;
      doc.text(`User: ${entry.userName}`, 40, yPos);
      yPos += 15;
      doc.text(`Type: ${entry.conflictType}`, 40, yPos);
      yPos += 15;
      doc.text(`Strategy: ${entry.resolutionStrategy}`, 40, yPos);
      yPos += 15;

      const desc = entry.afterState.resolutionDescription || 'N/A';
      const descLines = doc.splitTextToSize(desc, pageWidth - 80);
      doc.text(descLines, 40, yPos);
      yPos += descLines.length * 12 + 10;
    });
  }

  addFooter(doc.getCurrentPageInfo().pageNumber);
  doc.save(`conflict-history-${Date.now()}.pdf`);
}

