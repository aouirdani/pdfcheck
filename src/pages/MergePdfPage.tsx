import { SEO } from "../hooks/useSEO";

const TITLE = "Merge PDF Online Free | PDFcheck";
const DESCRIPTION =
  "Merge multiple PDF files into one in seconds. Free, secure, and no installation needed. Drag & drop your PDFs and combine them instantly with PDFcheck.";

function HowItWorks() {
  const steps = [
    {
      number: "1",
      heading: "Upload your PDFs",
      body: "Drag and drop or click to select the PDF files you want to merge. Upload as many as you need.",
    },
    {
      number: "2",
      heading: "Arrange & Merge",
      body: "Reorder the files by dragging them into your desired sequence, then click the Merge button.",
    },
    {
      number: "3",
      heading: "Download",
      body: "Your combined PDF is ready instantly. Download it to your device — no account required.",
    },
  ];

  return (
    <section className="py-16 px-4 bg-gray-50">
      <div className="max-w-4xl mx-auto">
        <h2 className="text-2xl font-extrabold text-gray-800 text-center mb-10">
          How to Merge PDFs in 3 Steps
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
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 1.343-3 3s1.343 3 3 3 3-1.343 3-3-1.343-3-3-3z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
        </svg>
      ),
      heading: "100% Free",
      body: "Merge PDFs without paying a cent. No hidden fees, no subscriptions needed.",
    },
    {
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
        </svg>
      ),
      heading: "Secure & Private",
      body: "Files are processed in your browser. Nothing is uploaded to our servers.",
    },
    {
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      ),
      heading: "Lightning Fast",
      body: "Client-side processing means your files are merged in seconds, no upload wait time.",
    },
    {
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
      ),
      heading: "All Devices",
      body: "Works on desktop, tablet, and mobile — any modern browser, no installation.",
    },
  ];

  return (
    <section className="py-16 px-4">
      <div className="max-w-4xl mx-auto">
        <h2 className="text-2xl font-extrabold text-gray-800 text-center mb-10">
          Why Choose PDFcheck to Merge PDFs?
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
      q: "Is merging PDFs with PDFcheck really free?",
      a: "Yes, completely free. You can merge unlimited PDFs without creating an account or paying anything.",
    },
    {
      q: "Is my data safe when I merge PDFs?",
      a: "Absolutely. PDFcheck processes files entirely in your browser using client-side JavaScript. Your files never leave your device.",
    },
    {
      q: "How many PDF files can I merge at once?",
      a: "You can merge as many PDFs as you like in a single session. There is no hard limit enforced by PDFcheck.",
    },
    {
      q: "Will merging PDFs reduce the quality?",
      a: "No. PDFcheck uses pdf-lib to combine files at the byte level, preserving fonts, images, and formatting exactly as in the originals.",
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

export default function MergePdfPage() {
  function handleCTA() {
    window.dispatchEvent(new CustomEvent("open-tool", { detail: { toolId: "merge-pdf" } }));
    window.location.href = "/#tools";
  }

  return (
    <>
      <SEO title={TITLE} description={DESCRIPTION} path="/merge-pdf" />

      <main className="font-sans">
        {/* Hero */}
        <section className="py-20 px-4 text-center bg-white">
          <div className="max-w-3xl mx-auto">
            <span className="inline-block bg-red-50 text-red-500 text-xs font-bold px-3 py-1 rounded-full mb-4 uppercase tracking-wide">
              Free Online Tool
            </span>
            <h1 className="text-4xl sm:text-5xl font-extrabold text-gray-900 leading-tight mb-5">
              Merge PDF Files Online —{" "}
              <span className="text-red-500">Free, Fast &amp; Secure</span>
            </h1>
            <p className="text-gray-500 text-lg leading-relaxed mb-8 max-w-xl mx-auto">
              Combine multiple PDFs into a single file in seconds. No signup, no watermarks, no
              limits. Just drag, drop, and merge.
            </p>
            <button
              onClick={handleCTA}
              className="bg-red-500 hover:bg-red-600 text-white font-bold px-8 py-4 rounded-full text-base shadow-lg shadow-red-200 transition"
            >
              Merge PDFs Now — It's Free
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
