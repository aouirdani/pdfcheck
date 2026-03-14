export function Footer() {
  const year = new Date().getFullYear();

  const links = {
    "PDF Tools": ["Merge PDF", "Split PDF", "Compress PDF", "PDF to Word", "PDF to JPG", "Sign PDF"],
    "Company": ["About", "Blog", "Careers", "Press", "Contact"],
    "Legal": ["Privacy Policy", "Terms of Service", "Cookie Policy", "GDPR"],
    "Support": ["Help Center", "API Docs", "Status", "Community"],
  };

  return (
    <footer className="bg-gray-900 text-gray-400 py-12 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-8 mb-10">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1">
            <div className="flex items-center gap-2 mb-3">
              <div className="bg-red-500 text-white font-black text-sm px-2 py-1 rounded">✓</div>
              <span className="text-white font-bold text-lg">
                <span className="text-red-400">PDF</span>check
              </span>
            </div>
            <p className="text-xs leading-relaxed mb-4">
              Your online PDF toolkit. Free, fast, and secure PDF tools for everyone.
            </p>
            <div className="flex gap-3">
              {["twitter", "facebook", "instagram", "linkedin"].map((s) => (
                <a key={s} href="#" className="w-8 h-8 rounded-full bg-gray-800 hover:bg-gray-700 flex items-center justify-center transition">
                  <span className="text-[10px] font-bold capitalize text-gray-400">{s[0].toUpperCase()}</span>
                </a>
              ))}
            </div>
          </div>

          {Object.entries(links).map(([heading, items]) => (
            <div key={heading}>
              <h4 className="text-white font-semibold text-sm mb-3">{heading}</h4>
              <ul className="space-y-2">
                {items.map((item) => (
                  <li key={item}>
                    <a href="#" className="text-xs hover:text-white transition">{item}</a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="border-t border-gray-800 pt-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          <p>© {year} PDFcheck. All rights reserved.</p>
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5">
              <svg className="w-3.5 h-3.5 text-green-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
              </svg>
              SSL Secured
            </span>
            <span className="flex items-center gap-1.5">
              <svg className="w-3.5 h-3.5 text-blue-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15a4.5 4.5 0 004.5 4.5H18a3.75 3.75 0 001.332-7.257 3 3 0 00-3.758-3.848 5.25 5.25 0 00-10.233 2.33A4.502 4.502 0 002.25 15z" />
              </svg>
              GDPR Compliant
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
