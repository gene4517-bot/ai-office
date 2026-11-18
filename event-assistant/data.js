/* ==========================================================
   체험단 · 이벤트 비서 — 기본 일정 데이터
   ----------------------------------------------------------
   공개 GitHub Pages 저장소이므로 개인정보를 넣지 않습니다.
   (이름 · 연락처 · 주소 · 계정ID · 응모자 정보 없음)
   제목 / 구분 / 발표일 / 마감일 / 경품 / 원문 링크 / 주의사항만 기록합니다.
   ----------------------------------------------------------
   cat    : 체험단 | 이벤트 | 공모전
   applied: 응모일 (없으면 '')
   announce: 발표일 (미공지면 null)
   due    : 응모·리뷰·수행 마감일 (없으면 null)
   status : wait(발표 대기) | win(당첨·리뷰 중) | lost(미당첨) | done(완료)
   ========================================================== */
window.EA_SEED = [
  /* ---------- 11월 넷째 주 : SSG MONDAY MOON · 설문 ---------- */
  {
    id: "ssg-albion", cat: "체험단", title: "알비온 루미너스 허벌 오일 체험단",
    org: "SSG닷컴 MONDAY MOON", applied: "2026-11-18", announce: "2026-11-19",
    prize: "알비온 루미너스 허벌 오일 8ml 외 샘플",
    link: "https://event.ssg.com/eventDetail.ssg?nevntId=1000000024726&domainSiteNo=6005",
    memo: "당첨 시 수령 후 2주 내 후기 작성 필수", status: "wait"
  },
  {
    id: "econ-edu", cat: "이벤트", title: "경제배움e+ 만족도 조사",
    org: "재정경제부", applied: "2026-11-15", announce: "2026-11-20",
    prize: "네이버페이 1만원 (300명)", link: "https://econedu.go.kr",
    memo: "당첨 시 11-25 지급 예정", status: "wait"
  },
  {
    id: "ssg-annasui", cat: "체험단", title: "안나수이 링루즈 체험단",
    org: "SSG닷컴 MONDAY MOON", applied: "2026-11-18", announce: "2026-11-20",
    prize: "안나수이 링루즈 제품", link: "https://event.ssg.com/eventDetail.ssg?nevntId=1000000024724&domainSiteNo=6005",
    memo: "수령 후 2주 내 후기 작성 필수", status: "wait"
  },
  {
    id: "haccp-survey", cat: "이벤트", title: "2026 하반기 대국민 참여조사",
    org: "한국식품안전관리인증원", applied: "2026-11-15", announce: "2026-11-23",
    prize: "네이버페이 1만원 (30명)", link: "https://www.haccp.or.kr",
    memo: "당첨자 발표 · 문자 수신 확인", status: "wait"
  },
  {
    id: "molit-stat", cat: "이벤트", title: "국토교통 통계누리 만족도 조사 + 아이디어 공모",
    org: "국토교통부 통계누리", applied: "2026-11-15", announce: "2026-11-23",
    prize: "모바일교환권 5천원 (150명) + 아이디어 2만원 (20명)", link: "https://stat.molit.go.kr",
    memo: "설문과 아이디어 공모 결과를 함께 확인", status: "wait"
  },
  {
    id: "kma-survey", cat: "이벤트", title: "날씨 예보 정확도 설문 (예보정책과)",
    org: "기상청", applied: "2026-11-16", announce: null,
    prize: "상품권 1만원 (100명)", link: "https://www.epeople.go.kr",
    memo: "발표일 미공지 · 당첨자는 개별 문자 안내. 11-23·11-30·12-01 회차에 문자·상품권 수신 확인", status: "wait"
  },
  {
    id: "ssg-drlucys-b12", cat: "체험단", title: "닥터 루시마마 비타B12 글로우 세럼 체험단",
    org: "SSG닷컴 MONDAY MOON", applied: "2026-11-18", announce: "2026-11-23",
    prize: "비타B12 글로우 세럼", link: "https://event.ssg.com/eventDetail.ssg?nevntId=1000000024767&domainSiteNo=6005",
    memo: "수령 후 2주 내 후기 작성 필수", status: "wait"
  },
  {
    id: "ssg-drlucys-azulene", cat: "체험단", title: "닥터 루시마마 아줄렌 바이옴 앰플 체험단",
    org: "SSG닷컴 MONDAY MOON", applied: "2026-11-18", announce: "2026-11-23",
    prize: "아줄렌 바이옴 앰플", link: "https://event.ssg.com/eventDetail.ssg?nevntId=1000000024768&domainSiteNo=6005",
    memo: "수령 후 2주 내 후기 작성 필수", status: "wait"
  },
  {
    id: "ssg-soidam", cat: "체험단", title: "소이담 트리트먼트 에센스 체험단",
    org: "SSG닷컴 MONDAY MOON", applied: "2026-11-18", announce: "2026-11-23",
    prize: "소이담 트리트먼트 에센스", link: "https://event.ssg.com/eventDetail.ssg?nevntId=1000000024728&domainSiteNo=6005",
    memo: "수령 후 2주 내 후기 작성 필수", status: "wait"
  },

  /* ---------- 11월 넷째 주 : 설문·웹진 ---------- */
  {
    id: "gangwon-unity", cat: "이벤트", title: "2026 연말결산·2027 설문",
    org: "강원권통일플러스센터", applied: "2026-11-18", announce: "2026-11-24",
    prize: "다이소 모바일상품권 5,000원 (40명)", link: "",
    memo: "홈페이지 공지 + 문자 수신 확인", status: "wait"
  },
  {
    id: "ssg-seldawom", cat: "체험단", title: "셀다움 글루타치온 2500 앰플 50ml 증정",
    org: "SSG닷컴 MONDAY MOON", applied: "2026-11-18", announce: "2026-11-24",
    prize: "셀다움 글루타치온 2500 앰플 50ml 정품",
    link: "https://event.ssg.com/eventDetail.ssg?nevntId=1000000024579&domainSiteNo=6005",
    memo: "11/27경 발송 · 수령 후 2주 내 후기 작성 필수", status: "wait"
  },
  {
    id: "mydata-survey", cat: "이벤트", title: "공공 마이데이터 이용자 만족도 조사",
    org: "행정안전부 · NIA", applied: "2026-11-15", announce: "2026-11-25",
    prize: "모바일상품권 1만원 (300명)", link: "",
    memo: "소통24 · 공공 마이데이터 포털 공지 확인", status: "wait"
  },
  {
    id: "aurum-survey", cat: "이벤트", title: "아우름 홈페이지 이용자 만족도 조사",
    org: "건축공간연구원", applied: "2026-11-15", announce: "2026-11-25",
    prize: "커피 기프티콘 5,000원 (400명)", link: "",
    memo: "아우름 공지 확인", status: "wait"
  },
  {
    id: "guro-care", cat: "이벤트", title: "2026 구로구 통합돌봄 설문조사 이벤트",
    org: "구로구청", applied: "2026-11-17", announce: "2026-11-25",
    prize: "5천원 상당 기프티콘 (20명)",
    link: "https://www.guro.go.kr/www/selectBbsNttView.do?bbsNo=662&key=1790&nttNo=241389",
    memo: "구로구청 공식 블로그 · 문자 수신 확인", status: "wait"
  },
  {
    id: "bukgu-sns", cat: "이벤트", title: "2026년 SNS 만족도조사",
    org: "대구광역시 북구청", applied: "2026-11-15", announce: "2026-11-26",
    prize: "기프티콘 (50명)", link: "",
    memo: "북구청 공지 · 문자 확인", status: "wait"
  },
  {
    id: "liveseoul", cat: "이벤트", title: "2026 라이브서울 만족도 조사",
    org: "라이브서울", applied: "2026-11-15", announce: "2026-11-26",
    prize: "스타벅스 아메리카노 (100명)", link: "",
    memo: "서울시 · 라이브서울 공지 확인", status: "wait"
  },
  {
    id: "dj-webzine", cat: "이벤트", title: "웹진 「배움 다 잇다」 독자 이벤트",
    org: "대전평생교육진흥원", applied: "2026-11-18", announce: "2026-11-26",
    prize: "GS25 5,000원 (12명) + 메가커피 (20명)", link: "",
    memo: "웹진 당첨자 공지 · 문자 확인", status: "wait"
  },
  {
    id: "bookquiz", cat: "이벤트", title: "독서퀴즈 「책은 답을 알고있다」 11월 · 『열일곱의 사계』",
    org: "독서퀴즈", applied: "2026-11-18", announce: "2026-11-27",
    prize: "모바일 음료 교환권 (6명)", link: "",
    memo: "14:00 발표", status: "wait"
  },

  /* ---------- 11월 마지막 주 : 공모전 · 설문 ---------- */
  {
    id: "pola-character", cat: "공모전", title: "공식 캐릭터 네이밍 공모전",
    org: "우체국물류지원단", applied: "2026-11-15", announce: "2026-11-30",
    prize: "최우수상 20만원", link: "https://www.pola.or.kr",
    memo: "응모작 「포디(PODI)」 · 홈페이지 공지 확인", status: "wait"
  },
  {
    id: "naeson-seoul", cat: "이벤트", title: "시민 만족도 조사",
    org: "내 손안에 서울", applied: "2026-11-15", announce: "2026-11-30",
    prize: "문화상품권 5,000원 (500명)", link: "",
    memo: "서울시 · 내 손안에 서울 공지 확인", status: "wait"
  },
  {
    id: "bigkinds", cat: "이벤트", title: "빅카인즈 이용자 설문",
    org: "한국언론진흥재단", applied: "2026-11-15", announce: "2026-11-30",
    prize: "커피 교환권 (40명)", link: "https://www.bigkinds.or.kr",
    memo: "빅카인즈 공지 확인", status: "wait"
  },
  {
    id: "gne-slogan", cat: "이벤트", title: "경남교육 브랜드 슬로건 선호도 조사",
    org: "경상남도교육청", applied: "2026-11-15", announce: "2026-11-30",
    prize: "BBQ · 메가커피 · CU (270명)", link: "",
    memo: "18:00 발표 · 저녁에 한 번 더 확인", status: "wait"
  },
  {
    id: "tourdure", cat: "이벤트", title: "테마관 만족도 조사",
    org: "한국관광공사 관광두레", applied: "2026-11-15", announce: "2026-11-30",
    prize: "네이버페이 5,000원 (200명)", link: "",
    memo: "대한민국 구석구석 공지 확인", status: "wait"
  },
  {
    id: "miryang-quiz", cat: "이벤트", title: "대표누리집 퀴즈이벤트",
    org: "밀양시", applied: "2026-11-16", announce: "2026-11-30",
    prize: "얼음골 사과 · 쌀 · 건대추 · 한천 양갱 (115명)",
    link: "https://www.miryang.go.kr/web/qiz/EgovMirEvent.do",
    memo: "18:00 이후 발표 · 당첨자 공지 확인", status: "wait"
  },
  {
    id: "kofac-ai", cat: "공모전", title: "AI·융합교육 신규 통합 플랫폼 명칭 공모전",
    org: "교육부 · 한국과학창의재단", applied: "2026-11-15", announce: "2026-11-30",
    prize: "명칭 공모 시상", link: "https://www.kofac.re.kr",
    memo: "11월 말 발표(홈페이지 공지 + 개별 통보) · 응모작 「모아배움」 · 「가온배움」", status: "wait"
  },

  /* ---------- 12월 ---------- */
  {
    id: "bmw-threads", cat: "이벤트", title: "BMW 굿즈 10명 랜덤 증정 스레드 이벤트",
    org: "bmw_kingsman_jeju", applied: "2026-11-16", announce: "2026-12-01",
    prize: "BMW 굿즈 6종 랜덤 (10명) + 람보르기니 람보 우산 2 · 키링 2",
    link: "https://www.threads.com/@bmw_kingsman_jeju/post/DfwKPlWid38",
    memo: "추첨 11-28 · 발표 12-01, 고정 게시물 댓글에서 추첨", status: "wait"
  },
  {
    id: "overthed", cat: "이벤트", title: "오버더 점폼 점핑보드 인스타 이벤트",
    org: "OVERTHE", applied: "2026-11-18", announce: "2026-12-02",
    prize: "점폼 (10) · 쿠폰 (20) · 커피 (30)", link: "",
    memo: "발표는 인스타 스토리", status: "wait"
  },
  {
    id: "dmz-tour", cat: "이벤트", title: "DMZ 평화관광 테마관 만족도 조사",
    org: "한국관광공사", applied: "2026-11-15", announce: "2026-12-03",
    prize: "올리브영 1만원 (100명)", link: "",
    memo: "대한민국 구석구석 당첨자 발표 확인", status: "wait"
  },
  {
    id: "onebook-busan", cat: "이벤트", title: "원북원부산 모니터링 설문",
    org: "부산시립시민도서관", applied: "2026-11-15", announce: "2026-12-04",
    prize: "커피 기프티콘 (200명)", link: "",
    memo: "도서관 공지 · 문자 확인", status: "wait"
  },
  {
    id: "nlkorea-sns", cat: "이벤트", title: "국립중앙도서관 SNS 만족도 조사",
    org: "국립중앙도서관", applied: "2026-11-18", announce: "2026-12-04",
    prize: "커피 교환권 (100명)", link: "",
    memo: "공지사항 · 문자 확인", status: "wait"
  },
  {
    id: "kspo-slogan", cat: "공모전", title: "스포츠가치센터 슬로건 공모전",
    org: "국민체육진흥공단", applied: "2026-11-15", announce: "2026-12-07",
    prize: "대상 30만원 · 배민 5천원권 (50명)", link: "",
    memo: "응모작 「건강한 땀방울, 함께 뛰는 스포츠 가치」 · 스포츠가치 블로그 확인", status: "wait"
  },
  {
    id: "koreatour-survey", cat: "이벤트", title: "2026 대한민국 구석구석 만족도 조사",
    org: "한국관광공사", applied: "2026-11-15", announce: "2026-12-07",
    prize: "GS25 3천원 (2,500명) + GS 2만원 (40명)", link: "",
    memo: "당첨자 개별 문자 · 구석구석 공지 확인", status: "wait"
  },
  {
    id: "kinse-bali", cat: "이벤트", title: "KINSE 발리 4박 6일 여행 인스타 이벤트",
    org: "KINSE", applied: "2026-11-18", announce: "2026-12-07",
    prize: "1등 발리 4인 여행 등 (201명)", link: "",
    memo: "12-07 인스타 라이브 발표", status: "wait"
  },
  {
    id: "kind-slogan", cat: "공모전", title: "KIND 뉴 슬로건 공모전",
    org: "한국해외인프라도시개발지원공사", applied: "2026-11-15", announce: "2026-12-07",
    prize: "슬로건 공모 시상", link: "https://www.kindkorea.or.kr",
    memo: "응모작 「세계로 놓는 길, KIND가 함께합니다」 · 공지 확인", status: "wait"
  },
  {
    id: "family-seoul", cat: "이벤트", title: "2026 패밀리서울 의견 수렴",
    org: "서울시가족센터", applied: "2026-11-15", announce: "2026-12-08",
    prize: "커피 쿠폰 (선착순 300명)", link: "",
    memo: "공지 · 문자 발송 여부 확인", status: "wait"
  },
  {
    id: "one-window", cat: "공모전", title: "국가데이터통합플랫폼(원-윈도우) 활용 아이디어 공모전",
    org: "NIA", applied: "2026-11-18", announce: "2026-12-10", due: "2026-11-30",
    prize: "아이디어 공모 시상", link: "",
    memo: "마감 11-30 18:00 · 제출서류(서식1~4) 준비 완료, 자필 서명 후 이메일 발송 대기", status: "wait"
  },
  {
    id: "kosai-vote", cat: "이벤트", title: "축구장 3부제 운영시간 선호도 투표",
    org: "국토안전관리원 수도권지역본부", applied: "2026-11-16", announce: "2026-12-11",
    prize: "1만원 상당 음료쿠폰 (20명)", link: "https://www.epeople.go.kr",
    memo: "투표기간 11-13~12-04 · 국민생각함 게시글 공지 확인", status: "wait"
  },
  {
    id: "kosai-survey", cat: "이벤트", title: "체육시설(테니스장·축구장) 이용 의견 조사",
    org: "국토안전관리원 수도권지역본부", applied: "2026-11-16", announce: "2026-12-11",
    prize: "1만원 상당 음료쿠폰 (10명)", link: "https://www.epeople.go.kr",
    memo: "조사기간 11-13~12-04 · 문자 수신 확인", status: "wait"
  },
  {
    id: "e2u-quiz", cat: "이벤트", title: "에너지뉴스클리핑(E2U) 퀴즈 + 설문",
    org: "한국에너지정보문화재단", applied: "2026-11-18", announce: null, due: "2026-12-17",
    prize: "맥북 네오 256GB 추첨", link: "",
    memo: "마감 12-17 · 발표일 미공지, e-policy.or.kr 공지·메일 확인 (12-29 회차)", status: "wait"
  },
  {
    id: "greendaero", cat: "이벤트", title: "AI에게 질문하고 네이버페이 쿠폰 받자!",
    org: "그린대로", applied: "2026-11-18", announce: "2026-12-22", due: "2026-12-18",
    prize: "네이버페이 포인트 쿠폰 5,000원 (1,000명)",
    link: "https://www.greendaero.go.kr/svc/rfph/guide/front/news/noticeDetail.do",
    memo: "참여기간 11-18~12-18 · 회원가입 후 그린AI 질문 1회 (별도 응모 폼 없음)", status: "wait"
  },
  {
    id: "guro-youtube", cat: "이벤트", title: "구로ON 유튜브 구독 이벤트",
    org: "구로구청", applied: "2026-11-17", announce: "2026-12-29",
    prize: "메가커피 모바일금액권 5,000원 (100명)",
    link: "https://www.youtube.com/watch?v=6ovo9qAp2fk",
    memo: "구로ON 구독 유지 필수 · 커뮤니티·구청 새소식 확인", status: "wait"
  },

  /* ---------- 인스타 · 유튜브 (발표일 없이 DM) ---------- */
  {
    id: "keyberduck", cat: "이벤트", title: "VARO V108D 기계식 키보드 증정",
    org: "키버덕 × VARO", applied: "2026-11-18", announce: null, due: "2026-11-18",
    prize: "VARO V108D 기계식 키보드", link: "https://www.youtube.com/watch?v=uX8f9dsEHQ4",
    memo: "마감 11-18 22:00 · 유튜브 커뮤니티·영상 댓글에서 발표 (11-24 확인)", status: "wait"
  },
  {
    id: "graildrop", cat: "이벤트", title: "루피&에이스 리더 패러렐 카드",
    org: "그레일드랍", applied: "2026-11-18", announce: null, due: "2026-11-22",
    prize: "루피&에이스 리더 패러렐 카드",
    link: "https://www.instagram.com/graildrop.cards/reel/DfrlNfYmdWa/",
    memo: "마감 11-22 23:59 · DM 발표 (11-24 확인)", status: "wait"
  },
  {
    id: "gamro-open", cat: "이벤트", title: "더 감로 성수·홍대점 오픈 이벤트",
    org: "더 감로", applied: "2026-11-18", announce: null, due: "2026-11-22",
    prize: "스타벅스 아메리카노 TALL (5명)",
    link: "https://www.instagram.com/thegamro_official/p/DfO3NtztmvS/",
    memo: "11월 중 개별 DM 발표 (11-24·12-01 확인)", status: "wait"
  },
  {
    id: "dji-romo", cat: "이벤트", title: "DJI ROMO P2 로봇청소기 증정",
    org: "DJI ROMO Korea", applied: "2026-11-18", announce: null, due: "2026-11-24",
    prize: "DJI ROMO P2 로봇청소기", link: "https://www.instagram.com/romo_korea/reel/DfEy0PQxINZ/",
    memo: "마감 11-24 · 청소 MBTI 제출 후 결과 댓글 · DM 발표 (11-30 확인)", status: "wait"
  },
  {
    id: "airmart", cat: "이벤트", title: "휴젠뜨 복합환풍기 등 4종 증정",
    org: "공기마트", applied: "2026-11-18", announce: null, due: "2026-11-30",
    prize: "휴젠뜨 복합환풍기 외 4종", link: "https://www.instagram.com/p/Dfg9cJYDZUl/",
    memo: "마감 11-30 · 인스타 DM 발표 (12-01 확인)", status: "wait"
  },

  /* ---------- 발표일 미공지 ---------- */
  {
    id: "startup-center", cat: "공모전", title: "스타트업 원스톱 지원센터 슬로건 공모전",
    org: "창업진흥원", applied: "2026-11-15", announce: null,
    prize: "커피 기프티콘 (250명)", link: "",
    memo: "응모작 「창업의 모든 길, 한 번에 잇다」 · 발표 없이 개별 연락(경품 발송으로 갈음)", status: "wait"
  },
  {
    id: "cnosm-slogan", cat: "공모전", title: "국립청주해양과학관 개관 기념 슬로건 공모전",
    org: "국립청주해양과학관", applied: "2026-11-15", announce: null,
    prize: "최우수 50만원", link: "https://www.cnosm.or.kr",
    memo: "응모작 「내륙의 첫 바다, 미래를 여는 과학」 · 발표일 공지 예정(우수작 온라인 국민투표)", status: "wait"
  },
  {
    id: "moe-policy", cat: "이벤트", title: "온라인 정책홍보 이해도 조사",
    org: "교육부", applied: "2026-11-18", announce: null,
    prize: "상품권", link: "",
    memo: "발표일 미공지 · 문자·메일 수신 확인", status: "wait"
  },
  {
    id: "mcst-portal", cat: "이벤트", title: "문화포털 2차 만족도 조사",
    org: "문화포털", applied: "2026-11-18", announce: null,
    prize: "에어팟 프로 · 네이버페이", link: "",
    memo: "발표일 미공지 · 공지·문자 확인", status: "wait"
  },
  {
    id: "daejeon-degree", cat: "이벤트", title: "대전 시민명예학위제 퀴즈",
    org: "대전광역시", applied: "2026-11-18", announce: null,
    prize: "퀴즈 이벤트 경품", link: "",
    memo: "12월 중 발표 · 문자 확인", status: "wait"
  }
];
