# A second dev server on port 3005 that builds into .next-vibey, so it never touches the .next folder of a server
# already running on port 3000. Stop it with Ctrl+C; delete .next-vibey afterwards if you like.
$env:NEXT_DIST_DIR = '.next-vibey'
npx next dev -p 3005
