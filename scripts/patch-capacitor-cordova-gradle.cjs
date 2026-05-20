const fs = require('node:fs');
const path = require('node:path');

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

const patchCordovaGradle = () => {
  const gradlePath = path.join(
    __dirname,
    '..',
    'android',
    'capacitor-cordova-android-plugins',
    'build.gradle'
  );

  if (!fs.existsSync(gradlePath)) {
    return;
  }

  const source = fs.readFileSync(gradlePath, 'utf8');

  if (source.includes('def localLibDirs =')) {
    return;
  }

  const patchedSource = source.replace(generatedRepositoriesBlock, patchedRepositoriesBlock);

  if (patchedSource === source) {
    console.warn('Skipped Capacitor Cordova Gradle patch: expected repositories block was not found.');
    return;
  }

  fs.writeFileSync(gradlePath, patchedSource);
};

const patchCapacitorShareGradle = () => {
  const shareGradlePath = path.join(
    __dirname,
    '..',
    'node_modules',
    '@capacitor',
    'share',
    'android',
    'build.gradle'
  );

  if (!fs.existsSync(shareGradlePath)) {
    return;
  }

  const source = fs.readFileSync(shareGradlePath, 'utf8');
  const patchedSource = source.replaceAll(
    "getDefaultProguardFile('proguard-android.txt')",
    "getDefaultProguardFile('proguard-android-optimize.txt')"
  );

  if (patchedSource !== source) {
    fs.writeFileSync(shareGradlePath, patchedSource);
  }
};

patchCordovaGradle();
patchCapacitorShareGradle();
