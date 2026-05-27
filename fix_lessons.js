const fs = require('fs');
const path = require('path');

const file = path.join('frontend', 'src', 'pages', 'lessons', 'index.tsx');
let content = fs.readFileSync(file, 'utf8');

// Replacements
content = content.replace(/\btext-white\b/g, 'text-primary');
content = content.replace(/\btext-gray-200\b/g, 'text-primary');
content = content.replace(/\btext-gray-300\b/g, 'text-secondary');
content = content.replace(/\btext-gray-400\b/g, 'text-muted');
content = content.replace(/\btext-gray-500\b/g, 'text-muted');
content = content.replace(/\btext-gray-700\b/g, 'text-secondary');
content = content.replace(/\btext-gray-950\b/g, 'text-primary'); // used on emerald bg
content = content.replace(/\bbg-gray-950\b/g, 'bg-card-elevated');
content = content.replace(/\bbg-gray-800\b/g, 'bg-secondary');
content = content.replace(/\bborder-gray-800\b/g, 'border-strong');
content = content.replace(/\bborder-gray-100\b/g, 'border-subtle');
content = content.replace(/\bbg-gray-50\b/g, 'bg-secondary');

fs.writeFileSync(file, content, 'utf8');
console.log('Replaced hardcoded typography in lessons/index.tsx');
