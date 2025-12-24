import sys

# Read the file
with open('src/components/MatchDashboard.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Remove the duplicate props from LiveViewer (lines 905-914)
# We need to find the LiveViewer section and remove the extra props
lines = content.split('\n')
new_lines = []
skip_until_close = False
in_live_viewer = False

for i, line in enumerate(lines):
    # Check if we're in the LiveViewer component
    if '<LiveViewer' in line:
        in_live_viewer = True
    
    # If we're in LiveViewer and hit the problematic setStriker line, skip until />
    if in_live_viewer and 'setStriker={setStriker}' in line and i > 900:
        skip_until_close = True
        continue
    
    if skip_until_close:
        if '/>' in line:
            # Add the closing tag
            new_lines.append(line)
            skip_until_close = False
            in_live_viewer = False
        continue
    
    new_lines.append(line)

# Write back
with open('src/components/MatchDashboard.tsx', 'w', encoding='utf-8', newline='') as f:
    f.write('\n'.join(new_lines))

print("Fixed LiveViewer props successfully!")
