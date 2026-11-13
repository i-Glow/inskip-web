import fs from 'node:fs'
import path from 'node:path'

// import.meta.url is not a file: URL under jsdom, so resolve from the project root.
export function readFixture(name: string): string {
  return fs.readFileSync(path.resolve(process.cwd(), 'test/fixtures', name), 'utf8')
}
