import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { ChatMessage, User } from '../types';

export const exportDoctorReport = (
  messages: ChatMessage[],
  currentUser: User | null,
  sessionId?: string
) => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const generatedAt = new Date().toLocaleString('en-US', {
    dateStyle: 'full',
    timeStyle: 'medium',
  });
  const refCode = `DKT-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

  // Header Banner
  doc.setFillColor(13, 148, 136); // Teal #0d9488
  doc.rect(0, 0, pageWidth, 32, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text('DokitaAI – Clinical Triage Summary Report', 14, 18);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('Prepared for Attending Physician & Primary Care Review', 14, 26);

  // Metadata Grid
  doc.setTextColor(30, 41, 59);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('PATIENT & SESSION METADATA', 14, 42);

  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.5);
  doc.line(14, 45, pageWidth - 14, 45);

  doc.setFont('helvetica', 'normal');
  doc.text(`Patient Name: ${currentUser ? currentUser.name : 'Guest Patient (Unregistered)'}`, 14, 52);
  doc.text(`Patient Contact: ${currentUser?.email || currentUser?.phoneNumber || 'N/A (Web Portal)'}`, 14, 58);
  doc.text(`Report Ref: ${refCode}`, pageWidth / 2 + 10, 52);
  doc.text(`Generated: ${generatedAt}`, pageWidth / 2 + 10, 58);
  doc.text(`Session ID: ${sessionId || 'Active Live Session'}`, 14, 64);

  // Triage Conversation Table
  const tableData: string[][] = [];
  
  messages.forEach((msg, idx) => {
    const sender = msg.role === 'user' ? 'Patient Symptom Query' : 'DokitaAI Clinical Triage';
    const cleanContent = msg.content
      .replace(/###/g, '')
      .replace(/####/g, '')
      .replace(/\*\*/g, '')
      .replace(/`/g, '');
    
    tableData.push([`${idx + 1}. ${sender}`, cleanContent]);
  });

  autoTable(doc, {
    startY: 72,
    head: [['Interaction Sequence & Role', 'Clinical Content & Triage Recommendations']],
    body: tableData,
    headStyles: {
      fillColor: [15, 23, 42], // Slate 900
      textColor: 255,
      fontStyle: 'bold',
      fontSize: 9,
    },
    bodyStyles: {
      fontSize: 8.5,
      textColor: [51, 65, 85],
      cellPadding: 4,
    },
    columnStyles: {
      0: { cellWidth: 55, fontStyle: 'bold' },
      1: { cellWidth: 'auto' },
    },
    theme: 'grid',
    margin: { left: 14, right: 14 },
  });

  // Get final Y position after table
  const finalY = (doc as any).lastAutoTable?.finalY || 160;

  // Physician Sign-off Box
  let currentY = finalY + 12;
  if (currentY > 230) {
    doc.addPage();
    currentY = 20;
  }

  doc.setFillColor(248, 250, 252);
  doc.rect(14, currentY, pageWidth - 28, 40, 'F');
  doc.setDrawColor(203, 213, 225);
  doc.rect(14, currentY, pageWidth - 28, 40, 'D');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(15, 23, 42);
  doc.text('PHYSICIAN CLINICAL REVIEW & TRIAGE CONFIRMATION', 18, currentY + 8);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text('Attending Doctor Signature / Stamp: ______________________', 18, currentY + 20);
  doc.text('Clinical Diagnosis Notes: ________________________________________________________________', 18, currentY + 30);
  doc.text('Date of Review: ____________________', pageWidth - 80, currentY + 20);

  // Mandatory Statutory Medical Disclaimer at Footer
  const pageHeight = doc.internal.pageSize.getHeight();
  doc.setFontSize(7);
  doc.setTextColor(148, 163, 184);
  const disclaimerText = 
    'STATUTORY MEDICAL DISCLAIMER: DokitaAI is an artificial intelligence triage guidance tool and is NOT a substitute for professional medical advice, clinical diagnosis, or hospital emergency treatment. Attending clinicians should independently verify all vital signs and history.';
  doc.text(doc.splitTextToSize(disclaimerText, pageWidth - 28), 14, pageHeight - 12);

  // Trigger download
  doc.save(`DokitaAI_Medical_Report_${Date.now()}.pdf`);
};
