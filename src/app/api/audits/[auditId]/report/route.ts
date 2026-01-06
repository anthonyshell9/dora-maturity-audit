import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import * as XLSX from 'xlsx';

declare module 'jspdf' {
  interface jsPDF {
    autoTable: (options: Record<string, unknown>) => jsPDF;
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ auditId: string }> }
) {
  try {
    const { auditId } = await params;
    const { searchParams } = new URL(request.url);
    const format = searchParams.get('format') || 'pdf';

    // Get full audit data
    const audit = await prisma.audit.findUnique({
      where: { id: auditId },
      include: {
        organization: true,
        auditor: { select: { id: true, name: true, email: true } },
        responses: {
          include: {
            question: {
              include: {
                article: {
                  include: { chapter: true },
                },
              },
            },
            evidences: true,
          },
        },
      },
    });

    if (!audit) {
      return NextResponse.json(
        { error: 'Audit not found' },
        { status: 404 }
      );
    }

    // Get all questions
    const questions = await prisma.question.findMany({
      include: {
        article: {
          include: { chapter: true },
        },
      },
      orderBy: [
        { article: { chapterId: 'asc' } },
        { article: { number: 'asc' } },
        { ref: 'asc' },
      ],
    });

    // Create response map
    const responseMap = new Map(
      audit.responses.map((r) => [r.questionId, r])
    );

    // Calculate statistics
    const stats = {
      total: questions.length,
      yes: 0,
      no: 0,
      na: 0,
      noAnswer: 0,
    };

    questions.forEach((q) => {
      const response = responseMap.get(q.id);
      if (!response) {
        stats.noAnswer++;
      } else {
        switch (response.answer) {
          case 'YES': stats.yes++; break;
          case 'NO': stats.no++; break;
          case 'NA': stats.na++; break;
          default: stats.noAnswer++;
        }
      }
    });

    const applicable = stats.total - stats.na;
    const compliance = applicable > 0 ? Math.round((stats.yes / applicable) * 100) : 0;

    if (format === 'excel' || format === 'csv') {
      // Generate Excel/CSV
      const workbook = XLSX.utils.book_new();

      // Summary sheet
      const summaryData = [
        ['DORA Maturity Audit Report'],
        [''],
        ['Organization', audit.organization.name],
        ['Audit Name', audit.name],
        ['Auditor', audit.auditor.name || audit.auditor.email],
        ['Started', audit.startedAt.toISOString()],
        ['Completed', audit.completedAt?.toISOString() || 'In Progress'],
        [''],
        ['Overall Compliance', `${compliance}%`],
        ['Total Questions', stats.total],
        ['Compliant (Yes)', stats.yes],
        ['Non-Compliant (No)', stats.no],
        ['Not Applicable', stats.na],
        ['Not Answered', stats.noAnswer],
      ];
      const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
      XLSX.utils.book_append_sheet(workbook, summarySheet, 'Summary');

      // Detailed responses sheet
      const responseData = [
        ['Chapter', 'Article', 'Ref', 'Question', 'Answer', 'Notes', 'Evidence Files'],
      ];

      questions.forEach((q) => {
        const response = responseMap.get(q.id);
        const evidenceFiles = response?.evidences.map((e) => e.fileName).join(', ') || '';
        responseData.push([
          `Chapter ${q.article.chapterId}: ${q.article.chapter.title}`,
          `Article ${q.article.number}: ${q.article.title}`,
          q.ref,
          q.text,
          response?.answer || 'NO_ANSWER',
          response?.notes || '',
          evidenceFiles,
        ]);
      });

      const responsesSheet = XLSX.utils.aoa_to_sheet(responseData);
      XLSX.utils.book_append_sheet(workbook, responsesSheet, 'Responses');

      // Generate file
      const buffer = format === 'csv'
        ? XLSX.write(workbook, { type: 'buffer', bookType: 'csv' })
        : XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

      const contentType = format === 'csv'
        ? 'text/csv'
        : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
      const extension = format === 'csv' ? 'csv' : 'xlsx';

      return new NextResponse(buffer, {
        headers: {
          'Content-Type': contentType,
          'Content-Disposition': `attachment; filename="dora-audit-${auditId}.${extension}"`,
        },
      });
    }

    // Generate PDF
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();

    // Title
    doc.setFontSize(20);
    doc.text('DORA Maturity Audit Report', pageWidth / 2, 20, { align: 'center' });

    // Organization info
    doc.setFontSize(12);
    doc.text(`Organization: ${audit.organization.name}`, 14, 35);
    doc.text(`Audit: ${audit.name}`, 14, 42);
    doc.text(`Auditor: ${audit.auditor.name || audit.auditor.email}`, 14, 49);
    doc.text(`Date: ${audit.startedAt.toLocaleDateString()}`, 14, 56);

    // Compliance summary
    doc.setFontSize(16);
    doc.text('Executive Summary', 14, 70);

    doc.setFontSize(12);
    doc.text(`Overall Compliance: ${compliance}%`, 14, 80);

    // Summary table
    doc.autoTable({
      startY: 90,
      head: [['Metric', 'Value']],
      body: [
        ['Total Questions', stats.total.toString()],
        ['Compliant (Yes)', stats.yes.toString()],
        ['Non-Compliant (No)', stats.no.toString()],
        ['Not Applicable', stats.na.toString()],
        ['Not Answered', stats.noAnswer.toString()],
      ],
      theme: 'striped',
      headStyles: { fillColor: [41, 128, 185] },
    });

    // Chapter breakdown
    const chapters = [2, 3, 4, 5, 6];
    const chapterData = chapters.map((chNum) => {
      const chapterQuestions = questions.filter((q) => q.article.chapterId === chNum);
      let yes = 0, no = 0, na = 0;
      chapterQuestions.forEach((q) => {
        const response = responseMap.get(q.id);
        if (response?.answer === 'YES') yes++;
        else if (response?.answer === 'NO') no++;
        else if (response?.answer === 'NA') na++;
      });
      const chApplicable = chapterQuestions.length - na;
      const chCompliance = chApplicable > 0 ? Math.round((yes / chApplicable) * 100) : 0;
      return [`Chapter ${chNum}`, chapterQuestions.length.toString(), yes.toString(), no.toString(), na.toString(), `${chCompliance}%`];
    });

    doc.autoTable({
      startY: (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 15,
      head: [['Chapter', 'Questions', 'Yes', 'No', 'N/A', 'Compliance']],
      body: chapterData,
      theme: 'striped',
      headStyles: { fillColor: [41, 128, 185] },
    });

    // Detailed questions by chapter
    doc.addPage();
    doc.setFontSize(16);
    doc.text('Detailed Responses', 14, 20);

    let currentY = 30;
    chapters.forEach((chNum) => {
      const chapterQuestions = questions.filter((q) => q.article.chapterId === chNum);
      if (chapterQuestions.length === 0) return;

      const chapterTitle = chapterQuestions[0].article.chapter.title;

      // Check if we need a new page
      if (currentY > 250) {
        doc.addPage();
        currentY = 20;
      }

      doc.setFontSize(14);
      doc.text(`Chapter ${chNum}: ${chapterTitle}`, 14, currentY);
      currentY += 10;

      const tableData = chapterQuestions.map((q) => {
        const response = responseMap.get(q.id);
        return [
          q.ref,
          q.text.substring(0, 60) + (q.text.length > 60 ? '...' : ''),
          response?.answer || 'N/A',
        ];
      });

      doc.autoTable({
        startY: currentY,
        head: [['Ref', 'Question', 'Answer']],
        body: tableData,
        theme: 'striped',
        headStyles: { fillColor: [41, 128, 185] },
        columnStyles: {
          0: { cellWidth: 15 },
          1: { cellWidth: 140 },
          2: { cellWidth: 25 },
        },
      });

      currentY = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 15;
    });

    // Generate PDF buffer
    const pdfBuffer = Buffer.from(doc.output('arraybuffer'));

    return new NextResponse(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="dora-audit-${auditId}.pdf"`,
      },
    });
  } catch (error) {
    console.error('Error generating report:', error);
    return NextResponse.json(
      { error: 'Failed to generate report' },
      { status: 500 }
    );
  }
}
