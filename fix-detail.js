const fs = require('fs');
let detail = fs.readFileSync('frontend/src/components/ItemDetailView.jsx', 'utf8');
detail = detail.replace(
  /<div className="w-7 h-7 mr-3 mt-0\.5 shrink-0 bg-neutral-900 rounded-full flex items-center justify-center shadow-sm">\s*<Brain className="w-3\.5 h-3\.5 text-white" \/>\s*<\/div>/g,
  '<img src="/logo.jpg" alt="AI Avatar" className="w-7 h-7 mr-3 mt-0.5 shrink-0 rounded-full object-cover shadow-sm border border-neutral-200" />'
);
fs.writeFileSync('frontend/src/components/ItemDetailView.jsx', detail);
