import React from 'react';

export const PrintStyles = () => (
    <style>{`
    /* 1. Base Logic: Hide PDF container by default */
    .pdf-only {
      display: none !important;
    }

    /* 2. Preview Mode: Force show and fix width */
    .force-preview .pdf-only {
      display: block !important;
      visibility: visible !important;
      position: relative !important;
      left: 0 !important;
      width: 297mm !important; /* Fixed A4 Landscape width */
      height: 210mm !important;
      margin: 0 auto !important;
      box-sizing: border-box !important;
      -webkit-print-color-adjust: exact;
    }

    /* 3. Capture State Logic: For pdfRef capture */
    .pdf-container .pdf-only {
      display: block !important;
      position: absolute !important;
      left: -9999px !important; /* Move off-screen but keep rendered for chart calculation */
      width: 297mm !important;
      height: 210mm !important;
    }

    /* 4. PDF Print Mode */
    @media print {
      @page { size: A4 landscape; margin: 0; }
      .no-print { display: none !important; }
      .pdf-only { 
        display: block !important; 
        position: relative !important; 
        left: 0 !important;
      }
      .pdf-page-break { page-break-after: always; }
    }

    /* Fix Recharts in PDF captures */
    .recharts-surface {
      overflow: visible !important;
    }

    /* Hide horizontal scrollbar in force-preview */
    .force-preview {
      width: 100%;
      overflow-x: auto;
    }
  `}</style>
);
