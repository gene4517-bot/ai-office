import java.util.Properties

plugins {
    id("com.android.application")
}

dependencies {
    testImplementation("junit:junit:4.13.2")
    testImplementation("org.json:json:20240303")
}

/**
 * Release signing key: from keystore.properties (see keystore.properties.example; never
 * committed) or, in CI, from HOMEDROID_KEYSTORE* environment variables. Without either,
 * release builds use the debug key, which is fine for local testing but can't update an
 * install signed with the real key.
 */
val releaseKey: Map<String, String>? = run {
    val file = rootProject.file("keystore.properties")
    if (file.exists()) {
        val p = Properties().apply { file.inputStream().use(::load) }
        p.stringPropertyNames().associateWith { p.getProperty(it) }
    } else {
        System.getenv("HOMEDROID_KEYSTORE")?.let { path ->
            mapOf(
                "storeFile" to path,
                "storePassword" to System.getenv("HOMEDROID_KEYSTORE_PASSWORD").orEmpty(),
                "storeType" to System.getenv("HOMEDROID_KEYSTORE_TYPE").orEmpty(),
                "keyAlias" to System.getenv("HOMEDROID_KEY_ALIAS").orEmpty(),
                "keyPassword" to System.getenv("HOMEDROID_KEY_PASSWORD").orEmpty(),
            )
        }
    }
}

android {
    namespace = "dev.homedroid"
    compileSdk = 36

    defaultConfig {
        // Hardware checks can run beside the release install without replacing its data.
        // The Korean build has its own id, so it installs beside the English Homedroid and
        // both keep their data; the upstream package stays untouched.
        applicationId = if (providers.gradleProperty("cameraTest").orNull == "true") "dev.homedroid.cameratest" else "dev.homedroid.kr"
        minSdk = 29
        targetSdk = 36
        versionCode = 9041
        versionName = "0.9.4-kr.1"
        testInstrumentationRunner = "dev.homedroid.CameraHardwareTest"
    }

    signingConfigs {
        releaseKey?.let { key ->
            create("release") {
                storeFile = file(key.getValue("storeFile"))
                key["storeType"]?.takeIf { it.isNotBlank() }?.let { storeType = it }
                storePassword = key.getValue("storePassword")
                keyAlias = key.getValue("keyAlias")
                keyPassword = key.getValue("keyPassword")
            }
        }
    }

    buildTypes {
        release {
            isMinifyEnabled = true
            isShrinkResources = true
            proguardFiles(getDefaultProguardFile("proguard-android-optimize.txt"), "proguard-rules.pro")
            signingConfig = signingConfigs.findByName("release") ?: signingConfigs.getByName("debug")
        }
    }

    // The Korean build targets the phones this server runs on: arm64-v8a (Galaxy Note10,
    // S25 Ultra and most Android 10+ phones). The universal APK is the same binaries for
    // anyone who prefers one download.
    splits {
        abi {
            isEnable = true
            reset()
            include("arm64-v8a")
            isUniversalApk = true
        }
    }

    packaging {
        jniLibs {
            // The daemons are executables disguised as lib*.so. They must be extracted to
            // nativeLibraryDir (the only exec-allowed location for targetSdk >= 29) and left unstripped.
            useLegacyPackaging = true
            keepDebugSymbols += "**/*.so"
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
}
