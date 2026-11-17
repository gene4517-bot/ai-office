package dev.homedroid

import android.Manifest
import android.app.AlertDialog
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Build
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.widget.*

/** The phone's calm landing screen. Configuration lives in Settings. */
class MainActivity : MobileActivity() {
    private lateinit var cfg: Config
    private lateinit var headline: TextView
    private lateinit var summary: TextView
    private lateinit var toggle: Button
    private lateinit var battery: TextView
    private lateinit var batteryCaption: TextView
    private lateinit var temperature: TextView
    private lateinit var memory: TextView
    private lateinit var disk: TextView
    private lateinit var address: TextView
    private lateinit var camera: Button
    private lateinit var heat: TextView
    private lateinit var services: LinearLayout
    private val serviceRows = linkedMapOf<String, TextView>()
    private val ui = Handler(Looper.getMainLooper())
    private val tick = object : Runnable {
        override fun run() { refresh(); ui.postDelayed(this, 2000) }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        cfg = Config(this)
        Paths(this).ensure()
        val page = design.page("개요")
        val hero = design.card()
        hero.addView(design.text("서버 상태", 11f, design.accent, true))
        headline = design.text("준비되었습니다", 25f, design.ink, true)
        summary = design.text("", 14f, design.muted)
        hero.addView(headline); hero.addView(summary)
        toggle = design.button("서버 시작", true) {
            if (ServerService.active) {
                AlertDialog.Builder(this).setTitle("서버를 멈출까요?")
                    .setMessage("앱, 원격 접속, 대시보드, 카메라 접근이 모두 멈춥니다.")
                    .setPositiveButton("서버 중지") { _, _ -> ServerService.stop(this); refresh() }
                    .setNegativeButton(android.R.string.cancel, null).show()
            } else { ServerService.start(this); ui.postDelayed(::refresh, 300) }
        }
        hero.addView(toggle)
        hero.addView(design.button("제어판 열기") { DashboardActivity.open(this, "overview") })
        page.addView(hero)
        page.addView(design.label("휴대폰 상태"))
        fun metric(parent: LinearLayout, title: String): TextView {
            val card = design.card()
            val value = design.text("—", 22f, design.ink, true)
            val caption = design.text(title, 12f, design.muted)
            if (title == "배터리") batteryCaption = caption
            card.addView(value); card.addView(caption)
            parent.addView(card, LinearLayout.LayoutParams(0, -2, 1f).apply { setMargins(design.dp(3), 0, design.dp(3), design.dp(6)) })
            return value
        }
        val first = LinearLayout(this)
        battery = metric(first, "배터리"); temperature = metric(first, "온도")
        page.addView(first)
        val second = LinearLayout(this)
        memory = metric(second, "남은 메모리"); disk = metric(second, "남은 저장 공간")
        page.addView(second)
        heat = design.text("휴대폰이 뜨겁습니다. 바람이 잘 통하는 곳에 두고 무거운 작업을 줄이세요.", 14f, design.warning)
        page.addView(heat)
        page.addView(design.label("접속"))
        val connect = design.card()
        connect.addView(design.text("대시보드 주소", 16f, design.ink, true))
        address = design.text("", 14f, design.muted).apply { setTextIsSelectable(true) }
        connect.addView(address)
        connect.addView(design.button("주소 공유") {
            val ip = Device(this).ips.firstOrNull()
            if (ip == null) Toast.makeText(this, "주소를 공유하려면 Wi-Fi에 연결하세요", Toast.LENGTH_SHORT).show()
            else startActivity(Intent.createChooser(Intent(Intent.ACTION_SEND).apply {
                type = "text/plain"; putExtra(Intent.EXTRA_TEXT, "홈드로이드 대시보드: http://$ip:${cfg.dashboardPort}")
            }, "대시보드 주소 공유"))
        })
        connect.addView(design.button("대시보드 로그인") { showCredentials() })
        page.addView(connect)
        page.addView(design.label("서비스"))
        services = design.column(); page.addView(services)
        page.addView(design.row("서비스 로그", "동작을 확인하고 문제를 찾습니다") { showLogs() })
        page.addView(design.label("더 하기"))
        page.addView(design.row("파일·저장 공간", "파일을 보고, 올리고, 관리합니다") { DashboardActivity.open(this, "files") })
        page.addView(design.row("AI·루틴", "모델, 대화, 예약 브리핑") { DashboardActivity.open(this, "ai") })
        page.addView(design.row("배포", "Git 프로젝트를 휴대폰에서 실행합니다") { DashboardActivity.open(this, "deploys") })
        page.addView(design.row("휴대폰", "휴대폰을 연결하고 클러스터를 관리합니다") { DashboardActivity.open(this, "cluster") })
        val cameraCard = design.card()
        cameraCard.addView(design.text("카메라·마이크", 17f, design.ink, true))
        cameraCard.addView(design.text("여기서 접근을 허용한 뒤, 대시보드에서 실시간 화면과 촬영을 사용하세요.", 14f, design.muted))
        camera = design.button("카메라 접근 허용") { toggleCamera() }
        cameraCard.addView(camera)
        cameraCard.addView(design.button("카메라 제어") { DashboardActivity.open(this, "camera") })
        page.addView(cameraCard)
        if (Build.VERSION.SDK_INT >= 33 && checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED)
            requestPermissions(arrayOf(Manifest.permission.POST_NOTIFICATIONS), 1)
        refresh()
    }

    private fun showCredentials() {
        val box = design.column().apply { setPadding(design.dp(24), design.dp(8), design.dp(24), design.dp(8)) }
        val password = design.field(box, "대시보드 비밀번호", cfg.dashboardPassword, secret = true)
        password.isFocusable = false
        design.switch(box, "비밀번호 보기", "다른 기기에서 접속할 때 이 비밀번호를 씁니다.", false) { show ->
            password.transformationMethod = if (show) null else android.text.method.PasswordTransformationMethod.getInstance()
        }
        AlertDialog.Builder(this).setTitle("대시보드 로그인").setView(box).setPositiveButton("확인", null).show()
    }

    private fun showLogs() {
        val daemons = ServerService.supervisor?.daemons.orEmpty()
        val choices = arrayOf("모든 서비스") + daemons.map { it.spec.name }.toTypedArray()
        AlertDialog.Builder(this).setTitle("서비스 로그").setItems(choices) { _, index ->
            val selected = if (index == 0) daemons else listOf(daemons[index - 1])
            val output = selected.flatMap { d -> d.log.tail(80).map { "[${d.spec.name}] $it" } }.joinToString("\n").ifEmpty { "아직 기록이 없습니다. 서버를 시작하면 서비스 로그가 보입니다." }
            val text = design.text(output, 12f).apply { typeface = android.graphics.Typeface.MONOSPACE; setTextIsSelectable(true); setPadding(design.dp(20), design.dp(12), design.dp(20), design.dp(12)) }
            AlertDialog.Builder(this).setTitle(choices[index]).setView(ScrollView(this).apply { addView(text) }).setPositiveButton("확인", null).show()
        }.show()
    }

    private fun toggleCamera() {
        if (CameraService.instance != null) CameraService.stop(this)
        else {
            val permissions = arrayOf(Manifest.permission.CAMERA, Manifest.permission.RECORD_AUDIO)
            if (permissions.all { checkSelfPermission(it) == PackageManager.PERMISSION_GRANTED }) armCamera()
            else requestPermissions(permissions, 2)
        }
        refresh()
    }
    private fun armCamera() {
        cfg.cameraEnabled = true
        try { CameraService.arm(this) } catch (e: Exception) { Toast.makeText(this, "IPCam: ${e.message}", Toast.LENGTH_LONG).show() }
    }
    override fun onRequestPermissionsResult(requestCode: Int, permissions: Array<out String>, grantResults: IntArray) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults)
        if (requestCode == 2) {
            if (grantResults.size == 2 && grantResults.all { it == PackageManager.PERMISSION_GRANTED }) armCamera()
            else Toast.makeText(this, "IPCam을 쓰려면 카메라와 마이크 권한을 허용해 주세요", Toast.LENGTH_LONG).show()
        }
    }
    override fun onResume() { super.onResume(); ui.removeCallbacks(tick); ui.post(tick) }
    override fun onPause() { ui.removeCallbacks(tick); super.onPause() }

    private fun refresh() {
        val sv = ServerService.supervisor
        val running = sv?.daemons.orEmpty().filter { it.state == Supervisor.State.RUNNING }.map { serviceName(it.spec.name) }
        headline.setTextIfChanged(if (sv != null) "서버가 켜져 있습니다" else if (ServerService.active) "서버를 시작하는 중…" else "준비되었습니다")
        summary.setTextIfChanged(if (sv != null) {
            if (running.isEmpty()) "아직 실행 중인 서비스가 없습니다." else "실행 중: ${running.joinToString(" · ")}"
        } else if (ServerService.active) "서비스를 준비하는 중입니다." else "서버를 시작하면 앱이 켜집니다.")
        toggle.setTextIfChanged(if (ServerService.active) "서버 중지" else "서버 시작")
        val dev = Device(this)
        battery.setTextIfChanged(if (dev.batteryPercent < 0) "알 수 없음" else "${dev.batteryPercent}%")
        batteryCaption.setTextIfChanged(if (dev.charging) "배터리 · 충전 중" else "배터리")
        temperature.setTextIfChanged("${dev.batteryTempC} °C")
        memory.setTextIfChanged("%.1f GB".format(dev.ramFreeMb / 1024.0))
        disk.setTextIfChanged("%.1f GB".format(dev.storageFreeMb / 1024.0))
        heat.setVisibleIfChanged(dev.hot)
        address.setTextIfChanged(dev.ips.firstOrNull()?.let { "http://$it:${cfg.dashboardPort}" } ?: "다른 기기에서 접속하려면 Wi-Fi에 연결하세요.")
        camera.setTextIfChanged(if (CameraService.instance == null) "카메라 접근 허용" else "카메라 접근 중지")
        val names = sv?.daemons.orEmpty().map { it.spec.name }
        if (names != serviceRows.keys.toList() || services.childCount == 0) {
            services.removeAllViews(); serviceRows.clear()
            if (names.isEmpty()) services.addView(design.text("서버를 시작하면 서비스가 여기에 표시됩니다.", 14f, design.muted).apply { setPadding(0, 0, 0, design.dp(16)) })
            sv?.daemons?.forEach { daemon ->
                val card = design.card()
                card.addView(design.text(serviceName(daemon.spec.name), 16f, design.ink, true))
                val state = design.text("", 13f, design.muted); serviceRows[daemon.spec.name] = state; card.addView(state)
                card.addView(design.button("서비스 재시작") { ServerService.supervisor?.daemons?.firstOrNull { it.spec.name == daemon.spec.name }?.restart() })
                services.addView(card)
            }
        }
        sv?.daemons?.forEach { d ->
            serviceRows[d.spec.name]?.apply {
                setTextIfChanged(when (d.state) {
                    Supervisor.State.RUNNING -> "실행 중"
                    Supervisor.State.STARTING -> "시작 중…"
                    Supervisor.State.STOPPED -> "중지됨"
                    Supervisor.State.BACKOFF -> "확인이 필요합니다 · 다시 시도 중"
                } + if (d.restarts > 0) " · ${d.restarts}회 재시작" else "")
                setTextColor(if (d.state == Supervisor.State.BACKOFF) design.warning else design.muted)
            }
        }
    }

    private fun serviceName(name: String): String = when (name) {
        "sshd" -> "SSH·SFTP"
        "caddy" -> "웹 호스팅"
        "cloudflared" -> "Cloudflare 터널"
        "tailscaled" -> "Tailscale"
        "ai-llama" -> "AI (llama.cpp)"
        else -> name.replaceFirstChar { it.uppercase() }
    }
}
