const fs = require('fs');

let home = fs.readFileSync('frontend/src/pages/Home.jsx', 'utf8');
home = home.replace(
  /<div className="h-12 w-12 rounded-xl bg-neutral-900 flex items-center justify-center mx-auto mb-4">\s*<Brain className="h-6 w-6 text-white" \/>\s*<\/div>/g,
  '<div className="h-12 w-12 mx-auto mb-4">\n              <img src="/logo.jpg" alt="Forgot AI Logo" className="w-full h-full object-cover rounded-xl shadow-sm" />\n            </div>'
);
home = home.replace(/Brain,\s*/g, '');
fs.writeFileSync('frontend/src/pages/Home.jsx', home);

let detail = fs.readFileSync('frontend/src/components/ItemDetailView.jsx', 'utf8');
detail = detail.replace(
  /<div className="h-7 w-7 rounded-full bg-neutral-900 flex items-center justify-center shrink-0 border border-neutral-800 shadow-sm">\s*<Brain className="w-3\.5 h-3\.5 text-white" \/>\s*<\/div>/g,
  '<img src="/logo.jpg" alt="AI Avatar" className="h-7 w-7 rounded-full object-cover shrink-0 border border-neutral-200 shadow-sm" />'
);
detail = detail.replace(/Brain,\s*/g, '');
fs.writeFileSync('frontend/src/components/ItemDetailView.jsx', detail);
