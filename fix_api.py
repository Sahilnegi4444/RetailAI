with open('client/src/api.js', 'r', encoding='utf-8') as f:
    lines = f.readlines()

new_lines = []
for i, line in enumerate(lines):
    if line.strip() == 'category,' and 'url: `${API_BASE_URL}/upload-data`' in lines[i+1]:
        # We found the corrupted area. Insert the correct block before it.
        new_lines.append('// Upload monthly data\n')
        new_lines.append('export const uploadMonthlyData = async (file, year, month, category, force = false) => {\n')
        new_lines.append('  const formData = new FormData();\n')
        new_lines.append('  formData.append("file", file);\n')
        new_lines.append('  formData.append("year", String(year));\n')
        new_lines.append('  formData.append("month", String(month));\n')
        new_lines.append('  formData.append("category", category);\n')
        new_lines.append('  if (force) formData.append("force", "true");\n\n')
        new_lines.append('  console.log("📤 Uploading file:", {\n')
        new_lines.append('    filename: file.name,\n')
        new_lines.append('    size: file.size,\n')
        new_lines.append('    year,\n')
        new_lines.append('    month,\n')
        new_lines.append(line)
    else:
        new_lines.append(line)

with open('client/src/api.js', 'w', encoding='utf-8') as f:
    f.writelines(new_lines)
print('Fixed api.js')
