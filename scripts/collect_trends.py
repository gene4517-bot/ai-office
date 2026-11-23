#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
데일리 트렌드 뷰어 — 데이터 수집기 (무료·공개 소스 전용, 인증 불필요)

수집 소스
  1) 구글 트렌드 한국 일일 급상승 검색어 RSS   (trends.google.com/trending/rss?geo=KR)
  2) 유튜브 공개 검색 결과 (살림·가전·AI·핫딜 키워드)
  3) 구글 뉴스 한국 주요 뉴스 RSS              (news.google.com/rss)
  4) 뽐뿌 게시판 RSS (커뮤니티 핫딜)           (ppomppu.co.kr/rss.php?id=ppomppu)

외부 유료 API·키·로그인을 쓰지 않습니다. 표준 라이브러리만 사용합니다.
출력: 저장소 루트의 trends-data.json
"""

import html
import json
import os
import re
import sys
import time
import urllib.parse
import urllib.request
import xml.etree.ElementTree as ET
from datetime import datetime, timedelta, timezone

KST = timezone(timedelta(hours=9))
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "trends-data.json")

UA = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
)
HEADERS = {
    "User-Agent": UA,
    "Accept-Language": "ko-KR,ko;q=0.9,en;q=0.6",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
}

# ---------------------------------------------------------------- 공통 도우미


def log(msg):
    print(msg, flush=True)


def fetch(url, timeout=30, accept_encoding=None):
    req = urllib.request.Request(url, headers=HEADERS)
    with urllib.request.urlopen(req, timeout=timeout) as r:
        raw = r.read()
    return raw


def text_of(el, path, ns=None):
    if el is None:
        return ""
    node = el.find(path, ns or {})
    if node is None:
        return ""
    return (node.text or "").strip()


def clean(s):
    s = html.unescape(s or "")
    s = re.sub(r"\s+", " ", s).strip()
    return s


def parse_rfc822(s):
    """Mon, 23 Nov 2026 22:05:10 GMT -> datetime(KST) 또는 None"""
    if not s:
        return None
    s = s.strip()
    for fmt in ("%a, %d %b %Y %H:%M:%S %z", "%a, %d %b %Y %H:%M:%S %Z", "%Y-%m-%dT%H:%M:%S%z"):
        try:
            dt = datetime.strptime(s, fmt)
            if dt.tzinfo is None:
                dt = dt.replace(tzinfo=timezone.utc)
            return dt.astimezone(KST)
        except ValueError:
            continue
    return None


def korean_date(dt):
    if not dt:
        return ""
    return f"{dt.month}월 {dt.day}일"


def rel_label(dt, now):
    if not dt:
        return ""
    diff = now - dt
    mins = diff.total_seconds() / 60
    if mins < 60:
        return f"{max(1, int(mins))}분 전"
    if mins < 60 * 24:
        return f"{int(mins // 60)}시간 전"
    days = int(mins // (60 * 24))
    if days == 1:
        return "어제"
    if days < 8:
        return f"{days}일 전"
    return korean_date(dt)


# ---------------------------------------------------------------- 분류

CATEGORY_RULES = [
    ("쇼핑·특가", [
        "핫딜", "특가", "할인", "쿠폰", "세일", "무료배송", "최저가", "공동구매", "공구",
        "경품", "증정", "1+1", "떨이", "반값", "초특가", "득템", "가격", "무배", "품절",
    ]),
    ("AI·테크", [
        "ai", "에이전트", "인공지능", "챗gpt", "gpt", "클로드", "제미나이", "제미니", "llm",
        "갤럭시", "아이폰", "스마트폰", "노트북", "반도체", "엔비디아", "로봇", "테크",
        "코딩", "프로그래밍", "해킹", "보안", "전기차", "자율주행", "통신",
        "요금제", "유튜브", "인스타", "틱톡", "넷플릭스", "플랫폼", "메타", "구글",
    ]),
    ("생활살림", [
        "살림", "청소", "주방", "정리", "수납", "요리", "레시피", "빨래", "세탁", "냉장고",
        "김치", "반찬", "육아", "인테리어", "가전", "건조기", "에어컨", "난방", "보일러",
        "이불", "재활용", "장보기", "집밥", "꿀팁", "다이소", "이케아", "텃밭", "식물",
        "반려", "강아지", "고양이", "다이어트", "집들이", "이사",
    ]),
]
DEFAULT_CATEGORY = "이슈"


def classify(*texts):
    """제목 위주로 분류합니다(설명글은 점수를 반만 반영)."""
    title = (texts[0] if texts else "").lower()
    rest = " ".join(t for t in texts[1:] if t).lower()
    best, best_score = DEFAULT_CATEGORY, 0
    for name, words in CATEGORY_RULES:
        score = 0.0
        for w in words:
            if w in title:
                score += 2
            elif w in rest:
                score += 0.5
        if score > best_score:
            best, best_score = name, score
    return best


# ---------------------------------------------------------------- 소스 1: 구글 트렌드

GT_NS = {"ht": "https://trends.google.com/trending/rss"}


def collect_google_trends(now):
    items = []
    raw = fetch("https://trends.google.com/trending/rss?geo=KR")
    root = ET.fromstring(raw)
    rank = 0
    for it in root.iter("item"):
        title = clean(text_of(it, "title"))
        if not title:
            continue
        rank += 1
        traffic = clean(text_of(it, "ht:approx_traffic", GT_NS))
        picture = clean(text_of(it, "ht:picture", GT_NS))
        pic_source = clean(text_of(it, "ht:picture_source", GT_NS))
        pub = parse_rfc822(text_of(it, "pubDate"))
        news = []
        for ni in it.findall("ht:news_item", GT_NS):
            ntitle = clean(text_of(ni, "ht:news_item_title", GT_NS))
            nurl = clean(text_of(ni, "ht:news_item_url", GT_NS))
            nsrc = clean(text_of(ni, "ht:news_item_source", GT_NS))
            if ntitle:
                news.append({"title": ntitle, "url": nurl, "source": nsrc})
        url = news[0]["url"] if news and news[0]["url"] else (
            "https://trends.google.com/trends/explore?geo=KR&q=" + urllib.parse.quote(title)
        )
        desc = news[0]["title"] if news else ""
        source = news[0]["source"] if news and news[0]["source"] else pic_source
        items.append({
            "id": "gt-" + str(rank),
            "platform": "google_trends",
            "platform_label": "구글트렌드",
            "category": classify(title, desc),
            "rank": rank,
            "title": title,
            "desc": desc,
            "url": url,
            "thumb": picture,
            "stat": (f"검색량 {traffic}" if traffic else ""),
            "source": source or "구글 트렌드",
            "published": pub.isoformat() if pub else "",
            "date_label": rel_label(pub, now),
            "news": news[:2],
        })
    return items


# ---------------------------------------------------------------- 소스 2: 유튜브

YT_QUERIES = [
    ("살림 꿀팁", "생활살림"),
    ("주방 정리 수납", "생활살림"),
    ("가전 추천", "생활살림"),
    ("AI 활용 방법", "AI·테크"),
    ("핫딜 특가", "쇼핑·특가"),
    ("속보 이슈", "이슈"),
]
# 이번 주 업로드만 · 최신순 (YouTube 필터 코드)
SP_THIS_WEEK = "EgIIAw%3D%3D"

YT_INIT_RE = re.compile(r"var ytInitialData = (\{.*?\});</script>", re.S)
RECENT_DAYS = 10


def parse_count(s):
    """'조회수 238.2만회' / '조회수 11,163회' -> int"""
    if not s:
        return 0
    m = re.search(r"([\d,\.]+)\s*(억|만|천)?", s)
    if not m:
        return 0
    try:
        n = float(m.group(1).replace(",", ""))
    except ValueError:
        return 0
    unit = m.group(2)
    mult = {"억": 100000000, "만": 10000, "천": 1000}.get(unit, 1)
    return int(n * mult)


def published_days(s):
    """'3일 전' -> 3, '5시간 전' -> 0, '2주 전' -> 14, '1년 전' -> 365, 모르면 9999"""
    if not s:
        return 9999
    m = re.search(r"(\d+)\s*(초|분|시간|일|주|개월|년)\s*전", s)
    if not m:
        return 9999
    n = int(m.group(1))
    unit = m.group(2)
    return {
        "초": 0, "분": 0, "시간": 0, "일": n, "주": n * 7,
        "개월": n * 30, "년": n * 365,
    }[unit]


def yt_search(query, sp=""):
    url = (
        "https://www.youtube.com/results?search_query="
        + urllib.parse.quote(query)
        + "&hl=ko&gl=KR"
        + ("&sp=" + sp if sp else "")
    )
    raw = fetch(url, timeout=40).decode("utf-8", "ignore")
    m = YT_INIT_RE.search(raw)
    if not m:
        raise RuntimeError("ytInitialData 없음")
    data = json.loads(m.group(1))
    found = []

    def walk(node):
        if isinstance(node, dict):
            if "videoRenderer" in node:
                found.append(node["videoRenderer"])
            for v in node.values():
                walk(v)
        elif isinstance(node, list):
            for v in node:
                walk(v)

    walk(data)
    return found


def yt_card(v, now):
    vid = v.get("videoId")
    if not vid:
        return None
    title = v.get("title", {})
    if "runs" in title:
        title = "".join(r.get("text", "") for r in title["runs"])
    else:
        title = title.get("simpleText", "")
    title = clean(title)
    if not title:
        return None
    views_txt = clean((v.get("viewCountText") or {}).get("simpleText", ""))
    pub_txt = clean((v.get("publishedTimeText") or {}).get("simpleText", ""))
    pub_txt = re.sub(r"^(스트리밍 시간|실시간 스트리밍|Streamed)\s*:\s*", "", pub_txt)
    chan = ""
    owner = v.get("ownerText") or {}
    if owner.get("runs"):
        chan = clean(owner["runs"][0].get("text", ""))
    length = ""
    lt = v.get("lengthText") or {}
    length = clean(lt.get("simpleText", ""))
    thumbs = (v.get("thumbnail") or {}).get("thumbnails") or []
    thumb = thumbs[-1]["url"] if thumbs else f"https://i.ytimg.com/vi/{vid}/mqdefault.jpg"
    days = published_days(pub_txt)
    return {
        "id": "yt-" + vid,
        "platform": "youtube",
        "platform_label": "유튜브",
        "category": None,  # 호출부에서 채움
        "rank": 0,
        "title": title,
        "desc": (f"{chan}" + (f" · {length}" if length else "")),
        "url": f"https://www.youtube.com/watch?v={vid}",
        "thumb": thumb,
        "stat": views_txt.replace("조회수 ", "조회수 "),
        "views": parse_count(views_txt),
        "source": chan or "YouTube",
        "published": "",
        "date_label": pub_txt.replace(" 전", " 전") if pub_txt else "",
        "days": days,
    }


def collect_youtube(now):
    """키워드마다 ‘이번 주 올라온 영상’을 먼저 담고, 모자라면 관련 인기 영상으로 채웁니다."""
    items, seen, used_queries = [], set(), []
    for query, category in YT_QUERIES:
        cards, fresh = [], []
        try:
            for v in yt_search(query, SP_THIS_WEEK)[:20]:
                c = yt_card(v, now)
                if c:
                    fresh.append(c)
        except Exception as e:
            log(f"  · 유튜브 '{query}' 최신 실패: {e}")
        try:
            for v in yt_search(query)[:20]:
                c = yt_card(v, now)
                if c:
                    cards.append(c)
        except Exception as e:
            log(f"  · 유튜브 '{query}' 인기 실패: {e}")
        fresh = [c for c in fresh if c["days"] <= 7 and c["views"] >= 2000]
        pool = fresh + cards
        # 최근 영상에 가중치: 한 달 지날 때마다 점수를 깎습니다
        for c in pool:
            c["_score"] = c["views"] / (1.0 + max(c.get("days", 0) or 0, 0) / 30.0)
        pool.sort(key=lambda c: (c["views"] >= 3000, c["_score"]), reverse=True)

        picked = 0
        for c in pool:
            if c["id"] in seen or c["views"] < 3000:
                continue
            seen.add(c["id"])
            c["category"] = category
            c["query"] = query
            c["rank"] = picked + 1
            items.append(c)
            picked += 1
            if picked >= 6:
                break
        used_queries.append(query)
        time.sleep(0.4)
    for c in items:
        if not c["published"]:
            c["published"] = (now - timedelta(days=c.get("days", 0) or 0)).isoformat()
    return items, used_queries


# ---------------------------------------------------------------- 소스 3: 구글 뉴스

def collect_google_news(now):
    items = []
    raw = fetch("https://news.google.com/rss?hl=ko&gl=KR&ceid=KR:ko")
    root = ET.fromstring(raw)
    rank = 0
    for it in root.iter("item"):
        title = clean(text_of(it, "title"))
        link = clean(text_of(it, "link"))
        if not title or not link:
            continue
        rank += 1
        pub = parse_rfc822(text_of(it, "pubDate"))
        src = clean(text_of(it, "source"))
        title = re.sub(r"\s+-\s+[^-]{2,30}$", "", title) if src else title
        items.append({
            "id": "news-" + str(rank),
            "platform": "news",
            "platform_label": "뉴스",
            "category": classify(title),
            "rank": rank,
            "title": title,
            "desc": "",
            "url": link,
            "thumb": "",
            "stat": "",
            "source": src or "구글 뉴스",
            "published": pub.isoformat() if pub else "",
            "date_label": rel_label(pub, now),
        })
        if rank >= 25:
            break
    return items


# ---------------------------------------------------------------- 소스 4: 뽐뿌 (커뮤니티 핫딜)

def collect_ppomppu(now):
    items = []
    raw = fetch("https://www.ppomppu.co.kr/rss.php?id=ppomppu")
    root = ET.fromstring(raw)
    rank = 0
    for it in root.iter("item"):
        title = clean(text_of(it, "title"))
        link = clean(text_of(it, "link"))
        if not title or not link:
            continue
        rank += 1
        desc = clean(text_of(it, "description"))[:80]
        pub = parse_rfc822(text_of(it, "pubDate"))
        hits_el = it.find("hits")
        hits = 0
        if hits_el is not None and hits_el.text:
            nums = re.findall(r"\d+", hits_el.text)
            if len(nums) >= 2:
                hits = int(nums[1])
        items.append({
            "id": "pp-" + str(rank),
            "platform": "community",
            "platform_label": "커뮤니티",
            "category": "쇼핑·특가",
            "rank": rank,
            "title": title,
            "desc": desc,
            "url": link,
            "thumb": "",
            "stat": (f"조회 {hits:,}" if hits else ""),
            "source": "뽐뿌",
            "published": pub.isoformat() if pub else "",
            "date_label": rel_label(pub, now),
        })
        if rank >= 18:
            break
    return items


# ---------------------------------------------------------------- 조립

PLATFORM_ORDER = {"google_trends": 0, "youtube": 1, "news": 2, "community": 3}
CATEGORY_ORDER = {"이슈": 0, "생활살림": 1, "AI·테크": 2, "쇼핑·특가": 3}


def load_previous():
    try:
        with open(OUT, encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return None


def previous_items(prev, platform):
    if not prev:
        return []
    out = []
    for it in prev.get("items", []):
        if it.get("platform") == platform:
            it = dict(it)
            it["stale"] = True
            out.append(it)
    return out


def main():
    now = datetime.now(KST)
    log(f"[트렌드] 수집 시작 · {now.isoformat()}")

    sources = []
    items = []

    def run(key, name, fn, platform):
        t0 = time.time()
        try:
            got = fn(now)
            if not got:
                raise RuntimeError("결과 0건")
            log(f"  ▲ {name}: {len(got)}건 ({time.time() - t0:.1f}s)")
            sources.append({"key": key, "name": name, "ok": True,
                            "count": len(got), "note": ""})
            items.extend(got)
        except Exception as e:
            log(f"  ✕ {name}: 실패 — {e}")
            old = previous_items(prev, platform)
            sources.append({"key": key, "name": name, "ok": bool(old),
                            "count": len(old),
                            "note": "이전 수집분 유지" if old else f"실패: {type(e).__name__}"})
            items.extend(old)

    prev = load_previous()

    run("google_trends", "구글 트렌드 (한국 급상승 검색어)",
        collect_google_trends, "google_trends")
    queries = []

    def yt(_now):
        got, qs = collect_youtube(now)
        queries.extend(qs)
        return got

    run("youtube", "유튜브 (살림·가전·AI·핫딜 키워드)", yt, "youtube")
    run("news", "구글 뉴스 (한국 주요 뉴스)", collect_google_news, "news")
    run("community", "뽐뿌 (커뮤니티 핫딜)", collect_ppomppu, "community")

    # 비어 있는 카테고리 보정
    for it in items:
        if not it.get("category"):
            it["category"] = classify(it.get("title", ""), it.get("desc", ""))
        it.setdefault("stale", False)

    counts_by_cat, counts_by_platform = {}, {}
    for it in items:
        counts_by_cat[it["category"]] = counts_by_cat.get(it["category"], 0) + 1
        counts_by_platform[it["platform"]] = counts_by_platform.get(it["platform"], 0) + 1

    data = {
        "updated_at": now.isoformat(timespec="seconds"),
        "updated_label": f"{now.month}월 {now.day}일 ({'월화수목금토일'[now.weekday()]}) {now.hour:02d}:{now.minute:02d} 기준",
        "date_label": f"{now.month}월 {now.day}일",
        "total": len(items),
        "counts_by_category": counts_by_cat,
        "counts_by_platform": counts_by_platform,
        "categories": ["전체", "생활살림", "AI·테크", "이슈", "쇼핑·특가"],
        "platforms": [
            {"key": "all", "label": "전체"},
            {"key": "youtube", "label": "유튜브"},
            {"key": "google_trends", "label": "구글트렌드"},
            {"key": "news", "label": "뉴스/커뮤니티"},
        ],
        "queries": queries,
        "sources": sources,
        "items": items,
    }

    with open(OUT, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=1)

    log(f"[트렌드] 완료 · 총 {len(items)}건 → {OUT}")
    for s in sources:
        log(f"   - {s['name']}: {'OK' if s['ok'] else 'FAIL'} {s['count']}건 {s['note']}")


if __name__ == "__main__":
    sys.exit(main())
