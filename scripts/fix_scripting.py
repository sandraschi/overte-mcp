"""Fix the nested template literal in scripting.tsx."""
BT = chr(96)

path = r"D:\Dev\repos\overte-mcp\webapp\src\pages\scripting.tsx"
with open(path, encoding="utf-8") as f:
    lines = f.readlines()

changes = 0

for i, line in enumerate(lines):
    stripped = line.strip()
    if "setScriptUrl" in stripped and "newName.endsWith" in stripped:
        # Nested template literal: `...${`...`}...`
        new = line.replace(
            stripped,
            'setScriptUrl("http://localhost:11110/scripts/" + (newName.endsWith(".js") ? newName : newName + ".js"));',
        )
        if new != line:
            lines[i] = new
            changes += 1
            print(f"Fixed nested template on line {i+1}")

    # Check for $selectedDetail without braces
    if BT in line and "$selectedDetail" in line:
        new = line.replace("$selectedDetail", "${selectedDetail}")
        if new != line:
            lines[i] = new
            changes += 1
            print(f"Fixed braces on line {i+1}: {repr(new.strip()[:60])}")

if changes:
    with open(path, "w", encoding="utf-8") as f:
        f.writelines(lines)
    print(f"Applied {changes} fixes")
else:
    print("No changes needed")
