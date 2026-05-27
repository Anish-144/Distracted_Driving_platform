const fs = require('fs');
const path = require('path');

const file = path.join('frontend', 'src', 'pages', 'lessons', 'index.tsx');
let content = fs.readFileSync(file, 'utf8');

// Replace tab classes
content = content.replace(/className={px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-200 \}/g, "className={px-4 py-2 rounded-xl text-sm font-semibold }");

content = content.replace(/className={px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-200 \}/g, "className={px-4 py-2 rounded-xl text-sm font-semibold }");

// Replace Empty State
content = content.replace(/<div className="flex flex-col items-center justify-center p-12 rounded-2xl bg-secondary border border-subtle text-center">[\s\S]*?<div className="w-16 h-16 rounded-full bg-primary border border-subtle flex items-center justify-center mb-4">[\s\S]*?<Brain className="w-8 h-8 text-muted" \/>[\s\S]*?<\/div>[\s\S]*?<h3 className="text-lg font-bold text-primary mb-2">No AI lessons yet<\/h3>[\s\S]*?<p className="text-sm text-secondary max-w-md leading-relaxed mb-6">[\s\S]*?Complete more simulation sessions to give the AI enough behavioral data to generate targeted micro-lessons.[\s\S]*?<\/p>[\s\S]*?<Link[\s\S]*?href="\/simulation"[\s\S]*?className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-primary font-bold transition-colors"[\s\S]*?>[\s\S]*?<Target className="w-4 h-4" \/>Start Simulation[\s\S]*?<\/Link>[\s\S]*?<\/div>/g, 
<div className="empty-state-card">
  <div className="icon-wrapper">
    <Brain className="icon" />
  </div>
  <h3>Your personalized curriculum awaits</h3>
  <p>Complete simulation sessions to give our behavioral engine the data needed to generate targeted micro-lessons.</p>
  <Link href="/simulation" className="btn-primary">
    <Target className="w-4 h-4" /> Start Calibration
  </Link>
</div>);

fs.writeFileSync(file, content, 'utf8');
console.log('Replaced lessons/index.tsx');
