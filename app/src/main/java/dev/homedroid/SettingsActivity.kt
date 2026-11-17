package dev.homedroid

import android.app.AlertDialog
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.os.PowerManager
import android.provider.Settings
import android.widget.*
import java.io.File

/** Phone settings apply at the point of interaction; dialogs keep edits explicit. */
class SettingsActivity : MobileActivity() {
    private lateinit var cfg: Config
    private lateinit var backgroundStatus: TextView
    private var renderedSettings = ""
    private fun signature() = listOf(cfg.sshEnabled, cfg.webEnabled, cfg.tailscaleEnabled, cfg.autostart).joinToString()

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        cfg = Config(this)
        val page = design.page("설정")
        page.addView(design.label("환경 설정"))
        page.addView(design.row("화면 모드", "${cfg.appearance.replaceFirstChar { it.uppercase() }} · 밝게, 어둡게 또는 휴대폰 설정 따르기") {
            val values = arrayOf("system", "light", "dark")
            AlertDialog.Builder(this).setTitle("화면 모드")
                .setSingleChoiceItems(arrayOf("휴대폰 설정 따르기", "밝게", "어둡게"), values.indexOf(cfg.appearance)) { dialog, index ->
                    cfg.appearance = values[index]; dialog.dismiss(); recreate()
                }.setNegativeButton(android.R.string.cancel, null).show()
        })
        val startup = design.card()
        design.switch(startup, "부팅할 때 시작", "휴대폰이 다시 켜지면 서버도 함께 시작합니다.", cfg.autostart) { cfg.autostart = it }
        page.addView(startup)
        page.addView(design.label("서비스·연결"))
        val modules = design.card()
        modules.addView(design.text("변경하면 실행 중인 서비스가 다시 시작됩니다.", 13f, design.muted))
        design.switch(modules, "SSH·SFTP", "보안 셸과 파일 전송 · ${cfg.sshPort}번 포트", cfg.sshEnabled) { cfg.sshEnabled = it; applyServices() }
        design.switch(modules, "웹 호스팅", "Caddy로 웹사이트를 서비스 · ${cfg.webPort}번 포트", cfg.webEnabled) { cfg.webEnabled = it; applyServices() }
        design.switch(modules, "Tailscale", "내 기기에서 어디서나 사적으로 접속합니다.", cfg.tailscaleEnabled) { cfg.tailscaleEnabled = it; applyServices() }
        page.addView(modules)
        page.addView(design.row("Tailscale 설정", "기기 이름과 인증 키 (선택)") { editTailscale() })
        page.addView(design.row("Cloudflare 터널", "터널 토큰으로 연결하거나 해제합니다") { editTunnel() })
        page.addView(design.row("모든 모듈", "AI, 카메라, 고급 네트워크 옵션") { DashboardActivity.open(this, "modules") })
        page.addView(design.label("접근·보안"))
        page.addView(design.row("대시보드 비밀번호", "비밀번호를 바꾸고 브라우저 세션을 로그아웃합니다") { editPassword() })
        page.addView(design.row("SSH 공개 키", "이 휴대폰에 접속할 수 있는 키를 정합니다") { editKeys() })
        page.addView(design.row("터미널·접속 기록", "셸을 열고 최근 접속을 확인합니다") { DashboardActivity.open(this, "ssh") })
        page.addView(design.label("휴대폰·권한"))
        val background = design.card()
        background.addView(design.text("백그라운드 실행", 17f, design.ink, true))
        backgroundStatus = design.text("", 14f, design.muted); background.addView(backgroundStatus)
        background.addView(design.button("배터리 설정") {
            val pm = getSystemService(PowerManager::class.java)
            val intent = if (pm.isIgnoringBatteryOptimizations(packageName)) Intent(Settings.ACTION_IGNORE_BATTERY_OPTIMIZATION_SETTINGS)
                else Intent(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS, Uri.parse("package:$packageName"))
            systemSettings(intent)
        })
        page.addView(background)
        page.addView(design.row("앱 권한", "카메라, 마이크, 알림") {
            systemSettings(Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS, Uri.parse("package:$packageName")))
        })
        page.addView(design.row("저장 공간 접근", "휴대폰 저장 공간, SD카드, USB 접근을 허용합니다") { Storage.requestAccess(this) })
        if (Build.VERSION.SDK_INT >= 31) page.addView(design.row("서비스 안정적으로 유지", "안드로이드 백그라운드 프로세스 설정 (한 번만)") {
            val text = design.text(getString(R.string.phantom_tip), 14f).apply { setTextIsSelectable(true); setPadding(design.dp(24), design.dp(12), design.dp(24), design.dp(12)) }
            AlertDialog.Builder(this).setTitle("백그라운드 프로세스 설정").setView(ScrollView(this).apply { addView(text) }).setPositiveButton("Done", null).show()
        })
        page.addView(design.label("정보"))
        page.addView(design.row("앱 업데이트", "새 버전을 확인하거나 APK로 설치합니다") { DashboardActivity.open(this, "settings") })
        val version = packageManager.getPackageInfo(packageName, 0).versionName.orEmpty()
        page.addView(design.text("홈드로이드 KR $version\n쓰지 않던 휴대폰이 홈서버가 됩니다.", 13f, design.muted).apply { setPadding(design.dp(2), design.dp(16), 0, 0) })
        renderedSettings = signature()
    }

    override fun onResume() {
        super.onResume()
        if (renderedSettings != signature()) { recreate(); return }
        backgroundStatus.setTextIfChanged(if (getSystemService(PowerManager::class.java).isIgnoringBatteryOptimizations(packageName))
            "홈드로이드의 배터리 최적화가 해제되어 있습니다." else "화면이 꺼져도 서버가 살아 있도록 백그라운드 실행을 허용해 주세요.")
    }
    override fun onPause() { renderedSettings = signature(); super.onPause() }
    private fun systemSettings(intent: Intent) {
        try { startActivity(intent) } catch (_: android.content.ActivityNotFoundException) {
            startActivity(Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS, Uri.parse("package:$packageName")))
        }
    }
    private fun applyServices() { if (ServerService.active) ServerService.restart(this) }
    private fun saved() { Toast.makeText(this, "설정을 저장했습니다", Toast.LENGTH_SHORT).show() }
    private fun editor(title: String, build: (LinearLayout) -> (() -> Boolean)) {
        val content = design.column().apply { setPadding(design.dp(24), design.dp(4), design.dp(24), design.dp(20)) }
        val save = build(content)
        val dialog = AlertDialog.Builder(this).setTitle(title).setView(ScrollView(this).apply { addView(content) })
            .setPositiveButton("저장", null).setNegativeButton(android.R.string.cancel, null).create()
        dialog.setOnShowListener {
            dialog.getButton(AlertDialog.BUTTON_POSITIVE).setOnClickListener {
                try { if (save()) { saved(); dialog.dismiss() } }
                catch (e: Exception) { Toast.makeText(this, e.message ?: "설정을 저장하지 못했습니다", Toast.LENGTH_LONG).show() }
            }
        }
        dialog.show()
    }
    private fun editTunnel() = editor("Cloudflare 터널") { box ->
        box.addView(design.text("터널 토큰을 붙여 넣으면 연결됩니다. 비우면 연결이 해제됩니다. 저장하면 실행 중인 서비스가 다시 시작됩니다.", 14f, design.muted))
        val token = design.field(box, "터널 토큰", cfg.tunnelToken, secret = true)
        val save: () -> Boolean = { cfg.tunnelToken = token.text.toString().trim(); applyServices(); true }
        save
    }
    private fun editTailscale() = editor("Tailscale 설정") { box ->
        box.addView(design.text("인증 키가 없으면 제어판 → 모듈 → Tailscale의 로그인 링크를 쓰세요. 변경하면 실행 중인 서비스가 다시 시작됩니다.", 14f, design.muted))
        val host = design.field(box, "기기 이름", cfg.tailscaleHostname)
        val key = design.field(box, "인증 키 (선택)", cfg.tailscaleAuthKey, secret = true)
        val save: () -> Boolean = {
            val value = host.text.toString().trim().lowercase()
            if (!PhoneSettings.validHostname(value)) { host.error = "영문·숫자·하이픈으로 1~63자, 처음과 끝은 영문이나 숫자여야 합니다"; false }
            else { cfg.tailscaleHostname = value; cfg.tailscaleAuthKey = key.text.toString().trim(); applyServices(); true }
        }
        save
    }
    private fun editPassword() = editor("대시보드 비밀번호") { box ->
        box.addView(design.text("12~128자로 정하세요. 저장하면 기존 브라우저 세션은 로그아웃됩니다.", 14f, design.muted))
        val password = design.field(box, "새 비밀번호", "", secret = true)
        val confirm = design.field(box, "새 비밀번호 확인", "", secret = true)
        val save: () -> Boolean = {
            val value = password.text.toString()
            when {
                !PhoneSettings.validPassword(value) -> { password.error = "제어 문자 없이 12~128자로 정하세요"; false }
                value != confirm.text.toString() -> { confirm.error = "비밀번호가 서로 다릅니다"; false }
                else -> { Dashboard.changePasswordFromPhone(this, value); true }
            }
        }
        save
    }
    private fun editKeys() = editor("SSH 공개 키") { box ->
        box.addView(design.text("authorized_keys 항목을 한 줄에 하나씩 넣으세요. 공개 키만 붙여 넣어야 합니다. 변경은 새 접속부터 바로 적용됩니다.", 14f, design.muted))
        val paths = Paths(this)
        val keys = design.field(box, "등록된 키", paths.authorizedKeys.takeIf { it.exists() }?.readText().orEmpty(), multiline = true)
        keys.typeface = android.graphics.Typeface.MONOSPACE; keys.textSize = 12f
        val save: () -> Boolean = {
            val value = keys.text.toString().trim()
            require(!value.contains("PRIVATE KEY")) { "개인 키가 아니라 공개 키를 붙여 넣으세요" }
            paths.authorizedKeys.parentFile!!.mkdirs()
            val tmp = File(paths.authorizedKeys.path + ".phone.tmp")
            tmp.writeText(if (value.isEmpty()) "" else "$value\n")
            check(tmp.renameTo(paths.authorizedKeys)) { "SSH 키를 저장하지 못했습니다" }
            true
        }
        save
    }
}
