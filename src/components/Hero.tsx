export function Hero() {
  return (
    <section className="bg-gradient-to-br from-red-50 via-white to-orange-50 py-16 px-4 text-center border-b border-gray-100">
      <div className="max-w-3xl mx-auto">
        <div className="inline-flex items-center gap-2 bg-red-100 text-red-600 text-xs font-semibold px-3 py-1 rounded-full mb-6">
          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          </svg>
          Trusted by 100+ million users worldwide
        </div>

        <h1 className="text-4xl sm:text-5xl font-extrabold text-gray-900 leading-tight mb-5">
          Every tool you need to work <br className="hidden sm:block" />
          with <span className="text-red-500">PDF</span>
        </h1>
        <p className="text-gray-500 text-lg mb-8 max-w-xl mx-auto">
          All tools are free to use. Merge, split, compress, convert, rotate, unlock and watermark PDFs with just a few clicks.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <a
            href="#tools"
            className="bg-red-500 hover:bg-red-600 text-white font-semibold px-7 py-3 rounded-full shadow-md shadow-red-200 transition text-sm"
          >
            Explore All Tools
          </a>
          <a
            href="#features"
            className="bg-white hover:bg-gray-50 border border-gray-200 text-gray-700 font-semibold px-7 py-3 rounded-full shadow-sm transition text-sm"
          >
            Learn More
          </a>
        </div>

        {/* Stats */}
        <div className="mt-12 grid grid-cols-3 gap-6 max-w-lg mx-auto">
          {[
            { value: "100M+", label: "Happy Users" },
            { value: "20+", label: "PDF Tools" },
            { value: "99.9%", label: "Uptime" },
          ].map((s) => (
            <div key={s.label} className="text-center">
              <div className="text-2xl font-black text-gray-900">{s.value}</div>
              <div className="text-xs text-gray-500 mt-0.5">{s.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
