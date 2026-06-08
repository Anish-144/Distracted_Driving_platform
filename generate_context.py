import os

def generate_context_file(output_file="project_context.txt"):
    root_dir = "."
    ignore_dirs = {".git", "node_modules", "venv", "__pycache__", ".next", "dist", "build", "coverage", ".pytest_cache"}
    ignore_exts = {".pyc", ".pyo", ".pyd", ".so", ".dll", ".exe", ".bin", ".png", ".jpg", ".jpeg", ".gif", ".ico", ".svg", ".mp4", ".mp3", ".wav", ".lock", ".csv", ".db", ".sqlite3"}

    with open(output_file, "w", encoding="utf-8") as outfile:
        for dirpath, dirnames, filenames in os.walk(root_dir):
            # Modify dirnames in-place to ignore specified directories
            dirnames[:] = [d for d in dirnames if d not in ignore_dirs and not d.startswith('.')]

            for filename in filenames:
                # Ignore specific extensions and hidden files
                if any(filename.endswith(ext) for ext in ignore_exts) or filename.startswith('.'):
                    continue
                
                # Only include relevant code and docs files (for safety on size, let's include main text formats)
                valid_exts = {".py", ".ts", ".tsx", ".js", ".jsx", ".md", ".json", ".yml", ".yaml", ".css", ".html"}
                if not any(filename.endswith(ext) for ext in valid_exts):
                    continue
                
                if filename == "package-lock.json" or filename == "yarn.lock" or filename == "poetry.lock":
                    continue

                filepath = os.path.join(dirpath, filename)
                if filepath == f".\\{output_file}" or filepath == f"./{output_file}":
                    continue

                try:
                    with open(filepath, "r", encoding="utf-8") as infile:
                        content = infile.read()
                        
                        outfile.write(f"\\n\\n{'='*80}\\n")
                        outfile.write(f"FILE: {filepath}\\n")
                        outfile.write(f"{'='*80}\\n\\n")
                        outfile.write(content)
                except Exception as e:
                    print(f"Skipping {filepath}: {e}")

if __name__ == "__main__":
    generate_context_file()
