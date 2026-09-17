const fs = require('fs');

// AuthGate.jsx
let authGate = fs.readFileSync('frontend/src/pages/AuthGate.jsx', 'utf8');
authGate = authGate.replace(
  /<div className="h-8 w-8 rounded-md bg-neutral-900 flex items-center justify-center">\s*<Brain className="h-4\.5 w-4\.5 text-white" \/>\s*<\/div>/g,
  '<img src="/logo.jpg" alt="Forgot AI Logo" className="h-8 w-8 rounded-md object-cover" />'
);
authGate = authGate.replace(
  /<div className="mx-auto mb-8 h-32 w-32 bg-white rounded-3xl shadow-xl p-2 flex items-center justify-center overflow-hidden">[\s\S]*?<\/div>/g,
  '<div className="mx-auto mb-8 h-32 w-32 bg-white rounded-3xl shadow-xl p-2 flex items-center justify-center overflow-hidden">\n            <img src="/logo.jpg" alt="Forgot AI Logo" className="w-full h-full object-contain rounded-2xl" />\n          </div>'
);
authGate = authGate.replace(/Brain,\s*/g, ''); // Remove Brain import
fs.writeFileSync('frontend/src/pages/AuthGate.jsx', authGate);

// Layout.jsx
let layout = fs.readFileSync('frontend/src/components/Layout.jsx', 'utf8');
layout = layout.replace(
  /<div className="h-7 w-7 rounded-md bg-neutral-900 flex items-center justify-center">\s*<Brain className="h-4 w-4 text-white" \/>\s*<\/div>/g,
  '<img src="/logo.jpg" alt="Forgot AI Logo" className="h-7 w-7 rounded-md object-cover" />'
);
layout = layout.replace(/Brain,\s*/g, ''); // Remove Brain import
fs.writeFileSync('frontend/src/components/Layout.jsx', layout);
