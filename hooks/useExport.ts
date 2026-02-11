/**
 * Custom Hook for PDF and CSV Export
 * Reusable export functionality for tables/data
 */

import { useState } from "react";
import jsPDF from "jspdf";

export interface ExportColumn {
  key: string;
  label: string;
  getValue?: (row: any, index: number) => string | number;
}

export interface ExportConfig {
  title: string;
  fileName: string;
  columns: ExportColumn[];
  fetchData: () => Promise<any[]>;
  logoUrl?: string;
  branchName?: string | null;
}

export const useExport = (config: ExportConfig) => {
  const [isLoadingPDF, setIsLoadingPDF] = useState(false);
  const [isLoadingCSV, setIsLoadingCSV] = useState(false);

  const handleExportPDF = async () => {
    setIsLoadingPDF(true);
    try {
      const allData = await config.fetchData();
      if (allData.length === 0) {
        alert("No data available to export");
        return;
      }

      // Prepare headers and table data
      const headers = config.columns.map((col) => col.label);
      const tableData = allData.map((row, index) =>
        config.columns.map((col) => {
          if (col.key === "sr" || col.key === "serial") {
            return String(index + 1);
          }
          if (col.getValue) {
            return String(col.getValue(row, index));
          }
          return String(row[col.key] || "N/A");
        })
      );

      // Create PDF
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      const margin = 5;
      const tableStartY = 30; // minimal gap between header content and table header row
      const borderRadius = 3;
      let currentY = tableStartY;
      const tableStartYPositions: number[] = [];
      const tableEndYPositions: number[] = [];

      // Load and add logo at top left (only on first page)
      let logoLoaded = false;
      let logoWidth = 0;
      let logoHeight = 0;
      let logoImageData: string | null = null;

      if (config.logoUrl) {
        try {
          const logoImg = document.createElement("img");
          logoImg.crossOrigin = "anonymous";

          await new Promise<void>((resolve) => {
            logoImg.onload = () => {
              try {
                const maxLogoHeight = 12;
                const logoAspectRatio = logoImg.width / logoImg.height;
                logoHeight = maxLogoHeight;
                logoWidth = logoHeight * logoAspectRatio;

                const canvas = document.createElement("canvas");
                canvas.width = logoImg.width;
                canvas.height = logoImg.height;
                const ctx = canvas.getContext("2d");
                if (ctx) {
                  ctx.drawImage(logoImg, 0, 0);
                  logoImageData = canvas.toDataURL("image/png");
                }

                doc.addImage(logoImg, "PNG", margin, 5, logoWidth, logoHeight);
                logoLoaded = true;
                resolve();
              } catch (error) {
                console.warn("Could not add logo to PDF:", error);
                resolve();
              }
            };
            logoImg.onerror = () => {
              console.warn("Could not load logo image");
              resolve();
            };
            logoImg.src = config.logoUrl || "/images/logo.png";
          });
        } catch (error) {
          console.warn("Error loading logo:", error);
        }
      }

      // Colors
      const borderColor = [237, 243, 234]; // #EDF3EA
      const headerTextColor = [38, 45, 59]; // #262D3B
      const bodyTextColor = [67, 73, 86]; // #434956
      const primaryTextColor = [38, 45, 59]; // #262D3B
      const backgroundColor = [255, 255, 255]; // White

      // Branch name (below logo, left-aligned) - same font as report title/table headers; extra top spacing
      const branchY = logoLoaded ? 5 + logoHeight + 8 : 18;
      if (config.branchName && String(config.branchName).trim() !== "") {
        doc.setFontSize(9);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(headerTextColor[0], headerTextColor[1], headerTextColor[2]);
        doc.text(`Branch : ${String(config.branchName).trim()}`, margin, branchY);
      }

      // Title and generated date/time (below title, right-aligned)
      const titleY = logoLoaded ? 5 + logoHeight / 2 + 4 : 18;
      const generatedAt = (() => {
        const d = new Date();
        const day = String(d.getDate()).padStart(2, "0");
        const month = String(d.getMonth() + 1).padStart(2, "0");
        const year = d.getFullYear();
        const hours = String(d.getHours()).padStart(2, "0");
        const minutes = String(d.getMinutes()).padStart(2, "0");
        const seconds = String(d.getSeconds()).padStart(2, "0");
        return `${day}-${month}-${year} ${hours}:${minutes}:${seconds}`;
      })();

      // Report title: same font as table headers (helvetica normal, size 9) for consistency
      doc.setFontSize(16);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(headerTextColor[0], headerTextColor[1], headerTextColor[2]);
      const titleWidth = doc.getTextWidth(config.title);
      doc.text(config.title, pageWidth - margin - titleWidth, titleY);

      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(bodyTextColor[0], bodyTextColor[1], bodyTextColor[2]);
      const generatedWidth = doc.getTextWidth(generatedAt);
      doc.text(generatedAt, pageWidth - margin - generatedWidth, titleY + 7);

      // Table settings (reduced padding for tighter rows in PDF)
      const baseRowHeight = 10;
      const headerHeight = 12;
      const headerFontSize = 9;
      const bodyFontSize = 8;
      const cellPadding = 3;
      const availableWidth = pageWidth - (margin * 2);
      const lineHeight = 4;
      const verticalPadding = 1;

      // Calculate column widths
      doc.setFontSize(headerFontSize);
      doc.setFont("helvetica", "normal");

      const idealWidths: number[] = [];
      
      // Define minimum widths for specific columns to prevent overlap and add gap between Token No. and Created
      const getMinWidth = (header: string): number => {
        const headerLower = header.toLowerCase();
        if (headerLower.includes("sr") || headerLower.includes("serial")) {
          return 15; // Serial number - narrow
        } else if (headerLower.includes("patient name") || headerLower.includes("visitor name")) {
          return 35; // Name columns - wider
        } else if (headerLower.includes("registration")) {
          return 40; // Registration No. - needs more space to prevent overlap
        } else if (headerLower.includes("token")) {
          return 36; // Token No. - adequate space + gap before Created
        } else if (headerLower.includes("type")) {
          return 30; // Type column - increased to fit "New Patient" in one line
        } else if (headerLower.includes("created")) {
          return 38; // Created date/time - extra space for date + time lines
        } else if (headerLower.includes("name")) {
          return 35; // Generic name column
        } else if (headerLower.includes("status")) {
          return 30; // Status column
        }
        return 20; // Default minimum
      };
      
      const maxColWidth = availableWidth * 0.25; // Max 25% of page width per column
      
      headers.forEach((header, colIndex) => {
        // Calculate header width
        doc.setFont("helvetica", "medium");
        doc.setFontSize(headerFontSize);
        const headerWidth = doc.getTextWidth(header) + (cellPadding * 2);
        
        // Calculate max content width from ALL data rows
        doc.setFont("helvetica", "normal");
        doc.setFontSize(bodyFontSize);
        let maxContentWidth = headerWidth;
        let maxWordLength = 0;
        
        tableData.forEach((row) => {
          const cellText = String(row[colIndex] || "");
          const textWidth = doc.getTextWidth(cellText) + (cellPadding * 2);
          
          // Track longest single word (for wrapping calculation)
          const words = cellText.split(' ');
          words.forEach(word => {
            const wordWidth = doc.getTextWidth(word);
            if (wordWidth > maxWordLength) {
              maxWordLength = wordWidth;
            }
          });
          
          if (textWidth > maxContentWidth) {
            maxContentWidth = textWidth;
          }
        });
        
        // Special handling for name columns - give them more space
        const isPatientName = header.toLowerCase().includes("patient name");
        const isVisitorName = header.toLowerCase().includes("visitor name");
        const isNameColumn = isPatientName || isVisitorName;
        const isRegistration = header.toLowerCase().includes("registration");
        const isToken = header.toLowerCase().includes("token");
        const isType = header.toLowerCase().includes("type");
        
        // Calculate ideal width: ensure it fits longest word + padding, but not too wide
        let idealWidth = Math.max(maxContentWidth, maxWordLength + (cellPadding * 2));
        
        // Apply multipliers for different column types
        if (isNameColumn) {
          idealWidth = idealWidth * 1.4; // 40% more space for names
        } else if (isRegistration) {
          idealWidth = Math.max(idealWidth * 1.2, 40); // Ensure Registration No. has enough space
        } else if (isToken) {
          idealWidth = Math.max(idealWidth * 1.15, 36); // Token No. - enough space + gap before Created
        } else if (isType) {
          // Ensure Type column fits "New Patient", "OPD Patient", "IPD Patient", etc. in one line
          // Check width needed for common type values
          doc.setFontSize(bodyFontSize);
          const typeValues = ["New Patient", "OPD Patient", "IPD Patient", "Revisit Patient", "Other Patient", "TPA Patient"];
          let maxTypeWidth = 0;
          typeValues.forEach(typeValue => {
            const typeWidth = doc.getTextWidth(typeValue) + (cellPadding * 2);
            if (typeWidth > maxTypeWidth) {
              maxTypeWidth = typeWidth;
            }
          });
          idealWidth = Math.max(idealWidth, maxTypeWidth, 30); // Ensure minimum 30mm
        } else if (header.toLowerCase().includes("sr") || header.toLowerCase().includes("serial")) {
          idealWidth = idealWidth * 0.7; // Less space for serial numbers
        }
        
        // Get minimum width for this column type
        const minColWidth = getMinWidth(header);
        
        // Clamp between min and max
        idealWidth = Math.max(minColWidth, Math.min(maxColWidth, idealWidth));
        idealWidths.push(idealWidth);
      });

      // Distribute available width
      const totalIdealWidth = idealWidths.reduce((sum, w) => sum + w, 0);
      const colWidths: number[] = [];

      if (totalIdealWidth <= availableWidth) {
        const remainingSpace = availableWidth - totalIdealWidth;
        const spacePerColumn = remainingSpace / idealWidths.length;
        idealWidths.forEach((ideal) => {
          colWidths.push(ideal + spacePerColumn);
        });
      } else {
        const scaleFactor = availableWidth / totalIdealWidth;
        idealWidths.forEach((ideal) => {
          colWidths.push(ideal * scaleFactor);
        });
      }

      // Ensure minimum widths
      headers.forEach((header, i) => {
        const minColWidth = getMinWidth(header);
        if (colWidths[i] < minColWidth) {
          const neededSpace = minColWidth - colWidths[i];
          const otherColumns = colWidths.filter((_, idx) => idx !== i);
          const totalOtherWidth = otherColumns.reduce((sum, w) => sum + w, 0);

          if (totalOtherWidth > neededSpace) {
            const reduceFactor = (totalOtherWidth - neededSpace) / totalOtherWidth;
            colWidths.forEach((width, idx) => {
              if (idx !== i) {
                const otherMinWidth = getMinWidth(headers[idx]);
                const newWidth = width * reduceFactor;
                colWidths[idx] = Math.max(newWidth, otherMinWidth);
              }
            });
            colWidths[i] = minColWidth;
          }
        }
      });

      // Final normalization
      const finalTotal = colWidths.reduce((sum, w) => sum + w, 0);
      if (Math.abs(finalTotal - availableWidth) > 0.1) {
        const finalScale = availableWidth / finalTotal;
        colWidths.forEach((width, i) => {
          colWidths[i] = width * finalScale;
        });
      }

      // Helper function to draw header (same font as report title: helvetica normal, headerFontSize)
      const drawHeader = (y: number) => {
        doc.setFillColor(backgroundColor[0], backgroundColor[1], backgroundColor[2]);
        doc.rect(margin, y, availableWidth, headerHeight, "F");

        doc.setTextColor(headerTextColor[0], headerTextColor[1], headerTextColor[2]);
        doc.setFontSize(headerFontSize);
        doc.setFont("helvetica", "normal");

        doc.setDrawColor(borderColor[0], borderColor[1], borderColor[2]);
        doc.setLineWidth(0.5);
        doc.line(margin, y + headerHeight, margin + availableWidth, y + headerHeight);

        let xPos = margin;
        headers.forEach((header, i) => {
          const textY = y + (headerHeight / 2) + 1; // reduced top padding in table header
          doc.text(header, xPos + cellPadding, textY);
          xPos += colWidths[i];
        });
      };

      // Draw initial header
      tableStartYPositions.push(currentY);
      drawHeader(currentY);
      currentY += headerHeight;

      // Helper function to wrap text and calculate lines
      const wrapText = (text: string, maxWidth: number): string[] => {
        const words = text.split(' ');
        const lines: string[] = [];
        let currentLine = '';
        
        words.forEach((word) => {
          const testLine = currentLine ? `${currentLine} ${word}` : word;
          const testWidth = doc.getTextWidth(testLine);
          
          if (testWidth > maxWidth && currentLine) {
            lines.push(currentLine);
            currentLine = word;
          } else {
            currentLine = testLine;
          }
        });
        
        if (currentLine) {
          lines.push(currentLine);
        }
        
        return lines.length > 0 ? lines : [text];
      };

      // Draw rows with auto-sized heights - matching Table component styling
      doc.setTextColor(bodyTextColor[0], bodyTextColor[1], bodyTextColor[2]);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(bodyFontSize);

      const pageHeight = doc.internal.pageSize.getHeight();

      tableData.forEach((row, rowIndex) => {
        // Calculate row height based on content (for multi-line cells)
        // Pre-calculate wrapped text for all cells to determine max lines
        const cellWrappedTexts: string[][] = [];
        let maxLines = 1;
        
        row.forEach((cell, cellIndex) => {
          const cellText = String(cell || "N/A");
          const maxTextWidth = colWidths[cellIndex] - (cellPadding * 2);
          
          // For Type column, don't wrap - keep text in one line
          const isTypeColumn = headers[cellIndex]?.toLowerCase().includes("type");
          let wrappedLines: string[];
          
          if (isTypeColumn) {
            // Check if text fits in one line, if not, use single line anyway (will be truncated if needed)
            const textWidth = doc.getTextWidth(cellText);
            if (textWidth <= maxTextWidth) {
              wrappedLines = [cellText];
            } else {
              // Text doesn't fit, but we'll still use one line (it might overflow slightly)
              wrappedLines = [cellText];
            }
          } else {
            wrappedLines = wrapText(cellText, maxTextWidth);
          }
          
          cellWrappedTexts.push(wrappedLines);
          
          if (wrappedLines.length > maxLines) {
            maxLines = wrappedLines.length;
          }
        });
        
        // Calculate dynamic row height based on max lines (reduced padding)
        const dynamicRowHeight = Math.max(
          baseRowHeight,
          (maxLines * lineHeight) + (verticalPadding * 2)
        );
        
        // Check if we need a new page with better bottom margin
        const needsNewPage = currentY + dynamicRowHeight > pageHeight - 25;
        if (needsNewPage) {
          // Store end position for current page before adding new page
          tableEndYPositions.push(currentY);
          doc.addPage();
          currentY = margin;
          tableStartYPositions.push(currentY);
          drawHeader(currentY);
          currentY += headerHeight;
          doc.setTextColor(bodyTextColor[0], bodyTextColor[1], bodyTextColor[2]);
          doc.setFont("helvetica", "normal");
        }

        // White background for all rows (matching Table component - no alternating colors)
        doc.setFillColor(backgroundColor[0], backgroundColor[1], backgroundColor[2]);
        doc.rect(margin, currentY, availableWidth, dynamicRowHeight, "F");

        // Draw cell borders and text - matching Table component styling
        let xPos = margin;
        // Check if this is the last row on the current page (next row would cause page break or it's the last row overall)
        const isLastRowOnPage = rowIndex === tableData.length - 1 || 
          (rowIndex < tableData.length - 1 && currentY + dynamicRowHeight + baseRowHeight > pageHeight - 25);
        
        row.forEach((cell, cellIndex) => {
          if (!isLastRowOnPage) {
            doc.setDrawColor(borderColor[0], borderColor[1], borderColor[2]);
            doc.setLineWidth(0.5);
            doc.line(xPos, currentY + dynamicRowHeight, xPos + colWidths[cellIndex], currentY + dynamicRowHeight);
          }
          
          // Get wrapped text for this cell
          const wrappedLines = cellWrappedTexts[cellIndex];
          const cellText = String(cell || "N/A");
          
          // Determine text color (primary for sr column, default for others)
          const isSrColumn = headers[cellIndex]?.toLowerCase().includes("sr") || 
                            headers[cellIndex]?.toLowerCase().includes("serial");
          const textColor = isSrColumn ? primaryTextColor : bodyTextColor;
          
          doc.setTextColor(textColor[0], textColor[1], textColor[2]);
          doc.setFont("helvetica", "normal");
          doc.setFontSize(bodyFontSize);
          
          // Calculate vertical centering for multi-line text with better spacing
          const totalTextHeight = wrappedLines.length * lineHeight;
          const startY = currentY + verticalPadding + (dynamicRowHeight - totalTextHeight - (verticalPadding * 2)) / 2 + lineHeight;
          
          // Draw each line of wrapped text (left-aligned like Table component)
          wrappedLines.forEach((line, lineIndex) => {
            const yPos = startY + (lineIndex * lineHeight);
            doc.text(line, xPos + cellPadding, yPos);
          });
          
          xPos += colWidths[cellIndex];
        });

        currentY += dynamicRowHeight;
      });

      tableEndYPositions.push(currentY);

      // Helper function to draw rounded rectangle border
      const drawRoundedRect = (
        x: number,
        y: number,
        w: number,
        h: number,
        r: number
      ) => {
        if (typeof (doc as any).roundedRect === "function") {
          (doc as any).roundedRect(x, y, w, h, r, r, "S");
          return;
        }
        doc.rect(x, y, w, h, "S");
      };

      // Draw rounded border around table for each page
      const totalPagesForBorder = doc.getNumberOfPages();
      for (let pageNum = 0; pageNum < totalPagesForBorder; pageNum++) {
        if (
          tableStartYPositions[pageNum] !== undefined &&
          tableEndYPositions[pageNum] !== undefined
        ) {
          doc.setPage(pageNum + 1);
          const startY = tableStartYPositions[pageNum];
          const endY = tableEndYPositions[pageNum];
          const tableHeight = endY - startY;

          doc.setDrawColor(borderColor[0], borderColor[1], borderColor[2]);
          doc.setLineWidth(0.5);
          drawRoundedRect(margin, startY, availableWidth, tableHeight, borderRadius);
        }
      }

      // Footer - add logo only on first page, page numbers on all pages
      const totalPages = doc.getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);

        // Only add logo on the first page
        if (
          i === 1 &&
          logoLoaded &&
          logoImageData &&
          logoWidth > 0 &&
          logoHeight > 0
        ) {
          try {
            doc.addImage(logoImageData, "PNG", margin, 5, logoWidth, logoHeight);
          } catch (e) {
            console.warn("Could not add logo to page", i);
          }
        }

        // Add page numbers to all pages
        doc.setFontSize(8);
        doc.setTextColor(128, 128, 128);
        doc.setFont("helvetica", "normal");
        const pageText = `Page ${i} of ${totalPages}`;
        doc.text(
          pageText,
          pageWidth / 2,
          doc.internal.pageSize.getHeight() - 8,
          { align: "center" }
        );
      }

      // Save PDF - name format: "New & Revisit Patient Report - 03-02-2026.pdf"
      const d = new Date();
      const day = String(d.getDate()).padStart(2, "0");
      const month = String(d.getMonth() + 1).padStart(2, "0");
      const year = d.getFullYear();
      const dateFormatted = `${day}-${month}-${year}`;
      const fileName = `${config.title} Report - ${dateFormatted}.pdf`;
      doc.save(fileName);
    } catch (error) {
      console.error("Error exporting PDF:", error);
      alert("Failed to export PDF. Please try again.");
    } finally {
      setIsLoadingPDF(false);
    }
  };

  const handleExportCSV = async () => {
    setIsLoadingCSV(true);
    try {
      const allData = await config.fetchData();
      if (allData.length === 0) {
        alert("No data available to export");
        return;
      }

      // Headers
      const headers = config.columns.map((col) => col.label);

      // Create CSV content
      const csvRows: string[] = [];

      // Add headers
      csvRows.push(headers.map((header) => `"${header}"`).join(","));

      // Add data rows
      allData.forEach((row, index) => {
        const csvRow = config.columns.map((col) => {
          let value: string;
          if (col.key === "sr" || col.key === "serial") {
            value = String(index + 1);
          } else if (col.getValue) {
            value = String(col.getValue(row, index));
          } else {
            value = String(row[col.key] || "N/A");
          }
          // Escape quotes and wrap in quotes
          return `"${value.replace(/"/g, '""')}"`;
        });
        csvRows.push(csvRow.join(","));
      });

      // Create CSV string
      const csvContent = csvRows.join("\n");

      // Create blob and download
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const link = document.createElement("a");
      const url = URL.createObjectURL(blob);

      link.setAttribute("href", url);
      const d = new Date();
      const day = String(d.getDate()).padStart(2, "0");
      const month = String(d.getMonth() + 1).padStart(2, "0");
      const year = d.getFullYear();
      const dateFormatted = `${day}-${month}-${year}`;
      const fileName = `${config.title} Report - ${dateFormatted}.csv`;
      link.setAttribute("download", fileName);
      link.style.visibility = "hidden";

      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error("Error exporting CSV:", error);
      alert("Failed to export CSV. Please try again.");
    } finally {
      setIsLoadingCSV(false);
    }
  };

  return {
    handleExportPDF,
    handleExportCSV,
    isLoadingPDF,
    isLoadingCSV,
  };
};
