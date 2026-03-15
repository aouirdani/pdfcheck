import { SEO } from "../hooks/useSEO";

const TITLE = "Compress PDF Online Free | PDFcheck";
const DESCRIPTION =
  "Reduce PDF file size online for free. Compress PDFs without losing quality — no upload required, fast client-side processing. Try PDFcheck now.";

function HowItWorks() {
  const steps = [
    {
      number: "1",
      heading: "Upload your PDF",
      body: "Select or drag and drop the PDF file you want to compress. Works with any PDF regardless of size.",
    },
    {
      number: "2",
      heading: "Choose compression level",
      body: "Pick between low, medium, or high compression to balance file size against visual quality.",
    },
    {
      number: "3",
      heading: "Download compressed PDF",
      body: "Get your smaller PDF instantly. No waiting, no email — just download and go.",
    },
  ];

  return (
    <section className="py-16 px-4 bg-gray-50">
      <div className="max-w-4xl mx-auto">
        <h2 className="text-2xl font-extrabold text-gray-800 text-center mb-10">
          How to Compress a PDF in 3 Steps
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
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
        </svg>
      ),
      heading: "Smaller File Sizes",
      body: "Reduce PDFs by up to 80% — perfect for email attachments, uploads, and storage.",
    },
    {
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
        </svg>
      ),
      heading: "Quality Preserved",
      body: "Smart compression algorithms keep your text sharp and images readable.",
    },
    {
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
        </svg>
      ),
      heading: "Private & Secure",
      body: "Compression happens in your browser. Your documents never reach any server.",
    },
    {
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 1.343-3 3s1.343 3 3 3 3-1.343 3-3-1.343-3-3-3zM2 12h2m16 0h2M12 2v2m0 16v2" />
        </svg>
      ),
      heading: "No Account Needed",
      body: "Start compressing immediately — no registration, no email, no credit card.",
    },
  ];

  return (
    <section className="py-16 px-4">
      <div className="max-w-4xl mx-auto">
        <h2 className="text-2xl font-extrabold text-gray-800 text-center mb-10">
          Why Use PDFcheck to Compress PDFs?
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
      q: "How much can PDFcheck compress my PDF?",
      a: "Results vary by content, but most PDFs can be reduced by 30–80%. Image-heavy PDFs compress the most.",
    },
    {
      q: "Will compression damage my PDF's content?",
      a: "No. PDFcheck uses lossless and near-lossless methods. Text remains crisp and images stay readable.",
    },
    {
      q: "Is there a file size limit for compression?",
      a: "There is no enforced limit. Very large files may take a few extra seconds in the browser.",
    },
    {
      q: "Do I need to install any software?",
      a: "No installation required. PDFcheck runs entirely in your web browser on any device.",
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

export default function CompressPdfPage() {
  function handleCTA() {
    window.dispatchEvent(new CustomEvent("open-tool", { detail: { toolId: "compress-pdf" } }));
    window.location.href = "/#tools";
  }

  return (
    <>
      <SEO title={TITLE} description={DESCRIPTION} path="/compress-pdf" />

      <main className="font-sans">
        {/* Hero */}
        <section className="py-20 px-4 text-center bg-white">
          <div className="max-w-3xl mx-auto">
            <span className="inline-block bg-red-50 text-red-500 text-xs font-bold px-3 py-1 rounded-full mb-4 uppercase tracking-wide">
              Free Online Tool
            </span>
            <h1 className="text-4xl sm:text-5xl font-extrabold text-gray-900 leading-tight mb-5">
              Compress PDF Online —{" "}
              <span className="text-red-500">Smaller Files, Same Quality</span>
            </h1>
            <p className="text-gray-500 text-lg leading-relaxed mb-8 max-w-xl mx-auto">
              Shrink your PDF files in seconds without sacrificing readability. No account needed,
              no watermarks, completely free.
            </p>
            <button
              onClick={handleCTA}
              className="bg-red-500 hover:bg-red-600 text-white font-bold px-8 py-4 rounded-full text-base shadow-lg shadow-red-200 transition"
            >
              Compress PDF Now — It's Free
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
