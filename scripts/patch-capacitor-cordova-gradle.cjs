const fs = require('node:fs');
const path = require('node:path');

const gradlePath = path.join(
  __dirname,
  '..',
  'android',
  'capacitor-cordova-android-plugins',
  'build.gradle'
);

if (!fs.existsSync(gradlePath)) {
  process.exit(0);
}

const source = fs.readFileSync(gradlePath, 'utf8');

if (source.includes('def localLibDirs =')) {
  process.exit(0);
}

const generatedRepositoriesBlock = /repositories\s*\{\r?\n\s*google\(\)\r?\n\s*mavenCentral\(\)\r?\n\s*flatDir\s*\{\r?\n\s*dirs 'src\/main\/libs', 'libs'\r?\n\s*\}\r?\n\}/;
const patchedRepositoriesBlock = `repositories {
    google()
    mavenCentral()

    def localLibDirs = [file('src/main/libs'), file('libs')].findAll { it.exists() }
    if (!localLibDirs.isEmpty()) {
        flatDir {
            dirs localLibDirs
        }
    }
}`;

const patchedSource = source.replace(generatedRepositoriesBlock, patchedRepositoriesBlock);

if (patchedSource === source) {
  console.warn('Skipped Capacitor Cordova Gradle patch: expected repositories block was not found.');
  process.exit(0);
}

fs.writeFileSync(gradlePath, patchedSource);
