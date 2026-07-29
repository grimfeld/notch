// Patches the Tauri-generated Android Gradle config to sign release builds
// with the keystore described in gen/android/keystore.properties.
//
// `tauri android init` regenerates gen/android in CI, so this runs there,
// right after init and before `tauri android build`.
import { readFileSync, writeFileSync, existsSync } from "node:fs";

const path = "src-tauri/gen/android/app/build.gradle.kts";
if (!existsSync(path)) {
  console.error(`${path} not found — run \`tauri android init\` first`);
  process.exit(1);
}

let gradle = readFileSync(path, "utf8");

if (gradle.includes("keystore.properties")) {
  console.log("signing already patched, nothing to do");
  process.exit(0);
}

const header = `import java.util.Properties
import java.io.FileInputStream

val keystorePropertiesFile = rootProject.file("keystore.properties")
val keystoreProperties = Properties()
if (keystorePropertiesFile.exists()) {
    keystoreProperties.load(FileInputStream(keystorePropertiesFile))
}

`;
gradle = header + gradle;

const signingBlock = `android {
    signingConfigs {
        create("release") {
            keyAlias = keystoreProperties["keyAlias"] as String
            keyPassword = keystoreProperties["password"] as String
            storeFile = file(keystoreProperties["storeFile"] as String)
            storePassword = keystoreProperties["password"] as String
        }
    }`;

if (!/android \{/.test(gradle)) {
  console.error("could not find `android {` block in build.gradle.kts");
  process.exit(1);
}
gradle = gradle.replace(/android \{/, signingBlock);

if (gradle.includes('signingConfigs.getByName("debug")')) {
  gradle = gradle.replaceAll(
    'signingConfigs.getByName("debug")',
    'signingConfigs.getByName("release")',
  );
} else if (/getByName\("release"\) \{/.test(gradle)) {
  gradle = gradle.replace(
    /getByName\("release"\) \{/,
    'getByName("release") {\n            signingConfig = signingConfigs.getByName("release")',
  );
} else {
  console.error("could not find a release buildType to attach signing to");
  process.exit(1);
}

writeFileSync(path, gradle);
console.log("patched", path);
