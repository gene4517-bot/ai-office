package dev.homedroid

import android.app.AlertDialog
import android.content.Intent
import android.graphics.Typeface
import android.net.Uri
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.view.View
import android.widget.Button
import android.widget.LinearLayout
import android.widget.ScrollView
import android.widget.TextView
import android.widget.Toast
import java.io.File

/** The app directory: install, open and remove apps that run inside Alpine. */
class AppsActivity : MobileActivity() {
    private lateinit var apps: Apps
    private lateinit var cfg: Config

    // A location picked before storage access was granted, applied once it is.
    private var pending: Pair<AppDef, File>? = null
    private val rows = mutableListOf<Row>()
    private lateinit var jobLog: TextView

    private val ui = Handler(Looper.getMainLooper())
    private val tick = object : Runnable {
        override fun run() {
            refresh()
            ui.postDelayed(this, 1000)
        }
    }

    companion object {
        private const val CLEAR_TEXT =
            "설정·계정·데이터베이스를 지우고 새로 설치한 상태로 시작합니다."
        private val ERROR = Regex("error|exception|fatal|failed|insufficient|denied", RegexOption.IGNORE_CASE)
    }

    private class Row(
        val app: AppDef,
        val status: TextView,
        val storage: TextView?,
        val action: Button,
        val open: Button,
        val toggle: Button,
        val clear: Button,
    )

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        apps = Apps(this, Paths(this))
        cfg = Config(this)

        val list = design.page("앱")
        list.addView(design.row("모듈·연결", "SSH, 웹 호스팅, 터널, 카메라, AI를 관리합니다") { DashboardActivity.open(this, "modules") })
        list.addView(design.label("앱 목록"))
        for (app in apps.catalog) list.addView(card(app))
        jobLog = text("", 10f).apply {
            typeface = Typeface.MONOSPACE
            setTextIsSelectable(true)
            setPadding(dp(16), dp(16), dp(16), dp(16))
            background = design.shape(design.surface, 12)
        }
        list.addView(design.button("설치 진행 상황") {
            jobLog.visibility = if (jobLog.visibility == View.VISIBLE) View.GONE else View.VISIBLE
        })
        jobLog.visibility = View.GONE
        list.addView(jobLog)
    }

    override fun onResume() {
        super.onResume()
        applyPendingIfAllowed()
        ui.post(tick)
    }

    override fun onRequestPermissionsResult(requestCode: Int, permissions: Array<String>, grantResults: IntArray) {
        if (requestCode == Storage.REQUEST_CODE) applyPendingIfAllowed()
    }

    override fun onPause() {
        ui.removeCallbacks(tick)
        super.onPause()
    }

    private fun card(app: AppDef): View {
        val box = design.card()
        box.addView(design.text(app.name, 21f, design.ink, true))
        box.addView(text(app.description.substringBefore(". ").let { if (it.endsWith('.')) it else "$it." }, 14f))
        box.addView(design.text("${app.port}번 포트 · ${app.size}", 12f, design.muted).apply { setPadding(0, dp(8), 0, 0) })
        val status = design.text("", 13f, design.accent, true).apply { setPadding(0, dp(8), 0, dp(4)) }
        box.addView(status)
        val storage = app.storagePath?.let { text("", 12f).also(box::addView) }

        val buttons = LinearLayout(this).apply { orientation = LinearLayout.HORIZONTAL }
        val action = design.button("설치") {}
        val open = design.button("열기", true) {
            startActivity(Intent(Intent.ACTION_VIEW, Uri.parse("http://127.0.0.1:${app.port}")))
        }
        val toggle = design.button("끄기") {
            cfg.setDisabled(app.id, !cfg.isDisabled(app.id))
            if (ServerService.running) ServerService.restart(this@AppsActivity)
        }
        val clear = design.button("데이터 지우기") { confirmClear(app) }
        fun addButton(row: LinearLayout, button: Button) {
            row.addView(button, LinearLayout.LayoutParams(0, -2, 1f).apply {
                setMargins(dp(3), dp(12), dp(3), 0)
            })
        }
        addButton(buttons, action)
        addButton(buttons, open)
        addButton(buttons, toggle)
        val more = LinearLayout(this).apply { orientation = LinearLayout.HORIZONTAL }
        addButton(more, clear)
        box.addView(buttons)
        box.addView(more)
        if (app.storagePath != null) {
            addButton(more, design.button("저장 위치") { chooseStorage(app) })
        }
        rows += Row(app, status, storage, action, open, toggle, clear)
        return box
    }

    private fun refresh() {
        val busy = Jobs.running
        val running = ServerService.supervisor?.daemons.orEmpty().associateBy { it.spec.name }
        for (row in rows) {
            val installed = apps.isInstalled(row.app)
            // A multi-service app is as healthy as its least healthy process.
            val d = row.app.serviceNames.mapNotNull { running[it] }.maxByOrNull { it.state.severity() }
                ?.takeIf { row.app.serviceNames.all { n -> running.containsKey(n) } }
            row.status.setTextIfChanged(when {
                busy && Jobs.title?.endsWith(row.app.name) == true -> "${Jobs.title}…"
                !installed -> "설치 안 됨"
                cfg.isDisabled(row.app.id) -> "설치됨 · 꺼짐"
                d == null -> "설치됨 · 서버 중지"
                else -> "설치됨 · " + when (d.state) { Supervisor.State.RUNNING -> "실행 중"; Supervisor.State.STARTING -> "시작 중"; Supervisor.State.STOPPED -> "중지됨"; Supervisor.State.BACKOFF -> "확인 필요" } +
                    (if (d.restarts > 0) " (${d.restarts}회 재시작)" else "") +
                    // A crash loop is useless without its reason.
                    (if (d.state == Supervisor.State.BACKOFF) "\n" + lastError(d) else "") +
                    notice(row.app, d)
            })
            row.storage?.setTextIfChanged(
                "${row.app.storageLabel}: " + (cfg.storageDir(row.app) ?: "앱 내부 (기본)")
            )
            row.open.setVisibleIfChanged(installed && !cfg.isDisabled(row.app.id) && d?.state == Supervisor.State.RUNNING)
            row.toggle.setVisibleIfChanged(installed)
            row.clear.setVisibleIfChanged(installed)
            if (row.clear.isEnabled == busy) row.clear.isEnabled = !busy
            row.toggle.isEnabled = !busy
            row.toggle.setTextIfChanged(if (cfg.isDisabled(row.app.id)) "켜기" else "끄기")
            if (row.action.isEnabled == busy) row.action.isEnabled = !busy
            row.action.setTextIfChanged(if (installed) "삭제" else "설치")
            row.action.setOnClickListener {
                if (installed) confirmRemove(row.app) else ServerService.install(this, row.app)
            }
        }
        jobLog.setTextIfChanged(Jobs.log.tail(40).joinToString("\n").ifEmpty { "아직 설치 활동이 없습니다." })
    }

    private fun chooseStorage(app: AppDef) {
        val volumes = Storage.volumes(this)
        val labels = listOf("앱 내부 (기본, 권한 필요 없음)") +
            volumes.map {
                "${it.label} · ${formatSize(it.free)} 남음" +
                    if (it.appDirOnly) " (홈드로이드를 삭제하면 함께 지워짐)" else ""
            }
        AlertDialog.Builder(this)
            .setTitle("${app.name}의 ${app.storageLabel?.lowercase()}을 어디에 둘까요?")
            .setItems(labels.toTypedArray()) { _, i ->
                if (i == 0) {
                    setStorage(app, null)
                    return@setItems
                }
                val volume = volumes[i - 1]
                val dir = Storage.folderOn(volume, app)
                if (!Storage.needsAccess(volume) || Storage.hasAccess(this)) {
                    setStorage(app, dir)
                } else {
                    pending = app to dir
                    Toast.makeText(this, "${app.name}이 ${dir}을 쓰려면 파일 접근을 허용해 주세요", Toast.LENGTH_LONG).show()
                    Storage.requestAccess(this)
                }
            }
            .show()
    }

    private fun applyPendingIfAllowed() {
        val (app, dir) = pending ?: return
        if (!Storage.hasAccess(this)) return
        pending = null
        setStorage(app, dir)
    }

    private fun setStorage(app: AppDef, dir: File?) {
        if (dir != null && !dir.isDirectory && !dir.mkdirs()) {
            Toast.makeText(this, "$dir 폴더를 만들지 못했습니다", Toast.LENGTH_LONG).show()
            return
        }
        cfg.setStorageDir(app, dir?.path)
        if (ServerService.running) ServerService.restart(this)
        val sharing = apps.catalog.filter { it.storageKey == app.storageKey && it != app }.joinToString { it.name }
        Toast.makeText(
            this,
            "${app.name}${if (sharing.isEmpty()) "" else " 및 $sharing"}이 이제 ${dir ?: "앱 저장 공간"}을 씁니다. " +
                "기존 파일은 옮기지 않았습니다.",
            Toast.LENGTH_LONG,
        ).show()
    }

    private fun confirmRemove(app: AppDef) {
        val options = listOf("설정과 데이터베이스도 함께 삭제") + listOfNotNull(libraryOption(app))
        val checked = BooleanArray(options.size)
        AlertDialog.Builder(this)
            .setTitle("${app.name}을 삭제할까요?")
            .setMultiChoiceItems(options.toTypedArray(), checked) { _, i, on -> checked[i] = on }
            .setPositiveButton("삭제") { _, _ ->
                val library = checked.getOrElse(1) { false }
                ServerService.uninstall(this, app, deleteData = checked[0] || library, deleteLibrary = library)
            }
            .setNegativeButton(android.R.string.cancel, null)
            .show()
    }

    /** Resets an app to a fresh install, like Android's "Clear storage". */
    private fun confirmClear(app: AppDef) {
        val option = libraryOption(app)
        val checked = BooleanArray(1)
        AlertDialog.Builder(this)
            .setTitle("${app.name}의 데이터를 지울까요?")
            .apply {
                // A dialog can't show both a message and a checkbox list.
                if (option == null) setMessage(CLEAR_TEXT)
                else setMultiChoiceItems(arrayOf(option), checked) { _, _, on -> checked[0] = on }
            }
            .setPositiveButton("데이터 지우기") { _, _ -> ServerService.clearData(this, app, checked[0]) }
            .setNegativeButton(android.R.string.cancel, null)
            .show()
    }

    /** The checkbox label for deleting [app]'s library, naming apps that share it; null if it has none. */
    private fun libraryOption(app: AppDef): String? {
        val label = app.storageLabel?.lowercase() ?: return null
        val sharing = apps.sharing(app).joinToString { it.name }
        return "$label 안의 파일도 함께 삭제" + if (sharing.isEmpty()) "" else " (${sharing}도 함께 사용)"
    }

    private fun Supervisor.State.severity() = when (this) {
        Supervisor.State.RUNNING -> 0
        Supervisor.State.STARTING -> 1
        Supervisor.State.STOPPED -> 2
        Supervisor.State.BACKOFF -> 3
    }

    /** The app's notice (see [AppDef.noticePattern]) from its recent output, if any. */
    private fun notice(app: AppDef, d: Supervisor.Daemon): String {
        val pattern = app.noticePattern ?: return ""
        val match = d.log.tail(400).asReversed().firstNotNullOfOrNull { pattern.find(it) } ?: return ""
        return "\n" + app.noticeText.orEmpty().replace("$1", match.groupValues.getOrElse(1) { "" })
    }

    /** The most telling recent log line of a crash-looping daemon. */
    private fun lastError(d: Supervisor.Daemon): String {
        val lines = d.log.tail(40).filterNot { it.startsWith("! ") || it.startsWith("proot ") || it.startsWith("   at ") }
        return lines.lastOrNull { ERROR.containsMatchIn(it) } ?: lines.lastOrNull().orEmpty()
    }

    private fun formatSize(bytes: Long) =
        if (bytes >= 1L shl 30) "%.1f GB".format(bytes / (1L shl 30).toDouble()) else "${bytes shr 20} MB"

    private fun text(s: String, sp: Float) = design.text(s, sp, design.muted)

    private fun dp(v: Int) = (v * resources.displayMetrics.density).toInt()
}
