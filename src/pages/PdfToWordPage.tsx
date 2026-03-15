import { SEO } from "../hooks/useSEO";

const TITLE = "PDF to Word Converter Online Free | PDFcheck";
const DESCRIPTION =
  "Convert PDF to Word (DOCX) online for free. Accurate text extraction, editable output, no signup required. Fast and secure PDF to Word conversion with PDFcheck.";

function HowItWorks() {
  const steps = [
    {
      number: "1",
      heading: "Upload your PDF",
      body: "Select or drag and drop the PDF file you want to convert to a Word document.",
    },
    {
      number: "2",
      heading: "Convert to Word",
      body: "PDFcheck extracts the text and structure from your PDF and formats it as an editable DOCX file.",
    },
    {
      number: "3",
      heading: "Download your DOCX",
      body: "Your Word document is ready to download and open in Microsoft Word, Google Docs, or LibreOffice.",
    },
  ];

  return (
    <section className="py-16 px-4 bg-gray-50">
      <div className="max-w-4xl mx-auto">
        <h2 className="text-2xl font-extrabold text-gray-800 text-center mb-10">
          How to Convert PDF to Word in 3 Steps
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {steps.map((step) => (
            <div key={step.number} className="flex flex-col items-center text-center">
              <div className="w-12 h-12 rounded-full bg-red-500 text-white flex items-center justify-center text-xl font-extrabold mb-4 shadow-md shadow-red-200">
                {step.number}
              </div>
              <h3 className="text-base font-bold text-gray-800 mb-2">{step.heading}</h3>
              <p className="text-sm text-gray-500 leading-relaxed">{step.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Benefits() {
  const items = [
    {
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
        </svg>
      ),
      heading: "Fully Editable Output",
      body: "The resulting DOCX preserves paragraphs, headings, and lists so you can edit straight away.",
    },
    {
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      ),
      heading: "Instant Conversion",
      body: "No server round-trip. Text extraction happens in your browser, delivering results in seconds.",
    },
    {
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
        </svg>
      ),
      heading: "Your Data Stays Private",
      body: "Conversion runs entirely on your device. Files are never uploaded or stored anywhere.",
    },
    {
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
        </svg>
      ),
      heading: "Works Everywhere",
      body: "Compatible with Windows, Mac, iOS, and Android — any browser, any device.",
    },
  ];

  return (
    <section className="py-16 px-4">
      <div className="max-w-4xl mx-auto">
        <h2 className="text-2xl font-extrabold text-gray-800 text-center mb-10">
          Why Use PDFcheck to Convert PDF to Word?
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {items.map((item) => (
            <div key={item.heading} className="flex gap-4 p-5 rounded-xl border border-gray-100 hover:border-red-200 transition">
              <div className="flex-shrink-0 w-11 h-11 rounded-lg bg-red-50 text-red-500 flex items-center justify-center">
                {item.icon}
              </div>
              <div>
                <h3 className="font-bold text-gray-800 mb-1">{item.heading}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{item.body}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function FAQ() {
  const items = [
    {
      q: "What Word format does PDFcheck produce?",
      a: "PDFcheck outputs a standard .docx file compatible with Microsoft Word 2007 and later, Google Docs, and LibreOffice.",
    },
    {
      q: "Does the converter support scanned PDFs?",
      a: "For scanned (image-based) PDFs, use the OCR PDF tool first to extract text, then convert to Word.",
    },
    {
      q: "Will fonts and formatting be preserved?",
      a: "PDFcheck does its best to preserve heading hierarchy, bold/italic styling, and paragraph flow. Complex multi-column layouts may simplify.",
    },
    {
      q: "Is converting PDF to Word free?",
      a: "Yes, completely free. You can convert as many PDFs as you like without signing up or paying.",
    },
  ];

  return (
    <section className="py-16 px-4 bg-gray-50">
      <div className="max-w-3xl mx-auto">
        <h2 className="text-2xl font-extrabold text-gray-800 text-center mb-10">
          Frequently Asked Questions
        </h2>
        <div className="space-y-4">
          {items.map((item) => (
            <div key={item.q} className="bg-white rounded-xl border border-gray-100 p-5">
              <h3 className="font-bold text-gray-800 mb-2">{item.q}</h3>
              <p className="text-sm text-gray-500 leading-relaxed">{item.a}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export default function PdfToWordPage() {
  function handleCTA() {
    window.dispatchEvent(new CustomEvent("open-tool", { detail: { toolId: "pdf-to-word" } }));
    window.location.href = "/#tools";
  }

  return (
    <>
      <SEO title={TITLE} description={DESCRIPTION} path="/pdf-to-word" />

      <main className="font-sans">
        {/* Hero */}
        <section className="py-20 px-4 text-center bg-white">
          <div className="max-w-3xl mx-auto">
            <span className="inline-block bg-red-50 text-red-500 text-xs font-bold px-3 py-1 rounded-full mb-4 uppercase tracking-wide">
              Free Online Tool
            </span>
            <h1 className="text-4xl sm:text-5xl font-extrabold text-gray-900 leading-tight mb-5">
              PDF to Word Converter —{" "}
              <span className="text-red-500">Accurate, Editable, Free</span>
            </h1>
            <p className="text-gray-500 text-lg leading-relaxed mb-8 max-w-xl mx-auto">
              Turn any PDF into a fully editable Word document in seconds. Retain formatting,
              headings, and text without any hassle.
            </p>
            <button
              onClick={handleCTA}
              className="bg-red-500 hover:bg-red-600 text-white font-bold px-8 py-4 rounded-full text-base shadow-lg shadow-red-200 transition"
            >
              Convert PDF to Word — It's Free
            </button>
          </div>
        </section>

        <HowItWorks />
        <Benefits />
        <FAQ />

        {/* Footer */}
        <footer className="py-8 px-4 border-t border-gray-100 text-center">
          <p className="text-sm text-gray-400">
            &larr;{" "}
            <a href="/" className="text-red-500 hover:underline font-medium">
              Back to all PDF tools
            </a>
          </p>
        </footer>
      </main>
    </>
  );
}
