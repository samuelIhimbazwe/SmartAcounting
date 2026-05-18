package com.smartaccounting.service;

import com.lowagie.text.Document;
import com.lowagie.text.FontFactory;
import com.lowagie.text.PageSize;
import com.lowagie.text.Paragraph;
import com.lowagie.text.Phrase;
import com.lowagie.text.pdf.PdfPCell;
import com.lowagie.text.pdf.PdfPTable;
import com.lowagie.text.pdf.PdfWriter;
import com.smartaccounting.entity.PayrollLine;
import com.smartaccounting.entity.PayrollRun;
import org.springframework.stereotype.Component;

import java.io.ByteArrayOutputStream;
import java.text.NumberFormat;
import java.time.LocalDate;
import java.util.Locale;

@Component
public class PayslipPdfGenerator {

    public byte[] generate(PayrollRun run, PayrollLine line) {
        try (ByteArrayOutputStream baos = new ByteArrayOutputStream()) {
            Document doc = new Document(PageSize.A4);
            PdfWriter.getInstance(doc, baos);
            doc.open();

            doc.add(new Paragraph(
                "SmartAccounting — Payslip",
                FontFactory.getFont(FontFactory.HELVETICA_BOLD, 16)));
            doc.add(new Paragraph("Period: " + run.getPeriod()));
            doc.add(new Paragraph(
                "Employee: " + line.getEmployeeName() + " | Dept: " + line.getDepartment()));
            doc.add(new Paragraph(" "));

            PdfPTable table = new PdfPTable(2);
            table.setWidthPercentage(100);
            addRow(table, "Gross Pay", formatFrw(line.getGrossSalary()));
            addRow(table, "PAYE", "-" + formatFrw(line.getPaye()));
            addRow(table, "RSSB (Employee)", "-" + formatFrw(line.getRssbEmployee()));
            addRow(table, "RSSB (Employer)", formatFrw(line.getRssbEmployer()) + " (employer)");
            addRow(table, "Maternity", "-" + formatFrw(line.getMaternityInsurance()));
            addRow(table, "CBHI", "-" + formatFrw(line.getCbhi()));
            addRow(table, "Net Pay", formatFrw(line.getNetPay()));
            doc.add(table);

            doc.add(new Paragraph(" "));
            doc.add(new Paragraph(
                "Generated: " + LocalDate.now(),
                FontFactory.getFont(FontFactory.HELVETICA, 8)));
            doc.close();
            return baos.toByteArray();
        } catch (Exception e) {
            throw new IllegalStateException("Failed to generate payslip PDF", e);
        }
    }

    private void addRow(PdfPTable table, String label, String value) {
        table.addCell(new PdfPCell(new Phrase(label)));
        table.addCell(new PdfPCell(new Phrase(value)));
    }

    private String formatFrw(java.math.BigDecimal amount) {
        if (amount == null) {
            return "FRW 0";
        }
        return "FRW " + NumberFormat.getNumberInstance(Locale.US).format(amount);
    }
}
