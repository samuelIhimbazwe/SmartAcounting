/**
 * Windows Ninja can fail when CMake object paths exceed MAX_PATH.
 * react-native-reanimated does not set CMAKE_OBJECT_PATH_MAX by default.
 */
import {readFileSync, writeFileSync, existsSync} from 'node:fs';
import {join} from 'node:path';

const cmakePath = join(
  process.cwd(),
  'node_modules',
  'react-native-reanimated',
  'android',
  'CMakeLists.txt',
);

if (process.platform !== 'win32' || !existsSync(cmakePath)) {
  process.exit(0);
}

const marker = 'CMAKE_OBJECT_PATH_MAX';
let content = readFileSync(cmakePath, 'utf8');
if (content.includes(marker)) {
  process.exit(0);
}

const patch = `
# Cursor patch: shorten Ninja object paths on Windows
if(WIN32)
    set(CMAKE_OBJECT_PATH_MAX 128)
endif()
`;

writeFileSync(cmakePath, patch + content, 'utf8');
console.log('patch-reanimated-windows: applied CMAKE_OBJECT_PATH_MAX to reanimated');
