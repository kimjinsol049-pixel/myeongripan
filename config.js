/* ============================================================
   서버 설정
   기기 간 동기화(닉네임+비밀번호 로그인)는 Firebase를 쓴다.
   아래 값이 null 이면 로그인 기능은 꺼지고, 동기화 코드(내보내기/가져오기)만 쓸 수 있다.

   켜는 법 (5분):
   1. https://console.firebase.google.com 에서 프로젝트 만들기
   2. 빌드 → Authentication → 시작하기 → 로그인 방법 → "이메일/비밀번호" 사용 설정
   3. 빌드 → Firestore Database → 데이터베이스 만들기 (프로덕션 모드, 위치 asia-northeast3)
      → 규칙 탭에 아래를 붙여 넣고 게시:
        rules_version = '2';
        service cloud.firestore {
          match /databases/{database}/documents {
            match /users/{uid}/{document=**} {
              allow read, write: if request.auth != null && request.auth.uid == uid;
            }
          }
        }
   4. 프로젝트 설정(톱니) → 내 앱 → 웹 앱 추가(</>) → "firebaseConfig" 객체를 복사해 아래에 붙인다.
      (이 값은 공개되어도 되는 식별자다. 비밀키가 아니다.)
   ============================================================ */
window.MNG_FIREBASE = null;

/* 예시:
window.MNG_FIREBASE = {
  apiKey: "AIza...",
  authDomain: "myeongripan.firebaseapp.com",
  projectId: "myeongripan",
  storageBucket: "myeongripan.appspot.com",
  messagingSenderId: "1234567890",
  appId: "1:1234567890:web:abcdef"
};
*/
