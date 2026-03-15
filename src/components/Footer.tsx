export function Footer() {
  const year = new Date().getFullYear();

  const links = {
    "PDF Tools": ["Merge PDF", "Split PDF", "Compress PDF", "PDF to Word", "PDF to JPG", "Sign PDF"],
    "Convert": ["Word to PDF", "Excel to PDF", "PowerPoint to PDF", "HTML to PDF", "JPG to PDF"],
    "Company": ["About", "Blog", "Careers", "Press", "Contact"],
    "Legal & Support": ["Privacy Policy", "Terms of Service", "GDPR", "Help Center", "API Docs"],
  };

  return (
    <footer className="bg-gray-950 text-gray-400 pt-16 pb-8 px-4 border-t border-gray-900">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-2 md:grid-cols-6 gap-8 mb-12">
          {/* Brand */}
          <div className="col-span-2">
            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-violet-600 rounded-xl flex items-center justify-center shadow-md">
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                </svg>
              </div>
              <span className="text-white font-bold text-lg">
                <span className="text-indigo-400">PDF</span>check
              </span>
            </div>
            <p className="text-sm leading-relaxed mb-5 max-w-[220px]">
              Your online PDF toolkit. Free, fast, and secure tools for everyone.
            </p>
            {/* Social links */}
            <div className="flex gap-2">
              {[
                { label: "Twitter", icon: "𝕏" },
                { label: "LinkedIn", icon: "in" },
                { label: "GitHub", icon: "⌥" },
              ].map((s) => (
                <a
                  key={s.label}
                  href="#"
                  title={s.label}
                  className="w-8 h-8 rounded-xl bg-gray-800 hover:bg-gray-700 flex items-center justify-center transition-colors"
                >
                  <span className="text-[11px] font-bold text-gray-400 hover:text-white">{s.icon}</span>
                </a>
              ))}
            </div>
          </div>

          {Object.entries(links).map(([heading, items]) => (
            <div key={heading}>
              <h4 className="text-white font-semibold text-sm mb-4">{heading}</h4>
              <ul className="space-y-2.5">
                {items.map((item) => (
                  <li key={item}>
                    <a href="#" className="text-xs hover:text-white transition-colors leading-relaxed">
                      {item}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom bar */}
        <div className="border-t border-gray-800/70 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs">
          <p className="text-gray-500">© {year} PDFcheck. All rights reserved.</p>

          <div className="flex items-center gap-4 flex-wrap justify-center">
            <span className="flex items-center gap-1.5 text-gray-500">
              <svg className="w-3.5 h-3.5 text-emerald-500" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
              </svg>
              SSL Secured
            </span>
            <span className="flex items-center gap-1.5 text-gray-500">
              <svg className="w-3.5 h-3.5 text-indigo-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15a4.5 4.5 0 004.5 4.5H18a3.75 3.75 0 001.332-7.257 3 3 0 00-3.758-3.848 5.25 5.25 0 00-10.233 2.33A4.502 4.502 0 002.25 15z" />
              </svg>
              GDPR Compliant
            </span>
            <span className="flex items-center gap-1.5 text-gray-500">
              <svg className="w-3.5 h-3.5 text-violet-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z" />
              </svg>
              Privacy First
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
