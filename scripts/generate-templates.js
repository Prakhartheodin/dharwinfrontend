/**
 * Generates Excel and PDF course templates. Run: node scripts/generate-templates.js
 */
const fs = require("fs");
const path = require("path");

const OUT_DIR = path.join(__dirname, "../public/templates");
if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

// --- Excel template ---
async function generateExcelTemplate() {
  const XLSX = await import("xlsx");
  const wb = XLSX.utils.book_new();

  const instructions = [
    ["Course Template - Instructions"],
    [""],
    ["Use this template to create course content. Include:"],
    ["- Module titles (Module 1: Topic Name)"],
    ["- Video Resources (with YouTube links in cells - AI extracts them)"],
    ["- Quiz: Q1. Question", "A) Option 1", "B) Option 2", "C) Option 3", "D) Option 4", "Answer: B) Option 2", "Explanation: ..."],
    ["- Long-Answer: Numbered questions with answers"],
    [""],
    ["Example Module 1 - Introduction to [Topic]"],
    ["", "", "", ""],
    ["Video Resources"],
    ["Video Title", "Description", "Duration", "Platform", "YouTube URL"],
    ["Python Tutorial for Beginners", "Complete beginner course", "4 hrs 26 min", "YouTube", "https://www.youtube.com/watch?v=rfscVS0vtbw"],
    ["", "", "", ""],
    ["Module Quiz"],
    ["Q1. Who created Python?"],
    ["A) Dennis Ritchie", "B) Guido van Rossum", "C) James Gosling", "D) Bjarne Stroustrup"],
    ["Answer: B) Guido van Rossum"],
    ["Explanation: Python was created by Guido van Rossum in 1991."],
    ["", ""],
    ["Q2. Which command displays output in Python?"],
    ["A) echo()", "B) console.log()", "C) print()", "D) output()"],
    ["Answer: C) print()"],
    ["Explanation: print() is the standard output function."],
    ["", "", "", ""],
    ["Long-Answer Practice Questions"],
    ["1. What is Python and its main characteristics for beginners?"],
    ["Answer: Python is a high-level, interpreted language... Simple syntax, dynamic typing, large standard library."],
    ["2. Explain the steps to install Python."],
    ["Answer: Download from python.org, run installer, check Add to PATH, verify with python --version"],
  ];

  const ws = XLSX.utils.aoa_to_sheet(instructions);
  ws["!cols"] = [{ wch: 50 }, { wch: 40 }, { wch: 20 }, { wch: 15 }, { wch: 60 }];
  XLSX.utils.book_append_sheet(wb, ws, "Course Template");

  const excelPath = path.join(OUT_DIR, "course-template.xlsx");
  XLSX.writeFile(wb, excelPath);
  console.log("Created:", excelPath);
}

// --- PDF template (using jspdf) ---
async function generatePdfTemplate() {
  const { jsPDF } = require("jspdf");
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  let y = 20;

  const addLine = (text, size = 11) => {
    doc.setFontSize(size);
    const lines = doc.splitTextToSize(text, 170);
    lines.forEach((line) => {
      if (y > 270) {
        doc.addPage();
        y = 20;
      }
      doc.text(line, 20, y);
      y += size * 0.5;
    });
    y += 2;
  };

  doc.setFontSize(18);
  doc.text("Course Template", 20, y);
  y += 12;

  addLine("Use this template for your course content. Structure:", 12);
  addLine("• Module N: Title - Section headers for each module");
  addLine("• Video Resources - Video titles, YouTube URLs (e.g. https://www.youtube.com/watch?v=xxxxx)");
  addLine("• Module Quiz - Q1. Question, then A) B) C) D) options, Answer: X), Explanation");
  addLine("• Long-Answer Practice - Numbered questions (1. 2. 3.) with answers");
  y += 8;

  addLine("Module 1: Introduction to [Your Topic]", 14);
  y += 6;

  addLine("Video Resources:");
  addLine("▶ Python Tutorial - https://www.youtube.com/watch?v=rfscVS0vtbw");
  addLine("▶ Quick Overview - https://www.youtube.com/watch?v=x7X9w_GIm1s");
  y += 6;

  addLine("Module Quiz:");
  addLine("Q1. Who created Python?");
  addLine("A) Dennis Ritchie  B) Guido van Rossum  C) James Gosling  D) Bjarne Stroustrup");
  addLine("Answer: B) Guido van Rossum");
  addLine("Explanation: Python was created by Guido van Rossum in 1991.");
  y += 4;
  addLine("Q2. Which function displays output in Python?");
  addLine("A) echo()  B) console.log()  C) print()  D) output()");
  addLine("Answer: C) print()");
  y += 8;

  addLine("Long-Answer Practice Questions:");
  addLine("1. What is Python and its main characteristics for beginners?");
  addLine("Answer: Python is a high-level, interpreted language. Key features: simple syntax, dynamic typing, large standard library.");
  addLine("2. Explain the steps to install Python.");
  addLine("Answer: Visit python.org, download latest 3.x, run installer, check Add to PATH, verify with python --version");

  const pdfPath = path.join(OUT_DIR, "course-template.pdf");
  const buf = doc.output("arraybuffer");
  fs.writeFileSync(pdfPath, Buffer.from(buf));
  console.log("Created:", pdfPath);
}

(async () => {
  await generateExcelTemplate();
  await generatePdfTemplate().catch((e) => console.warn("PDF generation skipped:", e.message));
})();
