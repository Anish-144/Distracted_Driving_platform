const fs = require('fs');
const path = require('path');

function replaceInFile(filePath) {
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Semantic token replacements for colors
    content = content.replace(/\btext-brand-600 dark:text-brand-400\b/g, 'text-accent');
    content = content.replace(/\btext-emerald-600 dark:text-emerald-400\b/g, 'text-success');
    content = content.replace(/\btext-blue-600 dark:text-blue-400\b/g, 'text-accent');
    content = content.replace(/\btext-amber-600 dark:text-amber-400\b/g, 'text-warning');
    content = content.replace(/\btext-amber-500 dark:text-amber-400\b/g, 'text-warning');
    content = content.replace(/\btext-violet-500 dark:text-violet-400\b/g, 'text-accent');
    content = content.replace(/\btext-red-500 dark:text-red-400\b/g, 'text-destructive');
    
    // Direct color replacements
    content = content.replace(/\btext-white\b/g, 'text-primary'); // Most text-white should be primary
    // Except inside buttons or specific simulation elements which we'll address individually if they break
    content = content.replace(/\btext-gray-200\b/g, 'text-primary');
    content = content.replace(/\btext-gray-300\b/g, 'text-secondary');
    content = content.replace(/\btext-gray-400\b/g, 'text-muted');
    content = content.replace(/\btext-gray-500\b/g, 'text-muted');
    content = content.replace(/\btext-gray-600\b/g, 'text-secondary');
    content = content.replace(/\btext-gray-700\b/g, 'text-secondary');
    content = content.replace(/\btext-gray-900\b/g, 'text-primary');
    
    content = content.replace(/\btext-zinc-400\b/g, 'text-muted');
    content = content.replace(/\btext-slate-400\b/g, 'text-muted');
    content = content.replace(/\btext-neutral-400\b/g, 'text-muted');
    
    fs.writeFileSync(filePath, content, 'utf8');
}

const files = [
    'frontend/src/pages/dashboard/index.tsx',
    'frontend/src/pages/dashboard/research.tsx',
    'frontend/src/pages/settings.tsx',
    'frontend/src/pages/onboarding.tsx',
    'frontend/src/pages/simulation/index.tsx',
    'frontend/src/components/simulation/AIDialogue.tsx',
    'frontend/src/components/simulation/Timer.tsx',
    'frontend/src/components/simulation/ScoreDisplay.tsx',
    'frontend/src/components/simulation/DistractionEvent.tsx',
    'frontend/src/components/simulation/ScenarioContainer.tsx'
];

files.forEach(f => {
    const p = path.join(process.cwd(), f);
    if (fs.existsSync(p)) {
        replaceInFile(p);
        console.log('Processed ' + f);
    }
});
